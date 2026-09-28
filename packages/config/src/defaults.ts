export const CONFIG_DIRECTORY = ".dokkurator";
export const CONFIG_FILENAME = "config.yaml";
export const DEFAULT_CONFIG = {
  documents: {
    directory: "",
    include: ["**/*.md"],
    exclude: [
      ".git/**",
      ".dokkurator/**",
      ".nx/**",
      "node_modules/**",
      "dist/**",
    ],
  },
  doctypes: { directory: "_dokkurator/.doctypes" },
  knowledge: { index: ".dokkurator/index.db" },
  checkouts: { directory: ".dokkurator/checkouts" },
  watch: { debounce: 300 },
} as const;
