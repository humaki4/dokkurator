import markdown from "@eslint/markdown";
import { plugin } from "@dokkurator/validator";
import { prepareExample } from "./src/setup.mjs";
import projectConfig from "./dokkurator.config.mjs";

// Prepare resources for this direct ESLint integration.
const { configuration } = await prepareExample();
// ESLint configuration; Dokkurator settings live in dokkurator.config.mjs.
/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...markdown.configs.recommended,
  ...plugin.configs.recommended,
  {
    files: ["**/*.md"],
    language: "markdown/gfm",
    languageOptions: { frontmatter: "yaml" },
    plugins: { markdown, ...projectConfig.validator.plugins },
    settings: { dokkurator: configuration },
    rules: projectConfig.validator.rules,
  },
];
export default config;
