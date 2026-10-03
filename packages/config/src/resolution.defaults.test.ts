import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { resolveProjectConfig } from "./resolution.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("supports an opt-in root source without changing source-independent resolution", async () => {
  const root = await mkdtemp(join(tmpdir(), "config-default-source-"));
  roots.push(root);
  expect(
    (await resolveProjectConfig({ root, defaultSource: true })).sources,
  ).toEqual([{ id: "root", root }]);
  expect(
    (
      await resolveProjectConfig({
        root,
        defaultSource: true,
        includeSources: false,
      })
    ).sources,
  ).toEqual([]);
  await expect(resolveProjectConfig({ root })).rejects.toThrow(
    "No sources configured",
  );
  await expect(
    resolveProjectConfig({ root, defaultSource: true, sourceId: "missing" }),
  ).rejects.toThrow("Unknown source");
  await writeFile(
    join(root, "dokkurator.config.mjs"),
    "export default {sources:[{id:'docs',path:'repo'}]};",
  );
  expect(
    (await resolveProjectConfig({ root, defaultSource: true })).sources,
  ).toEqual([{ id: "docs", root: join(root, "repo") }]);
});
