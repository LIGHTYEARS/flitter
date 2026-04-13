/**
 * Tests for MCP SSE Transport (Legacy).
 *
 * Uses node:http createServer to mock SSE servers.
 * Covers: connection, endpoint discovery, origin validation,
 * message sending/receiving, auth headers, protocol version,
 * close behavior, and error handling.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { SSETransport, SSELineParser } from "./sse";
import type { JSONRPCMessage } from "../types";

// ─── Helpers ───────────────────────────────────────────

/** Create a mock SSE server. Returns the server and its base URL. */
function createSSEServer(
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

/** Close a server, resolving when done. */
function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

/** Wait until a condition is met, with timeout. */
function waitFor(
  condition: () => boolean,
  timeout = 3000,
  interval = 10,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const check = () => {
      if (condition()) return resolve();
      if (Date.now() > deadline) return reject(new Error("waitFor timed out"));
      setTimeout(check, interval);
    };
    check();
  });
}

/** Small delay helper. */
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── SSELineParser Tests ──────────────────────────────

describe("SSELineParser", () => {
  let parser: SSELineParser;
  beforeEach(() => {
    parser = new SSELineParser();
  });

  it("should parse a simple message event", () => {
    const events = parser.feed("data: hello\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "message");
    assert.equal(events[0].data, "hello");
  });

  it("should parse named events", () => {
    const events = parser.feed("event: endpoint\ndata: /mcp/post\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "endpoint");
    assert.equal(events[0].data, "/mcp/post");
  });

  it("should handle multi-line data", () => {
    const events = parser.feed("data: line1\ndata: line2\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "line1\nline2");
  });

  it("should handle data split across chunks", () => {
    let events = parser.feed("event: endp");
    assert.equal(events.length, 0);
    events = parser.feed("oint\ndata: /url\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].event, "endpoint");
    assert.equal(events[0].data, "/url");
  });

  it("should skip comment lines", () => {
    const events = parser.feed(": this is a comment\ndata: hello\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "hello");
  });

  it("should strip leading space from value", () => {
    const events = parser.feed("data: hello world\n\n");
    assert.equal(events[0].data, "hello world");
  });

  it("should handle \\r\\n line endings", () => {
    const events = parser.feed("data: hello\r\n\r\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "hello");
  });

  it("should handle field with no value", () => {
    const events = parser.feed("data\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "");
  });

  it("should reset state", () => {
    parser.feed("data: partial");
    parser.reset();
    const events = parser.feed("data: fresh\n\n");
    assert.equal(events.length, 1);
    assert.equal(events[0].data, "fresh");
  });

  it("should parse multiple events in one chunk", () => {
    const events = parser.feed(
      "data: first\n\nevent: custom\ndata: second\n\n"
    );
    assert.equal(events.length, 2);
    assert.equal(events[0].data, "first");
    assert.equal(events[1].event, "custom");
    assert.equal(events[1].data, "second");
  });
});

// ─── SSETransport Tests ───────────────────────────────

describe("SSETransport", () => {
  let server: http.Server | undefined;
  let transport: SSETransport | undefined;

  afterEach(async () => {
    if (transport) {
      try {
        await transport.close();
      } catch {}
      transport = undefined;
    }
    if (server) {
      try {
        await closeServer(server);
      } catch {}
      server = undefined;
    }
  });

  // ── Connection establishment ──

  it("should connect and receive endpoint event", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
        // Keep connection open
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    await transport.start();

    assert.ok(transport.endpoint);
    assert.equal(transport.endpoint!.pathname, "/mcp/post");
    assert.equal(transport.endpoint!.origin, new URL(setup.url).origin);
  });

  it("should throw if started twice", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    await transport.start();
    await assert.rejects(() => transport!.start(), /already started/i);
  });

  // ── Message receiving ──

  it("should receive JSON-RPC messages via SSE message events", async () => {
    const jsonMsg = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { tools: [] },
    });

    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
        // Send a message event after a small delay
        setTimeout(() => {
          res.write(`data: ${jsonMsg}\n\n`);
        }, 50);
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    await transport.start();

    await waitFor(() => received.length > 0);
    assert.equal(received.length, 1);
    assert.deepEqual((received[0] as any).result, { tools: [] });
  });

  it("should receive multiple messages", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
        setTimeout(() => {
          res.write(
            `data: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result: "a" })}\n\n`
          );
          res.write(
            `data: ${JSON.stringify({ jsonrpc: "2.0", id: 2, result: "b" })}\n\n`
          );
        }, 50);
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    const received: JSONRPCMessage[] = [];
    transport.onmessage = (msg) => received.push(msg);

    await transport.start();
    await waitFor(() => received.length >= 2);

    assert.equal(received.length, 2);
    assert.equal((received[0] as any).result, "a");
    assert.equal((received[1] as any).result, "b");
  });

  // ── Message sending ──

  it("should send JSON-RPC messages via POST to endpoint", async () => {
    let postedBody = "";
    let postHeaders: http.IncomingHttpHeaders = {};

    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      } else if (req.method === "POST" && req.url === "/mcp/post") {
        postHeaders = req.headers;
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          postedBody = body;
          res.writeHead(200);
          res.end();
        });
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    await transport.start();

    const msg: JSONRPCMessage = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    };
    await transport.send(msg);

    assert.equal(postedBody, JSON.stringify(msg));
    assert.equal(postHeaders["content-type"], "application/json");
  });

  it("should throw when sending before connected", async () => {
    transport = new SSETransport({ url: "http://127.0.0.1:1" });
    await assert.rejects(
      () =>
        transport!.send({ jsonrpc: "2.0", id: 1, method: "test" }),
      /Not connected/
    );
  });

  // ── Origin validation ──

  it("should reject cross-origin endpoint URL", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        // Send endpoint with a different origin
        res.write(
          "event: endpoint\ndata: http://evil.example.com/mcp/post\n\n"
        );
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    let errorCalled = false;
    transport.onerror = () => {
      errorCalled = true;
    };

    await assert.rejects(
      () => transport!.start(),
      /origin does not match/i
    );
    assert.ok(errorCalled);
  });

  // ── Auth headers ──

  it("should include Authorization header from auth provider", async () => {
    let getAuthHeader = "";
    let postAuthHeader = "";

    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        getAuthHeader = req.headers["authorization"] ?? "";
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      } else if (req.method === "POST") {
        postAuthHeader = req.headers["authorization"] ?? "";
        res.writeHead(200);
        res.end();
      }
    });
    server = setup.server;

    const authProvider = {
      tokens: async () => ({ access_token: "test-token-123" }),
    };

    transport = new SSETransport({
      url: setup.url,
      authProvider,
    });
    await transport.start();

    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    assert.equal(getAuthHeader, "Bearer test-token-123");
    assert.equal(postAuthHeader, "Bearer test-token-123");
  });

  it("should include custom headers on requests", async () => {
    let getCustomHeader = "";
    let postCustomHeader = "";

    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        getCustomHeader = req.headers["x-custom"] as string ?? "";
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      } else if (req.method === "POST") {
        postCustomHeader = req.headers["x-custom"] as string ?? "";
        res.writeHead(200);
        res.end();
      }
    });
    server = setup.server;

    transport = new SSETransport({
      url: setup.url,
      headers: { "X-Custom": "my-value" },
    });
    await transport.start();

    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    assert.equal(getCustomHeader, "my-value");
    assert.equal(postCustomHeader, "my-value");
  });

  // ── Protocol version header ──

  it("should include mcp-protocol-version header when set", async () => {
    let getVersionHeader = "";
    let postVersionHeader = "";

    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        getVersionHeader = req.headers["mcp-protocol-version"] as string ?? "";
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      } else if (req.method === "POST") {
        postVersionHeader = req.headers["mcp-protocol-version"] as string ?? "";
        res.writeHead(200);
        res.end();
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    // Note: setProtocolVersion must be called before start() for GET header
    // to be included. But our impl builds headers on-the-fly, so setting after
    // start means POST will have it but GET won't (since GET already happened).
    // To test GET, set it before start.
    transport.setProtocolVersion("2025-03-26");
    await transport.start();

    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    assert.equal(getVersionHeader, "2025-03-26");
    assert.equal(postVersionHeader, "2025-03-26");
  });

  // ── Close behavior ──

  it("should close and call onclose", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    let closeCalled = false;
    transport.onclose = () => {
      closeCalled = true;
    };

    await transport.start();
    await transport.close();

    assert.ok(closeCalled);
    assert.equal(transport.endpoint, undefined);
  });

  it("should allow starting again after close", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    await transport.start();
    await transport.close();

    // Should be able to start again
    await transport.start();
    assert.ok(transport.endpoint);
  });

  // ── Error handling ──

  it("should handle server returning non-200 on GET", async () => {
    const setup = await createSSEServer((req, res) => {
      res.writeHead(500);
      res.end("Internal Server Error");
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    let errorCalled = false;
    transport.onerror = () => {
      errorCalled = true;
    };

    await assert.rejects(() => transport!.start(), /HTTP 500/);
    assert.ok(errorCalled);
  });

  it("should handle POST returning non-200", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      } else if (req.method === "POST") {
        res.writeHead(500);
        res.end("Server Error");
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    await transport.start();

    await assert.rejects(
      () => transport!.send({ jsonrpc: "2.0", id: 1, method: "test" }),
      /HTTP 500/
    );
  });

  it("should handle POST returning 401 (unauthorized)", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      } else if (req.method === "POST") {
        res.writeHead(401);
        res.end("Unauthorized");
      }
    });
    server = setup.server;

    const authProvider = {
      tokens: async () => ({ access_token: "expired-token" }),
    };

    transport = new SSETransport({ url: setup.url, authProvider });
    await transport.start();

    await assert.rejects(
      () => transport!.send({ jsonrpc: "2.0", id: 1, method: "test" }),
      /401/
    );
  });

  it("should call onerror on invalid JSON in SSE message", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
        setTimeout(() => {
          res.write("data: {not valid json}\n\n");
        }, 50);
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    const errors: Error[] = [];
    transport.onerror = (err) => errors.push(err);

    await transport.start();
    await waitFor(() => errors.length > 0);

    assert.ok(errors.length > 0);
  });

  it("should call onclose when server closes SSE stream", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
        // Close the stream after a delay
        setTimeout(() => {
          res.end();
        }, 100);
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    let closeCalled = false;
    transport.onclose = () => {
      closeCalled = true;
    };

    await transport.start();
    await waitFor(() => closeCalled, 3000);

    assert.ok(closeCalled);
  });

  // ── Custom fetch ──

  it("should use custom fetch function", async () => {
    let fetchCallCount = 0;

    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      } else if (req.method === "POST") {
        res.writeHead(200);
        res.end();
      }
    });
    server = setup.server;

    const customFetch: typeof globalThis.fetch = async (input, init) => {
      fetchCallCount++;
      return globalThis.fetch(input, init);
    };

    transport = new SSETransport({ url: setup.url, fetch: customFetch });
    await transport.start();
    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });

    // Should have been called for GET (start) and POST (send)
    assert.equal(fetchCallCount, 2);
  });

  // ── Relative endpoint URL ──

  it("should resolve relative endpoint URL against connection URL", async () => {
    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        // Relative URL
        res.write("event: endpoint\ndata: /api/v1/mcp/post\n\n");
      } else if (req.method === "POST" && req.url === "/api/v1/mcp/post") {
        res.writeHead(200);
        res.end();
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url + "/sse" });
    await transport.start();

    assert.ok(transport.endpoint);
    assert.equal(transport.endpoint!.pathname, "/api/v1/mcp/post");

    // Should be able to POST to the resolved URL
    await transport.send({ jsonrpc: "2.0", id: 1, method: "ping" });
  });

  // ── Accept header ──

  it("should send Accept: text/event-stream on GET", async () => {
    let acceptHeader = "";

    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        acceptHeader = req.headers["accept"] ?? "";
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      }
    });
    server = setup.server;

    transport = new SSETransport({ url: setup.url });
    await transport.start();

    assert.equal(acceptHeader, "text/event-stream");
  });

  // ── Auth provider returning null ──

  it("should not include Authorization when auth provider returns null", async () => {
    let authHeader: string | undefined;

    const setup = await createSSEServer((req, res) => {
      if (req.method === "GET") {
        authHeader = req.headers["authorization"];
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        });
        res.write("event: endpoint\ndata: /mcp/post\n\n");
      }
    });
    server = setup.server;

    const authProvider = {
      tokens: async () => null,
    };

    transport = new SSETransport({ url: setup.url, authProvider });
    await transport.start();

    assert.equal(authHeader, undefined);
  });
});
