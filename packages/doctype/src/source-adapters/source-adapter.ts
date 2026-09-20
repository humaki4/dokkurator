export type SourceId = string;

export type GitFileStatus =
  | "clean"
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "untracked"
  | "conflicted";

export interface SourceAuthor {
  readonly name?: string;
  readonly email?: string;
}

export interface GitSourceMetadata {
  readonly root: string;
  readonly headRevision?: string;
  readonly branch?: string;
  readonly fileRevision?: string;
  readonly status: GitFileStatus;
  readonly committedAt?: Date;
  readonly author?: SourceAuthor;
}

export interface SourceMetadata {
  readonly kind: "filesystem" | "git" | "gitlab" | "github";
  readonly path: string;
  readonly repository?: string;
  readonly git?: GitSourceMetadata;
}

export interface SourceEntry {
  readonly id: SourceId;
  readonly path: string;
  readonly source: SourceMetadata;
}

export interface SourceDocument extends SourceEntry {
  readonly content: string;
}

export interface ListOptions {
  readonly prefix?: SourceId;
}

export interface SourceAdapter {
  list(options?: ListOptions): Promise<SourceEntry[]>;
  read(id: SourceId): Promise<SourceDocument>;
}

export class SourceNotFoundError extends Error {
  constructor(
    readonly sourceId: SourceId,
    options?: ErrorOptions,
  ) {
    super(`Source not found: ${sourceId}`, options);
    this.name = "SourceNotFoundError";
  }
}
