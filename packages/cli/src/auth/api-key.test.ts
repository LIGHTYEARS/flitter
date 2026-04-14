/**
 * API Key 认证模块测试
 *
 * 测试 API Key 验证、环境变量读取、存储与检查功能。
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { SecretStorage } from "@flitter/flitter";
import { getApiKeyFromEnv, hasApiKey, storeApiKey, validateApiKey } from "./api-key";

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

describe("validateApiKey", () => {
  it("应该接受 'sk-' 前缀的 key", () => {
    expect(validateApiKey("sk-abc123")).toBe(true);
  });

  it("应该接受 'flitter-' 前缀的 key", () => {
    expect(validateApiKey("flitter-abc123")).toBe(true);
  });

  it("应该接受非标准格式的 key (如 ARK 端点 key)", () => {
    expect(validateApiKey("7c02ee8f-c1d5-4fda-8a1d-c863f4917cb8")).toBe(true);
  });

  it("应该拒绝空字符串", () => {
    expect(validateApiKey("")).toBe(false);
  });

  it("应该拒绝纯空白字符串", () => {
    expect(validateApiKey("   ")).toBe(false);
  });
});

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

describe("storeApiKey + hasApiKey", () => {
  let secrets: SecretStorage;

  beforeEach(() => {
    secrets = createMockSecretStorage();
  });

  it("存储后 hasApiKey 应返回 true", async () => {
    const providerId = "default";
    expect(await hasApiKey(secrets, providerId)).toBe(false);

    await storeApiKey(secrets, providerId, "sk-stored-key");
    expect(await hasApiKey(secrets, providerId)).toBe(true);
  });

  it("不同 providerId 的 key 应互相隔离", async () => {
    await storeApiKey(secrets, "anthropic", "sk-key-a");
    expect(await hasApiKey(secrets, "anthropic")).toBe(true);
    expect(await hasApiKey(secrets, "openai")).toBe(false);
  });
});
