import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LoadedConfig } from "@dokkurator/config";
import { afterEach, expect, test, vi } from "vitest";
import { watchSources, type WatchRuntime } from "./watch-action.js";

afterEach(() => vi.useRealTimers());

test("initially syncs, debounces changes and closes watchers", async () => {
  vi.useFakeTimers();
  const root = await mkdtemp(join(tmpdir(), "dokkurator-watch-"));
  const loaded: LoadedConfig = {
    projectRoot: root,
    filename: join(root, ".dokkurator", "config.yaml"),
    config: { watch: { debounce: 25 }, sources: [{ id: "docs", path: "." }] },
  };
  let change: (() => void) | undefined;
  const close = vi.fn();
  const sync = vi.fn<WatchRuntime["sync"]>(async () => ({
    indexedDocuments: 1,
    removedDocuments: 0,
  }));
  const runtime: WatchRuntime = {
    sync,
    watchPath: vi.fn((_path, listener) => {
      change = listener;
      return { close };
    }),
    waitForStop: async (watchers) => {
      change?.();
      change?.();
      await vi.advanceTimersByTimeAsync(25);
      for (const watcher of watchers) watcher.close();
    },
  };
  const output = vi.fn<(text: string) => void>();

  await watchSources(loaded, undefined, {}, output, runtime);

  expect(sync).toHaveBeenCalledTimes(2);
  expect(sync.mock.calls[0]?.[2]).toMatchObject({ updateRemote: true });
  expect(sync.mock.calls[1]?.[2]).toMatchObject({ updateRemote: false });
  expect(runtime.watchPath).toHaveBeenCalledWith(root, expect.any(Function));
  expect(output).toHaveBeenCalledWith("Watching docs...\n");
  expect(close).toHaveBeenCalledOnce();
});

test("rejects an unknown selected source before starting watchers", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-watch-"));
  const loaded: LoadedConfig = {
    projectRoot: root,
    filename: join(root, ".dokkurator", "config.yaml"),
    config: { sources: [{ id: "docs", path: "." }] },
  };
  const runtime: WatchRuntime = {
    sync: vi.fn(),
    watchPath: vi.fn(),
    waitForStop: vi.fn(),
  };
  await expect(
    watchSources(loaded, "missing", {}, vi.fn(), runtime),
  ).rejects.toThrow("Unknown source: missing");
  expect(runtime.sync).not.toHaveBeenCalled();
});
