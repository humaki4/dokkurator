import { Linter } from "eslint";
import { describe, expect, test } from "vitest";
import {
  createLintConfig,
  lint,
  prepareLintConfiguration,
} from "@dokkurator/validator";

const docType = {
  name: "decision",
  metadata: { type: "object" },
  structure: { requiredHeadings: ["Context", "Decision"] },
  rules: [],
};

const prepared = prepareLintConfiguration({ docTypes: [docType] });

const frontmatter = "---\ndoctype: decision\n---\n";

describe("heading rule invocation and diagnostics", () => {
  const strict = {
    ...docType,
    metadata: { type: "object", required: ["title"] },
  };
  const result = (rules: Linter.RulesRecord) =>
    new Linter().verify(
      frontmatter,
      createLintConfig({ docTypes: [strict], rules }),
      { filename: "test.md" },
    );
  test("Applicability: reports missing headings although the metadata is invalid", () => {
    expect(result({})).toEqual([
      expect.objectContaining({ messageId: "missing-heading" }),
      expect.objectContaining({ messageId: "missing-heading" }),
      expect.objectContaining({ messageId: "invalid-metadata" }),
    ]);
  });
  test("Configuration: severity and off apply to this rule only", () => {
    expect(result({ "dokkurator/required-headings": "off" })).toEqual([
      expect.objectContaining({ messageId: "invalid-metadata" }),
    ]);
    expect(
      result({
        "dokkurator/doctype": "off",
        "dokkurator/metadata-schema": "off",
        "dokkurator/required-headings": "warn",
      }),
    ).toEqual([
      expect.objectContaining({ messageId: "missing-heading", severity: 1 }),
      expect.objectContaining({ messageId: "missing-heading", severity: 1 }),
    ]);
  });
  test("Isolation: repeated documents cannot share collected headings", () => {
    const config = createLintConfig(prepared);
    const linter = new Linter();
    const verify = (text: string) =>
      linter.verify(frontmatter + text, config, { filename: "test.md" });
    expect(verify("## Context\n## Decision\n")).toEqual([]);
    expect(verify("## Context\n")).toEqual([
      expect.objectContaining({ messageId: "missing-heading" }),
    ]);
    expect(verify("## Context\n## Decision\n")).toEqual([]);
  });
  test("Location: reports the frontmatter range in the original BOM/CRLF text", () => {
    const result = lint({
      originalText:
        "\uFEFF" + (frontmatter + "## Context\n").replace(/\n/g, "\r\n"),
      source: { sourceId: "memory", path: "test.md" },
      configuration: prepared,
    });
    expect(result.diagnostics[0]!.location).toEqual({
      line: 1,
      column: 2,
      endLine: 3,
      endColumn: 4,
    });
  });
});
