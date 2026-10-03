import { Linter } from "eslint";
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
  return {
    status: diagnostics.some((diagnostic) => diagnostic.severity === "error")
      ? "failed"
      : "passed",
    diagnostics,
    suppressedDiagnostics: result.suppressed.map(normalize),
  };
}
