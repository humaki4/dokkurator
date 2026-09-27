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

test("diffs commits and ignores working-tree changes", async () => {
  const root = await createRepository();
  const git = simpleGit(root);
  await writeFile(join(root, "changed.md"), "before\n");
  await writeFile(join(root, "deleted.md"), "deleted\n");
  await git.add(["changed.md", "deleted.md"]);
  await git.commit("initial documents");
  const source = new GitSource({ root });
  const previous = await source.diff();

  await writeFile(join(root, "changed.md"), "committed\n");
  await writeFile(join(root, "added.md"), "added\n");
  await rm(join(root, "deleted.md"));
  await git.add(["changed.md", "added.md", "deleted.md"]);
  await git.commit("change documents");
  await writeFile(join(root, "changed.md"), "uncommitted\n");
  await writeFile(join(root, "untracked.md"), "untracked\n");

  const current = await source.diff(previous.state);
  expect(current.state).toEqual({
    sourceId: "https://example.com/docs.git",
    revision: {
      id: await git.revparse(["HEAD"]),
      type: "git-commit",
    },
    scope: {},
  });
  expect(current.changes).toEqual([
    expect.objectContaining({ type: "added", path: "added.md" }),
    expect.objectContaining({ type: "modified", path: "changed.md" }),
    expect.objectContaining({ type: "deleted", path: "deleted.md" }),
  ]);
  await expect(
    source.read("changed.md", { revision: current.state.revision.id }),
  ).resolves.toMatchObject({ content: "committed\n" });
});

test("an empty diff prefix includes the complete committed tree", async () => {
  const root = await createRepository();
  await writeFile(join(root, "document.md"), "# Committed\n");
  const git = simpleGit(root);
  await git.add("document.md");
  await git.commit("add document");

  const diff = await new GitSource({ root }).diff(undefined, { prefix: "" });

  expect(diff.changes).toEqual([
    expect.objectContaining({ type: "added", path: "document.md" }),
  ]);
});

test("diffs a source rooted in a repository subdirectory", async () => {
  const root = await createRepository();
  const docs = join(root, "docs");
  await mkdir(docs);
  await writeFile(join(docs, "guide.md"), "# Guide\n");
  await writeFile(join(root, "outside.md"), "# Outside\n");
  const git = simpleGit(root);
  await git.add(["docs/guide.md", "outside.md"]);
  await git.commit("add documents");

  const diff = await new GitSource({ root: docs }).diff(undefined, {
    prefix: "",
  });

  expect(diff.changes).toEqual([
    expect.objectContaining({ type: "added", path: "guide.md" }),
  ]);
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
