import { ESLint, Linter } from "eslint";
import { type ParsedDocType } from "@dokkurator/loader";
import { describe, expect, test } from "vitest";
import { createLintConfig, prepareLintConfiguration } from "../../index.js";

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

describe("DocType association through ESLint", () => {
  test.each([
    [
      "---\ndoctype: decision\ntitle: Example\nstatus: draft\n---\nExample content.\n",
      undefined,
    ],
    ["# No frontmatter\n", "Document requires YAML frontmatter."],
    ["---\ntitle: Example\n---\n", "Frontmatter requires a doctype."],
    ["---\ndoctype: unknown\n---\n", "Unknown DocType: unknown."],
    [
      "---\ndoctype: decision\n$schema: https://schemas.example/other.json\n---\n",
      `Frontmatter $schema conflicts with DocType decision; expected ${schemaId}.`,
    ],
  ])(
    "makes the same association through embedded and direct ESLint: %j",
    async (text, expected) => {
      const prepared = prepareLintConfiguration({
        docTypes: [docType(conditionalSchema)],
      });
      const config = createLintConfig(prepared);
      const filename = "virtual/repository/docs/example.MD";
      const embedded = new Linter({ configType: "flat" }).verify(text, config, {
        filename,
      });
      const eslint = new ESLint({
        overrideConfigFile: true,
        overrideConfig: config,
      });
      const [direct] = await eslint.lintText(text, { filePath: filename });
      expect(direct!.messages).toEqual(embedded);
      if (expected === undefined) expect(embedded).toEqual([]);
      else
        expect(embedded).toEqual([
          expect.objectContaining({
            ruleId: "dokkurator/doctype",
            severity: 2,
            message: expected,
          }),
        ]);
    },
  );
  test("uses normal ESLint severities and suppression for association checks", () => {
    const filename = "virtual/example.md";
    const warning = createLintConfig({
      docTypes: [],
      rules: { "dokkurator/doctype": "warn" },
    });
    expect(
      new Linter().verify("# No association", warning, { filename }),
    ).toEqual([expect.objectContaining({ severity: 1 })]);
    expect(
      new Linter().verify(
        "<!-- eslint-disable dokkurator/doctype -->\n# No association",
        warning,
        { filename },
      ),
    ).toEqual([]);
    expect(
      new Linter().verify(
        "# No association",
        createLintConfig({
          docTypes: [],
          rules: { "dokkurator/doctype": "off" },
        }),
        { filename },
      ),
    ).toEqual([]);
  });
  test.each([
    "---\ntitle: [\n---\n",
    "---\ndoctype: decision\ndoctype: other\n---\n",
  ])("does not select from broken YAML: %j", (text) => {
    const messages = new Linter().verify(
      text,
      createLintConfig({ docTypes: [docType()] }),
      { filename: "virtual/example.md" },
    );
    expect(messages).toEqual([
      expect.objectContaining({
        ruleId: "dokkurator/doctype",
        messageId: "invalid-yaml",
      }),
    ]);
  });
});
