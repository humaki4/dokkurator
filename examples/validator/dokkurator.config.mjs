// Prepared resources and an imported plugin; their implementations live separately.
import { commonSchema } from "./src/prepare-resources.mjs";
import customPlugin from "./src/custom-plugin.mjs";

// Dokkurator configuration: choose document paths and activate validator rules.
/** @type {import('eslint').Linter.RulesRecord} */
const rules = {
  "example/no-todo": "warn",
  "markdown/no-duplicate-headings": "warn",
};

export default {
  documents: { directory: "documents" },
  validator: {
    schemas: { [commonSchema.$id]: commonSchema },
    plugins: { example: customPlugin },
    rules,
  },
};
