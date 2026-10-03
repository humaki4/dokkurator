import type { ResolvedProjectConfig } from "@dokkurator/config";
import type { DokkuratorApp } from "@dokkurator/core";
import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sync: vi.fn(async () => ({
    results: [
      {
        sourceId: "docs",
        indexedDocuments: 1,
        removedDocuments: 0,
      },
    ],
    errors: [],
  })),
  watchPaths: vi.fn(
    async (paths: readonly { onChange(): void | Promise<void> }[]) => {
      await paths[0]?.onChange();
    },
  ),
}));

vi.mock("../watch-runtime.js", () => ({ watchPaths: mocks.watchPaths }));

import { watchSources } from "./watch-action.js";

beforeEach(() => vi.clearAllMocks());

test("initially syncs and watches project sources through Core", async () => {
  const root = "/project/docs";
  const project: ResolvedProjectConfig = {
    root: "/project",
    repository: {
      documents: { directory: "docs", include: ["**/*.md"], exclude: [] },
      doctypes: { directory: "types" },
      validator: { plugins: {}, rules: {} },
    },
    sources: [{ id: "docs", root }],
    knowledge: { index: "/project/index.db" },
    watch: { debounce: 25 },
  };
  const app = { sync: mocks.sync } as unknown as DokkuratorApp;
  const output = vi.fn();

  await watchSources(app, project, output, vi.fn());

  expect(mocks.sync).toHaveBeenCalledTimes(2);
  expect(mocks.sync).toHaveBeenNthCalledWith(1, { sourceId: "docs" });
  expect(mocks.watchPaths).toHaveBeenCalledWith(
    [expect.objectContaining({ key: "docs", path: root })],
    25,
  );
  expect(output).toHaveBeenCalledWith("Watching docs...\n");
});
