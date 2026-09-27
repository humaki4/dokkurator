import { watch, type FSWatcher } from "node:fs";
import {
  resolveSourcePath,
  type LoadedConfig,
  type SourceConfig,
} from "../config.js";
import { selectSources } from "../project.js";
import { syncSource } from "../sync-source.js";
import type { WriteOutput } from "../command.js";

export interface WatchOptions {
  readonly debounce: number;
  readonly documentsDirectory: string;
  readonly index: string;
}

export async function watchSources(
  loaded: LoadedConfig,
  sourceId: string | undefined,
  options: WatchOptions,
  writeOut: WriteOutput,
): Promise<void> {
  const selected = selectSources(loaded, sourceId);
  const synchronize = async (item: SourceConfig, updateRemote: boolean) => {
    const result = await syncSource(loaded, item, { ...options, updateRemote });
    writeOut(
      `${item.id}: ${result.indexedDocuments} indexed, ${result.removedDocuments} removed\n`,
    );
  };
  for (const item of selected) await synchronize(item, true);
  const timers = new Map<string, NodeJS.Timeout>();
  const watchers = selected.map((item) =>
    watch(resolveSourcePath(loaded, item), { recursive: true }, () => {
      const pending = timers.get(item.id);
      if (pending !== undefined) clearTimeout(pending);
      timers.set(
        item.id,
        setTimeout(() => void synchronize(item, false), options.debounce),
      );
    }),
  );
  writeOut(`Watching ${selected.map(({ id }) => id).join(", ")}...\n`);
  await waitForStop(watchers, timers);
}

async function waitForStop(
  watchers: readonly FSWatcher[],
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
