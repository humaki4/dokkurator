import { Ajv, type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import type { ParsedDocType } from "@dokkurator/loader";
import { LintConfigurationError } from "../errors.js";

export type MetadataSchema = Readonly<Record<string, unknown>> | boolean;

export interface MetadataValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ErrorObject[];
}

export interface PreparedDocType {
  readonly definition: ParsedDocType;
  readonly schemaId: string;
  /** Synchronous and non-mutating; errors are independent snapshots per call. */
  validateMetadata(metadata: unknown): MetadataValidationResult;
}

export type DocTypeSelectionCode =
  | "missing-frontmatter"
  | "invalid-frontmatter"
  | "missing-doctype"
  | "invalid-doctype"
  | "unknown-doctype"
  | "invalid-schema-annotation"
  | "schema-conflict";

export type DocTypeSelection =
  | { readonly status: "selected"; readonly docType: PreparedDocType }
  | {
      readonly status: "invalid";
      readonly code: DocTypeSelectionCode;
      readonly message: string;
    };

export interface PreparedDocTypeRegistry {
  readonly docTypes: readonly PreparedDocType[];
  selectDocType(metadata: unknown): DocTypeSelection;
}

const draft7 = "http://json-schema.org/draft-07/schema#";

export function prepareDocTypes(
  definitions: readonly ParsedDocType[],
  schemas: Readonly<Record<string, MetadataSchema>>,
): PreparedDocTypeRegistry {
  try {
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
    const names = new Set<string>();
    const identities = new Set<string>();
    const copies = definitions.map((definition) => {
      if (!definition.name || names.has(definition.name)) {
        throw new Error(
          `Empty or duplicate DocType name: ${JSON.stringify(definition.name)}`,
        );
      }
      names.add(definition.name);
      if (definition.rules.length > 0) {
        throw new Error(
          `DocType ${definition.name} contains legacy rules; configure ESLint rules in JavaScript instead.`,
        );
      }
      const copy = structuredClone(definition);
      const schemaId = canonicalSchemaId(
        (typeof copy.metadata === "boolean" ? undefined : copy.metadata.$id) ??
          `https://dokkurator.dev/doctypes/${encodeURIComponent(copy.name)}/metadata.schema.json`,
      );
      return { definition: copy, schemaId };
    });

    const register = (id: string, schema: MetadataSchema) => {
      if (identities.has(id))
        throw new Error(`Duplicate schema identity: ${id}`);
      identities.add(id);
      const copy =
        typeof schema === "boolean" ? schema : structuredClone({ ...schema });
      if (typeof copy !== "boolean") {
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
      }
      ajv.addSchema(copy, id);
    };

    for (const [id, schema] of Object.entries(schemas))
      register(canonicalSchemaId(id), schema);
    for (const entry of copies)
      register(entry.schemaId, entry.definition.metadata);

    // Compile every supplied resource, including unused ones, before any rule visitor.
    for (const id of identities) {
      const validate = ajv.getSchema(id);
      if (!validate || "$async" in validate)
        throw new Error(`Schema must be prepared synchronously: ${id}`);
    }
    const docTypes = copies.map(({ definition, schemaId }): PreparedDocType => {
      const validate = ajv.getSchema(schemaId)!;
      freezeData(definition);
      return Object.freeze({
        definition,
        schemaId,
        validateMetadata(metadata: unknown): MetadataValidationResult {
          const valid = validate(metadata) as boolean;
          return { valid, errors: structuredClone(validate.errors ?? []) };
        },
      });
    });
    const byName = new Map(
      docTypes.map((entry) => [entry.definition.name, entry]),
    );
    return Object.freeze({
      docTypes: Object.freeze(docTypes),
      selectDocType(metadata: unknown): DocTypeSelection {
        if (metadata === undefined)
          return invalid(
            "missing-frontmatter",
            "Document requires YAML frontmatter.",
          );
        if (
          metadata === null ||
          typeof metadata !== "object" ||
          Array.isArray(metadata)
        ) {
          return invalid(
            "invalid-frontmatter",
            "Frontmatter must be a mapping.",
          );
        }
        if (!Object.hasOwn(metadata, "doctype"))
          return invalid("missing-doctype", "Frontmatter requires a doctype.");
        const { doctype, $schema } = metadata as Record<string, unknown>;
        if (typeof doctype !== "string" || doctype.length === 0) {
          return invalid(
            "invalid-doctype",
            "Frontmatter doctype must be a non-empty string.",
          );
        }
        const docType = byName.get(doctype);
        if (!docType)
          return invalid("unknown-doctype", `Unknown DocType: ${doctype}.`);
        if (Object.hasOwn(metadata, "$schema")) {
          let annotation: string;
          try {
            annotation = canonicalSchemaId($schema);
          } catch {
            return invalid(
              "invalid-schema-annotation",
              "Frontmatter $schema must be an absolute schema URI without a fragment.",
            );
          }
          if (annotation !== docType.schemaId) {
            return invalid(
              "schema-conflict",
              `Frontmatter $schema conflicts with DocType ${doctype}; expected ${docType.schemaId}.`,
            );
          }
        }
        return { status: "selected", docType };
      },
    });
  } catch (cause) {
    throw new LintConfigurationError(
      `Invalid DocType or schema configuration: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
}

function invalid(
  code: DocTypeSelectionCode,
  message: string,
): DocTypeSelection {
  return { status: "invalid", code, message };
}

function canonicalSchemaId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || /\s/.test(value)) {
    throw new Error("Schema identity must be an absolute URI.");
  }
  const uri = new URL(value);
  if (uri.hash !== "")
    throw new Error("Schema identity must not contain a fragment.");
  return value.replace(/#$/, "");
}

function freezeData(value: unknown): void {
  if (value === null || typeof value !== "object" || Object.isFrozen(value))
    return;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeData(child);
}
