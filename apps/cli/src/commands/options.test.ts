import { expect, test } from "vitest";
import { positiveInteger } from "./options.js";

test("parses positive integers", () => {
  expect(positiveInteger("42")).toBe(42);
});

test.each(["0", "-1", "text"])(
  "rejects invalid positive integer %s",
  (value) => {
    expect(() => positiveInteger(value)).toThrow("Expected a positive integer");
  },
);
