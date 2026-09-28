#!/usr/bin/env node
import { createCommand } from "./command.js";
import {
  findProjectRoot,
  loadConfig,
  resolveContent,
} from "@dokkurator/config";

try {
  const root = findProjectRoot(process.env.INIT_CWD ?? process.cwd());
  const content = resolveContent((await loadConfig(root)).config);
  await createCommand(
    {},
    {
      cwd: root,
      doctypesDirectory:
        process.env.DOKKURATOR_DOCTYPES_DIRECTORY ?? content.doctypes.directory,
      documentsDirectory:
        process.env.DOKKURATOR_DOCUMENTS_DIRECTORY ??
        content.documents.directory,
    },
  ).parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`error: ${message}\n`);
  process.exitCode = 1;
}
