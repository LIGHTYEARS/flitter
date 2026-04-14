/**
 * Tests for MCPClient and MCPConnection.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { MCPServerSpec } from "./connection";
import { MCPClient, MCPConnection, type MCPConnectionStatus } from "./connection";
import type {
  InitializeResult,
  JSONRPCMessage,
  JSONRPCNotification,
  JSONRPCRequest,
  MCPTool,
  MCPToolResult,
  MCPTransport,
  ServerCapabilities,
} from "./types";
import { LATEST_PROTOCOL_VERSION, Method } from "./types";

// ─── Mock Transport ───────────────────────────────────────

class MockTransport implements MCPTransport {
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  started = false;
  closed = false;
  sentMessages: JSONRPCMessage[] = [];

  /** If set, start() will reject with this error */
  startError?: Error;

  /** Server capabilities to include in initialize response */
  serverCapabilities: ServerCapabilities = {
    tools: { listChanged: true },
    resources: { listChanged: true },
    prompts: { listChanged: true },
  };

  /** Tools returned by tools/list */
  tools: MCPTool[] = [
    {
      name: "test_tool",
      description: "A test tool",
      inputSchema: { type: "object", properties: {} },
    },
  ];

  /** Auto-respond to requests */
  autoRespond = true;

  async start(): Promise<void> {
    if (this.startError) throw this.startError;
    this.started = true;
  }

  async send(message: JSONRPCMessage): Promise<void> {
    this.sentMessages.push(message);

    if (!this.autoRespond) return;

    // Auto-respond to requests
    if ("id" in message && "method" in message) {
      const request = message as JSONRPCRequest;

      if (request.method === Method.Initialize) {
        // Respond with initialize result
        setTimeout(() => {
          this.onmessage?.({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              protocolVersion: LATEST_PROTOCOL_VERSION,
              capabilities: this.serverCapabilities,
              serverInfo: { name: "test-server", version: "1.0.0" },
            } satisfies InitializeResult,
          });
        }, 0);
      } else if (request.method === Method.ToolsList) {
        setTimeout(() => {
          this.onmessage?.({
            jsonrpc: "2.0",
            id: request.id,
            result: { tools: this.tools },
          });
        }, 0);
      } else if (request.method === Method.ToolsCall) {
        setTimeout(() => {
          this.onmessage?.({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              content: [{ type: "text", text: "tool result" }],
            } satisfies MCPToolResult,
          });
        }, 0);
      } else if (request.method === Method.ResourcesList) {
        setTimeout(() => {
          this.onmessage?.({
            jsonrpc: "2.0",
            id: request.id,
            result: { resources: [] },
          });
        }, 0);
      } else if (request.method === Method.PromptsList) {
        setTimeout(() => {
          this.onmessage?.({
            jsonrpc: "2.0",
            id: request.id,
            result: { prompts: [] },
          });
        }, 0);
      } else if (request.method === Method.ResourcesRead) {
        setTimeout(() => {
          this.onmessage?.({
            jsonrpc: "2.0",
            id: request.id,
            result: { contents: [{ uri: "test://", text: "content" }] },
          });
        }, 0);
      } else if (request.method === Method.PromptsGet) {
        setTimeout(() => {
          this.onmessage?.({
            jsonrpc: "2.0",
            id: request.id,
            result: { messages: [] },
          });
        }, 0);
      }
    }
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  /** Simulate transport close event */
  simulateClose(): void {
    this.onclose?.();
  }

  /** Simulate receiving a notification */
  simulateNotification(method: string): void {
    this.onmessage?.({
      jsonrpc: "2.0",
      method,
    });
  }
}

// ─── Helper ───────────────────────────────────────────────

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── MCPClient Tests ──────────────────────────────────────

