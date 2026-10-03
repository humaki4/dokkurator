import type { DocType } from "@dokkurator/loader";

export {
  createLintConfig,
  prepareLintConfiguration,
} from "./lint/configuration/configuration.js";
export type {
  LintConfigurationInput,
  PreparedLintConfiguration,
} from "./lint/configuration/configuration.js";
export { LintConfigurationError, LintRuntimeError } from "./lint/errors.js";
export { lint } from "./lint/runtime/runtime.js";
export { plugin } from "./plugin/plugin.js";

export interface ValidationResult {
  valid: boolean;
  missingFields: string[];
}

export function validateDocument(
  docType: DocType,
  document: Record<string, unknown>,
): ValidationResult {
  const missingFields = docType.requiredFields.filter(
    (field) => !Object.hasOwn(document, field),
  );
  return { valid: missingFields.length === 0, missingFields };
}
