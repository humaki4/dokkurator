import type { MetadataDefinition } from "./types.js";

// These describe the metadata object itself, not individual compact fields.
const objectKeywords = new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "definitions",
  "properties",
  "patternProperties",
  "additionalProperties",
  "required",
  "dependencies",
  "propertyNames",
  "minProperties",
  "maxProperties",
  "allOf",
  "anyOf",
  "oneOf",
  "not",
  "if",
  "then",
  "else",
  "const",
  "enum",
  "default",
  "examples",
  "readOnly",
  "writeOnly",
]);

/** Accept a convenience field map, but expose only JSON Schema to consumers. */
export function normalizeMetadata(input: unknown): MetadataDefinition {
  if (typeof input === "boolean") return input;
  if (!isRecord(input))
    throw new Error("metadata must be a JSON Schema or a compact field map.");
  if (isJsonSchema(input)) return structuredClone(input);
  return expandFields(input);
}

function isJsonSchema(input: Record<string, unknown>): boolean {
  const nativeType =
    typeof input.type === "string" || Array.isArray(input.type);
  const objectKeyword = Object.keys(input).some((key) =>
    objectKeywords.has(key),
  );
  if (isRecord(input.type) && objectKeyword) {
    throw new Error(
      "Compact fields cannot be mixed with object-level JSON Schema keywords; use type: object and properties for the full schema.",
    );
  }
  if (nativeType || objectKeyword || Object.keys(input).length === 0)
    return true;
  // Annotation-only schemas remain valid. A field map has schema-valued entries.
  return !Object.values(input).some(
    (value) => isRecord(value) || typeof value === "boolean",
  );
}

function expandFields(fields: Record<string, unknown>): MetadataDefinition {
  const required: string[] = [];
  const properties = Object.fromEntries(
    Object.entries(fields).map(([name, value]) => {
      if (typeof value === "boolean") return [name, value];
      if (!isRecord(value))
        throw new Error(
          `Compact metadata field ${JSON.stringify(name)} must contain a JSON Schema.`,
        );
      const schema = structuredClone(value);
      if (typeof schema.required === "boolean") {
        if (schema.required) required.push(name);
        delete schema.required;
      }
      return [name, schema];
    }),
  );
  const schema: Record<string, unknown> = { type: "object", properties };
  if (required.length) schema.required = required;
  return schema;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
