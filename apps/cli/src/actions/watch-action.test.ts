import type { ResolvedConfig } from "@dokkurator/config";
import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  syncSource: vi.fn(async () => ({
    indexedDocuments: 1,
    removedDocuments: 0,
  })),
  watchPaths: vi.fn(
    async (paths: readonly { onChange(): void | Promise<void> }[]) => {
      await paths[0]?.onChange();
    },
  ),
}));

vi.mock("../sync-source.js", () => ({ syncSource: mocks.syncSource }));
vi.mock("../watch-runtime.js", () => ({ watchPaths: mocks.watchPaths }));

import { watchSources } from "./watch-action.js";

beforeEach(() => vi.clearAllMocks());

test("initially syncs and watches resolved active sources", async () => {
  const root = "/project/docs";
  const active: ResolvedConfig = {
    root: "/project",
    repository: {
      documents: { directory: "docs", include: ["**/*.md"], exclude: [] },
      doctypes: { directory: "types" },
    },
    sources: [
      {
        id: "docs",
        root,
        documents: { directory: "docs", include: ["**/*.md"], exclude: [] },
        doctypes: { directory: "types" },
      },
    ],
    knowledge: { index: "/project/index.db" },
    watch: { debounce: 25 },
  };
  const output = vi.fn();

  await watchSources(active, output);

  expect(mocks.syncSource).toHaveBeenCalledTimes(2);
  expect(mocks.syncSource).toHaveBeenNthCalledWith(
    1,
    active.sources[0],
    active.knowledge.index,
    false,
  );
  expect(mocks.watchPaths).toHaveBeenCalledWith(
    [expect.objectContaining({ key: "docs", path: root })],
    25,
  );
  expect(output).toHaveBeenCalledWith("Watching docs...\n");
});
