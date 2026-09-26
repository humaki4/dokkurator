/** Public API for building and replacing a complete Knowledge index. */

export { indexDocuments } from "./index-documents.js";
export {
  parseSearchExpression,
  SearchQuerySyntaxError,
} from "./search-query.js";
export type {
  IndexDocumentsOptions,
  IndexDocumentsResult,
} from "./index-documents.js";
