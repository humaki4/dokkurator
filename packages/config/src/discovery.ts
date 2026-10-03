import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  CONFIG_DIRECTORY,
  CONFIG_FILENAME,
  JS_CONFIG_FILENAME,
} from "./defaults.js";
/**
 * Finds the nearest root containing `dokkurator.config.mjs` or legacy YAML.
 *
 * @param start - Directory from which to search upward.
 * @returns The absolute nearest matching ancestor. If no configuration exists
 * before reaching the filesystem root, the absolute start directory is
 * returned so it can act as a new project root.
 */
export function findProjectRoot(start: string): string {
  let current = resolve(start);
  while (true) {
    if (
      existsSync(join(current, JS_CONFIG_FILENAME)) ||
      existsSync(join(current, CONFIG_DIRECTORY, CONFIG_FILENAME))
    )
      return current;
    const parent = dirname(current);
    if (parent === current) return resolve(start);
    current = parent;
  }
}
