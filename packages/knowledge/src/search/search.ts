import type { KnowledgeIndex, SearchHit } from "../index-adapter/index.js";
import { parseSearchExpression } from "./search-query.js";

/** Filters applied while searching with Dokkurator query syntax. */
export interface KnowledgeSearchOptions {
  readonly sourceId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/** Parses a Dokkurator query and delegates it to a Knowledge index. */
export async function searchKnowledge(
  index: Pick<KnowledgeIndex, "search">,
  query: string,
  options: KnowledgeSearchOptions = {},
): Promise<readonly SearchHit[]> {
  return index.search({
    expression: parseSearchExpression(query),
    ...options,
  });
}
