#!/usr/bin/env node
import { createCommand } from "./command.js";
import { findProjectRoot, resolveActiveConfig } from "@dokkurator/config";

try {
  const root = findProjectRoot(process.env.INIT_CWD ?? process.cwd());
  const config = await resolveActiveConfig({
    root,
    includeSources: false,
    doctypesDirectory: process.env.DOKKURATOR_DOCTYPES_DIRECTORY,
    documentsDirectory: process.env.DOKKURATOR_DOCUMENTS_DIRECTORY,
  });
  await createCommand(
    {},
    {
      cwd: root,
      doctypesDirectory: config.repository.doctypes.directory,
      documentsDirectory: config.repository.documents.directory,
    },
  ).parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 1;
}
