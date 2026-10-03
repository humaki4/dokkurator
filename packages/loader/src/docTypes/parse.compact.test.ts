import { describe, expect, test } from "vitest";
import { DocTypeParseError, parseDocType } from "./parse.js";

function parse(metadata: string) {
  const path = "_dokkurator/.doctypes/guide/definition.yml";
  return parseDocType({
    directory: "_dokkurator/.doctypes/guide",
    definition: {
      id: path,
      path,
      content: `name: guide\nmetadata:\n${metadata}`,
      source: { sourceId: "memory", kind: "filesystem", path },
    },
  });
}

describe("compact DocType definitions", () => {
  test("normalizes the definition before checking the standard schema", () => {
    expect(
      parse(
        "  doctype:\n    type: string\n    required: true\n  title:\n    type: string\n    pattern: '^[A-Z]'\n",
      ),
    ).toEqual({
      name: "guide",
      rules: [],
      metadata: {
        type: "object",
        required: ["doctype"],
        properties: {
          doctype: { type: "string" },
          title: { type: "string", pattern: "^[A-Z]" },
        },
      },
    });
  });

  test.each([
    "  title:\n    type: impossible\n",
    "  title:\n    type: string\n    required: yes\n",
    "  title:\n    type: string\n    enum: invalid\n",
    "  title:\n    type: string\n  status: 42\n",
    "  type:\n    type: string\n  required: [title]\n",
    "  type: object\n  required: true\n",
  ])("rejects malformed definitions with their source path: %j", (metadata) => {
    expect(() => parse(metadata)).toThrow(DocTypeParseError);
    expect(() => parse(metadata)).toThrow(
      "definition.yml: Invalid DocType definition",
    );
  });
});
