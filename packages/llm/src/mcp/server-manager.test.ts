/**
 * Tests for MCPServerManager.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BehaviorSubject } from "@flitter/util";
import { MCPServerManager, type NamespacedMCPTool } from "./server-manager";
import {
  MCPConnection,
  type MCPConnectionStatus,
  type MCPServerSpec,
} from "./connection";
import type { MCPTool, MCPToolResult, MCPResource, MCPPrompt } from "./types";

// ─── Mock MCPConnection ───────────────────────────────────

/**
 * A minimal mock MCPConnection for testing MCPServerManager.
 * It exposes BehaviorSubjects and a callTool that returns a fixed result.
 */
class MockMCPConnection {
  readonly status$: BehaviorSubject<MCPConnectionStatus>;
  readonly tools$: BehaviorSubject<MCPTool[]>;
  readonly resources$: BehaviorSubject<MCPResource[]>;
  readonly prompts$: BehaviorSubject<MCPPrompt[]>;
  readonly toolsLoaded$: BehaviorSubject<boolean>;

  disposed = false;
  callToolResult: MCPToolResult = {
    content: [{ type: "text", text: "mock result" }],
  };
  lastCallToolParams: { name: string; arguments?: Record<string, unknown> } | null = null;

  constructor(tools: MCPTool[] = []) {
    this.status$ = new BehaviorSubject<MCPConnectionStatus>({
      type: "connected",
      capabilities: { tools: { listChanged: true } },
      serverInfo: { name: "mock-server", version: "1.0.0" },
    });
    this.tools$ = new BehaviorSubject<MCPTool[]>(tools);
    this.resources$ = new BehaviorSubject<MCPResource[]>([]);
    this.prompts$ = new BehaviorSubject<MCPPrompt[]>([]);
    this.toolsLoaded$ = new BehaviorSubject<boolean>(true);
  }

  async callTool(
    params: { name: string; arguments?: Record<string, unknown> },
    _signal?: AbortSignal,
  ): Promise<MCPToolResult> {
    this.lastCallToolParams = params;
    return this.callToolResult;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
  }
}

// ─── Helper ───────────────────────────────────────────────

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── MCPServerManager Tests ───────────────────────────────

