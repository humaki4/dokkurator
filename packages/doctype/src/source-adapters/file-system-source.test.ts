import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { FileSystemSource } from "./file-system-source.js";
import { SourceNotFoundError } from "./source-adapter.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

test("reads a file as a normalized source document", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-source-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "docs"));
  await writeFile(join(root, "docs", "example.md"), "# Example\n");

  const source = new FileSystemSource({ root });

  await expect(source.read("docs/example.md")).resolves.toEqual({
    id: "docs/example.md",
    path: "docs/example.md",
    content: "# Example\n",
    source: {
      kind: "filesystem",
      path: "docs/example.md",
    },
  });
});

test("lists files below a source prefix", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-source-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "docs", "nested"), { recursive: true });
  await Promise.all([
    writeFile(join(root, "docs", "one.md"), "one"),
    writeFile(join(root, "docs", "nested", "two.md"), "two"),
  ]);

  const source = new FileSystemSource({ root });

  await expect(source.list({ prefix: "docs" })).resolves.toEqual([
    {
      id: "docs/nested/two.md",
      path: "docs/nested/two.md",
      source: { kind: "filesystem", path: "docs/nested/two.md" },
    },
    {
      id: "docs/one.md",
      path: "docs/one.md",
      source: { kind: "filesystem", path: "docs/one.md" },
    },
  ]);
});

test("rejects paths outside the configured source root", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-source-"));
  temporaryDirectories.push(root);
  const source = new FileSystemSource({ root });

  await expect(source.read("../outside.md")).rejects.toThrow(
    "Source path escapes its root",
  );
});

test("reports a missing source with a portable error", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-source-"));
  temporaryDirectories.push(root);
  const source = new FileSystemSource({ root });

  await expect(source.read("missing.md")).rejects.toEqual(
    expect.objectContaining<Partial<SourceNotFoundError>>({
      name: "SourceNotFoundError",
      sourceId: "missing.md",
    }),
  );
});
