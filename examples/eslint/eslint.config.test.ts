import { ESLint } from "eslint";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createDokkurator } from "@dokkurator/core";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import config from "./eslint.config.mjs";

const root = fileURLToPath(new URL("../documentation/", import.meta.url));

const expectedRule = {
  "api-auth": "dokkurator/metadata-schema",
  "architecture-heading": "dokkurator/required-headings",
  "architecture-pattern": "dokkurator/metadata-schema",
  "custom-rule": "example/no-todo",
  "decision-condition": "dokkurator/metadata-schema",
  "duplicate-headings": "markdown/no-duplicate-headings",
  "guide-required": "dokkurator/metadata-schema",
  "guide-tags": "dokkurator/metadata-schema",
  "malformed-yaml": "dokkurator/doctype",
  "missing-doctype": "dokkurator/doctype",
  "reference-ref": "dokkurator/metadata-schema",
  "release-format": "dokkurator/metadata-schema",
  "runbook-types": "dokkurator/metadata-schema",
  "service-contact": "dokkurator/metadata-schema",
  "service-extra-field": "dokkurator/metadata-schema",
  "unknown-doctype": "dokkurator/doctype",
};

describe("shared documentation example", () => {
  test("compares Core findings with the shared ESLint configuration", async () => {
    const app = createDokkurator({ root });
    await app.open();
    let validation;
    try {
      const listed = await app.listDocTypes();
      expect(listed.errors).toEqual([]);
      expect(listed.results.flatMap(({ doctypes }) => doctypes)).toHaveLength(
        8,
      );
      validation = await app.validate();
    } finally {
      await app.close();
    }
    expect(validation.errors).toEqual([]);
    const documents = validation.results.flatMap(({ documents }) => documents);
    const engine = new ESLint({
      cwd: root,
      overrideConfigFile: true,
      overrideConfig: config,
    });
    expect(documents).toHaveLength(24);
    for (const document of documents) {
      const result = document;
      const originalText = await readFile(join(root, document.path), "utf8");
      if (document.path.startsWith("documents/valid/")) {
        expect(result.diagnostics, document.path).toEqual([]);
      } else {
        const name = document.path.split("/").at(-1)!.replace(/\.md$/, "");
        const ruleId = expectedRule[name as keyof typeof expectedRule];
        expect(
          [...new Set(result.diagnostics.map((item) => item.ruleId))],
          document.path,
        ).toEqual([ruleId]);
        expect(result.status).toBe(
          ["custom-rule", "duplicate-headings"].includes(name)
            ? "passed"
            : "failed",
        );
        if (name === "malformed-yaml")
          expect(result.diagnostics[0].phase).toBe("parse");
      }
      const [direct] = await engine.lintText(originalText, {
        filePath: join(root, document.path),
      });
      expect(
        result.diagnostics.map(({ ruleId, severity, message, location }) => ({
          ruleId,
          severity,
          message,
          location,
        })),
        document.path,
      ).toEqual(
        direct.messages.map(
          ({
            ruleId,
            severity,
            message,
            line,
            column,
            endLine,
            endColumn,
          }) => ({
            ruleId,
            severity: severity === 1 ? "warning" : "error",
            message,
            location: { line, column, endLine, endColumn },
          }),
        ),
      );
    }
  });
});

test("runs ESLint from its own example directory", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync("pnpm", ["--silent", "start", "--format", "json"], {
    cwd: fileURLToPath(new URL("./", import.meta.url)),
    encoding: "utf8",
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stderr).toBe("");
  const reports = JSON.parse(result.stdout);
  expect(reports).toHaveLength(24);
  expect(
    reports.filter((report: { errorCount: number }) => report.errorCount > 0),
  ).toHaveLength(14);
});
