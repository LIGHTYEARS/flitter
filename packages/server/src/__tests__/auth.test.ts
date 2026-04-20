/**
 * @flitter/server — Auth tests
 */
import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { authMiddleware, generateApiKey, hashKey } from "../auth";
import { createDb } from "../db";

describe("generateApiKey", () => {
  test("produces key with flitter_sk_ prefix", () => {
    const { raw } = generateApiKey();
    expect(raw.startsWith("flitter_sk_")).toBe(true);
  });

  test("produces different keys on each call", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });

  test("hash is a 64-char hex string (SHA-256)", () => {
    const { hash } = generateApiKey();
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  test("hashKey is deterministic", () => {
    const key = "flitter_sk_test123";
    expect(hashKey(key)).toBe(hashKey(key));
  });

  test("hash matches for the generated key", () => {
    const { raw, hash } = generateApiKey();
    expect(hashKey(raw)).toBe(hash);
  });
});

describe("authMiddleware", () => {
  function createTestApp() {
    const db = createDb({ path: ":memory:" });
    const { raw, hash } = generateApiKey();
    db.prepare("INSERT INTO api_keys (id, key_hash, name) VALUES (?, ?, ?)").run(
      "test-key-id",
      hash,
      "test",
    );

    const app = new Hono();
    app.use("/*", authMiddleware(db));
    app.get("/test", (c) => c.json({ keyId: c.get("keyId") }));

    return { app, db, apiKey: raw };
  }

  test("returns 401 without Authorization header", async () => {
    const { app } = createTestApp();
    const resp = await app.request("/test");
    expect(resp.status).toBe(401);
    const body = await resp.json();
    expect(body.error).toContain("Missing");
  });

  test("returns 401 with invalid token", async () => {
    const { app } = createTestApp();
    const resp = await app.request("/test", {
      headers: { Authorization: "Bearer invalid-token" },
    });
    expect(resp.status).toBe(401);
    const body = await resp.json();
    expect(body.error).toContain("Invalid");
  });

  test("returns 401 with empty Bearer", async () => {
    const { app } = createTestApp();
    const resp = await app.request("/test", {
      headers: { Authorization: "Bearer " },
    });
    expect(resp.status).toBe(401);
  });

  test("returns 401 with non-Bearer auth", async () => {
    const { app } = createTestApp();
    const resp = await app.request("/test", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(resp.status).toBe(401);
  });

  test("allows request with valid API key", async () => {
    const { app, apiKey } = createTestApp();
    const resp = await app.request("/test", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.keyId).toBe("test-key-id");
  });

  test("updates last_used_at on successful auth", async () => {
    const { app, apiKey, db } = createTestApp();

    // Initially null
    const before = db
      .prepare("SELECT last_used_at FROM api_keys WHERE id = 'test-key-id'")
      .get() as {
      last_used_at: number | null;
    };
    expect(before.last_used_at).toBeNull();

    await app.request("/test", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const after = db
      .prepare("SELECT last_used_at FROM api_keys WHERE id = 'test-key-id'")
      .get() as {
      last_used_at: number | null;
    };
    expect(after.last_used_at).not.toBeNull();
  });
});
