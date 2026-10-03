import { fileURLToPath, URL } from "node:url";
import { createDokkurator } from "@dokkurator/core";
import { prepareLintConfiguration } from "@dokkurator/validator";
import projectConfig from "../dokkurator.config.mjs";

export const root = fileURLToPath(new URL("../", import.meta.url));

// Integration preparation for direct ESLint only; this is not a Dokkurator config.
// Core validation prepares these resources internally during app.validate().
export async function prepareExample() {
  const app = createDokkurator({ root });
  await app.open();
  try {
    const { results, errors } = await app.listDocTypes();
    if (errors.length) {
      throw new Error(errors.map(({ message }) => message).join("\n"));
    }
    return {
      configuration: prepareLintConfiguration({
        docTypes: results.flatMap(({ doctypes }) => doctypes),
        ...projectConfig.validator,
      }),
    };
  } finally {
    await app.close();
  }
}
