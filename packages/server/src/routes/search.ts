/**
 * @flitter/server — Full-text search route
 *
 * Uses FTS5 to search thread title + message content.
 *   GET /api/threads/search?q=<query>&limit=20
 */
import type { Database } from "bun:sqlite";
import { Hono } from "hono";

export function searchRoutes(db: Database) {
  const app = new Hono();

  // ── GET /api/threads/search?q=...&limit=... ───────────
  app.get("/threads/search", (c) => {
    const q = c.req.query("q");
    if (!q) {
      return c.json({ error: "Missing search query parameter 'q'" }, 400);
    }

    const limit = parseInt(c.req.query("limit") ?? "20", 10);

    // FTS5 search with ranking
    const rows = db
      .prepare(
        `SELECT t.id, t.v, t.title, t.created_at, t.user_last_interacted_at,
                t.message_count, t.agent_mode, t.archived, t.visibility
         FROM threads_fts fts
         JOIN threads t ON t.id = fts.thread_id
         WHERE threads_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(q, limit + 1) as Array<{
      id: string;
      v: number;
      title: string | null;
      created_at: number;
      user_last_interacted_at: number;
      message_count: number;
      agent_mode: string | null;
      archived: number;
      visibility: string;
    }>;

    const hasMore = rows.length > limit;
    const results = rows.slice(0, limit);

    return c.json({
      threads: results.map((row) => ({
        id: row.id,
        title: row.title,
        updatedAt: row.user_last_interacted_at,
        messageCount: row.message_count,
      })),
      hasMore,
    });
  });

  return app;
}
