import { existsSync } from "node:fs";
import type { ResolvedConfig } from "@dokkurator/config";
import { createConfiguredSource, type SourceDiff } from "@dokkurator/doctype";
import {
  calculateDocumentDiff,
  parseSearchExpression,
  SQLiteIndex,
  type SearchHit,
} from "@dokkurator/knowledge";
import { syncSource, type SyncSourceResult } from "../sync-source.js";

export async function indexSources(
  active: ResolvedConfig,
): Promise<readonly { sourceId: string; result: SyncSourceResult }[]> {
  const results = [];
  for (const source of active.sources)
    results.push({
      sourceId: source.id,
      result: await syncSource(source, active.knowledge.index, false),
    });
  return results;
}

export async function diffSources(
  active: ResolvedConfig,
): Promise<readonly { sourceId: string; diff: SourceDiff }[]> {
  const filename = active.knowledge.index;
  const index = existsSync(filename)
    ? new SQLiteIndex({ filename, readOnly: true })
    : undefined;
  try {
    return await Promise.all(
      active.sources.map(async (source) => ({
        sourceId: source.id,
        diff: await calculateDocumentDiff({
          source: await createConfiguredSource(source, false),
          index: index ?? { getSourceState: async () => undefined },
          documents: {
            documentsDirectory: source.documents.directory,
            include: source.documents.include,
            exclude: source.documents.exclude,
          },
        }),
      })),
    );
  } finally {
    index?.close();
  }
}

export async function searchIndex(
  active: ResolvedConfig,
  query: string,
  limit: number,
): Promise<readonly SearchHit[]> {
  const expression = parseSearchExpression(query);
  const index = new SQLiteIndex({
    filename: active.knowledge.index,
    readOnly: true,
  });
  try {
    return await index.search({
      expression,
      limit,
    });
  } finally {
    index.close();
  }
}
