import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test.each([
  { group: "all", documents: 24, failed: 14, status: 1 },
  { group: "valid", documents: 8, failed: 0, status: 0 },
  { group: "invalid", documents: 16, failed: 14, status: 1 },
])(
  "runs the $group collection through Core",
  ({ group, documents, failed, status }) => {
    const {
      stdout,
      stderr,
      status: exitStatus,
      error,
    } = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./run.mjs", import.meta.url)), group],
      { cwd: tmpdir(), encoding: "utf8" },
    );
    expect(error).toBeUndefined();
    expect(stderr).toBe("");
    expect(exitStatus).toBe(status);
    expect(stdout).toContain(`${documents} documents, ${failed} failed.`);
    if (group === "valid") {
      expect(stdout).not.toContain("documents/invalid/");
    } else {
      expect(stdout).toContain("example/no-todo");
      expect(stdout).toContain("dokkurator/metadata-schema");
    }
  },
);

test("keeps filtered metadata reports valid JSON", () => {
  const { stdout, stderr, status, error } = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("./run.mjs", import.meta.url)),
      "invalid",
      "json-with-metadata",
    ],
    { cwd: tmpdir(), encoding: "utf8" },
  );
  expect(error).toBeUndefined();
  expect(stderr).toBe("");
  expect(status).toBe(1);
  const report = JSON.parse(stdout);
  expect(report.results).toHaveLength(16);
  expect(report.errors).toEqual([]);
  expect(report.metadata.rulesMeta["example/no-todo"]).toBeDefined();
  expect(
    report.sources[0].documents.every(({ path }: { path: string }) =>
      path.startsWith("documents/invalid/"),
    ),
  ).toBe(true);
});
