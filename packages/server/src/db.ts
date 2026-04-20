/**
 * @flitter/server — SQLite database layer
 *
 * Creates and migrates the SQLite database for thread sync.
 * Uses bun:sqlite (built-in, no native dependency).
 *
 * Schema:
 * - api_keys: Bearer token authentication (SHA-256 hashed)
 * - threads: Full ThreadSnapshot as JSON + extracted index columns
 * - thread_labels: Many-to-many labels for threads
 * - threads_fts: FTS5 full-text search on title + message content
 */
import { Database } from "bun:sqlite";

export interface DbOptions {
  /** Path to SQLite file, or ":memory:" for tests */
  path: string;
}

/**
 * Create and migrate the database.
 * Enables WAL mode and foreign keys for performance and correctness.
 */
export function createDb(opts: DbOptions): Database {
  const db = new Database(opts.path, { create: true });

  // WAL mode for concurrent reads + single writer
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  runMigrations(db);
  return db;
}

/**
 * Run schema migrations.
 * Uses a simple _meta table with a version counter.
 */
function runMigrations(db: Database): void {
  // Create meta table for version tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const row = db.prepare("SELECT value FROM _meta WHERE key = 'schema_version'").get() as {
    value: string;
  } | null;
  const currentVersion = row ? parseInt(row.value, 10) : 0;

  if (currentVersion < 1) {
    migrateV1(db);
    db.prepare("INSERT OR REPLACE INTO _meta (key, value) VALUES ('schema_version', '1')").run();
  }
}

/**
 * V1 migration: initial schema
 */
function migrateV1(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      key_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT 'default',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_used_at INTEGER
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      v INTEGER NOT NULL DEFAULT 1,
      title TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      user_last_interacted_at INTEGER NOT NULL DEFAULT 0,
      message_count INTEGER NOT NULL DEFAULT 0,
      agent_mode TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      visibility TEXT NOT NULL DEFAULT 'private',
      snapshot TEXT NOT NULL,
      owner_key_id TEXT REFERENCES api_keys(id)
    )
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_threads_updated ON threads(updated_at DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_threads_archived ON threads(archived)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_threads_user_interacted ON threads(user_last_interacted_at DESC)",
  );

  db.exec(`
    CREATE TABLE IF NOT EXISTS thread_labels (
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      PRIMARY KEY (thread_id, label)
    )
  `);

  db.exec("CREATE INDEX IF NOT EXISTS idx_thread_labels_label ON thread_labels(label)");

  // FTS5 for full-text search on title + message content
  // content='' makes it a contentless FTS table (we manage content manually)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS threads_fts USING fts5(
      thread_id,
      title,
      content
    )
  `);
}
