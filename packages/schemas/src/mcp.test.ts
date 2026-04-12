import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import {
  JSONRPCRequestSchema,
  JSONRPCSuccessResponseSchema,
  JSONRPCErrorResponseSchema,
  JSONRPCNotificationSchema,
  JSONRPCResponseSchema,
  JSONRPCErrorCodeSchema,
  MCPConnectionErrorCodeSchema,
  MCPConnectionErrorSchema,
  MCPConnectingSchema,
  MCPAuthenticatingSchema,
  MCPReconnectingSchema,
  MCPConnectedSchema,
  MCPDeniedSchema,
  MCPAwaitingApprovalSchema,
  MCPFailedSchema,
  MCPBlockedByRegistrySchema,
  MCPConnectionStatusSchema,
  MCPCommandServerSpecSchema,
  MCPURLServerSpecSchema,
  MCPServerSpecSchema,
  MCPTransportTypeSchema,
  MCPToolSpecSchema,
  MCPToolTextContentSchema,
  MCPToolImageContentSchema,
  MCPToolContentSchema,
  GuidanceFileTypeSchema,
  GuidanceFileSchema,
  SkillFrontmatterSchema,
  SkillSchema,
} from "./mcp";

// ─── 1. JSON-RPC 2.0 Request ─────────────────────────────

describe("JSONRPCRequestSchema", () => {
  it("parses a valid request with string id", () => {
    const input = {
      jsonrpc: "2.0",
      id: "req-1",
      method: "tools/list",
      params: { cursor: "abc" },
    };
    const result = JSONRPCRequestSchema.parse(input);
    assert.equal(result.jsonrpc, "2.0");
    assert.equal(result.id, "req-1");
    assert.equal(result.method, "tools/list");
    assert.deepEqual(result.params, { cursor: "abc" });
  });

  it("parses a valid request with numeric id and no params", () => {
    const input = { jsonrpc: "2.0", id: 42, method: "ping" };
    const result = JSONRPCRequestSchema.parse(input);
    assert.equal(result.id, 42);
    assert.equal(result.method, "ping");
    assert.equal(result.params, undefined);
  });

  it("rejects request with wrong jsonrpc version", () => {
    const input = { jsonrpc: "1.0", id: 1, method: "foo" };
    assert.throws(() => JSONRPCRequestSchema.parse(input));
  });

  it("rejects request missing method", () => {
    const input = { jsonrpc: "2.0", id: 1 };
    assert.throws(() => JSONRPCRequestSchema.parse(input));
  });
});

// ─── 2. JSON-RPC 2.0 Success Response ────────────────────

describe("JSONRPCSuccessResponseSchema", () => {
  it("parses a valid success response", () => {
    const input = {
      jsonrpc: "2.0",
      id: "resp-1",
      result: { tools: [] },
    };
    const result = JSONRPCSuccessResponseSchema.parse(input);
    assert.equal(result.id, "resp-1");
    assert.deepEqual(result.result, { tools: [] });
  });

  it("accepts null as result", () => {
    const input = { jsonrpc: "2.0", id: 1, result: null };
    const result = JSONRPCSuccessResponseSchema.parse(input);
    assert.equal(result.result, null);
  });
});

// ─── 3. JSON-RPC 2.0 Error Response ──────────────────────

describe("JSONRPCErrorResponseSchema", () => {
  it("parses a valid error response", () => {
    const input = {
      jsonrpc: "2.0",
      id: "err-1",
      error: {
        code: -32600,
        message: "Invalid Request",
      },
    };
    const result = JSONRPCErrorResponseSchema.parse(input);
    assert.equal(result.error.code, -32600);
    assert.equal(result.error.message, "Invalid Request");
    assert.equal(result.error.data, undefined);
  });

  it("parses an error response with data", () => {
    const input = {
      jsonrpc: "2.0",
      id: 99,
      error: {
        code: -32603,
        message: "Internal error",
        data: { detail: "stack trace" },
      },
    };
    const result = JSONRPCErrorResponseSchema.parse(input);
    assert.deepEqual(result.error.data, { detail: "stack trace" });
  });
});

// ─── 4. JSON-RPC Notification ─────────────────────────────

describe("JSONRPCNotificationSchema", () => {
  it("parses a valid notification (no id)", () => {
    const input = {
      jsonrpc: "2.0",
      method: "notifications/tools/list_changed",
    };
    const result = JSONRPCNotificationSchema.parse(input);
    assert.equal(result.method, "notifications/tools/list_changed");
    assert.equal(result.params, undefined);
  });

  it("parses a notification with params", () => {
    const input = {
      jsonrpc: "2.0",
      method: "notifications/progress",
      params: { token: "abc", progress: 50 },
    };
    const result = JSONRPCNotificationSchema.parse(input);
    assert.deepEqual(result.params, { token: "abc", progress: 50 });
  });
});

