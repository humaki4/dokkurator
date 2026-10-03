import { type ParsedDocType } from "@dokkurator/loader";
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

describe("prepared DocType selection", () => {
  test.each([
    [undefined, "missing-frontmatter"],
    [null, "invalid-frontmatter"],
    ["scalar", "invalid-frontmatter"],
    [[], "invalid-frontmatter"],
    [{}, "missing-doctype"],
    [{ doctype: 42 }, "invalid-doctype"],
    [{ doctype: "" }, "invalid-doctype"],
    [{ doctype: "unknown" }, "unknown-doctype"],
    [{ doctype: "decision", $schema: 42 }, "invalid-schema-annotation"],
    [
      { doctype: "decision", $schema: "./decision.json" },
      "invalid-schema-annotation",
    ],
    [
      { doctype: "decision", $schema: "https://schemas.example/other.json" },
      "schema-conflict",
    ],
  ])("makes invalid association %j visible", (metadata, code) => {
    const prepared = prepareLintConfiguration({
      docTypes: [docType(conditionalSchema)],
    });
    expect(prepared.selectDocType(metadata)).toMatchObject({
      status: "invalid",
      code,
    });
  });
  test("allows a matching $schema but never selects a DocType through it", () => {
    const prepared = prepareLintConfiguration({
      docTypes: [docType(conditionalSchema)],
    });
    expect(
      prepared.selectDocType({ doctype: "decision", $schema: `${schemaId}#` }),
    ).toMatchObject({ status: "selected" });
    expect(prepared.selectDocType({ $schema: schemaId })).toMatchObject({
      status: "invalid",
      code: "missing-doctype",
    });
    expect(
      prepared.selectDocType(Object.create({ doctype: "decision" })),
    ).toMatchObject({ status: "invalid", code: "missing-doctype" });
  });
});
