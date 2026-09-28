import { existsSync } from "node:fs";
import {
  calculateDocumentDiff,
  parseSearchExpression,
  SQLiteIndex,
  type SearchHit,
} from "@dokkurator/knowledge";
import type { SourceDiff } from "@dokkurator/doctype";
import type { LoadedConfig } from "@dokkurator/config";
import { resolveSourceContent } from "@dokkurator/config";
import { configuredSource, indexFilename, selectSources } from "../project.js";
import { syncSource, type SyncSourceResult } from "../sync-source.js";

export async function indexSources(
  loaded: LoadedConfig,
  sourceId: string | undefined,
  options: { index?: string; documentsDirectory?: string },
): Promise<readonly { sourceId: string; result: SyncSourceResult }[]> {
  const results = [];
  for (const source of selectSources(loaded, sourceId))
    results.push({
      sourceId: source.id,
      result: await syncSource(loaded, source, options),
    });
  return results;
}

export async function diffSources(
  loaded: LoadedConfig,
  sourceId: string | undefined,
  options: { index?: string; documentsDirectory?: string },
): Promise<readonly { sourceId: string; diff: SourceDiff }[]> {
  const filename = indexFilename(loaded, options.index);
  const index = existsSync(filename)
    ? new SQLiteIndex({ filename, readOnly: true })
    : undefined;
  try {
    return await Promise.all(
      selectSources(loaded, sourceId).map(async (source) => ({
        sourceId: source.id,
        diff: await calculateDocumentDiff({
          source: await configuredSource(loaded, source),
          index: index ?? { getSourceState: async () => undefined },
          documentsDirectory:
            options.documentsDirectory ??
            (await resolveSourceContent(loaded, source)).documents.directory,
          include: (await resolveSourceContent(loaded, source)).documents
            .include,
          exclude: (await resolveSourceContent(loaded, source)).documents
            .exclude,
        }),
      })),
    );
  } finally {
    index?.close();
  }
}

export async function searchIndex(
  loaded: LoadedConfig,
  query: string,
  options: { index?: string; limit: number },
): Promise<readonly SearchHit[]> {
  const expression = parseSearchExpression(query);
  const index = new SQLiteIndex({
    filename: indexFilename(loaded, options.index),
    readOnly: true,
  });
  try {
    return await index.search({
      expression,
      limit: options.limit,
    });
  } finally {
    index.close();
  }
}
