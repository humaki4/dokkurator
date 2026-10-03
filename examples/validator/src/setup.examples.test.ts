import { ESLint } from "eslint";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createDokkurator } from "@dokkurator/core";
import { createLintConfig } from "@dokkurator/validator";
import { describe, expect, test } from "vitest";
import { prepareExample, root } from "./setup.mjs";
import pluginConfig from "../eslint-plugin.config.mjs";

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

describe("runnable Validator examples", () => {
  test("compares all example findings with standard ESLint and the direct plugin profile", async () => {
    const { configuration } = await prepareExample();
    const app = createDokkurator({ root });
    await app.open();
    let validation;
    try {
      validation = await app.validate();
    } finally {
      await app.close();
    }
    expect(validation.errors).toEqual([]);
    const documents = validation.results.flatMap(({ documents }) => documents);
    const engines = [createLintConfig(configuration), pluginConfig].map(
      (overrideConfig) =>
        new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig }),
    );
    expect(documents).toHaveLength(24);
    expect(configuration.docTypes).toHaveLength(8);
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
      for (const engine of engines) {
        const [direct] = await engine.lintText(originalText, {
          filePath: document.path,
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
    }
  });
});
