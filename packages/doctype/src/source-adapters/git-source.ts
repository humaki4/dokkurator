import { stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import {
  simpleGit,
  type FileStatusResult,
  type SimpleGit,
  type StatusResult,
} from "simple-git";
import {
  SourceNotFoundError,
  type GitFileStatus,
  type GitSourceMetadata,
  type ListOptions,
  type SourceAdapter,
  type SourceDocument,
  type SourceEntry,
  type SourceId,
  type SourceMetadata,
} from "./source-adapter.js";
import { readFile } from "node:fs/promises";

export interface GitSourceOptions {
  readonly root: string;
}

interface RepositoryContext {
  readonly root: string;
  readonly sourcePrefix: string;
  readonly repository?: string;
  readonly headRevision?: string;
  readonly branch?: string;
}

interface LastCommit {
  readonly revision: string;
  readonly committedAt: Date;
  readonly author: { readonly name: string; readonly email: string };
}

/** Reads the current working tree and enriches every source with local Git data. */
export class GitSource implements SourceAdapter {
  readonly root: string;
  private readonly git: SimpleGit;
  private readonly metadataCache = new Map<SourceId, SourceMetadata>();

  constructor(options: GitSourceOptions) {
    this.root = resolve(options.root);
    this.git = simpleGit({ baseDir: this.root, maxConcurrentProcesses: 6 });
  }

  async list(options: ListOptions = {}): Promise<SourceEntry[]> {
    this.metadataCache.clear();
    const context = await this.repositoryContext();
    const prefix = normalizeId(options.prefix ?? "");
    this.resolveId(prefix);
    const sourcePath = prefix || ".";
    const output = await this.git.raw([
      "ls-files",
      "-z",
      "--full-name",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      sourcePath,
    ]);
    const status = await this.git.status();
    const ids = (
      await Promise.all(
        output
          .split("\0")
          .filter(Boolean)
          .map((path) => this.toExistingSourceId(context, path)),
      )
    ).filter((id): id is SourceId => id !== undefined);

    return Promise.all(
      ids.sort().map(async (id) => {
        const source = await this.sourceMetadata(id, context, status);
        this.metadataCache.set(id, source);
        return { id, path: id, source };
      }),
    );
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

    const cachedMetadata = this.metadataCache.get(normalizedId);
    if (cachedMetadata) {
      this.metadataCache.delete(normalizedId);
      return {
        id: normalizedId,
        path: normalizedId,
        content,
        source: cachedMetadata,
      };
    }

    const context = await this.repositoryContext();
    return {
      id: normalizedId,
      path: normalizedId,
      content,
      source: await this.sourceMetadata(
        normalizedId,
        context,
        await this.git.status(),
      ),
    };
  }

  private async repositoryContext(): Promise<RepositoryContext> {
    const repositoryRoot = resolve(
      await this.git.revparse(["--show-toplevel"]),
    );
    const sourcePrefix = toPosixPath(relative(repositoryRoot, this.root));
    if (sourcePrefix === ".." || sourcePrefix.startsWith("../")) {
      throw new Error(
        `Source root is outside its Git repository: ${this.root}`,
      );
    }

    const [headRevision, branch, remotes] = await Promise.all([
      optional(() => this.git.revparse(["HEAD"])),
      optional(() => this.git.revparse(["--abbrev-ref", "HEAD"])),
      this.git.getRemotes(true),
    ]);
    const remote = remotes.find(({ name }) => name === "origin") ?? remotes[0];

    return {
      root: repositoryRoot,
      sourcePrefix,
      repository: remote?.refs.fetch || remote?.refs.push || undefined,
      headRevision,
      branch: branch === "HEAD" ? undefined : branch,
    };
  }

  private async sourceMetadata(
    id: SourceId,
    context: RepositoryContext,
    status: StatusResult,
  ): Promise<SourceMetadata> {
    const repositoryPath = joinGitPath(context.sourcePrefix, id);
    const lastCommit = await this.lastCommit(repositoryPath);
    const git: GitSourceMetadata = {
      root: context.root,
      headRevision: context.headRevision,
      branch: context.branch,
      fileRevision: lastCommit?.revision,
      status: fileStatus(status, repositoryPath),
      committedAt: lastCommit?.committedAt,
      author: lastCommit?.author,
    };

    return {
      kind: "git",
      path: id,
      repository: context.repository,
      git,
    };
  }

  private async lastCommit(path: string): Promise<LastCommit | undefined> {
    const value = await optional(() =>
      this.git.raw([
        "log",
        "-1",
        "--format=%H%x00%cI%x00%an%x00%ae",
        "--",
        path,
      ]),
    );
    if (!value) return undefined;

    const [revision, date, name, email] = value.trim().split("\0");
    if (!revision || !date) return undefined;
    return {
      revision,
      committedAt: new Date(date),
      author: { name, email },
    };
  }

  private async toExistingSourceId(
    context: RepositoryContext,
    repositoryPath: string,
  ): Promise<SourceId | undefined> {
    const id = context.sourcePrefix
      ? relativeGitPath(context.sourcePrefix, repositoryPath)
      : repositoryPath;
    if (id === undefined) return undefined;

    try {
      return (await stat(this.resolveId(id))).isFile()
        ? normalizeId(id)
        : undefined;
    } catch (error) {
      if (isFileNotFoundError(error)) return undefined;
      throw error;
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
    return toPosixPath(relative(this.root, path));
  }
}

function fileStatus(status: StatusResult, path: string): GitFileStatus {
  const entry = status.files.find(
    (candidate) => candidate.path === path || candidate.from === path,
  );
  if (!entry) return "clean";
  if (status.conflicted.includes(entry.path) || isConflict(entry)) {
    return "conflicted";
  }
  if (entry.index === "?" && entry.working_dir === "?") return "untracked";
  if (entry.index === "R" || entry.working_dir === "R") return "renamed";
  if (entry.index === "D" || entry.working_dir === "D") return "deleted";
  if (entry.index === "A") return "added";
  return "modified";
}

function isConflict(entry: FileStatusResult): boolean {
  return new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]).has(
    `${entry.index}${entry.working_dir}`,
  );
}

function joinGitPath(...parts: string[]): string {
  return parts.filter(Boolean).join("/");
}

function relativeGitPath(prefix: string, path: string): string | undefined {
  if (path === prefix) return "";
  return path.startsWith(`${prefix}/`)
    ? path.slice(prefix.length + 1)
    : undefined;
}

function normalizeId(id: string): SourceId {
  return id.split(sep).join("/").replace(/^\.\//, "");
}

function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

async function optional<T>(
  operation: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch {
    return undefined;
  }
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
