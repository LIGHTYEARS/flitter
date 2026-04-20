/**
 * @flitter/server — Thread CRUD route tests
 *
 * Tests the full upload → get → list → delete lifecycle
 * using an in-memory database and the Hono test client.
 */

import type { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "../app";
import { generateApiKey } from "../auth";
import { createDb } from "../db";

function makeSnapshot(id: string, v = 1, title?: string, messages: unknown[] = []) {
  return {
    id,
    v,
    title: title ?? "Untitled",
    messages,
    agentMode: "normal",
  };
}

function makeTextMessage(role: string, text: string, messageId: number) {
  const base: Record<string, unknown> = {
    role,
    content: [{ type: "text", text }],
    messageId,
  };
  // AssistantThreadMessageSchema requires a `state` field
  if (role === "assistant") {
    base.state = { type: "complete", stopReason: "end_turn" };
  }
  return base;
}

describe("Thread CRUD routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let apiKey: string;

  beforeEach(() => {
    db = createDb({ path: ":memory:" });
    const { raw, hash } = generateApiKey();
    db.prepare("INSERT INTO api_keys (id, key_hash, name) VALUES (?, ?, ?)").run(
      "test-key",
      hash,
      "test",
    );
    apiKey = raw;
    app = createApp(db);
  });

  function headers() {
    return { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  }

  // ── Upload ──────────────────────────────────────────────

  test("POST /api/threads — uploads a valid snapshot", async () => {
    const snapshot = makeSnapshot("thread-1", 1, "Test Thread", [
      makeTextMessage("user", "Hello", 0),
      makeTextMessage("assistant", "Hi there", 1),
    ]);

    const resp = await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(snapshot),
    });

    expect(resp.status).toBe(204);
  });

  test("POST /api/threads — rejects invalid body", async () => {
    const resp = await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ notAThread: true }),
    });

    expect(resp.status).toBe(400);
  });

  test("POST /api/threads — upserts (replaces existing)", async () => {
    const v1 = makeSnapshot("thread-1", 1, "Version 1");
    const v2 = makeSnapshot("thread-1", 2, "Version 2");

    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(v1),
    });

    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(v2),
    });

    const resp = await app.request("/api/threads/thread-1", {
      headers: headers(),
    });
    const data = await resp.json();
    expect(data.v).toBe(2);
    expect(data.title).toBe("Version 2");
  });

  test("POST /api/threads — requires auth", async () => {
    const resp = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makeSnapshot("t-1")),
    });
    expect(resp.status).toBe(401);
  });

  // ── Get ─────────────────────────────────────────────────

  test("GET /api/threads/:id — returns uploaded snapshot", async () => {
    const snapshot = makeSnapshot("thread-get", 1, "Get Test", [
      makeTextMessage("user", "question", 0),
    ]);

    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(snapshot),
    });

    const resp = await app.request("/api/threads/thread-get", { headers: headers() });
    expect(resp.status).toBe(200);

    const data = await resp.json();
    expect(data.id).toBe("thread-get");
    expect(data.title).toBe("Get Test");
    expect(data.messages).toHaveLength(1);
  });

  test("GET /api/threads/:id — returns 404 for nonexistent", async () => {
    const resp = await app.request("/api/threads/nonexistent", { headers: headers() });
    expect(resp.status).toBe(404);
  });

  // ── List ────────────────────────────────────────────────

  test("GET /api/threads — lists uploaded threads", async () => {
    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(makeSnapshot("t-1", 1, "First")),
    });
    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(makeSnapshot("t-2", 1, "Second")),
    });

    const resp = await app.request("/api/threads", { headers: headers() });
    expect(resp.status).toBe(200);

    const data = await resp.json();
    expect(data).toHaveLength(2);
    expect(data[0].id).toBeDefined();
    expect(data[0].v).toBeDefined();
    expect(data[0].messageCount).toBeDefined();
  });

  test("GET /api/threads — respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      await app.request("/api/threads", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(makeSnapshot(`t-${i}`, 1, `Thread ${i}`)),
      });
    }

    const resp = await app.request("/api/threads?limit=2", { headers: headers() });
    const data = await resp.json();
    expect(data).toHaveLength(2);
  });

  test("GET /api/threads — returns empty array when no threads", async () => {
    const resp = await app.request("/api/threads", { headers: headers() });
    const data = await resp.json();
    expect(data).toEqual([]);
  });

  // ── Delete ──────────────────────────────────────────────

  test("DELETE /api/threads/:id — deletes thread", async () => {
    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(makeSnapshot("t-del", 1, "To Delete")),
    });

    const delResp = await app.request("/api/threads/t-del", {
      method: "DELETE",
      headers: headers(),
    });
    expect(delResp.status).toBe(204);

    const getResp = await app.request("/api/threads/t-del", { headers: headers() });
    expect(getResp.status).toBe(404);
  });

  test("DELETE /api/threads/:id — 204 for nonexistent (idempotent)", async () => {
    const resp = await app.request("/api/threads/nonexistent", {
      method: "DELETE",
      headers: headers(),
    });
    expect(resp.status).toBe(204);
  });

  // ── Health ──────────────────────────────────────────────

  test("GET /api/health — returns status without auth", async () => {
    const resp = await app.request("/api/health");
    expect(resp.status).toBe(200);

    const data = await resp.json();
    expect(data.status).toBe("ok");
    expect(data.version).toBe("0.1.0");
    expect(data.threads).toBe(0);
  });

  test("GET /api/health — reflects thread count", async () => {
    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(makeSnapshot("t-1")),
    });

    const resp = await app.request("/api/health");
    const data = await resp.json();
    expect(data.threads).toBe(1);
  });
});
