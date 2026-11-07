import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { afterEach, expect, test } from "vitest";
import { createDokkurator } from "./lifecycle.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test("prepares, inspects, diffs, syncs and searches one source", async () => {
  const root = await localProject();
  const app = createDokkurator({ root });
  await app.open();

  await expect(app.prepare({ sourceId: "docs" })).resolves.toMatchObject({
    results: [
      {
        sourceId: "docs",
        checkout: "local",
        index: "initialized",
        indexedDocuments: 1,
      },
    ],
    errors: [],
  });
  await expect(app.prepare({ sourceId: "docs" })).resolves.toMatchObject({
    results: [{ sourceId: "docs", index: "existing" }],
    errors: [],
  });
  await expect(app.listDocTypes({ sourceId: "docs" })).resolves.toMatchObject({
    results: [{ sourceId: "docs", doctypes: [{ name: "decision" }] }],
    errors: [],
  });
  await expect(app.listDocuments({ sourceId: "docs" })).resolves.toMatchObject({
    results: [{ sourceId: "docs", documents: [{ type: "decision" }] }],
    errors: [],
  });
  await expect(
    app.search("authentication", { sourceId: "docs" }),
  ).resolves.toMatchObject([{ document: { source: { sourceId: "docs" } } }]);

  await writeFile(
    join(root, "repo", "docs", "decision.md"),
    "---\ndoctype: decision\ntitle: Authorization\n---\n# Authorization\n",
  );
  await expect(app.diff({ sourceId: "docs" })).resolves.toMatchObject({
    results: [{ diff: { changes: [{ type: "modified" }] } }],
    errors: [],
  });
  await expect(app.sync({ sourceId: "docs" })).resolves.toMatchObject({
    results: [{ sourceId: "docs", indexedDocuments: 1 }],
    errors: [],
  });
  await expect(app.diff({ sourceId: "docs" })).resolves.toMatchObject({
    results: [{ diff: { changes: [] } }],
    errors: [],
  });
  await app.close();
});

test("continues with later sources and returns structured failures", async () => {
  const root = await localProject(
    "sources:\n  - id: missing\n    path: missing\n  - id: docs\n    path: repo\n",
  );
  const app = createDokkurator({ root });
  await app.open();

  const result = await app.prepare();

  expect(result.results).toMatchObject([
    { sourceId: "docs", index: "initialized" },
  ]);
  expect(result.errors).toMatchObject([
    {
      sourceId: "missing",
      phase: "preparation",
      recovery: "check-source",
    },
  ]);
  await app.close();
});

test("clones before loading repository config and initial indexing", async () => {
  const root = await temporaryDirectory();
  const remote = await temporaryDirectory();
  await writeRepository(remote);
  const git = simpleGit(remote);
  await git.init(["--initial-branch=main"]);
  await git.addConfig("user.name", "Dokkurator Test");
  await git.addConfig("user.email", "test@dokkurator.invalid");
  await git.add(".");
  await git.commit("initial");
  await writeProjectConfig(
    root,
    `sources:\n  - id: docs\n    remote:\n      url: ${remote}\n      branch: main\n`,
  );
  const app = createDokkurator({ root });
  await expect(app.open()).resolves.toMatchObject({
    sources: [{ sourceId: "docs", status: "preparation-required" }],
  });

  await expect(app.prepare({ sourceId: "docs" })).resolves.toMatchObject({
    results: [
      {
        sourceId: "docs",
        checkout: "created",
        index: "initialized",
        indexedDocuments: 1,
      },
    ],
    errors: [],
  });
  await app.close();
});

test("requires an open lifecycle and rejects concurrent mutations", async () => {
  const root = await localProject();
  const app = createDokkurator({ root });
  await expect(app.prepare()).rejects.toThrow("not open");
  await app.open();

  const first = app.prepare();
  await expect(app.sync()).rejects.toThrow("already running");
  await first;
  await app.close();
});

async function localProject(projectConfig?: string): Promise<string> {
  const root = await temporaryDirectory();
  await writeRepository(join(root, "repo"));
  await writeProjectConfig(
    root,
    projectConfig ?? "sources:\n  - id: docs\n    path: repo\n",
  );
  return root;
}

async function writeRepository(root: string): Promise<void> {
  await mkdir(join(root, ".dokkurator"), { recursive: true });
  await mkdir(join(root, "docs"), { recursive: true });
  await mkdir(join(root, "types", "decision"), { recursive: true });
  await writeFile(
    join(root, ".dokkurator", "config.yaml"),
    "documents:\n  directory: docs\ndoctypes:\n  directory: types\n",
  );
  await writeFile(
    join(root, "docs", "decision.md"),
    "---\ndoctype: decision\ntitle: Authentication\n---\n# Authentication\n",
  );
  await writeFile(
    join(root, "types", "decision", "definition.yml"),
    "name: decision\nmetadata:\n  type: object\n",
  );
}

async function writeProjectConfig(
  root: string,
  content: string,
): Promise<void> {
  await mkdir(join(root, ".dokkurator"), { recursive: true });
  await writeFile(join(root, ".dokkurator", "config.yaml"), content);
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "dokkurator-core-use-case-"));
  temporaryDirectories.push(directory);
  return directory;
}

test("prepares and syncs invalid frontmatter while validation still reports it", async () => {
  const root = await localProject();
  const path = join(root, "repo/docs/broken.md");
  await writeFile(path, "---\ntitle: [\n---\n# Recoverable\n");
  const app = createDokkurator({ root });
  await app.open();
  try {
    await expect(app.prepare()).resolves.toMatchObject({
      errors: [],
      results: [{ indexedDocuments: 2 }],
    });
    expect(await app.search("Recoverable")).toHaveLength(1);
    const validation = await app.validate();
    expect(validation.errors).toEqual([]);
    expect(
      validation.results
        .flatMap(({ documents }) => documents)
        .find(({ path }) => path.endsWith("broken.md"))?.diagnostics,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phase: "parse", severity: "error" }),
      ]),
    );
    await writeFile(path, "---\nvalue: *missing\n---\n# Converted\n");
    await expect(app.sync()).resolves.toMatchObject({
      errors: [],
      results: [{ indexedDocuments: 1 }],
    });
    expect(await app.search("Converted")).toHaveLength(1);
    await expect(app.diff()).resolves.toMatchObject({
      errors: [],
      results: [{ diff: { changes: [] } }],
    });
  } finally {
    await app.close();
  }
});
