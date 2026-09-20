import type {
  Heading as MarkdownHeading,
  LinkReference as MarkdownLinkReference,
  Root,
} from "mdast";
import type { SourceId, SourceMetadata } from "@dokkurator/source-adapters";

export const DEFAULT_DOCUMENTS_DIRECTORY = "";
export const DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES = [
  ".git",
  ".nx",
  "node_modules",
  "dist",
] as const;

export interface DocumentConfig {
  readonly documentsDirectory?: SourceId;
  readonly excludeDirectories?: readonly SourceId[];
}

export type MarkdownDocument = Root;
export type SourcePosition = NonNullable<Root["position"]>;

export interface Heading {
  readonly depth: MarkdownHeading["depth"];
  readonly text: string;
  readonly position?: SourcePosition;
}

export interface Link {
  readonly url: string;
  readonly text: string;
  readonly title?: string;
  readonly position?: SourcePosition;
}

export interface Reference {
  readonly identifier: string;
  readonly label?: string;
  readonly text: string;
  readonly referenceType: MarkdownLinkReference["referenceType"];
  readonly position?: SourcePosition;
}

export interface ParsedDocument {
  readonly type: string | undefined;
  readonly metadata: unknown;
  readonly content: string;
  readonly ast: MarkdownDocument;
  readonly headings: readonly Heading[];
  readonly links: readonly Link[];
  readonly references: readonly Reference[];
  readonly source: SourceMetadata;
}
