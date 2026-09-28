import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { CONFIG_DIRECTORY, CONFIG_FILENAME } from "./defaults.js";
import type { LoadedConfig } from "./model.js";
import { validateConfig } from "./validation.js";
/**
 * Loads and validates the Dokkurator configuration below a project root.
 *
 * @param root - Workspace or repository root containing `.dokkurator`.
 * Relative paths are resolved against the current working directory.
 * @returns The absolute project root, expected configuration filename, and
 * validated raw configuration. A missing file produces an empty source list.
 * @throws {Error} If the file exists but cannot be read, parsed, or validated.
 */
export async function loadConfig(root: string): Promise<LoadedConfig> {
  const projectRoot = resolve(root);
  const filename = join(projectRoot, CONFIG_DIRECTORY, CONFIG_FILENAME);
  try {
    return {
      filename,
      projectRoot,
      config: validateConfig(parse(await readFile(filename, "utf8"))),
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return { filename, projectRoot, config: { sources: [] } };
    throw error;
  }
}
/**
 * Serializes and atomically persists a Dokkurator configuration.
 *
 * @param value - Loaded configuration containing the target filename and raw
 * configuration data to write.
 * @returns A promise that resolves after the temporary file has replaced the
 * target file.
 * @throws {Error} If the directory cannot be created or the file cannot be
 * written or renamed.
 */
export async function saveConfig(value: LoadedConfig): Promise<void> {
  await mkdir(dirname(value.filename), { recursive: true });
  const temporary = `${value.filename}.tmp-${process.pid}`;
  await writeFile(temporary, stringify(value.config), "utf8");
  await rename(temporary, value.filename);
}
