/**
 * @flitter/server — Hono app factory
 *
 * Assembles all routes with authentication middleware.
 * Health check is public; all other routes require Bearer token.
 */
import type { Database } from "bun:sqlite";
import { Hono } from "hono";
import { authMiddleware } from "./auth";
import { healthRoutes } from "./routes/health";
import { metaRoutes } from "./routes/meta";
import { searchRoutes } from "./routes/search";
import { threadRoutes } from "./routes/threads";

export function createApp(db: Database): Hono {
  const app = new Hono();

  // Health check — no auth required
  app.route("/api", healthRoutes(db));

  // Auth middleware for all /api routes except health
  // Note: health routes are registered first, so they bypass this middleware
  app.use("/api/*", authMiddleware(db));

  // Thread search must come before thread CRUD (:id would match "search")
  app.route("/api", searchRoutes(db));
  app.route("/api", threadRoutes(db));
  app.route("/api", metaRoutes(db));

  return app;
}
