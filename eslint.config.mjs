import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import markdown from "@eslint/markdown";
import { fileURLToPath, URL } from "node:url";
import { loadDocTypes } from "@dokkurator/loader";
import { dokkuratorEslintPlugin, prepareDocTypes } from "@dokkurator/validator";

const root = fileURLToPath(new URL(".", import.meta.url));
const docTypes = prepareDocTypes(await loadDocTypes(root));

export default defineConfig(
  {
    ignores: ["**/dist/**", "**/coverage/**", "**/generated/**"],
  },
  {
    files: ["**/*.{js,mjs,ts}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: ["**/docs/**/*.[mM][dD]"],
    extends: [
      markdown.configs.recommended,
      dokkuratorEslintPlugin.configs.recommended,
    ],
    language: "markdown/gfm",
    languageOptions: { frontmatter: "yaml" },
    settings: { dokkurator: docTypes },
    rules: {
      // DocType metadata titles accompany the document's visible H1.
      "markdown/no-multiple-h1": ["error", { frontmatterTitle: "" }],
    },
  },
);
