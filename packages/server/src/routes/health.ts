/**
 * @flitter/server — Health check route
 *
 *   GET /api/health — returns status, version, and thread count
 *   No authentication required.
 */
import type { Database } from "bun:sqlite";
import { Hono } from "hono";

export function healthRoutes(db: Database) {
  const app = new Hono();

  app.get("/health", (c) => {
    const row = db.prepare("SELECT count(*) as count FROM threads").get() as { count: number };

    return c.json({
      status: "ok",
      version: "0.1.0",
      threads: row.count,
    });
  });

  return app;
}
