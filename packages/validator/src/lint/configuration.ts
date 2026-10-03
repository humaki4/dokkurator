import { Linter } from "eslint";
import markdown, { MarkdownLanguage } from "@eslint/markdown";
import type { ParsedDocType } from "@dokkurator/loader";
import {
  prepareDocTypes,
  type MetadataSchema,
  type PreparedDocTypeRegistry,
} from "./doc-types.js";
import { createDocTypeRule } from "./doctype-rule.js";
import { LintConfigurationError } from "./errors.js";

export interface LintConfigurationInput {
  readonly docTypes: readonly ParsedDocType[];
  /** Fully loaded resources, keyed by absolute schema URI; no automatic loading. */
  readonly schemas?: Readonly<Record<string, MetadataSchema>>;
  /** Already imported Markdown-compatible ESLint plugins. */
  readonly plugins?: NonNullable<Linter.Config["plugins"]>;
  readonly rules?: Linter.RulesRecord;
}

export interface PreparedLintConfiguration extends PreparedDocTypeRegistry {
  readonly flatConfig: readonly Linter.Config[];
}

/** Compile schemas and validate ESLint configuration without running rule visitors. */
export function prepareLintConfiguration(
  input: LintConfigurationInput,
): PreparedLintConfiguration {
  const registry = prepareDocTypes(input.docTypes, input.schemas ?? {});
  try {
    if (
      Object.hasOwn(input.plugins ?? {}, "markdown") ||
      Object.hasOwn(input.plugins ?? {}, "dokkurator")
    ) {
      throw new LintConfigurationError(
        "Plugin namespaces markdown and dokkurator are reserved.",
      );
    }
    const entry: Linter.Config = {
      name: "dokkurator/prepared-markdown",
      // Accept upper-case extensions supported by Loader as well.
      files: ["**/*.[mM][dD]"],
      language: "markdown/gfm",
      languageOptions: { frontmatter: "yaml" },
      plugins: {
        ...input.plugins,
        markdown,
        dokkurator: { rules: { doctype: createDocTypeRule(registry) } },
      },
      rules: {
        ...Object.assign(
          {},
          ...markdown.configs.recommended.map((config) => config.rules),
        ),
        "dokkurator/doctype": "error",
        ...structuredClone(input.rules ?? {}),
      },
    };
    validateLintConfiguration([entry], "__dokkurator_configuration__.md");
    Object.freeze(entry.files);
    Object.freeze(entry.languageOptions);
    Object.freeze(entry.plugins);
    freezeOptions(entry.rules);
    Object.freeze(entry);
    return Object.freeze({ ...registry, flatConfig: Object.freeze([entry]) });
  } catch (cause) {
    if (cause instanceof LintConfigurationError) throw cause;
    throw new LintConfigurationError("Invalid ESLint configuration.", {
      cause,
    });
  }
}

/** Shared helper for an eslint.config.mjs and the embedded Linter runtime. */
export function createLintConfig(
  input: LintConfigurationInput | PreparedLintConfiguration,
): Linter.Config[] {
  const prepared =
    "flatConfig" in input ? input : prepareLintConfiguration(input);
  return prepared.flatConfig.map((entry) => ({
    ...entry,
    files: entry.files?.map((pattern) =>
      Array.isArray(pattern) ? [...pattern] : pattern,
    ),
    languageOptions: { ...entry.languageOptions },
    plugins: { ...entry.plugins },
    rules: structuredClone(entry.rules),
  }));
}

export function validateLintConfiguration(
  config: Linter.Config[],
  filename: string,
): void {
  // ESLint validates rule IDs/options before parsing. An intentional failed parse
  // ends this configuration-only probe before any plugin's create/visitor runs.
  const language = new MarkdownLanguage({ mode: "gfm" });
  language.parse = () => ({
    ok: false,
    errors: [{ message: "Configuration probe.", line: 1, column: 1 }],
  });
  try {
    const messages = new Linter({ configType: "flat" }).verify(
      "",
      config.map((entry) => ({
        ...entry,
        // Disabled IDs/options are configuration too; validate without executing.
        rules: Object.fromEntries(
          Object.entries(entry.rules ?? {}).map(([id, rule]) => [
            id,
            Array.isArray(rule)
              ? rule[0] === "off" || rule[0] === 0
                ? ["error", ...rule.slice(1)]
                : rule
              : rule === "off" || rule === 0
                ? "error"
                : rule,
          ]),
        ),
        plugins: {
          ...entry.plugins,
          markdown: { ...markdown, languages: { gfm: language } },
        },
      })),
      { filename },
    );
    if (
      !messages.some(
        (message) =>
          message.fatal &&
          message.message === "Parsing error: Configuration probe.",
      )
    ) {
      throw new Error(`No applicable Markdown configuration for ${filename}.`);
    }
  } catch (cause) {
    throw new LintConfigurationError(
      `Invalid ESLint rule configuration: ${cause instanceof Error ? cause.message : String(cause)}`,
      {
        cause,
      },
    );
  }
}

function freezeOptions(value: unknown): void {
  if (value === null || typeof value !== "object" || Object.isFrozen(value))
    return;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeOptions(child);
}
