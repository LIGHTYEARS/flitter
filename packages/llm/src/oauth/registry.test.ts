/**
 * Tests for OAuth provider registry.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  registerOAuthProvider,
  getOAuthProvider,
  getOAuthProviders,
  getOAuthApiKey,
  clearOAuthProviders,
} from "./registry";
import type { OAuthCredentials, OAuthProviderInterface } from "./types";

function makeMockProvider(id: string, overrides: Partial<OAuthProviderInterface> = {}): OAuthProviderInterface {
  return {
    id,
    name: `Mock ${id}`,
    async login() {
      return { refresh: "r", access: "a", expires: Date.now() + 3600_000 };
    },
    async refreshToken(creds: OAuthCredentials) {
      return { ...creds, access: "refreshed_access", expires: Date.now() + 3600_000 };
    },
    getApiKey(creds: OAuthCredentials) {
      return creds.access;
    },
    ...overrides,
  };
}

describe("OAuth Registry", () => {
  beforeEach(() => {
    clearOAuthProviders();
  });

  it("should register and retrieve a provider", () => {
    const provider = makeMockProvider("test");
    registerOAuthProvider(provider);
    assert.equal(getOAuthProvider("test"), provider);
  });

  it("should return undefined for unregistered provider", () => {
    assert.equal(getOAuthProvider("nonexistent"), undefined);
  });

  it("should list all registered providers", () => {
    registerOAuthProvider(makeMockProvider("a"));
    registerOAuthProvider(makeMockProvider("b"));
    const all = getOAuthProviders();
    assert.equal(all.length, 2);
    assert.deepEqual(
      all.map((p) => p.id).sort(),
      ["a", "b"],
    );
  });

  it("should replace existing provider with same id", () => {
    registerOAuthProvider(makeMockProvider("test", { name: "Old" }));
    registerOAuthProvider(makeMockProvider("test", { name: "New" }));
    assert.equal(getOAuthProvider("test")?.name, "New");
    assert.equal(getOAuthProviders().length, 1);
  });

  it("should clear all providers", () => {
    registerOAuthProvider(makeMockProvider("a"));
    registerOAuthProvider(makeMockProvider("b"));
    clearOAuthProviders();
    assert.equal(getOAuthProviders().length, 0);
  });
});

describe("getOAuthApiKey", () => {
  beforeEach(() => {
    clearOAuthProviders();
  });

  it("should return apiKey from valid non-expired credentials", async () => {
    registerOAuthProvider(makeMockProvider("test"));
    const credentials: Record<string, OAuthCredentials> = {
      test: { refresh: "r", access: "my_access_token", expires: Date.now() + 3600_000 },
    };
    const result = await getOAuthApiKey("test", credentials);
    assert.ok(result);
    assert.equal(result.apiKey, "my_access_token");
    assert.equal(result.newCredentials.access, "my_access_token");
  });

  it("should refresh expired credentials and return new apiKey", async () => {
    registerOAuthProvider(makeMockProvider("test"));
    const credentials: Record<string, OAuthCredentials> = {
      test: { refresh: "r", access: "old_access", expires: Date.now() - 1000 }, // expired
    };
    const result = await getOAuthApiKey("test", credentials);
    assert.ok(result);
    assert.equal(result.apiKey, "refreshed_access");
    assert.equal(result.newCredentials.access, "refreshed_access");
    assert.ok(result.newCredentials.expires > Date.now());
  });

  it("should refresh credentials expiring within 60s buffer", async () => {
    registerOAuthProvider(makeMockProvider("test"));
    const credentials: Record<string, OAuthCredentials> = {
      test: { refresh: "r", access: "soon_expired", expires: Date.now() + 30_000 }, // 30s left < 60s buffer
    };
    const result = await getOAuthApiKey("test", credentials);
    assert.ok(result);
    assert.equal(result.apiKey, "refreshed_access");
  });

  it("should return null for unregistered provider", async () => {
    const result = await getOAuthApiKey("nonexistent", {});
    assert.equal(result, null);
  });

  it("should return null for missing credentials", async () => {
    registerOAuthProvider(makeMockProvider("test"));
    const result = await getOAuthApiKey("test", {});
    assert.equal(result, null);
  });
});
