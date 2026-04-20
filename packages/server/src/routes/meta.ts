/**
 * @flitter/server — Thread metadata routes
 *
 * Implements the InternalApiClient metadata endpoints:
 *   PATCH  /api/threads/:id           — update visibility/archived
 *   GET    /api/threads/:id/labels    — list labels
 *   POST   /api/threads/:id/labels    — add label
 *   DELETE /api/threads/:id/labels/:label — remove label
 */
import type { Database } from "bun:sqlite";
import { Hono } from "hono";

export function metaRoutes(db: Database) {
  const app = new Hono();

  // ── PATCH /api/threads/:id — update metadata ──────────
  app.patch("/threads/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    // Check thread exists
    const existing = db.prepare("SELECT snapshot FROM threads WHERE id = ?").get(id) as {
      snapshot: string;
    } | null;
    if (!existing) {
      return c.json({ error: "Thread not found" }, 404);
    }

    // Apply updates to columns AND to snapshot JSON
    const snapshot = JSON.parse(existing.snapshot);
    if (!snapshot.meta) snapshot.meta = {};

    const updates: string[] = [];
    const params: unknown[] = [];

    if (body.visibility !== undefined) {
      updates.push("visibility = ?");
      params.push(body.visibility);
      snapshot.meta.visibility = body.visibility;
    }

    if (body.archived !== undefined) {
      updates.push("archived = ?");
      params.push(body.archived ? 1 : 0);
      snapshot.archived = body.archived;
    }

    if (updates.length > 0) {
      // Also update snapshot JSON and updated_at
      updates.push("snapshot = ?");
      params.push(JSON.stringify(snapshot));
      updates.push("updated_at = ?");
      params.push(Date.now());

      params.push(id);
      db.prepare(`UPDATE threads SET ${updates.join(", ")} WHERE id = ?`).run(
        ...(params as [string, ...string[]]),
      );
    }

    return c.body(null, 204);
  });

  // ── GET /api/threads/:id/labels — list labels ─────────
  app.get("/threads/:id/labels", (c) => {
    const id = c.req.param("id");

    // Check thread exists
    const exists = db.prepare("SELECT 1 FROM threads WHERE id = ?").get(id);
    if (!exists) {
      return c.json({ error: "Thread not found" }, 404);
    }

    const labels = db
      .prepare("SELECT label FROM thread_labels WHERE thread_id = ? ORDER BY label")
      .all(id) as { label: string }[];

    return c.json({ labels: labels.map((l) => ({ name: l.label })) });
  });

  // ── POST /api/threads/:id/labels — add label ─────────
  app.post("/threads/:id/labels", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    if (!body?.name) {
      return c.json({ error: "Missing label name" }, 400);
    }

    // Check thread exists
    const exists = db.prepare("SELECT 1 FROM threads WHERE id = ?").get(id);
    if (!exists) {
      return c.json({ error: "Thread not found" }, 404);
    }

    // Insert (ignore duplicates via PRIMARY KEY conflict)
    db.prepare("INSERT OR IGNORE INTO thread_labels (thread_id, label) VALUES (?, ?)").run(
      id,
      body.name,
    );

    return c.json({ name: body.name }, 201);
  });

  // ── DELETE /api/threads/:id/labels/:label — remove ────
  app.delete("/threads/:id/labels/:label", (c) => {
    const id = c.req.param("id");
    const label = c.req.param("label");

    db.prepare("DELETE FROM thread_labels WHERE thread_id = ? AND label = ?").run(id, label);
    return c.body(null, 204);
  });

  return app;
}
