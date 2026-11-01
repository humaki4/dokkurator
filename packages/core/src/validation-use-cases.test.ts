import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
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

async function project() {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-validation-"));
  roots.push(root);
  await mkdir(join(root, "_dokkurator/.doctypes/guide"), { recursive: true });
  return root;
}
const compact =
  "name: guide\nmetadata:\n  title:\n    type: string\n    required: true\nstructure:\n  requiredHeadings: [Einstieg]\n";
const native =
  "name: guide\nmetadata:\n  type: object\n  required: [title]\n  properties:\n    title: {type: string}\nstructure:\n  requiredHeadings: [Einstieg]\n";
const valid =
  "---\ndoctype: guide\ntitle: Anleitung\n---\n\n## Einstieg\n\nLos geht es.\n";

test.each([compact, native])(
  "validates a configuration-free project identically to the public Validator: %s",
  async (definition) => {
    const root = await project();
    await writeFile(
      join(root, "_dokkurator/.doctypes/guide/definition.yml"),
      definition,
    );
    await writeFile(join(root, "guide.md"), valid);
    const app = createDokkurator({ root });
    await expect(app.validate()).rejects.toThrow("not open");
    expect(await app.open()).toEqual({
      root,
      sources: [{ sourceId: "root", status: "ready" }],
    });
    try {
      const adapter = await openConfiguredSource({ root, id: "root" });
      const configuration = prepareLintConfiguration({
        docTypes: await loadDocTypes(adapter),
      });
      const [document] = await loadDocuments(adapter);
      const direct = lint({
        originalText: document!.originalText,
        source: document!.source,
        configuration,
      });
      expect(await app.validate()).toEqual({
        results: [
          {
            sourceId: "root",
            documents: [
              { path: "guide.md", filePath: join(root, "guide.md"), ...direct },
            ],
          },
        ],
        errors: [],
      });
      expect(direct.status).toBe("passed");
      expect(await app.listDocTypes()).toMatchObject({
        results: [{ doctypes: [{ name: "guide" }] }],
        errors: [],
      });
      expect(await app.listDocuments()).toMatchObject({
        results: [{ documents: [{ type: "guide" }] }],
        errors: [],
      });
      await expect(access(join(root, ".dokkurator"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await app.close();
    }
  },
);

test("keeps malformed YAML as a document finding and reloads documents on subsequent calls", async () => {
  const root = await project();
  await writeFile(
    join(root, "_dokkurator/.doctypes/guide/definition.yml"),
    compact,
  );
  await writeFile(join(root, "guide.md"), valid);
  await writeFile(
    join(root, "broken.md"),
    "---\ndoctype: [broken\n---\nText.\n",
  );
  const app = createDokkurator({ root });
  await app.open();
  try {
    const first = await app.validate();
    expect(first.errors).toEqual([]);
    expect(first.results[0]!.documents).toEqual([
      expect.objectContaining({
        path: "broken.md",
        status: "failed",
        diagnostics: expect.arrayContaining([
          expect.objectContaining({
            phase: "parse",
            ruleId: "dokkurator/doctype",
          }),
        ]),
      }),
      expect.objectContaining({
        path: "guide.md",
        status: "passed",
        diagnostics: [],
      }),
    ]);
    await writeFile(join(root, "broken.md"), valid);
    const next = await app.validate();
    expect(
      next.results[0]!.documents.every(({ status }) => status === "passed"),
    ).toBe(true);
    await expect(access(join(root, ".dokkurator"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  } finally {
    await app.close();
  }
});

test("reports source and configuration failures separately and continues with later sources without cloning", async () => {
  const root = await project();
  await writeFile(
    join(root, "_dokkurator/.doctypes/guide/definition.yml"),
    compact,
  );
  await writeFile(join(root, "guide.md"), valid);
  await mkdir(join(root, "bad"));
  await writeFile(
    join(root, "bad/dokkurator.config.mjs"),
    "export default {validator:{rules:{'markdown/unknown':'error'}}};",
  );
  await writeFile(
    join(root, "dokkurator.config.mjs"),
    `export default {sources:[
    {id:'remote',remote:{url:'https://example.invalid/no-network'}},
    {id:'bad',path:'bad'}, {id:'root',path:'.'}
  ], documents:{include:['guide.md']}};`,
  );
  const app = createDokkurator({ root });
  await app.open();
  try {
    const result = await app.validate();
    expect(result.results).toMatchObject([
      { sourceId: "root", documents: [{ path: "guide.md", status: "passed" }] },
    ]);
    // The bad source lacks DocTypes, a load failure precedes its rule configuration.
    expect(result.errors).toMatchObject([
      { sourceId: "remote", phase: "preparation", recovery: "run-prepare" },
      { sourceId: "bad", phase: "load", recovery: "check-config" },
    ]);
    await expect(access(join(root, ".dokkurator"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(app.validate({ sourceId: "unknown" })).rejects.toThrow(
      "Unknown source",
    );
  } finally {
    await app.close();
  }
});
