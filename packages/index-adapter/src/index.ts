import type { KnowledgeDocument } from "./model.js";

export type {
  DocumentId,
  KnowledgeDocument,
  SourceReference,
} from "./model.js";

export interface KnowledgeQuery {
  readonly type?: string;
  readonly sourceId?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export type SearchExpression =
  | {
      readonly type: "term";
      readonly value: string;
      readonly metadataKey?: string;
    }
  | {
      readonly type: "and" | "or";
      readonly operands: readonly SearchExpression[];
    };

export interface SearchQuery {
  /** Structured search expression. Prefer this for new callers. */
  readonly expression?: SearchExpression;
  /** Backwards-compatible shorthand for an AND search across all fields. */
  readonly text?: string;
  readonly types?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
}

export interface SearchHit {
  readonly document: KnowledgeDocument;
  /** Backend-independent relevance score. Higher values rank first. */
  readonly rank: number;
  readonly snippet: string;
}

export interface KnowledgeIndex {
  replaceAll(documents: readonly KnowledgeDocument[]): Promise<void>;
  upsert(document: KnowledgeDocument): Promise<void>;
  remove(id: string): Promise<void>;
  get(id: string): Promise<KnowledgeDocument | undefined>;
  query(query?: KnowledgeQuery): Promise<readonly KnowledgeDocument[]>;
  search(query: SearchQuery): Promise<readonly SearchHit[]>;
  clear(): Promise<void>;
}
