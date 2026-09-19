import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface DocType {
  name: string;
  requiredFields: readonly string[];
}

export interface LoadedDocType {
  directory: string;
  definition: string;
  template: string;
  rules: string;
}

export async function loadDocType(directory: string): Promise<LoadedDocType> {
  const absoluteDirectory = resolve(directory);
  const [definition, template, rules] = await Promise.all([
    readFile(resolve(absoluteDirectory, "definition.yml"), "utf8"),
    readFile(resolve(absoluteDirectory, "template.md"), "utf8"),
    readFile(resolve(absoluteDirectory, "rules.yml"), "utf8"),
  ]);

  return {
    directory: absoluteDirectory,
    definition,
    template,
    rules,
  };
}
