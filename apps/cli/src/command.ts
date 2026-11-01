import { resolve } from "node:path";
import { Command } from "commander";
import { addDocTypeCommands } from "./commands/doctype.js";
import { addKnowledgeCommands } from "./commands/knowledge.js";
import { addPrepareCommand } from "./commands/prepare.js";
import { addSourceCommands } from "./commands/source.js";
import { addWatchCommand } from "./commands/watch.js";
import { addValidateCommand } from "./commands/validate.js";
import { findProjectRoot } from "@dokkurator/config";

export interface CommandOutput {
  writeOut?: (text: string) => void;
  writeErr?: (text: string) => void;
}

export interface CommandEnvironment {
  cwd?: string;
}

export type WriteOutput = (text: string) => void;

export function createCommand(
  output: CommandOutput = {},
  environment: CommandEnvironment = {},
): Command {
  const writeOut =
    output.writeOut ?? ((text: string) => process.stdout.write(text));
  const writeErr =
    output.writeErr ?? ((text: string) => process.stderr.write(text));
  const cwd = resolve(environment.cwd ?? process.cwd());
  const command = new Command()
    .name("dokkurator")
    .description("Manage and process Dokkurator projects")
    .version("0.0.0")
    .option(
      "--project <directory>",
      "project containing .dokkurator",
      findProjectRoot(cwd),
    )
    .showHelpAfterError();
  command.configureOutput({ ...output, writeOut, writeErr });

  addSourceCommands(command, writeOut);
  addPrepareCommand(command, writeOut, writeErr);
  addValidateCommand(command, writeErr);
  addKnowledgeCommands(command, writeOut, writeErr);
  addDocTypeCommands(command, writeOut, writeErr);
  addWatchCommand(command, writeOut, writeErr);
  return command;
}
