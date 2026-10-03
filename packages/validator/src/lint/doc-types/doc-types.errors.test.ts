import { type ParsedDocType } from "@dokkurator/loader";
import { describe, expect, test } from "vitest";
import {
  LintConfigurationError,
  prepareLintConfiguration,
} from "../../index.js";

function docType(
  metadata: ParsedDocType["metadata"] = { type: "object" },
  name = "decision",
): ParsedDocType {
  return { name, metadata, rules: [] };
}

const schemaId = "https://schemas.example/decision.json";

describe("DocType preparation errors", () => {
  test.each([
    { type: "not-a-json-schema-type" },
    { type: "string", format: "not-a-format" },
    { unknownKeyword: true },
    { $ref: "https://schemas.example/not-loaded.json" },
    { $schema: "https://json-schema.org/draft/2020-12/schema", type: "object" },
    { $async: true, type: "object" },
    { $id: "relative.json", type: "object" },
    { $id: "https://schemas.example/schema.json#fragment", type: "object" },
  ])(
    "rejects invalid or unresolved schemas before rule execution: %j",
    (schema) => {
      expect(() =>
        prepareLintConfiguration({ docTypes: [docType(schema)] }),
      ).toThrow(LintConfigurationError);
    },
  );
  test("also compiles unused supplied resources", () => {
    expect(() =>
      prepareLintConfiguration({
        docTypes: [docType()],
        schemas: {
          "https://schemas.example/unused.json": { $ref: "missing.json" },
        },
      }),
    ).toThrow(LintConfigurationError);
  });
  test("rejects conflicting identities and legacy rule definitions", () => {
    expect(() =>
      prepareLintConfiguration({ docTypes: [docType(), docType()] }),
    ).toThrow(LintConfigurationError);
    expect(() =>
      prepareLintConfiguration({
        docTypes: [
          docType({ $id: schemaId }),
          docType({ $id: schemaId }, "guide"),
        ],
      }),
    ).toThrow(LintConfigurationError);
    expect(() =>
      prepareLintConfiguration({
        docTypes: [],
        schemas: { [schemaId]: { $id: "https://schemas.example/other.json" } },
      }),
    ).toThrow(LintConfigurationError);
    expect(() =>
      prepareLintConfiguration({
        docTypes: [
          {
            ...docType(),
            rules: [{ name: "required", field: "title", severity: "error" }],
          },
        ],
      }),
    ).toThrow(LintConfigurationError);
  });
});
