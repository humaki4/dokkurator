import { describe, expect, test } from "vitest";
import { lint, prepareLintConfiguration } from "../../index.js";

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

describe("lint invocation isolation and source identity", () => {
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
    expect(suppressed.reporting.suppressedMessages[0]).toMatchObject({
      ruleId: "markdown/require-alt-text",
      severity: 2,
      suppressions: [{ kind: "directive", justification: "decorative image" }],
    });
    expect(
      suppressed.reporting.rulesMeta["markdown/require-alt-text"],
    ).toBeDefined();
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
