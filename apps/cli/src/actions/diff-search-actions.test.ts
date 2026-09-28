import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LoadedConfig } from "@dokkurator/config";
import { describe, expect, test } from "vitest";
import { diffSources, indexSources, searchIndex } from "./knowledge-actions.js";

async function fixture(): Promise<{ loaded: LoadedConfig; docs: string }> {
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
  return {
    docs,
    loaded: {
      projectRoot,
      filename: join(projectRoot, ".dokkurator", "config.yaml"),
      config: { sources: [{ id: "docs", path: "repo" }] },
    },
  };
}

describe("diffSources", () => {
  test("reports added, modified and deleted documents without mutating the index", async () => {
    const { loaded, docs } = await fixture();
    const options = {
      index: ".dokkurator/index.db",
      documentsDirectory: "docs",
    };
    await indexSources(loaded, undefined, options);
    await writeFile(join(docs, "first.md"), "# Changed\n");
    await rm(join(docs, "second.md"));
    await writeFile(join(docs, "third.md"), "# Added\n");

    const expectedChanges = [
      { type: "modified", path: "docs/first.md" },
      { type: "deleted", path: "docs/second.md" },
      { type: "added", path: "docs/third.md" },
    ];
    const [firstDiff] = await diffSources(loaded, "docs", options);
    const [secondDiff] = await diffSources(loaded, "docs", options);

    expect(
      firstDiff?.diff.changes.map(({ type, path }) => ({ type, path })),
    ).toEqual(expectedChanges);
    expect(
      secondDiff?.diff.changes.map(({ type, path }) => ({ type, path })),
    ).toEqual(expectedChanges);
  });

  test("rejects an unknown source id", async () => {
    const { loaded } = await fixture();
    await expect(
      diffSources(loaded, "missing", {
        index: "index.db",
        documentsDirectory: "docs",
      }),
    ).rejects.toThrow("Unknown source: missing");
  });
});

describe("searchIndex", () => {
  test("supports metadata expressions and result limits", async () => {
    const { loaded } = await fixture();
    const index = ".dokkurator/index.db";
    await indexSources(loaded, undefined, {
      index,
      documentsDirectory: "docs",
    });
    const accepted = await searchIndex(loaded, "status:accepted", {
      index,
      limit: 10,
    });
    expect(accepted.map(({ document }) => document.source.path)).toEqual([
      "docs/first.md",
    ]);
    await expect(
      searchIndex(loaded, "authentication", { index, limit: 1 }),
    ).resolves.toHaveLength(1);
  });

  test("rejects invalid search syntax", async () => {
    const { loaded } = await fixture();
    await expect(
      searchIndex(loaded, "status:", { index: "missing.db", limit: 10 }),
    ).rejects.toThrow("Invalid search query");
  });
});