// ─── 5. JSON-RPC Response union ───────────────────────────

describe("JSONRPCResponseSchema", () => {
  it("parses a success response through the union", () => {
    const input = { jsonrpc: "2.0", id: 1, result: "ok" };
    const result = JSONRPCResponseSchema.parse(input);
    assert.equal((result as any).result, "ok");
  });

  it("parses an error response through the error schema directly", () => {
    const input = {
      jsonrpc: "2.0",
      id: 2,
      error: { code: -32700, message: "Parse error" },
    };
    const result = JSONRPCErrorResponseSchema.parse(input);
    assert.equal(result.error.code, -32700);
  });
});

// ─── 6. JSONRPCErrorCode ──────────────────────────────────

describe("JSONRPCErrorCodeSchema", () => {
  const allCodes = [
    "RequestTimeout",
    "ConnectionClosed",
    "InvalidRequest",
    "InvalidParams",
    "ParseError",
    "MethodNotFound",
    "InternalError",
  ] as const;

  it("accepts all 7 error codes", () => {
    for (const code of allCodes) {
      const result = JSONRPCErrorCodeSchema.parse(code);
      assert.equal(result, code);
    }
  });

  it("rejects unknown error code", () => {
    assert.throws(() => JSONRPCErrorCodeSchema.parse("UnknownError"));
  });
});

// ─── 7. MCPConnectionError ────────────────────────────────

describe("MCPConnectionErrorSchema", () => {
  const allErrorCodes = [
    "timeout",
    "network",
    "server-error",
    "auth-failed",
    "spawn-failed",
    "permission-denied",
  ] as const;

  it("accepts all 6 error codes", () => {
    for (const code of allErrorCodes) {
      const result = MCPConnectionErrorCodeSchema.parse(code);
      assert.equal(result, code);
    }
  });

  it("parses a full connection error with stderr", () => {
    const input = {
      code: "spawn-failed",
      message: "Could not start server process",
      stderr: "ENOENT: no such file or directory",
    };
    const result = MCPConnectionErrorSchema.parse(input);
    assert.equal(result.code, "spawn-failed");
    assert.equal(result.stderr, "ENOENT: no such file or directory");
  });

  it("parses a connection error without optional stderr", () => {
    const input = { code: "timeout", message: "Connection timed out" };
    const result = MCPConnectionErrorSchema.parse(input);
    assert.equal(result.code, "timeout");
    assert.equal(result.stderr, undefined);
  });
});

// ─── 8. MCPConnectionStatus ──────────────────────────────

describe("MCPConnectionStatusSchema", () => {
  it("parses 'connecting' status", () => {
    const result = MCPConnectionStatusSchema.parse({ type: "connecting" });
    assert.equal(result.type, "connecting");
  });

  it("parses 'authenticating' status", () => {
    const result = MCPConnectionStatusSchema.parse({ type: "authenticating" });
    assert.equal(result.type, "authenticating");
  });

  it("parses 'reconnecting' status with required fields", () => {
    const input = { type: "reconnecting", attempt: 3, nextRetryMs: 5000 };
    const result = MCPConnectionStatusSchema.parse(input);
    assert.equal(result.type, "reconnecting");
    assert.equal((result as any).attempt, 3);
    assert.equal((result as any).nextRetryMs, 5000);
  });

  it("parses 'connected' status with capabilities and serverInfo", () => {
    const input = {
      type: "connected",
      capabilities: { tools: true },
      serverInfo: { name: "test-server", version: "1.0" },
    };
    const result = MCPConnectionStatusSchema.parse(input);
    assert.equal(result.type, "connected");
    assert.deepEqual((result as any).capabilities, { tools: true });
  });

  it("parses 'denied' status", () => {
    const result = MCPConnectionStatusSchema.parse({ type: "denied" });
    assert.equal(result.type, "denied");
  });

  it("parses 'awaiting-approval' status", () => {
    const result = MCPConnectionStatusSchema.parse({
      type: "awaiting-approval",
    });
    assert.equal(result.type, "awaiting-approval");
  });

  it("parses 'failed' status with nested error", () => {
    const input = {
      type: "failed",
      error: { code: "network", message: "Connection refused" },
    };
    const result = MCPConnectionStatusSchema.parse(input);
    assert.equal(result.type, "failed");
    assert.equal((result as any).error.code, "network");
  });

  it("parses 'blocked-by-registry' status with registryUrl", () => {
    const input = {
      type: "blocked-by-registry",
      registryUrl: "https://registry.example.com",
    };
    const result = MCPConnectionStatusSchema.parse(input);
    assert.equal(result.type, "blocked-by-registry");
    assert.equal((result as any).registryUrl, "https://registry.example.com");
  });

  it("rejects unknown connection status type", () => {
    assert.throws(() =>
      MCPConnectionStatusSchema.parse({ type: "disconnected" }),
    );
  });
});

