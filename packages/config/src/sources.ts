import type { LoadedConfig, SourceConfig } from "./model.js";

/** Selects all configured sources or the source with the requested id. */
export function selectSources(
  loaded: LoadedConfig,
  id?: string,
): readonly SourceConfig[] {
  if (loaded.config.sources.length === 0)
    throw new Error(`No sources configured in ${loaded.filename}`);
  if (id === undefined) return loaded.config.sources;
  const found = loaded.config.sources.find((source) => source.id === id);
  if (found === undefined) throw new Error(`Unknown source: ${id}`);
  return [found];
}
