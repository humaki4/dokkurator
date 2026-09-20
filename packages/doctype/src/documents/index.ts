import type { SourceAdapter, SourceId } from "../source-adapters/index.js";
import { parseDocument, parseDocuments } from "./parse.js";
import { readDocument, readDocuments } from "./read.js";
import type { DocumentConfig, ParsedDocument } from "./types.js";

export async function loadDocument(
  source: SourceAdapter,
  id: SourceId,
): Promise<ParsedDocument> {
  return parseDocument(await readDocument(source, id));
}

export async function loadDocuments(
  source: SourceAdapter,
  config: DocumentConfig = {},
): Promise<ParsedDocument[]> {
  return parseDocuments(await readDocuments(source, config));
}

export { DocumentParseError } from "./parse.js";
export {
  DEFAULT_DOCUMENTS_DIRECTORY,
  DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES,
} from "./types.js";
export type {
  DocumentConfig,
  Heading,
  Link,
  MarkdownDocument,
  ParsedDocument,
  Reference,
  SourcePosition,
} from "./types.js";
