import { validateLintConfiguration } from "./validate-configuration.js";
import type { MetadataSchema } from "../../schemas/schemas.js";
import type { Linter } from "eslint";
import markdown from "@eslint/markdown";
import type { ParsedDocType } from "@dokkurator/loader";
import {
  prepareDocTypes,
  type PreparedDocTypeRegistry,
} from "../../doc-types/doc-types.js";
import { plugin } from "../../plugin/plugin.js";
import { LintConfigurationError } from "../errors.js";

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
    const entry = createMarkdownConfig(input, registry);
    validateLintConfiguration([entry], "__dokkurator_configuration__.md");
    freezeConfig(entry);
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
    settings: { ...entry.settings },
    rules: structuredClone(entry.rules),
  }));
}

function freezeOptions(value: unknown): void {
  if (value === null || typeof value !== "object" || Object.isFrozen(value))
    return;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeOptions(child);
}

function freezeConfig(entry: Linter.Config): void {
  Object.freeze(entry.files);
  Object.freeze(entry.languageOptions);
  Object.freeze(entry.plugins);
  Object.freeze(entry.settings);
  freezeOptions(entry.rules);
  Object.freeze(entry);
}

function createMarkdownConfig(
  input: LintConfigurationInput,
  registry: PreparedDocTypeRegistry,
): Linter.Config {
  if (
    Object.hasOwn(input.plugins ?? {}, "markdown") ||
    Object.hasOwn(input.plugins ?? {}, "dokkurator")
  ) {
    throw new LintConfigurationError(
      "Plugin namespaces markdown and dokkurator are reserved.",
    );
  }
  return {
    name: "dokkurator/prepared-markdown",
    // Accept upper-case extensions supported by Loader as well.
    files: ["**/*.[mM][dD]"],
    language: "markdown/gfm",
    languageOptions: { frontmatter: "yaml" },
    plugins: {
      ...input.plugins,
      markdown,
      dokkurator: plugin,
    },
    settings: { dokkurator: registry },
    rules: {
      ...Object.assign(
        {},
        ...[...markdown.configs.recommended, ...plugin.configs.recommended].map(
          (config) => config.rules,
        ),
      ),
      ...structuredClone(input.rules ?? {}),
    },
  };
}
