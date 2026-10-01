import type { Heading, Link, Reference } from "@dokkurator/loader";

export type DocumentId = string;

export interface SourceReference {
  readonly sourceId: string;
  readonly path: string;
  readonly revision?: string;
  readonly repository?: string;
}

export interface KnowledgeDocument {
  readonly id: DocumentId;
  readonly type?: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly source: SourceReference;
  readonly content: string;
  readonly headings: readonly Heading[];
  readonly links: readonly Link[];
  readonly references: readonly Reference[];
}
