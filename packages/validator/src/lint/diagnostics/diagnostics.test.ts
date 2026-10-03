import { type MarkdownRuleDefinition } from "@eslint/markdown";
import { describe, expect, test } from "vitest";
import { lint, prepareLintConfiguration } from "../../index.js";

const source = {
  sourceId: "repository",
  path: "docs/example.md",
  revision: "abc123",
};

const docType = { name: "guide", metadata: { type: "object" }, rules: [] };

const header = "---\ndoctype: guide\n---\n\n";

describe("rule-owned diagnostic phases", () => {
  test("message phases come from the configured rule, regardless of its namespace", () => {
    const rule = {
      meta: {
        schema: [],
        messages: { broken: "Invalid input." },
        messagePhases: { broken: "parse" as const },
      },
      create(context: Parameters<MarkdownRuleDefinition["create"]>[0]) {
        return {
          root(
            node: Parameters<
              NonNullable<ReturnType<MarkdownRuleDefinition["create"]>["root"]>
            >[0],
          ) {
            context.report({ node, messageId: "broken" });
          },
        };
      },
    };
    const configuration = prepareLintConfiguration({
      docTypes: [docType],
      plugins: { "@company/yaml": { rules: { check: rule } } },
      rules: { "@company/yaml/check": "error" },
    });
    expect(
      lint({ originalText: header, source, configuration }).diagnostics,
    ).toEqual([
      expect.objectContaining({
        phase: "parse",
        ruleId: "@company/yaml/check",
        messageId: "broken",
      }),
    ]);
  });
});
