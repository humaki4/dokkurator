import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import {
  findProjectRoot,
  readSources,
  resolveActiveConfig,
  resolveProjectConfig,
  resolveSourceConfig,
  updateSources,
} from "./index.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function project(config: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "validator-config-"));
  roots.push(root);
  await writeFile(join(root, "dokkurator.config.mjs"), config);
  return root;
}

const pluginModule = `export default { rules: { local: { meta: { schema: [] }, create() { return {}; } } } };`;

test("loads imported project plugins and merges source-local rule overrides", async () => {
  const root =
    await project(`import shared from './shared.mjs'; export default {
    sources: [{id:'root',path:'.'}, {id:'repo',path:'repo'}],
    validator: {plugins:{shared}, rules:{'shared/local':['error', {project:true}], 'markdown/no-duplicate-headings':'warn'}}
  };`);
  await writeFile(join(root, "shared.mjs"), pluginModule);
  await mkdir(join(root, "repo"));
  await writeFile(join(root, "repo/local.mjs"), pluginModule);
  await writeFile(
    join(root, "repo/dokkurator.config.mjs"),
    `import shared from '../shared.mjs'; import local from './local.mjs'; export default {
    validator:{plugins:{shared,local},rules:{'shared/local':'off','local/local':'error'}}
  };`,
  );
  const config = await resolveActiveConfig({ root });
  expect(findProjectRoot(join(root, "repo", "nested"))).toBe(
    join(root, "repo"),
  );
  expect(config.repository.validator.rules["shared/local"]).toEqual([
    "error",
    { project: true },
  ]);
  expect(config.sources[0]!.validator.plugins.shared).toBe(
    config.repository.validator.plugins.shared,
  );
  const repo = config.sources[1]!.validator;
  expect(repo.rules).toEqual({
    "shared/local": "off",
    "local/local": "error",
    "markdown/no-duplicate-headings": "warn",
  });
  expect(repo.plugins.shared).toBe(config.repository.validator.plugins.shared);
  expect(typeof repo.plugins.local!.rules!.local!.create).toBe("function");
  repo.rules["markdown/no-duplicate-headings"] = "off";
  expect(
    config.repository.validator.rules["markdown/no-duplicate-headings"],
  ).toBe("warn");
});

test("rejects conflicting plugins under a shared namespace", async () => {
  const root = await project(
    `export default {sources:[{id:'repo',path:'repo'}], validator:{plugins:{company:{rules:{}}}}};`,
  );
  await mkdir(join(root, "repo"));
  await writeFile(
    join(root, "repo/dokkurator.config.mjs"),
    `export default {validator:{plugins:{company:{rules:{}}}}};`,
  );
  await expect(resolveActiveConfig({ root })).rejects.toThrow(
    "Conflicting validator plugins in namespace: company",
  );
});

test("loads source config only after project preparation", async () => {
  const root = await project(
    `export default {sources:[{id:'repo',path:'repo'}],validator:{rules:{'markdown/no-duplicate-headings':'error'}}};`,
  );
  const prepared = await resolveProjectConfig({ root });
  await mkdir(join(root, "repo"));
  await writeFile(
    join(root, "repo/dokkurator.config.mjs"),
    `export default {validator:{rules:{'markdown/no-duplicate-headings':'off'}}};`,
  );
  expect(
    (await resolveSourceConfig(prepared, prepared.sources[0]!)).validator.rules[
      "markdown/no-duplicate-headings"
    ],
  ).toBe("off");
});

test("source administration preserves executable config and uses a data sidecar", async () => {
  const text = `import plugin from './plugin.mjs'; export default {sources:[{id:'first',path:'.'}],validator:{plugins:{custom:plugin},rules:{'custom/local':'error'}}};`;
  const root = await project(text);
  await writeFile(join(root, "plugin.mjs"), pluginModule);
  await updateSources(root, (sources) => [
    ...sources,
    { id: "second", path: "repo" },
  ]);
  expect(await readFile(join(root, "dokkurator.config.mjs"), "utf8")).toBe(
    text,
  );
  expect((await readSources(root)).map((source) => source.id)).toEqual([
    "first",
    "second",
  ]);
  expect(
    await readFile(join(root, ".dokkurator/sources.yaml"), "utf8"),
  ).toContain("second");
  expect(
    (await resolveProjectConfig({ root })).repository.validator.rules[
      "custom/local"
    ],
  ).toBe("error");
  await updateSources(root, () => []);
  expect(await readSources(root)).toEqual([]);
});

test("JavaScript config takes precedence over legacy YAML", async () => {
  const root = await project(
    `export default {documents:{directory:'javascript'}};`,
  );
  await mkdir(join(root, ".dokkurator"));
  await writeFile(
    join(root, ".dokkurator/config.yaml"),
    "documents:\n  directory: yaml\n",
  );
  expect(
    (await resolveProjectConfig({ root, includeSources: false })).repository
      .documents.directory,
  ).toBe("javascript");
});

test.each([
  "export default null;",
  'export default {validator:{plugins:{custom:"not imported"}}};',
  "export default {validator:{plugins:{dokkurator:{}}}};",
  'export default {validator:{rules:{"custom/local":"invalid"}}};',
  'throw new Error("broken module");',
])("rejects invalid JavaScript config: %s", async (text) => {
  const root = await project(text);
  await expect(resolveProjectConfig({ root })).rejects.toThrow();
});
