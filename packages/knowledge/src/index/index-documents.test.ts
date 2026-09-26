import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { KnowledgeDocument } from "../index-adapter/model.js";
import { FileSystemSource } from "@dokkurator/doctype";
import { afterEach, expect, test, vi } from "vitest";
import { indexDocuments } from "./index-documents.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

test("loads a complete directory and replaces the index once", async () => {
  const replaceAll = vi.fn<
    (documents: readonly KnowledgeDocument[]) => Promise<void>
  >(async () => {});
  const root = await temporaryDirectory();
  await mkdir(join(root, "handbook", "nested"), { recursive: true });
  await Promise.all([
    writeFile(join(root, "README.md"), "# Outside\n"),
    writeFile(join(root, "handbook", "first.md"), "# First\n"),
    writeFile(join(root, "handbook", "nested", "second.md"), "# Second\n"),
  ]);
  const source = new FileSystemSource({ root, sourceId: "docs" });

  await expect(
    indexDocuments({
      source,
      index: { replaceAll },
      documentsDirectory: "handbook",
    }),
  ).resolves.toEqual({ indexedDocuments: 2 });

  expect(replaceAll).toHaveBeenCalledOnce();
  expect(replaceAll.mock.calls[0]?.[0].map(({ id }) => id)).toEqual([
    "docs:handbook/first.md",
    "docs:handbook/nested/second.md",
  ]);
});

test("replaces the index with an empty set when the directory is empty", async () => {
  const replaceAll = vi.fn<
    (documents: readonly KnowledgeDocument[]) => Promise<void>
  >(async () => {});
  const root = await temporaryDirectory();

  await expect(
    indexDocuments({
      source: new FileSystemSource({ root, sourceId: "docs" }),
      index: { replaceAll },
    }),
  ).resolves.toEqual({ indexedDocuments: 0 });

  expect(replaceAll).toHaveBeenCalledWith([]);
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "dokkurator-indexing-"));
  temporaryDirectories.push(directory);
  return directory;
}
