import { Linter } from "eslint";
import { type ParsedDocType } from "@dokkurator/loader";
import { describe, expect, test, vi } from "vitest";
import {
  createLintConfig,
  LintConfigurationError,
  prepareLintConfiguration,
} from "../../index.js";

function docType(
  metadata: ParsedDocType["metadata"] = { type: "object" },
  name = "decision",
): ParsedDocType {
  return { name, metadata, rules: [] };
}

describe("ESLint configuration validation and isolation", () => {
  test("validates rule options without invoking any actual plugin create/visitor", () => {
    const create = vi.fn(() => {
      throw new Error("Must not run during preparation");
    });
    const plugins = {
      example: {
        rules: { local: { meta: { schema: [{ type: "boolean" }] }, create } },
      },
    };
    expect(() =>
      prepareLintConfiguration({
        docTypes: [docType()],
        plugins,
        rules: { "example/local": ["error", true] },
      }),
    ).not.toThrow();
    expect(create).not.toHaveBeenCalled();
    expect(() =>
      prepareLintConfiguration({
        docTypes: [docType()],
        plugins,
        rules: { "example/local": ["error", "invalid"] },
      }),
    ).toThrow(LintConfigurationError);
    expect(create).not.toHaveBeenCalled();
  });
  test.each([
    { "markdown/unknown": "error" },
    { "markdown/unknown": "off" },
    { "markdown/no-duplicate-headings": ["error", { unexpected: true }] },
    { "dokkurator/doctype": ["error", "unexpected"] },
    { "dokkurator/doctype": ["off", "unexpected"] },
  ] as Linter.RulesRecord[])(
    "rejects rule configuration %j during preparation",
    (rules) => {
      expect(() => createLintConfig({ docTypes: [docType()], rules })).toThrow(
        LintConfigurationError,
      );
    },
  );
  test("returned flat configs do not mutate the prepared configuration", () => {
    const prepared = prepareLintConfiguration({ docTypes: [docType()] });
    const config = createLintConfig(prepared);
    config[0]!.rules!["dokkurator/doctype"] = "off";
    config[0]!.languageOptions!.frontmatter = false;
    config[0]!.plugins!.dokkurator = {};
    config[0]!.files![0] = "**/*.txt";
    expect(
      new Linter().verify("# No association", createLintConfig(prepared), {
        filename: "virtual/example.md",
      }),
    ).toEqual([expect.objectContaining({ ruleId: "dokkurator/doctype" })]);
  });
});
