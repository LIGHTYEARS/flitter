/**
 * @flitter/server — Authentication
 *
 * API key generation, hashing, and Hono middleware.
 *
 * Keys use the format: flitter_sk_<32 bytes base64url>
 * Only the SHA-256 hash is stored in the database.
 */

import type { Database } from "bun:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { createMiddleware } from "hono/factory";

const KEY_PREFIX = "flitter_sk_";

/**
 * Generate a new API key.
 * Returns both the raw key (shown to user once) and its hash (stored in DB).
 */
export function generateApiKey(): { raw: string; hash: string } {
  const raw = KEY_PREFIX + randomBytes(32).toString("base64url");
  const hash = hashKey(raw);
  return { raw, hash };
}

/**
 * Hash an API key with SHA-256 for storage/lookup.
 */
export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Hono middleware that verifies Bearer token against api_keys table.
 * Sets c.set("keyId", ...) on success for downstream use.
 */
export function authMiddleware(db: Database) {
  return createMiddleware(async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid authorization header" }, 401);
    }

    const token = header.slice(7);
    if (!token) {
      return c.json({ error: "Empty bearer token" }, 401);
    }

    const hash = hashKey(token);
    const row = db.prepare("SELECT id FROM api_keys WHERE key_hash = ?").get(hash) as {
      id: string;
    } | null;

    if (!row) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    // Update last_used_at
    db.prepare("UPDATE api_keys SET last_used_at = unixepoch() WHERE id = ?").run(row.id);

    c.set("keyId", row.id);
    await next();
  });
}
