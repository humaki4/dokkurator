#!/usr/bin/env node
import { createCommand } from "./command.js";

try {
  await createCommand(
    {},
    {
      cwd: process.env.INIT_CWD ?? process.cwd(),
      documentsDirectory: process.env.DOKKURATOR_DOCUMENTS_DIRECTORY,
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
