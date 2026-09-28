import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import {
  findProjectRoot,
  loadConfig,
  resolveSourceContent,
  resolveSourcePath,
  saveConfig,
  validateConfig,
} from "./index.js";

test("loads, saves and discovers config", async () => {
  const root = await mkdtemp(join(tmpdir(), "config-"));
  const loaded = await loadConfig(root);
  expect(loaded.config.sources).toEqual([]);
  await saveConfig({
    ...loaded,
    config: { version: 1, sources: [{ id: "docs", path: "." }] },
  });
  const nested = join(root, "a");
  await mkdir(nested);
  expect(findProjectRoot(nested)).toBe(root);
  expect((await loadConfig(root)).config.sources[0]?.id).toBe("docs");
});
test("resolves managed checkout path", async () => {
  const loaded = await loadConfig(await mkdtemp(join(tmpdir(), "config-")));
  expect(
    resolveSourcePath(loaded, { id: "docs", remote: { url: "x" } }),
  ).toContain(".dokkurator/checkouts/docs");
});
test("merges repository config and source override", async () => {
  const root = await mkdtemp(join(tmpdir(), "config-"));
  const repo = join(root, "repo");
  await mkdir(join(repo, ".dokkurator"), { recursive: true });
  await writeFile(
    join(repo, ".dokkurator/config.yaml"),
    "documents:\n  directory: docs\n  exclude: [drafts/**]\n",
  );
  const loaded = {
    filename: join(root, ".dokkurator/config.yaml"),
    projectRoot: root,
    config: validateConfig({
      documents: { exclude: ["private/**"] },
      sources: [
        {
          id: "docs",
          path: "repo",
          config: { documents: { directory: "published" } },
        },
      ],
    }),
  };
  const value = await resolveSourceContent(loaded, loaded.config.sources[0]!);
  expect(value.documents.directory).toBe("published");
  expect(value.documents.exclude).toEqual(
    expect.arrayContaining(["drafts/**", "private/**"]),
  );
});
test.each([
  { version: 2 },
  { sources: "bad" },
  { sources: [{ id: "bad id", path: "." }] },
  { watch: { debounce: 0 } },
  { documents: { include: [1] } },
])("rejects invalid config %#", (value) =>
  expect(() => validateConfig(value)).toThrow(),
);
