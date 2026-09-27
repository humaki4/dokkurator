import { indexDocumentChanges, SQLiteIndex } from "@dokkurator/knowledge";
import type { LoadedConfig, SourceConfig } from "./config.js";
import { configuredSource, indexFilename } from "./project.js";

export interface SyncSourceOptions {
  readonly index: string;
  readonly documentsDirectory: string;
  readonly updateRemote?: boolean;
}

export interface SyncSourceResult {
  readonly indexedDocuments: number;
  readonly removedDocuments: number;
}

export async function syncSource(
  loaded: LoadedConfig,
  source: SourceConfig,
  options: SyncSourceOptions,
): Promise<SyncSourceResult> {
  const index = new SQLiteIndex({
    filename: indexFilename(loaded, options.index),
  });
  try {
    return await indexDocumentChanges({
      source: await configuredSource(
        loaded,
        source,
        options.updateRemote ?? true,
      ),
      index,
      documentsDirectory: options.documentsDirectory,
    });
  } finally {
    index.close();
  }
}
