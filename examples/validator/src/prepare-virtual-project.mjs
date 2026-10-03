import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";

// Example preparation only: Core currently needs a file source for editor text.
/** @param {string} text */
export async function prepareVirtualProject(text) {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-editor-"));
  const cleanup = () => rm(root, { recursive: true, force: true });
  try {
    await cp(
      fileURLToPath(new URL("../_dokkurator/", import.meta.url)),
      join(root, "_dokkurator"),
      { recursive: true },
    );
    await mkdir(join(root, "virtual"));
    await writeFile(join(root, "virtual/guide.md"), text);
    // Link the real config; keep configuration decisions out of this helper.
    const configUrl = new URL(
      "./virtual.dokkurator.config.mjs",
      import.meta.url,
    ).href;
    await writeFile(
      join(root, "dokkurator.config.mjs"),
      `export { default } from ${JSON.stringify(configUrl)};\n`,
    );
    return { root, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
