import {
  DatabaseSync,
  type StatementSync,
  type SQLInputValue
} from "node:sqlite";
import { readFileSync } from "node:fs";
import path from "node:path";

type BindValue = SQLInputValue;

class SqliteD1Statement {
  readonly sql: string;
  readonly values: BindValue[];
  private readonly database: DatabaseSync;

  constructor(
    database: DatabaseSync,
    sql: string,
    values: BindValue[] = []
  ) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values: BindValue[]) {
    return new SqliteD1Statement(this.database, this.sql, values);
  }

  private statement(): StatementSync {
    return this.database.prepare(this.sql);
  }

  async first<T>(): Promise<T | null> {
    const row = this.statement().get(...this.values);
    return (row as T | undefined) ?? null;
  }

  async all<T>(): Promise<D1Result<T>> {
    const rows = this.statement().all(...this.values) as T[];
    return {
      success: true,
      results: rows,
      meta: {
        duration: 0,
        size_after: 0,
        rows_read: rows.length,
        rows_written: 0,
        changed_db: false,
        changes: 0,
        last_row_id: 0
      }
    };
  }

  async run<T = unknown>(): Promise<D1Result<T>> {
    const result = this.statement().run(...this.values);
    return {
      success: true,
      results: [],
      meta: {
        duration: 0,
        size_after: 0,
        rows_read: 0,
        rows_written: Number(result.changes),
        changed_db: result.changes > 0,
        changes: Number(result.changes),
        last_row_id: Number(result.lastInsertRowid)
      }
    };
  }

  async raw<T>(): Promise<T[]> {
    const statement = this.statement();
    statement.setReturnArrays(true);
    return statement.all(...this.values) as T[];
  }
}

export class SqliteD1Database {
  readonly sqlite: DatabaseSync;

  constructor() {
    this.sqlite = new DatabaseSync(":memory:");
    this.sqlite.exec("PRAGMA foreign_keys = ON;");
  }

  prepare(sql: string) {
    return new SqliteD1Statement(this.sqlite, sql);
  }

  async batch<T = unknown>(
    statements: SqliteD1Statement[]
  ): Promise<D1Result<T>[]> {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements) {
        const sql = statement.sql.trimStart().toUpperCase();
        if (
          sql.startsWith("SELECT") ||
          sql.startsWith("WITH") ||
          sql.includes(" RETURNING ")
        ) {
          results.push(await statement.all<T>());
        } else {
          results.push(await statement.run<T>());
        }
      }
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  async exec(query: string): Promise<D1ExecResult> {
    this.sqlite.exec(query);
    return { count: 0, duration: 0 };
  }

  close() {
    this.sqlite.close();
  }
}

export function createMigratedDatabase(): SqliteD1Database {
  const database = new SqliteD1Database();
  const migration = readFileSync(
    path.resolve("migrations/0001_initial.sql"),
    "utf8"
  );
  database.sqlite.exec(migration);
  return database;
}
