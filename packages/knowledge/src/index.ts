/** Public API for building and replacing a complete Knowledge index. */

export { indexDocuments } from "./index/index-documents.js";
export {
  parseSearchExpression,
  SearchQuerySyntaxError,
} from "./search/search-query.js";
export type {
  IndexDocumentsOptions,
  IndexDocumentsResult,
} from "./index/index-documents.js";

export type {
  DocumentId,
  KnowledgeDocument,
  KnowledgeIndex,
  KnowledgeQuery,
  SearchExpression,
  SearchHit,
  SearchQuery,
  SourceReference,
} from "./index-adapter/index.js";
export { SQLiteIndex, SCHEMA_VERSION } from "./index-adapter/sqlite/index.js";
export type { SQLiteIndexOptions } from "./index-adapter/sqlite/index.js";
