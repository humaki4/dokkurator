import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { createDokkurator } from "@dokkurator/core";
import { SQLiteIndex } from "@dokkurator/knowledge";
import { describe, expect, test } from "vitest";
import { createCommand } from "./command.js";
import { findProjectRoot } from "@dokkurator/config";

describe("dokkurator CLI", () => {
  test("finds the project config from a nested directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-cli-"));
    const nested = join(root, "one", "two");
    await mkdir(join(root, ".dokkurator"));
    await mkdir(nested, { recursive: true });
    await writeFile(join(root, ".dokkurator", "config.yaml"), "sources: []\n");
    expect(findProjectRoot(nested)).toBe(root);
  });

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

  test("reports that indexing a missing checkout requires preparation", async () => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-cli-"));
    await mkdir(join(root, ".dokkurator"));
    await writeFile(
      join(root, ".dokkurator", "config.yaml"),
      "sources:\n  - id: docs\n    remote:\n      url: https://example.invalid/docs.git\n",
    );
    let errorOutput = "";
    await createCommand(
      { writeErr: (text) => (errorOutput += text) },
      { cwd: root },
    ).parseAsync(["node", "dokkurator", "index", "docs"]);

    expect(errorOutput).toContain('run "dokkurator prepare docs"');
    expect(existsSync(join(root, ".dokkurator", "checkouts", "docs"))).toBe(
      false,
    );
  });

  test("prepares only the requested remote source without a prompt", async () => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-cli-"));
    const working = join(root, "working");
    const remote = join(root, "remote.git");
    const project = join(root, "project");
    await mkdir(working, { recursive: true });
    await mkdir(join(working, "docs"));
    await mkdir(join(working, ".dokkurator"));
    await mkdir(join(project, ".dokkurator"), { recursive: true });
    runGit(working, "init", "--initial-branch=main");
    runGit(working, "config", "user.name", "Dokkurator Test");
    runGit(working, "config", "user.email", "test@dokkurator.invalid");
    await writeFile(join(working, "docs", "guide.md"), "# Remote docs\n");
    await writeFile(
      join(working, ".dokkurator", "config.yaml"),
      "documents:\n  directory: docs\n",
    );
    runGit(working, "add", ".");
    runGit(working, "commit", "-m", "initial");
    runGit(root, "clone", "--bare", working, remote);
    await writeFile(
      join(project, ".dokkurator", "config.yaml"),
      `sources:\n  - id: docs\n    remote:\n      url: ${remote}\n  - id: other\n    remote:\n      url: https://example.invalid/other.git\n`,
    );
    let output = "";
    await createCommand(
      { writeOut: (text) => (output += text) },
      { cwd: project },
    ).parseAsync(["node", "dokkurator", "prepare", "docs"]);

    expect(output).toContain("docs: checkout created, index initialized");
    expect(
      existsSync(join(project, ".dokkurator", "checkouts", "docs", ".git")),
    ).toBe(true);
    expect(existsSync(join(project, ".dokkurator", "checkouts", "other"))).toBe(
      false,
    );
  });

  test("removes a source from config and index", async () => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-cli-"));
    await mkdir(join(root, ".dokkurator"));
    await writeFile(
      join(root, ".dokkurator", "config.yaml"),
      "sources:\n  - id: docs\n    path: .\n",
    );
    const filename = join(root, ".dokkurator", "index.db");
    const index = new SQLiteIndex({ filename });
    await index.upsert({
      id: "docs:readme.md",
      metadata: {},
      source: { sourceId: "docs", path: "readme.md" },
      content: "Readme",
      headings: [],
      links: [],
      references: [],
    });
    index.close();

    await createCommand({}, { cwd: root }).parseAsync([
      "node",
      "dokkurator",
      "source",
      "remove",
      "docs",
      "--yes",
    ]);

    const reopened = new SQLiteIndex({ filename, readOnly: true });
    await expect(reopened.query()).resolves.toEqual([]);
    reopened.close();
    expect(
      parse(await readFile(join(root, ".dokkurator", "config.yaml"), "utf8")),
    ).toEqual({ sources: [] });
  });
});

function runGit(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

test.each([false, true])(
  "validation output matches Core (partial failure: %s)",
  async (partial) => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-cli-report-"));
    await mkdir(join(root, ".dokkurator"));
    for (const source of ["one", "two"]) {
      await mkdir(join(root, source, "docs"), { recursive: true });
      await mkdir(join(root, source, "_dokkurator/.doctypes/guide"), {
        recursive: true,
      });
      await writeFile(
        join(root, source, "_dokkurator/.doctypes/guide/definition.yml"),
        "name: guide\nmetadata: {}\nstructure: {}\n",
      );
      await writeFile(
        join(root, source, "docs", "readme.md"),
        "---\ndoctype: guide\n---\n\n# Hello\n",
      );
    }
    await writeFile(
      join(root, ".dokkurator", "config.yaml"),
      "sources:\n  - id: one\n    path: one\n  - id: two\n    path: two\n" +
        (partial
          ? "  - id: missing\n    remote:\n      url: https://example.invalid/missing.git\n"
          : ""),
    );
    const app = createDokkurator({ root });
    await app.open();
    let report;
    try {
      report = await app.validate();
    } finally {
      await app.close();
    }
    expect(
      report.results.map(({ sourceId }) => sourceId),
      JSON.stringify(report.errors),
    ).toEqual(["one", "two"]);
    expect(report.results.map(({ documents }) => documents[0]!.path)).toEqual([
      "docs/readme.md",
      "docs/readme.md",
    ]);
    expect(report.errors).toHaveLength(partial ? 1 : 0);
    for (const format of ["stylish", "json", "json-with-metadata"]) {
      const formatter = await app.loadFormatter(format);
      const expected = await formatter.format(report);
      let stdout = "";
      let stderr = "";
      await createCommand(
        {
          writeOut: (text) => {
            stdout += text;
          },
          writeErr: (text) => {
            stderr += text;
          },
        },
        { cwd: root },
      ).parseAsync(["validate", "--format", format], { from: "user" });
      expect(stdout).toBe(expected);
      expect(stderr).toBe("");
      if (format !== "stylish") {
        const parsed = JSON.parse(stdout);
        expect(parsed.sources).toHaveLength(2);
        expect(parsed.errors).toHaveLength(partial ? 1 : 0);
        expect(
          new Set(
            parsed.results.map(
              (result: { filePath: string }) => result.filePath,
            ),
          ).size,
        ).toBe(2);
      }
    }
  },
);
