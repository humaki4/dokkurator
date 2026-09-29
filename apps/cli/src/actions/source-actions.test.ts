import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, test, vi } from "vitest";
import { updateSources } from "@dokkurator/config";
import { addSource, listSources, removeSource } from "./source-actions.js";

async function fixture(): Promise<{ root: string; filename: string }> {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-actions-"));
  const filename = join(root, ".dokkurator", "config.yaml");
  await mkdir(join(root, ".dokkurator"), { recursive: true });
  await writeFile(filename, "sources: []\n");
  return { root, filename };
}

describe("source actions", () => {
  test("lists empty, text and JSON configurations", async () => {
    const { root } = await fixture();
    const output = vi.fn<(text: string) => void>();
    await listSources(root, false, output);
    expect(output).toHaveBeenLastCalledWith("No sources configured.\n");
    await updateSources(root, () => [{ id: "docs", path: "docs" }]);
    await listSources(root, false, output);
    expect(output).toHaveBeenLastCalledWith("docs\tdocs\n");
    await listSources(root, true, output);
    expect(output).toHaveBeenLastCalledWith(
      expect.stringContaining('"id": "docs"'),
    );
  });

  test("adds a local source and persists a relative path", async () => {
    const { root, filename } = await fixture();
    await mkdir(join(root, "docs"));
    const item = await addSource(
      root,
      { path: "docs", id: "handbook" },
      { ask: vi.fn() },
    );
    expect(item).toEqual({ id: "handbook", path: "docs" });
    expect(parse(await readFile(filename, "utf8"))).toEqual({
      sources: [item],
    });
  });

  test("adds a remote source without requiring a local path", async () => {
    const { root } = await fixture();
    const item = await addSource(
      root,
      {
        id: "remote",
        remote: "git@example.test:docs.git",
        branch: "main",
      },
      { ask: vi.fn() },
    );
    expect(item).toEqual({
      id: "remote",
      remote: { url: "git@example.test:docs.git", branch: "main" },
    });
  });

  test("preserves project and root-repository settings when editing sources", async () => {
    const { root, filename } = await fixture();
    await writeFile(
      filename,
      "knowledge:\n  index: state/index.db\ncheckouts:\n  directory: vendor\nwatch:\n  debounce: 125\ndocuments:\n  directory: docs\ndoctypes:\n  directory: types\nsources: []\n",
    );
    await mkdir(join(root, "docs"));
    const item = await addSource(
      root,
      { path: "docs", id: "docs" },
      { ask: vi.fn() },
    );
    await expect(readFile(filename, "utf8")).resolves.toContain(
      "index: state/index.db",
    );
    await expect(readFile(filename, "utf8")).resolves.toContain(
      "directory: vendor",
    );
    await removeSource(
      root,
      { id: "docs", yes: true, keepIndex: true },
      { ask: vi.fn(), confirm: vi.fn() },
    );
    expect(parse(await readFile(filename, "utf8"))).toMatchObject({
      knowledge: { index: "state/index.db" },
      checkouts: { directory: "vendor" },
      watch: { debounce: 125 },
      documents: { directory: "docs" },
      doctypes: { directory: "types" },
      sources: [],
    });
    expect(item.id).toBe("docs");
  });

  test("rejects missing paths and duplicate ids", async () => {
    const { root } = await fixture();
    await expect(
      addSource(root, { path: "missing", id: "docs" }, { ask: vi.fn() }),
    ).rejects.toThrow("does not exist");
    await mkdir(join(root, "docs"));
    await updateSources(root, () => [{ id: "docs", path: "docs" }]);
    await expect(
      addSource(root, { path: "docs", id: "docs" }, { ask: vi.fn() }),
    ).rejects.toThrow("already exists");
  });

  test("cancels removal or removes while keeping the index", async () => {
    const { root, filename } = await fixture();
    await updateSources(root, () => [{ id: "docs", path: "." }]);
    await expect(
      removeSource(
        root,
        { id: "docs" },
        { ask: vi.fn(), confirm: vi.fn(async () => false) },
      ),
    ).resolves.toEqual({ removed: false, id: "docs", deletedIndex: false });
    await expect(
      removeSource(
        root,
        { id: "docs", yes: true, keepIndex: true },
        { ask: vi.fn(), confirm: vi.fn() },
      ),
    ).resolves.toEqual({ removed: true, id: "docs", deletedIndex: false });
    expect(parse(await readFile(filename, "utf8"))).toEqual({ sources: [] });
  });

  test("rejects an unknown source", async () => {
    const { root } = await fixture();
    await expect(
      removeSource(
        root,
        { id: "missing", yes: true },
        { ask: vi.fn(), confirm: vi.fn() },
      ),
    ).rejects.toThrow("Unknown source");
  });
});
