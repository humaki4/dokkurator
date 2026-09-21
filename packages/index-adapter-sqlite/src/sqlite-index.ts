import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Kysely, SqliteDialect, type Transaction } from "kysely";
import type {
  KnowledgeDocument,
  KnowledgeIndex,
  KnowledgeQuery,
  SearchHit,
  SearchQuery,
} from "@dokkurator/index-adapter";
import { nodeSqliteDatabase } from "./node-sqlite-dialect.js";
import { schema, type IndexDatabase } from "./schema.js";
import {
  getDocument,
  queryDocuments,
  searchDocuments,
  writeDocument,
} from "./sqlite-queries.js";

export interface SQLiteIndexOptions {
  readonly filename: string;
}

export class SQLiteIndex implements KnowledgeIndex, Disposable {
  readonly filename: string;
  readonly #database: DatabaseSync;
  readonly #queries: Kysely<IndexDatabase>;

  constructor({ filename }: SQLiteIndexOptions) {
    this.filename = filename;
    if (filename !== ":memory:")
      mkdirSync(dirname(filename), { recursive: true });

    this.#database = new DatabaseSync(filename, {
      enableForeignKeyConstraints: true,
    });
    this.#database.exec(
      "PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;",
    );
    this.#database.exec(schema);
    this.#queries = new Kysely<IndexDatabase>({
      dialect: new SqliteDialect({
        database: nodeSqliteDatabase(this.#database),
      }),
    });
  }

  async replaceAll(documents: readonly KnowledgeDocument[]): Promise<void> {
    await this.#transaction(async (transaction) => {
      await transaction.deleteFrom("document_search").execute();
      await transaction.deleteFrom("documents").execute();
      for (const document of documents)
        await writeDocument(transaction, document);
    });
  }

  async upsert(document: KnowledgeDocument): Promise<void> {
    await this.#transaction((transaction) =>
      writeDocument(transaction, document),
    );
  }

  async remove(id: string): Promise<void> {
    await this.#transaction(async (transaction) => {
      await transaction
        .deleteFrom("document_search")
        .where("document_id", "=", id)
        .execute();
      await transaction.deleteFrom("documents").where("id", "=", id).execute();
    });
  }

  async get(id: string): Promise<KnowledgeDocument | undefined> {
    return getDocument(this.#queries, id);
  }

  async query(
    query: KnowledgeQuery = {},
  ): Promise<readonly KnowledgeDocument[]> {
    return queryDocuments(this.#queries, query);
  }

  async search(query: SearchQuery): Promise<readonly SearchHit[]> {
    return searchDocuments(this.#queries, query);
  }

  async clear(): Promise<void> {
    await this.#transaction(async (transaction) => {
      await transaction.deleteFrom("document_search").execute();
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
