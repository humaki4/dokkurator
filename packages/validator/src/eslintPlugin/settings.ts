import type { PreparedDocTypeRegistry } from "../doc-types/doc-types.js";
import { LintConfigurationError } from "../lint/errors.js";

export function getDocTypeRegistry(
  settings: Readonly<Record<string, unknown>>,
): PreparedDocTypeRegistry {
  const registry = settings.dokkurator as PreparedDocTypeRegistry | undefined;
  if (
    !registry ||
    !Array.isArray(registry.docTypes) ||
    typeof registry.selectDocType !== "function"
  ) {
    throw new LintConfigurationError(
      "Dokkurator rules require prepared DocTypes in settings.dokkurator; use prepareDocTypes.",
    );
  }
  return registry;
}
