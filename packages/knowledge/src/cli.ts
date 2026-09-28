#!/usr/bin/env node
import { createCommand } from "./command.js";
import {
  DEFAULT_CONFIG,
  findProjectRoot,
  loadConfig,
  resolveContent,
} from "@dokkurator/config";

try {
  const root = findProjectRoot(process.env.INIT_CWD ?? process.cwd());
  const loaded = await loadConfig(root);
  const content = resolveContent(loaded.config);
  await createCommand(
    {},
    {
      cwd: root,
      documentsDirectory:
        process.env.DOKKURATOR_DOCUMENTS_DIRECTORY ??
        content.documents.directory,
      index: loaded.config.knowledge?.index ?? DEFAULT_CONFIG.knowledge.index,
    },
  ).parseAsync(withoutPnpmArgumentSeparator(process.argv));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = process.argv.includes("--exit-code") ? 2 : 1;
}

/** pnpm preserves the conventional `--` before script arguments. */
function withoutPnpmArgumentSeparator(argv: readonly string[]): string[] {
  return argv[2] === "--" ? [...argv.slice(0, 2), ...argv.slice(3)] : [...argv];
}
