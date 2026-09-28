/** Public API for loading parsed DocTypes and Markdown documents. */

export {
  DEFAULT_DOCTYPES_DIRECTORY,
  DocTypeParseError,
  loadDocType,
  loadDocTypes,
} from "./docTypes/index.js";
export type {
  DocTypeConfig,
  MetadataDefinition,
  ParsedDocType,
  RuleDefinition,
  StructureDefinition,
} from "./docTypes/index.js";

export {
  DEFAULT_DOCUMENTS_DIRECTORY,
  DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES,
  DocumentParseError,
  loadDocument,
  loadDocuments,
  isDocumentationFile,
} from "./documents/index.js";
export type {
  DocumentConfig,
  Heading,
  Link,
  MarkdownDocument,
  ParsedDocument,
  Reference,
  SourcePosition,
} from "./documents/index.js";

export {
  createLocalSource,
  createConfiguredLocalSource,
  createConfiguredSource,
  createGitCheckoutSource,
  FileSystemSource,
  GitSource,
  SourceNotFoundError,
} from "./source-adapter/index.js";
export type {
  DocumentSource,
  FileSystemSourceOptions,
  GitFileStatus,
  GitSourceMetadata,
  GitSourceOptions,
  GitCheckoutOptions,
  LocalSourceOptions,
  ListOptions,
  ReadOptions,
  SourceAdapter,
  SourceAuthor,
  SourceChange,
  SourceDiff,
  SourceDiffOptions,
  SourceDocument,
  SourceEntry,
  SourceFileState,
  SourceId,
  SourceMetadata,
  SourceRevision,
  SourceState,
} from "./source-adapter/index.js";

/** @deprecated Temporary compatibility model for the unfinished Validator. */
export interface DocType {
  readonly name: string;
  readonly requiredFields: readonly string[];
}
