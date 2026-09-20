import { isAbsolute, resolve } from "node:path";
import { DEFAULT_DOCUMENTS_DIRECTORY } from "@dokkurator/doctype";
import { SQLiteIndex } from "@dokkurator/index-adapter-sqlite";
import { createLocalSource } from "@dokkurator/source-adapters";
import { Command } from "commander";
import { indexDocuments } from "./index-documents.js";

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
    .description("Build the Dokkurator knowledge index")
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
    .option(
      "--index <file>",
      "SQLite index file, relative to the source root",
      ".dokkurator/index.db",
    )
    .showHelpAfterError();

  command.configureOutput({ ...output, writeOut });
  command
    .command("index")
    .description("Index all Markdown documents recursively")
    .action(async () => {
      const options = command.opts<{
        root: string;
        documentsDirectory: string;
        index: string;
      }>();
      const filename = isAbsolute(options.index)
        ? options.index
        : resolve(options.root, options.index);
      const source = await createLocalSource(options.root);
      const index = new SQLiteIndex({ filename });
      try {
        const result = await indexDocuments({
          source,
          index,
          documentsDirectory: options.documentsDirectory,
        });
        writeOut(
          `${JSON.stringify({ ...result, index: filename }, null, 2)}\n`,
        );
      } finally {
        index.close();
      }
    });

  return command;
}
