import {
  DEFAULT_DOCUMENTS_DIRECTORY,
  loadDocuments,
} from "@dokkurator/doctype";
import { createLocalSource } from "@dokkurator/source-adapters";
import { Command } from "commander";
import { buildKnowledgeDocuments } from "./index.js";

export interface CommandOutput {
  writeOut?: (text: string) => void;
  writeErr?: (text: string) => void;
}

export interface CommandEnvironment {
  cwd?: string;
  documentsDirectory?: string;
}

export function createCommand(
  output: CommandOutput = {},
  environment: CommandEnvironment = {},
): Command {
  const writeOut =
    output.writeOut ?? ((text: string) => process.stdout.write(text));
  const command = new Command()
    .name("dokkurator-knowledge")
    .description("Build Dokkurator knowledge documents")
    .version("0.0.0")
    .option(
      "--root <directory>",
      "root directory exposed by the source adapter",
      environment.cwd ?? process.cwd(),
    )
    .option(
      "--documents-directory <directory>",
      "documentation directory relative to the source root",
      environment.documentsDirectory ?? DEFAULT_DOCUMENTS_DIRECTORY,
    )
    .showHelpAfterError();

  command.configureOutput({ ...output, writeOut });

  command
    .command("loadDocuments")
    .description("Load and transform all Markdown documents recursively")
    .action(async () => {
      const options = command.opts<{
        root: string;
        documentsDirectory: string;
      }>();
      const source = await createLocalSource(options.root);
      const parsedDocuments = await loadDocuments(source, {
        documentsDirectory: options.documentsDirectory,
      });
      writeOut(
        `${JSON.stringify(buildKnowledgeDocuments(parsedDocuments), null, 2)}\n`,
      );
    });

  return command;
}
