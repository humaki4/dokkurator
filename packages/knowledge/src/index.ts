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
