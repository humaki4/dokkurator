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

test("loadDocTypes loads and parses every DocType from the default directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-doctype-cli-"));
  temporaryDirectories.push(root);
  const directory = join(root, "_dokkurator", ".doctypes", "concept");
  await mkdir(directory, { recursive: true });

  await Promise.all([
    writeFile(
      join(directory, "definition.yml"),
      "name: concept\nmetadata:\n  type: object\n",
    ),
    writeFile(join(directory, "template.md"), "# {{ title }}\n"),
    writeFile(join(directory, "rules.yml"), "rules: []\n"),
  ]);

  let stdout = "";
  let stderr = "";
  const command = createCommand(
    {
      writeOut: (text) => {
        stdout += text;
      },
      writeErr: (text) => {
        stderr += text;
      },
    },
    { cwd: root },
  );

  await command.parseAsync(["node", "dokkurator-doctype", "loadDocTypes"]);

  expect(stderr).toBe("");
  const output = JSON.parse(stdout) as Array<{
    name: string;
    metadata: unknown;
    rules: unknown[];
  }>;
  expect(output).toEqual([
    {
      name: "concept",
      metadata: { type: "object" },
      rules: [],
    },
  ]);
});

test("reads from a configured DocType directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-doctype-cli-"));
  temporaryDirectories.push(root);
  const directory = join(root, "custom", "decision");
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(
      join(directory, "definition.yml"),
      "name: decision\nmetadata:\n  type: object\n",
    ),
    writeFile(join(directory, "template.md"), "# Decision\n"),
    writeFile(join(directory, "rules.yml"), "rules: []\n"),
  ]);

  let stdout = "";
  const command = createCommand({
    writeOut: (text) => {
      stdout += text;
    },
  });

  await command.parseAsync([
    "node",
    "dokkurator-doctype",
    "--root",
    root,
    "--doctypes-directory",
    "custom",
    "loadDocTypes",
  ]);

  const output = JSON.parse(stdout) as Array<{ name: string }>;
  expect(output.map(({ name }) => name)).toEqual(["decision"]);
});

test("provides exactly the two loading commands", () => {
  const command = createCommand();

  expect(command.commands.map((subcommand) => subcommand.name())).toEqual([
    "loadDocTypes",
    "loadDocuments",
  ]);
});

test("loadDocuments recursively loads and parses Markdown from the repository root", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-documents-cli-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "docs", "nested"), { recursive: true });
  await Promise.all([
    writeFile(join(root, "README.md"), "# Repository\n"),
    writeFile(
      join(root, "docs", "nested", "guide.md"),
      "---\ndoctype: guide\n---\n\n# Guide\n",
    ),
    writeFile(join(root, "docs", "ignored.txt"), "not Markdown\n"),
  ]);

  let stdout = "";
  const command = createCommand(
    {
      writeOut: (text) => {
        stdout += text;
      },
    },
    { cwd: root },
  );

  await command.parseAsync(["node", "dokkurator-doctype", "loadDocuments"]);

  const output = JSON.parse(stdout) as Array<{
    type?: string;
    content: string;
    ast: { type: string };
    headings: Array<{ text: string }>;
    source: { path: string };
  }>;
  expect(output.map(({ source }) => source.path)).toEqual([
    "README.md",
    "docs/nested/guide.md",
  ]);
  expect(output[1]).toMatchObject({
    type: "guide",
    content: "\n# Guide\n",
    ast: { type: "root" },
    headings: [{ text: "Guide" }],
  });
});
