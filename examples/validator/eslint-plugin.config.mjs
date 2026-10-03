import markdown from "@eslint/markdown";
import { plugin } from "@dokkurator/validator";
import { prepareExample } from "./src/setup.mjs";
import customPlugin from "./src/custom-plugin.mjs";

const { configuration } = await prepareExample();
/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...markdown.configs.recommended,
  ...plugin.configs.recommended,
  {
    files: ["**/*.md"],
    language: "markdown/gfm",
    languageOptions: { frontmatter: "yaml" },
    plugins: { markdown, example: customPlugin },
    settings: { dokkurator: configuration },
    rules: {
      "example/no-todo": "warn",
      "markdown/no-duplicate-headings": "warn",
    },
  },
];
export default config;
