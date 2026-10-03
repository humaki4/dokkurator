import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { canonicalSchemaId } from "./schema-id.js";

export type MetadataSchema = Readonly<Record<string, unknown>> | boolean;
export interface MetadataValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ErrorObject[];
}
export type MetadataValidator = (metadata: unknown) => MetadataValidationResult;
export interface SchemaResource {
  readonly id: string;
  readonly schema: MetadataSchema;
}

const draft7 = "http://json-schema.org/draft-07/schema#";

/** Compile supplied resources once; validation is synchronous and never loads refs. */
export function prepareSchemas(
  resources: readonly SchemaResource[],
): ReadonlyMap<string, MetadataValidator> {
  const ajv = createAjv();
  const identities = registerResources(ajv, resources);
  return new Map([...identities].map((id) => [id, createValidator(ajv, id)]));
}

function createAjv(): Ajv {
  const ajv = new Ajv({
    allErrors: true,
    strictSchema: true,
    strictTypes: false,
    strictTuples: false,
    strictRequired: false,
    strictNumbers: true,
    validateSchema: true,
    validateFormats: true,
    ownProperties: true,
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,
  });
  addFormats.default(ajv, { mode: "full", keywords: false });
  return ajv;
}

function registerResources(
  ajv: Ajv,
  resources: readonly SchemaResource[],
): Set<string> {
  const identities = new Set<string>();
  for (const resource of resources) {
    const id = canonicalSchemaId(resource.id);
    if (identities.has(id)) throw new Error(`Duplicate schema identity: ${id}`);
    identities.add(id);
    ajv.addSchema(prepareSchema(resource.schema, id), id);
  }
  return identities;
}

function prepareSchema(schema: MetadataSchema, id: string): MetadataSchema {
  if (typeof schema === "boolean") return schema;
  const copy = structuredClone({ ...schema });
  if (copy.$id !== undefined && canonicalSchemaId(copy.$id) !== id) {
    throw new Error(
      `Schema $id does not match its registration identity: ${id}`,
    );
  }
  if (
    copy.$schema !== undefined &&
    ![
      draft7,
      "http://json-schema.org/draft-07/schema",
      "https://json-schema.org/draft-07/schema#",
      "https://json-schema.org/draft-07/schema",
    ].includes(String(copy.$schema))
  ) {
    throw new Error(`Only JSON Schema Draft 7 is supported: ${id}`);
  }
  copy.$id = id;
  copy.$schema = draft7;
  return copy;
}

function createValidator(ajv: Ajv, id: string): MetadataValidator {
  const validate = ajv.getSchema(id);
  if (!validate || "$async" in validate)
    throw new Error(`Schema must be prepared synchronously: ${id}`);
  return (metadata) => validateMetadata(validate, metadata);
}

function validateMetadata(
  validate: ValidateFunction,
  metadata: unknown,
): MetadataValidationResult {
  const valid = validate(metadata) as boolean;
  return { valid, errors: structuredClone(validate.errors ?? []) };
}
