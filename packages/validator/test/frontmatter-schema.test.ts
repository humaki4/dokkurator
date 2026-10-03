import { ESLint, Linter } from "eslint";
import {
  loadDocument,
  type ParsedDocType,
  type DocumentSource,
} from "@dokkurator/loader";
import { describe, expect, test } from "vitest";
import {
  createLintConfig,
  lint,
  prepareLintConfiguration,
} from "../src/index.js";

const schema = {
  type: "object",
  required: ["doctype", "details"],
  properties: {
    doctype: { const: "guide" },
    details: {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string", minLength: 3, pattern: "^[A-Z]" },
        state: { enum: ["draft", "published"] },
        count: { type: "integer", minimum: 1, maximum: 5 },
        tags: { type: "array", items: { type: "string" } },
        "a/b~c": { type: "string" },
        "123": { type: "string" },
      },
      if: {
        required: ["state"],
        properties: { state: { const: "published" } },
      },
      then: { required: ["owner"] },
      additionalProperties: false,
    },
  },
};
const docType: ParsedDocType = { name: "guide", metadata: schema, rules: [] };
const configuration = prepareLintConfiguration({ docTypes: [docType] });
const source = {
  sourceId: "git:example",
  path: "docs/guide.md",
  revision: "abc",
};
function check(text: string, prepared = configuration) {
  return lint({ originalText: text, source, configuration: prepared });
}
function document(body: string, eol = "\n") {
  return ["---", "doctype: guide", body, "---", "Guide content.", ""]
    .join("\n")
    .replace(/\n/g, eol);
}

describe("DocType metadata in ESLint", () => {
  test.each([
    ["details:\n  title: 42", "type", 4, 10],
    ["details:\n  title: Ab", "minLength", 4, 10],
    ["details:\n  title: lower", "pattern", 4, 10],
    ["details:\n  title: Guide\n  state: wrong", "enum", 5, 10],
    ["details:\n  title: Guide\n  count: 0", "minimum", 5, 10],
    ["details:\n  title: Guide\n  count: 6", "maximum", 5, 10],
    ["details:\n  title: Guide\n  tags: [ok, 42]", "type", 5, 14],
    ["details:\n  title: Guide\n  a/b~c: 42", "type", 5, 10],
    ["details:\n  title: Guide\n  123: 42", "type", 5, 8],
    ["details:\n  title: Guide\n  extra: 42", "additionalProperties", 5, 3],
  ])("localizes %s through Ajv (%s)", (body, keyword, line, column) => {
    const result = check(document(body));
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        phase: "lint",
        ruleId: "dokkurator/doctype",
        messageId: "invalid-metadata",
        message: expect.stringContaining(`(${keyword})`),
        location: expect.objectContaining({ line, column }),
      }),
    ]);
  });

  test("locates conditional missing fields at their parent object", () => {
    const result = check(
      document("details:\n  title: Guide\n  state: published"),
    );
    expect(result.diagnostics).toHaveLength(2); // Ajv reports required and the failing then branch.
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "/details must have required property 'owner' (required).",
          location: { line: 4, column: 3, endLine: 6, endColumn: 1 },
        }),
      ]),
    );
  });

  test.each(["\n", "\r\n", "\r"])(
    "retains source positions with %j line endings and a BOM",
    (eol) => {
      const text = "\uFEFF" + document("details:\n  title: 42", eol);
      expect(check(text).diagnostics[0]!.location).toMatchObject({
        line: 4,
        column: 10,
        endColumn: 12,
      });
    },
  );

  test.each([
    ["# Missing\n", "missing-frontmatter"],
    ["---\nscalar\n---\n", "invalid-frontmatter"],
    ["---\n- guide\n---\n", "invalid-frontmatter"],
    ["---\n---\n", "invalid-frontmatter"],
    [document("details: ["), "invalid-yaml"],
    [document("details: {}\ndetails: {}"), "invalid-yaml"],
    [document("details: *missing"), "invalid-yaml"],
  ])("reports selection/parse failures once: %j", (text, messageId) => {
    expect(check(text).diagnostics).toEqual([
      expect.objectContaining({ messageId }),
    ]);
  });

  test("localizes duplicate keys in the original YAML", () => {
    expect(
      check(document("details: {}\ndetails: {}", "\r\n")).diagnostics[0],
    ).toMatchObject({
      phase: "parse",
      location: { line: 4, column: 1, endLine: 4, endColumn: 2 },
      message: expect.stringContaining("unique"),
    });
  });

  test("reuses prepared schemas without retaining document errors or changing metadata", async () => {
    const text = document("details:\n  title: &title Guide\n  tags: [*title]");
    const adapter: DocumentSource = {
      async list() {
        return [];
      },
      async read(path) {
        return {
          id: path,
          path,
          content: text,
          source: { ...source, kind: "git" },
        };
      },
    };
    const loaded = await loadDocument(adapter, source.path);
    const selection = configuration.selectDocType(loaded.metadata);
    expect(selection.status).toBe("selected");
    if (selection.status !== "selected") throw new Error("Expected guide");
    const snapshot = structuredClone(loaded.metadata);
    expect(selection.docType.validateMetadata(loaded.metadata).valid).toBe(
      true,
    );
    const failure = check(document("details:\n  title: 42"));
    expect(check(text).diagnostics).toEqual([]);
    expect(check(document("details:\n  title: 42"))).toEqual(failure);
    expect(loaded.metadata).toEqual(snapshot);
  });

  test("uses preloaded external refs and boolean schemas", () => {
    const ref = prepareLintConfiguration({
      docTypes: [
        { ...docType, metadata: { $ref: "https://example.com/guide" } },
      ],
      schemas: { "https://example.com/guide": schema },
    });
    expect(
      check(document("details:\n  title: 42"), ref).diagnostics[0]!.message,
    ).toContain("(type)");
    const denied = prepareLintConfiguration({
      docTypes: [{ ...docType, metadata: false }],
    });
    expect(check(document("details: {}"), denied).diagnostics).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("false schema"),
      }),
    ]);
  });

  test.each([
    document("details:\n  title: Guide"),
    document("details:\n  title: 42"),
    document("details: ["),
  ])("direct ESLint and the facade agree: %j", async (text) => {
    const config = createLintConfig(configuration);
    const embedded = new Linter().verify(text, config, {
      filename: source.path,
    });
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: config,
    });
    const [direct] = await eslint.lintText(text, { filePath: source.path });
    expect(direct!.messages).toEqual(embedded);
    expect(
      check(text).diagnostics.map((item) => ({
        message: item.message,
        line: item.location?.line,
        column: item.location?.column,
        endLine: item.location?.endLine,
        endColumn: item.location?.endColumn,
      })),
    ).toEqual(
      embedded.map(({ message, line, column, endLine, endColumn }) => ({
        message,
        line,
        column,
        endLine,
        endColumn,
      })),
    );
  });

  test("schema diagnostics obey normal ESLint severity and off overrides", () => {
    const prepared = prepareLintConfiguration({
      docTypes: [docType],
      rules: { "dokkurator/doctype": "warn" },
    });
    const text = document("details:\n  title: 42");
    expect(check(text, prepared)).toMatchObject({
      status: "passed",
      diagnostics: [{ severity: "warning" }],
    });
    const disabled = prepareLintConfiguration({
      docTypes: [docType],
      rules: { "dokkurator/doctype": "off" },
    });
    expect(check(text, disabled).diagnostics).toEqual([]);
  });
});
