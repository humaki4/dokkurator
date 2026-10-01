export { readSources, updateSources } from "./config-file.js";
export { findProjectRoot } from "./discovery.js";
export type {
  ConfigOptions,
  ResolvedConfig,
  ResolvedProjectConfig,
  ResolvedProjectSource,
  ResolvedSource,
} from "./model.js";
export {
  resolveActiveConfig,
  resolveProjectConfig,
  resolveSourceConfig,
} from "./resolution.js";
