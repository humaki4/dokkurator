import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, test } from "vitest";
import { createCommand } from "./command.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

test("indexes the configured document directory into SQLite", async () => {
  const root = await temporaryDirectory();
  await mkdir(join(root, "handbook"), { recursive: true });
  await writeFile(join(root, "README.md"), "# Outside\n");
  await writeFile(join(root, "handbook", "guide.md"), "# Guide\n");

  let stdout = "";
  const command = createCommand(
    { writeOut: (text) => (stdout += text) },
    { cwd: root },
  );
  await command.parseAsync([
    "node",
    "dokkurator-knowledge",
    "--documents-directory",
    "handbook",
    "index",
  ]);

  expect(JSON.parse(stdout)).toEqual({
    indexedDocuments: 1,
    index: join(root, ".dokkurator", "index.db"),
  });
  const database = new DatabaseSync(join(root, ".dokkurator", "index.db"), {
    readOnly: true,
  });
  expect(database.prepare("SELECT path FROM documents").all()).toEqual([
    { path: "handbook/guide.md" },
  ]);
  database.close();
});

test("provides only the index command", () => {
  expect(
    createCommand().commands.map((subcommand) => subcommand.name()),
  ).toEqual(["index"]);
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "dokkurator-knowledge-cli-"));
  temporaryDirectories.push(directory);
  return directory;
}
