import console from "node:console";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { createDokkurator } from "@dokkurator/core";

const app = createDokkurator({
  root: fileURLToPath(new URL("./", import.meta.url)),
});
await app.open();
try {
  const result = await app.validate();
  const formatter = await app.loadFormatter("json");
  console.log(await formatter.format(result));
  process.exitCode =
    result.errors.length ||
    result.results.some(({ documents }) =>
      documents.some(({ status }) => status === "failed"),
    )
      ? 1
      : 0;
} finally {
  await app.close();
}
