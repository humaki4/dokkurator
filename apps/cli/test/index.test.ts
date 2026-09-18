import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

test("runs the built CLI through workspace package exports", () => {
  const output = execFileSync(
    process.execPath,
    [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    { encoding: "utf8" },
  );
  expect(JSON.parse(output)).toEqual({
    valid: false,
    missingFields: ["status"],
  });
});
