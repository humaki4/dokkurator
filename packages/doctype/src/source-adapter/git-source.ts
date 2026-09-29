import { existsSync } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
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
  type ReadOptions,
  type SourceAdapter,
  type SourceDiff,
  type SourceDiffOptions,
  type SourceDocument,
  type SourceEntry,
  type SourceFileState,
  type SourceId,
  type SourceMetadata,
  type SourceState,
} from "./source-adapter.js";
import { diffFileStates } from "./source-diff.js";

export interface GitSourceOptions {
  readonly root: string;
  readonly sourceId?: string;
}

export interface GitCheckoutOptions extends GitSourceOptions {
  readonly url: string;
  readonly branch?: string;
  readonly update?: boolean;
}

/** Returns whether root itself is a Git repository, not merely inside one. */
export async function isGitRepositoryRoot(root: string): Promise<boolean> {
  if (!existsSync(root)) return false;
  const git = simpleGit({ baseDir: resolve(root) });
  if (!(await git.checkIsRepo())) return false;
  return resolve(await git.revparse(["--show-toplevel"])) === resolve(root);
}

/** Clones or updates a managed checkout and exposes it as a Git source. */
export async function createGitCheckoutSource({
  root,
  url,
  branch,
  sourceId,
  update = true,
}: GitCheckoutOptions): Promise<SourceAdapter> {
  await mkdir(resolve(root), { recursive: true });
  const source = new GitSource({ root, sourceId });
  await source.checkout({ url, branch, update });
  return source;
}

interface RepositoryContext {
  readonly sourceId: string;
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
  private readonly configuredSourceId?: string;
  private readonly metadataCache = new Map<SourceId, SourceMetadata>();

  constructor(options: GitSourceOptions) {
    this.root = resolve(options.root);
    this.configuredSourceId = options.sourceId;
    this.git = simpleGit({ baseDir: this.root, maxConcurrentProcesses: 6 });
  }

  async getSourceId(): Promise<string> {
    return (await this.repositoryContext()).sourceId;
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

  async read(id: SourceId, options: ReadOptions = {}): Promise<SourceDocument> {
    if (options.revision !== undefined)
      return this.readCommitted(id, options.revision);
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

  async diff(
    previous?: SourceState,
    options: SourceDiffOptions = {},
  ): Promise<SourceDiff> {
    const context = await this.repositoryContext();
    const revision = context.headRevision;
    if (revision === undefined)
      throw new Error("Git source diff requires at least one commit");
    if (previous !== undefined && previous.sourceId !== context.sourceId)
      throw new Error(
        `Cannot diff source ${context.sourceId} from state ${previous.sourceId}`,
      );
    if (previous !== undefined && previous.revision.type !== "git-commit")
      throw new Error("Git source requires a git-commit revision");
    if (
      previous?.scope !== undefined &&
      JSON.stringify(previous.scope) !== JSON.stringify(options)
    )
      throw new Error(
        "Cannot diff source states created with different scopes",
      );

    const [before, after] = await Promise.all([
      previous === undefined
        ? Promise.resolve<readonly SourceFileState[]>([])
        : this.committedFileStates(previous.revision.id, context, options),
      this.committedFileStates(revision, context, options),
    ]);
    const state: SourceState = {
      sourceId: context.sourceId,
      revision: { id: revision, type: "git-commit" },
      scope: options,
    };
    return {
      sourceId: context.sourceId,
      ...(previous === undefined ? {} : { fromRevision: previous.revision }),
      state,
      changes: diffFileStates(before, after),
    };
  }

  async checkout({
    update,
    branch,
    url,
  }: {
    update?: boolean;
    branch?: string;
    url: string;
  }): Promise<void> {
    if (await isGitRepositoryRoot(this.root)) {
      if (update) {
        await this.git.fetch("origin");
        if (branch !== undefined) await this.git.checkout(branch);
        if (branch === undefined) await this.git.pull("origin");
        else await this.git.pull("origin", branch);
      }
      return;
    }
    await mkdir(dirname(this.root), { recursive: true });
    await simpleGit().clone(
      url,
      this.root,
      branch === undefined ? [] : ["--branch", branch],
    );
  }

  private async readCommitted(
    id: SourceId,
    revision: string,
  ): Promise<SourceDocument> {
    this.resolveId(id);
    const normalizedId = normalizeId(id);
    const context = await this.repositoryContext();
    const repositoryPath = joinGitPath(context.sourcePrefix, normalizedId);
    let content: string;
    try {
      content = await this.git.show([`${revision}:${repositoryPath}`]);
    } catch (error) {
      throw new SourceNotFoundError(normalizedId, { cause: error });
    }
    const lastCommit = await this.lastCommit(repositoryPath, revision);
    return {
      id: normalizedId,
      path: normalizedId,
      content,
      source: {
        sourceId: context.sourceId,
        kind: "git",
        path: normalizedId,
        ...(context.repository === undefined
          ? {}
          : { repository: context.repository }),
        git: {
          root: context.root,
          headRevision: revision,
          branch: context.branch,
          fileRevision: lastCommit?.revision,
          status: "clean",
          committedAt: lastCommit?.committedAt,
          author: lastCommit?.author,
        },
      },
    };
  }

  private async committedFileStates(
    revision: string,
    context: RepositoryContext,
    options: SourceDiffOptions,
  ): Promise<readonly SourceFileState[]> {
    const args = ["ls-tree", "--full-tree", "-r", "-z", revision];
    const output = await this.git.raw(args);
    return output
      .split("\0")
      .filter(Boolean)
      .map((entry): SourceFileState | undefined => {
        const match = /^[0-7]+ blob ([0-9a-f]+)\t(.+)$/u.exec(entry);
        if (!match) return undefined;
        const [, hash, repositoryPath] = match;
        if (hash === undefined || repositoryPath === undefined)
          return undefined;
        const path = context.sourcePrefix
          ? relativeGitPath(context.sourcePrefix, repositoryPath)
          : repositoryPath;
        return path === undefined ? undefined : { path, hash: `git:${hash}` };
      })
      .filter((file): file is SourceFileState => file !== undefined)
      .filter(
        ({ path }) =>
          (options.prefix === undefined ||
            options.prefix === "" ||
            path === options.prefix ||
            path.startsWith(`${options.prefix.replace(/\/$/u, "")}/`)) &&
          !isExcluded(path, options.excludeDirectories ?? []),
      )
      .sort((left, right) => left.path.localeCompare(right.path));
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
      sourceId:
        this.configuredSourceId ??
        remote?.refs.fetch ??
        remote?.refs.push ??
        repositoryRoot,
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
      sourceId: context.sourceId,
      kind: "git",
      path: id,
      repository: context.repository,
      git,
    };
  }

  private async lastCommit(
    path: string,
    revision?: string,
  ): Promise<LastCommit | undefined> {
    const value = await optional(() =>
      this.git.raw([
        "log",
        "-1",
        "--format=%H%x00%cI%x00%an%x00%ae",
        ...(revision === undefined ? [] : [revision]),
        "--",
        path,
      ]),
    );
    if (!value) return undefined;

    const [commitRevision, date, name, email] = value.trim().split("\0");
    if (!commitRevision || !date) return undefined;
    return {
      revision: commitRevision,
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

function isExcluded(path: string, directories: readonly string[]): boolean {
  const segments = path.split("/");
  return directories.some((directory) =>
    segments.includes(directory.replace(/^\/+|\/+$/gu, "")),
  );
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
