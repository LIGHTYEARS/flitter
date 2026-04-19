/**
 * DTWClient test suite.
 *
 * 逆向: chunk-005.js:4470-4534 (DTW HTTP API)
 * Tests the DTW client transport with a mock HTTP server.
 */
import assert from "node:assert/strict";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { describe, it, beforeEach, afterEach } from "node:test";
import { DTWClient } from "./dtw-client";
import { isValidThreadId, isValidDurableObjectId, isValidUUID, DTW_ENDPOINTS } from "./dtw-protocol";

// ─── Protocol Tests ──────────────────────────────────────

describe("DTW Protocol", () => {
  describe("isValidThreadId", () => {
    it("accepts valid T-uuid format", () => {
      assert.ok(isValidThreadId("T-5928a90d-d53b-488f-a829-4e36442142ee"));
    });

    it("rejects missing T- prefix", () => {
      assert.ok(!isValidThreadId("5928a90d-d53b-488f-a829-4e36442142ee"));
    });

    it("rejects empty string", () => {
      assert.ok(!isValidThreadId(""));
    });

    it("rejects malformed uuid", () => {
      assert.ok(!isValidThreadId("T-not-a-uuid"));
    });
  });

  describe("isValidDurableObjectId", () => {
    it("accepts object with durableObjectId string", () => {
      assert.ok(isValidDurableObjectId({ durableObjectId: "abc123" }));
    });

    it("rejects null", () => {
      assert.ok(!isValidDurableObjectId(null));
    });

    it("rejects missing durableObjectId", () => {
      assert.ok(!isValidDurableObjectId({ other: "field" }));
    });

    it("rejects empty durableObjectId", () => {
      assert.ok(!isValidDurableObjectId({ durableObjectId: "" }));
    });

    it("rejects non-string durableObjectId", () => {
      assert.ok(!isValidDurableObjectId({ durableObjectId: 42 }));
    });
  });

  describe("isValidUUID", () => {
    it("accepts valid UUID v4", () => {
      assert.ok(isValidUUID("5928a90d-d53b-488f-a829-4e36442142ee"));
    });

    it("rejects invalid format", () => {
      assert.ok(!isValidUUID("not-a-uuid"));
    });
  });

  describe("DTW_ENDPOINTS", () => {
    it("has correct create endpoint", () => {
      assert.equal(DTW_ENDPOINTS.create, "/api/durable-thread-workers");
    });

    it("generates correct per-thread endpoints", () => {
      const tid = "T-abc123";
      assert.equal(DTW_ENDPOINTS.addMessage(tid), "/threads/T-abc123/messages");
      assert.equal(DTW_ENDPOINTS.getTranscript(tid), "/threads/T-abc123/transcript");
      assert.equal(DTW_ENDPOINTS.durableObjectId(tid), "/threads/T-abc123/durable-object-id");
      assert.equal(DTW_ENDPOINTS.spawn(tid), "/threads/T-abc123/spawn");
      assert.equal(DTW_ENDPOINTS.dump(tid), "/threads/T-abc123/dump");
    });
  });
});

// ─── DTWClient Tests with Mock Server ───────────────────

