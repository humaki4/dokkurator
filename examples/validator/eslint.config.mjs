import { createLintConfig } from "@dokkurator/validator";
import { prepareExample } from "./src/setup.mjs";

const { configuration } = await prepareExample();
/** @type {import('eslint').Linter.Config[]} */
const config = createLintConfig(configuration);
export default config;
