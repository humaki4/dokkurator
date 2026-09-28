import { describe, expect, test } from "vitest";
import { validateConfig } from "./validation.js";

describe("validateConfig", () => {
  test("accepts and preserves a complete workspace configuration", () => {
    const value = {
      version: 1,
      documents: {
        directory: "docs",
        include: ["**/*.md"],
        exclude: ["drafts/**"],
      },
      doctypes: { directory: "types" },
      knowledge: { index: ".cache/index.db" },
      checkouts: { directory: ".cache/checkouts" },
      watch: { debounce: 250 },
      sources: [
        { id: "local.docs", path: "../docs" },
        {
          id: "remote-docs",
          remote: { url: "git@example.test:docs.git", branch: "main" },
          config: {
            documents: { directory: "published", exclude: ["private/**"] },
          },
        },
      ],
    } as const;
    expect(validateConfig(value)).toEqual(value);
  });

  test("supplies an empty source list when omitted", () => {
    expect(validateConfig({ version: 1 })).toEqual({ version: 1, sources: [] });
  });

  test.each([
    [null, "config must be an object"],
    [[], "config must be an object"],
    [{ version: 2 }, "Config version must be 1"],
    [{ documents: [] }, "documents must be an object"],
    [
      { documents: { directory: "" } },
      "documents.directory must be a non-empty string",
    ],
    [
      { documents: { include: "**/*.md" } },
      "documents.include must be an array of strings",
    ],
    [
      { documents: { include: [""] } },
      "documents.include must be an array of strings",
    ],
    [
      { documents: { exclude: [1] } },
      "documents.exclude must be an array of strings",
    ],
    [
      { doctypes: { directory: 1 } },
      "doctypes.directory must be a non-empty string",
    ],
    [
      { knowledge: { index: "" } },
      "knowledge.index must be a non-empty string",
    ],
    [
      { checkouts: { directory: false } },
      "checkouts.directory must be a non-empty string",
    ],
    [{ watch: { debounce: 0 } }, "watch.debounce must be a positive integer"],
    [{ watch: { debounce: 1.5 } }, "watch.debounce must be a positive integer"],
    [{ sources: {} }, "sources must be an array"],
    [{ sources: [null] }, "sources[0] must be an object"],
    [{ sources: [{ id: "bad id", path: "." }] }, "sources[0].id must be safe"],
    [
      { sources: [{ id: "docs", path: "" }] },
      "sources[0].path must be a non-empty string",
    ],
    [{ sources: [{ id: "docs" }] }, "Source docs requires path or remote"],
    [
      { sources: [{ id: "docs", remote: [] }] },
      "sources[0].remote must be an object",
    ],
    [
      { sources: [{ id: "docs", remote: {} }] },
      "remote.url must be a non-empty string",
    ],
    [
      { sources: [{ id: "docs", remote: { url: "x", branch: "" } }] },
      "remote.branch must be a non-empty string",
    ],
    [
      { sources: [{ id: "docs", path: ".", config: [] }] },
      "sources[0].config must be an object",
    ],
    [
      {
        sources: [
          { id: "docs", path: "." },
          { id: "docs", path: ".." },
        ],
      },
      "Duplicate source id: docs",
    ],
  ])("rejects invalid input %#", (value, message) => {
    expect(() => validateConfig(value)).toThrow(message);
  });
});
