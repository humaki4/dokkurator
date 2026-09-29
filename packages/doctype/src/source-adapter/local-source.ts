import { simpleGit } from "simple-git";
import { FileSystemSource } from "./file-system-source.js";
import { createGitCheckoutSource, GitSource } from "./git-source.js";
import type { SourceAdapter } from "./source-adapter.js";

export async function createLocalSource(root: string): Promise<SourceAdapter> {
  return createConfiguredLocalSource({ root });
}

export interface LocalSourceOptions {
  readonly root: string;
  readonly sourceId?: string;
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

/** Creates the adapter selected by a configured local or remote source. */
export async function createConfiguredSource(
  source: {
    readonly id: string;
    readonly root: string;
    readonly remote?: { readonly url: string; readonly branch?: string };
  },
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
