import { spawnSync } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDokkurator } from "@dokkurator/core";
import { afterEach, expect, test } from "vitest";

const entry = fileURLToPath(new URL("../../dist/index.js", import.meta.url));
const roots: string[] = [];
const compact =
  "name: guide\nmetadata:\n  title:\n    type: string\n    required: true\n";
const document = "---\ndoctype: guide\ntitle: Anleitung\n---\n\nText.\n";

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function project() {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-cli-integration-"));
  roots.push(root);
  return root;
}

async function source(root: string) {
  await mkdir(join(root, "_dokkurator/.doctypes/guide"), { recursive: true });
  await writeFile(
    join(root, "_dokkurator/.doctypes/guide/definition.yml"),
    compact,
  );
  await writeFile(join(root, "guide.md"), document);
}

function run(cwd: string, ...args: string[]) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd,
    encoding: "utf8",
    timeout: 15_000,
    env: {
      ...process.env,
      INIT_CWD: cwd,
      GIT_TRACE: join(roots[0]!, "git.trace"),
    },
  });
  if (result.error) throw result.error;
  expect(result.signal, result.stderr).toBeNull();
  return result;
}

test("validates a configuration-free compact project without creating state", async () => {
  const root = await project();
  await source(root);
  await mkdir(join(root, "nested/deep"), { recursive: true });
  for (const [cwd, args] of [
    [root, []],
    [join(root, "nested/deep"), ["--project", root]],
  ] as const) {
    const result = run(cwd, ...args, "validate", "--format", "json");
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).not.toContain("error:");
    expect(JSON.parse(result.stdout)).toMatchObject({
      sources: [
        {
          sourceId: "root",
          documents: [{ path: "guide.md", diagnostics: [] }],
        },
      ],
      errors: [],
    });
  }
  await expect(access(join(root, ".dokkurator"))).rejects.toMatchObject({
    code: "ENOENT",
  });
});

test("discovers legacy YAML and honors an explicit project from another project", async () => {
  const root = await project();
  await source(join(root, "repo"));
  await mkdir(join(root, ".dokkurator"));
  await mkdir(join(root, "nested"));
  await writeFile(
    join(root, ".dokkurator/config.yaml"),
    "sources:\n  - id: legacy\n    path: repo\n",
  );
  const other = await project();
  await source(other);
  for (const [cwd, args] of [
    [join(root, "nested"), []],
    [other, ["--project", root]],
  ] as const) {
    const result = run(cwd, ...args, "validate", "--format", "json");
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      sources: [{ sourceId: "legacy", documents: [{ path: "guide.md" }] }],
      errors: [],
    });
  }
  await expect(
    access(join(root, ".dokkurator/index.db")),
  ).rejects.toMatchObject({ code: "ENOENT" });
  await expect(
    access(join(root, ".dokkurator/checkouts")),
  ).rejects.toMatchObject({ code: "ENOENT" });
});

test("uses imported plugins, external schemas and source rule overrides identically to Core", async () => {
  const root = await project();
  await source(join(root, "repo"));
  await writeFile(
    join(root, "plugin.mjs"),
    `export default {rules:{todo:{
    meta:{schema:[],messages:{todo:'Complete the text.'}},
    create(context){return {text(node){if(node.value.includes('TODO'))context.report({node,messageId:'todo'});}}}
  }}};`,
  );
  await writeFile(
    join(root, "schema.mjs"),
    "export default {type:'string',format:'email'};",
  );
  await writeFile(
    join(root, "dokkurator.config.mjs"),
    `import custom from './plugin.mjs'; import owner from './schema.mjs';
    export default {sources:[{id:'docs',path:'repo'}],validator:{plugins:{custom},rules:{'custom/todo':'error'},schemas:{'https://example.test/owner':owner}}};`,
  );
  await writeFile(
    join(root, "repo/dokkurator.config.mjs"),
    "export default {validator:{rules:{'custom/todo':'warn'}}};",
  );
  await writeFile(
    join(root, "repo/_dokkurator/.doctypes/guide/definition.yml"),
    compact + "  owner:\n    $ref: https://example.test/owner\n",
  );
  await writeFile(
    join(root, "repo/guide.md"),
    document
      .replace("title: Anleitung", "title: Anleitung\nowner: invalid")
      .replace("Text.", "TODO: ergänzen."),
  );
  const app = createDokkurator({ root });
  await app.open();
  try {
    const core = await app.validate();
    const result = run(root, "validate", "--format", "json");
    expect(result.status, result.stderr).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.errors).toEqual(core.errors);
    expect(report.sources[0].documents[0].diagnostics).toEqual(
      core.results[0]!.documents[0]!.diagnostics,
    );
    expect(report.results[0]).toMatchObject({ errorCount: 1, warningCount: 1 });
    expect(report.sources[0].documents[0].diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "custom/todo", severity: "warning" }),
        expect.objectContaining({
          ruleId: "dokkurator/metadata-schema",
          severity: "error",
        }),
      ]),
    );
  } finally {
    await app.close();
  }
});

test("keeps successful sources and separates document YAML, config and missing checkout errors without Git operations", async () => {
  const root = await project();
  for (const id of ["good", "yaml", "bad"]) await source(join(root, id));
  await writeFile(
    join(root, "yaml/guide.md"),
    "---\ndoctype: [broken\n---\nText.\n",
  );
  await writeFile(
    join(root, "bad/dokkurator.config.mjs"),
    "export default {validator:{rules:{'markdown/unknown':'error'}}};",
  );
  const remote = join(root, "remote.git");
  const git = spawnSync("git", ["init", "--bare", remote], {
    encoding: "utf8",
  });
  if (git.error) throw git.error;
  expect(git.status, git.stderr).toBe(0);
  await writeFile(
    join(root, "dokkurator.config.mjs"),
    `export default {sources:[
    {id:'remote',remote:{url:${JSON.stringify(remote)}}},
    {id:'bad',path:'bad'},{id:'yaml',path:'yaml'},{id:'good',path:'good'}]};`,
  );
  const result = run(root, "validate", "--format", "json");
  expect(result.status, result.stderr).toBe(1);
  expect(result.stderr).not.toContain("error:");
  const report = JSON.parse(result.stdout);
  expect(
    report.sources.map(({ sourceId }: { sourceId: string }) => sourceId),
  ).toEqual(["yaml", "good"]);
  expect(report.sources[0].documents[0].diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ phase: "parse" })]),
  );
  expect(report.sources[1].documents[0].diagnostics).toEqual([]);
  expect(report.errors).toMatchObject([
    { sourceId: "remote", phase: "preparation", recovery: "run-prepare" },
    { sourceId: "bad", phase: "configuration", recovery: "check-config" },
  ]);
  const selected = run(root, "validate", "good", "--format", "json");
  expect(selected.status, selected.stderr).toBe(0);
  expect(JSON.parse(selected.stdout)).toMatchObject({
    sources: [{ sourceId: "good" }],
    errors: [],
  });
  expect(JSON.parse(selected.stdout).sources).toHaveLength(1);
  expect(JSON.parse(selected.stdout).results).toHaveLength(1);
  const missing = run(root, "validate", "remote");
  expect(missing.status).toBe(1);
  expect(missing.stdout).toContain("run-prepare");
  await expect(access(join(root, ".dokkurator"))).rejects.toMatchObject({
    code: "ENOENT",
  });
  const trace = await readFile(join(root, "git.trace"), "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return "";
      throw error;
    },
  );
  expect(trace).not.toMatch(/\b(clone|fetch)\b/);
});
