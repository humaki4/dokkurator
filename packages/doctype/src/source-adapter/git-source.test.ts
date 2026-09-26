import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { afterEach, expect, test } from "vitest";
import { GitSource } from "./git-source.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

test("lists tracked and untracked files with Git metadata", async () => {
  const root = await createRepository();
  await writeFile(join(root, ".gitignore"), "ignored.md\n");
  await writeFile(join(root, "tracked.md"), "# Tracked\n");
  const git = simpleGit(root);
  await git.add([".gitignore", "tracked.md"]);
  await git.commit("add tracked document");
  await writeFile(join(root, "untracked.md"), "# Untracked\n");
  await writeFile(join(root, "ignored.md"), "# Ignored\n");

  const entries = await new GitSource({ root }).list();

  expect(entries.map(({ id }) => id)).toEqual([
    ".gitignore",
    "tracked.md",
    "untracked.md",
  ]);
  expect(entries.find(({ id }) => id === "tracked.md")?.source).toMatchObject({
    sourceId: "https://example.com/docs.git",
    kind: "git",
    repository: "https://example.com/docs.git",
    git: {
      root,
      branch: "main",
      status: "clean",
      headRevision: expect.stringMatching(/^[0-9a-f]{40,64}$/),
      fileRevision: expect.stringMatching(/^[0-9a-f]{40,64}$/),
      author: { name: "Dokkurator Test", email: "test@example.com" },
    },
  });
  expect(
    entries.find(({ id }) => id === "untracked.md")?.source.git,
  ).toMatchObject({ status: "untracked" });
});

test("reports local modifications while retaining the last commit", async () => {
  const root = await createRepository();
  await writeFile(join(root, "document.md"), "before\n");
  const git = simpleGit(root);
  await git.add("document.md");
  await git.commit("add document");
  const committed = await new GitSource({ root }).read("document.md");

  await writeFile(join(root, "document.md"), "after\n");
  const modified = await new GitSource({ root }).read("document.md");

  expect(modified.content).toBe("after\n");
  expect(modified.source.git).toMatchObject({
    status: "modified",
    fileRevision: committed.source.git?.fileRevision,
  });
});

test("keeps source ids relative to a configured repository subdirectory", async () => {
  const root = await createRepository();
  const docs = join(root, "docs");
  await mkdir(docs);
  await writeFile(join(docs, "guide.md"), "# Guide\n");
  const git = simpleGit(root);
  await git.add("docs/guide.md");
  await git.commit("add guide");

  const entries = await new GitSource({ root: docs }).list();

  expect(entries.map(({ id }) => id)).toEqual(["guide.md"]);
  expect(entries[0]?.source.git?.root).toBe(root);
});

async function createRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-git-source-"));
  temporaryDirectories.push(root);
  const git = simpleGit(root);
  await git.init(["--initial-branch=main"]);
  await git.addConfig("user.name", "Dokkurator Test");
  await git.addConfig("user.email", "test@example.com");
  await git.addRemote("origin", "https://example.com/docs.git");
  return root;
}
