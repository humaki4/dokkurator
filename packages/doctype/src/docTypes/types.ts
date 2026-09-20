import type { SourceDocument, SourceId } from "../source-adapter.js";

export const DEFAULT_DOCTYPES_DIRECTORY = "_dokkurator/.doctypes";

export interface DocTypeConfig {
  readonly doctypesDirectory?: SourceId;
}

export interface LoadedDocType {
  readonly directory: SourceId;
  readonly definition: SourceDocument;
  readonly template?: SourceDocument;
  readonly rules?: SourceDocument;
}

export type MetadataDefinition = Readonly<Record<string, unknown>>;

export interface StructureDefinition {
  readonly requiredHeadings?: readonly string[];
}

export interface RuleDefinition {
  readonly name: string;
  readonly field: string;
  readonly severity: "error" | "warning";
}

export interface ParsedDocType {
  readonly name: string;
  readonly description?: string;
  readonly metadata: MetadataDefinition;
  readonly structure?: StructureDefinition;
  readonly rules: readonly RuleDefinition[];
}
