import { ESLint, Linter } from "eslint";
import { type ParsedDocType } from "@dokkurator/loader";
import { describe, expect, test } from "vitest";
import {
  createLintConfig,
  lint,
  prepareLintConfiguration,
} from "../../index.js";

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

describe("metadata rule ESLint integration", () => {
  test("metadata and association rules can be enabled independently", () => {
    const text = document("details:\n  title: 42");
    const withoutAssociation = prepareLintConfiguration({
      docTypes: [docType],
      rules: { "dokkurator/doctype": "off" },
    });
    expect(check(text, withoutAssociation).diagnostics).toEqual([
      expect.objectContaining({
        ruleId: "dokkurator/metadata-schema",
        messageId: "invalid-metadata",
      }),
    ]);
    const withoutSchema = prepareLintConfiguration({
      docTypes: [docType],
      rules: { "dokkurator/metadata-schema": "off" },
    });
    expect(check(text, withoutSchema).diagnostics).toEqual([]);
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
      rules: { "dokkurator/metadata-schema": "warn" },
    });
    const text = document("details:\n  title: 42");
    expect(check(text, prepared)).toMatchObject({
      status: "passed",
      diagnostics: [{ severity: "warning" }],
    });
    const disabled = prepareLintConfiguration({
      docTypes: [docType],
      rules: { "dokkurator/metadata-schema": "off" },
    });
    expect(check(text, disabled).diagnostics).toEqual([]);
  });
});
