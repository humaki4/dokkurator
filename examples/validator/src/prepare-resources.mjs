import { readFile } from "node:fs/promises";
import { URL } from "node:url";

// Example preparation: read a JSON resource before the rule runtime starts.
// This module does not configure Dokkurator or activate any rules.
export const commonSchema = JSON.parse(
  await readFile(
    new URL("../schemas/common.schema.json", import.meta.url),
    "utf8",
  ),
);
