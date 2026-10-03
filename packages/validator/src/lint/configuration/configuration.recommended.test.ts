import markdown from "@eslint/markdown";
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

describe("recommended Markdown profile", () => {
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
});
