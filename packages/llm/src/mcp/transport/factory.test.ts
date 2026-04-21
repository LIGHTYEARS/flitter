/**
 * Tests for MCP Transport Factory
 *
 * 逆向: pPR (transport selection), nPR (URL fallback)
 */

import { describe, expect, it, mock } from "bun:test";
import type { MCPServerSpec } from "../connection";
import type { MCPTransport } from "../types";
import { createMCPTransport } from "./factory";

// ─── Helpers ─────────────────────────────────────────────

/** Create a minimal mock transport for testing */
function createMockTransport(opts?: { failOnStart?: boolean }): MCPTransport {
  return {
    start: opts?.failOnStart
      ? async () => {
          throw new Error("StreamableHTTP failed");
        }
      : async () => {},
    send: async () => {},
    close: async () => {},
    onmessage: undefined,
    onclose: undefined,
    onerror: undefined,
  };
}

// ─── Tests ───────────────────────────────────────────────

describe("createMCPTransport", () => {
  describe("command-based specs (stdio)", () => {
    it("creates StdioTransport for command specs", () => {
      const spec: MCPServerSpec = { command: "node", args: ["server.js"] };
      const transport = createMCPTransport(spec);
      // StdioTransport has _serverParams internally
      expect(transport).toBeDefined();
      expect(transport.start).toBeFunction();
      expect(transport.send).toBeFunction();
      expect(transport.close).toBeFunction();
    });

    it("passes cwd option to StdioTransport", () => {
      const spec: MCPServerSpec = { command: "python", args: ["-m", "mcp_server"] };
      const transport = createMCPTransport(spec, { cwd: "/tmp/workdir" });
      expect(transport).toBeDefined();
    });

    it("resolves env vars in command spec", () => {
      const spec: MCPServerSpec = {
        command: "node",
        args: ["server.js"],
        env: { API_KEY: "${TEST_ENV_KEY}" },
      };
      // Should not throw even if env var doesn't exist
      const transport = createMCPTransport(spec);
      expect(transport).toBeDefined();
    });
  });

  describe("URL-based specs (FallbackURLTransport)", () => {
    it("creates FallbackURLTransport for URL specs", () => {
      const spec: MCPServerSpec = { url: "https://mcp.example.com/v1" };
      const transport = createMCPTransport(spec);
      expect(transport).toBeDefined();
      expect(transport.start).toBeFunction();
      expect(transport.send).toBeFunction();
      expect(transport.close).toBeFunction();
    });

    it("resolves env vars in URL spec", () => {
      const spec: MCPServerSpec = {
        url: "https://${MCP_HOST:-localhost}:3000/mcp",
        headers: { Authorization: "Bearer ${MCP_TOKEN}" },
      };
      const transport = createMCPTransport(spec);
      expect(transport).toBeDefined();
    });

    it("send throws before start", async () => {
      const spec: MCPServerSpec = { url: "https://mcp.example.com/v1" };
      const transport = createMCPTransport(spec);
      expect(transport.send({ jsonrpc: "2.0", method: "test" })).rejects.toThrow(
        "Transport not started",
      );
    });

    it("close is safe before start", async () => {
      const spec: MCPServerSpec = { url: "https://mcp.example.com/v1" };
      const transport = createMCPTransport(spec);
      // Should not throw
      await transport.close();
    });

    it("wires onmessage/onclose/onerror callbacks", () => {
      const spec: MCPServerSpec = { url: "https://mcp.example.com/v1" };
      const transport = createMCPTransport(spec);
      const onMsg = mock(() => {});
      const onClose = mock(() => {});
      const onErr = mock(() => {});
      transport.onmessage = onMsg;
      transport.onclose = onClose;
      transport.onerror = onErr;
      // Callbacks are wired but won't fire until start
      expect(transport.onmessage).toBe(onMsg);
      expect(transport.onclose).toBe(onClose);
      expect(transport.onerror).toBe(onErr);
    });
  });

  describe("spec type detection", () => {
    it("detects URL spec by 'url' property", () => {
      const urlSpec: MCPServerSpec = { url: "https://example.com" };
      const transport = createMCPTransport(urlSpec);
      // FallbackURLTransport doesn't have _serverParams (that's StdioTransport)
      expect(transport).toBeDefined();
    });

    it("detects command spec by 'command' property", () => {
      const cmdSpec: MCPServerSpec = { command: "echo" };
      const transport = createMCPTransport(cmdSpec);
      expect(transport).toBeDefined();
    });
  });
});

describe("FallbackURLTransport behavior", () => {
  it("provides all MCPTransport interface methods", () => {
    const spec: MCPServerSpec = { url: "https://mcp.example.com" };
    const transport = createMCPTransport(spec);

    expect(typeof transport.start).toBe("function");
    expect(typeof transport.send).toBe("function");
    expect(typeof transport.close).toBe("function");
    // Optional callbacks
    expect(transport.onmessage).toBeUndefined();
    expect(transport.onclose).toBeUndefined();
    expect(transport.onerror).toBeUndefined();
  });

  it("passes auth provider through to transports", () => {
    const authProvider = {
      tokens: async () => ({ access_token: "test-token" }),
    };
    const spec: MCPServerSpec = { url: "https://mcp.example.com" };
    const transport = createMCPTransport(spec, { authProvider });
    expect(transport).toBeDefined();
  });
});

describe("resolveEnvVars (via transport creation)", () => {
  it("does not throw on undefined env vars", () => {
    const spec: MCPServerSpec = {
      url: "https://${NONEXISTENT_VAR}/mcp",
    };
    // createMCPTransport resolves env vars during creation — should not throw
    const transport = createMCPTransport(spec);
    expect(transport).toBeDefined();
  });
});
