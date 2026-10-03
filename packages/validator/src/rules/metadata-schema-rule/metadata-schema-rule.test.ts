import { RuleTester } from "eslint";
import markdown from "@eslint/markdown";
import { describe, it } from "vitest";
import {
  dokkuratorEslintPlugin,
  prepareLintConfiguration,
} from "@dokkurator/validator";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const prepared = prepareLintConfiguration({
  docTypes: [
    {
      name: "guide",
      metadata: {
        type: "object",
        required: ["title"],
        properties: { title: { type: "string" } },
      },
      rules: [],
    },
  ],
});
const tester = new RuleTester({
  plugins: { markdown },
  language: "markdown/gfm",
  languageOptions: { frontmatter: "yaml" },
  settings: { dokkurator: prepared },
});
tester.run(
  "dokkurator/metadata-schema",
  dokkuratorEslintPlugin.rules["metadata-schema"],
  {
    valid: [
      { code: "---\ndoctype: guide\ntitle: Guide\n---\n" },
      { code: "# No association" },
      { code: "---\ndoctype: unknown\n---\n" },
      { code: "---\nscalar\n---\n" },
      { code: "---\ndoctype: guide\ntitle: [\n---\n" },
    ],
    invalid: [
      {
        code: "---\ndoctype: guide\ntitle: 42\n---\n",
        errors: [
          {
            messageId: "invalid-metadata",
            data: {
              path: "/title",
              message: "must be string",
              keyword: "type",
            },
            line: 3,
            column: 8,
            endLine: 3,
            endColumn: 10,
          },
        ],
      },
      {
        code: "---\ndoctype: guide\n---\n",
        errors: [
          {
            messageId: "invalid-metadata",
            data: {
              path: "Frontmatter",
              message: "must have required property 'title'",
              keyword: "required",
            },
            line: 2,
            column: 1,
            endLine: 3,
            endColumn: 1,
          },
        ],
      },
    ],
  },
);
