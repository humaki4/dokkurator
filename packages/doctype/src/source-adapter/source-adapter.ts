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
  readonly sourceId: string;
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

export interface ReadOptions {
  /** Read a committed Git revision instead of the mutable working tree. */
  readonly revision?: string;
}

export interface SourceRevision {
  readonly id: string;
  readonly type: "git-commit" | "content-hash";
}

export interface SourceFileState {
  readonly path: string;
  readonly hash: string;
}

/** Serializable checkpoint returned by a source adapter. */
export interface SourceState {
  readonly sourceId: string;
  readonly revision: SourceRevision;
  readonly scope?: SourceDiffOptions;
  /** Required for sources without provider-managed revision history. */
  readonly files?: readonly SourceFileState[];
}

export interface SourceDiffOptions {
  readonly prefix?: SourceId;
  readonly excludeDirectories?: readonly SourceId[];
}

export type SourceChange =
  | { readonly type: "added"; readonly path: string; readonly hash: string }
  | {
      readonly type: "modified";
      readonly path: string;
      readonly previousHash: string;
      readonly hash: string;
    }
  | {
      readonly type: "deleted";
      readonly path: string;
      readonly previousHash: string;
    };

export interface SourceDiff {
  readonly sourceId: string;
  readonly fromRevision?: SourceRevision;
  readonly state: SourceState;
  readonly changes: readonly SourceChange[];
}

/** Minimal source contract accepted by document loading workflows. */
export interface DocumentSource {
  list(options?: ListOptions): Promise<SourceEntry[]>;
  read(id: SourceId, options?: ReadOptions): Promise<SourceDocument>;
}

/** Full source-adapter contract, including checkpoint-based change detection. */
export interface SourceAdapter extends DocumentSource {
  getSourceId(): Promise<string>;
  diff(
    previous?: SourceState,
    options?: SourceDiffOptions,
  ): Promise<SourceDiff>;
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
