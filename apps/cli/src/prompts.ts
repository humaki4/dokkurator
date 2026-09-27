import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

export async function ask(question: string): Promise<string> {
  if (!stdin.isTTY)
    throw new Error(`${question} (argument required in non-interactive mode)`);
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    return (await prompt.question(question)).trim();
  } finally {
    prompt.close();
  }
}

export async function confirm(question: string): Promise<boolean> {
  return /^(y|yes|j|ja)$/iu.test(await ask(`${question} [y/N] `));
}
