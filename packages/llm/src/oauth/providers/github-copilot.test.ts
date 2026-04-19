/**
 * Tests for GitHub Copilot OAuth provider (Device Code flow).
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { mock } from "bun:test";
import type { OAuthLoginCallbacks } from "../types";
import { GitHubCopilotOAuthProvider } from "./github-copilot";

describe("GitHubCopilotOAuthProvider", () => {
  let provider: GitHubCopilotOAuthProvider;

  beforeEach(() => {
    provider = new GitHubCopilotOAuthProvider();
    provider._minPollIntervalMs = 10; // fast polling for tests
  });

  it("should have correct identity", () => {
    assert.equal(provider.id, "github-copilot");
    assert.equal(provider.name, "GitHub Copilot");
    assert.equal(provider.usesCallbackServer, false);
  });

  it("should extract apiKey from credentials", () => {
    const key = provider.getApiKey({
      refresh: "gho_github_token",
      access: "tid=copilot_token_xyz",
      expires: Date.now() + 3600_000,
    });
    assert.equal(key, "tid=copilot_token_xyz");
  });

  describe("modifyModels", () => {
    it("should set baseUrl from copilot endpoints", () => {
      const models = [
        {
          id: "gpt-4o",
          provider: "openai" as const,
          contextWindow: 128000,
          supportsThinking: false,
        },
      ];
      const credentials = {
        refresh: "r",
        access: "a",
        expires: Date.now() + 3600_000,
        endpoints: [{ api: "openai-chat", base_url: "https://proxy.githubcopilot.com" }],
      };
      const modified = provider.modifyModels(models, credentials);
      assert.equal(modified[0].baseUrl, "https://proxy.githubcopilot.com");
    });

    it("should return models unchanged if no endpoints", () => {
      const models = [
        {
          id: "gpt-4o",
          provider: "openai" as const,
          contextWindow: 128000,
          supportsThinking: false,
        },
      ];
      const credentials = {
        refresh: "r",
        access: "a",
        expires: Date.now() + 3600_000,
      };
      const modified = provider.modifyModels(models, credentials);
      assert.equal(modified[0].baseUrl, undefined);
    });

    it("should return models unchanged if no openai-chat endpoint", () => {
      const models = [
        {
          id: "gpt-4o",
          provider: "openai" as const,
          contextWindow: 128000,
          supportsThinking: false,
        },
      ];
      const credentials = {
        refresh: "r",
        access: "a",
        expires: Date.now() + 3600_000,
        endpoints: [{ api: "other-api", base_url: "https://other.endpoint.com" }],
      };
      const modified = provider.modifyModels(models, credentials);
      assert.equal(modified[0].baseUrl, undefined);
    });
  });

  describe("refreshToken", () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("should get new copilot token using github token", async () => {
      const mockCopilotResponse = {
        token: "new_copilot_token",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        endpoints: [{ api: "openai-chat", base_url: "https://proxy.githubcopilot.com" }],
      };

      globalThis.fetch = mock(async (url: string | URL | Request) => {
        const urlStr =
          typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
        assert.ok(urlStr.includes("githubcopilot.com"));
        return new Response(JSON.stringify(mockCopilotResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as typeof globalThis.fetch;

      const result = await provider.refreshToken({
        refresh: "gho_github_token",
        access: "old_copilot_token",
        expires: Date.now() - 1000,
      });

      assert.equal(result.access, "new_copilot_token");
      assert.equal(result.refresh, "gho_github_token"); // GitHub token unchanged
      assert.ok(result.expires > Date.now());
    });

    it("should throw on copilot token failure", async () => {
      globalThis.fetch = mock(async () => {
        return new Response("unauthorized", { status: 401 });
      }) as typeof globalThis.fetch;

      await assert.rejects(
        provider.refreshToken({ refresh: "bad_token", access: "a", expires: 0 }),
        (err: Error) => {
          assert.ok(err.message.includes("Copilot token request failed"));
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

    it("should complete device code flow", async () => {
      let fetchCallCount = 0;
      let capturedAuthUrl = "";
      let capturedInstructions = "";

      // Mock fetch to handle device code, token poll, and copilot token
      globalThis.fetch = mock(async (url: string | URL | Request) => {
        const urlStr =
          typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
        fetchCallCount++;

        // 1. Device code request
        if (urlStr.includes("/login/device/code")) {
          return new Response(
            JSON.stringify({
              device_code: "dc_test123",
              user_code: "ABCD-1234",
              verification_uri: "https://github.com/login/device",
              expires_in: 900,
              interval: 0, // Set to 0 for fast test, clamped to 5s internally
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        // 2. Token poll
        if (urlStr.includes("/login/oauth/access_token")) {
          return new Response(
            JSON.stringify({
              access_token: "gho_test_token_abc",
              token_type: "bearer",
              scope: "read:user",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        // 3. Copilot token
        if (urlStr.includes("githubcopilot.com")) {
          return new Response(
            JSON.stringify({
              token: "copilot_token_final",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              endpoints: [{ api: "openai-chat", base_url: "https://proxy.githubcopilot.com" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response("not found", { status: 404 });
      }) as typeof globalThis.fetch;

      const callbacks: OAuthLoginCallbacks = {
        onAuth: (info) => {
          capturedAuthUrl = info.url;
          capturedInstructions = info.instructions ?? "";
        },
        onPrompt: async () => "", // empty = use github.com
        onProgress: () => {},
      };

      const result = await provider.login(callbacks);

      assert.ok(capturedAuthUrl.includes("github.com/login/device"));
      assert.ok(capturedInstructions.includes("ABCD-1234"));
      assert.equal(result.refresh, "gho_test_token_abc");
      assert.equal(result.access, "copilot_token_final");
      assert.ok(result.expires > Date.now());
      assert.ok(fetchCallCount >= 3);
    });

    it("should support enterprise domain", async () => {
      let deviceCodeUrl = "";

      globalThis.fetch = mock(async (url: string | URL | Request) => {
        const urlStr =
          typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;

        if (urlStr.includes("/login/device/code")) {
          deviceCodeUrl = urlStr;
          return new Response(
            JSON.stringify({
              device_code: "dc_enterprise",
              user_code: "ENTE-RPRI",
              verification_uri: "https://github.mycompany.com/login/device",
              expires_in: 900,
              interval: 0,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        if (urlStr.includes("/login/oauth/access_token")) {
          return new Response(JSON.stringify({ access_token: "gho_enterprise_token" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (urlStr.includes("githubcopilot.com")) {
          return new Response(
            JSON.stringify({
              token: "copilot_enterprise",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response("not found", { status: 404 });
      }) as typeof globalThis.fetch;

      const callbacks: OAuthLoginCallbacks = {
        onAuth: () => {},
        onPrompt: async () => "github.mycompany.com",
        onProgress: () => {},
      };

      const result = await provider.login(callbacks);

      assert.ok(deviceCodeUrl.includes("github.mycompany.com"));
      assert.equal(result.githubHost, "https://github.mycompany.com");
      assert.equal(result.access, "copilot_enterprise");
    });
  });
});
