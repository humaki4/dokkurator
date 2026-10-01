import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { resolveActiveConfig } from "@dokkurator/config";
import { inspectDocTypes, inspectDocuments } from "./doctype-actions.js";

test("inspects DocTypes and documents for a configured source", async () => {
  const projectRoot = await mkdtemp(
    join(tmpdir(), "dokkurator-loader-actions-"),
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
  await mkdir(join(projectRoot, ".dokkurator"), { recursive: true });
  await writeFile(
    join(projectRoot, ".dokkurator/config.yaml"),
    "sources:\n  - id: docs\n    path: repo\n",
  );

  const types = await inspectDocTypes(
    await resolveActiveConfig({
      root: projectRoot,
      sourceId: "docs",
      doctypesDirectory: "types",
    }),
  );
  expect(types[0]?.doctypes[0]?.name).toBe("decision");
  const documents = await inspectDocuments(
    await resolveActiveConfig({
      root: projectRoot,
      documentsDirectory: "docs",
    }),
  );
  expect(documents[0]?.documents[0]).toMatchObject({ type: "decision" });
});
