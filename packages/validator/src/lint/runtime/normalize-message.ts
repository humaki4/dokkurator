import type { Linter } from "eslint";
import type { LintInput } from "./runtime.js";
import type { LintConfigurationError } from "../errors.js";
import { getDiagnosticPhase } from "../diagnostics/diagnostics.js";

interface TextEdit {
  readonly range: readonly [number, number];
  readonly text: string;
}

export interface LintDiagnostic {
  readonly phase: "parse" | "lint";
  readonly sourceId: string;
  readonly path: string;
  readonly revision?: string;
  readonly ruleId: string | null;
  readonly messageId?: string;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly location?: {
    readonly line: number;
    readonly column: number;
    readonly endLine?: number;
    readonly endColumn?: number;
  };
  readonly fix?: TextEdit;
  readonly suggestions?: readonly {
    readonly description: string;
    readonly messageId?: string;
    readonly fix: TextEdit;
  }[];
  readonly suppressions?: readonly {
    readonly kind: string;
    readonly justification: string;
  }[];
}

export function normalizeMessage(
  message: Linter.LintMessage | Linter.SuppressedLintMessage,
  input: LintInput,
  source: NonNullable<LintConfigurationError["source"]>,
  config: readonly Linter.Config[],
): LintDiagnostic {
  const bom = input.originalText.startsWith("\uFEFF") ? 1 : 0;
  const edit = (fix: NonNullable<Linter.LintMessage["fix"]>): TextEdit => ({
    range: [fix.range[0] + bom, fix.range[1] + bom],
    text: fix.text,
  });
  return {
    ...source,
    phase: getDiagnosticPhase(message, config),
    ruleId: message.ruleId,
    ...(message.messageId === undefined
      ? {}
      : { messageId: message.messageId }),
    severity: message.severity === 1 ? "warning" : "error",
    message: message.message,
    ...(message.line === undefined || message.column === undefined
      ? {}
      : {
          location: {
            line: message.line,
            column: message.column + (message.line === 1 ? bom : 0),
            ...(message.endLine === undefined
              ? {}
              : { endLine: message.endLine }),
            ...(message.endColumn === undefined
              ? {}
              : {
                  endColumn:
                    message.endColumn +
                    ((message.endLine ?? message.line) === 1 ? bom : 0),
                }),
          },
        }),
    ...(message.fix === undefined ? {} : { fix: edit(message.fix) }),
    ...(message.suggestions === undefined
      ? {}
      : {
          suggestions: message.suggestions.map((suggestion) => ({
            description: suggestion.desc,
            ...(suggestion.messageId === undefined
              ? {}
              : { messageId: suggestion.messageId }),
            fix: edit(suggestion.fix),
          })),
        }),
    ...("suppressions" in message
      ? {
          suppressions: message.suppressions.map((suppression) => ({
            ...suppression,
          })),
        }
      : {}),
  };
}
