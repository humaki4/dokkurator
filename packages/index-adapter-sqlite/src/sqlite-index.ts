import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  KnowledgeDocument,
  KnowledgeIndex,
  KnowledgeQuery,
  SearchHit,
  SearchQuery,
} from "@dokkurator/index-adapter";
import { SCHEMA_VERSION, schema } from "./schema.js";

export interface SQLiteIndexOptions {
  readonly filename: string;
}

interface DocumentRow {
  readonly id: string;
  readonly type: string | null;
  readonly source_id: string;
  readonly path: string;
  readonly repository: string | null;
  readonly revision: string | null;
  readonly metadata: string;
  readonly content: string;
  readonly headings: string;
  readonly links: string;
  readonly references_: string;
}

interface SearchRow extends DocumentRow {
  readonly rank: number;
  readonly snippet: string;
}

export class SQLiteIndex implements KnowledgeIndex, Disposable {
  readonly filename: string;
  readonly #database: DatabaseSync;

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
    this.#migrate();
  }

  async replaceAll(documents: readonly KnowledgeDocument[]): Promise<void> {
    this.#transaction(() => {
      this.#database.exec(
        "DELETE FROM document_search; DELETE FROM documents;",
      );
      for (const document of documents) this.#write(document);
    });
  }

  async upsert(document: KnowledgeDocument): Promise<void> {
    this.#transaction(() => this.#write(document));
  }

  #write(document: KnowledgeDocument): void {
    this.#database
      .prepare(
        `INSERT INTO documents (
             id, type, source_id, path, repository, revision, metadata,
             content, headings, links, references_, indexed_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             type = excluded.type,
             source_id = excluded.source_id,
             path = excluded.path,
             repository = excluded.repository,
             revision = excluded.revision,
             metadata = excluded.metadata,
             content = excluded.content,
             headings = excluded.headings,
             links = excluded.links,
             references_ = excluded.references_,
             indexed_at = excluded.indexed_at`,
      )
      .run(
        document.id,
        document.type ?? null,
        document.source.sourceId,
        document.source.path,
        document.source.repository ?? null,
        document.source.revision ?? null,
        serialize(document.metadata),
        document.content,
        serialize(document.headings),
        serialize(document.links),
        serialize(document.references),
        new Date().toISOString(),
      );

    this.#database
      .prepare("DELETE FROM document_search WHERE document_id = ?")
      .run(document.id);
    this.#database
      .prepare(
        "INSERT INTO document_search (document_id, title, content) VALUES (?, ?, ?)",
      )
      .run(document.id, titleOf(document), document.content);
  }

  async remove(id: string): Promise<void> {
    this.#transaction(() => {
      this.#database
        .prepare("DELETE FROM document_search WHERE document_id = ?")
        .run(id);
      this.#database.prepare("DELETE FROM documents WHERE id = ?").run(id);
    });
  }

  async get(id: string): Promise<KnowledgeDocument | undefined> {
    const row = this.#database
      .prepare("SELECT * FROM documents WHERE id = ?")
      .get(id) as DocumentRow | undefined;
    return row === undefined ? undefined : toDocument(row);
  }

  async query(
    query: KnowledgeQuery = {},
  ): Promise<readonly KnowledgeDocument[]> {
    const conditions: string[] = [];
    const parameters: Array<string | number> = [];
    if (query.type !== undefined) {
      conditions.push("type = ?");
      parameters.push(query.type);
    }
    if (query.sourceId !== undefined) {
      conditions.push("source_id = ?");
      parameters.push(query.sourceId);
    }

    const where =
      conditions.length === 0 ? "" : ` WHERE ${conditions.join(" AND ")}`;
    const rows = this.#database
      .prepare(`SELECT * FROM documents${where} ORDER BY id LIMIT ? OFFSET ?`)
      .all(
        ...parameters,
        limit(query.limit),
        offset(query.offset),
      ) as unknown as DocumentRow[];
    return rows.map(toDocument);
  }

  async search(query: SearchQuery): Promise<readonly SearchHit[]> {
    const text = toFtsQuery(query.text);
    if (text === "") return [];

    const types = query.types ?? [];
    const typeFilter =
      types.length === 0
        ? ""
        : ` AND d.type IN (${types.map(() => "?").join(", ")})`;
    const statement = this.#database.prepare(
      `SELECT d.*, bm25(document_search, 0.0, 4.0, 1.0) AS rank,
              snippet(document_search, 2, '<mark>', '</mark>', ' … ', 24) AS snippet
         FROM document_search
         JOIN documents d ON d.id = document_search.document_id
        WHERE document_search MATCH ?${typeFilter}
        ORDER BY rank, d.id
        LIMIT ? OFFSET ?`,
    );
    const rows = statement.all(
      text,
      ...types,
      limit(query.limit),
      offset(query.offset),
    ) as unknown as SearchRow[];
    return rows.map((row) => ({
      document: toDocument(row),
      rank: row.rank,
      snippet: row.snippet,
    }));
  }

  async clear(): Promise<void> {
    this.#transaction(() => {
      this.#database.exec(
        "DELETE FROM document_search; DELETE FROM documents;",
      );
    });
  }

  close(): void {
    this.#database.close();
  }

  [Symbol.dispose](): void {
    this.close();
  }

  #migrate(): void {
    this.#transaction(() => {
      this.#database.exec(schema);
      const row = this.#database
        .prepare("SELECT version FROM schema_version LIMIT 1")
        .get() as { version: number } | undefined;
      if (row === undefined) {
        this.#database
          .prepare("INSERT INTO schema_version (version) VALUES (?)")
          .run(SCHEMA_VERSION);
      } else if (row.version !== SCHEMA_VERSION) {
        throw new Error(
          `Unsupported SQLite index schema ${row.version}; expected ${SCHEMA_VERSION}`,
        );
      }
    });
  }

  #transaction(operation: () => void): void {
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      operation();
      this.#database.exec("COMMIT");
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }
}

function toDocument(row: DocumentRow): KnowledgeDocument {
  return {
    id: row.id,
    ...(row.type === null ? {} : { type: row.type }),
    metadata: deserialize(row.metadata),
    source: {
      sourceId: row.source_id,
      path: row.path,
      ...(row.revision === null ? {} : { revision: row.revision }),
      ...(row.repository === null ? {} : { repository: row.repository }),
    },
    content: row.content,
    headings: deserialize(row.headings),
    links: deserialize(row.links),
    references: deserialize(row.references_),
  };
}

function titleOf(document: KnowledgeDocument): string {
  const title = document.metadata.title;
  if (typeof title === "string") return title;
  return document.headings[0]?.text ?? "";
}

function serialize(value: unknown): string {
  const result = JSON.stringify(value);
  if (result === undefined)
    throw new TypeError("Index data must be JSON serializable");
  return result;
}

function deserialize<T>(value: string): T {
  return JSON.parse(value) as T;
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
