import { resolve } from "node:path";
import { ESLint, type Linter } from "eslint";
import {
  createLintConfig,
  lint,
  prepareLintConfiguration,
} from "@dokkurator/validator";
import { expect, test } from "vitest";
import { createDokkurator } from "./index.js";
import type { SourceOperationResult, ValidationSourceResult } from "./types.js";

function fixture(sourceId = "one", severity: "warn" | "error" = "warn") {
  const configuration = prepareLintConfiguration({
    docTypes: [],
    rules: {
      "dokkurator/doctype": "off",
      "markdown/no-duplicate-headings": severity,
    },
  });
  const originalText = "\uFEFF# Title\n\n# Title\n";
  const path = "guide.md";
  const filePath = resolve(sourceId, path);
  const document = {
    path,
    filePath,
    ...lint({
      originalText,
      source: { sourceId, path, revision: "abc" },
      configuration,
    }),
  };
  return { configuration, originalText, filePath, document, sourceId };
}

const reportFor = (
  ...fixtures: ReturnType<typeof fixture>[]
): SourceOperationResult<ValidationSourceResult> => ({
  results: fixtures.map(({ sourceId, document }) => ({
    sourceId,
    documents: [document],
  })),
  errors: [],
});

test.each(["stylish", "json", "json-with-metadata", "html"])(
  "%s uses the built-in formatter with equivalent messages and metadata",
  async (name) => {
    const item = fixture();
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: createLintConfig(item.configuration),
    });
    const direct = await eslint.lintText(item.originalText, {
      filePath: item.filePath,
    });
    // lintText also includes source text; formatters consume the same findings here.
    delete direct[0]!.source;
    const expected = await (await eslint.loadFormatter(name)).format(direct);
    const app = createDokkurator({ root: "/unused" });
    const formatter = await app.loadFormatter(name);
    await app.close();
    const report = reportFor(item);
    const before = JSON.stringify(report);
    const actual = await formatter.format(report);
    expect(await formatter.format(JSON.parse(before))).toBe(actual);
    expect(JSON.stringify(report)).toBe(before);
    if (name === "json")
      expect(JSON.parse(actual).results).toEqual(JSON.parse(expected));
    else if (name === "json-with-metadata") {
      expect(JSON.parse(actual).results).toEqual(JSON.parse(expected).results);
      expect(JSON.parse(actual).metadata).toEqual(
        JSON.parse(expected).metadata,
      );
    } else expect(actual).toBe(expected);
  },
);

test("retains different source configurations and operational errors in valid JSON", async () => {
  const first = fixture("first");
  const second = fixture("second", "error");
  const report = reportFor(first, second);
  const failure = {
    sourceId: "offline",
    phase: "load",
    recovery: "check-source",
    message: "<unavailable>",
  } as const;
  const failed = { ...report, errors: [failure] };
  const app = createDokkurator({ root: "/unused" });
  for (const name of ["json", "json-with-metadata"]) {
    const output = JSON.parse(
      await (await app.loadFormatter(name)).format(failed),
    );
    expect(
      output.results.map((result: ESLint.LintResult) => result.filePath),
    ).toEqual([first.filePath, second.filePath]);
    expect(
      output.results.map((result: ESLint.LintResult) => result.warningCount),
    ).toEqual([1, 0]);
    expect(output.errors).toEqual([failure]);
    expect(output.sources[0].documents[0].diagnostics[0].revision).toBe("abc");
  }
  expect(await (await app.loadFormatter()).format(failed)).toContain(
    "Operational errors\noffline (load, check-source): <unavailable>",
  );
  const html = await (await app.loadFormatter("html")).format(failed);
  expect(html).toContain("&lt;unavailable&gt;");
  await expect(app.loadFormatter("unknown")).rejects.toThrow(
    "Unsupported validation formatter",
  );
});

