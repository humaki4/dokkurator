import { Linter } from "eslint";
import markdown from "@eslint/markdown";
import { loadDocument, type DocumentSource } from "@dokkurator/loader";
import { describe, expect, test } from "vitest";

// Compatibility probe for Task 01, not the public lint facade (Task 05).
const filename = "virtual/repository/docs/example.md";
const text = "# Title\n\n# Title\n";

function config(rules: Linter.RulesRecord): Linter.Config[] {
  return [
    {
      files: ["**/*.md"],
      plugins: { markdown },
      language: "markdown/gfm",
      languageOptions: { frontmatter: "yaml" },
      rules,
    },
  ];
}

describe("synchronous ESLint Markdown runtime", () => {
  test("matches Loader positions with YAML frontmatter, CRLF and Unicode", async () => {
    const originalText =
      "\uFEFF---\r\ntitle: Grüße 😀\r\n---\r\n\r\n# Grüße 😀\r\n\r\n# Grüße 😀\r\n";
    const source: DocumentSource = {
      list: async () => [],
      read: async (id) => ({
        id,
        path: id,
        content: originalText,
        source: { sourceId: "virtual", kind: "filesystem", path: id },
      }),
    };
    const document = await loadDocument(source, filename);
    const messages = new Linter({ configType: "flat" }).verify(
      document.originalText,
      config({ "markdown/no-duplicate-headings": "error" }),
      { filename: document.source.path },
    );
    const position = document.headings[1]!.position!;
    expect(messages).toEqual([
      expect.objectContaining({
        line: position.start.line,
        column: position.start.column,
        endLine: position.end.line,
        endColumn: position.end.column,
        ruleId: "markdown/no-duplicate-headings",
      }),
    ]);
    expect(
      document.originalText.slice(position.start.offset, position.end.offset),
    ).toBe("# Grüße 😀");
  });
  test("returns positioned findings immediately for an in-memory logical path", () => {
    const messages = new Linter({ configType: "flat" }).verify(
      text,
      config({ "markdown/no-duplicate-headings": "error" }),
      { filename },
    );

    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toEqual([
      expect.objectContaining({
        ruleId: "markdown/no-duplicate-headings",
        messageId: "duplicateHeading",
        severity: 2,
        line: 3,
        column: 1,
        endLine: 3,
        endColumn: 8,
      }),
    ]);
  });

  test("preserves warning severity and disables off rules", () => {
    const linter = new Linter({ configType: "flat" });
    expect(
      linter.verify(
        text,
        config({ "markdown/no-duplicate-headings": "warn" }),
        {
          filename,
        },
      ),
    ).toEqual([expect.objectContaining({ severity: 1 })]);
    expect(
      linter.verify(text, config({ "markdown/no-duplicate-headings": "off" }), {
        filename,
      }),
    ).toEqual([]);
  });

  test("uses Markdown suppression directives without leaking between runs", () => {
    const linter = new Linter({ configType: "flat" });
    const prepared = config({ "markdown/no-duplicate-headings": "error" });
    expect(
      linter.verify(
        `<!-- eslint-disable markdown/no-duplicate-headings -->\n${text}`,
        prepared,
        { filename },
      ),
    ).toEqual([]);
    expect(linter.verify(text, prepared, { filename })).toHaveLength(1);
  });

  test("throws for unknown rules and invalid options, rather than document findings", () => {
    const linter = new Linter({ configType: "flat" });
    expect(() =>
      linter.verify(text, config({ "markdown/unknown": "error" }), {
        filename,
      }),
    ).toThrow(/Could not find "unknown"/);
    expect(() =>
      linter.verify(
        text,
        config({
          "markdown/no-duplicate-headings": ["error", { unexpected: true }],
        }),
        { filename },
      ),
    ).toThrow(/additional properties/);
  });

  test("throws if a rule crashes", () => {
    expect(() =>
      new Linter({ configType: "flat" }).verify(
        text,
        [
          ...config({ "probe/crash": "error" }),
          {
            plugins: {
              probe: {
                rules: {
                  crash: {
                    create() {
                      throw new Error("probe runtime failure");
                    },
                  },
                },
              },
            },
          },
        ],
        { filename },
      ),
    ).toThrow(/probe runtime failure/);
  });

  test("exposes unmatched configuration as a rule-less warning", () => {
    expect(
      new Linter({ configType: "flat" }).verify(
        text,
        config({ "markdown/no-duplicate-headings": "error" }),
        { filename: "virtual/example.txt" },
      ),
    ).toEqual([
      expect.objectContaining({
        ruleId: null,
        severity: 1,
        message: "No matching configuration found for virtual/example.txt.",
      }),
    ]);
  });
});
