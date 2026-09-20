import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

test("loadDocuments loads and transforms documents from the source root", async () => {
  const root = await temporaryDirectory();
  await mkdir(join(root, "docs"), { recursive: true });
  await Promise.all([
    writeFile(join(root, "README.md"), "# Repository\n"),
    writeFile(
      join(root, "docs", "decision.md"),
      "---\ndoctype: decision\ntitle: Choose an index\n---\n\n# Decision\n",
    ),
  ]);

  let stdout = "";
  const command = createCommand(
    { writeOut: (text) => (stdout += text) },
    { cwd: root },
  );

  await command.parseAsync(["node", "dokkurator-knowledge", "loadDocuments"]);

  const output = JSON.parse(stdout) as Array<Record<string, unknown>>;
  expect(output).toHaveLength(2);
  expect(output[0]).toMatchObject({
    id: `${root}:README.md`,
    metadata: {},
    content: "# Repository\n",
    entities: [],
    relations: [],
  });
  expect(output[0]).not.toHaveProperty("ast");
  expect(output[1]).toMatchObject({
    id: `${root}:docs/decision.md`,
    type: "decision",
    metadata: { doctype: "decision", title: "Choose an index" },
  });
});

test("reads from a configured documents directory", async () => {
  const root = await temporaryDirectory();
  await mkdir(join(root, "handbook"), { recursive: true });
  await writeFile(join(root, "handbook", "guide.md"), "# Guide\n");
  await writeFile(join(root, "README.md"), "# Repository\n");

  let stdout = "";
  const command = createCommand({ writeOut: (text) => (stdout += text) });

  await command.parseAsync([
    "node",
    "dokkurator-knowledge",
    "--root",
    root,
    "--documents-directory",
    "handbook",
    "loadDocuments",
  ]);

  const output = JSON.parse(stdout) as Array<{ id: string }>;
  expect(output.map(({ id }) => id)).toEqual([`${root}:handbook/guide.md`]);
});

test("provides the document loading command", () => {
  expect(
    createCommand().commands.map((subcommand) => subcommand.name()),
  ).toEqual(["loadDocuments"]);
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "dokkurator-knowledge-cli-"));
  temporaryDirectories.push(directory);
  return directory;
}
