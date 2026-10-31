import { RuleTester } from "eslint";
import markdown from "@eslint/markdown";
import { describe, it } from "vitest";
import {
  dokkuratorEslintPlugin,
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

RuleTester.describe = describe;

RuleTester.it = it;

RuleTester.itOnly = it.only;

const tester = new RuleTester({
  plugins: { markdown },
  language: "markdown/gfm",
  languageOptions: { frontmatter: "yaml" },
  settings: { dokkurator: prepared },
});

const missing = (heading: string) => ({
  messageId: "missing-heading",
  data: { doctype: "decision", heading },
  line: 1,
  column: 1,
  endLine: 3,
  endColumn: 4,
});

tester.run(
  "dokkurator/required-headings",
  dokkuratorEslintPlugin.rules["required-headings"],
  {
    valid: [
      {
        name: "Matching: accepts headings of any level",
        code: frontmatter + "# Context\n## Decision\n",
      },
      {
        name: "Order and repetition: ignores order and repeated headings",
        code: frontmatter + "###### Decision\n### Context\n### Context\n",
      },
      {
        name: "Matching: accepts setext headings",
        code: frontmatter + "Context\n=======\nDecision\n--------\n",
      },
      {
        name: "Matching: compares the visible text of emphasis and links",
        code:
          frontmatter + "## **Context**\n## [Decision](https://example.com)\n",
      },
      {
        name: "Matching: compares the visible text of inline code and images",
        code: frontmatter + "## `Context`\n## ![Decision](example.svg)\n",
      },
      {
        name: "Matching: accepts headings in block quotes",
        code: frontmatter + "> ## Context\n> ## Decision\n",
      },
      {
        name: "Findings: counts declared entries equal after trimming once",
        code: frontmatter + "## Context\n## Decision\n",
        settings: {
          dokkurator: prepareLintConfiguration({
            docTypes: [
              {
                ...docType,
                structure: {
                  requiredHeadings: [" Context ", "Context", "Decision"],
                },
              },
            ],
          }),
        },
      },
      {
        name: "Declaration: has no requirements without requiredHeadings",
        code: frontmatter + "Content",
        settings: {
          dokkurator: prepareLintConfiguration({
            docTypes: [{ ...docType, structure: undefined }],
          }),
        },
      },
      {
        name: "Applicability: reports nothing without frontmatter",
        code: "# No frontmatter",
      },
      {
        name: "Applicability: reports nothing for an unknown DocType",
        code: "---\ndoctype: unknown\n---\n",
      },
      {
        name: "Applicability: reports nothing for non-mapping frontmatter",
        code: "---\nscalar\n---\n",
      },
      {
        name: "Applicability: reports nothing for invalid YAML",
        code: "---\ndoctype: decision\ntitle: [\n---\n",
      },
      {
        name: "Applicability: reports nothing for duplicate YAML keys",
        code: frontmatter.replace(
          "doctype: decision",
          "doctype: decision\ndoctype: decision",
        ),
      },
      {
        name: "Applicability: reports nothing for a conflicting $schema",
        code: frontmatter.replace(
          "doctype: decision",
          "doctype: decision\n$schema: https://example.com/other",
        ),
      },
    ],
    invalid: [
      {
        name: "Findings: reports the missing Decision heading",
        code: frontmatter + "## Context\n",
        errors: [missing("Decision")],
      },
      {
        name: "Findings: reports the missing Context heading",
        code: frontmatter + "## Decision\n",
        errors: [missing("Context")],
      },
      {
        name: "Matching: running text is not a heading",
        code: frontmatter + "Context and Decision\n",
        errors: [missing("Context"), missing("Decision")],
      },
      {
        name: "Matching: is case-sensitive",
        code: frontmatter + "## context\n## Decision\n",
        errors: [missing("Context")],
      },
      {
        name: "Matching: a code block is not a heading",
        code: frontmatter + "```md\n## Context\n```\n## Decision\n",
        errors: [missing("Context")],
      },
    ],
  },
);
