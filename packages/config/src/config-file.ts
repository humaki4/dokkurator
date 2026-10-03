import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { pathToFileURL } from "node:url";
import {
  CONFIG_DIRECTORY,
  CONFIG_FILENAME,
  JS_CONFIG_FILENAME,
  SOURCES_FILENAME,
} from "./defaults.js";
import type { LoadedConfig, RepositoryConfig, SourceConfig } from "./model.js";
import { validateConfig, validateRepositoryConfig } from "./validation.js";
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
  const javascript = await readJavaScriptConfig(projectRoot);
  if (javascript) {
    let sources: unknown;
    try {
      sources = parse(
        await readFile(
          join(projectRoot, CONFIG_DIRECTORY, SOURCES_FILENAME),
          "utf8",
        ),
      );
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
    return {
      filename: javascript.filename,
      projectRoot,
      config: validateConfig(
        sources === undefined
          ? javascript.config
          : { ...javascript.config, sources },
      ),
    };
  }
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

/** Loads only repository-local settings from a non-root source. */
export async function loadRepositoryConfig(
  root: string,
): Promise<RepositoryConfig> {
  const javascript = await readJavaScriptConfig(resolve(root));
  if (javascript) return validateRepositoryConfig(javascript.config);
  const filename = join(resolve(root), CONFIG_DIRECTORY, CONFIG_FILENAME);
  try {
    return validateRepositoryConfig(parse(await readFile(filename, "utf8")));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return {};
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
  if (value.filename.endsWith(JS_CONFIG_FILENAME))
    throw new Error(
      "JavaScript configuration must be edited as source; it cannot be serialized to YAML.",
    );
  await mkdir(dirname(value.filename), { recursive: true });
  const temporary = `${value.filename}.tmp-${process.pid}`;
  await writeFile(temporary, stringify(value.config), "utf8");
  await rename(temporary, value.filename);
}

/** Returns source declarations without exposing the rest of the loaded file. */
export async function readSources(
  root: string,
): Promise<readonly SourceConfig[]> {
  return (await loadConfig(root)).config.sources;
}

/** Updates source declarations while preserving every other root setting. */
export async function updateSources(
  root: string,
  update: (sources: readonly SourceConfig[]) => readonly SourceConfig[],
): Promise<void> {
  const loaded = await loadConfig(root);
  const config = validateConfig({
    ...loaded.config,
    sources: update(loaded.config.sources),
  });
  if (loaded.filename.endsWith(JS_CONFIG_FILENAME)) {
    const filename = join(
      loaded.projectRoot,
      CONFIG_DIRECTORY,
      SOURCES_FILENAME,
    );
    await mkdir(dirname(filename), { recursive: true });
    const temporary = `${filename}.tmp-${process.pid}`;
    await writeFile(temporary, stringify(config.sources), "utf8");
    await rename(temporary, filename);
  } else {
    await saveConfig({ ...loaded, config });
  }
}

async function readJavaScriptConfig(
  root: string,
): Promise<{ filename: string; config: Record<string, unknown> } | undefined> {
  const filename = join(root, JS_CONFIG_FILENAME);
  let info;
  try {
    info = await stat(filename);
  } catch (error) {
    if (isMissing(error)) return undefined;
    throw error;
  }
  const url = pathToFileURL(filename);
  url.searchParams.set("version", `${info.mtimeMs}-${info.size}`);
  const module = await import(url.href);
  const config: unknown = module.default;
  if (config === null || typeof config !== "object" || Array.isArray(config))
    throw new Error(`${filename} must default-export a configuration object`);
  return { filename, config: config as Record<string, unknown> };
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
