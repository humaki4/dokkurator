import type { SourceAdapter, SourceId } from "../source-adapter.js";
import { parseDocType, parseDocTypes } from "./parse.js";
import { readDocType, readDocTypes } from "./read.js";
import type { DocTypeConfig, ParsedDocType } from "./types.js";

export async function loadDocType(
  source: SourceAdapter,
  directory: SourceId,
): Promise<ParsedDocType> {
  return parseDocType(await readDocType(source, directory));
}

export async function loadDocTypes(
  source: SourceAdapter,
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
