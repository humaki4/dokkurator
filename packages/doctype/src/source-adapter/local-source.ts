import { simpleGit } from "simple-git";
import { FileSystemSource } from "./file-system-source.js";
import { GitSource } from "./git-source.js";
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
