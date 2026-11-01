import type { SQLiteIndex } from "@dokkurator/knowledge";
import type { ApplicationContext } from "./application-context.js";
import type {
  DiffSourceResult,
  DocTypesSourceResult,
  DokkuratorApp,
  DokkuratorOptions,
  DocumentsSourceResult,
  OpenResult,
  PrepareSourceResult,
  SearchOptions,
  SourceOperationResult,
  SourceSelection,
  SyncSourceResult,
  ValidationSourceResult,
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
  #context?: ApplicationContext;
  #index?: SQLiteIndex;
  #indexOpening?: Promise<SQLiteIndex>;
  readonly #operations = new Set<Promise<unknown>>();
  #openResult?: OpenResult;

  constructor({ root }: DokkuratorOptions) {
    this.#root = root;
  }

  async loadFormatter(name?: string) {
    const { loadValidationFormatter } = await import("./reporting.js");
    return loadValidationFormatter(name);
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
      this.#run(async (context) => {
        const { prepareSources } = await import("./index-use-cases.js");
        return prepareSources(await this.#indexed(context), options);
      }),
    );
  }

  async sync(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<SyncSourceResult>> {
    return this.#mutate(() =>
      this.#run(async (context) => {
        const { syncSources } = await import("./index-use-cases.js");
        return syncSources(await this.#indexed(context), options);
      }),
    );
  }

  async diff(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<DiffSourceResult>> {
    return this.#run(async (context) => {
      const { diffSources } = await import("./index-use-cases.js");
      return diffSources(await this.#indexed(context), options);
    });
  }

  async search(query: string, options: SearchOptions = {}) {
    return this.#run(async (context) => {
      const { searchDocuments } = await import("./index-use-cases.js");
      return searchDocuments(await this.#indexed(context), query, options);
    });
  }

  async listDocTypes(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<DocTypesSourceResult>> {
    return this.#run(async (context) => {
      const { listProjectDocTypes } = await import("./document-use-cases.js");
      return listProjectDocTypes(context, options);
    });
  }

  async listDocuments(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<DocumentsSourceResult>> {
    return this.#run(async (context) => {
      const { listProjectDocuments } = await import("./document-use-cases.js");
      return listProjectDocuments(context, options);
    });
  }

  async validate(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<ValidationSourceResult>> {
    return this.#run(async (context) => {
      const { validateProjectDocuments } =
        await import("./validation-use-cases.js");
      return validateProjectDocuments(context, options);
    });
  }

  async #open(): Promise<OpenResult> {
    const { findProjectRoot, resolveProjectConfig } =
      await import("@dokkurator/config");
    const { sourceStatus } = await import("./source-operations.js");
    const root = findProjectRoot(this.#root);
    const project = await resolveProjectConfig({ root, defaultSource: true });
    const sources = await Promise.all(project.sources.map(sourceStatus));
    this.#context = { project };
    return { root: project.root, sources };
  }

  async #close(): Promise<void> {
    // Let all started operations finish before releasing their resources.
    await Promise.allSettled([
      ...this.#operations,
      ...(this.#activeMutation === undefined ? [] : [this.#activeMutation]),
    ]);
    this.#index?.close();
  }

  async #indexed(context: ApplicationContext) {
    this.#indexOpening ??= import("@dokkurator/knowledge").then(
      ({ SQLiteIndex }) => {
        const index = new SQLiteIndex({
          filename: context.project.knowledge.index,
        });
        this.#index = index;
        return index;
      },
    );
    try {
      return { ...context, index: await this.#indexOpening };
    } catch (error) {
      this.#indexOpening = undefined;
      throw error;
    }
  }

  async #run<T>(
    operation: (context: ApplicationContext) => Promise<T>,
  ): Promise<T> {
    const pending = operation(this.#opened());
    this.#operations.add(pending);
    try {
      return await pending;
    } finally {
      this.#operations.delete(pending);
    }
  }

  #opened(): ApplicationContext {
    if (this.#state !== "open" || !this.#context)
      throw new Error("Dokkurator application is not open");
    return this.#context;
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

  #reset(): void {
    this.#state = "closed";
    this.#context = undefined;
    this.#index = undefined;
    this.#indexOpening = undefined;
    this.#openResult = undefined;
    this.#closing = undefined;
  }
}
