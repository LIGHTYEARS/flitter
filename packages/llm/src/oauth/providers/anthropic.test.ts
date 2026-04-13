/**
 * Tests for Anthropic OAuth provider.
 */
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { AnthropicOAuthProvider } from "./anthropic";
import type { OAuthLoginCallbacks } from "../types";

describe("AnthropicOAuthProvider", () => {
  let provider: AnthropicOAuthProvider;

  beforeEach(() => {
    provider = new AnthropicOAuthProvider();
  });

  it("should have correct identity", () => {
    assert.equal(provider.id, "anthropic");
    assert.equal(provider.name, "Anthropic (Claude Pro/Max)");
    assert.equal(provider.usesCallbackServer, true);
  });

  it("should extract apiKey from credentials", () => {
    const key = provider.getApiKey({
      refresh: "r",
      access: "sk-ant-oat-test123",
      expires: Date.now() + 3600_000,
    });
    assert.equal(key, "sk-ant-oat-test123");
  });

  describe("refreshToken", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should exchange refresh token for new access token", async () => {
      const mockResponse = {
        access_token: "sk-ant-oat-new",
        refresh_token: "new_refresh",
        token_type: "bearer",
        expires_in: 3600,
      };

      globalThis.fetch = mock.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
        assert.ok(urlStr.includes("platform.claude.com"));
        const body = init?.body?.toString() ?? "";
        assert.ok(body.includes("refresh_token"));
        return new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof globalThis.fetch;

      const result = await provider.refreshToken({
        refresh: "old_refresh",
        access: "old_access",
        expires: Date.now() - 1000,
      });

      assert.equal(result.access, "sk-ant-oat-new");
      assert.equal(result.refresh, "new_refresh");
      assert.ok(result.expires > Date.now());
    });

    it("should throw on refresh failure", async () => {
      globalThis.fetch = mock.fn(async () => {
        return new Response("invalid_grant", { status: 400 });
      }) as typeof globalThis.fetch;

      await assert.rejects(
        provider.refreshToken({
          refresh: "bad_refresh",
          access: "a",
          expires: 0,
        }),
        (err: Error) => {
          assert.ok(err.message.includes("refresh failed"));
          return true;
        },
      );
    });
  });

  describe("login", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should open auth URL with correct parameters", async () => {
      const ac = new AbortController();
      let capturedUrl = "";

      const callbacks: OAuthLoginCallbacks = {
        onAuth: (info) => {
          capturedUrl = info.url;
          // Abort after capturing URL (we don't want to actually wait)
          ac.abort();
        },
        onPrompt: async () => "",
        onProgress: () => {},
        signal: ac.signal,
      };

      // The login will be aborted, but we can still check the URL
      await assert.rejects(provider.login(callbacks), (err: Error) => {
        assert.ok(err.message.includes("cancelled"));
        return true;
      });

      assert.ok(capturedUrl.includes("claude.ai/oauth/authorize"));
      assert.ok(capturedUrl.includes("response_type=code"));
      assert.ok(capturedUrl.includes("code_challenge="));
      assert.ok(capturedUrl.includes("code_challenge_method=S256"));
      assert.ok(capturedUrl.includes("scope="));
    });
  });
});
