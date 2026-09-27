import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, test } from "vitest";
import { createCommand } from "./command.js";

describe("dokkurator CLI", () => {
  test("adds and lists sources", async () => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-cli-"));
    const repository = join(root, "docs-repo");
    await mkdir(repository);
    let output = "";
    await createCommand(
      { writeOut: (text) => (output += text) },
      { cwd: root },
    ).parseAsync([
      "node",
      "dokkurator",
      "source",
      "add",
      repository,
      "--id",
      "docs",
    ]);
    expect(
      parse(await readFile(join(root, ".dokkurator", "config.yaml"), "utf8")),
    ).toEqual({ sources: [{ id: "docs", path: "docs-repo" }] });
    output = "";
    await createCommand(
      { writeOut: (text) => (output += text) },
      { cwd: root },
    ).parseAsync(["node", "dokkurator", "source", "list"]);
    expect(output).toBe("docs\tdocs-repo\n");
  });

  test("indexes all configured repositories into the project index", async () => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-cli-"));
    await mkdir(join(root, "repo", "docs"), { recursive: true });
    await writeFile(join(root, "repo", "docs", "readme.md"), "# Hello\n");
    await mkdir(join(root, ".dokkurator"));
    await writeFile(
      join(root, ".dokkurator", "config.yaml"),
      "sources:\n  - id: docs\n    path: repo\n",
    );
    let output = "";
    await createCommand(
      { writeOut: (text) => (output += text) },
      { cwd: root },
    ).parseAsync(["node", "dokkurator", "index"]);
    expect(output).toContain("docs: 1 indexed");
  });
});
