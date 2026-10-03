import markdown, { type MarkdownRuleDefinition } from "@eslint/markdown";
import { Linter } from "eslint";
import { loadDocument, type DocumentSource } from "@dokkurator/loader";
import { describe, expect, test } from "vitest";
import {
  createLintConfig,
  lint,
  LintConfigurationError,
  LintRuntimeError,
  prepareLintConfiguration,
} from "../src/index.js";

const source = {
  sourceId: "repository",
  path: "docs/example.md",
  revision: "abc123",
};
const docType = { name: "guide", metadata: { type: "object" }, rules: [] };
const header = "---\ndoctype: guide\n---\n\n";
const prepare = (
  rules: Parameters<typeof prepareLintConfiguration>[0]["rules"] = {},
) => prepareLintConfiguration({ docTypes: [docType], rules });

describe("synchronous lint", () => {
  test("activates the complete recommended Markdown profile with explicit overrides", () => {
    const prepared = prepare();
    const recommended = Object.assign(
      {},
      ...markdown.configs.recommended.map((config) => config.rules),
    );
    expect(createLintConfig(prepared)[0]!.rules).toMatchObject(recommended);
    const originalText = `${header}![ ](image.png)\n`;
    const result = lint({ originalText, source, configuration: prepared });
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.status).toBe("failed");
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        phase: "lint",
        sourceId: source.sourceId,
        path: source.path,
        revision: source.revision,
        ruleId: "markdown/require-alt-text",
        severity: "error",
        messageId: expect.any(String),
        location: expect.objectContaining({ line: 5, column: 1 }),
      }),
    ]);
    expect(
      lint({
        originalText,
        source,
        configuration: prepare({ "markdown/require-alt-text": "warn" }),
      }),
    ).toMatchObject({
      status: "passed",
      diagnostics: [{ severity: "warning" }],
    });
    expect(
      lint({
        originalText,
        source,
        configuration: prepare({ "markdown/require-alt-text": "off" }),
      }),
    ).toEqual({ status: "passed", diagnostics: [], suppressedDiagnostics: [] });
  });

  test("preserves suppressed findings and justification without leaking to the next call", () => {
    const configuration = prepare();
    const originalText = `${header}<!-- eslint-disable markdown/require-alt-text -- decorative image -->\n![](image.png)\n`;
    const suppressed = lint({ originalText, source, configuration });
    expect(suppressed.status).toBe("passed");
    expect(suppressed.diagnostics).toEqual([]);
    expect(suppressed.suppressedDiagnostics).toEqual([
      expect.objectContaining({
        ruleId: "markdown/require-alt-text",
        severity: "error",
        suppressions: [
          { kind: "directive", justification: "decorative image" },
        ],
      }),
    ]);
    const second = lint({
      originalText: `${header}![](image.png)\n`,
      source: { ...source, sourceId: "other" },
      configuration,
    });
    expect(second.status).toBe("failed");
    expect(second.suppressedDiagnostics).toEqual([]);
    expect(second.diagnostics[0]!.sourceId).toBe("other");
    expect(suppressed.suppressedDiagnostics[0]!.sourceId).toBe("repository");
  });

  test("normalizes original positions with YAML, CRLF, Unicode and BOM", async () => {
    const originalText =
      "\uFEFF---\r\ndoctype: guide\r\n---\r\n\r\n# Grüße 😀\r\n\r\n# Grüße 😀\r\n";
    const input: DocumentSource = {
      list: async () => [],
      read: async (id) => ({
        id,
        path: id,
        content: originalText,
        source: { sourceId: "virtual", kind: "filesystem", path: id },
      }),
    };
    const document = await loadDocument(input, source.path);
    const result = lint({
      originalText: document.originalText,
      source: document.source,
      configuration: prepare(),
    });
    const position = document.headings[1]!.position!;
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        ruleId: "markdown/no-multiple-h1",
        location: {
          line: position.start.line,
          column: position.start.column,
          endLine: position.end.line,
          endColumn: position.end.column,
        },
      }),
    ]);
    expect(document.originalText).toBe(originalText);
    expect(document.metadata).toEqual({ doctype: "guide" });
  });

  test("reports malformed YAML once as a parse finding", () => {
    const result = lint({
      originalText: "---\ndoctype: [\n---\n# Heading\n",
      source,
      configuration: prepare(),
    });
    expect(result.status).toBe("failed");
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        phase: "parse",
        ruleId: "dokkurator/doctype",
        messageId: "invalid-yaml",
      }),
    ]);
  });

  test("matches direct Linter findings from the same configuration", () => {
    const originalText = `${header}# Title\n\n### Skipped level\n\n![](image.png)\n`;
    const configuration = prepare();
    const expected = new Linter().verify(
      originalText,
      createLintConfig(configuration),
      { filename: source.path },
    );
    const result = lint({ originalText, source, configuration });
    expect(
      result.diagnostics.map(({ ruleId, messageId, message }) => ({
        ruleId,
        messageId,
        message,
      })),
    ).toEqual(
      expected.map(({ ruleId, messageId, message }) => ({
        ruleId,
        messageId,
        message,
      })),
    );
  });

  test("preserves suggestions and fix ranges without applying edits", () => {
    const rule: MarkdownRuleDefinition = {
      meta: {
        type: "suggestion",
        schema: [],
        hasSuggestions: true,
        fixable: "code",
        messages: {
          finding: "Example finding",
          suggestion: "Example suggestion",
        },
      },
      create(context) {
        return {
          heading(node) {
            context.report({
              node,
              messageId: "finding",
              fix: (fixer) => fixer.replaceTextRange([0, 1], "##"),
              suggest: [
                {
                  messageId: "suggestion",
                  fix: (fixer) => fixer.replaceTextRange([0, 1], "##"),
                },
              ],
            });
          },
        };
      },
    };
    const configuration = prepareLintConfiguration({
      docTypes: [],
      plugins: { example: { rules: { local: rule } } },
      rules: { "dokkurator/doctype": "off", "example/local": "warn" },
    });
    const originalText = "\uFEFF# Grüße 😀\r\n";
    const result = lint({ originalText, source, configuration });
    expect(result.status).toBe("passed");
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        location: { line: 1, column: 2, endLine: 1, endColumn: 12 },
        fix: { range: [1, 2], text: "##" },
        suggestions: [
          {
            description: "Example suggestion",
            messageId: "suggestion",
            fix: { range: [1, 2], text: "##" },
          },
        ],
      }),
    ]);
    expect(originalText).toBe("\uFEFF# Grüße 😀\r\n");
  });

  test("uses explicit or clean committed revisions, without labeling working text as committed", () => {
    const configuration = prepare();
    const git = {
      root: "/unused",
      status: "clean" as const,
      fileRevision: "loaded-revision",
    };
    const originalText = `${header}![](image.png)`;
    expect(
      lint({
        originalText,
        source: { sourceId: "git", path: source.path, git },
        configuration,
      }).diagnostics[0]!.revision,
    ).toBe("loaded-revision");
    expect(
      lint({
        originalText,
        source: {
          sourceId: "git",
          path: source.path,
          git: { ...git, status: "modified" },
        },
        configuration,
      }).diagnostics[0],
    ).not.toHaveProperty("revision");
  });
});

