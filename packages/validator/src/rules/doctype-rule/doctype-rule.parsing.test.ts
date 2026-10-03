import { type ParsedDocType } from "@dokkurator/loader";
import { describe, expect, test } from "vitest";
import { lint, prepareLintConfiguration } from "../../index.js";

const schema = { type: "object" };

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
