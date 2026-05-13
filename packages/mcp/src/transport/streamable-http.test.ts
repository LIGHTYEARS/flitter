/**
 * Tests for MCP StreamableHTTP Transport and SSE Event Parser.
 *
 * Uses node:http createServer as mock HTTP/SSE server.
 * Test patterns: node:test + node:assert/strict, co-located test file.
 */

import assert from "node:assert/strict";
import http from "node:http";
import { afterEach, describe, it } from "node:test";
import type { JSONRPCMessage, JSONRPCNotification, JSONRPCSuccessResponse } from "../types";
import type { SSEEvent } from "./sse-parser";
import { createSSEParser, SSEEventParser } from "./sse-parser";
import { StreamableHTTPError, StreamableHTTPTransport, UnauthorizedError } from "./streamable-http";

// ─── Test helpers ──────────────────────────────────────

/** Collect all events from a ReadableStream. */
async function collectStream<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const items: T[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    items.push(value);
  }
  return items;
}

/** Create an SSE-format string from events. */
function formatSSEEvents(events: Array<{ event?: string; data: string; id?: string }>): string {
  let result = "";
  for (const evt of events) {
    if (evt.event) result += `event: ${evt.event}\n`;
    if (evt.id) result += `id: ${evt.id}\n`;
    const dataLines = evt.data.split("\n");
    for (const line of dataLines) {
      result += `data: ${line}\n`;
    }
    result += "\n";
  }
  return result;
}

/** Pipe a string through an SSEEventParser and collect the results. */
async function parseSSEString(
  input: string,
  options?: { onRetry?: (ms: number) => void; onComment?: (c: string) => void },
): Promise<SSEEvent[]> {
  const readable = new ReadableStream<string>({
    start(controller) {
      controller.enqueue(input);
      controller.close();
    },
  });
  return collectStream(readable.pipeThrough(new SSEEventParser(options)));
}

