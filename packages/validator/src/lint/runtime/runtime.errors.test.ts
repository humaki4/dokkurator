import { describe, expect, test } from "vitest";
import {
  createLintConfig,
  lint,
  LintConfigurationError,
  LintRuntimeError,
  prepareLintConfiguration,
} from "../../index.js";

const source = {
  sourceId: "repository",
  path: "docs/example.md",
  revision: "abc123",
};

const docType = { name: "guide", metadata: { type: "object" }, rules: [] };

const header = "---\ndoctype: guide\n---\n\n";

const prepare = (
  rules: Parameters<typeof prepareLintConfiguration>[0]["rules"] = {},
) => prepareLintConfiguration({ docTypes: [docType], rules });

describe("operational lint errors", () => {
  test("rule-owned configuration errors keep their category and source", () => {
    const cause = new LintConfigurationError("Invalid plugin settings.");
    const configuration = prepareLintConfiguration({
      docTypes: [docType],
      plugins: {
        local: {
          rules: {
            check: {
              meta: { schema: [] },
              create() {
                throw cause;
              },
            },
          },
        },
      },
      rules: { "local/check": "error" },
    });
    let error: unknown;
    try {
      lint({ originalText: header, source, configuration });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(LintConfigurationError);
    expect(error).toMatchObject({ cause, source });
  });
  test.each([
    "virtual/example.txt",
    "/absolute/example.md",
    "https://example.com/file.md",
    "../example.md",
    "docs\\example.md",
    "node_modules/example.md",
    ".git/example.md",
  ])("rejects unmatched, excluded or invalid path %s", (path) => {
    expect(() =>
      lint({
        originalText: "# Text",
        source: { ...source, path },
        configuration: prepare(),
      }),
    ).toThrow(LintConfigurationError);
  });
  test("rejects invalid configuration before invoking the actual rule", () => {
    const configuration = prepare();
    const invalid = {
      ...configuration,
      flatConfig: createLintConfig(configuration).map((config) => ({
        ...config,
        rules: { ...config.rules, "markdown/unknown": "error" as const },
      })),
    };
    expect(() =>
      lint({ originalText: "# Text", source, configuration: invalid }),
    ).toThrow(LintConfigurationError);
  });
  test("reports a crashing rule as a runtime error with cause and source", () => {
    const cause = new Error("Rule crashed");
    const configuration = prepareLintConfiguration({
      docTypes: [docType],
      plugins: {
        broken: {
          rules: {
            local: {
              meta: { schema: [] },
              create() {
                throw cause;
              },
            },
          },
        },
      },
      rules: { "broken/local": "error" },
    });
    let error: unknown;
    try {
      lint({ originalText: `${header}# Text`, source, configuration });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(LintRuntimeError);
    expect(error).toMatchObject({ cause, source });
  });
});
