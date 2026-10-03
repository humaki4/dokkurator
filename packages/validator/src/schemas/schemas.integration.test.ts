import {
  loadDocType,
  type DocumentSource,
  type ParsedDocType,
} from "@dokkurator/loader";
import { describe, expect, test } from "vitest";
import { prepareLintConfiguration } from "../index.js";

function docType(
  metadata: ParsedDocType["metadata"] = { type: "object" },
  name = "decision",
): ParsedDocType {
  return { name, metadata, rules: [] };
}

const schemaId = "https://schemas.example/decision.json";

const conditionalSchema = {
  $id: schemaId,
  type: "object",
  required: ["doctype", "title", "status"],
  properties: {
    doctype: { const: "decision" },
    title: { type: "string", minLength: 1 },
    status: { enum: ["draft", "accepted"] },
    acceptedAt: { type: "string", format: "date" },
  },
  if: { required: ["status"], properties: { status: { const: "accepted" } } },
  then: { required: ["acceptedAt"] },
};

describe("prepared metadata schemas", () => {
  test("compiles the actual schema from a YAML-loaded ParsedDocType", async () => {
    const source: DocumentSource = {
      list: async () => [],
      read: async (id) => ({
        id,
        path: id,
        content: id.endsWith("definition.yml")
          ? `name: decision\nmetadata: ${JSON.stringify(conditionalSchema)}\n`
          : id.endsWith("rules.yml")
            ? "rules: []\n"
            : "",
        source: { sourceId: "test", kind: "filesystem", path: id },
      }),
    };
    const loaded = await loadDocType(source, "types/decision");
    const prepared = prepareLintConfiguration({ docTypes: [loaded] });
    const selected = prepared.selectDocType({ doctype: "decision" });
    expect(selected.status).toBe("selected");
    if (selected.status !== "selected")
      throw new Error("Expected selected DocType");
    expect(selected.docType.schemaId).toBe(schemaId);
    expect(selected.docType.definition.metadata).toEqual(loaded.metadata);
    const validate = selected.docType.validateMetadata;
    expect(
      validate({ doctype: "decision", title: "Example", status: "draft" })
        .valid,
    ).toBe(true);
    const accepted = validate({
      doctype: "decision",
      title: "Example",
      status: "accepted",
    });
    expect(accepted.valid).toBe(false);
    expect(accepted.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keyword: "required",
          params: { missingProperty: "acceptedAt" },
        }),
      ]),
    );
    expect(
      validate({
        doctype: "decision",
        title: "Example",
        status: "accepted",
        acceptedAt: "2026-10-03",
      }).valid,
    ).toBe(true);
    expect(
      validate({
        doctype: "decision",
        title: "Example",
        status: "accepted",
        acceptedAt: "2026-02-30",
      }).valid,
    ).toBe(false);
  });
  test("does not coerce values, inject defaults, remove fields or reuse error arrays", () => {
    const schema = {
      type: "object",
      additionalProperties: false,
      properties: { count: { type: "number", default: 5 } },
    };
    const prepared = prepareLintConfiguration({ docTypes: [docType(schema)] });
    const validate = prepared.docTypes[0]!.validateMetadata;
    const metadata = { count: "5", extra: "keep" };
    const first = validate(metadata);
    expect(first.valid).toBe(false);
    expect(metadata).toEqual({ count: "5", extra: "keep" });
    const empty = {};
    expect(validate(empty).valid).toBe(true);
    expect(empty).toEqual({});
    expect(first.errors).toHaveLength(2);
    expect(validate({ count: 5 }).errors).toEqual([]);
    const inherited = Object.create({ count: 5 });
    expect(validate(inherited).valid).toBe(true);
  });
  test("keeps prepared schemas independent of later input changes", () => {
    const schema = { type: "object", required: ["title"] };
    const definition = docType(schema);
    const prepared = prepareLintConfiguration({ docTypes: [definition] });
    schema.required.length = 0;
    expect(prepared.docTypes[0]!.validateMetadata({}).valid).toBe(false);
    expect(Object.isFrozen(prepared.docTypes[0]!.definition.metadata)).toBe(
      true,
    );
    expect(prepared.docTypes[0]!.schemaId).toBe(
      "https://dokkurator.dev/doctypes/decision/metadata.schema.json",
    );
  });
  test("resolves supplied relative and internal references without resource loading", () => {
    const prepared = prepareLintConfiguration({
      docTypes: [
        docType({
          $id: schemaId,
          type: "object",
          properties: { title: { $ref: "common.json#/definitions/title" } },
        }),
      ],
      schemas: {
        "https://schemas.example/common.json": {
          definitions: { title: { type: "string", minLength: 1 } },
        },
      },
    });
    expect(
      prepared.docTypes[0]!.validateMetadata({ title: "Valid" }).valid,
    ).toBe(true);
    expect(prepared.docTypes[0]!.validateMetadata({ title: "" }).valid).toBe(
      false,
    );
  });
  test.each([true, false])("supports Draft 7 boolean schemas: %j", (schema) => {
    const prepared = prepareLintConfiguration({ docTypes: [docType(schema)] });
    expect(prepared.docTypes[0]!.validateMetadata({}).valid).toBe(schema);
  });
});