// ─── 9. MCPCommandServerSpec ──────────────────────────────

describe("MCPCommandServerSpecSchema", () => {
  it("parses a minimal command server spec", () => {
    const input = { command: "npx" };
    const result = MCPCommandServerSpecSchema.parse(input);
    assert.equal(result.command, "npx");
    assert.equal(result.args, undefined);
    assert.equal(result.env, undefined);
  });

  it("parses a full command server spec", () => {
    const input = {
      command: "node",
      args: ["server.js", "--port", "3000"],
      env: { NODE_ENV: "production" },
      _target: "remote-host",
    };
    const result = MCPCommandServerSpecSchema.parse(input);
    assert.equal(result.command, "node");
    assert.deepEqual(result.args, ["server.js", "--port", "3000"]);
    assert.deepEqual(result.env, { NODE_ENV: "production" });
    assert.equal(result._target, "remote-host");
  });
});

// ─── 10. MCPURLServerSpec ─────────────────────────────────

describe("MCPURLServerSpecSchema", () => {
  it("parses a minimal URL server spec", () => {
    const input = { url: "https://mcp.example.com/sse" };
    const result = MCPURLServerSpecSchema.parse(input);
    assert.equal(result.url, "https://mcp.example.com/sse");
    assert.equal(result.headers, undefined);
    assert.equal(result.transport, undefined);
  });

  it("parses a full URL server spec", () => {
    const input = {
      url: "https://mcp.example.com/stream",
      headers: { Authorization: "Bearer token123" },
      transport: "sse",
      _target: "proxy",
    };
    const result = MCPURLServerSpecSchema.parse(input);
    assert.equal(result.url, "https://mcp.example.com/stream");
    assert.deepEqual(result.headers, { Authorization: "Bearer token123" });
    assert.equal(result.transport, "sse");
    assert.equal(result._target, "proxy");
  });
});

// ─── 11. MCPServerSpec union ──────────────────────────────

describe("MCPServerSpecSchema", () => {
  it("parses a command variant", () => {
    const input = { command: "python", args: ["-m", "server"] };
    const result = MCPServerSpecSchema.parse(input);
    assert.equal((result as any).command, "python");
  });

  it("parses a URL variant", () => {
    const input = { url: "http://localhost:8080" };
    const result = MCPServerSpecSchema.parse(input);
    assert.equal((result as any).url, "http://localhost:8080");
  });
});

// ─── 12. MCPTransportType ─────────────────────────────────

describe("MCPTransportTypeSchema", () => {
  const allTypes = [
    "StdioClientTransport",
    "SSEClientTransport",
    "StreamableHTTPClientTransport",
  ] as const;

  it("accepts all 3 transport types", () => {
    for (const t of allTypes) {
      const result = MCPTransportTypeSchema.parse(t);
      assert.equal(result, t);
    }
  });

  it("rejects unknown transport type", () => {
    assert.throws(() => MCPTransportTypeSchema.parse("WebSocketTransport"));
  });
});

// ─── 13. MCPToolSpec ──────────────────────────────────────

describe("MCPToolSpecSchema", () => {
  it("parses a full tool spec", () => {
    const input = {
      name: "read_file",
      description: "Read a file from disk",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      },
      source: {
        mcp: "filesystem",
        target: "local",
      },
      meta: { version: "1.0" },
    };
    const result = MCPToolSpecSchema.parse(input);
    assert.equal(result.name, "read_file");
    assert.equal(result.description, "Read a file from disk");
    assert.equal(result.source.mcp, "filesystem");
    assert.equal(result.source.target, "local");
    assert.deepEqual(result.meta, { version: "1.0" });
  });

  it("parses a minimal tool spec without optional fields", () => {
    const input = {
      name: "echo",
      description: "Echo input",
      inputSchema: { type: "object" },
      source: { mcp: "test-server" },
    };
    const result = MCPToolSpecSchema.parse(input);
    assert.equal(result.name, "echo");
    assert.equal(result.source.target, undefined);
    assert.equal(result.meta, undefined);
  });
});

