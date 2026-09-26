import type { DatabaseSync, StatementSync } from "node:sqlite";
import type { SqliteDatabase, SqliteStatement } from "kysely";

/** Adapts node:sqlite's variadic binding API to Kysely's SQLite dialect. */
export function nodeSqliteDatabase(database: DatabaseSync): SqliteDatabase {
  return {
    close() {
      // SQLiteIndex owns the connection and closes it explicitly.
    },
    prepare(sql) {
      return nodeSqliteStatement(database.prepare(sql), sql);
    },
  };
}

function nodeSqliteStatement(
  statement: StatementSync,
  sql: string,
): SqliteStatement {
  type Parameter = null | number | bigint | string | NodeJS.ArrayBufferView;

  return {
    reader: /^\s*(?:select|with|pragma|explain)\b/iu.test(sql),
    all(parameters) {
      return statement.all(
        ...(parameters as readonly Parameter[]),
      ) as unknown[];
    },
    run(parameters) {
      const result = statement.run(...(parameters as readonly Parameter[]));
      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
      };
    },
    iterate(parameters) {
      return statement.iterate(
        ...(parameters as readonly Parameter[]),
      ) as IterableIterator<unknown>;
    },
  };
}
