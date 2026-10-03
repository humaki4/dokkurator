import type { DocType } from "@dokkurator/loader";

export {
  createLintConfig,
  prepareLintConfiguration,
} from "./lint/configuration.js";
export type {
  LintConfigurationInput,
  PreparedLintConfiguration,
} from "./lint/configuration.js";
export { LintConfigurationError } from "./lint/errors.js";
export type {
  DocTypeSelection,
  DocTypeSelectionCode,
  MetadataSchema,
  MetadataValidationResult,
  PreparedDocType,
} from "./lint/doc-types.js";

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
