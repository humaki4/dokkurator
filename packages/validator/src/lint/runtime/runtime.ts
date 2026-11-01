import { Linter, type ESLint, type Rule } from "eslint";
import type { SourceMetadata } from "@dokkurator/loader";
import type { PreparedLintConfiguration } from "../configuration/configuration.js";
import { LintConfigurationError, LintRuntimeError } from "../errors.js";
import { prepareLintInput } from "./prepare-lint-input.js";
import { normalizeMessage, type LintDiagnostic } from "./normalize-message.js";

export interface LintInput {
  readonly originalText: string;
  readonly source: Pick<SourceMetadata, "sourceId" | "path" | "git"> & {
    readonly revision?: string;
  };
  readonly configuration: PreparedLintConfiguration;
}

export interface LintResult {
  /** Original ESLint coordinates (before Dokkurator's BOM normalization). */
  readonly reporting: {
    readonly usedDeprecatedRules: ESLint.LintResult["usedDeprecatedRules"];
    readonly messages: readonly Linter.LintMessage[];
    readonly suppressedMessages: readonly Linter.SuppressedLintMessage[];
    readonly rulesMeta: ReturnType<ESLint["getRulesMetaForResults"]>;
  };
  readonly status: "passed" | "failed";
  readonly diagnostics: readonly LintDiagnostic[];
  readonly suppressedDiagnostics: readonly LintDiagnostic[];
}

/** Document-local synchronous checks; all resources must already be prepared. */
export function lint(input: LintInput): LintResult {
  const { source, config } = prepareLintInput(input);
  try {
    const messages = verifyMarkdown(input.originalText, config, source.path);
    return createLintResult(messages, input, source, config);
  } catch (cause) {
    if (cause instanceof LintConfigurationError) {
      throw new LintConfigurationError(cause.message, { cause, source });
    }
    throw new LintRuntimeError("Lint runtime failed.", { cause, source });
  }
}

function verifyMarkdown(
  originalText: string,
  config: Linter.Config[],
  filename: string,
): {
  messages: Linter.LintMessage[];
  suppressed: Linter.SuppressedLintMessage[];
} {
  const linter = new Linter({ configType: "flat" });
  const messages = linter.verify(originalText, config, { filename });
  // ESLint 10.10 exposes this method at runtime but omits it from its declarations.
  const suppressed = (
    linter as Linter & {
      getSuppressedMessages(): Linter.SuppressedLintMessage[];
    }
  ).getSuppressedMessages();
  return { messages, suppressed };
}

function createLintResult(
  result: ReturnType<typeof verifyMarkdown>,
  input: LintInput,
  source: NonNullable<LintConfigurationError["source"]>,
  config: Linter.Config[],
): LintResult {
  const normalize = (message: Linter.LintMessage) =>
    normalizeMessage(message, input, source, config);
  const diagnostics = result.messages.map(normalize);
  const rulesMeta: ReturnType<ESLint["getRulesMetaForResults"]> = {};
  for (const { ruleId } of [...result.messages, ...result.suppressed]) {
    if (!ruleId) continue;
    const separator = ruleId.lastIndexOf("/");
    for (const entry of [...config].reverse()) {
      const rule = entry.plugins?.[ruleId.slice(0, separator)]?.rules?.[
        ruleId.slice(separator + 1)
      ] as Rule.RuleModule | undefined;
      if (rule) {
        if (rule.meta) rulesMeta[ruleId] = structuredClone(rule.meta);
        break;
      }
    }
  }
  const usedDeprecatedRules: ESLint.LintResult["usedDeprecatedRules"] = [];
  const rules = Object.assign(
    {},
    ...config.map((entry) => entry.rules),
  ) as Linter.RulesRecord;
  for (const [ruleId, setting] of Object.entries(rules)) {
    const severity = Array.isArray(setting) ? setting[0] : setting;
    if (severity === 0 || severity === "off") continue;
    const separator = ruleId.lastIndexOf("/");
    const rule = [...config]
      .reverse()
      .map(
        (entry) =>
          entry.plugins?.[ruleId.slice(0, separator)]?.rules?.[
            ruleId.slice(separator + 1)
          ],
      )
      .find(Boolean) as Rule.RuleModule | undefined;
    const meta = rule?.meta;
    if (!meta?.deprecated) continue;
    const info =
      typeof meta.deprecated === "object" ? meta.deprecated : undefined;
    usedDeprecatedRules.push({
      ruleId,
      replacedBy: info
        ? (info.replacedBy ?? []).map(({ plugin, rule }) => {
            const namespace = plugin?.name?.replace(
              /(^|\/)eslint-plugin-/,
              "$1",
            );
            return `${namespace ? `${namespace}/` : ""}${rule?.name ?? ""}`;
          })
        : [...(meta.replacedBy ?? [])],
      ...(info ? { info: structuredClone(info) } : {}),
    });
  }
  return {
    reporting: {
      usedDeprecatedRules,
      messages: structuredClone(result.messages),
      suppressedMessages: structuredClone(result.suppressed),
      rulesMeta,
    },
    status: diagnostics.some((diagnostic) => diagnostic.severity === "error")
      ? "failed"
      : "passed",
    diagnostics,
    suppressedDiagnostics: result.suppressed.map(normalize),
  };
}
