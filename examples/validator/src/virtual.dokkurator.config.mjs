import projectConfig from "../dokkurator.config.mjs";

// Dokkurator configuration for the temporary editor example.
/** @type {typeof projectConfig & { sources: { id: string, path: string }[] }} */
const config = {
  ...projectConfig,
  documents: { directory: "virtual" },
  sources: [{ id: "editor-buffer", path: "." }],
};

export default config;
