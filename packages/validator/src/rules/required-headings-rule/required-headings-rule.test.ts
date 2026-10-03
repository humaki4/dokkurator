import { RuleTester } from "eslint";
import markdown from "@eslint/markdown";
import { describe, it } from "vitest";
import { plugin, prepareLintConfiguration } from "@dokkurator/validator";

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

tester.run("dokkurator/required-headings", plugin.rules["required-headings"], {
  valid: [
    { code: frontmatter + "# Context\n## Decision\n" },
    { code: frontmatter + "###### Decision\n### Context\n### Context\n" },
    { code: frontmatter + "Context\n=======\nDecision\n--------\n" },
    {
      code:
        frontmatter + "## **Context**\n## [Decision](https://example.com)\n",
    },
    { code: frontmatter + "## `Context`\n## ![Decision](example.svg)\n" },
    { code: frontmatter + "> ## Context\n> ## Decision\n" },
    {
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
      code: frontmatter + "Content",
      settings: {
        dokkurator: prepareLintConfiguration({
          docTypes: [{ ...docType, structure: undefined }],
        }),
      },
    },
    { code: "# No frontmatter" },
    { code: "---\ndoctype: unknown\n---\n" },
    { code: "---\nscalar\n---\n" },
    { code: "---\ndoctype: decision\ntitle: [\n---\n" },
    {
      code: frontmatter.replace(
        "doctype: decision",
        "doctype: decision\ndoctype: decision",
      ),
    },
    {
      code: frontmatter.replace(
        "doctype: decision",
        "doctype: decision\n$schema: https://example.com/other",
      ),
    },
  ],
  invalid: [
    { code: frontmatter + "## Context\n", errors: [missing("Decision")] },
    { code: frontmatter + "## Decision\n", errors: [missing("Context")] },
    {
      code: frontmatter + "Context and Decision\n",
      errors: [missing("Context"), missing("Decision")],
    },
    {
      code: frontmatter + "## context\n## Decision\n",
      errors: [missing("Context")],
    },
    {
      code: frontmatter + "```md\n## Context\n```\n## Decision\n",
      errors: [missing("Context")],
    },
  ],
});
