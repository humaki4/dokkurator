import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { resolveActiveConfig, type LoadedConfig } from "@dokkurator/config";
import { inspectDocTypes, inspectDocuments } from "./doctype-actions.js";

//TODO: warum beides in 1 Test? Es sind doch 2 Funktionen!!
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

  //TODO: warum muss hier noch eine config resolved werden?
  // hier kann doch einfach eine config übergeben werden
  // wo sie herkommt ist egal
  const types = await inspectDocTypes(
    await resolveActiveConfig(loaded, {
      sourceId: "docs",
      doctypesDirectory: "types",
    }),
  );
  expect(types[0]?.doctypes[0]?.name).toBe("decision");
  const documents = await inspectDocuments(
    await resolveActiveConfig(loaded, { documentsDirectory: "docs" }),
  );
  expect(documents[0]?.documents[0]).toMatchObject({ type: "decision" });
});
