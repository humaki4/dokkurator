import console from "node:console";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { createDokkurator } from "@dokkurator/core";

const app = createDokkurator({
  root: fileURLToPath(new URL("../minimal/", import.meta.url)),
});
await app.open();
try {
  const result = await app.validate();
  console.log(JSON.stringify(result, null, 2));
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
