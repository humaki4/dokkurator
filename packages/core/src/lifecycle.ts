import { findProjectRoot, resolveProjectConfig } from "@dokkurator/config";
import { SQLiteIndex } from "@dokkurator/knowledge";
import { sourceStatus } from "./source-operations.js";
import {
  diffSources,
  listProjectDocTypes,
  listProjectDocuments,
  prepareSources,
  searchDocuments,
  syncSources,
  type ApplicationContext,
} from "./use-cases.js";
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
    return this.#mutate(() => prepareSources(this.#opened(), options));
  }

  async sync(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<SyncSourceResult>> {
    return this.#mutate(() => syncSources(this.#opened(), options));
  }

  async diff(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<DiffSourceResult>> {
    return diffSources(this.#opened(), options);
  }

  async search(query: string, options: SearchOptions = {}) {
    return searchDocuments(this.#opened(), query, options);
  }

  async listDocTypes(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<DocTypesSourceResult>> {
    return listProjectDocTypes(this.#opened(), options);
  }

  async listDocuments(
    options: SourceSelection = {},
  ): Promise<SourceOperationResult<DocumentsSourceResult>> {
    return listProjectDocuments(this.#opened(), options);
  }

  async #open(): Promise<OpenResult> {
    const root = findProjectRoot(this.#root);
    const project = await resolveProjectConfig({ root });
    const index = new SQLiteIndex({ filename: project.knowledge.index });
    try {
      const sources = await Promise.all(project.sources.map(sourceStatus));
      this.#index = index;
      this.#context = { project, index };
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
    this.#openResult = undefined;
    this.#closing = undefined;
  }
}
