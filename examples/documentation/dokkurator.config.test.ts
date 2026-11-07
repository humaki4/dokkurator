import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { expect, onTestFinished, test } from "vitest";

const root = fileURLToPath(new URL("./", import.meta.url));
const cli = fileURLToPath(
  new URL("../../apps/cli/dist/index.js", import.meta.url),
);

test.each([
  { project: "../minimal-validation", count: 1, failed: 0, status: 0 },
  { project: ".", count: 24, failed: 14, status: 1 },
])(
  "validates $project through the CLI without preparing an index",
  ({ project, count, failed, status }) => {
    const fixture = mkdtempSync(join(tmpdir(), "dokkurator-example-"));
    onTestFinished(() => rmSync(fixture, { recursive: true, force: true }));
    for (const entry of count === 1
      ? ["documents", "_dokkurator", "dokkurator.config.mjs", "README.md"]
      : [
          "documents",
          "_dokkurator",
          "schemas",
          "rules",
          "dokkurator.config.mjs",
        ]) {
      cpSync(join(root, project, entry), join(fixture, entry), {
        recursive: true,
      });
    }
    for (const format of ["stylish", "json"]) {
      const result = spawnSync(
        process.execPath,
        [
          "--disable-warning=ExperimentalWarning",
          cli,
          "--project",
          fixture,
          "validate",
          "--format",
          format,
        ],
        { cwd: tmpdir(), encoding: "utf8" },
      );
      expect(result.error).toBeUndefined();
      expect(result.stderr).toBe("");
      expect(result.status).toBe(status);
      if (format === "json") {
        const report = JSON.parse(result.stdout);
        expect(report.errors).toEqual([]);
        const documents = report.sources.flatMap(
          (source: { documents: { path: string }[] }) => source.documents,
        );
        expect(documents).toHaveLength(count);
        expect(
          report.results.filter(
            (document: { errorCount: number }) => document.errorCount > 0,
          ),
        ).toHaveLength(failed);
        if (count === 24) {
          for (const name of ["custom-rule", "duplicate-headings"]) {
            expect(
              documents.find((document: { path: string }) =>
                document.path.endsWith(`${name}.md`),
              ),
            ).toMatchObject({
              diagnostics: [{ severity: "warning" }],
            });
          }
        }
      } else if (failed) {
        expect(result.stdout).toContain("example/no-todo");
        expect(result.stdout).toContain("dokkurator/metadata-schema");
      } else {
        expect(result.stdout).toBe("");
      }
    }
    expect(existsSync(join(fixture, ".dokkurator/index.db"))).toBe(false);
  },
);
