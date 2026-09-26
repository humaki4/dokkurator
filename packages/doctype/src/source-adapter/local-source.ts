import { simpleGit } from "simple-git";
import { FileSystemSource } from "./file-system-source.js";
import { GitSource } from "./git-source.js";
import type { SourceAdapter } from "./source-adapter.js";

export async function createLocalSource(root: string): Promise<SourceAdapter> {
  return (await simpleGit({ baseDir: root }).checkIsRepo())
    ? new GitSource({ root })
    : new FileSystemSource({ root });
}
