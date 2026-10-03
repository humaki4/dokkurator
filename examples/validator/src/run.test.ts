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
      expect(stdout).toContain("warning example/no-todo");
      expect(stdout).toContain("error dokkurator/metadata-schema");
    }
  },
);
