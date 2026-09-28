import { createConfiguredSource } from "@dokkurator/doctype";
import { indexDocumentChanges, SQLiteIndex } from "@dokkurator/knowledge";
import type { ActiveSourceConfig } from "@dokkurator/config";

export interface SyncSourceResult {
  readonly indexedDocuments: number;
  readonly removedDocuments: number;
}

export async function syncSource(
  source: ActiveSourceConfig,
  indexFilename: string,
  updateRemote = true,
): Promise<SyncSourceResult> {
  const index = new SQLiteIndex({ filename: indexFilename });
  try {
    return await indexDocumentChanges({
      source: await createConfiguredSource(source, updateRemote),
      index,
      documents: {
        documentsDirectory: source.documents.directory,
        include: source.documents.include,
        exclude: source.documents.exclude,
      },
    });
  } finally {
    index.close();
  }
}
