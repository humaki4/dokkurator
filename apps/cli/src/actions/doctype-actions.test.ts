import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import type { LoadedConfig } from "../config.js";
import { inspectDocTypes, inspectDocuments } from "./doctype-actions.js";

test("inspects DocTypes and documents for a configured source", async () => {
  const projectRoot = await mkdtemp(
    join(tmpdir(), "dokkurator-doctype-actions-"),
  );
  const root = join(projectRoot, "repo");
  await mkdir(join(root, "types", "decision"), { recursive: true });
  await mkdir(join(root, "docs"));
  await writeFile(
    join(root, "types", "decision", "definition.yml"),
    "name: decision\nmetadata:\n  type: object\n",
  );
  await writeFile(
    join(root, "docs", "decision.md"),
    "---\ndoctype: decision\n---\n# Decision\n",
  );
  const loaded: LoadedConfig = {
    projectRoot,
    filename: join(projectRoot, ".dokkurator", "config.yaml"),
    config: { sources: [{ id: "docs", path: "repo" }] },
  };

  const types = await inspectDocTypes(loaded, "docs", "types");
  expect(types[0]?.doctypes[0]?.name).toBe("decision");
  const documents = await inspectDocuments(loaded, undefined, "docs");
  expect(documents[0]?.documents[0]).toMatchObject({ type: "decision" });
});
