import { fileURLToPath, URL } from "node:url";
import { createDokkurator } from "@dokkurator/core";
import {
  createLintConfig,
  prepareLintConfiguration,
} from "@dokkurator/validator";
import projectConfig from "../documentation/dokkurator.config.mjs";

const app = createDokkurator({
  root: fileURLToPath(new URL("../documentation/", import.meta.url)),
});
await app.open();
let configuration;
try {
  const { results, errors } = await app.listDocTypes();
  if (errors.length) {
    throw new Error(errors.map(({ message }) => message).join("\n"));
  }
  configuration = prepareLintConfiguration({
    docTypes: results.flatMap(({ doctypes }) => doctypes),
    ...projectConfig.validator,
  });
} finally {
  await app.close();
}

/** @type {import("eslint").Linter.Config[]} */
const config = createLintConfig(configuration);
export default config;
