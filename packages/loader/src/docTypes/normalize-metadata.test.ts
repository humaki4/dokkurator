import { describe, expect, test } from "vitest";
import { normalizeMetadata } from "./normalize-metadata.js";

describe("compact metadata", () => {
  test("expands field schemas and lifts only boolean required flags", () => {
    expect(
      normalizeMetadata({
        doctype: { type: "string", required: true },
        title: { type: "string", required: false, pattern: "^[A-Z]" },
        status: { type: "string", enum: ["draft", "accepted"] },
        tags: { type: "array", items: { type: "string", pattern: "^[a-z]+$" } },
        details: {
          type: "object",
          required: ["owner"],
          properties: { owner: { type: "string" } },
        },
      }),
    ).toEqual({
      type: "object",
      required: ["doctype"],
      properties: {
        doctype: { type: "string" },
        title: { type: "string", pattern: "^[A-Z]" },
        status: { type: "string", enum: ["draft", "accepted"] },
        tags: { type: "array", items: { type: "string", pattern: "^[a-z]+$" } },
        details: {
          type: "object",
          required: ["owner"],
          properties: { owner: { type: "string" } },
        },
      },
    });
  });

  test("keeps type as a regular field, separate from doctype", () => {
    expect(
      normalizeMetadata({
        type: { type: "string", required: true },
        doctype: { type: "string" },
      }),
    ).toEqual({
      type: "object",
      required: ["type"],
      properties: { type: { type: "string" }, doctype: { type: "string" } },
    });
  });

  test("preserves field-level references and conditions as JSON Schema", () => {
    const field = {
      required: true,
      $ref: "https://example.com/name",
      if: { minLength: 3 },
      then: { pattern: "^[A-Z]" },
      else: false,
    };
    expect(normalizeMetadata({ title: field })).toEqual({
      type: "object",
      required: ["title"],
      properties: {
        title: {
          $ref: field.$ref,
          if: field.if,
          then: field.then,
          else: false,
        },
      },
    });
    expect(field.required).toBe(true);
  });

  test("keeps fields optional and additional fields allowed by default", () => {
    expect(
      normalizeMetadata({ title: { type: "string" }, forbidden: false }),
    ).toEqual({
      type: "object",
      properties: { title: { type: "string" }, forbidden: false },
    });
  });

  test("returns an independent schema without mutating inputs", () => {
    const fields = {
      tags: { type: "array", required: true, items: { type: "string" } },
    };
    const result = normalizeMetadata(fields);
    fields.tags.items.type = "integer";
    expect(result).toMatchObject({
      properties: { tags: { items: { type: "string" } } },
    });
    expect(fields.tags.required).toBe(true);
  });
});

describe("native JSON Schema", () => {
  test.each([
    true,
    false,
    {},
    {
      type: "object",
      required: ["title"],
      properties: { title: { type: "string" } },
    },
    { properties: { title: { type: "string" } } },
    { $id: "https://example.com/guide", $ref: "common.json" },
    {
      if: { properties: { status: { const: "accepted" } } },
      then: { required: ["component"] },
    },
    { const: { title: "Guide" } },
    { default: { title: "Guide" } },
    { readOnly: true },
    { title: "Guide metadata", description: "Description" },
    { definitions: { name: { type: "string" } }, $ref: "#/definitions/name" },
  ])("preserves native schemas: %j", (schema) => {
    const normalized = normalizeMetadata(schema);
    expect(normalized).toEqual(schema);
    if (typeof schema === "object") expect(normalized).not.toBe(schema);
  });
});
