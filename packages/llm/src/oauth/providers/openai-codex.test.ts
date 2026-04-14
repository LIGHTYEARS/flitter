/**
 * Tests for OpenAI Codex OAuth provider.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import type { OAuthLoginCallbacks } from "../types";
import { OpenAICodexOAuthProvider } from "./openai-codex";

describe("OpenAICodexOAuthProvider", () => {
  let provider: OpenAICodexOAuthProvider;

  beforeEach(() => {
    provider = new OpenAICodexOAuthProvider();
  });

  it("should have correct identity", () => {
    assert.equal(provider.id, "openai-codex");
    assert.equal(provider.name, "OpenAI (ChatGPT Plus/Pro)");
    assert.equal(provider.usesCallbackServer, true);
  });

  it("should extract apiKey from credentials", () => {
    const key = provider.getApiKey({
      refresh: "r",
      access: "openai_access_token_abc",
      expires: Date.now() + 3600_000,
    });
    assert.equal(key, "openai_access_token_abc");
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
        access_token: "new_openai_token",
        refresh_token: "new_refresh",
        token_type: "bearer",
        expires_in: 7200,
      };

      globalThis.fetch = mock.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr =
          typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
        assert.ok(urlStr.includes("auth.openai.com"));
        const body = init?.body as string;
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

      assert.equal(result.access, "new_openai_token");
      assert.equal(result.refresh, "new_refresh");
      assert.ok(result.expires > Date.now());
    });

    it("should throw on refresh failure", async () => {
      globalThis.fetch = mock.fn(async () => {
        return new Response("invalid_grant", { status: 400 });
      }) as typeof globalThis.fetch;

      await assert.rejects(
        provider.refreshToken({ refresh: "bad", access: "a", expires: 0 }),
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
          ac.abort();
        },
        onPrompt: async () => "",
        onProgress: () => {},
        signal: ac.signal,
      };

      await assert.rejects(provider.login(callbacks), (err: Error) => {
        assert.ok(err.message.includes("cancelled"));
        return true;
      });

      assert.ok(capturedUrl.includes("auth.openai.com/oauth/authorize"));
      assert.ok(capturedUrl.includes("response_type=code"));
      assert.ok(capturedUrl.includes("code_challenge="));
      assert.ok(capturedUrl.includes("code_challenge_method=S256"));
      assert.ok(capturedUrl.includes("audience="));
    });
  });
});
