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

/** Reusable application lifecycle. Use-case methods are added incrementally. */
export interface DokkuratorApp {
  open(): Promise<OpenResult>;
  close(): Promise<void>;
}