/** Helper to start an HTTP server on a random port. */
function createTestServer(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

/** Close a server. */
function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

// ─── SSE Parser Tests ──────────────────────────────────

describe("SSEEventParser", () => {
  it("should parse a single event", async () => {
    const events = await parseSSEString("data: hello\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "hello");
    assert.equal(events[0].event, undefined);
    assert.equal(events[0].id, undefined);
  });

  it("should parse event with type", async () => {
    const events = await parseSSEString("event: custom\ndata: hello\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "custom");
    assert.equal(events[0].data, "hello");
  });

  it("should parse event with id", async () => {
    const events = await parseSSEString("id: 42\ndata: hello\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].id, "42");
    assert.equal(events[0].data, "hello");
  });

  it("should parse multiple events", async () => {
    const input = "data: first\n\ndata: second\n\n";
    const events = await parseSSEString(input);
    assert.equal(events.length, 2);
    assert.equal(events[0].data, "first");
    assert.equal(events[1].data, "second");
  });

  it("should handle multi-line data", async () => {
    const input = "data: line1\ndata: line2\ndata: line3\n\n";
    const events = await parseSSEString(input);
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "line1\nline2\nline3");
  });

  it("should filter comment lines", async () => {
    const comments: string[] = [];
    const events = await parseSSEString(": this is a comment\ndata: hello\n\n", {
      onComment: (c) => comments.push(c),
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "hello");
    assert.equal(comments.length, 1);
    assert.equal(comments[0], "this is a comment");
  });

  it("should handle comment without space after colon", async () => {
    const comments: string[] = [];
    await parseSSEString(":comment\n\n", {
      onComment: (c) => comments.push(c),
    });
    assert.equal(comments.length, 1);
    assert.equal(comments[0], "comment");
  });

  it("should strip BOM from first chunk", async () => {
    const events = await parseSSEString("\uFEFFdata: hello\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "hello");
  });

  it("should not emit event on empty data (empty line without data fields)", async () => {
    // Just empty lines -- no data field means no event dispatched
    const events = await parseSSEString("\n\n\n");
    assert.equal(events.length, 0);
  });

  it("should parse retry field", async () => {
    let retryValue: number | undefined;
    await parseSSEString("retry: 5000\ndata: hello\n\n", {
      onRetry: (ms) => {
        retryValue = ms;
      },
    });
    assert.equal(retryValue, 5000);
  });

  it("should ignore invalid retry field", async () => {
    let retryValue: number | undefined;
    await parseSSEString("retry: not-a-number\ndata: hello\n\n", {
      onRetry: (ms) => {
        retryValue = ms;
      },
    });
    assert.equal(retryValue, undefined);
  });

  it("should handle data field without space after colon", async () => {
    const events = await parseSSEString("data:no-space\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "no-space");
  });

  it("should persist id across events", async () => {
    const events = await parseSSEString("id: 1\ndata: first\n\ndata: second\n\n");
    assert.equal(events.length, 2);
    assert.equal(events[0].id, "1");
    // id persists to subsequent events per SSE spec
    assert.equal(events[1].id, "1");
  });

  it("should handle chunks split across multiple enqueues", async () => {
    const readable = new ReadableStream<string>({
      start(controller) {
        controller.enqueue("data: hel");
        controller.enqueue("lo\n\n");
        controller.close();
      },
    });
    const events = await collectStream(readable.pipeThrough(new SSEEventParser()));
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "hello");
  });

  it("should handle event+data+id all together", async () => {
    const input = "id: abc\nevent: update\ndata: payload\n\n";
    const events = await parseSSEString(input);
    assert.equal(events.length, 1);
    assert.equal(events[0].id, "abc");
    assert.equal(events[0].event, "update");
    assert.equal(events[0].data, "payload");
  });

  it("should handle JSON data in event", async () => {
    const json = '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}';
    const events = await parseSSEString(`data: ${json}\n\n`);
    assert.equal(events.length, 1);
    const parsed = JSON.parse(events[0].data);
    assert.equal(parsed.jsonrpc, "2.0");
    assert.deepEqual(parsed.result, { tools: [] });
  });

  it("should handle \\r\\n line endings", async () => {
    const events = await parseSSEString("data: hello\r\n\r\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "hello");
  });
});

describe("createSSEParser", () => {
  it("should parse events via feed()", () => {
    const events: SSEEvent[] = [];
    const parser = createSSEParser({
      onEvent: (e) => events.push(e),
    });
    parser.feed("data: test\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "test");
  });

  it("should reset state", () => {
    const events: SSEEvent[] = [];
    const parser = createSSEParser({
      onEvent: (e) => events.push(e),
    });
    parser.feed("data: partial");
    parser.reset();
    parser.feed("data: fresh\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "fresh");
  });
});

// ─── StreamableHTTP Transport Tests ────────────────────

describe("StreamableHTTPTransport", () => {
  let server: http.Server;
  let serverUrl: string;
  let transport: StreamableHTTPTransport;

  afterEach(async () => {
    if (transport) {
      try {
        await transport.close();
      } catch {
        // ignore
      }
    }
    if (server) {
      await closeServer(server);
    }
  });

  it("should throw if started twice", async () => {
    const s = await createTestServer((_req, res) => res.end());
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();
    await assert.rejects(() => transport.start(), /already started/i);
  });

  it("should POST JSON and receive JSON response", async () => {
    const s = await createTestServer((req, res) => {
      let body = "";
      req.on("data", (c: Buffer) => (body += c.toString()));
      req.on("end", () => {
        const msg = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: "pong" }));
      });
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    assert.equal(received.length, 1);
    assert.equal((received[0] as JSONRPCSuccessResponse).result, "pong");
  });

  it("should POST JSON and receive SSE stream response", async () => {
    const s = await createTestServer((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
      res.write(
        formatSSEEvents([
          {
            data: '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}',
          },
        ]),
      );
      res.end();
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    await transport.send({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    // SSE stream is processed async; wait for it
    await new Promise<void>((resolve) => {
      const check = () => {
        if (received.length > 0) resolve();
        else setTimeout(check, 10);
      };
      check();
    });

    assert.equal(received.length, 1);
    assert.deepEqual((received[0] as JSONRPCSuccessResponse).result, { tools: [] });
  });

  it("should receive multiple messages from SSE stream", async () => {
    const s = await createTestServer((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
      res.write(
        formatSSEEvents([
          { data: '{"jsonrpc":"2.0","id":1,"result":"first"}', id: "evt-1" },
          {
            data: '{"jsonrpc":"2.0","method":"notifications/tools/list_changed"}',
            id: "evt-2",
          },
        ]),
      );
      res.end();
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    await transport.send({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    // Wait for SSE stream to be fully processed
    await new Promise<void>((resolve) => {
      const check = () => {
        if (received.length >= 2) resolve();
        else setTimeout(check, 10);
      };
      check();
    });

    assert.equal(received.length, 2);
    assert.equal((received[0] as JSONRPCSuccessResponse).result, "first");
    assert.equal((received[1] as JSONRPCNotification).method, "notifications/tools/list_changed");
  });

  it("should capture mcp-session-id from response headers", async () => {
    const s = await createTestServer((_req, res) => {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "mcp-session-id": "session-abc-123",
      });
      res.end('{"jsonrpc":"2.0","id":1,"result":"ok"}');
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    transport.onmessage = () => {};
    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    assert.equal(transport.sessionId, "session-abc-123");
  });

  it("should send mcp-session-id in subsequent requests", async () => {
    let requestCount = 0;
    let capturedSessionHeader: string | undefined;

    const s = await createTestServer((req, res) => {
      requestCount++;
      capturedSessionHeader = req.headers["mcp-session-id"] as string | undefined;

      res.writeHead(200, {
        "Content-Type": "application/json",
        "mcp-session-id": "session-xyz",
      });
      res.end(`{"jsonrpc":"2.0","id":${requestCount},"result":"ok"}`);
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();
    transport.onmessage = () => {};

    // First request -- no session ID yet
    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });
    assert.equal(capturedSessionHeader, undefined);

    // Second request -- should include session ID from first response
    await transport.send({ jsonrpc: "2.0", id: 2, method: "ping" });
    assert.equal(capturedSessionHeader, "session-xyz");
  });

  it("should handle 202 Accepted for notifications", async () => {
    const s = await createTestServer((_req, res) => {
      res.writeHead(202);
      res.end();
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    // Should not throw
    await transport.send({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });
  });

  it("should throw UnauthorizedError on 401 with auth provider", async () => {
    const s = await createTestServer((_req, res) => {
      res.writeHead(401);
      res.end("Unauthorized");
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({
      url: serverUrl,
      authProvider: {
        tokens: async () => ({ access_token: "expired-token" }),
      },
    });
    await transport.start();

    await assert.rejects(
      () => transport.send({ jsonrpc: "2.0", id: 1, method: "ping" }),
      (err: unknown) => {
        assert.ok(err instanceof UnauthorizedError);
        return true;
      },
    );
  });

  it("should throw StreamableHTTPError on 401 without auth provider", async () => {
    const s = await createTestServer((_req, res) => {
      res.writeHead(401);
      res.end("Unauthorized");
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    await assert.rejects(
      () => transport.send({ jsonrpc: "2.0", id: 1, method: "ping" }),
      (err: unknown) => {
        assert.ok(err instanceof StreamableHTTPError);
        assert.equal((err as StreamableHTTPError).status, 401);
        return true;
      },
    );
  });

  it("should throw StreamableHTTPError on 500", async () => {
    const s = await createTestServer((_req, res) => {
      res.writeHead(500);
      res.end("Internal Server Error");
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    await assert.rejects(
      () => transport.send({ jsonrpc: "2.0", id: 1, method: "ping" }),
      (err: unknown) => {
        assert.ok(err instanceof StreamableHTTPError);
        assert.equal((err as StreamableHTTPError).status, 500);
        return true;
      },
    );
  });

  it("should throw on unexpected content type", async () => {
    const s = await createTestServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html>oops</html>");
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    await assert.rejects(
      () => transport.send({ jsonrpc: "2.0", id: 1, method: "ping" }),
      (err: unknown) => {
        assert.ok(err instanceof StreamableHTTPError);
        assert.ok((err as Error).message.includes("Unexpected content type"));
        return true;
      },
    );
  });

  it("should include Authorization header from auth provider", async () => {
    let capturedAuth: string | undefined;

    const s = await createTestServer((req, res) => {
      capturedAuth = req.headers.authorization as string | undefined;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"jsonrpc":"2.0","id":1,"result":"ok"}');
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({
      url: serverUrl,
      authProvider: {
        tokens: async () => ({ access_token: "my-token-123" }),
      },
    });
    await transport.start();
    transport.onmessage = () => {};

    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    assert.equal(capturedAuth, "Bearer my-token-123");
  });

  it("should include custom headers", async () => {
    let capturedCustom: string | undefined;

    const s = await createTestServer((req, res) => {
      capturedCustom = req.headers["x-custom-header"] as string | undefined;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"jsonrpc":"2.0","id":1,"result":"ok"}');
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({
      url: serverUrl,
      headers: { "X-Custom-Header": "custom-value" },
    });
    await transport.start();
    transport.onmessage = () => {};

    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    assert.equal(capturedCustom, "custom-value");
  });

  it("should set protocol version header", async () => {
    let capturedVersion: string | undefined;

    const s = await createTestServer((req, res) => {
      capturedVersion = req.headers["mcp-protocol-version"] as string | undefined;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"jsonrpc":"2.0","id":1,"result":"ok"}');
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();
    transport.onmessage = () => {};

    transport.setProtocolVersion("2025-03-26");

    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    assert.equal(capturedVersion, "2025-03-26");
  });

  it("should terminate session with HTTP DELETE", async () => {
    let deleteReceived = false;
    let deleteSessionId: string | undefined;

    const s = await createTestServer((req, res) => {
      if (req.method === "DELETE") {
        deleteReceived = true;
        deleteSessionId = req.headers["mcp-session-id"] as string | undefined;
        res.writeHead(200);
        res.end();
      } else {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "mcp-session-id": "sess-to-delete",
        });
        res.end('{"jsonrpc":"2.0","id":1,"result":"ok"}');
      }
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();
    transport.onmessage = () => {};

    // First, establish a session
    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });
    assert.equal(transport.sessionId, "sess-to-delete");

    // Now terminate
    await transport.terminateSession();

    assert.ok(deleteReceived);
    assert.equal(deleteSessionId, "sess-to-delete");
    assert.equal(transport.sessionId, undefined);
  });

  it("should not send DELETE if no session", async () => {
    let requestReceived = false;

    const s = await createTestServer((_req, res) => {
      requestReceived = true;
      res.writeHead(200);
      res.end();
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    await transport.terminateSession();

    assert.equal(requestReceived, false);
  });

  it("should handle 405 on terminateSession gracefully", async () => {
    const s = await createTestServer((req, res) => {
      if (req.method === "DELETE") {
        res.writeHead(405);
        res.end("Method Not Allowed");
      } else {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "mcp-session-id": "sess-405",
        });
        res.end('{"jsonrpc":"2.0","id":1,"result":"ok"}');
      }
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();
    transport.onmessage = () => {};

    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    // 405 should not throw
    await transport.terminateSession();
  });

  it("should call onerror on HTTP error", async () => {
    const s = await createTestServer((_req, res) => {
      res.writeHead(500);
      res.end("Server Error");
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    const errors: Error[] = [];
    transport.onerror = (err) => errors.push(err);

    try {
      await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });
    } catch {
      // expected
    }

    assert.ok(errors.length > 0);
    assert.ok(errors[0] instanceof StreamableHTTPError);
  });

  it("should call onclose when close() is called", async () => {
    const s = await createTestServer((_req, res) => res.end());
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    let closeCalled = false;
    transport.onclose = () => {
      closeCalled = true;
    };

    await transport.close();

    assert.ok(closeCalled);
  });

  it("should track SSE event id for resumption", async () => {
    let capturedLastEventId: string | undefined;
    let requestCount = 0;

    const s = await createTestServer((req, res) => {
      requestCount++;
      capturedLastEventId = req.headers["last-event-id"] as string | undefined;

      if (requestCount === 1) {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        res.write(
          formatSSEEvents([
            {
              data: '{"jsonrpc":"2.0","id":1,"result":"ok"}',
              id: "resume-token-42",
            },
          ]),
        );
        res.end();
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"jsonrpc":"2.0","id":2,"result":"ok"}');
      }
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    // First request -- gets SSE with event ID
    await transport.send({ jsonrpc: "2.0", id: 1, method: "tools/list" });

    // Wait for SSE processing
    await new Promise<void>((resolve) => {
      const check = () => {
        if (received.length > 0) resolve();
        else setTimeout(check, 10);
      };
      check();
    });

    // Second request -- should include Last-Event-ID
    await transport.send({ jsonrpc: "2.0", id: 2, method: "ping" });

    assert.equal(capturedLastEventId, "resume-token-42");
  });

  it("should handle notification messages (no response body expected)", async () => {
    let receivedBody = "";

    const s = await createTestServer((req, res) => {
      let body = "";
      req.on("data", (c: Buffer) => (body += c.toString()));
      req.on("end", () => {
        receivedBody = body;
        // Server sends 200 with JSON but transport should cancel the body for notifications
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end('{"jsonrpc":"2.0","id":999,"result":"should-be-ignored"}');
      });
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();

    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    await transport.send({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    // Give some time for any async processing
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // Notification body should have been sent
    const parsed = JSON.parse(receivedBody);
    assert.equal(parsed.method, "notifications/initialized");

    // But onmessage should NOT have been called (response body cancelled)
    assert.equal(received.length, 0);
  });

  it("should accept URL object in constructor", async () => {
    const s = await createTestServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"jsonrpc":"2.0","id":1,"result":"ok"}');
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: new URL(serverUrl) });
    await transport.start();
    transport.onmessage = () => {};

    // Should not throw
    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });
  });

  it("should handle auth provider returning undefined tokens", async () => {
    let capturedAuth: string | undefined;

    const s = await createTestServer((req, res) => {
      capturedAuth = req.headers.authorization as string | undefined;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"jsonrpc":"2.0","id":1,"result":"ok"}');
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({
      url: serverUrl,
      authProvider: {
        tokens: async () => undefined,
      },
    });
    await transport.start();
    transport.onmessage = () => {};

    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    assert.equal(capturedAuth, undefined);
  });

  it("should send correct Content-Type and Accept headers", async () => {
    let capturedContentType: string | undefined;
    let capturedAccept: string | undefined;

    const s = await createTestServer((req, res) => {
      capturedContentType = req.headers["content-type"] as string | undefined;
      capturedAccept = req.headers.accept as string | undefined;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"jsonrpc":"2.0","id":1,"result":"ok"}');
    });
    server = s.server;
    serverUrl = s.url;

    transport = new StreamableHTTPTransport({ url: serverUrl });
    await transport.start();
    transport.onmessage = () => {};

    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    assert.equal(capturedContentType, "application/json");
    assert.equal(capturedAccept, "application/json, text/event-stream");
  });
});