describe("MCPServerManager", () => {
  function createManager(
    config: Record<string, MCPServerSpec>,
    connections?: Map<string, MockMCPConnection>,
  ) {
    const connMap = connections ?? new Map<string, MockMCPConnection>();

    const manager = new MCPServerManager({
      getConfig: () => config,
      createConnection: (name, spec) => {
        let conn = connMap.get(name);
        if (!conn) {
          conn = new MockMCPConnection();
          connMap.set(name, conn);
        }
        return conn as unknown as MCPConnection;
      },
    });

    return { manager, connections: connMap };
  }

  it("should create connections for all servers in config", () => {
    const { manager, connections } = createManager({
      server1: { command: "cmd1" },
      server2: { command: "cmd2" },
    });

    assert.equal(connections.size, 2);
    assert.ok(connections.has("server1"));
    assert.ok(connections.has("server2"));

    manager.dispose();
  });

  it("should expose servers via BehaviorSubject", () => {
    const { manager } = createManager({
      server1: { command: "cmd1" },
    });

    const servers = manager.servers$.value;
    assert.equal(servers.size, 1);
    assert.ok(servers.has("server1"));

    const info = servers.get("server1")!;
    assert.equal(info.name, "server1");
    assert.equal(info.status.type, "connected");

    manager.dispose();
  });

  it("should aggregate tools with namespace prefix", () => {
    const conn = new MockMCPConnection([
      {
        name: "my_tool",
        description: "A tool",
        inputSchema: { type: "object" },
      },
    ]);

    const { manager } = createManager(
      { myServer: { command: "cmd" } },
      new Map([["myServer", conn]]),
    );

    const tools = manager.allTools$.value;
    assert.equal(tools.length, 1);
    assert.equal(tools[0].name, "mcp__myServer__my_tool");
    assert.equal(tools[0].originalName, "my_tool");
    assert.equal(tools[0].serverName, "myServer");

    manager.dispose();
  });

  it("should aggregate tools from multiple servers", () => {
    const conn1 = new MockMCPConnection([
      {
        name: "tool_a",
        description: "Tool A",
        inputSchema: { type: "object" },
      },
    ]);
    const conn2 = new MockMCPConnection([
      {
        name: "tool_b",
        description: "Tool B",
        inputSchema: { type: "object" },
      },
    ]);

    const { manager } = createManager(
      {
        server1: { command: "cmd1" },
        server2: { command: "cmd2" },
      },
      new Map([
        ["server1", conn1],
        ["server2", conn2],
      ]),
    );

    const tools = manager.allTools$.value;
    assert.equal(tools.length, 2);
    assert.ok(tools.some((t) => t.name === "mcp__server1__tool_a"));
    assert.ok(tools.some((t) => t.name === "mcp__server2__tool_b"));

    manager.dispose();
  });

  it("should route callTool to correct server", async () => {
    const conn1 = new MockMCPConnection([
      { name: "tool_a", inputSchema: { type: "object" } },
    ]);
    const conn2 = new MockMCPConnection([
      { name: "tool_b", inputSchema: { type: "object" } },
    ]);
    conn2.callToolResult = {
      content: [{ type: "text", text: "from server2" }],
    };

    const { manager } = createManager(
      {
        server1: { command: "cmd1" },
        server2: { command: "cmd2" },
      },
      new Map([
        ["server1", conn1],
        ["server2", conn2],
      ]),
    );

    const result = await manager.callTool(
      "mcp__server2__tool_b",
      { arg1: "value" },
    );

    assert.ok(conn2.lastCallToolParams);
    assert.equal(conn2.lastCallToolParams.name, "tool_b");
    assert.deepEqual(conn2.lastCallToolParams.arguments, { arg1: "value" });
    assert.equal(result.content[0].type, "text");
    assert.equal((result.content[0] as any).text, "from server2");

    manager.dispose();
  });

  it("should throw on callTool with invalid namespaced name", async () => {
    const { manager } = createManager({
      server1: { command: "cmd1" },
    });

    await assert.rejects(
      () => manager.callTool("invalid_name", {}),
      /Invalid namespaced tool name/,
    );

    manager.dispose();
  });

  it("should throw on callTool with unknown server", async () => {
    const { manager } = createManager({
      server1: { command: "cmd1" },
    });

    await assert.rejects(
      () => manager.callTool("mcp__unknown_server__tool", {}),
      /not found/,
    );

    manager.dispose();
  });

  it("should update allTools when connection tools change", async () => {
    const conn = new MockMCPConnection([
      { name: "old_tool", inputSchema: { type: "object" } },
    ]);

    const { manager } = createManager(
      { server1: { command: "cmd" } },
      new Map([["server1", conn]]),
    );

    assert.equal(manager.allTools$.value.length, 1);
    assert.equal(manager.allTools$.value[0].originalName, "old_tool");

    // Simulate tools change
    conn.tools$.next([
      { name: "new_tool", inputSchema: { type: "object" } },
    ]);

    await wait(10);

    assert.equal(manager.allTools$.value.length, 1);
    assert.equal(manager.allTools$.value[0].originalName, "new_tool");
    assert.equal(manager.allTools$.value[0].name, "mcp__server1__new_tool");

    manager.dispose();
  });

  it("should handle refresh with new servers", () => {
    const config: Record<string, MCPServerSpec> = {
      server1: { command: "cmd1" },
    };
    const connMap = new Map<string, MockMCPConnection>();

    const manager = new MCPServerManager({
      getConfig: () => config,
      createConnection: (name) => {
        const conn = new MockMCPConnection();
        connMap.set(name, conn);
        return conn as unknown as MCPConnection;
      },
    });

    assert.equal(connMap.size, 1);

    // Add a new server
    config.server2 = { command: "cmd2" };
    manager.refresh();

    assert.equal(connMap.size, 2);
    assert.ok(connMap.has("server2"));

    manager.dispose();
  });

  it("should handle refresh with removed servers", async () => {
    const config: Record<string, MCPServerSpec> = {
      server1: { command: "cmd1" },
      server2: { command: "cmd2" },
    };
    const connMap = new Map<string, MockMCPConnection>();

    const manager = new MCPServerManager({
      getConfig: () => config,
      createConnection: (name) => {
        const conn = new MockMCPConnection();
        connMap.set(name, conn);
        return conn as unknown as MCPConnection;
      },
    });

    const server2Conn = connMap.get("server2")!;

    // Remove server2
    delete config.server2;
    manager.refresh();

    await wait(10);

    assert.equal(server2Conn.disposed, true);
    assert.equal(manager.getServerNames().length, 1);
    assert.ok(!manager.getServerNames().includes("server2"));

    manager.dispose();
  });

  it("should not recreate connections when spec is unchanged", () => {
    let createCount = 0;
    const config: Record<string, MCPServerSpec> = {
      server1: { command: "cmd1" },
    };

    const manager = new MCPServerManager({
      getConfig: () => config,
      createConnection: () => {
        createCount++;
        return new MockMCPConnection() as unknown as MCPConnection;
      },
    });

    assert.equal(createCount, 1);

    // Refresh with same config
    manager.refresh();
    assert.equal(createCount, 1); // should not create again

    manager.dispose();
  });

  it("should recreate connection when spec changes", async () => {
    let createCount = 0;
    const config: Record<string, MCPServerSpec> = {
      server1: { command: "cmd1" },
    };
    const connMap = new Map<string, MockMCPConnection>();

    const manager = new MCPServerManager({
      getConfig: () => config,
      createConnection: (name) => {
        createCount++;
        const conn = new MockMCPConnection();
        connMap.set(name, conn);
        return conn as unknown as MCPConnection;
      },
    });

    const oldConn = connMap.get("server1")!;
    assert.equal(createCount, 1);

    // Change spec
    config.server1 = { command: "cmd1-updated" };
    manager.refresh();

    await wait(10);

    assert.equal(createCount, 2);
    assert.equal(oldConn.disposed, true);

    manager.dispose();
  });

  it("should getConnection by name", () => {
    const conn = new MockMCPConnection();
    const { manager } = createManager(
      { server1: { command: "cmd" } },
      new Map([["server1", conn]]),
    );

    const result = manager.getConnection("server1");
    assert.ok(result);

    const missing = manager.getConnection("nonexistent");
    assert.equal(missing, undefined);

    manager.dispose();
  });

  it("should getServerNames", () => {
    const { manager } = createManager({
      alpha: { command: "a" },
      beta: { command: "b" },
    });

    const names = manager.getServerNames();
    assert.equal(names.length, 2);
    assert.ok(names.includes("alpha"));
    assert.ok(names.includes("beta"));

    manager.dispose();
  });

  it("should dispose all connections", async () => {
    const conn1 = new MockMCPConnection();
    const conn2 = new MockMCPConnection();

    const { manager } = createManager(
      {
        server1: { command: "cmd1" },
        server2: { command: "cmd2" },
      },
      new Map([
        ["server1", conn1],
        ["server2", conn2],
      ]),
    );

    await manager.dispose();

    assert.equal(conn1.disposed, true);
    assert.equal(conn2.disposed, true);
  });

  it("should be idempotent on dispose", async () => {
    const { manager } = createManager({
      server1: { command: "cmd" },
    });

    await manager.dispose();
    await manager.dispose(); // should not throw
  });
});