// ─── 14. MCPToolContent ───────────────────────────────────

describe("MCPToolContentSchema", () => {
  it("parses text content", () => {
    const input = { type: "text", text: "Hello, world!" };
    const result = MCPToolContentSchema.parse(input);
    assert.equal(result.type, "text");
    assert.equal((result as any).text, "Hello, world!");
  });

  it("parses image content", () => {
    const input = {
      type: "image",
      data: "iVBORw0KGgo=",
      mimeType: "image/png",
    };
    const result = MCPToolContentSchema.parse(input);
    assert.equal(result.type, "image");
    assert.equal((result as any).data, "iVBORw0KGgo=");
    assert.equal((result as any).mimeType, "image/png");
  });

  it("rejects unknown content type", () => {
    assert.throws(() =>
      MCPToolContentSchema.parse({ type: "audio", data: "abc" }),
    );
  });
});

// ─── 15. GuidanceFile ─────────────────────────────────────

describe("GuidanceFileSchema", () => {
  const allTypes = [
    "project",
    "user",
    "parent",
    "subtree",
    "mentioned",
  ] as const;

  it("accepts all 5 guidance file types", () => {
    for (const t of allTypes) {
      const result = GuidanceFileTypeSchema.parse(t);
      assert.equal(result, t);
    }
  });

  it("parses a full guidance file with globs", () => {
    const input = {
      uri: "file:///project/CLAUDE.md",
      content: "# Project guidelines",
      type: "project",
      priority: 100,
      globs: ["src/**/*.ts", "tests/**/*.ts"],
    };
    const result = GuidanceFileSchema.parse(input);
    assert.equal(result.uri, "file:///project/CLAUDE.md");
    assert.equal(result.type, "project");
    assert.equal(result.priority, 100);
    assert.deepEqual(result.globs, ["src/**/*.ts", "tests/**/*.ts"]);
  });

  it("parses a guidance file without optional globs", () => {
    const input = {
      uri: "file:///home/user/.claude/settings.md",
      content: "User preferences",
      type: "user",
      priority: 50,
    };
    const result = GuidanceFileSchema.parse(input);
    assert.equal(result.type, "user");
    assert.equal(result.globs, undefined);
  });

  it("rejects unknown guidance file type", () => {
    const input = {
      uri: "file:///x",
      content: "",
      type: "global",
      priority: 0,
    };
    assert.throws(() => GuidanceFileSchema.parse(input));
  });
});

// ─── 16. SkillFrontmatter ─────────────────────────────────

describe("SkillFrontmatterSchema", () => {
  it("parses minimal frontmatter (only required fields)", () => {
    const input = {
      name: "pdf",
      description: "Generate PDFs",
    };
    const result = SkillFrontmatterSchema.parse(input);
    assert.equal(result.name, "pdf");
    assert.equal(result.description, "Generate PDFs");
    assert.equal(result.compatibility, undefined);
    assert.equal(result.isolatedContext, undefined);
    assert.equal(result["disable-model-invocation"], undefined);
    assert.equal(result["argument-hint"], undefined);
    assert.equal(result["builtin-tools"], undefined);
  });

  it("parses full frontmatter with all optional fields", () => {
    const input = {
      name: "web-search",
      description: "Search the web",
      compatibility: ">=1.0.0",
      isolatedContext: true,
      "disable-model-invocation": false,
      "argument-hint": "query string",
      "builtin-tools": ["Bash", "Read"],
    };
    const result = SkillFrontmatterSchema.parse(input);
    assert.equal(result.compatibility, ">=1.0.0");
    assert.equal(result.isolatedContext, true);
    assert.equal(result["disable-model-invocation"], false);
    assert.equal(result["argument-hint"], "query string");
    assert.deepEqual(result["builtin-tools"], ["Bash", "Read"]);
  });
});

// ─── 17. Skill ────────────────────────────────────────────

