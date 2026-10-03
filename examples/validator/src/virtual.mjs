import console from "node:console";
import process from "node:process";
import { lint } from "@dokkurator/validator";
import { prepareExample } from "./setup.mjs";

const { configuration } = await prepareExample();
// The text could come from an editor, API, or a database. No file is required.
const result = lint({
  originalText: `---
doctype: guide
title: Virtuelle Anleitung
audience: developer
---
## Einstieg

TODO: Hier fehlt noch die Anleitung.
`,
  source: {
    sourceId: "editor-buffer",
    path: "virtual/guide.md",
    revision: "buffer-1",
  },
  configuration,
});

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.status === "failed" ? 1 : 0;
