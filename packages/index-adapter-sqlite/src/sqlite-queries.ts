import type {
  KnowledgeDocument,
  KnowledgeQuery,
  SearchHit,
  SearchQuery,
} from "@dokkurator/index-adapter";
import { sql, type Kysely, type Transaction } from "kysely";
import {
  documentColumns,
  titleOf,
  toDocument,
  toDocumentRow,
} from "./document-mapper.js";
import type { IndexDatabase } from "./schema.js";

export async function writeDocument(
  queries: Transaction<IndexDatabase>,
  document: KnowledgeDocument,
): Promise<void> {
  const row = toDocumentRow(document);
  await queries
    .insertInto("documents")
    .values(row)
    .onConflict((conflict) => conflict.column("id").doUpdateSet(row))
    .execute();
  await queries
    .deleteFrom("document_search")
    .where("document_id", "=", document.id)
    .execute();
  await queries
    .insertInto("document_search")
    .values({
      document_id: document.id,
      title: titleOf(document),
      content: document.content,
    })
    .execute();
}

export async function getDocument(
  queries: Kysely<IndexDatabase>,
  id: string,
): Promise<KnowledgeDocument | undefined> {
  const row = await queries
    .selectFrom("documents")
    .select(documentColumns)
    .where("id", "=", id)
    .executeTakeFirst();
  return row === undefined ? undefined : toDocument(row);
}

export async function queryDocuments(
  queries: Kysely<IndexDatabase>,
  query: KnowledgeQuery,
): Promise<readonly KnowledgeDocument[]> {
  let statement = queries.selectFrom("documents").select(documentColumns);
  if (query.type !== undefined)
    statement = statement.where("type", "=", query.type);
  if (query.sourceId !== undefined)
    statement = statement.where("source_id", "=", query.sourceId);
  const rows = await statement
    .orderBy("id")
    .limit(limit(query.limit))
    .offset(offset(query.offset))
    .execute();
  return rows.map(toDocument);
}

export async function searchDocuments(
  queries: Kysely<IndexDatabase>,
  query: SearchQuery,
): Promise<readonly SearchHit[]> {
  const text = toFtsQuery(query.text);
  if (text === "") return [];

  let statement = queries
    .selectFrom("document_search")
    .innerJoin("documents as d", "d.id", "document_search.document_id")
    .select(documentColumns.map((column) => `d.${column}` as const))
    .select([
      sql<number>`bm25(document_search, 0.0, 4.0, 1.0)`.as("rank"),
      sql<string>`snippet(document_search, 2, '<mark>', '</mark>', ' … ', 24)`.as(
        "snippet",
      ),
    ])
    .where(sql<boolean>`document_search MATCH ${text}`);
  const types = query.types ?? [];
  if (types.length > 0) statement = statement.where("d.type", "in", types);
  const rows = await statement
    .orderBy("rank")
    .orderBy("d.id")
    .limit(limit(query.limit))
    .offset(offset(query.offset))
    .execute();
  return rows.map((row) => ({
    document: toDocument(row),
    rank: row.rank,
    snippet: row.snippet,
  }));
}

function limit(value: number | undefined): number {
  return Math.max(1, Math.min(value ?? 50, 500));
}

function offset(value: number | undefined): number {
  return Math.max(0, value ?? 0);
}

function toFtsQuery(value: string): string {
  return value
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((term) => `"${term.replaceAll('"', '""')}"`)
    .join(" ");
}