describe("operational lint errors", () => {
  test.each([
    "virtual/example.txt",
    "/absolute/example.md",
    "https://example.com/file.md",
    "../example.md",
    "docs\\example.md",
    "node_modules/example.md",
    ".git/example.md",
  ])("rejects unmatched, excluded or invalid path %s", (path) => {
    expect(() =>
      lint({
        originalText: "# Text",
        source: { ...source, path },
        configuration: prepare(),
      }),
    ).toThrow(LintConfigurationError);
  });

  test("rejects invalid configuration before invoking the actual rule", () => {
    const configuration = prepare();
    const invalid = {
      ...configuration,
      flatConfig: createLintConfig(configuration).map((config) => ({
        ...config,
        rules: { ...config.rules, "markdown/unknown": "error" as const },
      })),
    };
    expect(() =>
      lint({ originalText: "# Text", source, configuration: invalid }),
    ).toThrow(LintConfigurationError);
  });

  test("reports a crashing rule as a runtime error with cause and source", () => {
    const cause = new Error("Rule crashed");
    const configuration = prepareLintConfiguration({
      docTypes: [docType],
      plugins: {
        broken: {
          rules: {
            local: {
              meta: { schema: [] },
              create() {
                throw cause;
              },
            },
          },
        },
      },
      rules: { "broken/local": "error" },
    });
    let error: unknown;
    try {
      lint({ originalText: `${header}# Text`, source, configuration });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(LintRuntimeError);
    expect(error).toMatchObject({ cause, source });
  });
});
