import type { Linter } from "eslint";
import type { LintInput } from "./runtime.js";
import { createLintConfig } from "../configuration/configuration.js";
import { validateLintConfiguration } from "../configuration/validate-configuration.js";
import { LintConfigurationError } from "../errors.js";

export function prepareLintInput(input: LintInput): {
  config: Linter.Config[];
  source: NonNullable<LintConfigurationError["source"]>;
} {
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
    return { config, source };
  } catch (cause) {
    throw new LintConfigurationError(
      cause instanceof Error
        ? cause.message
        : "Invalid lint input or configuration.",
      { cause, source },
    );
  }
}
