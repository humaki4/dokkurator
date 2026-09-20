import type { Heading, Link, Reference } from "@dokkurator/doctype";

export type DocumentId = string;
export type EntityId = string;

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
  readonly entities: readonly Entity[];
  readonly relations: readonly Relation[];
}

export interface Entity {
  readonly id: EntityId;
  readonly type: string;
  readonly key: string;
  readonly name?: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface EntityReference {
  readonly id: EntityId;
  readonly type?: string;
}

export interface Relation {
  readonly from: EntityReference;
  readonly type: string;
  readonly to: EntityReference;
}
