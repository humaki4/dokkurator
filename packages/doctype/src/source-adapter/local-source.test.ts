import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { afterEach, expect, test } from "vitest";
import { FileSystemSource } from "./file-system-source.js";
import {
  createGitCheckoutSource,
  GitSource,
  isGitRepositoryRoot,
} from "./git-source.js";
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

test("does not treat a directory inside another repository as its checkout", async () => {
  const project = await temporaryDirectory();
  const checkout = join(project, ".dokkurator", "repos", "docs");
  await mkdir(checkout, { recursive: true });
  await simpleGit(project).init();

  await expect(isGitRepositoryRoot(checkout)).resolves.toBe(false);
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

test("updates an existing managed checkout from its origin", async () => {
  const working = await temporaryDirectory();
  const remote = join(await temporaryDirectory(), "remote.git");
  const checkout = join(await temporaryDirectory(), "checkout");
  const git = simpleGit(working);
  await git.init(["--initial-branch=main"]);
  await git.addConfig("user.name", "Dokkurator Test");
  await git.addConfig("user.email", "test@dokkurator.invalid");
  await writeFile(join(working, "README.md"), "# Remote\n");
  await git.add("README.md");
  await git.commit("initial");
  await simpleGit().clone(working, remote, ["--bare"]);
  await git.addRemote("origin", remote);

  const source = await createGitCheckoutSource({ root: checkout, url: remote });

  await writeFile(join(working, "UPDATED.md"), "# Updated\n");
  await git.add("UPDATED.md");
  await git.commit("update remote");
  await git.push("origin", "main");

  const updatedSource = await createGitCheckoutSource({
    root: checkout,
    url: remote,
    branch: "main",
  });

  await expect(updatedSource.read("UPDATED.md")).resolves.toMatchObject({
    content: "# Updated\n",
  });
  await expect(source.read("UPDATED.md")).resolves.toMatchObject({
    content: "# Updated\n",
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "dokkurator-source-"));
  temporaryDirectories.push(directory);
  return directory;
}
