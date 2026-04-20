/**
 * @flitter/server — Thread CRUD routes
 *
 * Implements the ThreadRemoteTransport endpoints:
 *   POST   /api/threads      — uploadThread (upsert snapshot)
 *   GET    /api/threads/:id   — getThread (full snapshot)
 *   GET    /api/threads       — listThreads (lightweight entries)
 *   DELETE /api/threads/:id   — deleteThread
 */
import type { Database } from "bun:sqlite";
import { ThreadSnapshotSchema } from "@flitter/schemas";
import { Hono } from "hono";
import { extractFields } from "../helpers/extract";

export function threadRoutes(db: Database) {
  const app = new Hono();

  // ── POST /api/threads — uploadThread ──────────────────
  app.post("/threads", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    // Validate with Zod schema
    const parsed = ThreadSnapshotSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Invalid ThreadSnapshot", details: parsed.error.issues.slice(0, 5) },
        400,
      );
    }

    const snapshot = parsed.data;
    const fields = extractFields(snapshot as Parameters<typeof extractFields>[0]);
    const snapshotJson = JSON.stringify(snapshot);
    const keyId = (c as unknown as { get(key: string): string | undefined }).get("keyId");

    // Upsert thread
    db.prepare(`
      INSERT OR REPLACE INTO threads
        (id, v, title, created_at, updated_at, user_last_interacted_at,
         message_count, agent_mode, archived, visibility, snapshot, owner_key_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fields.id,
      fields.v,
      fields.title,
      fields.createdAt,
      fields.updatedAt,
      fields.userLastInteractedAt,
      fields.messageCount,
      fields.agentMode,
      fields.archived ? 1 : 0,
      fields.visibility,
      snapshotJson,
      keyId ?? null,
    );

    // Update FTS index
    db.prepare("DELETE FROM threads_fts WHERE thread_id = ?").run(fields.id);
    db.prepare("INSERT INTO threads_fts (thread_id, title, content) VALUES (?, ?, ?)").run(
      fields.id,
      fields.title ?? "",
      fields.ftsContent,
    );

    // Sync labels
    db.prepare("DELETE FROM thread_labels WHERE thread_id = ?").run(fields.id);
    if (fields.labels.length > 0) {
      const insertLabel = db.prepare("INSERT INTO thread_labels (thread_id, label) VALUES (?, ?)");
      for (const label of fields.labels) {
        insertLabel.run(fields.id, label);
      }
    }

    return c.body(null, 204);
  });

  // ── GET /api/threads/:id — getThread ──────────────────
  app.get("/threads/:id", (c) => {
    const id = c.req.param("id");

    // Avoid matching the /threads/search route
    if (id === "search") return undefined as never; // fall through to next handler

    const row = db.prepare("SELECT snapshot FROM threads WHERE id = ?").get(id) as {
      snapshot: string;
    } | null;

    if (!row) {
      return c.json({ error: "Thread not found" }, 404);
    }

    const snapshot = JSON.parse(row.snapshot);
    return c.json(snapshot);
  });

  // ── GET /api/threads — listThreads ────────────────────
  app.get("/threads", (c) => {
    const limit = parseInt(c.req.query("limit") ?? "50", 10);
    const offset = parseInt(c.req.query("offset") ?? "0", 10);

    const rows = db
      .prepare(
        `SELECT id, v, title, created_at, updated_at, user_last_interacted_at,
                message_count, agent_mode, archived, visibility
         FROM threads
         ORDER BY user_last_interacted_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as Array<{
      id: string;
      v: number;
      title: string | null;
      created_at: number;
      updated_at: number;
      user_last_interacted_at: number;
      message_count: number;
      agent_mode: string | null;
      archived: number;
      visibility: string;
    }>;

    // Map to ThreadEntry-like shape
    const entries = rows.map((row) => {
      // Fetch labels for this thread
      const labels = db
        .prepare("SELECT label FROM thread_labels WHERE thread_id = ?")
        .all(row.id) as { label: string }[];

      return {
        id: row.id,
        v: row.v,
        title: row.title,
        created: row.created_at,
        userLastInteractedAt: row.user_last_interacted_at,
        messageCount: row.message_count,
        agentMode: row.agent_mode ?? undefined,
        archived: row.archived === 1 ? true : undefined,
        usesDtw: false,
        relationships: [],
        summaryStats: { messageCount: row.message_count },
        meta: { visibility: row.visibility },
        labels: labels.map((l) => l.label),
      };
    });

    return c.json(entries);
  });

  // ── DELETE /api/threads/:id — deleteThread ────────────
  app.delete("/threads/:id", (c) => {
    const id = c.req.param("id");

    // Delete FTS entry first (not cascaded)
    db.prepare("DELETE FROM threads_fts WHERE thread_id = ?").run(id);
    // Thread deletion cascades to thread_labels via FK
    db.prepare("DELETE FROM threads WHERE id = ?").run(id);

    return c.body(null, 204);
  });

  return app;
}
