import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
  SourceNotFoundError,
  type ListOptions,
  type SourceAdapter,
  type SourceDocument,
  type SourceEntry,
  type SourceDiff,
  type SourceDiffOptions,
  type SourceId,
  type SourceState,
} from "./source-adapter.js";
import {
  contentHash,
  diffFileStates,
  fileStateRevision,
} from "./source-diff.js";

export interface FileSystemSourceOptions {
  readonly root: string;
  readonly sourceId?: string;
}

export class FileSystemSource implements SourceAdapter {
  readonly root: string;
  readonly sourceId: string;

  constructor(options: FileSystemSourceOptions) {
    this.root = resolve(options.root);
    this.sourceId = options.sourceId ?? this.root;
  }

  async getSourceId(): Promise<string> {
    return this.sourceId;
  }

  async list(options: ListOptions = {}): Promise<SourceEntry[]> {
    const prefix = options.prefix ?? "";
    const start = this.resolveId(prefix);
    const entries: SourceEntry[] = [];

    await this.collectEntries(start, entries);
    return entries.sort((left, right) => left.id.localeCompare(right.id));
  }

  async read(id: SourceId): Promise<SourceDocument> {
    const path = this.resolveId(id);
    const normalizedId = this.toSourceId(path);

    let content: string;
    try {
      content = await readFile(path, "utf8");
    } catch (error) {
      if (isFileNotFoundError(error)) {
        throw new SourceNotFoundError(normalizedId, { cause: error });
      }
      throw error;
    }

    return {
      id: normalizedId,
      path: normalizedId,
      content,
      source: {
        sourceId: this.sourceId,
        kind: "filesystem",
        path: normalizedId,
      },
    };
  }

  async diff(
    previous?: SourceState,
    options: SourceDiffOptions = {},
  ): Promise<SourceDiff> {
    if (previous !== undefined && previous.sourceId !== this.sourceId)
      throw new Error(
        `Cannot diff source ${this.sourceId} from state ${previous.sourceId}`,
      );
    if (previous !== undefined && previous.files === undefined)
      throw new Error("Filesystem source state requires file hashes");
    assertSameScope(previous, options);

    const files = await Promise.all(
      (await this.list({ prefix: options.prefix }))
        .filter(({ id }) => !isExcluded(id, options.excludeDirectories ?? []))
        .map(async ({ id }) => ({
          path: id,
          hash: contentHash((await this.read(id)).content),
        })),
    );
    const state: SourceState = {
      sourceId: this.sourceId,
      revision: fileStateRevision(files),
      scope: options,
      files,
    };
    return {
      sourceId: this.sourceId,
      ...(previous === undefined ? {} : { fromRevision: previous.revision }),
      state,
      changes: diffFileStates(previous?.files ?? [], files),
    };
  }

  private async collectEntries(
    directory: string,
    entries: SourceEntry[],
  ): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);

      if (entry.isDirectory()) {
        await this.collectEntries(path, entries);
      } else if (entry.isFile()) {
        const id = this.toSourceId(path);
        entries.push({
          id,
          path: id,
          source: {
            sourceId: this.sourceId,
            kind: "filesystem",
            path: id,
          },
        });
      }
    }
  }

  private resolveId(id: SourceId): string {
    const path = resolve(this.root, id);
    const pathFromRoot = relative(this.root, path);

    if (
      isAbsolute(pathFromRoot) ||
      pathFromRoot === ".." ||
      pathFromRoot.startsWith(`..${sep}`)
    ) {
      throw new Error(`Source path escapes its root: ${id}`);
    }

    return path;
  }

  private toSourceId(path: string): SourceId {
    return relative(this.root, path).split(sep).join("/");
  }
}

function isExcluded(path: string, directories: readonly string[]): boolean {
  const segments = path.split("/");
  return directories.some((directory) =>
    segments.includes(directory.replace(/^\/+|\/+$/gu, "")),
  );
}

function assertSameScope(
  previous: SourceState | undefined,
  options: SourceDiffOptions,
): void {
  if (
    previous?.scope !== undefined &&
    JSON.stringify(previous.scope) !== JSON.stringify(options)
  )
    throw new Error("Cannot diff source states created with different scopes");
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
