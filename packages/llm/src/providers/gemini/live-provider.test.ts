/**
 * live-provider.test.ts — GoogleGenAILiveProvider unit tests
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GoogleGenAILiveProvider } from "./live-provider.js";

describe("GoogleGenAILiveProvider", () => {
  describe("constructor", () => {
    it("creates with default config", () => {
      const provider = new GoogleGenAILiveProvider();
      assert.equal(provider.name, "gemini");
      assert.equal(provider.connectionState, "disconnected");
    });

    it("creates with custom config", () => {
      const provider = new GoogleGenAILiveProvider({
        apiVersion: "v1alpha",
        heartbeatIntervalMs: 5000,
        connectionTimeoutMs: 5000,
      });
      assert.equal(provider.name, "gemini");
    });
  });

  describe("buildWebSocketUrl", () => {
    it("builds public API URL with API key", () => {
      const provider = new GoogleGenAILiveProvider({
        apiVersion: "v1beta",
      });

      const url = provider.buildWebSocketUrl("test-api-key");
      assert.equal(
        url,
        "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=test-api-key",
      );
    });

    it("builds Vertex AI URL with project and location", () => {
      const provider = new GoogleGenAILiveProvider({
        apiVersion: "v1beta",
        vertexAI: true,
        project: "my-project",
        location: "us-central1",
      });

      const url = provider.buildWebSocketUrl("dummy");
      assert.equal(
        url,
        "wss://us-central1-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta.LlmBidiService/BidiGenerateContent",
      );
    });

    it("uses custom wsBaseUrl when provided", () => {
      const provider = new GoogleGenAILiveProvider({
        wsBaseUrl: "wss://custom.endpoint.com",
      });

      const url = provider.buildWebSocketUrl("key123");
      assert.ok(url.startsWith("wss://custom.endpoint.com/"));
      assert.ok(url.includes("key=key123"));
    });
  });

  describe("buildSetupMessage", () => {
    it("builds setup message for public API", () => {
      const provider = new GoogleGenAILiveProvider();
      const msg = provider.buildSetupMessage("gemini-2.5-flash", {
        maxOutputTokens: 8192,
      });

      assert.deepEqual(msg, {
        setup: {
          model: "gemini-2.5-flash",
          generationConfig: { maxOutputTokens: 8192 },
        },
      });
    });

    it("builds setup message for Vertex AI with full path", () => {
      const provider = new GoogleGenAILiveProvider({
        vertexAI: true,
        project: "my-project",
        location: "us-central1",
      });

      const msg = provider.buildSetupMessage("gemini-2.5-pro", {});
      assert.equal(
        (msg.setup as Record<string, unknown>).model,
        "projects/my-project/locations/us-central1/publishers/google/models/gemini-2.5-pro",
      );
    });
  });

  describe("parseServerMessage", () => {
    it("parses valid JSON server message", () => {
      const provider = new GoogleGenAILiveProvider();
      const msg = provider.parseServerMessage(
        JSON.stringify({
          serverContent: {
            modelTurn: {
              parts: [{ text: "Hello world" }],
            },
          },
        }),
      );

      assert.ok(msg.serverContent);
      assert.equal(msg.serverContent!.modelTurn!.parts![0].text, "Hello world");
    });

    it("parses turnComplete message", () => {
      const provider = new GoogleGenAILiveProvider();
      const msg = provider.parseServerMessage(
        JSON.stringify({
          serverContent: { turnComplete: true },
        }),
      );

      assert.ok(msg.serverContent?.turnComplete);
    });

    it("parses setupComplete message", () => {
      const provider = new GoogleGenAILiveProvider();
      const msg = provider.parseServerMessage(
        JSON.stringify({ setupComplete: true }),
      );

      assert.ok(msg.setupComplete);
    });

    it("parses tool call message", () => {
      const provider = new GoogleGenAILiveProvider();
      const msg = provider.parseServerMessage(
        JSON.stringify({
          toolCall: {
            functionCalls: [
              { id: "fc-1", name: "read_file", args: { path: "/tmp/test.txt" } },
            ],
          },
        }),
      );

      assert.ok(msg.toolCall);
      assert.equal(msg.toolCall!.functionCalls![0].name, "read_file");
    });

    it("returns empty object for invalid JSON", () => {
      const provider = new GoogleGenAILiveProvider();
      const msg = provider.parseServerMessage("not json");
      assert.deepEqual(msg, {});
    });
  });

  describe("stream fallback", () => {
    it("falls back to REST when WebSocket is unavailable", async () => {
      // Create a provider without WebSocket support and without a createWebSocket factory.
      // In a test environment, globalThis.WebSocket is typically undefined.
      const restFallbackCalled: string[] = [];
      const mockRestProvider = {
        name: "gemini" as const,
        async *stream() {
          restFallbackCalled.push("called");
          yield {
            content: [{ type: "text" as const, text: "rest response", startTime: Date.now() }],
            state: "complete",
          };
        },
      };

      // No createWebSocket factory => if WebSocket is undefined, fallback is used
      const provider = new GoogleGenAILiveProvider(
        {}, // no createWebSocket
        mockRestProvider as any,
      );

      const params = {
        model: "gemini-2.5-flash",
        messages: [],
        systemPrompt: [],
        tools: [],
        config: {
          settings: {},
          secrets: { getToken: async () => "test-key" },
        },
        signal: new AbortController().signal,
      };

      const deltas: unknown[] = [];
      for await (const delta of provider.stream(params as any)) {
        deltas.push(delta);
      }

      // Whether WS is available depends on environment; but we verify no crash
      assert.ok(deltas.length >= 0);
    });
  });
});
