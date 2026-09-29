import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { findProjectRoot } from "./discovery.js";
import { loadConfig, saveConfig } from "./config-file.js";
import { resolveActiveConfig } from "./resolution.js";
import { validateConfig } from "./validation.js";

async function writeProjectConfig(root: string, text: string): Promise<void> {
  await mkdir(join(root, ".dokkurator"), { recursive: true });
  await writeFile(join(root, ".dokkurator/config.yaml"), text);
}

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

test("resolves repository and project settings with invocation overrides", async () => {
  const root = await mkdtemp(join(tmpdir(), "config-active-"));
  const repo = join(root, "repo");
  await writeProjectConfig(
    repo,
    "documents:\n  directory: repository-docs\n  include: ['**/*.mdx']\ndoctypes:\n  directory: repository-types\n",
  );
  await writeProjectConfig(
    root,
    "knowledge:\n  index: configured.db\nwatch:\n  debounce: 500\nsources:\n  - id: docs\n    path: repo\n",
  );

  const config = await resolveActiveConfig({
    root,
    sourceId: "docs",
    index: "override.db",
    documentsDirectory: "selected-docs",
    doctypesDirectory: "selected-types",
    debounce: 25,
  });

  expect(config.sources).toEqual([
    expect.objectContaining({
      id: "docs",
      root: repo,
      documents: {
        directory: "selected-docs",
        include: ["**/*.mdx"],
        exclude: expect.any(Array),
      },
      doctypes: { directory: "selected-types" },
    }),
  ]);
  expect(config.knowledge.index).toBe(join(root, "override.db"));
  expect(config.watch.debounce).toBe(25);
});

test("resolves source-independent project settings", async () => {
  const root = await mkdtemp(join(tmpdir(), "config-active-"));
  const config = await resolveActiveConfig({
    root,
    includeSources: false,
    index: "search.db",
  });
  expect(config.sources).toEqual([]);
  expect(config.knowledge.index).toBe(join(root, "search.db"));
});

test("uses root repository settings only for a source at the project root", async () => {
  const root = await mkdtemp(join(tmpdir(), "config-root-repository-"));
  const repository = join(root, "repo");
  await writeProjectConfig(
    repository,
    "documents:\n  directory: repository-docs\n",
  );
  await writeProjectConfig(
    root,
    "documents:\n  directory: root-docs\nsources:\n  - id: root\n    path: .\n  - id: repo\n    path: repo\n",
  );
  const config = await resolveActiveConfig({ root });
  expect(config.repository.documents.directory).toBe("root-docs");
  expect(config.sources.map(({ documents }) => documents.directory)).toEqual([
    "root-docs",
    "repository-docs",
  ]);
});

test("resolves managed checkout paths and default settings", async () => {
  const root = await mkdtemp(join(tmpdir(), "config-checkout-"));
  await writeProjectConfig(
    root,
    "sources:\n  - id: docs\n    remote:\n      url: https://example.test/docs\n",
  );
  const config = await resolveActiveConfig({ root });
  expect(config.sources[0]?.root).toBe(
    join(root, ".dokkurator/checkouts/docs"),
  );
  expect(config.repository.documents.directory).toBe(".");
  expect(config.repository.doctypes.directory).toBe("_dokkurator/.doctypes");
});

test("lets invocation options replace repository values", async () => {
  const root = await mkdtemp(join(tmpdir(), "config-override-"));
  await writeProjectConfig(
    root,
    "documents:\n  exclude: [drafts/**]\nsources:\n  - id: root\n    path: .\n",
  );
  const config = await resolveActiveConfig({
    root,
    exclude: ["private/**"],
  });
  expect(config.repository.documents.exclude).toEqual(["private/**"]);
  await expect(
    resolveActiveConfig({ root, documentsDirectory: "" }),
  ).rejects.toThrow("documents.directory must be a non-empty string");
});

test.each([
  { version: 2 },
  { sources: "bad" },
  { sources: [{ id: "bad id", path: "." }] },
  {
    sources: [
      { id: "docs", path: ".", config: { documents: { directory: "docs" } } },
    ],
  },
  { watch: { debounce: 0 } },
  { documents: { include: [1] } },
])("rejects invalid config %#", (value) =>
  expect(() => validateConfig(value)).toThrow(),
);
