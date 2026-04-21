/**
 * @flitter/llm — InternalApiClient tests
 *
 * Tests: thread labels, sharing, visibility, listing, retry logic
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ThreadVisibility } from "./api-client";
import { ApiClientError, InternalApiClient } from "./api-client";

// ─── Mock Fetch ──────────────────────────────────────────

interface MockResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

function createMockFetch(responses: MockResponse[]): typeof globalThis.fetch {
  let callIndex = 0;
  const calls: Array<{ url: string; options: RequestInit }> = [];

  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, options: init ?? {} });

    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;

    const ok = resp.status >= 200 && resp.status < 300;
    const body = resp.body !== undefined ? JSON.stringify(resp.body) : "";
    const headers = new Headers(resp.headers ?? {});

    return {
      ok,
      status: resp.status,
      headers,
      text: async () => body,
      json: async () => (body ? JSON.parse(body) : {}),
    } as Response;
  };

  // Attach calls array for inspection
  (mockFetch as unknown as { calls: typeof calls }).calls = calls;

  return mockFetch as unknown as typeof globalThis.fetch;
}

function getCalls(fetch: typeof globalThis.fetch): Array<{ url: string; options: RequestInit }> {
  return (fetch as unknown as { calls: Array<{ url: string; options: RequestInit }> }).calls;
}

// ─── Thread Labels ───────────────────────────────────────

describe("InternalApiClient — Thread Labels", () => {
  it("should get thread labels", async () => {
    const labels = [{ id: "l1", name: "bug", color: "#ff0000" }];
    const fetch = createMockFetch([{ status: 200, body: { labels } }]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      fetch,
      delay: async () => {},
    });

    const result = await client.getThreadLabels("thread-1");

    assert.deepEqual(result, labels);
    const calls = getCalls(fetch);
    assert.equal(calls[0].url, "https://api.example.com/threads/thread-1/labels");
    assert.equal(
      (calls[0].options.headers as Record<string, string>).Authorization,
      "Bearer token-123",
    );
  });

  it("should add a label to a thread", async () => {
    const label = { id: "l2", name: "feature", color: "#00ff00" };
    const fetch = createMockFetch([{ status: 201, body: label }]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      fetch,
      delay: async () => {},
    });

    const result = await client.addThreadLabel("thread-1", { name: "feature", color: "#00ff00" });

    assert.deepEqual(result, label);
    const calls = getCalls(fetch);
    assert.equal(calls[0].options.method, "POST");
    assert.equal(JSON.parse(calls[0].options.body as string).name, "feature");
  });

  it("should remove a label from a thread", async () => {
    const fetch = createMockFetch([{ status: 204 }]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      fetch,
      delay: async () => {},
    });

    await client.removeThreadLabel("thread-1", "label-1");

    const calls = getCalls(fetch);
    assert.equal(calls[0].options.method, "DELETE");
    assert.equal(calls[0].url, "https://api.example.com/threads/thread-1/labels/label-1");
  });
});

// ─── Thread Sharing / Visibility ─────────────────────────

describe("InternalApiClient — Thread Sharing", () => {
  it("should set thread visibility", async () => {
    const fetch = createMockFetch([{ status: 200, body: {} }]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      fetch,
      delay: async () => {},
    });

    await client.setThreadVisibility("thread-1", "public_unlisted");

    const calls = getCalls(fetch);
    assert.equal(calls[0].options.method, "PATCH");
    const body = JSON.parse(calls[0].options.body as string);
    assert.equal(body.visibility, "public_unlisted");
  });

  it("should share a thread", async () => {
    const shareResult = {
      shareUrl: "https://example.com/share/abc",
      visibility: "public_unlisted" as ThreadVisibility,
    };
    const fetch = createMockFetch([{ status: 200, body: shareResult }]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      fetch,
      delay: async () => {},
    });

    const result = await client.shareThread("thread-1");

    assert.deepEqual(result, shareResult);
    const calls = getCalls(fetch);
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].url, "https://api.example.com/threads/thread-1/share");
  });

  it("should share with custom visibility", async () => {
    const fetch = createMockFetch([
      {
        status: 200,
        body: { shareUrl: "url", visibility: "thread_workspace_shared" },
      },
    ]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      fetch,
      delay: async () => {},
    });

    await client.shareThread("thread-1", "thread_workspace_shared");

    const calls = getCalls(fetch);
    const body = JSON.parse(calls[0].options.body as string);
    assert.equal(body.visibility, "thread_workspace_shared");
  });
});

// ─── Thread Listing ──────────────────────────────────────

describe("InternalApiClient — Thread Listing", () => {
  it("should list threads", async () => {
    const threadData = {
      threads: [
        {
          id: "t1",
          title: "Test thread",
          visibility: "private" as ThreadVisibility,
          labels: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          messageCount: 5,
        },
      ],
      total: 1,
    };
    const fetch = createMockFetch([{ status: 200, body: threadData }]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      fetch,
      delay: async () => {},
    });

    const result = await client.listThreads();

    assert.deepEqual(result, threadData);
  });

  it("should pass query parameters for listing", async () => {
    const fetch = createMockFetch([
      {
        status: 200,
        body: { threads: [], total: 0 },
      },
    ]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      fetch,
      delay: async () => {},
    });

    await client.listThreads({ limit: 10, offset: 20, labelId: "l1" });

    const calls = getCalls(fetch);
    const url = new URL(calls[0].url);
    assert.equal(url.searchParams.get("limit"), "10");
    assert.equal(url.searchParams.get("offset"), "20");
    assert.equal(url.searchParams.get("label_id"), "l1");
  });

  it("should get a specific thread", async () => {
    const thread = {
      id: "t1",
      title: "My thread",
      visibility: "private" as ThreadVisibility,
      labels: [],
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
      messageCount: 3,
    };
    const fetch = createMockFetch([{ status: 200, body: thread }]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      fetch,
      delay: async () => {},
    });

    const result = await client.getThread("t1");
    assert.deepEqual(result, thread);
  });
});

// ─── Retry Logic ─────────────────────────────────────────

describe("InternalApiClient — Retry Logic", () => {
  it("should retry on 429 with backoff", async () => {
    const delays: number[] = [];
    const fetch = createMockFetch([
      { status: 429, body: { error: "rate limited" } },
      { status: 429, body: { error: "rate limited" } },
      { status: 200, body: { threads: [], total: 0 } },
    ]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      maxRetries: 2,
      fetch,
      delay: async (ms) => {
        delays.push(ms);
      },
    });

    const result = await client.listThreads();

    assert.equal(getCalls(fetch).length, 3);
    assert.equal(delays.length, 2);
    assert.deepEqual(result, { threads: [], total: 0 });
  });

  it("should retry on 500 server error", async () => {
    const fetch = createMockFetch([
      { status: 500, body: { error: "internal error" } },
      { status: 200, body: { labels: [] } },
    ]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      maxRetries: 1,
      fetch,
      delay: async () => {},
    });

    const result = await client.getThreadLabels("t1");
    assert.deepEqual(result, []);
    assert.equal(getCalls(fetch).length, 2);
  });

  it("should retry on 503 service unavailable", async () => {
    const fetch = createMockFetch([
      { status: 503, body: { error: "service unavailable" } },
      { status: 200, body: { labels: [] } },
    ]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      maxRetries: 1,
      fetch,
      delay: async () => {},
    });

    const result = await client.getThreadLabels("t1");
    assert.deepEqual(result, []);
  });

  it("should NOT retry on 401", async () => {
    const fetch = createMockFetch([{ status: 401, body: { error: "unauthorized" } }]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "bad-token",
      maxRetries: 2,
      fetch,
      delay: async () => {},
    });

    await assert.rejects(client.listThreads(), (err: unknown) => {
      assert.ok(err instanceof ApiClientError);
      assert.equal(err.status, 401);
      return true;
    });

    assert.equal(getCalls(fetch).length, 1); // No retries
  });

  it("should NOT retry on 400", async () => {
    const fetch = createMockFetch([{ status: 400, body: { error: "bad request" } }]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      maxRetries: 2,
      fetch,
      delay: async () => {},
    });

    await assert.rejects(client.addThreadLabel("t1", { name: "" }), (err: unknown) => {
      assert.ok(err instanceof ApiClientError);
      assert.equal(err.status, 400);
      return true;
    });

    assert.equal(getCalls(fetch).length, 1);
  });

  it("should respect x-should-retry header", async () => {
    const fetch = createMockFetch([
      { status: 400, body: { error: "temporary" }, headers: { "x-should-retry": "true" } },
      { status: 200, body: { labels: [] } },
    ]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      maxRetries: 1,
      fetch,
      delay: async () => {},
    });

    const result = await client.getThreadLabels("t1");
    assert.deepEqual(result, []);
    assert.equal(getCalls(fetch).length, 2);
  });

  it("should throw after all retries exhausted", async () => {
    const fetch = createMockFetch([
      { status: 500, body: { error: "server error" } },
      { status: 500, body: { error: "server error" } },
      { status: 500, body: { error: "server error" } },
    ]);

    const client = new InternalApiClient({
      baseUrl: "https://api.example.com",
      authToken: "token-123",
      maxRetries: 2,
      fetch,
      delay: async () => {},
    });

    await assert.rejects(client.listThreads(), (err: unknown) => {
      assert.ok(err instanceof ApiClientError);
      assert.equal(err.status, 500);
      return true;
    });

    assert.equal(getCalls(fetch).length, 3); // 1 initial + 2 retries
  });
});

// ─── ApiClientError ──────────────────────────────────────

describe("ApiClientError", () => {
  it("should have correct properties", () => {
    const err = new ApiClientError(404, "GET", "/threads/t1", "Not found");
    assert.equal(err.status, 404);
    assert.equal(err.method, "GET");
    assert.equal(err.path, "/threads/t1");
    assert.equal(err.name, "ApiClientError");
    assert.ok(err.message.includes("404"));
    assert.ok(err.message.includes("GET"));
    assert.ok(err.message.includes("/threads/t1"));
  });

  it("should be an instance of Error", () => {
    const err = new ApiClientError(500, "POST", "/test", "error");
    assert.ok(err instanceof Error);
    assert.ok(err instanceof ApiClientError);
  });
});
