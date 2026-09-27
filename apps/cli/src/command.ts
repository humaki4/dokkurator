import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import {
  createConfiguredLocalSource,
  DEFAULT_DOCUMENTS_DIRECTORY,
  DEFAULT_DOCTYPES_DIRECTORY,
  loadDocTypes,
  loadDocuments,
} from "@dokkurator/doctype";
import {
  calculateDocumentDiff,
  indexDocumentChanges,
  parseSearchExpression,
  SQLiteIndex,
} from "@dokkurator/knowledge";
import { Command } from "commander";
import {
  loadConfig,
  resolveSourcePath,
  saveConfig,
  type LoadedConfig,
  type SourceConfig,
} from "./config.js";
import { ask, confirm } from "./prompts.js";

export interface CommandOutput {
  writeOut?: (text: string) => void;
  writeErr?: (text: string) => void;
}
export interface CommandEnvironment {
  cwd?: string;
}

export function createCommand(
  output: CommandOutput = {},
  environment: CommandEnvironment = {},
): Command {
  const writeOut =
    output.writeOut ?? ((text: string) => process.stdout.write(text));
  const cwd = resolve(environment.cwd ?? process.cwd());
  const command = new Command()
    .name("dokkurator")
    .description("Manage and process Dokkurator projects")
    .version("0.0.0")
    .option("--project <directory>", "project containing .dokkurator", cwd)
    .showHelpAfterError();
  command.configureOutput({ ...output, writeOut });

  addSourceCommands(command, writeOut);
  addKnowledgeCommands(command, writeOut);
  addDocTypeCommands(command, writeOut);
  return command;
}

function addSourceCommands(command: Command, writeOut: (text: string) => void) {
  const source = command
    .command("source")
    .description("Manage configured repositories");
  source
    .command("list")
    .option("--json", "output JSON")
    .action(async ({ json }: { json?: boolean }) => {
      const loaded = await currentConfig(command);
      if (json)
        return writeOut(`${JSON.stringify(loaded.config.sources, null, 2)}\n`);
      if (loaded.config.sources.length === 0)
        return writeOut("No sources configured.\n");
      for (const item of loaded.config.sources)
        writeOut(`${item.id}\t${item.path}\n`);
    });
  source
    .command("add [path]")
    .option("--id <id>", "stable source id")
    .action(
      async (pathArgument: string | undefined, options: { id?: string }) => {
        const loaded = await currentConfig(command);
        const path = pathArgument ?? (await ask("Repository path: "));
        const absolutePath = resolve(loaded.projectRoot, path);
        if (!existsSync(absolutePath))
          throw new Error(`Source path does not exist: ${absolutePath}`);
        const suggestedId = defaultId(absolutePath);
        const enteredId =
          options.id ?? (await ask(`Source id (${suggestedId}): `));
        const id = enteredId || suggestedId;
        if (loaded.config.sources.some((item) => item.id === id))
          throw new Error(`Source id already exists: ${id}`);
        const configuredPath =
          relative(loaded.projectRoot, absolutePath) || ".";
        await saveConfig({
          ...loaded,
          config: {
            sources: [...loaded.config.sources, { id, path: configuredPath }],
          },
        });
        writeOut(`Added ${id} (${configuredPath}).\n`);
      },
    );
  source
    .command("remove [id]")
    .option("--yes", "skip confirmation")
    .action(
      async (idArgument: string | undefined, options: { yes?: boolean }) => {
        const loaded = await currentConfig(command);
        const id = idArgument ?? (await ask("Source id: "));
        if (!loaded.config.sources.some((item) => item.id === id))
          throw new Error(`Unknown source: ${id}`);
        if (
          !options.yes &&
          !(await confirm(`Remove ${id} from the configuration?`))
        )
          return writeOut("Cancelled.\n");
        await saveConfig({
          ...loaded,
          config: {
            sources: loaded.config.sources.filter((item) => item.id !== id),
          },
        });
        writeOut(
          `Removed ${id} from the configuration. Existing index data was kept.\n`,
        );
      },
    );
}

