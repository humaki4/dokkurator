# SQLite Index Adapter

SQLite persistence and FTS5 search for `@dokkurator/knowledge`.

```ts
import { SQLiteIndex } from "@dokkurator/index-adapter-sqlite";
import { indexDocuments } from "@dokkurator/knowledge";

const index = new SQLiteIndex({ filename: ".dokkurator/index.db" });
await indexDocuments({ source, index, documentsDirectory: "docs" });

const hits = await index.search({ text: "authentication", limit: 20 });
index.close();
```

The adapter creates its parent directory and schema automatically. A document
and its full-text entry are updated together in one transaction. The database
is a derived index and can be rebuilt from the source documents.
