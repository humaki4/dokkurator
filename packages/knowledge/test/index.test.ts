import { expect, test } from "vitest";
import { exampleDocType } from "../src/index.js";

test("provides the smoke-test document type", () => {
  expect(exampleDocType).toEqual({
    name: "example",
    requiredFields: ["title", "status"],
  });
});