function addKnowledgeCommands(
  command: Command,
  writeOut: (text: string) => void,
) {
  command
    .command("index [source-id]")
    .option(
      "--documents-directory <directory>",
      "documents directory",
      DEFAULT_DOCUMENTS_DIRECTORY,
    )
    .option("--index <file>", "SQLite index file", ".dokkurator/index.db")
    .action(
      async (
        sourceId: string | undefined,
        options: { documentsDirectory: string; index: string },
      ) => {
        const loaded = await currentConfig(command);
        const filename = indexFilename(loaded, options.index);
        const index = new SQLiteIndex({ filename });
        try {
          for (const item of selectSources(loaded, sourceId)) {
            const adapter = await configuredSource(loaded, item);
            const result = await indexDocumentChanges({
              source: adapter,
              index,
              documentsDirectory: options.documentsDirectory,
            });
            writeOut(
              `${item.id}: ${result.indexedDocuments} indexed, ${result.removedDocuments} removed\n`,
            );
          }
        } finally {
          index.close();
        }
      },
    );
  command
    .command("diff [source-id]")
    .option(
      "--documents-directory <directory>",
      "documents directory",
      DEFAULT_DOCUMENTS_DIRECTORY,
    )
    .option("--index <file>", "SQLite index file", ".dokkurator/index.db")
    .action(
      async (
        sourceId: string | undefined,
        options: { documentsDirectory: string; index: string },
      ) => {
        const loaded = await currentConfig(command);
        const filename = indexFilename(loaded, options.index);
        const index = existsSync(filename)
          ? new SQLiteIndex({ filename, readOnly: true })
          : undefined;
        try {
          for (const item of selectSources(loaded, sourceId)) {
            const diff = await calculateDocumentDiff({
              source: await configuredSource(loaded, item),
              index: index ?? { getSourceState: async () => undefined },
              documentsDirectory: options.documentsDirectory,
            });
            writeOut(`${item.id}: ${diff.changes.length} changes\n`);
            for (const change of diff.changes)
              writeOut(`  ${change.type}\t${change.path}\n`);
          }
        } finally {
          index?.close();
        }
      },
    );
  command
    .command("search <query...>")
    .option("--limit <number>", "maximum results", positiveInteger, 20)
    .option("--index <file>", "SQLite index file", ".dokkurator/index.db")
    .action(
      async (parts: string[], options: { limit: number; index: string }) => {
        const loaded = await currentConfig(command);
        const index = new SQLiteIndex({
          filename: indexFilename(loaded, options.index),
          readOnly: true,
        });
        try {
          writeOut(
            `${JSON.stringify(
              await index.search({
                expression: parseSearchExpression(parts.join(" ")),
                limit: options.limit,
              }),
              null,
              2,
            )}\n`,
          );
        } finally {
          index.close();
        }
      },
    );
}

function addDocTypeCommands(
  command: Command,
  writeOut: (text: string) => void,
) {
  const doctype = command
    .command("doctype")
    .description("Inspect parsed document sources");
  doctype
    .command("list [source-id]")
    .option(
      "--directory <directory>",
      "DocType directory",
      DEFAULT_DOCTYPES_DIRECTORY,
    )
    .action(
      async (sourceId: string | undefined, options: { directory: string }) => {
        await forEachSource(command, sourceId, async (item, loaded) => {
          const doctypes = await loadDocTypes(
            await configuredSource(loaded, item),
            { doctypesDirectory: options.directory },
          );
          writeOut(
            `${JSON.stringify({ sourceId: item.id, doctypes }, null, 2)}\n`,
          );
        });
      },
    );
  doctype
    .command("documents [source-id]")
    .option(
      "--directory <directory>",
      "documents directory",
      DEFAULT_DOCUMENTS_DIRECTORY,
    )
    .action(
      async (sourceId: string | undefined, options: { directory: string }) => {
        await forEachSource(command, sourceId, async (item, loaded) => {
          const documents = await loadDocuments(
            await configuredSource(loaded, item),
            { documentsDirectory: options.directory },
          );
          writeOut(
            `${JSON.stringify({ sourceId: item.id, documents }, null, 2)}\n`,
          );
        });
      },
    );
}

async function currentConfig(command: Command): Promise<LoadedConfig> {
  return loadConfig(command.opts<{ project: string }>().project);
}
function selectSources(
  loaded: LoadedConfig,
  id?: string,
): readonly SourceConfig[] {
  if (loaded.config.sources.length === 0)
    throw new Error(`No sources configured in ${loaded.filename}`);
  if (id === undefined) return loaded.config.sources;
  const found = loaded.config.sources.find((item) => item.id === id);
  if (found === undefined) throw new Error(`Unknown source: ${id}`);
  return [found];
}
async function configuredSource(loaded: LoadedConfig, item: SourceConfig) {
  return createConfiguredLocalSource({
    root: resolveSourcePath(loaded, item),
    sourceId: item.id,
  });
}
async function forEachSource(
  command: Command,
  id: string | undefined,
  operation: (item: SourceConfig, loaded: LoadedConfig) => Promise<void>,
) {
  const loaded = await currentConfig(command);
  for (const item of selectSources(loaded, id)) await operation(item, loaded);
}
function indexFilename(loaded: LoadedConfig, filename: string): string {
  return isAbsolute(filename)
    ? filename
    : resolve(loaded.projectRoot, filename);
}
function defaultId(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).at(-1) ?? "source";
}
function positiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new Error(`Expected a positive integer: ${value}`);
  return parsed;
}
