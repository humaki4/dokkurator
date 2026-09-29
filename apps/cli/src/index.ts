#!/usr/bin/env node
import { createCommand } from "./command.js";

try {
  await createCommand(
    {},
    { cwd: process.env.INIT_CWD ?? process.cwd() },
  ).parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 1;
}
