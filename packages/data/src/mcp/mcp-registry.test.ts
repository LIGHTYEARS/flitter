/**
 * Tests for MCP Registry Client — fail-closed behavior and HTTP request handling
 *
 * Cross-references: amp-cli-reversed/modules/1805_unknown_fPR.js (fPR)
 *                   amp-cli-reversed/modules/1800_unknown_yPR.js (yPR)
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { McpServerSpec } from "./mcp-registry";
import { checkMcpRegistry, fetchRegistry } from "./mcp-registry";

/** Create a mock fetch function */
function mockFetch(response: {
  ok: boolean;
  status?: number;
  json?: unknown;
  throwError?: Error;
}): typeof fetch {
  return (async (_url: string | URL | Request, _init?: RequestInit) => {
    if (response.throwError) throw response.throwError;
    return {
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      json: async () => response.json,
    } as Response;
  }) as unknown as typeof fetch;
}

describe("fetchRegistry", () => {
  it("should parse servers from registry response", async () => {
    const fetch = mockFetch({
      ok: true,
      json: {
        servers: [
          { server: "npx @modelcontextprotocol/server-github" },
          { server: "npx @modelcontextprotocol/server-filesystem" },
        ],
      },
    });

    const result = await fetchRegistry("https://registry.example.com/api/mcp", fetch);
    assert.deepEqual(result, [
      "npx @modelcontextprotocol/server-github",
      "npx @modelcontextprotocol/server-filesystem",
    ]);
  });

  it("should throw on non-ok response", async () => {
    const fetch = mockFetch({ ok: false, status: 403 });

    await assert.rejects(
      () => fetchRegistry("https://registry.example.com/api/mcp", fetch),
      /MCP registry request failed with status 403/,
    );
  });

  it("should throw on network error", async () => {
    const fetch = mockFetch({ ok: false, throwError: new Error("network error") });

    await assert.rejects(
      () => fetchRegistry("https://registry.example.com/api/mcp", fetch),
      /network error/,
    );
  });

  it("should handle empty servers list", async () => {
    const fetch = mockFetch({
      ok: true,
      json: { servers: [] },
    });

    const result = await fetchRegistry("https://registry.example.com/api/mcp", fetch);
    assert.deepEqual(result, []);
  });
});

describe("checkMcpRegistry", () => {
  const servers: Record<string, McpServerSpec> = {
    github: { command: "npx @modelcontextprotocol/server-github" },
    filesystem: { command: "npx @modelcontextprotocol/server-filesystem" },
    custom: { url: "https://custom-mcp.example.com" },
  };

  describe("no registry URL", () => {
    it("should approve all servers when registryUrl is null", async () => {
      const result = await checkMcpRegistry(servers, null);
      assert.deepEqual(result.approved, servers);
      assert.deepEqual(result.blocked, {});
      assert.equal(result.error, undefined);
    });
  });

  describe("empty servers", () => {
    it("should return empty approved/blocked for empty servers", async () => {
      const fetch = mockFetch({ ok: true, json: { servers: [] } });
      const result = await checkMcpRegistry({}, "https://registry.example.com", fetch);
      assert.deepEqual(result.approved, {});
      assert.deepEqual(result.blocked, {});
    });
  });

  describe("fail-closed behavior", () => {
    it("should block ALL servers when registry is unreachable", async () => {
      const fetch = mockFetch({
        ok: false,
        throwError: new Error("ECONNREFUSED"),
      });

      const result = await checkMcpRegistry(servers, "https://registry.example.com", fetch);

      // Fail-closed: everything blocked
      assert.deepEqual(result.approved, {});
      assert.deepEqual(result.blocked, servers);
      assert.ok(result.error);
      assert.ok(result.error!.message.includes("ECONNREFUSED"));
    });

    it("should block ALL servers when registry returns non-ok status", async () => {
      const fetch = mockFetch({ ok: false, status: 500 });

      const result = await checkMcpRegistry(servers, "https://registry.example.com", fetch);

      assert.deepEqual(result.approved, {});
      assert.deepEqual(result.blocked, servers);
      assert.ok(result.error);
    });
  });

  describe("server filtering", () => {
    it("should approve servers that match the allowlist", async () => {
      const fetch = mockFetch({
        ok: true,
        json: {
          servers: [{ server: "npx @modelcontextprotocol/server-github" }],
        },
      });

      const result = await checkMcpRegistry(servers, "https://registry.example.com", fetch);

      // Only github should be approved
      assert.ok("github" in result.approved);
      assert.ok(!("filesystem" in result.approved));
      assert.ok(!("custom" in result.approved));

      // Others should be blocked
      assert.ok("filesystem" in result.blocked);
      assert.ok("custom" in result.blocked);
    });

    it("should approve servers with matching URL", async () => {
      const fetch = mockFetch({
        ok: true,
        json: {
          servers: [{ server: "https://custom-mcp.example.com" }],
        },
      });

      const result = await checkMcpRegistry(servers, "https://registry.example.com", fetch);

      assert.ok("custom" in result.approved);
      assert.ok("github" in result.blocked);
      assert.ok("filesystem" in result.blocked);
    });

    it("should approve all when all match", async () => {
      const fetch = mockFetch({
        ok: true,
        json: {
          servers: [
            { server: "npx @modelcontextprotocol/server-github" },
            { server: "npx @modelcontextprotocol/server-filesystem" },
            { server: "https://custom-mcp.example.com" },
          ],
        },
      });

      const result = await checkMcpRegistry(servers, "https://registry.example.com", fetch);

      assert.equal(Object.keys(result.approved).length, 3);
      assert.equal(Object.keys(result.blocked).length, 0);
    });

    it("should block all when none match", async () => {
      const fetch = mockFetch({
        ok: true,
        json: {
          servers: [{ server: "npx @some-other-server" }],
        },
      });

      const result = await checkMcpRegistry(servers, "https://registry.example.com", fetch);

      assert.equal(Object.keys(result.approved).length, 0);
      assert.equal(Object.keys(result.blocked).length, 3);
      assert.equal(result.error, undefined);
    });
  });
});
