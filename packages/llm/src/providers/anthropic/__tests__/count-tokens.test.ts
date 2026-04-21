/**
 * Tests for CORE-16: API-based token counting on AnthropicProvider
 *
 * 逆向: amp-cli-reversed/modules/0084_unknown_Qu.js (countTokens call)
 * 逆向: amp-cli-reversed/modules/0083_unknown_l1R.js (character fallback)
 */
import { describe, expect, it, mock } from "bun:test";
import { AnthropicProvider } from "../provider";

// ─── Mock Anthropic client ──────────────────────────────

function createMockClient(countTokensResponse?: { input_tokens: number }) {
  return {
    messages: {
      stream: mock(() => (async function* () {})()),
      create: mock(async () => ({})),
      countTokens: mock(async () => countTokensResponse ?? { input_tokens: 42 }),
    },
  } as never;
}

const mockConfig = {
  settings: {},
  secrets: {
    getToken: async (key: string) => (key === "apiKey" ? "sk-test-key" : null),
  },
};

const noKeyConfig = {
  settings: {},
  secrets: {
    getToken: async () => null,
  },
};

// ─── Tests ──────────────────────────────────────────────

describe("AnthropicProvider.countTokens", () => {
  it("returns input tokens from the API", async () => {
    const client = createMockClient({ input_tokens: 150 });
    const provider = new AnthropicProvider(client);

    const result = await provider.countTokens!({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: [{ type: "text", text: "Hello world" }] } as never],
      config: mockConfig,
    });

    expect(result.inputTokens).toBe(150);
  });

  it("passes thinking parameter to the SDK for accurate counting", async () => {
    const client = createMockClient({ input_tokens: 200 });
    const provider = new AnthropicProvider(client);

    await provider.countTokens!({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: [{ type: "text", text: "test" }] } as never],
      systemPrompt: [{ type: "text", text: "You are helpful." }] as never,
      tools: [{ name: "read", description: "read a file", inputSchema: {} }] as never,
      config: mockConfig,
    });

    // The SDK countTokens should have been called
    expect(client.messages.countTokens).toHaveBeenCalled();
    const callArgs = (client.messages.countTokens as ReturnType<typeof mock>).mock
      .calls[0]![0] as Record<string, unknown>;
    expect(callArgs.model).toBe("claude-sonnet-4-20250514");
    // Should include thinking parameter (matching amp's Qu function)
    expect(callArgs.thinking).toEqual({ type: "enabled", budget_tokens: 10000 });
  });

  it("falls back to character approximation when API throws", async () => {
    const client = createMockClient();
    (
      client as unknown as { messages: { countTokens: ReturnType<typeof mock> } }
    ).messages.countTokens = mock(async () => {
      throw new Error("API error");
    });
    const provider = new AnthropicProvider(client);

    const result = await provider.countTokens!({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] } as never],
      config: mockConfig,
    });

    // Should return a character-based approximation (not throw)
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(typeof result.inputTokens).toBe("number");
  });

  it("falls back when no API key is available", async () => {
    const client = createMockClient();
    const provider = new AnthropicProvider(client);

    const result = await provider.countTokens!({
      model: "claude-sonnet-4-20250514",
      messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] } as never],
      config: noKeyConfig,
    });

    // Should return a fallback value
    expect(result.inputTokens).toBeGreaterThan(0);
    // SDK should NOT have been called
    expect(client.messages.countTokens).not.toHaveBeenCalled();
  });

  it("uses fallback message when no messages provided", async () => {
    const client = createMockClient({ input_tokens: 5 });
    const provider = new AnthropicProvider(client);

    const result = await provider.countTokens!({
      model: "claude-sonnet-4-20250514",
      config: mockConfig,
    });

    expect(result.inputTokens).toBe(5);
    const callArgs = (client.messages.countTokens as ReturnType<typeof mock>).mock
      .calls[0]![0] as Record<string, unknown>;
    // Should pass a minimal message (matching amp: [{ role: "user", content: "x" }])
    expect(callArgs.messages).toEqual([{ role: "user", content: "x" }]);
  });

  it("character fallback matches amp's n1R(T) = Math.ceil(T.length / 4)", async () => {
    const client = createMockClient();
    (
      client as unknown as { messages: { countTokens: ReturnType<typeof mock> } }
    ).messages.countTokens = mock(async () => {
      throw new Error("force fallback");
    });
    const provider = new AnthropicProvider(client);

    // A message with known JSON length
    const messages = [
      { role: "user", content: [{ type: "text", text: "a".repeat(100) }] },
    ] as never;

    const result = await provider.countTokens!({
      model: "claude-sonnet-4-20250514",
      messages,
      config: mockConfig,
    });

    // Verify it's close to Math.ceil(JSON.stringify(messages).length / 4)
    const expected = Math.ceil(JSON.stringify(messages).length / 4);
    expect(result.inputTokens).toBe(expected);
  });
});
