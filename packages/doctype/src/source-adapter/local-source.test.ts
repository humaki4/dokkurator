import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { afterEach, expect, test } from "vitest";
import { FileSystemSource } from "./file-system-source.js";
import { GitSource } from "./git-source.js";
import { createGitCheckoutSource, createLocalSource } from "./local-source.js";

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

test("clones a configured Git remote into a managed checkout", async () => {
  const remote = await temporaryDirectory();
  const checkout = join(await temporaryDirectory(), "checkout");
  const git = simpleGit(remote);
  await git.init();
  await git.addConfig("user.name", "Dokkurator Test");
  await git.addConfig("user.email", "test@dokkurator.invalid");
  await writeFile(join(remote, "README.md"), "# Remote\n");
  await git.add("README.md");
  await git.commit("initial");

  const source = await createGitCheckoutSource({
    root: checkout,
    url: remote,
    sourceId: "remote-docs",
  });

  await expect(source.getSourceId()).resolves.toBe("remote-docs");
  await expect(source.read("README.md")).resolves.toMatchObject({
    content: "# Remote\n",
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "dokkurator-source-"));
  temporaryDirectories.push(directory);
  return directory;
}