describe("SkillSchema", () => {
  it("parses a full skill definition", () => {
    const input = {
      name: "lark-skill",
      description: "Lark document integration",
      frontmatter: {
        name: "lark-skill",
        description: "Lark document integration",
      },
      content: "# Lark Skill\nThis skill provides...",
      baseDir: "/home/user/.claude/skills/lark-skill",
      mcpServers: {
        lark: { url: "https://lark-mcp.example.com" },
      },
      builtinTools: ["Bash", "Read", "Write"],
      files: ["scripts/main.py", "templates/doc.md"],
    };
    const result = SkillSchema.parse(input);
    assert.equal(result.name, "lark-skill");
    assert.equal(result.baseDir, "/home/user/.claude/skills/lark-skill");
    assert.deepEqual(result.builtinTools, ["Bash", "Read", "Write"]);
    assert.deepEqual(result.files, ["scripts/main.py", "templates/doc.md"]);
    assert.ok(result.mcpServers);
    assert.equal((result.mcpServers!.lark as any).url, "https://lark-mcp.example.com");
  });

  it("parses a minimal skill without optional fields", () => {
    const input = {
      name: "simple",
      description: "A simple skill",
      frontmatter: { name: "simple", description: "A simple skill" },
      content: "Do the thing.",
      baseDir: "/skills/simple",
    };
    const result = SkillSchema.parse(input);
    assert.equal(result.name, "simple");
    assert.equal(result.mcpServers, undefined);
    assert.equal(result.builtinTools, undefined);
    assert.equal(result.files, undefined);
  });

  it("supports command-based mcpServers in a skill", () => {
    const input = {
      name: "cmd-skill",
      description: "Uses command server",
      frontmatter: { name: "cmd-skill", description: "Uses command server" },
      content: "content",
      baseDir: "/skills/cmd-skill",
      mcpServers: {
        local: {
          command: "node",
          args: ["index.js"],
          env: { PORT: "9000" },
        },
      },
    };
    const result = SkillSchema.parse(input);
    const server = result.mcpServers!.local as any;
    assert.equal(server.command, "node");
    assert.deepEqual(server.args, ["index.js"]);
  });
});

// ─── 18. Reject invalid data ──────────────────────────────

describe("Reject invalid data", () => {
  it("rejects request with jsonrpc version 1.0", () => {
    assert.throws(() =>
      JSONRPCRequestSchema.parse({ jsonrpc: "1.0", id: 1, method: "x" }),
    );
  });

  it("rejects request missing method field", () => {
    assert.throws(() =>
      JSONRPCRequestSchema.parse({ jsonrpc: "2.0", id: 1 }),
    );
  });

  it("rejects MCPConnectionStatus with invalid type", () => {
    assert.throws(() =>
      MCPConnectionStatusSchema.parse({ type: "unknown-status" }),
    );
  });

  it("rejects MCPConnectionError with invalid code", () => {
    assert.throws(() =>
      MCPConnectionErrorSchema.parse({
        code: "invalid-code",
        message: "error",
      }),
    );
  });

  it("rejects MCPToolContent with missing required fields", () => {
    assert.throws(() => MCPToolContentSchema.parse({ type: "text" }));
  });

  it("rejects MCPToolSpec missing source", () => {
    assert.throws(() =>
      MCPToolSpecSchema.parse({
        name: "t",
        description: "d",
        inputSchema: {},
      }),
    );
  });
});

// ─── 19. JSON Schema conversion ───────────────────────────

describe("JSON Schema conversion", () => {
  it("converts JSONRPCRequestSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(JSONRPCRequestSchema);
    assert.equal(jsonSchema.type, "object");
    assert.ok(jsonSchema.properties);
    assert.ok((jsonSchema.properties as any).jsonrpc);
    assert.ok((jsonSchema.properties as any).method);
    assert.ok((jsonSchema.properties as any).id);
  });

  it("converts MCPToolSpecSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(MCPToolSpecSchema);
    assert.equal(jsonSchema.type, "object");
    assert.ok((jsonSchema.properties as any).name);
    assert.ok((jsonSchema.properties as any).description);
    assert.ok((jsonSchema.properties as any).inputSchema);
    assert.ok((jsonSchema.properties as any).source);
  });

  it("converts GuidanceFileSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(GuidanceFileSchema);
    assert.equal(jsonSchema.type, "object");
    assert.ok((jsonSchema.properties as any).uri);
    assert.ok((jsonSchema.properties as any).content);
    assert.ok((jsonSchema.properties as any).type);
    assert.ok((jsonSchema.properties as any).priority);
  });

  it("converts SkillFrontmatterSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(SkillFrontmatterSchema);
    assert.equal(jsonSchema.type, "object");
    assert.ok((jsonSchema.properties as any).name);
    assert.ok((jsonSchema.properties as any).description);
  });

  it("converts MCPConnectionErrorSchema to JSON Schema", () => {
    const jsonSchema = z.toJSONSchema(MCPConnectionErrorSchema);
    assert.equal(jsonSchema.type, "object");
    assert.ok((jsonSchema.properties as any).code);
    assert.ok((jsonSchema.properties as any).message);
  });
});
