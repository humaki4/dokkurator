import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveActiveConfig } from "@dokkurator/config";
import { describe, expect, test } from "vitest";
import { diffSources, indexSources, searchIndex } from "./knowledge-actions.js";

async function fixture(): Promise<{ root: string; docs: string }> {
  const projectRoot = await mkdtemp(join(tmpdir(), "dokkurator-diff-search-"));
  const docs = join(projectRoot, "repo", "docs");
  await mkdir(docs, { recursive: true });
  await writeFile(
    join(docs, "first.md"),
    "---\nstatus: accepted\n---\n# Authentication\nOAuth tokens\n",
  );
  await writeFile(
    join(docs, "second.md"),
    "---\nstatus: draft\n---\n# Sessions\nAuthentication cookies\n",
  );
  await mkdir(join(projectRoot, ".dokkurator"), { recursive: true });
  await writeFile(
    join(projectRoot, ".dokkurator/config.yaml"),
    "sources:\n  - id: docs\n    path: repo\n",
  );
  return {
    docs,
    root: projectRoot,
  };
}

describe("diffSources", () => {
  test("reports added, modified and deleted documents without mutating the index", async () => {
    const { root, docs } = await fixture();
    const options = {
      index: ".dokkurator/index.db",
      documentsDirectory: "docs",
    };
    await indexSources(await resolveActiveConfig({ root, ...options }));
    await writeFile(join(docs, "first.md"), "# Changed\n");
    await rm(join(docs, "second.md"));
    await writeFile(join(docs, "third.md"), "# Added\n");

    const expectedChanges = [
      { type: "modified", path: "docs/first.md" },
      { type: "deleted", path: "docs/second.md" },
      { type: "added", path: "docs/third.md" },
    ];
    const active = await resolveActiveConfig({
      root,
      sourceId: "docs",
      ...options,
    });
    const [firstDiff] = await diffSources(active);
    const [secondDiff] = await diffSources(active);

    expect(
      firstDiff?.diff.changes.map(({ type, path }) => ({ type, path })),
    ).toEqual(expectedChanges);
    expect(
      secondDiff?.diff.changes.map(({ type, path }) => ({ type, path })),
    ).toEqual(expectedChanges);
  });

  test("rejects an unknown source id", async () => {
    const { root } = await fixture();
    await expect(
      resolveActiveConfig({
        root,
        sourceId: "missing",
        index: "index.db",
        documentsDirectory: "docs",
      }),
    ).rejects.toThrow("Unknown source: missing");
  });
});

describe("searchIndex", () => {
  test("supports metadata expressions and result limits", async () => {
    const { root } = await fixture();
    const index = ".dokkurator/index.db";
    const active = await resolveActiveConfig({
      root,
      index,
      documentsDirectory: "docs",
    });
    await indexSources(active);
    const accepted = await searchIndex(active, "status:accepted", 10);
    expect(accepted.map(({ document }) => document.source.path)).toEqual([
      "docs/first.md",
    ]);
    await expect(
      searchIndex(active, "authentication", 1),
    ).resolves.toHaveLength(1);
  });

  test("rejects invalid search syntax", async () => {
    const { root } = await fixture();
    await expect(
      searchIndex(
        await resolveActiveConfig({
          root,
          includeSources: false,
          index: "missing.db",
        }),
        "status:",
        10,
      ),
    ).rejects.toThrow("Invalid search query");
  });
});
