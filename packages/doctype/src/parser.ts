import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import { parse as parseYaml } from "yaml";
import type { LoadedDocType } from "./index.js";
import definitionSchema from "./schemas/definition.schema.json" with { type: "json" };
import rulesSchema from "./schemas/rules.schema.json" with { type: "json" };
import type { SourceDocument } from "./source-adapter.js";

export interface MetadataDefinition {
  readonly [key: string]: unknown;
}

export interface StructureDefinition {
  requiredHeadings?: string[];
}

export interface RuleDefinition {
  name: string;
  field: string;
  severity: "error" | "warning";
}

export interface ParsedDocType {
  name: string;
  description?: string;
  metadata: MetadataDefinition;
  structure?: StructureDefinition;
  rules: RuleDefinition[];
}

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
  );
  const ruleFile = parseAndValidate(
    source.rules,
    validateRules,
    "Invalid DocType rules",
  );

  return {
    ...definition,
    rules: ruleFile.rules,
  };
}

export function parseDocTypes(sources: LoadedDocType[]): ParsedDocType[] {
  return sources.map(parseDocType);
}

function parseAndValidate<T>(
  source: SourceDocument,
  validate: ValidateFunction<T>,
  invalidMessage: string,
): T {
  let value: unknown;

  try {
    value = parseYaml(source.content);
  } catch (error) {
    throw new DocTypeParseError("Invalid YAML", source.path, { cause: error });
  }

  if (!validate(value)) {
    throw new DocTypeParseError(
      `${invalidMessage}: ${formatErrors(validate.errors)}`,
      source.path,
    );
  }

  return value;
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map(
      (error) =>
        `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
    )
    .join("; ");
}
