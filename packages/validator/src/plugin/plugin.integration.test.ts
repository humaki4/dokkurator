import { ESLint, Linter } from "eslint";
import markdown from "@eslint/markdown";
import { describe, expect, test } from "vitest";
import {
  createLintConfig,
  lint,
  plugin,
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

describe("public plugin ESLint integration", () => {
  test("manual root-import configuration, helper and facade agree", async () => {
    const text = frontmatter + "## Context\n";
    const manual = [
      ...markdown.configs.recommended,
      ...plugin.configs.recommended,
      {
        files: ["**/*.md"],
        language: "markdown/gfm",
        languageOptions: { frontmatter: "yaml" },
        settings: { dokkurator: prepared },
      },
    ] satisfies Linter.Config[];
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: manual,
    });
    const [direct] = await eslint.lintText(text, {
      filePath: "virtual/decision.md",
    });
    const messages = new Linter().verify(text, createLintConfig(prepared), {
      filename: "virtual/decision.md",
    });
    expect(direct!.messages).toEqual(messages);
    const result = lint({
      originalText: text,
      source: { sourceId: "virtual", path: "virtual/decision.md" },
      configuration: prepared,
    });
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        messageId: "missing-heading",
        message: 'DocType decision requires heading "Decision".',
        location: { line: 1, column: 1, endLine: 3, endColumn: 4 },
      }),
    ]);
  });
});
