import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Kysely, SqliteDialect, type Transaction } from "kysely";
import type { SourceState } from "@dokkurator/loader";
import type {
  IncrementalKnowledgeIndex,
  KnowledgeDocument,
  KnowledgeQuery,
  SearchHit,
  SearchQuery,
  SourceIndexUpdate,
} from "../index.js";
import { nodeSqliteDatabase } from "./node-sqlite-dialect.js";
import {
  toDocument,
  toDocumentRow,
  toMetadataRows,
  toSearchHit,
} from "./document-mapper.js";
import { initializeSchema, type IndexDatabase } from "./schema.js";
import {
  getDocument,
  queryDocuments,
  searchDocuments,
  writeDocument as writeDocumentQuery,
} from "./sqlite-queries.js";

export interface SQLiteIndexOptions {
  readonly filename: string;
  readonly readOnly?: boolean;
}

export class SQLiteIndex implements IncrementalKnowledgeIndex, Disposable {
  readonly filename: string;
  readonly #database: DatabaseSync;
  readonly #queries: Kysely<IndexDatabase>;

  constructor({ filename, readOnly = false }: SQLiteIndexOptions) {
    this.filename = filename;
    if (!readOnly && filename !== ":memory:")
      mkdirSync(dirname(filename), { recursive: true });

    this.#database = new DatabaseSync(filename, {
      enableForeignKeyConstraints: true,
      readOnly,
    });
    if (readOnly) this.#database.exec("PRAGMA busy_timeout = 5000;");
    else {
      this.#database.exec(
        "PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
      );
      initializeSchema(this.#database);
    }
    this.#queries = new Kysely<IndexDatabase>({
      dialect: new SqliteDialect({
        database: nodeSqliteDatabase(this.#database),
      }),
    });
  }

  async replaceAll(documents: readonly KnowledgeDocument[]): Promise<void> {
    await this.#transaction(async (transaction) => {
      await transaction.deleteFrom("source_states").execute();
      await transaction.deleteFrom("document_search").execute();
      await transaction.deleteFrom("document_metadata_search").execute();
      await transaction.deleteFrom("documents").execute();
      for (const document of documents) {
        const row = toDocumentRow(document);
        const metadata = toMetadataRows(document.id, document.metadata);
        await writeDocumentQuery(transaction, row, metadata);
      }
    });
  }

  async getSourceState(sourceId: string): Promise<SourceState | undefined> {
    try {
      const row = await this.#queries
        .selectFrom("source_states")
        .select("state")
        .where("source_id", "=", sourceId)
        .executeTakeFirst();
      return row === undefined
        ? undefined
        : (JSON.parse(row.state) as SourceState);
    } catch (error) {
      if (isMissingSourceStatesTable(error)) return undefined;
      throw error;
    }
  }

  async applySourceUpdate(update: SourceIndexUpdate): Promise<void> {
    await this.#transaction(async (transaction) => {
      if (update.replaceSource === true) {
        const existing = await transaction
          .selectFrom("documents")
          .select("id")
          .where("source_id", "=", update.state.sourceId)
          .execute();
        for (const { id } of existing) await removeDocument(transaction, id);
      }
      for (const id of update.remove) {
        await removeDocument(transaction, id);
      }
      for (const document of update.upsert) {
        await writeDocumentQuery(
          transaction,
          toDocumentRow(document),
          toMetadataRows(document.id, document.metadata),
        );
      }
      await transaction
        .insertInto("source_states")
        .values({
          source_id: update.state.sourceId,
          state: JSON.stringify(update.state),
          indexed_at: new Date().toISOString(),
        })
        .onConflict((conflict) =>
          conflict.column("source_id").doUpdateSet({
            state: JSON.stringify(update.state),
            indexed_at: new Date().toISOString(),
          }),
        )
        .execute();
    });
  }

  /** Atomically removes a source checkpoint and every indexed document. */
  async deleteSource(sourceId: string): Promise<void> {
    await this.#transaction(async (transaction) => {
      const documents = await transaction
        .selectFrom("documents")
        .select("id")
        .where("source_id", "=", sourceId)
        .execute();
      for (const { id } of documents) await removeDocument(transaction, id);
      await transaction
        .deleteFrom("source_states")
        .where("source_id", "=", sourceId)
        .execute();
    });
  }

  async upsert(document: KnowledgeDocument): Promise<void> {
    await this.#transaction(async (transaction) => {
      const row = toDocumentRow(document);
      const metadata = toMetadataRows(document.id, document.metadata);
      await writeDocumentQuery(transaction, row, metadata);
    });
  }

  async remove(id: string): Promise<void> {
    await this.#transaction(async (transaction) => {
      await removeDocument(transaction, id);
    });
  }

  async get(id: string): Promise<KnowledgeDocument | undefined> {
    const row = await getDocument(this.#queries, id);
    return row === undefined ? undefined : toDocument(row);
  }

  async query(
    query: KnowledgeQuery = {},
  ): Promise<readonly KnowledgeDocument[]> {
    const rows = await queryDocuments(this.#queries, query);
    return rows.map(toDocument);
  }

  async search(query: SearchQuery): Promise<readonly SearchHit[]> {
    const rows = await searchDocuments(this.#queries, query);
    return rows.map(toSearchHit);
  }

  async clear(): Promise<void> {
    await this.#transaction(async (transaction) => {
      await transaction.deleteFrom("source_states").execute();
      await transaction.deleteFrom("document_search").execute();
      await transaction.deleteFrom("document_metadata_search").execute();
      await transaction.deleteFrom("documents").execute();
    });
  }

  close(): void {
    this.#database.close();
  }

  [Symbol.dispose](): void {
    this.close();
  }

  async #transaction(
    operation: (transaction: Transaction<IndexDatabase>) => Promise<void>,
  ): Promise<void> {
    await this.#queries.transaction().execute(operation);
  }
}

function isMissingSourceStatesTable(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("no such table: source_states")
  );
}

async function removeDocument(
  transaction: Transaction<IndexDatabase>,
  id: string,
): Promise<void> {
  await transaction
    .deleteFrom("document_search")
    .where("document_id", "=", id)
    .execute();
  await transaction
    .deleteFrom("document_metadata_search")
    .where("document_id", "=", id)
    .execute();
  await transaction.deleteFrom("documents").where("id", "=", id).execute();
}