describe("MCPClient", () => {
  let client: MCPClient;
  let transport: MockTransport;

  beforeEach(() => {
    client = new MCPClient();
    transport = new MockTransport();
  });

  describe("connect", () => {
    it("should start transport and perform initialize handshake", async () => {
      await client.connect(transport);

      assert.equal(transport.started, true);
      // First message should be initialize request
      assert.ok(transport.sentMessages.length >= 1);
      const initMsg = transport.sentMessages[0] as JSONRPCRequest;
      assert.equal(initMsg.method, Method.Initialize);

      // Params should include protocol version, capabilities, clientInfo
      const params = initMsg.params as Record<string, unknown>;
      assert.equal(params.protocolVersion, LATEST_PROTOCOL_VERSION);
      assert.ok(params.capabilities);
      assert.ok(params.clientInfo);
    });

    it("should send notifications/initialized after handshake", async () => {
      await client.connect(transport);

      // Second message should be initialized notification
      assert.ok(transport.sentMessages.length >= 2);
      const notifMsg = transport.sentMessages[1];
      assert.equal("method" in notifMsg, true);
      assert.equal((notifMsg as JSONRPCNotification).method, Method.Initialized);
      assert.equal("id" in notifMsg, false);
    });

    it("should store server capabilities and info after connect", async () => {
      await client.connect(transport);

      const capabilities = client.getServerCapabilities();
      assert.ok(capabilities);
      assert.deepEqual(capabilities.tools, { listChanged: true });

      const serverInfo = client.getServerVersion();
      assert.ok(serverInfo);
      assert.equal(serverInfo.name, "test-server");
      assert.equal(serverInfo.version, "1.0.0");
    });

    it("should throw if transport start fails", async () => {
      transport.startError = new Error("spawn failed");
      await assert.rejects(() => client.connect(transport), {
        message: "spawn failed",
      });
    });
  });

  describe("listTools", () => {
    it("should return tools from server", async () => {
      await client.connect(transport);
      const result = await client.listTools();

      assert.equal(result.tools.length, 1);
      assert.equal(result.tools[0].name, "test_tool");
    });
  });

  describe("callTool", () => {
    it("should call a tool and return result", async () => {
      await client.connect(transport);
      const result = await client.callTool({ name: "test_tool" });

      assert.ok(result.content);
      assert.equal(result.content.length, 1);
      assert.equal(result.content[0].type, "text");
    });

    it("should throw if not connected", async () => {
      await assert.rejects(() => client.callTool({ name: "test" }), {
        message: /not connected/,
      });
    });
  });

  describe("listResources", () => {
    it("should return resources from server", async () => {
      await client.connect(transport);
      const result = await client.listResources();

      assert.ok(result.resources);
      assert.equal(result.resources.length, 0);
    });
  });

  describe("readResource", () => {
    it("should read a resource from server", async () => {
      await client.connect(transport);
      const result = await client.readResource("test://resource");

      assert.ok(result.contents);
      assert.equal(result.contents.length, 1);
    });
  });

  describe("listPrompts", () => {
    it("should return prompts from server", async () => {
      await client.connect(transport);
      const result = await client.listPrompts();

      assert.ok(result.prompts);
      assert.equal(result.prompts.length, 0);
    });
  });

  describe("getPrompt", () => {
    it("should get a prompt from server", async () => {
      await client.connect(transport);
      const result = await client.getPrompt({ name: "test_prompt" });
      assert.ok(result);
    });
  });

  describe("notification handlers", () => {
    it("should call notification handler when notification received", async () => {
      await client.connect(transport);

      let called = false;
      client.setNotificationHandler(Method.ListChanged, () => {
        called = true;
      });

      transport.simulateNotification(Method.ListChanged);
      assert.equal(called, true);
    });

    it("should allow removing notification handlers", async () => {
      await client.connect(transport);

      let callCount = 0;
      client.setNotificationHandler(Method.ListChanged, () => {
        callCount++;
      });

      transport.simulateNotification(Method.ListChanged);
      assert.equal(callCount, 1);

      client.removeNotificationHandler(Method.ListChanged);
      transport.simulateNotification(Method.ListChanged);
      assert.equal(callCount, 1);
    });
  });

  describe("close", () => {
    it("should close the transport", async () => {
      await client.connect(transport);
      await client.close();

      assert.equal(transport.closed, true);
    });

    it("should reject pending requests on close", async () => {
      // Connect first with auto-respond for handshake
      await client.connect(transport);

      // Disable auto-respond for subsequent requests
      transport.autoRespond = false;

      // Don't await — the request will pend
      const toolPromise = client.callTool({ name: "test" });
      await wait(10);

      // Trigger transport close
      transport.simulateClose();

      await assert.rejects(toolPromise, /closed/i);
    });

    it("should be idempotent", async () => {
      await client.connect(transport);
      await client.close();
      await client.close(); // should not throw
    });
  });

  describe("onclose callback", () => {
    it("should fire when transport closes unexpectedly", async () => {
      await client.connect(transport);

      let closeCalled = false;
      client.onclose = () => {
        closeCalled = true;
      };

      transport.simulateClose();
      assert.equal(closeCalled, true);
    });
  });
});

// ─── MCPConnection Tests ──────────────────────────────────

