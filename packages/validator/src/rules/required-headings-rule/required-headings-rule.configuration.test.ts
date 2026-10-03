import { Linter } from "eslint";
import markdown from "@eslint/markdown";
import { describe, expect, test } from "vitest";
import {
  createLintConfig,
  lint,
  LintConfigurationError,
  dokkuratorEslintPlugin,
  prepareLintConfiguration,
} from "@dokkurator/validator";

const docType = {
  name: "decision",
  metadata: { type: "object" },
  structure: { requiredHeadings: ["Context", "Decision"] },
  rules: [],
};

const frontmatter = "---\ndoctype: decision\n---\n";

describe("heading rule configuration", () => {
  test.each(["Context", [""], ["   "], [42]])(
    "the enabled rule rejects invalid heading requirements: %j",
    (requiredHeadings) => {
      const configuration = prepareLintConfiguration({
        docTypes: [
          {
            ...docType,
            structure: { requiredHeadings },
          } as unknown as typeof docType,
        ],
      });
      const input = {
        originalText: frontmatter,
        source: { sourceId: "memory", path: "test.md" },
        configuration,
      };
      expect(() => lint(input)).toThrow(LintConfigurationError);
      expect(() =>
        new Linter().verify(frontmatter, createLintConfig(configuration), {
          filename: "test.md",
        }),
      ).toThrow(LintConfigurationError);
      const disabled = prepareLintConfiguration({
        docTypes: configuration.docTypes.map((entry) => entry.definition),
        rules: { "dokkurator/required-headings": "off" },
      });
      expect(lint({ ...input, configuration: disabled }).diagnostics).toEqual(
        [],
      );
    },
  );
  test("rejects unsupported rule options and missing prepared settings", () => {
    expect(() =>
      createLintConfig({
        docTypes: [docType],
        rules: { "dokkurator/required-headings": ["error", { level: 2 }] },
      }),
    ).toThrow(LintConfigurationError);
    expect(() =>
      new Linter().verify(frontmatter, [
        {
          plugins: { markdown, dokkurator: dokkuratorEslintPlugin },
          language: "markdown/gfm",
          languageOptions: { frontmatter: "yaml" },
          rules: { "dokkurator/required-headings": "error" },
        },
      ]),
    ).toThrow("settings.dokkurator");
  });
});
