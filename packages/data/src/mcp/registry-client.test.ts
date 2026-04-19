/**
 * Tests for McpRegistryClient.
 * 逆向: amp-cli-reversed/modules/1809_MCP_jPR.js — fPR function
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { McpRegistryClient } from "./registry-client";

describe("McpRegistryClient", () => {
  describe("validateServer with no registry URL", () => {
    it("should approve all servers when no registry URL", async () => {
      const client = new McpRegistryClient({ registryUrl: null });
      const result = await client.validateServer("any-server");
      assert.equal(result.approved, true);
      assert.equal(result.error, undefined);
    });
  });

  describe("validateServer with unreachable registry (fail-closed)", () => {
    it("should deny when registry is unreachable", async () => {
      const client = new McpRegistryClient({
        registryUrl: "http://127.0.0.1:19999/nonexistent-registry",
        timeoutMs: 500,
      });
      const result = await client.validateServer("test-server");
      assert.equal(result.approved, false);
      assert.ok(result.error);
    });
  });

  describe("validateServers with no registry URL", () => {
    it("should approve all servers", async () => {
      const client = new McpRegistryClient({ registryUrl: null });
      const result = await client.validateServers(["a", "b", "c"]);
      assert.deepEqual(result.approved, ["a", "b", "c"]);
      assert.deepEqual(result.blocked, []);
    });
  });

  describe("validateServers with unreachable registry", () => {
    it("should block all servers (fail-closed)", async () => {
      const client = new McpRegistryClient({
        registryUrl: "http://127.0.0.1:19999/nonexistent",
        timeoutMs: 500,
      });
      const result = await client.validateServers(["a", "b"]);
      assert.deepEqual(result.approved, []);
      assert.deepEqual(result.blocked, ["a", "b"]);
      assert.ok(result.error);
    });
  });
});
