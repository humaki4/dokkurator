import { watch } from "node:fs";
import {
  DEFAULT_CONFIG,
  resolveSourcePath,
  type LoadedConfig,
  type SourceConfig,
} from "@dokkurator/config";
import { selectSources } from "../project.js";
import { syncSource } from "../sync-source.js";
import type { WriteOutput } from "../command.js";

export interface WatchOptions {
  readonly debounce?: number;
  readonly documentsDirectory?: string;
  readonly index?: string;
}

export interface WatchHandle {
  close(): void;
}

export interface WatchRuntime {
  sync: typeof syncSource;
  watchPath(path: string, onChange: () => void): WatchHandle;
  waitForStop(
    watchers: readonly WatchHandle[],
    timers: ReadonlyMap<string, NodeJS.Timeout>,
  ): Promise<void>;
}

const defaultRuntime: WatchRuntime = {
  sync: syncSource,
  watchPath: (path, onChange) => watch(path, { recursive: true }, onChange),
  waitForStop,
};

export async function watchSources(
  loaded: LoadedConfig,
  sourceId: string | undefined,
  options: WatchOptions,
  writeOut: WriteOutput,
  runtime: WatchRuntime = defaultRuntime,
): Promise<void> {
  const selected = selectSources(loaded, sourceId);
  const debounce =
    options.debounce ??
    loaded.config.watch?.debounce ??
    DEFAULT_CONFIG.watch.debounce;
  const synchronize = async (item: SourceConfig, updateRemote: boolean) => {
    const result = await runtime.sync(loaded, item, {
      ...options,
      updateRemote,
    });
    writeOut(
      `${item.id}: ${result.indexedDocuments} indexed, ${result.removedDocuments} removed\n`,
    );
  };
  for (const item of selected) await synchronize(item, true);
  const timers = new Map<string, NodeJS.Timeout>();
  const watchers = selected.map((item) =>
    runtime.watchPath(resolveSourcePath(loaded, item), () => {
      const pending = timers.get(item.id);
      if (pending !== undefined) clearTimeout(pending);
      timers.set(
        item.id,
        setTimeout(() => void synchronize(item, false), debounce),
      );
    }),
  );
  writeOut(`Watching ${selected.map(({ id }) => id).join(", ")}...\n`);
  await runtime.waitForStop(watchers, timers);
}

async function waitForStop(
  watchers: readonly WatchHandle[],
  timers: ReadonlyMap<string, NodeJS.Timeout>,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const stop = () => {
      for (const watcher of watchers) watcher.close();
      for (const timer of timers.values()) clearTimeout(timer);
      resolve();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}
