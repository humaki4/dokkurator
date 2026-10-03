import { type MarkdownRuleDefinition } from "@eslint/markdown";
import { Linter } from "eslint";
import { loadDocument, type DocumentSource } from "@dokkurator/loader";
import { describe, expect, test } from "vitest";
import {
  createLintConfig,
  lint,
  prepareLintConfiguration,
} from "../../index.js";

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

describe("lint locations, messages and edits", () => {
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
});
