import type {
  Heading as MarkdownHeading,
  LinkReference as MarkdownLinkReference,
  Root,
} from "mdast";
import type {
  SourceId,
  SourceMetadata,
} from "../source-adapter/source-adapter.js";

export const DEFAULT_DOCUMENTS_DIRECTORY = "";
export const DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES = [
  ".git",
  ".dokkurator",
  ".nx",
  "node_modules",
  "dist",
] as const;

export interface DocumentParseOptions {
  /** Keep invalid frontmatter as diagnostics instead of throwing. Defaults to throw. */
  readonly parseErrors?: "throw" | "collect";
}

export interface DocumentConfig extends DocumentParseOptions {
  readonly documentsDirectory?: SourceId;
  readonly excludeDirectories?: readonly SourceId[];
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
}

export type MarkdownDocument = Root;
export type SourcePosition = NonNullable<Root["position"]>;

export interface DocumentParseDiagnostic {
  readonly phase: "parse";
  readonly code: string;
  readonly severity: "error";
  readonly message: string;
  readonly source: SourceMetadata;
  readonly position: SourcePosition;
}

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
  /** Complete source text, including frontmatter, BOM and original line endings. */
  readonly originalText: string;
  /** Markdown body; AST positions refer to originalText, not this substring. */
  readonly content: string;
  /** Invalid frontmatter never supplies partial metadata. */
  readonly parseDiagnostics: readonly DocumentParseDiagnostic[];
  readonly ast: MarkdownDocument;
  readonly headings: readonly Heading[];
  readonly links: readonly Link[];
  readonly references: readonly Reference[];
  readonly source: SourceMetadata;
}
