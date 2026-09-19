import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export type SourceId = string;

export interface SourceMetadata {
  kind: "filesystem" | "git" | "gitlab" | "github";
  path: string;
  repository?: string;
  revision?: string;
  branch?: string;
}

export interface SourceEntry {
  id: SourceId;
  path: string;
  source: SourceMetadata;
}

export interface SourceDocument extends SourceEntry {
  content: string;
}

export interface ListOptions {
  prefix?: SourceId;
}

export interface SourceAdapter {
  list(options?: ListOptions): Promise<SourceEntry[]>;
  read(id: SourceId): Promise<SourceDocument>;
}

export interface FileSystemSourceOptions {
  root: string;
}

export class FileSystemSource implements SourceAdapter {
  readonly root: string;

  constructor(options: FileSystemSourceOptions) {
    this.root = resolve(options.root);
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

    return {
      id: normalizedId,
      path: normalizedId,
      content: await readFile(path, "utf8"),
      source: {
        kind: "filesystem",
        path: normalizedId,
      },
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
          source: { kind: "filesystem", path: id },
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
