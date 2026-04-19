/**
 * api-client.test.ts — InternalApiClient unit tests
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ApiNotConfiguredError,
  InternalApiClient,
  type InternalApiClientConfig,
} from "./api-client.js";

// ─── Mock fetch helpers ─────────────────────────────────

function createMockFetch(
  responses: Array<{
    status: number;
    body?: unknown;
    contentType?: string;
  }>,
): { fn: typeof fetch; calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let callIndex = 0;

  const fn = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init: init ?? {} });
    const resp = responses[Math.min(callIndex++, responses.length - 1)];
    return new Response(
      resp.body !== undefined ? JSON.stringify(resp.body) : null,
      {
        status: resp.status,
        headers: resp.contentType
          ? { "Content-Type": resp.contentType }
          : resp.body !== undefined
            ? { "Content-Type": "application/json" }
            : {},
      },
    );
  };

  return { fn: fn as typeof fetch, calls };
}

function createClient(
  config?: Partial<InternalApiClientConfig>,
  fetchFn?: typeof fetch,
): InternalApiClient {
  return new InternalApiClient(
    {
      baseUrl: config?.baseUrl ?? "https://api.test.com",
      authToken: config?.authToken ?? "test-token",
      installationId: config?.installationId,
      ...config,
    },
    fetchFn,
  );
}

// ─── Tests ───────────────────────────────────────────────

describe("InternalApiClient", () => {
  describe("ApiNotConfiguredError", () => {
    it("is thrown when baseUrl is empty", async () => {
      const client = createClient({ baseUrl: "" });
      await assert.rejects(
        () => client.setThreadLabels("t1", ["bug"]),
        (err: unknown) => {
          assert.ok(err instanceof ApiNotConfiguredError);
          return true;
        },
      );
    });
  });

  describe("setThreadLabels", () => {
    it("sends PUT request with correct path and body", async () => {
      const { fn, calls } = createMockFetch([{ status: 204 }]);
      const client = createClient(undefined, fn);

      await client.setThreadLabels("thread-123", ["bug", "urgent"]);

      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://api.test.com/threads/thread-123/labels");
      assert.equal(calls[0].init.method, "PUT");
      assert.deepEqual(JSON.parse(calls[0].init.body as string), {
        labels: ["bug", "urgent"],
      });
    });

    it("includes auth header when token is provided", async () => {
      const { fn, calls } = createMockFetch([{ status: 204 }]);
      const client = createClient({ authToken: "my-token" }, fn);

      await client.setThreadLabels("t1", []);

      const headers = calls[0].init.headers as Record<string, string>;
      assert.equal(headers["Authorization"], "Bearer my-token");
    });
  });

  describe("shareThreadWithSupport", () => {
    it("sends POST and returns shareUrl", async () => {
      const { fn } = createMockFetch([
        { status: 200, body: { shareUrl: "https://shared.example.com/abc" } },
      ]);
      const client = createClient(undefined, fn);

      const result = await client.shareThreadWithSupport("t1");
      assert.equal(result.shareUrl, "https://shared.example.com/abc");
    });
  });

  describe("setThreadVisibility", () => {
    it("sends PUT with visibility body", async () => {
      const { fn, calls } = createMockFetch([{ status: 204 }]);
      const client = createClient(undefined, fn);

      await client.setThreadVisibility("t1", "public");

      assert.equal(calls[0].init.method, "PUT");
      assert.deepEqual(JSON.parse(calls[0].init.body as string), { visibility: "public" });
    });
  });

  describe("getNewsFeed", () => {
    it("returns news items from GET /news", async () => {
      const items = [
        { id: "n1", title: "Test News", content: "Body", date: "2026-01-01" },
      ];
      const { fn } = createMockFetch([{ status: 200, body: { items } }]);
      const client = createClient(undefined, fn);

      const result = await client.getNewsFeed();
      assert.equal(result.length, 1);
      assert.equal(result[0].id, "n1");
      assert.equal(result[0].title, "Test News");
    });

    it("returns empty array when items not in response", async () => {
      const { fn } = createMockFetch([{ status: 200, body: {} }]);
      const client = createClient(undefined, fn);

      const result = await client.getNewsFeed();
      assert.deepEqual(result, []);
    });
  });

  describe("reportUsage", () => {
    it("sends POST to /usage with report data", async () => {
      const { fn, calls } = createMockFetch([{ status: 204 }]);
      const client = createClient(undefined, fn);

      await client.reportUsage({
        threadId: "t1",
        model: "claude-sonnet-4-20250514",
        inputTokens: 1000,
        outputTokens: 500,
        durationMs: 2000,
      });

      assert.equal(calls[0].url, "https://api.test.com/usage");
      assert.equal(calls[0].init.method, "POST");
      const body = JSON.parse(calls[0].init.body as string);
      assert.equal(body.model, "claude-sonnet-4-20250514");
      assert.equal(body.inputTokens, 1000);
    });
  });

  describe("retry on 5xx", () => {
    it("retries on 500 and eventually succeeds", async () => {
      const { fn, calls } = createMockFetch([
        { status: 500 },
        { status: 500 },
        { status: 200, body: { items: [] } },
      ]);
      const client = new InternalApiClient(
        { baseUrl: "https://api.test.com", authToken: "t" },
        fn,
      );

      const result = await client.getNewsFeed();
      assert.deepEqual(result, []);
      // Should have made 3 requests (2 retries + 1 success)
      assert.equal(calls.length, 3);
    });

    it("throws after MAX_RETRIES exceeded", async () => {
      const { fn } = createMockFetch([
        { status: 500 },
        { status: 500 },
        { status: 500 },
        { status: 500 },
      ]);
      const client = new InternalApiClient(
        { baseUrl: "https://api.test.com", authToken: "t" },
        fn,
      );

      await assert.rejects(
        () => client.getNewsFeed(),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes("500"));
          return true;
        },
      );
    });
  });

  describe("installation ID header", () => {
    it("sends X-Installation-Id header when configured", async () => {
      const { fn, calls } = createMockFetch([{ status: 204 }]);
      const client = createClient(
        { installationId: "inst-abc" },
        fn,
      );

      await client.setThreadLabels("t1", []);

      const headers = calls[0].init.headers as Record<string, string>;
      assert.equal(headers["X-Installation-Id"], "inst-abc");
    });
  });
});
