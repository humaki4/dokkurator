import { findProjectRoot, resolveProjectConfig } from "@dokkurator/config";
import { SQLiteIndex } from "@dokkurator/knowledge";
import {
  openConfiguredSource,
  SourcePreparationRequiredError,
  type ConfiguredSourceLocation,
} from "@dokkurator/loader";
import type {
  DokkuratorApp,
  DokkuratorOptions,
  OpenResult,
  OpenSourceStatus,
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

  async #open(): Promise<OpenResult> {
    const root = findProjectRoot(this.#root);
    const project = await resolveProjectConfig({ root });
    const index = new SQLiteIndex({ filename: project.knowledge.index });
    try {
      const sources = await Promise.all(
        project.sources.map((source) => sourceStatus(source)),
      );
      this.#index = index;
      return { root: project.root, sources };
    } catch (error) {
      index.close();
      throw error;
    }
  }

  async #close(): Promise<void> {
    this.#index?.close();
  }

  #reset(): void {
    this.#state = "closed";
    this.#index = undefined;
    this.#openResult = undefined;
    this.#closing = undefined;
  }
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
