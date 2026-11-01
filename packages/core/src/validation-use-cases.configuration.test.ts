import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { resolveActiveConfig } from "@dokkurator/config";
import {
  loadDocTypes,
  loadDocuments,
  openConfiguredSource,
} from "@dokkurator/loader";
import { lint, prepareLintConfiguration } from "@dokkurator/validator";
import { createDokkurator } from "./index.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("uses project schemas and plugins, source directories and local rule overrides", async () => {
  const root = await mkdtemp(join(tmpdir(), "core-validator-config-"));
  roots.push(root);
  const repo = join(root, "repo");
  await mkdir(join(repo, "types/guide"), { recursive: true });
  await mkdir(join(repo, "docs"));
  await writeFile(
    join(root, "custom.mjs"),
    `export default {rules:{'no-todo':{
    meta:{schema:[],messages:{todo:'Write the missing content.'}},
    create(context){return {text(node){if(node.value.includes('TODO'))context.report({node,messageId:'todo'});}}}
  }}};`,
  );
  await writeFile(
    join(root, "dokkurator.config.mjs"),
    `import shared from './custom.mjs'; export default {
    sources:[{id:'docs',path:'repo'}],
    validator:{plugins:{shared},rules:{'shared/no-todo':'error'},schemas:{
      'https://example.test/owner': {type:'string',format:'email'}
    }}
  };`,
  );
  await writeFile(
    join(repo, "dokkurator.config.mjs"),
    `export default {
    documents:{directory:'docs',exclude:['docs/ignored.md']},doctypes:{directory:'types'},
    validator:{rules:{'shared/no-todo':'warn'},schemas:{'https://example.test/component':{type:'string',pattern:'^[a-z]+$'}}}
  };`,
  );
  await writeFile(
    join(repo, "types/guide/definition.yml"),
    `name: guide
metadata:
  title:
    type: string
    required: true
  owner:
    $ref: https://example.test/owner
  component:
    $ref: https://example.test/component
structure:
  requiredHeadings: [Einstieg]
`,
  );
  const text =
    "---\ndoctype: guide\ntitle: Anleitung\nowner: docs@example.test\ncomponent: loader\n---\n\n## Einstieg\n\nTODO: ergänzen.\n";
  await writeFile(join(repo, "docs/guide.md"), text);
  await writeFile(join(repo, "docs/ignored.md"), "not a matching document");
  await writeFile(
    join(repo, "README.md"),
    "outside the configured documents directory",
  );
  const app = createDokkurator({ root });
  await app.open();
  try {
    const result = await app.validate({ sourceId: "docs" });
    expect(result.errors).toEqual([]);
    expect(result.results[0]!.documents).toMatchObject([
      {
        path: "docs/guide.md",
        status: "passed",
        diagnostics: [{ ruleId: "shared/no-todo", severity: "warning" }],
      },
    ]);
    const resolved = (await resolveActiveConfig({ root })).sources[0]!;
    const adapter = await openConfiguredSource(resolved);
    const configuration = prepareLintConfiguration({
      docTypes: await loadDocTypes(adapter, {
        doctypesDirectory: resolved.doctypes.directory,
      }),
      ...resolved.validator,
    });
    const [document] = await loadDocuments(adapter, {
      documentsDirectory: resolved.documents.directory,
      exclude: resolved.documents.exclude,
    });
    expect(result.results[0]!.documents[0]).toEqual({
      path: document!.source.path,
      filePath: join(resolved.root, document!.source.path),
      ...lint({
        originalText: document!.originalText,
        source: document!.source,
        configuration,
      }),
    });
    await writeFile(
      join(repo, "docs/guide.md"),
      text.replace("component: loader", "component: Loader"),
    );
    expect((await app.validate()).results[0]!.documents[0]).toMatchObject({
      status: "failed",
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ ruleId: "dokkurator/metadata-schema" }),
      ]),
    });
  } finally {
    await app.close();
  }
});

test.each([
  [
    "export default {validator:{schemas:{'https://example.test/bad':{type:'invalid'}}}};",
    "configuration",
  ],
  [
    "export default {validator:{rules:{'markdown/unknown':'error'}}};",
    "configuration",
  ],
  [
    "export default {validator:{plugins:{broken:{rules:{crash:{meta:{schema:[]},create(){throw Error('Crash');}}}}},rules:{'broken/crash':'error'}}};",
    "validation",
  ],
])(
  "keeps operational rule failures out of document findings: %s",
  async (config, phase) => {
    const root = await mkdtemp(join(tmpdir(), "core-validator-error-"));
    roots.push(root);
    await mkdir(join(root, "_dokkurator/.doctypes/guide"), { recursive: true });
    await writeFile(
      join(root, "_dokkurator/.doctypes/guide/definition.yml"),
      "name: guide\nmetadata: {}\n",
    );
    await writeFile(
      join(root, "guide.md"),
      "---\ndoctype: guide\n---\nText.\n",
    );
    await writeFile(join(root, "dokkurator.config.mjs"), config);
    const app = createDokkurator({ root });
    await app.open();
    try {
      expect(await app.validate()).toMatchObject({
        results: [],
        errors: [{ sourceId: "root", phase }],
      });
    } finally {
      await app.close();
    }
  },
);
