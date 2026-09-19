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

test("read prints unparsed DocType source documents as JSON", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-doctype-cli-"));
  temporaryDirectories.push(root);
  const directory = join(root, "concept");
  await mkdir(directory);

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

  await command.parseAsync(["node", "dokkurator-doctype", "read", "concept"]);

  expect(stderr).toBe("");
  const output = JSON.parse(stdout) as {
    directory: string;
    definition: { content: string };
    template: { content: string };
    rules: { content: string };
  };
  expect(output.directory).toBe("concept");
  expect(output.definition.content).toBe("name: concept\n");
  expect(output.template.content).toBe("# {{ title }}\n");
  expect(output.rules.content).toBe("rules: []\n");
});

test("provides standard help for the read command", () => {
  const command = createCommand();

  expect(command.commands[0]?.helpInformation()).toContain(
    "Usage: dokkurator-doctype read [options] <directory>",
  );
});
