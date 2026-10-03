import {
  loadDocument,
  type ParsedDocType,
  type DocumentSource,
} from "@dokkurator/loader";
import { describe, expect, test } from "vitest";
import { lint, prepareLintConfiguration } from "../../index.js";

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

describe("DocType metadata schema validation", () => {
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
        ruleId: "dokkurator/metadata-schema",
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
});
