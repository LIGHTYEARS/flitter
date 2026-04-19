/**
 * 认证命令处理器测试
 *
 * 测试 handleLogin 和 handleLogout 的核心流程:
 * - 环境变量 FLITTER_API_KEY 登录
 * - 空/无效 key 拒绝
 * - handleLogout 清除所有凭据
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { SecretStorage } from "@flitter/flitter";
import type { CliContext } from "../context";
import { handleLogin, handleLogout } from "./auth";

// ─── Mock SecretStorage ──────────────────────────────────

function createMockSecrets(): SecretStorage & {
  _store: Map<string, string>;
  setCalls: Array<{ key: string; value: string; scope?: string }>;
  deleteCalls: Array<{ key: string; scope?: string }>;
} {
  const store = new Map<string, string>();
  const setCalls: Array<{ key: string; value: string; scope?: string }> = [];
  const deleteCalls: Array<{ key: string; scope?: string }> = [];
  return {
    _store: store,
    setCalls,
    deleteCalls,
    async get(key: string, scope?: string): Promise<string | undefined> {
      return store.get(scope ? `${scope}:${key}` : key);
    },
    async set(key: string, value: string, scope?: string): Promise<void> {
      setCalls.push({ key, value, scope });
      store.set(scope ? `${scope}:${key}` : key, value);
    },
    async delete(key: string, scope?: string): Promise<void> {
      deleteCalls.push({ key, scope });
      store.delete(scope ? `${scope}:${key}` : key);
    },
  };
}

// ─── Context fixtures ─────────────────────────────────────

const ttyContext: CliContext = {
  executeMode: false,
  isTTY: true,
  headless: false,
  streamJson: false,
  verbose: false,
};

const nonTtyContext: CliContext = {
  executeMode: true,
  isTTY: false,
  headless: false,
  streamJson: false,
  verbose: false,
};

// ─── handleLogin 测试 ─────────────────────────────────────

describe("handleLogin", () => {
  let originalEnvKey: string | undefined;

  beforeEach(() => {
    originalEnvKey = process.env.FLITTER_API_KEY;
  });

  afterEach(() => {
    if (originalEnvKey !== undefined) {
      process.env.FLITTER_API_KEY = originalEnvKey;
    } else {
      delete process.env.FLITTER_API_KEY;
    }
    // Reset exitCode
    process.exitCode = undefined;
  });

  it("should store API key from FLITTER_API_KEY env var", async () => {
    process.env.FLITTER_API_KEY = "sk-test-key-12345";
    const secrets = createMockSecrets();

    await handleLogin({ secrets }, ttyContext);

    assert.equal(secrets.setCalls.length, 1);
    assert.equal(secrets.setCalls[0].key, "apiKey");
    assert.equal(secrets.setCalls[0].value, "sk-test-key-12345");
    assert.equal(secrets.setCalls[0].scope, "default");
  });

  it("should reject empty FLITTER_API_KEY (whitespace only)", async () => {
    process.env.FLITTER_API_KEY = "   ";
    const secrets = createMockSecrets();

    await handleLogin({ secrets }, nonTtyContext);

    // Should not store empty key — the warning prints and falls through to non-TTY error
    assert.equal(secrets.setCalls.length, 0);
  });

  it("should set exitCode=1 for non-TTY without env key", async () => {
    delete process.env.FLITTER_API_KEY;
    const secrets = createMockSecrets();

    await handleLogin({ secrets }, nonTtyContext);

    assert.equal(process.exitCode, 1);
  });
});

// ─── handleLogout 测试 ────────────────────────────────────

describe("handleLogout", () => {
  it("should delete default apiKey credential", async () => {
    const secrets = createMockSecrets();
    await secrets.set("apiKey", "sk-test", "default");

    await handleLogout({ secrets }, ttyContext);

    // Should have called delete for "apiKey" with scope "default"
    const apiKeyDeletes = secrets.deleteCalls.filter((c) => c.key === "apiKey" && c.scope === "default");
    assert.ok(apiKeyDeletes.length >= 1, "Should delete default apiKey");
  });

  it("should delete OAuth provider credentials", async () => {
    const secrets = createMockSecrets();

    await handleLogout({ secrets }, ttyContext);

    // Should have called delete for OAuth credentials (anthropic, openai-codex, github-copilot)
    const oauthDeletes = secrets.deleteCalls.filter((c) => c.key === "oauthCredentials");
    assert.ok(oauthDeletes.length >= 3, "Should delete OAuth credentials for all registered providers");

    // Should also delete per-provider apiKey entries
    const providerKeyDeletes = secrets.deleteCalls.filter(
      (c) => c.key === "apiKey" && c.scope !== "default",
    );
    assert.ok(providerKeyDeletes.length >= 3, "Should delete per-provider API keys");
  });
});
