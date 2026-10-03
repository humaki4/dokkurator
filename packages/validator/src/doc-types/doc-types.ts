import type { ParsedDocType } from "@dokkurator/loader";
import {
  prepareSchemas,
  type MetadataSchema,
  type MetadataValidator,
} from "../schemas/schemas.js";
import { canonicalSchemaId } from "../schemas/schema-id.js";
import { selectDocType, type DocTypeSelection } from "./select-doc-type.js";
import { LintConfigurationError } from "../lint/errors.js";

export interface PreparedDocType {
  readonly definition: ParsedDocType;
  readonly schemaId: string;
  readonly validateMetadata: MetadataValidator;
}
export interface PreparedDocTypeRegistry {
  readonly docTypes: readonly PreparedDocType[];
  selectDocType(metadata: unknown): DocTypeSelection;
}

/** Snapshot DocTypes, prepare their schemas, then build a reusable lookup. */
export function prepareDocTypes(
  definitions: readonly ParsedDocType[],
  schemas: Readonly<Record<string, MetadataSchema>> = {},
): PreparedDocTypeRegistry {
  try {
    const copies = snapshotDefinitions(definitions);
    const validators = prepareSchemas([
      ...Object.entries(schemas).map(([id, schema]) => ({ id, schema })),
      ...copies.map(({ schemaId, definition }) => ({
        id: schemaId,
        schema: definition.metadata,
      })),
    ]);
    const docTypes = copies.map((entry) =>
      Object.freeze({
        ...entry,
        validateMetadata: validators.get(entry.schemaId)!,
      }),
    );
    return createRegistry(docTypes);
  } catch (cause) {
    throw new LintConfigurationError(
      `Invalid DocType or schema configuration: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
}

function snapshotDefinitions(definitions: readonly ParsedDocType[]) {
  const names = new Set<string>();
  return definitions.map((definition) => {
    if (!definition.name || names.has(definition.name))
      throw new Error(
        `Empty or duplicate DocType name: ${JSON.stringify(definition.name)}`,
      );
    names.add(definition.name);
    if (definition.rules.length > 0)
      throw new Error(
        `DocType ${definition.name} contains legacy rules; configure ESLint rules in JavaScript instead.`,
      );
    const copy = structuredClone(definition);
    const schemaId = canonicalSchemaId(
      (typeof copy.metadata === "boolean" ? undefined : copy.metadata.$id) ??
        `https://dokkurator.dev/doctypes/${encodeURIComponent(copy.name)}/metadata.schema.json`,
    );
    freezeData(copy);
    return { definition: copy, schemaId };
  });
}

function createRegistry(
  docTypes: readonly PreparedDocType[],
): PreparedDocTypeRegistry {
  const byName = new Map(
    docTypes.map((entry) => [entry.definition.name, entry]),
  );
  return Object.freeze({
    docTypes: Object.freeze(docTypes),
    selectDocType: (metadata: unknown) => selectDocType(metadata, byName),
  });
}

function freezeData(value: unknown): void {
  if (value === null || typeof value !== "object" || Object.isFrozen(value))
    return;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeData(child);
}
