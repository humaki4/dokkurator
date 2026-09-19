#!/usr/bin/env node
import { createCommand } from "./command.js";

try {
  await createCommand().parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 1;
}
