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

test("read prints every unparsed DocType from the default directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-doctype-cli-"));
  temporaryDirectories.push(root);
  const directory = join(root, "_dokkurator", ".doctypes", "concept");
  await mkdir(directory, { recursive: true });

  await Promise.all([
    writeFile(join(directory, "definition.yml"), "name: concept\n"),
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

  await command.parseAsync(["node", "dokkurator-doctype", "read"]);

  expect(stderr).toBe("");
  const output = JSON.parse(stdout) as Array<{
    directory: string;
    definition: { content: string };
    template: { content: string };
    rules: { content: string };
  }>;
  expect(output).toHaveLength(1);
  expect(output[0]?.directory).toBe("_dokkurator/.doctypes/concept");
  expect(output[0]?.definition.content).toBe("name: concept\n");
  expect(output[0]?.template.content).toBe("# {{ title }}\n");
  expect(output[0]?.rules.content).toBe("rules: []\n");
});

test("reads from a configured DocType directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-doctype-cli-"));
  temporaryDirectories.push(root);
  const directory = join(root, "custom", "decision");
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(join(directory, "definition.yml"), "name: decision\n"),
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
    "read",
  ]);

  const output = JSON.parse(stdout) as Array<{ directory: string }>;
  expect(output.map(({ directory: path }) => path)).toEqual([
    "custom/decision",
  ]);
});

test("parse prints validated DocTypes and ignores their templates", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-doctype-cli-"));
  temporaryDirectories.push(root);
  const directory = join(root, "_dokkurator", ".doctypes", "concept");
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(
      join(directory, "definition.yml"),
      "name: concept\nmetadata:\n  type: object\n",
    ),
    writeFile(join(directory, "template.md"), "ignored: ["),
    writeFile(join(directory, "rules.yml"), "rules: []\n"),
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

  await command.parseAsync(["node", "dokkurator-doctype", "parse"]);

  expect(JSON.parse(stdout)).toEqual([
    {
      name: "concept",
      metadata: { type: "object" },
      rules: [],
    },
  ]);
});

test("provides standard help for the read command", () => {
  const command = createCommand();

  expect(command.commands[0]?.helpInformation()).toContain(
    "Usage: dokkurator-doctype read [options]",
  );
});
