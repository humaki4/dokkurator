import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test("validates the shared collection from another working directory", () => {
  const entry = fileURLToPath(new URL("./validate.mjs", import.meta.url));
  const { stdout, stderr, status, error } = spawnSync(
    process.execPath,
    [entry],
    { cwd: tmpdir(), encoding: "utf8" },
  );
  expect(error).toBeUndefined();
  expect(status).toBe(1);
  expect(stderr).toBe("");
  expect(stdout, entry).not.toBe("");
  const report = JSON.parse(stdout);
  expect(report.errors).toEqual([]);
  expect(report.results).toHaveLength(24);
  expect(
    report.results.filter(
      ({ errorCount }: { errorCount: number }) => errorCount > 0,
    ),
  ).toHaveLength(14);
});
