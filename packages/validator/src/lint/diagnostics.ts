import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Linter } from "eslint";

type DiagnosticPhase = "parse" | "lint";

/** Optional rule-owned classification for messages beyond ESLint fatal errors. */
export type DiagnosticRule = MarkdownRuleDefinition & {
  meta: NonNullable<MarkdownRuleDefinition["meta"]> & {
    messagePhases?: Readonly<Record<string, DiagnosticPhase>>;
  };
};

export function getDiagnosticPhase(
  message: Linter.LintMessage,
  config: readonly Linter.Config[],
): DiagnosticPhase {
  if (message.fatal) return "parse";
  if (!message.ruleId || !message.messageId) return "lint";
  const separator = message.ruleId.lastIndexOf("/");
  const namespace = message.ruleId.slice(0, separator);
  const name = message.ruleId.slice(separator + 1);
  for (const entry of [...config].reverse()) {
    const rule = entry.plugins?.[namespace]?.rules?.[name] as
      DiagnosticRule | undefined;
    if (rule) return rule.meta?.messagePhases?.[message.messageId] ?? "lint";
  }
  return "lint";
}
