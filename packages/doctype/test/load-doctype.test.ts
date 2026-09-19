import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { loadDocType } from "../src/index.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true }),
    ),
  );
});

describe("loadDocType", () => {
  test("reads all source files without parsing their contents", async () => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-doctype-"));
    temporaryDirectories.push(root);
    const directory = join(root, "decision");
    await mkdir(directory);

    const definition = "name: decision\nmetadata:\n  type: object\n";
    const template = "---\ntitle: Example\n---\n\n# {{ title }}\n";
    const rules = "rules: []\n";

    await Promise.all([
      writeFile(join(directory, "definition.yml"), definition),
      writeFile(join(directory, "template.md"), template),
      writeFile(join(directory, "rules.yml"), rules),
    ]);

    await expect(loadDocType(directory)).resolves.toEqual({
      directory,
      definition,
      template,
      rules,
    });
  });

  test("reports a missing required source file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dokkurator-doctype-"));
    temporaryDirectories.push(directory);

    await expect(loadDocType(directory)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});

