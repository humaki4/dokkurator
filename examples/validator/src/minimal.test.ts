import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test("starts the Compact example with defaults from another working directory", () => {
  const entry = fileURLToPath(new URL("./minimal.mjs", import.meta.url));
  const { stdout, stderr, status, error } = spawnSync(
    process.execPath,
    [entry],
    { cwd: tmpdir(), encoding: "utf8" },
  );
  expect(error).toBeUndefined();
  expect(status).toBe(0);
  expect(stderr).toBe("");
  expect(stdout, entry).not.toBe("");
  expect(JSON.parse(stdout)).toEqual({
    status: "passed",
    diagnostics: [],
    suppressedDiagnostics: [],
  });
});
