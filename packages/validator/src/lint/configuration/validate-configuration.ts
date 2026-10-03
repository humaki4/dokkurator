import { Linter } from "eslint";
import markdown, { MarkdownLanguage } from "@eslint/markdown";
import { LintConfigurationError } from "../errors.js";

export function validateLintConfiguration(
  config: Linter.Config[],
  filename: string,
): void {
  // ESLint validates rule IDs/options before parsing. An intentional failed parse
  // ends this configuration-only probe before any plugin's create/visitor runs.
  const language = new MarkdownLanguage({ mode: "gfm" });
  language.parse = () => ({
    ok: false,
    errors: [{ message: "Configuration probe.", line: 1, column: 1 }],
  });
  const probePlugin = { ...markdown, languages: { gfm: language } };
  try {
    const messages = new Linter({ configType: "flat" }).verify(
      "",
      config.map((entry) => ({
        ...entry,
        // Disabled IDs/options are configuration too; validate without executing.
        rules: Object.fromEntries(
          Object.entries(entry.rules ?? {}).map(([id, rule]) => [
            id,
            Array.isArray(rule)
              ? rule[0] === "off" || rule[0] === 0
                ? ["error", ...rule.slice(1)]
                : rule
              : rule === "off" || rule === 0
                ? "error"
                : rule,
          ]),
        ),
        plugins: {
          ...entry.plugins,
          markdown: probePlugin,
        },
      })),
      { filename },
    );
    if (
      !messages.some(
        (message) =>
          message.fatal &&
          message.message === "Parsing error: Configuration probe.",
      )
    ) {
      throw new Error(`No applicable Markdown configuration for ${filename}.`);
    }
  } catch (cause) {
    throw new LintConfigurationError(
      `Invalid ESLint rule configuration: ${cause instanceof Error ? cause.message : String(cause)}`,
      {
        cause,
      },
    );
  }
}
