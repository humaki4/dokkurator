import commonSchema from "./schemas/common.schema.json" with { type: "json" };
import customPlugin from "./rules/no-todo.mjs";

// Dokkurator configuration: choose document paths and activate validator rules.
const rules = /** @type {const} */ ({
  "example/no-todo": "warn",
  "markdown/no-duplicate-headings": "warn",
});

export default {
  documents: { directory: "documents" },
  validator: {
    schemas: { [commonSchema.$id]: commonSchema },
    plugins: { example: customPlugin },
    rules,
  },
};
