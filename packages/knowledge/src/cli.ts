#!/usr/bin/env node
import { createCommand } from "./command.js";
import { findProjectRoot, resolveActiveConfig } from "@dokkurator/config";

try {
  const root = findProjectRoot(process.env.INIT_CWD ?? process.cwd());
  const active = await resolveActiveConfig({
    root,
    includeSources: false,
    documentsDirectory: process.env.DOKKURATOR_DOCUMENTS_DIRECTORY,
  });
  await createCommand(
    {},
    {
      cwd: root,
      documentsDirectory: active.repository.documents.directory,
      index: active.knowledge.index,
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
