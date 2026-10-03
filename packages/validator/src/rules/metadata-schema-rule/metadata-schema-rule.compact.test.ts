import {
  loadDocType,
  loadDocument,
  type DocumentSource,
} from "@dokkurator/loader";
import { describe, expect, test } from "vitest";
import {
  createLintConfig,
  lint,
  prepareLintConfiguration,
} from "../../index.js";
import { ESLint } from "eslint";

const directory = "_dokkurator/.doctypes/decision";
const compact = `name: decision
metadata:
  doctype:
    type: string
    required: true
  title:
    type: string
    required: true
    pattern: '^[A-Z]'
  status:
    type: string
    enum: [draft, accepted]
  tags:
    type: array
    items:
      type: string
`;

function adapter(definition: string, text: string): DocumentSource {
  return {
    async list() {
      const path = `${directory}/definition.yml`;
      return [
        {
          id: path,
          path,
          source: { sourceId: "memory", kind: "filesystem", path },
        },
      ];
    },
    async read(path) {
      return {
        id: path,
        path,
        content: path.endsWith("definition.yml")
          ? definition
          : path.endsWith("rules.yml")
            ? "rules: []\n"
            : text,
        source: { sourceId: "memory", kind: "filesystem", path },
      };
    },
  };
}

async function check(body: string, definition = compact) {
  const originalText = `---\ndoctype: decision\n${body}\n---\nContent.\n`;
  const source = adapter(definition, originalText);
  const docType = await loadDocType(source, directory);
  const document = await loadDocument(source, "docs/decision.md");
  const configuration = prepareLintConfiguration({ docTypes: [docType] });
  const input = { originalText, source: document.source, configuration };
  return { input, docType, document, result: lint(input) };
}

describe("compact definitions through Loader and ESLint", () => {
  test("uses one canonical schema without modifying document metadata", async () => {
    const { docType, document, result, input } = await check(
      "title: Example\nstatus: draft\ntags: [architecture]",
    );
    expect(result.diagnostics).toEqual([]);
    expect(docType.metadata).toMatchObject({
      type: "object",
      required: ["doctype", "title"],
    });
    expect(document.metadata).toEqual({
      doctype: "decision",
      title: "Example",
      status: "draft",
      tags: ["architecture"],
    });
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: createLintConfig(input.configuration),
    });
    expect(
      (
        await eslint.lintText(input.originalText, {
          filePath: input.source.path,
        })
      )[0]!.messages,
    ).toEqual([]);
  });

  test.each([
    ["title: lower\nstatus: draft", "pattern", 3, 8],
    ["title: Example\nstatus: wrong", "enum", 4, 9],
    ["title: Example\ntags: [42]", "type", 4, 8],
  ])(
    "lets Ajv check %s and keeps field positions",
    async (body, keyword, line, column) => {
      const { result } = await check(body);
      expect(result.diagnostics).toEqual([
        expect.objectContaining({
          ruleId: "dokkurator/metadata-schema",
          message: expect.stringContaining(`(${keyword})`),
          location: expect.objectContaining({ line, column }),
        }),
      ]);
    },
  );

  test("missing compact required fields are checked by Ajv", async () => {
    const { result } = await check("status: draft");
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("required property 'title'"),
      }),
    ]);
  });

  test("native object-level conditions keep working", async () => {
    const definition = `name: decision
metadata:
  type: object
  properties:
    status: { enum: [draft, accepted] }
    component: { type: string }
  if:
    required: [status]
    properties:
      status: { const: accepted }
  then:
    required: [component]
`;
    expect(
      (await check("status: draft", definition)).result.diagnostics,
    ).toEqual([]);
    expect(
      (await check("status: accepted\ncomponent: loader", definition)).result
        .diagnostics,
    ).toEqual([]);
    expect(
      (await check("status: accepted", definition)).result.diagnostics,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("required property 'component'"),
        }),
      ]),
    );
  });
});
