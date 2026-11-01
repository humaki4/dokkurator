import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test("validates an editor buffer through Core and removes the temporary project", async () => {
  const before = await readdir(tmpdir());
  const { stdout, stderr, status, error } = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./virtual.mjs", import.meta.url))],
    { cwd: tmpdir(), encoding: "utf8" },
  );
  expect(error).toBeUndefined();
  expect(stderr).toBe("");
  expect(status).toBe(0);
  const result = JSON.parse(stdout);
  expect(result.errors).toEqual([]);
  expect(result.results).toHaveLength(1);
  expect(result.sources[0].sourceId).toBe("editor-buffer");
  expect(result.sources[0].documents).toHaveLength(1);
  expect(result.sources[0].documents[0]).toMatchObject({
    path: "virtual/guide.md",
    diagnostics: [{ ruleId: "example/no-todo", severity: "warning" }],
  });
  expect(
    (await readdir(tmpdir())).filter(
      (name) => name.startsWith("dokkurator-editor-") && !before.includes(name),
    ),
  ).toEqual([]);
});
