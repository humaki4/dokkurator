#!/usr/bin/env node
import { CommanderError } from "commander";
import { createCommand } from "./command.js";
import { validationExitCodes } from "./commands/validate.js";

try {
  const command = createCommand(
    {},
    { cwd: process.env.INIT_CWD ?? process.cwd() },
  );
  await command.exitOverride().parseAsync(process.argv);
  process.exitCode = validationExitCodes.get(command) ?? 0;
} catch (error) {
  if (error instanceof CommanderError) {
    process.exitCode = error.exitCode === 0 ? 0 : 1;
  } else {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`error: ${message}\n`);
    process.exitCode = 1;
  }
}
