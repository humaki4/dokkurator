import { type ParsedDocType } from "@dokkurator/loader";
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

describe("original YAML source positions", () => {
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
  test("localizes duplicate keys in the original YAML", () => {
    expect(
      check(document("details: {}\ndetails: {}", "\r\n")).diagnostics[0],
    ).toMatchObject({
      phase: "parse",
      location: { line: 4, column: 1, endLine: 4, endColumn: 2 },
      message: expect.stringContaining("unique"),
    });
  });
});
