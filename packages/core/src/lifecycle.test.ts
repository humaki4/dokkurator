import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

test("creates an application without filesystem access", async () => {
  const parent = await createTemporaryDirectory();
  const root = join(parent, "not-created");

  createDokkurator({ root });

  await expect(access(root)).rejects.toMatchObject({ code: "ENOENT" });
});

test("opens the project, initializes the index and reports source readiness", async () => {
  const root = await createTemporaryDirectory();
  await writeProjectConfig(
    root,
    "sources:\n  - id: local\n    path: docs\n  - id: remote\n    remote:\n      url: https://example.test/docs\n",
  );
  await mkdir(join(root, "docs"));
  const app = createDokkurator({ root });

  const result = await app.open();

  expect(result).toEqual({
    root,
    sources: [
      { sourceId: "local", status: "ready" },
      {
        sourceId: "remote",
        status: "preparation-required",
        reason: "missing-checkout",
      },
    ],
  });
  await expect(
    access(join(root, ".dokkurator/index.db")),
  ).resolves.toBeUndefined();
  await app.close();
});

test("makes repeated open and close calls harmless", async () => {
  const root = await createTemporaryDirectory();
  await writeProjectConfig(root, "sources:\n  - id: root\n    path: .\n");
  const app = createDokkurator({ root });

  const first = await app.open();
  expect(await app.open()).toBe(first);
  await app.close();
  await app.close();
});

test("reloads project config when reopened after close", async () => {
  const root = await createTemporaryDirectory();
  await writeProjectConfig(root, "sources:\n  - id: root\n    path: .\n");
  const app = createDokkurator({ root });
  await app.open();
  await app.close();
  await mkdir(join(root, "docs"));
  await writeProjectConfig(
    root,
    "sources:\n  - id: root\n    path: .\n  - id: docs\n    path: docs\n",
  );

  await expect(app.open()).resolves.toMatchObject({
    sources: [
      { sourceId: "root", status: "ready" },
      { sourceId: "docs", status: "ready" },
    ],
  });
  await app.close();
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "dokkurator-core-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeProjectConfig(
  root: string,
  content: string,
): Promise<void> {
  const directory = join(root, ".dokkurator");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "config.yaml"), content);
}
