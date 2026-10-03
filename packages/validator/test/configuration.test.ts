import { ESLint, Linter } from "eslint";
import {
  loadDocType,
  type DocumentSource,
  type ParsedDocType,
} from "@dokkurator/loader";
import { describe, expect, test, vi } from "vitest";
import {
  createLintConfig,
  LintConfigurationError,
  prepareLintConfiguration,
} from "../src/index.js";

function docType(
  metadata: ParsedDocType["metadata"] = { type: "object" },
  name = "decision",
): ParsedDocType {
  return { name, metadata, rules: [] };
}

const schemaId = "https://schemas.example/decision.json";
const conditionalSchema = {
  $id: schemaId,
  type: "object",
  required: ["doctype", "title", "status"],
  properties: {
    doctype: { const: "decision" },
    title: { type: "string", minLength: 1 },
    status: { enum: ["draft", "accepted"] },
    acceptedAt: { type: "string", format: "date" },
  },
  if: { required: ["status"], properties: { status: { const: "accepted" } } },
  then: { required: ["acceptedAt"] },
};

describe("prepared DocType registry", () => {
  test("compiles the actual schema from a YAML-loaded ParsedDocType", async () => {
    const source: DocumentSource = {
      list: async () => [],
      read: async (id) => ({
        id,
        path: id,
        content: id.endsWith("definition.yml")
          ? `name: decision\nmetadata: ${JSON.stringify(conditionalSchema)}\n`
          : id.endsWith("rules.yml")
            ? "rules: []\n"
            : "",
        source: { sourceId: "test", kind: "filesystem", path: id },
      }),
    };
    const loaded = await loadDocType(source, "types/decision");
    const prepared = prepareLintConfiguration({ docTypes: [loaded] });
    const selected = prepared.selectDocType({ doctype: "decision" });
    expect(selected.status).toBe("selected");
    if (selected.status !== "selected")
      throw new Error("Expected selected DocType");
    expect(selected.docType.schemaId).toBe(schemaId);
    expect(selected.docType.definition.metadata).toEqual(loaded.metadata);
    const validate = selected.docType.validateMetadata;
    expect(
      validate({ doctype: "decision", title: "Example", status: "draft" })
        .valid,
    ).toBe(true);
    const accepted = validate({
      doctype: "decision",
      title: "Example",
      status: "accepted",
    });
    expect(accepted.valid).toBe(false);
    expect(accepted.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "required",
          params: { missingProperty: "acceptedAt" },
        }),
      ]),
    );
    expect(
      validate({
        doctype: "decision",
        title: "Example",
        status: "accepted",
        acceptedAt: "2026-10-03",
      }).valid,
    ).toBe(true);
    expect(
      validate({
        doctype: "decision",
        title: "Example",
        status: "accepted",
        acceptedAt: "2026-02-30",
      }).valid,
    ).toBe(false);
  });

  test.each([
    [undefined, "missing-frontmatter"],
    [null, "invalid-frontmatter"],
    ["scalar", "invalid-frontmatter"],
    [[], "invalid-frontmatter"],
    [{}, "missing-doctype"],
    [{ doctype: 42 }, "invalid-doctype"],
    [{ doctype: "" }, "invalid-doctype"],
    [{ doctype: "unknown" }, "unknown-doctype"],
    [{ doctype: "decision", $schema: 42 }, "invalid-schema-annotation"],
    [
      { doctype: "decision", $schema: "./decision.json" },
      "invalid-schema-annotation",
    ],
    [
      { doctype: "decision", $schema: "https://schemas.example/other.json" },
      "schema-conflict",
    ],
  ])("makes invalid association %j visible", (metadata, code) => {
    const prepared = prepareLintConfiguration({
      docTypes: [docType(conditionalSchema)],
    });
    expect(prepared.selectDocType(metadata)).toMatchObject({
      status: "invalid",
      code,
    });
  });

  test("allows a matching $schema but never selects a DocType through it", () => {
    const prepared = prepareLintConfiguration({
      docTypes: [docType(conditionalSchema)],
    });
    expect(
      prepared.selectDocType({ doctype: "decision", $schema: `${schemaId}#` }),
    ).toMatchObject({ status: "selected" });
    expect(prepared.selectDocType({ $schema: schemaId })).toMatchObject({
      status: "invalid",
      code: "missing-doctype",
    });
    expect(
      prepared.selectDocType(Object.create({ doctype: "decision" })),
    ).toMatchObject({ status: "invalid", code: "missing-doctype" });
  });

  test("does not coerce values, inject defaults, remove fields or reuse error arrays", () => {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: { count: { type: "number", default: 5 } },
    };
    const prepared = prepareLintConfiguration({ docTypes: [docType(schema)] });
    const validate = prepared.docTypes[0]!.validateMetadata;
    const metadata = { count: "5", extra: "keep" };
    const first = validate(metadata);
    expect(first.valid).toBe(false);
    expect(metadata).toEqual({ count: "5", extra: "keep" });
    const empty = {};
    expect(validate(empty).valid).toBe(true);
    expect(empty).toEqual({});
    expect(first.errors).toHaveLength(2);
    expect(validate({ count: 5 }).errors).toEqual([]);
    const inherited = Object.create({ count: 5 });
    expect(validate(inherited).valid).toBe(true);
  });

  test("keeps prepared schemas independent of later input changes", () => {
    const schema = { type: "object", required: ["title"] };
    const definition = docType(schema);
    const prepared = prepareLintConfiguration({ docTypes: [definition] });
    schema.required.length = 0;
    expect(prepared.docTypes[0]!.validateMetadata({}).valid).toBe(false);
    expect(Object.isFrozen(prepared.docTypes[0]!.definition.metadata)).toBe(
      true,
    );
    expect(prepared.docTypes[0]!.schemaId).toBe(
      "https://dokkurator.dev/doctypes/decision/metadata.schema.json",
    );
  });

  test("resolves supplied relative and internal references without resource loading", () => {
    const prepared = prepareLintConfiguration({
      docTypes: [
        docType({
          $id: schemaId,
          type: "object",
          properties: { title: { $ref: "common.json#/definitions/title" } },
        }),
      ],
      schemas: {
        "https://schemas.example/common.json": {
          definitions: { title: { type: "string", minLength: 1 } },
        },
      },
    });
    expect(
      prepared.docTypes[0]!.validateMetadata({ title: "Valid" }).valid,
    ).toBe(true);
    expect(prepared.docTypes[0]!.validateMetadata({ title: "" }).valid).toBe(
      false,
    );
  });

  test.each([true, false])("supports Draft 7 boolean schemas: %j", (schema) => {
    const prepared = prepareLintConfiguration({ docTypes: [docType(schema)] });
    expect(prepared.docTypes[0]!.validateMetadata({}).valid).toBe(schema);
  });

  test.each([
    { type: "not-a-json-schema-type" },
    { type: "string", format: "not-a-format" },
    { unknownKeyword: true },
    { $ref: "https://schemas.example/not-loaded.json" },
    { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" },
    { $async: true, type: "object" },
    { $id: "relative.json", type: "object" },
    { $id: "https://schemas.example/schema.json#fragment", type: "object" },
  ])(
    "rejects invalid or unresolved schemas before rule execution: %j",
    (schema) => {
      expect(() =>
        prepareLintConfiguration({ docTypes: [docType(schema)] }),
      ).toThrow(LintConfigurationError);
    },
  );

  test("also compiles unused supplied resources", () => {
    expect(() =>
      prepareLintConfiguration({
        docTypes: [docType()],
        schemas: {
          "https://schemas.example/unused.json": { $ref: "missing.json" },
        },
      }),
    ).toThrow(LintConfigurationError);
  });

  test("rejects conflicting identities and legacy rule definitions", () => {
    expect(() =>
      prepareLintConfiguration({ docTypes: [docType(), docType()] }),
    ).toThrow(LintConfigurationError);
    expect(() =>
      prepareLintConfiguration({
        docTypes: [
          docType({ $id: schemaId }),
          docType({ $id: schemaId }, "guide"),
        ],
      }),
    ).toThrow(LintConfigurationError);
    expect(() =>
      prepareLintConfiguration({
        docTypes: [],
        schemas: { [schemaId]: { $id: "https://schemas.example/other.json" } },
      }),
    ).toThrow(LintConfigurationError);
    expect(() =>
      prepareLintConfiguration({
        docTypes: [
          {
            ...docType(),
            rules: [{ name: "required", field: "title", severity: "error" }],
          },
        ],
      }),
    ).toThrow(LintConfigurationError);
  });
});

