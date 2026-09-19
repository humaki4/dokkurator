import { describe, expect, test } from "vitest";
import type { LoadedDocType } from "./index.js";
import { DocTypeParseError, parseDocType } from "./parser.js";
import type { SourceDocument } from "./source-adapter.js";

describe("parseDocType", () => {
  test("parses and validates definition and rules", () => {
    const source = loadedDocType({
      definition: `
name: decision
description: Records an architectural decision.
metadata:
  type: object
  required: [title]
  properties:
    title:
      type: string
structure:
  requiredHeadings: [Context, Decision]
`,
      rules: `
rules:
  - name: title-is-required
    field: title
    severity: error
`,
      template: "this is deliberately not valid frontmatter: [",
    });

    expect(parseDocType(source)).toEqual({
      name: "decision",
      description: "Records an architectural decision.",
      metadata: {
        type: "object",
        required: ["title"],
        properties: { title: { type: "string" } },
      },
      structure: { requiredHeadings: ["Context", "Decision"] },
      rules: [
        {
          name: "title-is-required",
          field: "title",
          severity: "error",
        },
      ],
    });
  });

  test("rejects invalid YAML with its source path", () => {
    const source = loadedDocType({ definition: "name: [" });

    expect(() => parseDocType(source)).toThrowError(
      new DocTypeParseError(
        "Invalid YAML",
        "_dokkurator/.doctypes/example/definition.yml",
      ),
    );
  });

  test("rejects a definition that does not match its JSON Schema", () => {
    const source = loadedDocType({
      definition: "name: example\nmetadata: invalid\n",
    });

    expect(() => parseDocType(source)).toThrow(
      "definition.yml: Invalid DocType definition",
    );
  });

  test("rejects rules with an unsupported severity", () => {
    const source = loadedDocType({
      rules: `
rules:
  - name: title-is-required
    field: title
    severity: fatal
`,
    });

    expect(() => parseDocType(source)).toThrow(
      "rules.yml: Invalid DocType rules",
    );
  });
});

function loadedDocType(
  overrides: Partial<Record<"definition" | "rules" | "template", string>>,
): LoadedDocType {
  const directory = "_dokkurator/.doctypes/example";
  return {
    directory,
    definition: document(
      `${directory}/definition.yml`,
      overrides.definition ?? "name: example\nmetadata:\n  type: object\n",
    ),
    rules: document(`${directory}/rules.yml`, overrides.rules ?? "rules: []\n"),
    template: document(
      `${directory}/template.md`,
      overrides.template ?? "# Example\n",
    ),
  };
}

function document(path: string, content: string): SourceDocument {
  return {
    id: path,
    path,
    content,
    source: { kind: "filesystem", path },
  };
}
