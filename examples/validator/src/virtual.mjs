import console from "node:console";
import process from "node:process";
import { createDokkurator } from "@dokkurator/core";
import { prepareVirtualProject } from "./prepare-virtual-project.mjs";

// 1. Example preparation: materialize an editor buffer as a temporary project.
const { root, cleanup } = await prepareVirtualProject(`---
doctype: guide
title: Virtuelle Anleitung
audience: developer
---
## Einstieg

TODO: Hier fehlt noch die Anleitung.
`);

// 2. Dokkurator: read the project config and validate its documents.
const app = createDokkurator({ root });
try {
  await app.open();
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
  // 3. Close Dokkurator, then clean up the example's temporary files.
  try {
    await app.close();
  } finally {
    await cleanup();
  }
}
