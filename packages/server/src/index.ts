/**
 * @flitter/server — Entry point
 *
 * Self-hosted thread sync server for Flitter.
 * Stores threads in SQLite with full-text search.
 *
 * Environment variables:
 *   FLITTER_DB_PATH — SQLite file path (default: ./data/flitter.db)
 *   PORT            — HTTP port (default: 7080)
 *
 * On first run, generates an API key and prints it to stdout.
 *
 * @example
 * ```bash
 * # Start server
 * bun run packages/server/src/index.ts
 *
 * # Or with custom path
 * FLITTER_DB_PATH=/var/lib/flitter/data.db PORT=3000 bun run packages/server/src/index.ts
 * ```
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app";
import { generateApiKey } from "./auth";
import { createDb } from "./db";

const DB_PATH = process.env.FLITTER_DB_PATH ?? "./data/flitter.db";
const PORT = parseInt(process.env.PORT ?? "7080", 10);

// Ensure data directory exists
if (DB_PATH !== ":memory:") {
  mkdirSync(dirname(DB_PATH), { recursive: true });
}

const db = createDb({ path: DB_PATH });
const app = createApp(db);

// On first run: generate and print API key
const keyCount = db.prepare("SELECT count(*) as c FROM api_keys").get() as { c: number };
if (keyCount.c === 0) {
  const { raw, hash } = generateApiKey();
  db.prepare("INSERT INTO api_keys (key_hash, name) VALUES (?, ?)").run(hash, "default");
  console.log("");
  console.log("  ┌─────────────────────────────────────────────────┐");
  console.log("  │  First-run API key (save this — shown once):    │");
  console.log(`  │  ${raw}`);
  console.log("  └─────────────────────────────────────────────────┘");
  console.log("");
  console.log(`  Configure your client:`);
  console.log(`    flitter config set sync.url http://localhost:${PORT}`);
  console.log(`    flitter secret set sync-auth-token`);
  console.log("");
}

console.log(`Flitter sync server listening on port ${PORT}`);
console.log(`  Database: ${DB_PATH}`);
console.log(`  API keys: ${keyCount.c === 0 ? 1 : keyCount.c}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