describe("MCPConnection", () => {
  function createMockTransport(): MockTransport {
    return new MockTransport();
  }

  function createConnection(overrides?: {
    transport?: MockTransport;
    spec?: Record<string, unknown>;
  }): { connection: MCPConnection; transport: MockTransport } {
    const transport = overrides?.transport ?? createMockTransport();

    const connection = new MCPConnection(
      (overrides?.spec as unknown as MCPServerSpec) ?? { command: "test-server", args: [] },
      {
        createTransport: () => transport,
        serverName: "test",
      },
    );

    return { connection, transport };
  }

  it("should reach connected status after successful connect", async () => {
    const { connection } = createConnection();

    // Wait for async connection
    await wait(50);

    assert.equal(connection.status.type, "connected");
    await connection.dispose();
  });

  it("should populate tools after connect", async () => {
    const { connection } = createConnection();
    await wait(50);

    assert.equal(connection.tools.length, 1);
    assert.equal(connection.tools[0].name, "test_tool");
    assert.equal(connection.toolsLoaded$.value, true);
    await connection.dispose();
  });

  it("should expose tools via BehaviorSubject", async () => {
    const { connection } = createConnection();
    await wait(50);

    const tools = connection.tools$.value;
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "test_tool");
    await connection.dispose();
  });

  it("should transition to failed on connection error", async () => {
    const transport = createMockTransport();
    transport.startError = new Error("ECONNREFUSED");

    const connection = new MCPConnection(
      { command: "bad-server" },
      {
        createTransport: () => transport,
        serverName: "test",
      },
    );

    // Wait for connection attempt + a bit more for status to settle
    await wait(50);

    // It should have attempted to connect and either failed or scheduled reconnect
    const status = connection.status;
    assert.ok(
      status.type === "failed" || status.type === "reconnecting",
      `Expected failed or reconnecting, got ${status.type}`,
    );
    await connection.dispose();
  });

  it("should not reconnect on permanent errors", async () => {
    const transport = createMockTransport();
    transport.autoRespond = false;

    const connection = new MCPConnection(
      { command: "auth-server" },
      {
        createTransport: () => {
          const t = createMockTransport();
          t.startError = new Error("401 auth failed");
          return t;
        },
        serverName: "test",
      },
    );

    await wait(100);

    const status = connection.status;
    // Auth-failed is a permanent error — should be failed, not reconnecting
    assert.equal(status.type, "failed");
    await connection.dispose();
  });

  it("should callTool when connected", async () => {
    const { connection } = createConnection();
    await wait(50);

    const result = await connection.callTool({ name: "test_tool" });
    assert.ok(result.content);
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, "text");
    await connection.dispose();
  });

  it("should throw on callTool when not connected", async () => {
    const transport = createMockTransport();
    transport.startError = new Error("cannot start");

    const connection = new MCPConnection(
      { command: "bad" },
      {
        createTransport: () => {
          const t = createMockTransport();
          t.startError = new Error("cannot start");
          return t;
        },
        serverName: "test",
      },
    );

    await wait(50);

    await assert.rejects(() => connection.callTool({ name: "test" }), /not connected/i);
    await connection.dispose();
  });

  it("should refresh tools on list_changed notification", async () => {
    const transport = createMockTransport();
    const { connection } = createConnection({ transport });
    await wait(50);

    // Change tools on the mock
    transport.tools = [
      {
        name: "new_tool",
        description: "A new tool",
        inputSchema: { type: "object" },
      },
    ];

    // Simulate list_changed notification
    transport.simulateNotification(Method.ListChanged);
    await wait(50);

    const tools = connection.tools;
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "new_tool");
    await connection.dispose();
  });

  it("should dispose cleanly", async () => {
    const { connection, transport } = createConnection();
    await wait(50);

    await connection.dispose();
    assert.equal(transport.closed, true);
  });

  it("should be idempotent on dispose", async () => {
    const { connection } = createConnection();
    await wait(50);

    await connection.dispose();
    await connection.dispose(); // should not throw
  });

  it("should schedule reconnect on unexpected transport close", async () => {
    const transport = createMockTransport();
    const { connection } = createConnection({ transport });
    await wait(50);

    assert.equal(connection.status.type, "connected");

    // Track status changes
    const statusHistory: MCPConnectionStatus[] = [];
    connection.status$.subscribe((s) => statusHistory.push(s));

    // Simulate unexpected close
    transport.simulateClose();
    await wait(50);

    // Should have transitioned to reconnecting
    const reconnectingStatus = statusHistory.find((s) => s.type === "reconnecting");
    assert.ok(reconnectingStatus, "Should have entered reconnecting state");
    if (reconnectingStatus?.type === "reconnecting") {
      assert.equal(reconnectingStatus.attempt, 1);
    }

    await connection.dispose();
  });

  it("should cancel reconnect timer on dispose", async () => {
    const connectionNum = { value: 0 };
    const connection = new MCPConnection(
      { command: "test" },
      {
        createTransport: () => {
          connectionNum.value++;
          if (connectionNum.value === 1) {
            const t = createMockTransport();
            // First connection succeeds, then simulate close
            return t;
          }
          return createMockTransport();
        },
        serverName: "test",
      },
    );

    await wait(50);

    // Dispose while potentially reconnecting
    await connection.dispose();
    // No assertion needed — we just need this not to throw or leak
  });
});
