import { Command } from "commander";
import {
  DEFAULT_DOCUMENTS_DIRECTORY,
  DEFAULT_DOCTYPES_DIRECTORY,
  FileSystemSource,
  loadDocuments,
  loadDocTypes,
} from "./index.js";

export interface CommandOutput {
  writeOut?: (text: string) => void;
  writeErr?: (text: string) => void;
}

export interface CommandEnvironment {
  cwd?: string;
  doctypesDirectory?: string;
  documentsDirectory?: string;
}

export function createCommand(
  output: CommandOutput = {},
  environment: CommandEnvironment = {},
): Command {
  const writeOut =
    output.writeOut ?? ((text: string) => process.stdout.write(text));
  const command = new Command()
    .name("dokkurator-doctype")
    .description("Inspect Dokkurator document type source files")
    .version("0.0.0")
    .option(
      "--root <directory>",
      "root directory exposed by the source adapter",
      environment.cwd ?? process.cwd(),
    )
    .option(
      "--doctypes-directory <directory>",
      "DocType directory relative to the source root",
      environment.doctypesDirectory ?? DEFAULT_DOCTYPES_DIRECTORY,
    )
    .option(
      "--documents-directory <directory>",
      "documentation directory relative to the source root",
      environment.documentsDirectory ?? DEFAULT_DOCUMENTS_DIRECTORY,
    )
    .showHelpAfterError();

  command.configureOutput({ ...output, writeOut });

  command
    .command("loadDocTypes")
    .description("Load and parse all document types")
    .action(async () => {
      const options = command.opts<{
        root: string;
        doctypesDirectory: string;
      }>();
      const source = new FileSystemSource({ root: options.root });
      const docTypes = await loadDocTypes(source, {
        doctypesDirectory: options.doctypesDirectory,
      });
      writeOut(`${JSON.stringify(docTypes, null, 2)}\n`);
    });

  command
    .command("loadDocuments")
    .description("Load and parse all Markdown documents recursively")
    .action(async () => {
      const options = command.opts<{
        root: string;
        documentsDirectory: string;
      }>();
      const source = new FileSystemSource({ root: options.root });
      const documents = await loadDocuments(source, {
        documentsDirectory: options.documentsDirectory,
      });
      writeOut(`${JSON.stringify(documents, null, 2)}\n`);
    });

  return command;
}
