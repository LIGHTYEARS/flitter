/**
 * @flitter/server — Search route tests
 */

import type { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "../app";
import { generateApiKey } from "../auth";
import { createDb } from "../db";

describe("Search routes", () => {
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

  function makeSnapshot(id: string, title: string, messages: unknown[] = []) {
    return { id, v: 1, title, messages, agentMode: "normal" };
  }

  function makeTextMessage(role: string, text: string, messageId: number) {
    const base: Record<string, unknown> = {
      role,
      content: [{ type: "text", text }],
      messageId,
    };
    if (role === "assistant") {
      base.state = { type: "complete", stopReason: "end_turn" };
    }
    return base;
  }

  test("GET /api/threads/search — returns matching threads by title", async () => {
    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(makeSnapshot("t-1", "Debugging authentication flow")),
    });
    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(makeSnapshot("t-2", "Setting up database migrations")),
    });

    const resp = await app.request("/api/threads/search?q=authentication", {
      headers: headers(),
    });
    expect(resp.status).toBe(200);

    const data = await resp.json();
    expect(data.threads).toHaveLength(1);
    expect(data.threads[0].id).toBe("t-1");
    expect(data.hasMore).toBe(false);
  });

  test("GET /api/threads/search — searches message content", async () => {
    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(
        makeSnapshot("t-msg", "Generic Title", [
          makeTextMessage("user", "How do I configure webpack?", 0),
          makeTextMessage("assistant", "Here is how to set up webpack...", 1),
        ]),
      ),
    });

    const resp = await app.request("/api/threads/search?q=webpack", { headers: headers() });
    const data = await resp.json();
    expect(data.threads).toHaveLength(1);
    expect(data.threads[0].id).toBe("t-msg");
  });

  test("GET /api/threads/search — returns empty for non-matching query", async () => {
    await app.request("/api/threads", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(makeSnapshot("t-1", "Hello world")),
    });

    const resp = await app.request("/api/threads/search?q=nonexistent_term_xyz", {
      headers: headers(),
    });
    const data = await resp.json();
    expect(data.threads).toHaveLength(0);
  });

  test("GET /api/threads/search — respects limit", async () => {
    for (let i = 0; i < 5; i++) {
      await app.request("/api/threads", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(makeSnapshot(`t-${i}`, `Thread about testing ${i}`)),
      });
    }

    const resp = await app.request("/api/threads/search?q=testing&limit=2", {
      headers: headers(),
    });
    const data = await resp.json();
    expect(data.threads).toHaveLength(2);
    expect(data.hasMore).toBe(true);
  });

  test("GET /api/threads/search — returns 400 without q param", async () => {
    const resp = await app.request("/api/threads/search", { headers: headers() });
    expect(resp.status).toBe(400);
  });
});