describe("DTWClient", () => {
  let server: Server;
  let serverUrl: string;
  let routes: Map<string, (req: IncomingMessage, res: ServerResponse) => void>;

  beforeEach(async () => {
    routes = new Map();
    server = createServer((req, res) => {
      const key = `${req.method} ${req.url}`;
      const handler = routes.get(key);
      if (handler) {
        handler(req, res);
      } else {
        // Default: 404
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const addr = server.address();
    if (typeof addr === "string" || !addr) throw new Error("Bad address");
    serverUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("starts in disconnected state", () => {
    const client = new DTWClient({ serviceUrl: serverUrl, apiKey: "test-key" });
    assert.equal(client.getState(), "disconnected");
    client.dispose();
  });

  it("createThread sends POST and returns threadId", async () => {
    const threadId = "T-5928a90d-d53b-488f-a829-4e36442142ee";
    let receivedAuth = "";
    let receivedBody = "";

    routes.set("POST /api/durable-thread-workers", (req, res) => {
      receivedAuth = req.headers.authorization ?? "";
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        receivedBody = body;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ threadId }));
      });
    });

    const client = new DTWClient({
      serviceUrl: serverUrl,
      apiKey: "test-key",
      agentMode: "smart",
    });

    const result = await client.createThread();
    assert.equal(result, threadId);
    assert.equal(receivedAuth, "Bearer test-key");
    assert.ok(receivedBody.includes('"agentMode":"smart"'));

    client.dispose();
  });

  it("createThread throws on invalid response", async () => {
    routes.set("POST /api/durable-thread-workers", (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ threadId: "bad-format" }));
    });

    const client = new DTWClient({ serviceUrl: serverUrl, apiKey: "test-key" });
    await assert.rejects(
      () => client.createThread(),
      /did not include a valid thread ID/,
    );
    client.dispose();
  });

  it("createThread throws on HTTP error", async () => {
    routes.set("POST /api/durable-thread-workers", (_req, res) => {
      res.writeHead(500);
      res.end("Internal Server Error");
    });

    const client = new DTWClient({ serviceUrl: serverUrl, apiKey: "test-key" });
    await assert.rejects(
      () => client.createThread(),
      /Create request failed \(500\)/,
    );
    client.dispose();
  });

  it("sendMessage posts to correct endpoint", async () => {
    const threadId = "T-5928a90d-d53b-488f-a829-4e36442142ee";
    let receivedUrl = "";

    routes.set(`POST /threads/${threadId}/messages`, (req, res) => {
      receivedUrl = req.url ?? "";
      res.writeHead(200);
      res.end("{}");
    });

    const client = new DTWClient({ serviceUrl: serverUrl, apiKey: "test-key" });
    await client.sendMessage(threadId, { type: "add-message", content: "hello" });
    assert.equal(receivedUrl, `/threads/${threadId}/messages`);
    client.dispose();
  });

  it("getTranscript returns thread sync data", async () => {
    const threadId = "T-5928a90d-d53b-488f-a829-4e36442142ee";
    const mockSync = {
      type: "thread-sync",
      threadId,
      messages: [],
      version: 1,
    };

    routes.set(`GET /threads/${threadId}/transcript`, (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(mockSync));
    });

    const client = new DTWClient({ serviceUrl: serverUrl, apiKey: "test-key" });
    const result = await client.getTranscript(threadId);
    assert.equal(result.threadId, threadId);
    assert.equal(result.version, 1);
    client.dispose();
  });

  it("getDurableObjectId returns ID", async () => {
    const threadId = "T-5928a90d-d53b-488f-a829-4e36442142ee";
    const doId = "abc-123-def";

    routes.set(`GET /threads/${threadId}/durable-object-id`, (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ durableObjectId: doId }));
    });

    const client = new DTWClient({ serviceUrl: serverUrl, apiKey: "test-key" });
    const result = await client.getDurableObjectId(threadId);
    assert.equal(result, doId);
    client.dispose();
  });

  it("getDurableObjectId throws on invalid response", async () => {
    const threadId = "T-5928a90d-d53b-488f-a829-4e36442142ee";

    routes.set(`GET /threads/${threadId}/durable-object-id`, (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ noId: true }));
    });

    const client = new DTWClient({ serviceUrl: serverUrl, apiKey: "test-key" });
    await assert.rejects(
      () => client.getDurableObjectId(threadId),
      /did not include a durableObjectId/,
    );
    client.dispose();
  });

  it("dispose prevents further operations", async () => {
    const client = new DTWClient({ serviceUrl: serverUrl, apiKey: "test-key" });
    client.dispose();
    await assert.rejects(
      () => client.createThread(),
      /disposed/,
    );
  });

  it("emits stateChange events on connect attempt", async () => {
    // Set up a route that responds to OPTIONS (connect probe)
    routes.set("OPTIONS /api/durable-thread-workers", (_req, res) => {
      res.writeHead(200);
      res.end();
    });

    const client = new DTWClient({ serviceUrl: serverUrl, apiKey: "test-key" });
    const states: string[] = [];
    client.on("stateChange", (s) => states.push(s));

    await client.connect();
    assert.ok(states.includes("connecting"), "Should emit 'connecting'");
    assert.ok(states.includes("connected"), "Should emit 'connected'");

    await client.disconnect();
    assert.ok(states.includes("disconnected"), "Should emit 'disconnected'");
    client.dispose();
  });

  it("reconnect delay uses exponential backoff", () => {
    const client = new DTWClient({ serviceUrl: serverUrl, apiKey: "test-key" });

    // Access private method via prototype for testing
    const delay0 = client.getReconnectDelay();
    assert.ok(delay0 >= DTWClient.BASE_RECONNECT_DELAY_MS, "First delay should be >= base");
    assert.ok(delay0 <= DTWClient.BASE_RECONNECT_DELAY_MS * 1.25, "First delay should be <= base * 1.25");

    client.dispose();
  });
});
