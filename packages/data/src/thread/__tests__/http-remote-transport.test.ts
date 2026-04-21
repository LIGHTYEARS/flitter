/**
 * @flitter/data — HttpRemoteTransport tests
 *
 * Tests with mock fetch (same pattern as InternalApiClient tests).
 */
import { describe, expect, test } from "bun:test";
import type { ThreadSnapshot } from "@flitter/schemas";
import { HttpRemoteTransport } from "../http-remote-transport";

function makeSnapshot(id: string, v = 1): ThreadSnapshot {
  return {
    id,
    v,
    title: "Test",
    messages: [],
    agentMode: "normal",
  } as unknown as ThreadSnapshot;
}

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof globalThis.fetch {
  return handler as typeof globalThis.fetch;
}

describe("HttpRemoteTransport", () => {
  const BASE_URL = "http://localhost:7080";
  const TOKEN = "flitter_sk_test123";

  // ── uploadThread ────────────────────────────────────────

  test("uploadThread sends POST with correct URL, headers, body", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch((url, init) => {
        capturedUrl = url;
        capturedInit = init;
        return new Response(null, { status: 204 });
      }),
    });

    const snapshot = makeSnapshot("t-1", 1);
    await transport.uploadThread(snapshot);

    expect(capturedUrl).toBe(`${BASE_URL}/api/threads`);
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    });

    const body = JSON.parse(capturedInit?.body as string);
    expect(body.id).toBe("t-1");
  });

  test("uploadThread throws on non-2xx", async () => {
    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch(() => new Response("Server Error", { status: 500 })),
    });

    await expect(transport.uploadThread(makeSnapshot("t-1"))).rejects.toThrow("500");
  });

  // ── getThread ───────────────────────────────────────────

  test("getThread returns snapshot on 200", async () => {
    const snapshot = makeSnapshot("t-1", 3);
    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch(() => new Response(JSON.stringify(snapshot), { status: 200 })),
    });

    const result = await transport.getThread("t-1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("t-1");
    expect(result!.v).toBe(3);
  });

  test("getThread returns null on 404", async () => {
    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch(() => new Response("Not Found", { status: 404 })),
    });

    const result = await transport.getThread("nonexistent");
    expect(result).toBeNull();
  });

  test("getThread encodes thread ID in URL", async () => {
    let capturedUrl = "";
    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch((url) => {
        capturedUrl = url;
        return new Response("null", { status: 404 });
      }),
    });

    await transport.getThread("id with spaces");
    expect(capturedUrl).toBe(`${BASE_URL}/api/threads/id%20with%20spaces`);
  });

  // ── listThreads ─────────────────────────────────────────

  test("listThreads returns entries on 200", async () => {
    const entries = [
      { id: "t-1", v: 1, messageCount: 5 },
      { id: "t-2", v: 2, messageCount: 3 },
    ];
    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch(() => new Response(JSON.stringify(entries), { status: 200 })),
    });

    const result = await transport.listThreads();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("t-1");
  });

  test("listThreads passes limit query param", async () => {
    let capturedUrl = "";
    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch((url) => {
        capturedUrl = url;
        return new Response("[]", { status: 200 });
      }),
    });

    await transport.listThreads({ limit: 10 });
    expect(capturedUrl).toBe(`${BASE_URL}/api/threads?limit=10`);
  });

  test("listThreads omits limit when null", async () => {
    let capturedUrl = "";
    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch((url) => {
        capturedUrl = url;
        return new Response("[]", { status: 200 });
      }),
    });

    await transport.listThreads({ limit: null });
    expect(capturedUrl).toBe(`${BASE_URL}/api/threads`);
  });

  // ── deleteThread ────────────────────────────────────────

  test("deleteThread sends DELETE", async () => {
    let capturedMethod = "";
    let capturedUrl = "";

    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch((url, init) => {
        capturedUrl = url;
        capturedMethod = init?.method ?? "";
        return new Response(null, { status: 204 });
      }),
    });

    await transport.deleteThread("t-1");
    expect(capturedMethod).toBe("DELETE");
    expect(capturedUrl).toBe(`${BASE_URL}/api/threads/t-1`);
  });

  test("deleteThread succeeds on 404 (idempotent)", async () => {
    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch(() => new Response("Not Found", { status: 404 })),
    });

    // Should not throw
    await transport.deleteThread("nonexistent");
  });

  test("deleteThread throws on 500", async () => {
    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch(() => new Response("Error", { status: 500 })),
    });

    await expect(transport.deleteThread("t-1")).rejects.toThrow("500");
  });

  // ── Auth header ─────────────────────────────────────────

  test("always includes Authorization header", async () => {
    let capturedHeaders: Record<string, string> = {};

    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch((_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response("[]", { status: 200 });
      }),
    });

    await transport.listThreads();
    expect(capturedHeaders.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  // ── searchThreads ───────────────────────────────────────

  test("searchThreads sends GET with query params", async () => {
    let capturedUrl = "";
    const response = {
      threads: [{ id: "t-1", title: "Match", updatedAt: 123, messageCount: 5 }],
      hasMore: false,
    };

    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch((url) => {
        capturedUrl = url;
        return new Response(JSON.stringify(response), { status: 200 });
      }),
    });

    const result = await transport.searchThreads({ q: "test query", limit: 10 });
    expect(capturedUrl).toBe(`${BASE_URL}/api/threads/search?q=test+query&limit=10`);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0].id).toBe("t-1");
    expect(result.hasMore).toBe(false);
  });

  test("searchThreads omits limit when not provided", async () => {
    let capturedUrl = "";

    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch((url) => {
        capturedUrl = url;
        return new Response(JSON.stringify({ threads: [], hasMore: false }), { status: 200 });
      }),
    });

    await transport.searchThreads({ q: "hello" });
    expect(capturedUrl).toBe(`${BASE_URL}/api/threads/search?q=hello`);
  });

  test("searchThreads throws on non-2xx", async () => {
    const transport = new HttpRemoteTransport({
      baseUrl: BASE_URL,
      authToken: TOKEN,
      fetch: mockFetch(() => new Response("Server Error", { status: 500 })),
    });

    await expect(transport.searchThreads({ q: "test" })).rejects.toThrow("500");
  });

  // ── Base URL trailing slash ─────────────────────────────

  test("strips trailing slash from base URL", async () => {
    let capturedUrl = "";

    const transport = new HttpRemoteTransport({
      baseUrl: `${BASE_URL}/`,
      authToken: TOKEN,
      fetch: mockFetch((url) => {
        capturedUrl = url;
        return new Response("[]", { status: 200 });
      }),
    });

    await transport.listThreads();
    expect(capturedUrl).toBe(`${BASE_URL}/api/threads`);
  });
});
