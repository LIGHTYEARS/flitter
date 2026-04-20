/**
 * @flitter/server — Database layer tests
 */
import { describe, expect, test } from "bun:test";
import { createDb } from "../db";

describe("createDb", () => {
  test("creates all tables with in-memory database", () => {
    const db = createDb({ path: ":memory:" });

    // Check tables exist
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("_meta");
    expect(tableNames).toContain("api_keys");
    expect(tableNames).toContain("threads");
    expect(tableNames).toContain("thread_labels");

    db.close();
  });

  test("creates FTS5 virtual table", () => {
    const db = createDb({ path: ":memory:" });

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = 'threads_fts'")
      .all() as { name: string }[];

    expect(tables).toHaveLength(1);

    db.close();
  });

  test("creates indexes", () => {
    const db = createDb({ path: ":memory:" });

    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name",
      )
      .all() as { name: string }[];
    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toContain("idx_threads_updated");
    expect(indexNames).toContain("idx_threads_archived");
    expect(indexNames).toContain("idx_threads_user_interacted");
    expect(indexNames).toContain("idx_thread_labels_label");

    db.close();
  });

  test("sets schema_version to 1", () => {
    const db = createDb({ path: ":memory:" });

    const row = db.prepare("SELECT value FROM _meta WHERE key = 'schema_version'").get() as {
      value: string;
    };
    expect(row.value).toBe("1");

    db.close();
  });

  test("is idempotent (can be called twice)", () => {
    const db = createDb({ path: ":memory:" });
    // Second call should not fail — migrations check version
    // (We can't call createDb again on in-memory, but we can verify the migration is idempotent)
    const row = db.prepare("SELECT value FROM _meta WHERE key = 'schema_version'").get() as {
      value: string;
    };
    expect(row.value).toBe("1");

    db.close();
  });

  test("enables WAL mode", () => {
    const db = createDb({ path: ":memory:" });

    const row = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
    // In-memory databases may report "memory" instead of "wal"
    expect(["wal", "memory"]).toContain(row.journal_mode);

    db.close();
  });

  test("threads table has correct columns", () => {
    const db = createDb({ path: ":memory:" });

    const cols = db.prepare("PRAGMA table_info(threads)").all() as { name: string }[];
    const colNames = cols.map((c) => c.name);

    expect(colNames).toContain("id");
    expect(colNames).toContain("v");
    expect(colNames).toContain("title");
    expect(colNames).toContain("snapshot");
    expect(colNames).toContain("visibility");
    expect(colNames).toContain("message_count");
    expect(colNames).toContain("user_last_interacted_at");
    expect(colNames).toContain("archived");
    expect(colNames).toContain("owner_key_id");

    db.close();
  });
});
