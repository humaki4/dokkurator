/** Public API for loading parsed DocTypes and Markdown documents. */

export { loadDocType, loadDocTypes } from "./docTypes/index.js";
export type { ParsedDocType } from "./docTypes/index.js";

export {
  DEFAULT_DOCUMENTS_DIRECTORY,
  DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES,
  loadDocument,
  loadDocuments,
  isDocumentationFile,
} from "./documents/index.js";
export type {
  DocumentConfig,
  Heading,
  Link,
  ParsedDocument,
  Reference,
} from "./documents/index.js";

export {
  createLocalSource,
  createConfiguredSource,
  FileSystemSource,
  isGitRepositoryRoot,
  openConfiguredSource,
  prepareConfiguredSource,
  SourcePreparationRequiredError,
  updateConfiguredSource,
} from "./source-adapter/index.js";
export type {
  ConfiguredSourceLocation,
  DocumentSource,
  SourceAdapter,
  SourceChange,
  SourceDiff,
  SourceId,
  SourcePreparationReason,
  SourceState,
} from "./source-adapter/index.js";

/** @deprecated Temporary compatibility model for the unfinished Validator. */
export interface DocType {
  readonly name: string;
  readonly requiredFields: readonly string[];
}
