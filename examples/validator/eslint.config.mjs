import { createLintConfig } from "@dokkurator/validator";
import { prepareExample } from "./src/setup.mjs";

// Prepare resources for this direct ESLint integration.
const { configuration } = await prepareExample();
// ESLint configuration; Dokkurator settings live in dokkurator.config.mjs.
/** @type {import('eslint').Linter.Config[]} */
const config = createLintConfig(configuration);
export default config;
