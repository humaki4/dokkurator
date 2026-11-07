import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

async function project(severity = "off", missing = false, empty = false) {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-exit-"));
  roots.push(root);
  await mkdir(join(root, ".dokkurator"));
  await mkdir(join(root, "repo/docs"), { recursive: true });
  await mkdir(join(root, "repo/_dokkurator/.doctypes"), { recursive: true });
  await writeFile(
    join(root, ".dokkurator/config.yaml"),
    "sources:\n  - id: docs\n    path: repo\n" +
      (missing
        ? "  - id: missing\n    remote:\n      url: https://example.invalid/docs.git\n"
        : ""),
  );
  await writeFile(
    join(root, "repo/dokkurator.config.mjs"),
    `export default {validator:{rules:{'dokkurator/doctype':'off','markdown/no-duplicate-headings':'${severity}'}}};`,
  );
  if (!empty)
    await writeFile(
      join(root, "repo/docs/readme.md"),
      "# Title\n\n## Same\n\n## Same\n",
    );
  return root;
}

function run(root: string, ...args: string[]) {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../dist/index.js", import.meta.url)),
      "--project",
      root,
      "validate",
      ...args,
    ],
    { encoding: "utf8", env: { ...process.env, INIT_CWD: root } },
  );
  if (result.error) throw result.error;
  return result;
}

test.each(["off", "warn", "error"])(
  "built entry reports documents with rule severity %s",
  async (severity) => {
    const result = run(await project(severity), "--format", "json");
    expect(result.stderr).not.toContain("error:");
    expect(result.status, result.stdout + result.stderr).toBe(
      severity === "error" ? 1 : 0,
    );
    const report = JSON.parse(result.stdout);
    expect(report.results).toHaveLength(1);
    expect(report.results[0].warningCount).toBe(severity === "warn" ? 1 : 0);
    expect(report.results[0].errorCount).toBe(severity === "error" ? 1 : 0);
  },
);

test("prints complete mixed results and operational errors", async () => {
  const result = run(await project("error", true), "--format", "json");
  expect(result.status).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.results).toHaveLength(1);
  expect(report.sources).toHaveLength(1);
  expect(report.errors).toHaveLength(1);
});

test("empty successful selection is visible and succeeds", async () => {
  const result = run(await project("off", false, true));
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("No documents to validate.");
});

test("failed source without documents fails", async () => {
  const result = run(await project("off", true), "missing", "--format", "json");
  expect(result.status).toBe(1);
  const report = JSON.parse(result.stdout);
  expect(report.results).toEqual([]);
  expect(report.errors).toHaveLength(1);
});

test.each([["unknown"], ["--format", "unknown"], ["--unknown"], ["--format"]])(
  "rejects invalid invocation %j",
  async (...args) => {
    const result = run(await project(), ...args);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("error:");
  },
);

test("invalid configuration fails", async () => {
  const root = await project();
  await writeFile(join(root, ".dokkurator/config.yaml"), "sources: [\n");
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("error:");
});

test("indexes and searches malformed frontmatter while validate still fails", async () => {
  const root = await project();
  await writeFile(
    join(root, "repo/docs/broken.md"),
    "---\ntitle: [\n---\n# Recoverable\n",
  );
  const invoke = (...args: string[]) => {
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL("../dist/index.js", import.meta.url)),
        "--project",
        root,
        ...args,
      ],
      { encoding: "utf8", env: { ...process.env, INIT_CWD: root } },
    );
    if (result.error) throw result.error;
    expect(result.status, result.stderr).toBe(0);
    return result.stdout;
  };
  expect(invoke("index")).toContain("2 indexed");
  expect(JSON.parse(invoke("search", "Recoverable"))).toHaveLength(1);
  expect(invoke("diff")).toContain("0 changes");
  expect(invoke("index")).toContain("0 indexed");
  expect(run(root, "--format", "json").status).toBe(1);
});
