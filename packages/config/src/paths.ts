import { isAbsolute, join, resolve } from "node:path";
import { DEFAULT_CONFIG } from "./defaults.js";
import type { LoadedConfig, SourceConfig } from "./model.js";
/**
 * Resolves an application-owned path against the workspace root.
 *
 * @param loaded - Configuration containing the absolute workspace root.
 * @param path - Absolute path or path relative to the workspace root.
 * @returns An absolute normalized filesystem path.
 */

//TODO: warum exportieren, wenn es nur hier verwendet wird?
export function resolveProjectPath(loaded: LoadedConfig, path: string): string {
  return isAbsolute(path) ? path : resolve(loaded.projectRoot, path);
}
/**
 * Resolves the local filesystem root used for a configured source.
 *
 * @param loaded - Loaded workspace configuration.
 * @param source - Local or remote source configuration.
 * @returns The absolute configured local path. A remote source without an
 * explicit path is placed below `checkouts.directory/<source-id>`.
 */
export function resolveSourcePath(
  loaded: LoadedConfig,
  source: SourceConfig,
): string {
  return resolveProjectPath(
    loaded,
    source.path ??
      join(
        loaded.config.checkouts?.directory ??
          DEFAULT_CONFIG.checkouts.directory,
        source.id,
      ),
  );
}
/**
 * Resolves the effective SQLite Knowledge index filename.
 *
 * @param loaded - Loaded workspace configuration.
 * @param override - Optional invocation-specific path, such as a CLI option.
 * @returns An absolute path selected from the override, workspace setting, or
 * built-in default, in that order.
 */
export function resolveIndexPath(
  loaded: LoadedConfig,
  override?: string,
): string {
  return resolveProjectPath(
    loaded,
    override ??
      loaded.config.knowledge?.index ??
      DEFAULT_CONFIG.knowledge.index,
  );
}
