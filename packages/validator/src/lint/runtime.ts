import { Linter } from "eslint";
import type { SourceMetadata } from "@dokkurator/loader";
import {
  createLintConfig,
  validateLintConfiguration,
  type PreparedLintConfiguration,
} from "./configuration.js";
import { LintConfigurationError, LintRuntimeError } from "./errors.js";
import { getDiagnosticPhase } from "./diagnostics.js";

export interface LintInput {
  readonly originalText: string;
  readonly source: Pick<SourceMetadata, "sourceId" | "path" | "git"> & {
    readonly revision?: string;
  };
  readonly configuration: PreparedLintConfiguration;
}

interface TextEdit {
  readonly range: readonly [number, number];
  readonly text: string;
}

interface LintDiagnostic {
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

export interface LintResult {
  readonly status: "passed" | "failed";
  readonly diagnostics: readonly LintDiagnostic[];
  readonly suppressedDiagnostics: readonly LintDiagnostic[];
}

/** Document-local synchronous checks; all resources must already be prepared. */
export function lint(input: LintInput): LintResult {
  const revision =
    input?.source?.revision ??
    (input?.source?.git?.status === "clean"
      ? input.source.git.fileRevision
      : undefined);
  const source = {
    sourceId: input?.source?.sourceId ?? "",
    path: input?.source?.path ?? "",
    ...(revision === undefined ? {} : { revision }),
  };
  let config: Linter.Config[];
  try {
    if (
      typeof input?.originalText !== "string" ||
      (revision !== undefined && typeof revision !== "string") ||
      typeof source.sourceId !== "string" ||
      !source.sourceId.trim() ||
      typeof source.path !== "string" ||
      !source.path ||
      source.path.startsWith("/") ||
      /[:\\]/.test(source.path) ||
      source.path
        .split("/")
        .some((part) => !part || part === "." || part === "..")
    ) {
      throw new Error(
        "Lint requires original text, source identity and a relative POSIX Markdown path.",
      );
    }
    config = createLintConfig(input.configuration);
    validateLintConfiguration(config, source.path);
  } catch (cause) {
    throw new LintConfigurationError(
      cause instanceof Error
        ? cause.message
        : "Invalid lint input or configuration.",
      { cause, source },
    );
  }
  try {
    const linter = new Linter({ configType: "flat" });
    const messages = linter.verify(input.originalText, config, {
      filename: source.path,
    });
    // ESLint 10.10 exposes this method at runtime but omits it from its declarations.
    const suppressed = (
      linter as Linter & {
        getSuppressedMessages(): Linter.SuppressedLintMessage[];
      }
    ).getSuppressedMessages();
    const diagnostics = messages.map((message) =>
      normalize(message, input, source, config),
    );
    return {
      status: diagnostics.some((diagnostic) => diagnostic.severity === "error")
        ? "failed"
        : "passed",
      diagnostics,
      suppressedDiagnostics: suppressed.map((message) =>
        normalize(message, input, source, config),
      ),
    };
  } catch (cause) {
    if (cause instanceof LintConfigurationError) {
      throw new LintConfigurationError(cause.message, { cause, source });
    }
    throw new LintRuntimeError("Lint runtime failed.", { cause, source });
  }
}

function normalize(
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
