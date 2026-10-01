import {
  findProjectRoot,
  resolveProjectConfig,
  resolveSourceConfig,
  type ResolvedProjectConfig,
  type ResolvedProjectSource,
} from "@dokkurator/config";
import {
  calculateDocumentDiff,
  indexDocumentChanges,
  parseSearchExpression,
  SQLiteIndex,
} from "@dokkurator/knowledge";
import {
  loadDocTypes,
  loadDocuments,
  openConfiguredSource,
  prepareConfiguredSource,
  SourcePreparationRequiredError,
  updateConfiguredSource,
  type ConfiguredSourceLocation,
} from "@dokkurator/loader";
import type {
  DiffSourceResult,
  DocTypesSourceResult,
  DokkuratorApp,
  DokkuratorOptions,
  DocumentsSourceResult,
  OpenResult,
  OpenSourceStatus,
  PrepareSourceResult,
  SearchOptions,
  SourceOperationError,
  SourceOperationPhase,
  SourceOperationResult,
  SourceRecovery,
  SourceSelection,
  SyncSourceResult,
} from "./types.js";

/** Creates a closed application without filesystem or database access. */
export function createDokkurator(options: DokkuratorOptions): DokkuratorApp {
  return new DefaultDokkuratorApp(options);
}

type LifecycleState = "closed" | "opening" | "open" | "closing";

class DefaultDokkuratorApp implements DokkuratorApp {
  readonly #root: string;
  #state: LifecycleState = "closed";
  #opening?: Promise<OpenResult>;
  #closing?: Promise<void>;
  #activeMutation?: Promise<unknown>;
  #project?: ResolvedProjectConfig;
  #index?: SQLiteIndex;
  #openResult?: OpenResult;

  constructor({ root }: DokkuratorOptions) {
    this.#root = root;
  }

  async open(): Promise<OpenResult> {
    if (this.#state === "open") return this.#openResult!;
    if (this.#state === "opening") return this.#opening!;
    if (this.#state === "closing") {
      await this.#closing;
      return this.open();
    }

    this.#state = "opening";
    const opening = this.#open();
    this.#opening = opening;
    try {
      const result = await opening;
      this.#openResult = result;
      this.#state = "open";
      return result;
    } catch (error) {
      this.#reset();
      throw error;
    } finally {
      this.#opening = undefined;
    }
  }

  async close(): Promise<void> {
    if (this.#state === "closed") return;
    if (this.#state === "closing") return this.#closing;
    if (this.#state === "opening") {
      try {
        await this.#opening;
      } catch {
        return;
      }
      return this.close();
    }

    this.#state = "closing";
    const closing = this.#close();
    this.#closing = closing;
    try {
      await closing;
    } finally {
      this.#reset();
    }
  }

  async prepare(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<PrepareSourceResult>> {
    return this.#mutate(() =>
      this.#processSources(options, (source) => this.#prepareSource(source)),
    );
  }

  async sync(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<SyncSourceResult>> {
    return this.#mutate(() =>
      this.#processSources(options, (source) => this.#syncSource(source)),
    );
  }

  async diff(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<DiffSourceResult>> {
    return this.#processSources(options, async (source) => {
      const adapter = await stage("preparation", "run-prepare", () =>
        openConfiguredSource(source),
      );
      const resolved = await this.#resolveSource(source);
      const diff = await stage("diff", "retry-operation", () =>
        calculateDocumentDiff({
          source: adapter,
          index: this.#index!,
          documents: documentConfig(resolved),
        }),
      );
      return { sourceId: source.id, diff };
    });
  }

  async search(query: string, options: SearchOptions = {}) {
    const { index } = this.#opened();
    this.#selectSources(options);
    return index.search({
      expression: parseSearchExpression(query),
      sourceId: options.sourceId,
      limit: options.limit,
    });
  }

  async listDocTypes(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<DocTypesSourceResult>> {
    return this.#processSources(options, async (source) => {
      const adapter = await stage("preparation", "run-prepare", () =>
        openConfiguredSource(source),
      );
      const resolved = await this.#resolveSource(source);
      const doctypes = await stage("load", "retry-operation", () =>
        loadDocTypes(adapter, {
          doctypesDirectory: resolved.doctypes.directory,
        }),
      );
      return { sourceId: source.id, doctypes };
    });
  }

  async listDocuments(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<DocumentsSourceResult>> {
    return this.#processSources(options, async (source) => {
      const adapter = await stage("preparation", "run-prepare", () =>
        openConfiguredSource(source),
      );
      const resolved = await this.#resolveSource(source);
      const documents = await stage("load", "retry-operation", () =>
        loadDocuments(adapter, documentConfig(resolved)),
      );
      return { sourceId: source.id, documents };
    });
  }

  async #open(): Promise<OpenResult> {
    const root = findProjectRoot(this.#root);
    const project = await resolveProjectConfig({ root });
    const index = new SQLiteIndex({ filename: project.knowledge.index });
    try {
      const sources = await Promise.all(
        project.sources.map((source) => sourceStatus(source)),
      );
      this.#index = index;
      this.#project = project;
      return { root: project.root, sources };
    } catch (error) {
      index.close();
      throw error;
    }
  }

  async #close(): Promise<void> {
    try {
      await this.#activeMutation;
    } catch {
      // The operation reports its own failures; cleanup must still continue.
    }
    this.#index?.close();
  }

