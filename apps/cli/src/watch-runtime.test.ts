import { afterEach, expect, test, vi } from "vitest";
import { watchPaths, type WatchRuntime } from "./watch-runtime.js";

afterEach(() => vi.useRealTimers());

test("debounces changes and closes watchers", async () => {
  vi.useFakeTimers();
  let change: (() => void) | undefined;
  const close = vi.fn();
  const onChange = vi.fn();
  const runtime: WatchRuntime = {
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

  await watchPaths([{ key: "docs", path: "/docs", onChange }], 25, runtime);

  expect(onChange).toHaveBeenCalledOnce();
  expect(runtime.watchPath).toHaveBeenCalledWith("/docs", expect.any(Function));
  expect(close).toHaveBeenCalledOnce();
});
