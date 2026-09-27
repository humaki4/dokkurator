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
    removedDocuments: 0,
    revision: {
      id: expect.stringMatching(/^sha256:/),
      type: "content-hash",
    },
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

test("provides index, diff, and search commands", () => {
  expect(
    createCommand().commands.map((subcommand) => subcommand.name()),
  ).toEqual(["index", "diff", "search"]);
});

test("shows document changes without advancing the indexed state", async () => {
  const root = await temporaryDirectory();
  await mkdir(join(root, "docs"));
  await writeFile(join(root, "docs", "guide.md"), "# Before\n");
  await createCommand({}, { cwd: root }).parseAsync([
    "node",
    "dokkurator-knowledge",
    "index",
  ]);
  await writeFile(join(root, "docs", "guide.md"), "# After\n");

  const outputs: string[] = [];
  for (let run = 0; run < 2; run += 1) {
    let stdout = "";
    await createCommand(
      { writeOut: (text) => (stdout += text) },
      { cwd: root },
    ).parseAsync(["node", "dokkurator-knowledge", "diff", "--format", "json"]);
    outputs.push(stdout);
  }

  for (const output of outputs) {
    expect(JSON.parse(output).changes).toEqual([
      expect.objectContaining({ type: "modified", path: "docs/guide.md" }),
    ]);
  }
});

test("searches content and individual metadata fields", async () => {
  const root = await temporaryDirectory();
  await mkdir(join(root, "docs"), { recursive: true });
  await writeFile(
    join(root, "docs", "accepted.md"),
    "---\nstatus: accepted\nowner:\n  team: platform\n---\n# Authentication\nOAuth tokens are used here.\n",
  );
  await writeFile(
    join(root, "docs", "draft.md"),
    "---\nstatus: draft\n---\n# Other topic\nNo security content.\n",
  );

  await createCommand({}, { cwd: root }).parseAsync([
    "node",
    "dokkurator-knowledge",
    "index",
  ]);

  let stdout = "";
  await createCommand(
    { writeOut: (text) => (stdout += text) },
    { cwd: root },
  ).parseAsync([
    "node",
    "dokkurator-knowledge",
    "search",
    "owner.team:latfor",
    "AND",
    "Authenti",
  ]);

  const results = JSON.parse(stdout) as Array<{
    document: { metadata: { status: string } };
    rank: number;
  }>;
  expect(results).toHaveLength(1);
  expect(results[0]?.document.metadata.status).toBe("accepted");
  expect(results[0]?.rank).toBeGreaterThan(100);
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "dokkurator-knowledge-cli-"));
  temporaryDirectories.push(directory);
  return directory;
}
