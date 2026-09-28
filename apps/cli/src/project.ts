import { isAbsolute, resolve } from "node:path";
import {
  createConfiguredLocalSource,
  createGitCheckoutSource,
  type SourceAdapter,
} from "@dokkurator/doctype";
import { Command } from "commander";
import {
  DEFAULT_CONFIG,
  loadConfig,
  resolveSourcePath,
  type LoadedConfig,
  type SourceConfig,
} from "@dokkurator/config";

export async function currentConfig(command: Command): Promise<LoadedConfig> {
  return loadConfig(command.opts<{ project: string }>().project);
}

export function selectSources(
  loaded: LoadedConfig,
  id?: string,
): readonly SourceConfig[] {
  if (loaded.config.sources.length === 0)
    throw new Error(`No sources configured in ${loaded.filename}`);
  if (id === undefined) return loaded.config.sources;
  const found = loaded.config.sources.find((item) => item.id === id);
  if (found === undefined) throw new Error(`Unknown source: ${id}`);
  return [found];
}

export async function configuredSource(
  loaded: LoadedConfig,
  item: SourceConfig,
  update = true,
): Promise<SourceAdapter> {
  if (item.remote !== undefined)
    return createGitCheckoutSource({
      root: resolveSourcePath(loaded, item),
      sourceId: item.id,
      url: item.remote.url,
      branch: item.remote.branch,
      update,
    });
  return createConfiguredLocalSource({
    root: resolveSourcePath(loaded, item),
    sourceId: item.id,
  });
}

export async function forEachSource(
  command: Command,
  id: string | undefined,
  operation: (item: SourceConfig, loaded: LoadedConfig) => Promise<void>,
): Promise<void> {
  const loaded = await currentConfig(command);
  for (const item of selectSources(loaded, id)) await operation(item, loaded);
}

export function indexFilename(loaded: LoadedConfig, filename?: string): string {
  const resolvedFilename =
    filename ??
    loaded.config.knowledge?.index ??
    DEFAULT_CONFIG.knowledge.index;
  return isAbsolute(resolvedFilename)
    ? resolvedFilename
    : resolve(loaded.projectRoot, resolvedFilename);
}
