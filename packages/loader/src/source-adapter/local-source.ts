import { stat } from "node:fs/promises";
import { simpleGit } from "simple-git";
import { FileSystemSource } from "./file-system-source.js";
import {
  createGitCheckoutSource,
  GitSource,
  isGitRepositoryRoot,
} from "./git-source.js";
import type { SourceAdapter } from "./source-adapter.js";

export async function createLocalSource(root: string): Promise<SourceAdapter> {
  return createConfiguredLocalSource({ root });
}

export interface LocalSourceOptions {
  readonly root: string;
  readonly sourceId?: string;
}

/** Config-resolved source location understood by Loader lifecycle operations. */
export interface ConfiguredSourceLocation {
  readonly id: string;
  readonly root: string;
  readonly remote?: { readonly url: string; readonly branch?: string };
}

export type SourcePreparationReason =
  "missing-checkout" | "missing-local-source";

/** Indicates that a source must be prepared before it can be opened. */
export class SourcePreparationRequiredError extends Error {
  readonly sourceId: string;
  readonly reason: SourcePreparationReason;

  constructor(sourceId: string, reason: SourcePreparationReason) {
    super(`Source ${sourceId} requires preparation: ${reason}`);
    this.name = "SourcePreparationRequiredError";
    this.sourceId = sourceId;
    this.reason = reason;
  }
}

/** Creates the appropriate local adapter while preserving a configured id. */
export async function createConfiguredLocalSource({
  root,
  sourceId,
}: LocalSourceOptions): Promise<SourceAdapter> {
  return (await simpleGit({ baseDir: root }).checkIsRepo())
    ? new GitSource({ root, sourceId })
    : new FileSystemSource({ root, sourceId });
}

/** Opens an existing configured source without cloning or updating it. */
export async function openConfiguredSource(
  source: ConfiguredSourceLocation,
): Promise<SourceAdapter> {
  if (source.remote !== undefined) {
    if (!(await isGitRepositoryRoot(source.root)))
      throw new SourcePreparationRequiredError(source.id, "missing-checkout");
    return new GitSource({ root: source.root, sourceId: source.id });
  }
  if (!(await isDirectory(source.root)))
    throw new SourcePreparationRequiredError(source.id, "missing-local-source");
  return createConfiguredLocalSource({
    root: source.root,
    sourceId: source.id,
  });
}

/** Clones a missing remote checkout, but never updates an existing one. */
export async function prepareConfiguredSource(
  source: ConfiguredSourceLocation,
): Promise<SourceAdapter> {
  if (source.remote === undefined) return openConfiguredSource(source);
  if (await isGitRepositoryRoot(source.root))
    return openConfiguredSource(source);
  return createGitCheckoutSource({
    root: source.root,
    sourceId: source.id,
    url: source.remote.url,
    branch: source.remote.branch,
    update: false,
  });
}

/** Updates an existing remote checkout without cloning a missing one. */
export async function updateConfiguredSource(
  source: ConfiguredSourceLocation,
): Promise<SourceAdapter> {
  if (source.remote === undefined) return openConfiguredSource(source);
  if (!(await isGitRepositoryRoot(source.root)))
    throw new SourcePreparationRequiredError(source.id, "missing-checkout");
  return createGitCheckoutSource({
    root: source.root,
    sourceId: source.id,
    url: source.remote.url,
    branch: source.remote.branch,
    update: true,
  });
}

/**
 * Creates a configured source with the legacy implicit checkout behavior.
 * @deprecated Select side effects explicitly with openConfiguredSource,
 * prepareConfiguredSource or updateConfiguredSource.
 */
export async function createConfiguredSource(
  source: ConfiguredSourceLocation,
  update = true,
): Promise<SourceAdapter> {
  if (source.remote !== undefined)
    return createGitCheckoutSource({
      root: source.root,
      sourceId: source.id,
      url: source.remote.url,
      branch: source.remote.branch,
      update,
    });
  return createConfiguredLocalSource({
    root: source.root,
    sourceId: source.id,
  });
}

async function isDirectory(root: string): Promise<boolean> {
  try {
    return (await stat(root)).isDirectory();
  } catch (error) {
    if (isFileNotFoundError(error)) return false;
    throw error;
  }
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
