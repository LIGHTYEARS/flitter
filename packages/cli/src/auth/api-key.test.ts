/**
 * API Key 认证模块测试
 *
 * 测试 API Key 验证、环境变量读取、存储与检查功能。
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  validateApiKey,
  getApiKeyFromEnv,
  hasApiKey,
  storeApiKey,
  promptApiKey,
} from "./api-key";
import type { SecretStorage } from "@flitter/flitter";

// ─── Mock SecretStorage ─────────────────────────────────

function createMockSecretStorage(): SecretStorage & { _store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    _store: store,
    async get(key: string, scope?: string): Promise<string | undefined> {
      const k = scope ? `${key}@${scope}` : key;
      return store.get(k);
    },
    async set(key: string, value: string, scope?: string): Promise<void> {
      const k = scope ? `${key}@${scope}` : key;
      store.set(k, value);
    },
    async delete(key: string, scope?: string): Promise<void> {
      const k = scope ? `${key}@${scope}` : key;
      store.delete(k);
    },
  };
}

// ─── validateApiKey ─────────────────────────────────────

describe("validateApiKey", () => {
  it("应该接受 'sk-' 前缀的 key", () => {
    expect(validateApiKey("sk-abc123")).toBe(true);
  });

  it("应该接受 'flitter-' 前缀的 key", () => {
    expect(validateApiKey("flitter-abc123")).toBe(true);
  });

  it("应该拒绝无效前缀的 key", () => {
    expect(validateApiKey("invalid-key")).toBe(false);
  });

  it("应该拒绝空字符串", () => {
    expect(validateApiKey("")).toBe(false);
  });

  it("应该拒绝纯空白字符串", () => {
    expect(validateApiKey("   ")).toBe(false);
  });
});

// ─── getApiKeyFromEnv ───────────────────────────────────

describe("getApiKeyFromEnv", () => {
  const originalEnv = process.env.FLITTER_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.FLITTER_API_KEY = originalEnv;
    } else {
      delete process.env.FLITTER_API_KEY;
    }
  });

  it("环境变量存在时应返回其值", () => {
    process.env.FLITTER_API_KEY = "sk-test-env-key";
    expect(getApiKeyFromEnv()).toBe("sk-test-env-key");
  });

  it("环境变量不存在时应返回 undefined", () => {
    delete process.env.FLITTER_API_KEY;
    expect(getApiKeyFromEnv()).toBeUndefined();
  });
});

// ─── storeApiKey + hasApiKey ────────────────────────────

describe("storeApiKey + hasApiKey", () => {
  let secrets: SecretStorage;

  beforeEach(() => {
    secrets = createMockSecretStorage();
  });

  it("存储后 hasApiKey 应返回 true", async () => {
    const ampURL = "https://api.example.com";
    expect(await hasApiKey(secrets, ampURL)).toBe(false);

    await storeApiKey(secrets, ampURL, "sk-stored-key");
    expect(await hasApiKey(secrets, ampURL)).toBe(true);
  });

  it("不同 ampURL 的 key 应互相隔离", async () => {
    await storeApiKey(secrets, "https://a.example.com", "sk-key-a");
    expect(await hasApiKey(secrets, "https://a.example.com")).toBe(true);
    expect(await hasApiKey(secrets, "https://b.example.com")).toBe(false);
  });
});