  #reset(): void {
    this.#state = "closed";
    this.#project = undefined;
    this.#index = undefined;
    this.#openResult = undefined;
    this.#closing = undefined;
  }

  async #prepareSource(
    source: ResolvedProjectSource,
  ): Promise<PrepareSourceResult> {
    let checkout: PrepareSourceResult["checkout"] =
      source.remote === undefined ? "local" : "existing";
    try {
      await openConfiguredSource(source);
    } catch (error) {
      if (!(error instanceof SourcePreparationRequiredError)) throw error;
      checkout = source.remote === undefined ? "local" : "created";
    }
    const adapter = await stage("preparation", "check-source", () =>
      prepareConfiguredSource(source),
    );
    const resolved = await this.#resolveSource(source);
    const previous = await stage("index", "retry-index", () =>
      this.#index!.getSourceState(source.id),
    );
    if (previous !== undefined)
      return {
        sourceId: source.id,
        checkout,
        index: "existing",
        indexedDocuments: 0,
        removedDocuments: 0,
      };
    const result = await stage("index", "retry-index", () =>
      indexDocumentChanges({
        source: adapter,
        index: this.#index!,
        documents: documentConfig(resolved),
      }),
    );
    return {
      sourceId: source.id,
      checkout,
      index: "initialized",
      indexedDocuments: result.indexedDocuments,
      removedDocuments: result.removedDocuments,
    };
  }

  async #syncSource(source: ResolvedProjectSource): Promise<SyncSourceResult> {
    const adapter = await stage("sync", "run-prepare", () =>
      updateConfiguredSource(source),
    );
    const resolved = await this.#resolveSource(source);
    const result = await stage("index", "retry-index", () =>
      indexDocumentChanges({
        source: adapter,
        index: this.#index!,
        documents: documentConfig(resolved),
      }),
    );
    return { sourceId: source.id, ...result };
  }

  async #resolveSource(source: ResolvedProjectSource) {
    return stage("configuration", "check-config", () =>
      resolveSourceConfig(this.#project!, source),
    );
  }

  async #processSources<T>(
    options: SourceSelection,
    operation: (source: ResolvedProjectSource) => Promise<T>,
  ): Promise<SourceOperationResult<T>> {
    this.#opened();
    const results: T[] = [];
    const errors: SourceOperationError[] = [];
    for (const source of this.#selectSources(options)) {
      try {
        results.push(await operation(source));
      } catch (error) {
        errors.push(toSourceError(source.id, error));
      }
    }
    return { results, errors };
  }

  #selectSources({
    sourceId,
  }: SourceSelection): readonly ResolvedProjectSource[] {
    const { project } = this.#opened();
    if (sourceId === undefined) return project.sources;
    const source = project.sources.find(({ id }) => id === sourceId);
    if (source === undefined) throw new Error(`Unknown source: ${sourceId}`);
    return [source];
  }

  #opened(): { project: ResolvedProjectConfig; index: SQLiteIndex } {
    if (this.#state !== "open" || !this.#project || !this.#index)
      throw new Error("Dokkurator application is not open");
    return { project: this.#project, index: this.#index };
  }

  async #mutate<T>(operation: () => Promise<T>): Promise<T> {
    this.#opened();
    if (this.#activeMutation !== undefined)
      throw new Error(
        "Another mutating Dokkurator operation is already running",
      );
    const active = operation();
    this.#activeMutation = active;
    try {
      return await active;
    } finally {
      this.#activeMutation = undefined;
    }
  }
}

class SourceStageError extends Error {
  constructor(
    readonly phase: SourceOperationPhase,
    readonly recovery: SourceRecovery,
    options: ErrorOptions,
  ) {
    super(errorMessage(options.cause), options);
  }
}

async function stage<T>(
  phase: SourceOperationPhase,
  recovery: SourceRecovery,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new SourceStageError(phase, recovery, { cause: error });
  }
}

function toSourceError(sourceId: string, error: unknown): SourceOperationError {
  if (error instanceof SourceStageError)
    return {
      sourceId,
      phase: error.phase,
      message: error.message,
      recovery: error.recovery,
    };
  return {
    sourceId,
    phase: "preparation",
    message: errorMessage(error),
    recovery: "retry-operation",
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function documentConfig(source: {
  readonly documents: {
    readonly directory: string;
    readonly include: readonly string[];
    readonly exclude: readonly string[];
  };
}) {
  return {
    documentsDirectory: source.documents.directory,
    include: source.documents.include,
    exclude: source.documents.exclude,
  };
}

async function sourceStatus(
  source: ConfiguredSourceLocation,
): Promise<OpenSourceStatus> {
  try {
    await openConfiguredSource(source);
    return { sourceId: source.id, status: "ready" };
  } catch (error) {
    if (error instanceof SourcePreparationRequiredError)
      return {
        sourceId: error.sourceId,
        status: "preparation-required",
        reason: error.reason,
      };
    throw error;
  }
}
