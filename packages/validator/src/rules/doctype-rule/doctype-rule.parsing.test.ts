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

describe("invalid frontmatter", () => {
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
});
