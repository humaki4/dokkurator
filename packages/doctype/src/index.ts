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

export { FileSystemSource, SourceNotFoundError } from "./source-adapter.js";
export type {
  FileSystemSourceOptions,
  ListOptions,
  SourceAdapter,
  SourceDocument,
  SourceEntry,
  SourceId,
  SourceMetadata,
} from "./source-adapter.js";

/** @deprecated Temporary compatibility model for the unfinished Validator. */
export interface DocType {
  readonly name: string;
  readonly requiredFields: readonly string[];
}