describe("shared ESLint flat configuration", () => {
  test.each([
    ["---\ndoctype: decision\n---\n# Example\n", undefined],
    ["# No frontmatter\n", "Document requires YAML frontmatter."],
    ["---\ntitle: Example\n---\n", "Frontmatter requires a doctype."],
    ["---\ndoctype: unknown\n---\n", "Unknown DocType: unknown."],
    [
      "---\ndoctype: decision\n$schema: https://schemas.example/other.json\n---\n",
      `Frontmatter $schema conflicts with DocType decision; expected ${schemaId}.`,
    ],
  ])(
    "makes the same association through embedded and direct ESLint: %j",
    async (text, expected) => {
      const prepared = prepareLintConfiguration({
        docTypes: [docType(conditionalSchema)],
      });
      const config = createLintConfig(prepared);
      const filename = "virtual/repository/docs/example.MD";
      const embedded = new Linter({ configType: "flat" }).verify(text, config, {
        filename,
      });
      const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: config,
      });
      const [direct] = await eslint.lintText(text, { filePath: filename });
      expect(direct!.messages).toEqual(embedded);
      if (expected === undefined) expect(embedded).toEqual([]);
      else
        expect(embedded).toEqual([
          expect.objectContaining({
            ruleId: "dokkurator/doctype",
            severity: 2,
            message: expected,
          }),
        ]);
    },
  );

  test("validates rule options without invoking any actual plugin create/visitor", () => {
    const create = vi.fn(() => {
      throw new Error("Must not run during preparation");
    });
    const plugins = {
      example: {
        rules: { local: { meta: { schema: [{ type: "boolean" }] }, create } },
      },
    };
    expect(() =>
      prepareLintConfiguration({
        docTypes: [docType()],
        plugins,
        rules: { "example/local": ["error", true] },
      }),
    ).not.toThrow();
    expect(create).not.toHaveBeenCalled();
    expect(() =>
      prepareLintConfiguration({
        docTypes: [docType()],
        plugins,
        rules: { "example/local": ["error", "invalid"] },
      }),
    ).toThrow(LintConfigurationError);
    expect(create).not.toHaveBeenCalled();
  });

  test.each([
    { "markdown/unknown": "error" },
    { "markdown/unknown": "off" },
    { "markdown/no-duplicate-headings": ["error", { unexpected: true }] },
    { "dokkurator/doctype": ["error", "unexpected"] },
    { "dokkurator/doctype": ["off", "unexpected"] },
  ] as Linter.RulesRecord[])(
    "rejects rule configuration %j during preparation",
    (rules) => {
      expect(() => createLintConfig({ docTypes: [docType()], rules })).toThrow(
        LintConfigurationError,
      );
    },
  );

  test("uses normal ESLint severities and suppression for association checks", () => {
    const filename = "virtual/example.md";
    const warning = createLintConfig({
      docTypes: [],
      rules: { "dokkurator/doctype": "warn" },
    });
    expect(
      new Linter().verify("# No association", warning, { filename }),
    ).toEqual([expect.objectContaining({ severity: 1 })]);
    expect(
      new Linter().verify(
        "<!-- eslint-disable dokkurator/doctype -->\n# No association",
        warning,
        { filename },
      ),
    ).toEqual([]);
    expect(
      new Linter().verify(
        "# No association",
        createLintConfig({
          docTypes: [],
          rules: { "dokkurator/doctype": "off" },
        }),
        { filename },
      ),
    ).toEqual([]);
  });

  test("returned flat configs do not mutate the prepared configuration", () => {
    const prepared = prepareLintConfiguration({ docTypes: [docType()] });
    const config = createLintConfig(prepared);
    config[0]!.rules!["dokkurator/doctype"] = "off";
    config[0]!.languageOptions!.frontmatter = false;
    config[0]!.plugins!.dokkurator = {};
    config[0]!.files![0] = "**/*.txt";
    expect(
      new Linter().verify("# No association", createLintConfig(prepared), {
        filename: "virtual/example.md",
      }),
    ).toEqual([expect.objectContaining({ ruleId: "dokkurator/doctype" })]);
  });

  test.each([
    "---\ntitle: [\n---\n",
    "---\ndoctype: decision\ndoctype: other\n---\n",
  ])("does not select from broken YAML: %j", (text) => {
    const messages = new Linter().verify(
      text,
      createLintConfig({ docTypes: [docType()] }),
      { filename: "virtual/example.md" },
    );
    expect(messages).toEqual([
      expect.objectContaining({
        ruleId: "dokkurator/doctype",
        messageId: "invalid-yaml",
      }),
    ]);
  });
});
