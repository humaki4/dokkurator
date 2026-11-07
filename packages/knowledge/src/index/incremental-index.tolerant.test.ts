import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { FileSystemSource, openConfiguredSource } from "@dokkurator/loader";
import { expect, test, vi } from "vitest";
import { SQLiteIndex } from "../index-adapter/sqlite/sqlite-index.js";
import {
  calculateDocumentDiff,
  indexDocumentChanges,
} from "./incremental-index.js";

const valid = "---\ndoctype: unknown\nstatus: accepted\n---\n# Searchable\n";
const invalid = "---\ndoctype: guide\nstatus: [\n---\n# Searchable\n";

test("indexes mixed frontmatter and replaces stale metadata through edits and deletion", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-tolerant-"));
  const index = new SQLiteIndex({
    filename: join(root, ".dokkurator/index.db"),
  });
  try {
    await mkdir(join(root, "docs"));
    const path = join(root, "docs/change.md");
    await writeFile(path, valid);
    await writeFile(join(root, "docs/syntax.md"), invalid);
    await writeFile(
      join(root, "docs/alias.md"),
      "---\ndoctype: guide\nvalue: *missing\n---\n# Searchable\n",
    );
    const options = {
      source: new FileSystemSource({ root, sourceId: "docs" }),
      index,
      documents: {},
    };
    expect((await indexDocumentChanges(options)).indexedDocuments).toBe(3);
    expect(await index.search({ text: "Searchable" })).toHaveLength(3);
    for (const name of ["syntax", "alias"]) {
      expect(await index.get(`docs:docs/${name}.md`)).toMatchObject({
        metadata: {},
        headings: [{ text: "Searchable" }],
      });
      expect((await index.get(`docs:docs/${name}.md`))?.type).toBeUndefined();
    }
    expect((await index.get("docs:docs/change.md"))?.type).toBe("unknown");
    const accepted = {
      expression: {
        type: "term" as const,
        metadataKey: "status",
        value: "accepted",
      },
    };
    expect(await index.search(accepted)).toHaveLength(1);
    await writeFile(path, invalid);
    await indexDocumentChanges(options);
    expect(await index.search(accepted)).toEqual([]);
    expect((await index.get("docs:docs/change.md"))?.type).toBeUndefined();
    await writeFile(path, valid);
    await indexDocumentChanges(options);
    expect(await index.search(accepted)).toHaveLength(1);
    await rm(path);
    expect((await indexDocumentChanges(options)).removedDocuments).toBe(1);
    expect(await index.search(accepted)).toEqual([]);
    expect((await calculateDocumentDiff(options)).changes).toEqual([]);
    expect((await indexDocumentChanges(options)).indexedDocuments).toBe(0);
    const state = await index.getSourceState("docs");
    await writeFile(join(root, "docs/syntax.md"), "# Changed\n");
    vi.spyOn(options.source, "read").mockRejectedValueOnce(
      new Error("read failed"),
    );
    await expect(indexDocumentChanges(options)).rejects.toThrow("read failed");
    expect(await index.getSourceState("docs")).toEqual(state);
    expect(await index.search({ text: "Searchable" })).toHaveLength(2);
  } finally {
    index.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("reads tolerant Git documents at the diff revision instead of the working tree", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-tolerant-git-"));
  const index = new SQLiteIndex({
    filename: join(root, ".dokkurator/index.db"),
  });
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    git("init", "--initial-branch=main");
    git("config", "user.name", "Test");
    git("config", "user.email", "test@example.invalid");
    await writeFile(join(root, "example.md"), invalid);
    git("add", "example.md");
    git("commit", "-m", "initial");
    const revision = git("rev-parse", "HEAD");
    await writeFile(join(root, "example.md"), "# Uncommitted\n");
    const source = await openConfiguredSource({ id: "git", root });
    const options = { source, index, documents: {} };
    expect((await indexDocumentChanges(options)).indexedDocuments).toBe(1);
    expect(await index.get("git:example.md")).toMatchObject({
      metadata: {},
      content: "# Searchable\n",
      source: { revision },
    });
    expect(await index.search({ text: "Searchable" })).toHaveLength(1);
    expect(await index.search({ text: "Uncommitted" })).toEqual([]);
    expect((await calculateDocumentDiff(options)).changes).toEqual([]);
  } finally {
    index.close();
    await rm(root, { recursive: true, force: true });
  }
});
