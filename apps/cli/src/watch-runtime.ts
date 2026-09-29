import { watch } from "node:fs";

export interface WatchHandle {
  close(): void;
}

export interface WatchRuntime {
  watchPath(path: string, onChange: () => void): WatchHandle;
  waitForStop(
    watchers: readonly WatchHandle[],
    timers: ReadonlyMap<string, NodeJS.Timeout>,
  ): Promise<void>;
}

export const defaultWatchRuntime: WatchRuntime = {
  watchPath: (path, onChange) => watch(path, { recursive: true }, onChange),
  waitForStop,
};

export interface WatchedPath {
  readonly key: string;
  readonly path: string;
  onChange(): void | Promise<void>;
}

export async function watchPaths(
  paths: readonly WatchedPath[],
  debounce: number,
  runtime: WatchRuntime = defaultWatchRuntime,
): Promise<void> {
  const timers = new Map<string, NodeJS.Timeout>();
  const watchers = paths.map((item) =>
    runtime.watchPath(item.path, () => {
      const pending = timers.get(item.key);
      if (pending !== undefined) clearTimeout(pending);
      timers.set(
        item.key,
        setTimeout(() => void item.onChange(), debounce),
      );
    }),
  );
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
