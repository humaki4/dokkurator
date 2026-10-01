import type {
  KnowledgeQuery,
  SearchExpression,
  SearchQuery,
} from "../index.js";
import { sql, type Kysely, type RawBuilder, type Transaction } from "kysely";
import type {
  DocumentMetadataSearchTable,
  DocumentsTable,
  IndexDatabase,
} from "./schema.js";

export async function writeDocument(
  queries: Transaction<IndexDatabase>,
  row: DocumentsTable,
  metadata: readonly DocumentMetadataSearchTable[],
): Promise<void> {
  await queries
    .insertInto("documents")
    .values(row)
    .onConflict((conflict) => conflict.column("id").doUpdateSet(row))
    .execute();
  await queries
    .deleteFrom("document_search")
    .where("document_id", "=", row.id)
    .execute();
  await queries
    .deleteFrom("document_metadata_search")
    .where("document_id", "=", row.id)
    .execute();
  await queries
    .insertInto("document_search")
    .values({
      document_id: row.id,
      content: row.content,
    })
    .execute();
  if (metadata.length > 0)
    await queries
      .insertInto("document_metadata_search")
      .values(metadata)
      .execute();
}

export async function getDocument(
  queries: Kysely<IndexDatabase>,
  id: string,
): Promise<DocumentsTable | undefined> {
  const row = await queries
    .selectFrom("documents")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
  return row;
}

export async function queryDocuments(
  queries: Kysely<IndexDatabase>,
  query: KnowledgeQuery,
): Promise<readonly DocumentsTable[]> {
  let statement = queries.selectFrom("documents").selectAll();
  if (query.type !== undefined)
    statement = statement.where("type", "=", query.type);
  if (query.sourceId !== undefined)
    statement = statement.where("source_id", "=", query.sourceId);
  const rows = await statement
    .orderBy("id")
    .limit(limit(query.limit))
    .offset(offset(query.offset))
    .execute();
  return rows;
}

export async function searchDocuments(
  queries: Kysely<IndexDatabase>,
  query: SearchQuery,
): Promise<readonly SearchDocumentRow[]> {
  const expression = query.expression ?? expressionFromText(query.text ?? "");
  if (expression === undefined) return [];

  const matches = compileExpression(expression);
  const types = query.types ?? [];
  const typeFilter =
    types.length === 0
      ? sql``
      : sql`AND d.type IN (${sql.join(types.map((type) => sql`${type}`))})`;
  const sourceFilter =
    query.sourceId === undefined
      ? sql``
      : sql`AND d.source_id = ${query.sourceId}`;
  const result = await sql<SearchDocumentRow>`
    SELECT d.*, matches.score AS rank,
           substr(d.content, 1, 240) AS snippet
      FROM (${matches}) AS matches
      JOIN documents AS d ON d.id = matches.document_id
     WHERE 1 = 1 ${typeFilter} ${sourceFilter}
     ORDER BY matches.score DESC, d.id
     LIMIT ${limit(query.limit)} OFFSET ${offset(query.offset)}
  `.execute(queries);
  return result.rows;
}

export type SearchDocumentRow = DocumentsTable & {
  readonly rank: number;
  readonly snippet: string;
};

function compileExpression(expression: SearchExpression): RawBuilder<unknown> {
  if (expression.type === "term") return compileTerm(expression);
  const [first, ...remaining] = expression.operands;
  if (first === undefined)
    return sql`SELECT '' AS document_id, 0 AS score WHERE 0`;
  return remaining.reduce(
    (left, right) => combine(left, compileExpression(right), expression.type),
    compileExpression(first),
  );
}

function compileTerm(
  expression: Extract<SearchExpression, { type: "term" }>,
): RawBuilder<unknown> {
  const metadata = metadataMatches(expression.value, expression.metadataKey);
  if (expression.metadataKey !== undefined) return metadata;
  const content = contentMatches(expression.value);
  return sql`
    SELECT document_id, SUM(score) AS score
      FROM (${metadata} UNION ALL ${content})
     GROUP BY document_id
  `;
}

function metadataMatches(
  value: string,
  metadataKey?: string,
): RawBuilder<unknown> {
  const keyFilter =
    metadataKey === undefined
      ? sql``
      : sql`AND key = ${metadataKey.toLocaleLowerCase()}`;
  if (value.length < 3)
    return sql`
      SELECT document_id, 100.0 + COUNT(*) AS score
        FROM document_metadata_search
       WHERE instr(lower(value), lower(${value})) > 0 ${keyFilter}
       GROUP BY document_id
    `;
  return sql`
    SELECT document_id, SUM(score) AS score
      FROM (
        SELECT document_id,
               100.0 +
               ((length(lower(value)) - length(replace(lower(value), lower(${value}), '')))
                 / max(length(${value}), 1)) AS score
          FROM document_metadata_search
         WHERE document_metadata_search MATCH ${ftsPhrase(value)} ${keyFilter}
      )
     GROUP BY document_id
  `;
}

function contentMatches(value: string): RawBuilder<unknown> {
  if (value.length < 3)
    return sql`
      SELECT document_id, 1.0 +
             ((length(lower(content)) - length(replace(lower(content), lower(${value}), '')))
               / max(length(${value}), 1)) AS score
        FROM document_search
       WHERE instr(lower(content), lower(${value})) > 0
    `;
  return sql`
    SELECT document_id, 1.0 +
           ((length(lower(content)) - length(replace(lower(content), lower(${value}), '')))
             / max(length(${value}), 1)) AS score
      FROM document_search
     WHERE document_search MATCH ${ftsPhrase(value)}
  `;
}

function combine(
  left: RawBuilder<unknown>,
  right: RawBuilder<unknown>,
  operator: "and" | "or",
): RawBuilder<unknown> {
  if (operator === "and")
    return sql`
      SELECT left_matches.document_id,
             left_matches.score + right_matches.score AS score
        FROM (${left}) AS left_matches
        JOIN (${right}) AS right_matches
          ON right_matches.document_id = left_matches.document_id
    `;
  return sql`
    SELECT document_id, SUM(score) AS score
      FROM (${left} UNION ALL ${right})
     GROUP BY document_id
  `;
}

function expressionFromText(text: string): SearchExpression | undefined {
  const terms = text.trim().split(/\s+/u).filter(Boolean);
  if (terms.length === 0) return undefined;
  const operands = terms.map((value): SearchExpression => ({
    type: "term",
    value,
  }));
  return operands.length === 1 ? operands[0] : { type: "and", operands };
}

function ftsPhrase(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function limit(value: number | undefined): number {
  return Math.max(1, Math.min(value ?? 50, 500));
}

function offset(value: number | undefined): number {
  return Math.max(0, value ?? 0);
}