test("preserves fixes, suggestions, suppressions and actual fatal flags without BOM correction twice", async () => {
  const item = fixture();
  const message: Linter.LintMessage = {
    ruleId: "custom/check",
    severity: 1,
    message: "fix this",
    line: 1,
    column: 1,
    fix: { range: [0, 1], text: "x" },
    suggestions: [
      {
        desc: "replace",
        messageId: "replace",
        fix: { range: [0, 1], text: "y" },
      },
    ],
  };
  const report = reportFor(item);
  const doc = report.results[0]!.documents[0]!;
  const enriched = {
    ...report,
    results: [
      {
        sourceId: item.sourceId,
        documents: [
          {
            ...doc,
            reporting: {
              ...doc.reporting,
              messages: [
                message,
                {
                  ruleId: null,
                  severity: 2 as const,
                  fatal: true as const,
                  message: "parse failed",
                  line: 2,
                  column: 1,
                },
              ],
              suppressedMessages: [
                {
                  ...message,
                  suppressions: [
                    { kind: "directive", justification: "reason" },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  };
  const app = createDokkurator({ root: "/unused" });
  const output = JSON.parse(
    await (await app.loadFormatter("json")).format(enriched),
  ).results[0];
  expect(output).toMatchObject({
    warningCount: 1,
    errorCount: 1,
    fatalErrorCount: 1,
    fixableWarningCount: 1,
    fixableErrorCount: 0,
  });
  expect(output.messages[0]).toEqual(message);
  expect(output.suppressedMessages[0].suppressions[0].justification).toBe(
    "reason",
  );
  const empty = { results: [], errors: [] };
  expect(await (await app.loadFormatter()).format(empty)).toBe("");
  expect(
    JSON.parse(
      await (await app.loadFormatter("json-with-metadata")).format(empty),
    ).metadata.rulesMeta,
  ).toEqual({});
});

test("captures custom metadata from each configuration without retaining executable rules", async () => {
  const items = ["first", "second"].map((sourceId) => {
    const configuration = prepareLintConfiguration({
      docTypes: [],
      plugins: {
        custom: {
          rules: {
            check: {
              meta: {
                type: "problem",
                docs: { description: sourceId },
                schema: [],
              },
              create(context) {
                return {
                  root(node) {
                    context.report({ node, message: sourceId });
                  },
                };
              },
            },
          },
        },
      },
      rules: { "dokkurator/doctype": "off", "custom/check": "warn" },
    });
    return {
      sourceId,
      documents: [
        {
          path: "guide.md",
          filePath: resolve(sourceId, "guide.md"),
          ...lint({
            originalText: "# Title\n",
            source: { sourceId, path: "guide.md" },
            configuration,
          }),
        },
      ],
    };
  });
  const app = createDokkurator({ root: "/unused" });
  const formatter = await app.loadFormatter("json-with-metadata");
  for (const item of items) {
    const serialized = JSON.parse(
      JSON.stringify({ results: [item], errors: [] }),
    );
    const formatted = JSON.parse(await formatter.format(serialized));
    expect(formatted.metadata.rulesMeta["custom/check"].docs.description).toBe(
      item.sourceId,
    );
    expect(JSON.stringify(serialized)).not.toContain('"create"');
  }
  const combined = JSON.parse(
    await formatter.format({ results: items, errors: [] }),
  );
  expect(
    combined.sources.map(
      (source: {
        documents: {
          rulesMeta: Record<string, { docs: { description: string } }>;
        }[];
      }) => source.documents[0]!.rulesMeta["custom/check"]!.docs.description,
    ),
  ).toEqual(["first", "second"]);
  expect(combined.metadata.rulesMeta["custom/check"].docs.description).toBe(
    "second",
  );
});

test.each([
  true,
  {
    message: "old",
    replacedBy: [
      {
        plugin: { name: "eslint-plugin-custom" },
        rule: { name: "replacement" },
      },
    ],
  },
])(
  "preserves deprecated rule usage from enabled rules without findings: %j",
  async (deprecated) => {
    const configuration = prepareLintConfiguration({
      docTypes: [],
      plugins: {
        custom: {
          rules: {
            old: {
              meta: {
                type: "problem",
                deprecated,
                replacedBy: ["custom/replacement"],
                schema: [],
              },
              create() {
                return {};
              },
            },
          },
        },
      },
      rules: { "dokkurator/doctype": "off", "custom/old": "warn" },
    });
    const filePath = resolve("deprecated/guide.md");
    const originalText = "# Title\n";
    const document = {
      path: "guide.md",
      filePath,
      ...lint({
        originalText,
        source: { sourceId: "old", path: "guide.md" },
        configuration,
      }),
    };
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: createLintConfig(configuration),
    });
    const [direct] = await eslint.lintText(originalText, { filePath });
    const app = createDokkurator({ root: "/unused" });
    const output = JSON.parse(
      await (
        await app.loadFormatter("json")
      ).format({
        results: [{ sourceId: "old", documents: [document] }],
        errors: [],
      }),
    );
    expect(output.results[0].usedDeprecatedRules).toEqual(
      JSON.parse(JSON.stringify(direct!.usedDeprecatedRules)),
    );
  },
);
