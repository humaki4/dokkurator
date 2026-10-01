import type { DocType } from "@dokkurator/loader";

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
