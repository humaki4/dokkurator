import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse } from "yaml";
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

  test("asks before cloning a missing remote and stops when declined", async () => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-cli-"));
    await mkdir(join(root, ".dokkurator"));
    await writeFile(
      join(root, ".dokkurator", "config.yaml"),
      "sources:\n  - id: docs\n    remote:\n      url: https://example.invalid/docs.git\n",
    );
    let output = "";
    let prompt = "";
    await createCommand(
      { writeOut: (text) => (output += text) },
      {
        cwd: root,
        confirmCheckout: async (question) => {
          prompt = question;
          return false;
        },
      },
    ).parseAsync(["node", "dokkurator", "index", "docs"]);

    expect(prompt).toContain("Checkout https://example.invalid/docs.git");
    expect(output).toBe("Cancelled.\n");
    expect(existsSync(join(root, ".dokkurator", "checkouts", "docs"))).toBe(
      false,
    );
  });

  test("continues the requested action after confirming a remote clone", async () => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-cli-"));
    const working = join(root, "working");
    const remote = join(root, "remote.git");
    const project = join(root, "project");
    await mkdir(working, { recursive: true });
    await mkdir(join(working, "docs"));
    await mkdir(join(project, ".dokkurator"), { recursive: true });
    runGit(working, "init", "--initial-branch=main");
    runGit(working, "config", "user.name", "Dokkurator Test");
    runGit(working, "config", "user.email", "test@dokkurator.invalid");
    await writeFile(join(working, "docs", "guide.md"), "# Remote docs\n");
    runGit(working, "add", "docs/guide.md");
    runGit(working, "commit", "-m", "initial");
    runGit(root, "clone", "--bare", working, remote);
    await writeFile(
      join(project, ".dokkurator", "config.yaml"),
      `sources:\n  - id: docs\n    remote:\n      url: ${remote}\n  - id: other\n    remote:\n      url: https://example.invalid/other.git\n`,
    );
    let output = "";
    const prompts: string[] = [];
    await createCommand(
      { writeOut: (text) => (output += text) },
      {
        cwd: project,
        confirmCheckout: async (question) => {
          prompts.push(question);
          return true;
        },
      },
    ).parseAsync([
      "node",
      "dokkurator",
      "index",
      "docs",
      "--documents-directory",
      "docs",
    ]);

    expect(output).toContain("docs: 1 indexed");
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain("Checkout ");
    expect(prompts[0]).toContain("docs");
    const checkoutRoot = prompts[0]?.split(" to ").at(-1)?.replace(/\?$/u, "");
    expect(checkoutRoot).toBeDefined();
    if (checkoutRoot === undefined) throw new Error("Missing checkout path");
    expect(existsSync(join(checkoutRoot, ".git"))).toBe(true);
    expect(existsSync(join(dirname(checkoutRoot), "other"))).toBe(false);
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
