#!/usr/bin/env node
import { createCommand } from "./command.js";

try {
  await createCommand(
    {},
    {
      documentsDirectory: process.env.DOKKURATOR_DOCUMENTS_DIRECTORY,
    },
  ).parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 1;
}
