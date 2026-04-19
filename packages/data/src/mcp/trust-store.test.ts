/**
 * Tests for MCP TrustStore.
 * 逆向: amp-cli-reversed/modules/1809_MCP_jPR.js
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Config, ConfigScope, SecretKey, Settings } from "@flitter/schemas";
import { TrustStore } from "./trust-store";

/** Mock ConfigService for testing */
class MockConfigService {
  private settings: Partial<Settings> = {};

  constructor(initialSettings: Partial<Settings> = {}) {
    this.settings = { ...initialSettings };
  }

  get(): Config {
    return {
      settings: this.settings as Settings,
      secrets: {
        getToken: async () => undefined,
        isSet: () => false,
      },
    };
  }

  updateSettings(_scope: ConfigScope, key: string, value: unknown): void {
    (this.settings as Record<string, unknown>)[key] = value;
  }

  appendSettings(_scope: ConfigScope, key: string, value: unknown): void {
    const arr = (this.settings as Record<string, unknown>)[key];
    const current = Array.isArray(arr) ? [...arr] : [];
    current.push(value);
    (this.settings as Record<string, unknown>)[key] = current;
  }

  prependSettings(_scope: ConfigScope, key: string, value: unknown): void {
    const arr = (this.settings as Record<string, unknown>)[key];
    const current = Array.isArray(arr) ? [...arr] : [];
    current.unshift(value);
    (this.settings as Record<string, unknown>)[key] = current;
  }

  deleteSettings(_scope: ConfigScope, _key: string): void {}
  updateSecret(_key: SecretKey, _value: string): void {}
  get workspaceRoot() { return ""; }
  get homeDir() { return ""; }
  get userConfigDir() { return ""; }
  displayPathEnvInfo(): void {}
  async getLatest(): Promise<Config> { return this.get(); }
  unsubscribe(): void {}
}

describe("TrustStore", () => {
  let config: MockConfigService;
  let trustStore: TrustStore;

  beforeEach(() => {
    config = new MockConfigService({
      mcpTrustedServers: ["server-a", "server-b"],
    });
    trustStore = new TrustStore(config as any);
  });

  describe("isTrusted", () => {
    it("should return true for trusted servers", () => {
      assert.equal(trustStore.isTrusted("server-a"), true);
      assert.equal(trustStore.isTrusted("server-b"), true);
    });

    it("should return false for untrusted servers", () => {
      assert.equal(trustStore.isTrusted("unknown-server"), false);
    });
  });

  describe("listTrusted", () => {
    it("should return all trusted servers", () => {
      const trusted = trustStore.listTrusted();
      assert.deepEqual(trusted, ["server-a", "server-b"]);
    });

    it("should return empty array when no trusted servers", () => {
      const emptyConfig = new MockConfigService({});
      const emptyStore = new TrustStore(emptyConfig as any);
      assert.deepEqual(emptyStore.listTrusted(), []);
    });
  });

  describe("approve", () => {
    it("should add a new server to trusted list", async () => {
      await trustStore.approve("server-c");
      assert.equal(trustStore.isTrusted("server-c"), true);
    });

    it("should not duplicate existing trusted server", async () => {
      await trustStore.approve("server-a");
      const trusted = trustStore.listTrusted();
      assert.equal(trusted.filter((s) => s === "server-a").length, 1);
    });
  });

  describe("revoke", () => {
    it("should remove a server from trusted list", async () => {
      await trustStore.revoke("server-a");
      assert.equal(trustStore.isTrusted("server-a"), false);
      assert.equal(trustStore.isTrusted("server-b"), true);
    });

    it("should be a no-op for non-trusted server", async () => {
      const before = trustStore.listTrusted();
      await trustStore.revoke("nonexistent");
      const after = trustStore.listTrusted();
      assert.deepEqual(before, after);
    });
  });
});
