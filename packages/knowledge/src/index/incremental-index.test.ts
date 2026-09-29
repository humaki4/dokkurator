import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSystemSource } from "@dokkurator/doctype";
import { afterEach, expect, test } from "vitest";
import { SQLiteIndex } from "../index-adapter/sqlite/sqlite-index.js";
import {
  calculateDocumentDiff,
  indexDocumentChanges,
} from "./incremental-index.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

test("indexes only changed documents and persists the new source state", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-incremental-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "docs"));
  await writeFile(join(root, "docs", "changed.md"), "# Before\n");
  await writeFile(join(root, "docs", "deleted.md"), "# Deleted\n");
  const source = new FileSystemSource({ root, sourceId: "docs-source" });
  const index = new SQLiteIndex({
    filename: join(root, ".dokkurator", "index.db"),
  });

  await indexDocumentChanges({ source, index, documents: {} });
  await writeFile(join(root, "docs", "changed.md"), "# After\n");
  await writeFile(join(root, "docs", "added.md"), "# Added\n");
  await rm(join(root, "docs", "deleted.md"));

  const result = await indexDocumentChanges({ source, index, documents: {} });
  expect(result.indexedDocuments).toBe(2);
  expect(result.removedDocuments).toBe(1);
  expect(result.diff.changes.map(({ type, path }) => ({ type, path }))).toEqual(
    [
      { type: "added", path: "docs/added.md" },
      { type: "modified", path: "docs/changed.md" },
      { type: "deleted", path: "docs/deleted.md" },
    ],
  );
  expect(
    (await index.query()).map(({ source, content }) => ({
      path: source.path,
      content,
    })),
  ).toEqual([
    { path: "docs/added.md", content: "# Added\n" },
    { path: "docs/changed.md", content: "# After\n" },
  ]);
  await expect(
    calculateDocumentDiff({ source, index, documents: {} }),
  ).resolves.toMatchObject({
    changes: [],
  });
  index.close();
});
