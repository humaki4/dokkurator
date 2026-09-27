import type {
  DocumentSource,
  SourceId,
} from "../source-adapter/source-adapter.js";
import { parseDocType, parseDocTypes } from "./parse.js";
import { readDocType, readDocTypes } from "./read.js";
import type { DocTypeConfig, ParsedDocType } from "./types.js";

export async function loadDocType(
  source: DocumentSource,
  directory: SourceId,
): Promise<ParsedDocType> {
  return parseDocType(await readDocType(source, directory));
}

export async function loadDocTypes(
  source: DocumentSource,
  config: DocTypeConfig = {},
): Promise<ParsedDocType[]> {
  return parseDocTypes(await readDocTypes(source, config));
}

export { DocTypeParseError } from "./parse.js";
export { DEFAULT_DOCTYPES_DIRECTORY } from "./types.js";
export type {
  DocTypeConfig,
  MetadataDefinition,
  ParsedDocType,
  RuleDefinition,
  StructureDefinition,
} from "./types.js";
