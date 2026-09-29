import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { resolveActiveConfig } from "@dokkurator/config";
import { diffSources, indexSources, searchIndex } from "./knowledge-actions.js";

async function fixture(): Promise<string> {
  const projectRoot = await mkdtemp(
    join(tmpdir(), "dokkurator-knowledge-actions-"),
  );
  await mkdir(join(projectRoot, "repo", "docs"), { recursive: true });
  await writeFile(
    join(projectRoot, "repo", "docs", "guide.md"),
    "---\ntitle: Authentication\n---\n# OAuth\nUse access tokens.\n",
  );
  await mkdir(join(projectRoot, ".dokkurator"), { recursive: true });
  await writeFile(
    join(projectRoot, ".dokkurator/config.yaml"),
    "sources:\n  - id: docs\n    path: repo\n",
  );
  return projectRoot;
}

describe("knowledge actions", () => {
  test("indexes, diffs and searches a configured source", async () => {
    const root = await fixture();
    const options = {
      index: ".dokkurator/index.db",
      documentsDirectory: "docs",
    };
    await expect(
      indexSources(await resolveActiveConfig({ root, ...options })),
    ).resolves.toMatchObject([
      {
        sourceId: "docs",
        result: { indexedDocuments: 1, removedDocuments: 0 },
      },
    ]);
    await expect(
      diffSources(
        await resolveActiveConfig({ root, sourceId: "docs", ...options }),
      ),
    ).resolves.toMatchObject([{ sourceId: "docs", diff: { changes: [] } }]);
    const hits = await searchIndex(
      await resolveActiveConfig({
        root,
        includeSources: false,
        index: options.index,
      }),
      "authentication",
      10,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.document.source.sourceId).toBe("docs");
  });

  test("reports every document as added without an existing index", async () => {
    const root = await fixture();
    const result = await diffSources(
      await resolveActiveConfig({
        root,
        index: "missing.db",
        documentsDirectory: "docs",
      }),
    );
    expect(result[0]?.diff.changes).toMatchObject([
      { type: "added", path: "docs/guide.md" },
    ]);
  });
});
