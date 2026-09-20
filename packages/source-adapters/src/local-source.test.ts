import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { afterEach, expect, test } from "vitest";
import { FileSystemSource } from "./file-system-source.js";
import { GitSource } from "./git-source.js";
import { createLocalSource } from "./local-source.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

test("creates a filesystem adapter outside a Git working tree", async () => {
  const root = await temporaryDirectory();

  await expect(createLocalSource(root)).resolves.toBeInstanceOf(
    FileSystemSource,
  );
});

test("creates a Git adapter inside a Git working tree", async () => {
  const root = await temporaryDirectory();
  await simpleGit(root).init();

  await expect(createLocalSource(root)).resolves.toBeInstanceOf(GitSource);
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "dokkurator-source-"));
  temporaryDirectories.push(directory);
  return directory;
}
