import { describe, expect, test } from "vitest";
import type { DocType } from "@dokkurator/doctype";
import { validateDocument } from "../src/index.js";

const docType: DocType = {
  name: "example",
  requiredFields: ["title", "status"],
};

describe("validateDocument", () => {
  test("reports missing fields in declaration order", () => {
    expect(validateDocument(docType, { title: "Example" })).toEqual({
      valid: false,
      missingFields: ["status"],
    });
    expect(validateDocument(docType, {})).toEqual({
      valid: false,
      missingFields: ["title", "status"],
    });
  });
  test("accepts present fields, including empty or falsy values", () => {
    for (const status of [false, 0, "", null, undefined]) {
      expect(validateDocument(docType, { title: "Example", status })).toEqual({
        valid: true,
        missingFields: [],
      });
    }
  });
  test("does not count inherited properties", () => {
    expect(
      validateDocument({ name: "example", requiredFields: ["toString"] }, {}),
    ).toEqual({ valid: false, missingFields: ["toString"] });
  });
  test("accepts a type without required fields", () => {
    expect(validateDocument({ name: "empty", requiredFields: [] }, {})).toEqual(
      { valid: true, missingFields: [] },
    );
  });
});
