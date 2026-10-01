import { expect, test, vi } from "vitest";
import { searchKnowledge } from "./search.js";

test("parses raw query syntax before delegating to the index", async () => {
  const search = vi.fn(async () => []);

  await searchKnowledge({ search }, 'title:"Access tokens" AND oauth', {
    sourceId: "docs",
    limit: 5,
  });

  expect(search).toHaveBeenCalledWith({
    expression: {
      type: "and",
      operands: [
        { type: "term", metadataKey: "title", value: "Access tokens" },
        { type: "term", value: "oauth" },
      ],
    },
    sourceId: "docs",
    limit: 5,
  });
});
