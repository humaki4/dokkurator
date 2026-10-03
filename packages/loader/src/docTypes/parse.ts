import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import { parse as parseYaml } from "yaml";
import type { SourceDocument } from "../source-adapter/source-adapter.js";
import definitionSchema from "./schemas/definition.schema.json" with { type: "json" };
import rulesSchema from "./schemas/rules.schema.json" with { type: "json" };
import { normalizeMetadata } from "./normalize-metadata.js";
import type {
  LoadedDocType,
  MetadataDefinition,
  ParsedDocType,
  RuleDefinition,
  StructureDefinition,
} from "./types.js";

interface DefinitionFile {
  name: string;
  description?: string;
  metadata: MetadataDefinition;
  structure?: StructureDefinition;
}

interface RulesFile {
  rules: RuleDefinition[];
}

const ajv = new Ajv({ allErrors: true });
const validateDefinition = ajv.compile<DefinitionFile>(definitionSchema);
const validateRules = ajv.compile<RulesFile>(rulesSchema);

export class DocTypeParseError extends Error {
  constructor(
    message: string,
    readonly sourcePath: string,
    options?: ErrorOptions,
  ) {
    super(`${sourcePath}: ${message}`, options);
    this.name = "DocTypeParseError";
  }
}

export function parseDocType(source: LoadedDocType): ParsedDocType {
  const definition = parseAndValidate(
    source.definition,
    validateDefinition,
    "Invalid DocType definition",
    normalizeDefinition,
  );
  const ruleFile = source.rules
    ? parseAndValidate(source.rules, validateRules, "Invalid DocType rules")
    : undefined;

  return { ...definition, rules: ruleFile?.rules ?? [] };
}

export function parseDocTypes(
  sources: readonly LoadedDocType[],
): ParsedDocType[] {
  return sources.map(parseDocType);
}

function parseAndValidate<T>(
  source: SourceDocument,
  validate: ValidateFunction<T>,
  invalidMessage: string,
  normalize?: (value: unknown) => unknown,
): T {
  let value: unknown;

  try {
    value = parseYaml(source.content);
  } catch (error) {
    throw new DocTypeParseError("Invalid YAML", source.path, { cause: error });
  }

  if (normalize) {
    try {
      value = normalize(value);
    } catch (cause) {
      throw new DocTypeParseError(
        `${invalidMessage}: ${cause instanceof Error ? cause.message : String(cause)}`,
        source.path,
        { cause },
      );
    }
  }

  if (!validate(value)) {
    throw new DocTypeParseError(
      `${invalidMessage}: ${formatErrors(validate.errors)}`,
      source.path,
    );
  }

  return value;
}

function normalizeDefinition(value: unknown): unknown {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !Object.hasOwn(value, "metadata")
  )
    return value;
  const definition = value as Record<string, unknown>;
  return { ...definition, metadata: normalizeMetadata(definition.metadata) };
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map(
      (error) =>
        `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
    )
    .join("; ");
}
