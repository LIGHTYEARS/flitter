/**
 * Tests for GAP-LLM-16: Gemini countTokens implementation
 *
 * 逆向: amp-cli-reversed/chunk-005.js:101711 — Gemini SDK countTokens
 * 逆向: amp-cli-reversed/modules/0083_unknown_l1R.js (character fallback n1R)
 */
import { describe, expect, it, mock } from "bun:test";
import { GeminiProvider } from "./provider";

// ─── Mock GoogleGenAI client ───────────────────────────

function createMockClient(countTokensResponse?: { totalTokens: number }) {
  return {
    models: {
      generateContentStream: mock(async function* () {}),
      countTokens: mock(async () => countTokensResponse ?? { totalTokens: 42 }),
    },
  } as never;
}

const mockConfig = {
  settings: {},
  secrets: {
    getToken: async (key: string) => (key === "apiKey" ? "test-gemini-key" : null),
  },
};

const noKeyConfig = {
  settings: {},
  secrets: {
    getToken: async () => null,
  },
};

// ─── Tests ─────────────────────────────────────────────

describe("GeminiProvider.countTokens", () => {
  it("returns input tokens from the API", async () => {
    const client = createMockClient({ totalTokens: 150 });
    const provider = new GeminiProvider(client);

    const result = await provider.countTokens({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: [{ type: "text", text: "Hello world" }] } as never],
      config: mockConfig,
    });

    expect(result.inputTokens).toBe(150);
  });

  it("calls the SDK countTokens with correct model and contents", async () => {
    const client = createMockClient({ totalTokens: 100 });
    const provider = new GeminiProvider(client);

    await provider.countTokens({
      model: "gemini-2.5-pro-preview-05-06",
      messages: [{ role: "user", content: [{ type: "text", text: "test" }] } as never],
      systemPrompt: [{ type: "text", text: "You are helpful." }] as never,
      config: mockConfig,
    });

    expect(client.models.countTokens).toHaveBeenCalled();
    const callArgs = (client.models.countTokens as ReturnType<typeof mock>).mock
      .calls[0]![0] as Record<string, unknown>;
    expect(callArgs.model).toBe("gemini-2.5-pro-preview-05-06");
    // Should have contents (the transformed messages)
    expect(callArgs.contents).toBeDefined();
  });

  it("falls back to character approximation when API throws", async () => {
    const client = createMockClient();
    (client as unknown as { models: { countTokens: ReturnType<typeof mock> } }).models.countTokens =
      mock(async () => {
        throw new Error("API error");
      });
    const provider = new GeminiProvider(client);

    const result = await provider.countTokens({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] } as never],
      config: mockConfig,
    });

    // Should return a character-based approximation (not throw)
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(typeof result.inputTokens).toBe("number");
  });

  it("falls back when no API key is available", async () => {
    const client = createMockClient();
    const provider = new GeminiProvider(client);

    const result = await provider.countTokens({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] } as never],
      config: noKeyConfig,
    });

    // Should return a fallback value
    expect(result.inputTokens).toBeGreaterThan(0);
    // SDK should NOT have been called
    expect(client.models.countTokens).not.toHaveBeenCalled();
  });

  it("uses fallback message when no messages provided", async () => {
    const client = createMockClient({ totalTokens: 5 });
    const provider = new GeminiProvider(client);

    const result = await provider.countTokens({
      model: "gemini-2.0-flash",
      config: mockConfig,
    });

    expect(result.inputTokens).toBe(5);
    // Should have been called with a minimal "x" message
    expect(client.models.countTokens).toHaveBeenCalled();
  });

  it("returns 0 when API returns undefined totalTokens", async () => {
    const client = createMockClient();
    (client as unknown as { models: { countTokens: ReturnType<typeof mock> } }).models.countTokens =
      mock(async () => ({ totalTokens: undefined }));
    const provider = new GeminiProvider(client);

    const result = await provider.countTokens({
      model: "gemini-2.0-flash",
      messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] } as never],
      config: mockConfig,
    });

    expect(result.inputTokens).toBe(0);
  });

  it("character fallback matches amp's n1R(T) = Math.ceil(T.length / 4)", async () => {
    const client = createMockClient();
    (client as unknown as { models: { countTokens: ReturnType<typeof mock> } }).models.countTokens =
      mock(async () => {
        throw new Error("force fallback");
      });
    const provider = new GeminiProvider(client);

    // A message with known JSON length
    const messages = [
      { role: "user", content: [{ type: "text", text: "a".repeat(100) }] },
    ] as never;

    const result = await provider.countTokens({
      model: "gemini-2.0-flash",
      messages,
      config: mockConfig,
    });

    // Verify it matches Math.ceil(JSON.stringify(messages).length / 4)
    const expected = Math.ceil(JSON.stringify(messages).length / 4);
    expect(result.inputTokens).toBe(expected);
  });
});
