import type {
  ParsedDocType,
  ParsedDocument,
  SourceDiff,
} from "@dokkurator/loader";
import type { SearchHit } from "@dokkurator/knowledge";
import type { lint } from "@dokkurator/validator";

/** Location from which the nearest Dokkurator project is discovered. */
export interface DokkuratorOptions {
  readonly root: string;
}

/** Readiness observed without cloning or updating a configured source. */
export type OpenSourceStatus =
  | { readonly sourceId: string; readonly status: "ready" }
  | {
      readonly sourceId: string;
      readonly status: "preparation-required";
      readonly reason: "missing-checkout" | "missing-local-source";
    };

/** Project state made available by opening the application. */
export interface OpenResult {
  readonly root: string;
  readonly sources: readonly OpenSourceStatus[];
}

/** Optional restriction to one configured source. */
export interface SourceSelection {
  readonly sourceId?: string;
}

export type SourceOperationPhase =
  | "preparation"
  | "configuration"
  | "index"
  | "sync"
  | "diff"
  | "load"
  | "validation";

export type SourceRecovery =
  | "run-prepare"
  | "check-source"
  | "check-config"
  | "retry-index"
  | "retry-operation";

/** Structured failure for one source without aborting the remaining sources. */
export interface SourceOperationError {
  readonly sourceId: string;
  readonly phase: SourceOperationPhase;
  readonly message: string;
  readonly recovery: SourceRecovery;
}

/** Successful and failed source results from one application operation. */
export interface SourceOperationResult<T> {
  readonly results: readonly T[];
  readonly errors: readonly SourceOperationError[];
}

export interface PrepareSourceResult {
  readonly sourceId: string;
  readonly checkout: "created" | "existing" | "local";
  readonly index: "initialized" | "existing";
  readonly indexedDocuments: number;
  readonly removedDocuments: number;
}

export interface SyncSourceResult {
  readonly sourceId: string;
  readonly indexedDocuments: number;
  readonly removedDocuments: number;
  readonly diff: SourceDiff;
}

export interface DiffSourceResult {
  readonly sourceId: string;
  readonly diff: SourceDiff;
}

export interface DocTypesSourceResult {
  readonly sourceId: string;
  readonly doctypes: readonly ParsedDocType[];
}

export interface DocumentsSourceResult {
  readonly sourceId: string;
  readonly documents: readonly ParsedDocument[];
}

export interface ValidationSourceResult {
  readonly sourceId: string;
  readonly documents: readonly ({
    readonly path: string;
    readonly filePath: string;
  } & ReturnType<typeof lint>)[];
}

export interface SearchOptions extends SourceSelection {
  readonly limit?: number;
}

export interface ValidationFormatter {
  format(
    report: SourceOperationResult<ValidationSourceResult>,
  ): Promise<string>;
}

/** Reusable application lifecycle and supported application use-cases. */
export interface DokkuratorApp {
  open(): Promise<OpenResult>;
  loadFormatter(name?: string): Promise<ValidationFormatter>;
  validate(
    options?: SourceSelection,
  ): Promise<SourceOperationResult<ValidationSourceResult>>;
  prepare(
    options?: SourceSelection,
  ): Promise<SourceOperationResult<PrepareSourceResult>>;
  sync(
    options?: SourceSelection,
  ): Promise<SourceOperationResult<SyncSourceResult>>;
  diff(
    options?: SourceSelection,
  ): Promise<SourceOperationResult<DiffSourceResult>>;
  search(query: string, options?: SearchOptions): Promise<readonly SearchHit[]>;
  listDocTypes(
    options?: SourceSelection,
  ): Promise<SourceOperationResult<DocTypesSourceResult>>;
  listDocuments(
    options?: SourceSelection,
  ): Promise<SourceOperationResult<DocumentsSourceResult>>;
  close(): Promise<void>;
}
