import type { PreparedDocType } from "./doc-types.js";
import { canonicalSchemaId } from "../schemas/schema-id.js";

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

export function selectDocType(
  metadata: unknown,
  byName: ReadonlyMap<string, PreparedDocType>,
): DocTypeSelection {
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
    return invalid("invalid-frontmatter", "Frontmatter must be a mapping.");
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
}

function invalid(
  code: DocTypeSelectionCode,
  message: string,
): DocTypeSelection {
  return { status: "invalid", code, message };
}
