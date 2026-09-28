import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, test, vi } from "vitest";
import type { LoadedConfig } from "@dokkurator/config";
import { addSource, listSources, removeSource } from "./source-actions.js";

async function fixture(): Promise<LoadedConfig> {
  const projectRoot = await mkdtemp(join(tmpdir(), "dokkurator-actions-"));
  return {
    projectRoot,
    filename: join(projectRoot, ".dokkurator", "config.yaml"),
    config: { sources: [] },
  };
}

describe("source actions", () => {
  test("lists empty, text and JSON configurations", async () => {
    const loaded = await fixture();
    const output = vi.fn<(text: string) => void>();
    listSources(loaded, false, output);
    expect(output).toHaveBeenLastCalledWith("No sources configured.\n");
    const configured = {
      ...loaded,
      config: { sources: [{ id: "docs", path: "docs" }] },
    };
    listSources(configured, false, output);
    expect(output).toHaveBeenLastCalledWith("docs\tdocs\n");
    listSources(configured, true, output);
    expect(output).toHaveBeenLastCalledWith(
      expect.stringContaining('"id": "docs"'),
    );
  });

  test("adds a local source and persists a relative path", async () => {
    const loaded = await fixture();
    await mkdir(join(loaded.projectRoot, "docs"));
    const item = await addSource(
      loaded,
      { path: "docs", id: "handbook" },
      { ask: vi.fn() },
    );
    expect(item).toEqual({ id: "handbook", path: "docs" });
    expect(parse(await readFile(loaded.filename, "utf8"))).toEqual({
      sources: [item],
    });
  });

  test("adds a remote source without requiring a local path", async () => {
    const loaded = await fixture();
    const item = await addSource(
      loaded,
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

  test("rejects missing paths and duplicate ids", async () => {
    const loaded = await fixture();
    await expect(
      addSource(loaded, { path: "missing", id: "docs" }, { ask: vi.fn() }),
    ).rejects.toThrow("does not exist");
    await mkdir(join(loaded.projectRoot, "docs"));
    const configured = {
      ...loaded,
      config: { sources: [{ id: "docs", path: "docs" }] },
    };
    await expect(
      addSource(configured, { path: "docs", id: "docs" }, { ask: vi.fn() }),
    ).rejects.toThrow("already exists");
  });

  test("cancels removal or removes while keeping the index", async () => {
    const loaded = await fixture();
    const configured = {
      ...loaded,
      config: { sources: [{ id: "docs", path: "." }] },
    };
    await expect(
      removeSource(
        configured,
        { id: "docs" },
        {
          ask: vi.fn(),
          confirm: vi.fn(async () => false),
        },
      ),
    ).resolves.toEqual({ removed: false, id: "docs", deletedIndex: false });
    await expect(
      removeSource(
        configured,
        {
          id: "docs",
          yes: true,
          keepIndex: true,
        },
        {
          ask: vi.fn(),
          confirm: vi.fn(),
        },
      ),
    ).resolves.toEqual({ removed: true, id: "docs", deletedIndex: false });
    expect(parse(await readFile(loaded.filename, "utf8"))).toEqual({
      sources: [],
    });
  });

  test("rejects an unknown source", async () => {
    await expect(
      removeSource(
        await fixture(),
        { id: "missing", yes: true },
        {
          ask: vi.fn(),
          confirm: vi.fn(),
        },
      ),
    ).rejects.toThrow("Unknown source");
  });
});
