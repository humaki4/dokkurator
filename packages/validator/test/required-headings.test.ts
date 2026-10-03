import { ESLint, Linter, RuleTester } from "eslint";
import markdown from "@eslint/markdown";
import { describe, expect, it, test } from "vitest";
import {
  createLintConfig,
  lint,
  LintConfigurationError,
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

describe("public ESLint plugin integration", () => {
  test("the helper registers the public plugin and both default rules", () => {
    const config = createLintConfig(prepared);
    expect(config[0]!.plugins!.dokkurator).toBe(plugin);
    expect(config[0]!.rules).toMatchObject({
      "dokkurator/doctype": "error",
      "dokkurator/required-headings": "error",
    });
  });

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

  test("heading requirements are independent of metadata validation and overridable", () => {
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
    expect(result({})).toHaveLength(3);
    expect(result({ "dokkurator/required-headings": "off" })).toEqual([
      expect.objectContaining({ messageId: "invalid-metadata" }),
    ]);
    expect(
      result({
        "dokkurator/doctype": "off",
        "dokkurator/required-headings": "warn",
      }),
    ).toEqual([
      expect.objectContaining({ messageId: "missing-heading", severity: 1 }),
      expect.objectContaining({ messageId: "missing-heading", severity: 1 }),
    ]);
  });

  test("repeated documents cannot share collected headings", () => {
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

  test("reports the frontmatter range in the original BOM/CRLF text", () => {
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

  test("the helper consumes the plugin's recommended profile", () => {
    const recommended = plugin.configs.recommended;
    expect(recommended[0]!.plugins!.dokkurator).toBe(plugin);
    const rules = Object.assign({}, ...recommended.map((entry) => entry.rules));
    expect(createLintConfig(prepared)[0]!.rules).toMatchObject(rules);
    expect(
      createLintConfig({
        docTypes: [docType],
        rules: { "dokkurator/required-headings": "off" },
      })[0]!.rules!["dokkurator/required-headings"],
    ).toBe("off");
  });

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
          plugins: { markdown, dokkurator: plugin },
          language: "markdown/gfm",
          languageOptions: { frontmatter: "yaml" },
          rules: { "dokkurator/required-headings": "error" },
        },
      ]),
    ).toThrow("settings.dokkurator");
  });
});
