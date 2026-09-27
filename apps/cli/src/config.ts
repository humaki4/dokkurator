import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parse, stringify } from "yaml";

export const CONFIG_DIRECTORY = ".dokkurator";
export const CONFIG_FILENAME = "config.yaml";

export interface SourceConfig {
  readonly id: string;
  readonly path: string;
}

export interface DokkuratorConfig {
  readonly sources: readonly SourceConfig[];
}

export interface LoadedConfig {
  readonly filename: string;
  readonly projectRoot: string;
  readonly config: DokkuratorConfig;
}

export async function loadConfig(projectRoot: string): Promise<LoadedConfig> {
  const root = resolve(projectRoot);
  const filename = join(root, CONFIG_DIRECTORY, CONFIG_FILENAME);
  let value: unknown;
  try {
    value = parse(await readFile(filename, "utf8"));
  } catch (error) {
    if (isNotFound(error))
      return { filename, projectRoot: root, config: { sources: [] } };
    throw error;
  }
  return {
    filename,
    projectRoot: root,
    config: validateConfig(value, filename),
  };
}

export async function saveConfig(loaded: LoadedConfig): Promise<void> {
  await mkdir(dirname(loaded.filename), { recursive: true });
  await writeFile(loaded.filename, stringify(loaded.config), "utf8");
}

export function resolveSourcePath(
  loaded: LoadedConfig,
  source: SourceConfig,
): string {
  return resolve(loaded.projectRoot, source.path);
}

function validateConfig(value: unknown, filename: string): DokkuratorConfig {
  if (value === null || typeof value !== "object")
    throw new Error(`Invalid config: ${filename}`);
  const sources = (value as { sources?: unknown }).sources ?? [];
  if (!Array.isArray(sources))
    throw new Error(`Config sources must be an array: ${filename}`);
  const ids = new Set<string>();
  return {
    sources: sources.map((source, index) => {
      if (source === null || typeof source !== "object")
        throw new Error(`Invalid source at index ${index}`);
      const { id, path } = source as { id?: unknown; path?: unknown };
      if (typeof id !== "string" || id.trim() === "")
        throw new Error(`Source ${index} requires an id`);
      if (typeof path !== "string" || path.trim() === "")
        throw new Error(`Source ${id} requires a path`);
      if (ids.has(id)) throw new Error(`Duplicate source id: ${id}`);
      ids.add(id);
      return { id, path };
    }),
  };
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
