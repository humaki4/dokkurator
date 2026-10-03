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
export { dokkuratorEslintPlugin } from "./eslintPlugin/eslintPlugin.js";

export { prepareDocTypes } from "./doc-types/doc-types.js";
export type { PreparedDocTypeRegistry } from "./doc-types/doc-types.js";
