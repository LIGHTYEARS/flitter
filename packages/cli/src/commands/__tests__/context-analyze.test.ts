/**
 * Tests for /context-analyze slash command.
 *
 * 逆向: e0R:274-286 (id: "context-analyze", noun: "context", verb: "analyze")
 * 逆向: oFT in 0088_Messages_oFT.js — token breakdown via API counting
 * 逆向: eX0 in 0246_unknown_eX0.js — CLI output formatting
 *
 * Tests cover:
 * - Command registration and alias
 * - Output formatting (title, model line, sections, used/free)
 * - Empty thread handling
 * - Single message thread
 * - Mixed message types (user, assistant, tool_result)
 * - Percentage calculation correctness
 * - API token count override via contextAnalyzer
 * - Near-capacity warning
 * - Unknown model fallback
 */

import { describe, expect, it, mock } from "bun:test";
import { createBuiltinCommands } from "../slash-handlers";
import type { SlashCommandContext } from "../slash-registry";
import { SlashCommandRegistry } from "../slash-registry";

// ─── Test helpers ──────────────────────────────────────

function makeContext(overrides?: Partial<SlashCommandContext>): SlashCommandContext {
  return {
    threadId: "test-thread",
    threadStore: {
      getThreadSnapshot: () => ({
        id: "test-thread",
        v: 1,
        title: null,
        messages: [
          { role: "user", content: [{ type: "text", text: "hello" }] },
          { role: "assistant", content: [{ type: "text", text: "hi" }] },
        ],
        relationships: [],
      }),
      setCachedThread: mock(() => {}),
      deleteThread: mock(() => {}),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any,
    threadWorker: {
      runInference: mock(async () => {}),
      cancelInference: mock(() => {}),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any,
    configService: {
      get: () => ({
        settings: { "internal.model": "claude-sonnet-4-20250514" },
      }),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any,
    showMessage: mock(() => {}),
    clearInput: mock(() => {}),
    ...overrides,
  };
}

function makeRegistry(): SlashCommandRegistry {
  const registry = new SlashCommandRegistry();
  createBuiltinCommands(registry);
  return registry;
}

// ─── Tests ─────────────────────────────────────────────

describe("/context-analyze", () => {
  it("registers context-analyze command and analyze-context alias", () => {
    const registry = makeRegistry();
    expect(registry.has("context-analyze")).toBe(true);
    expect(registry.has("analyze-context")).toBe(true);
  });

  it("output contains 'Context Usage Analysis' title and model line", async () => {
    const registry = makeRegistry();
    const ctx = makeContext();
    await registry.dispatch("context-analyze", "", ctx);

    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;
    expect(msg).toContain("Context Usage Analysis");
    expect(msg).toContain("Model: claude-sonnet-4-20250514");
    // Model line should include context window info
    expect(msg).toContain("context)");
  });

  it("shows Used and Free token counts", async () => {
    const registry = makeRegistry();
    const ctx = makeContext();
    await registry.dispatch("context-analyze", "", ctx);

    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;
    expect(msg).toContain("Used:");
    expect(msg).toContain("tokens");
    expect(msg).toContain("% used)");
    expect(msg).toContain("Free:");
  });

  it("handles empty thread (no messages)", async () => {
    const registry = makeRegistry();
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          title: null,
          messages: [],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        deleteThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });

    await registry.dispatch("context-analyze", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;

    expect(msg).toContain("Context Usage Analysis");
    // With no messages, Used should show 0
    expect(msg).toContain("Used:  0 tokens (0.0% used)");
    expect(msg).toContain("Messages: 0");
  });

  it("handles single user message", async () => {
    const registry = makeRegistry();
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          title: null,
          messages: [{ role: "user", content: [{ type: "text", text: "hello world" }] }],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        deleteThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });

    await registry.dispatch("context-analyze", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;

    expect(msg).toContain("User messages");
    expect(msg).toContain("Messages: 1");
    // Should NOT contain assistant or tool result sections
    expect(msg).not.toContain("Assistant messages");
    expect(msg).not.toContain("Tool results");
  });

  it("breaks down mixed message types correctly", async () => {
    const registry = makeRegistry();
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          title: null,
          messages: [
            { role: "user", content: [{ type: "text", text: "What is 2+2?" }] },
            {
              role: "assistant",
              content: [
                { type: "text", text: "Let me calculate that." },
                { type: "tool_use", id: "t1", name: "calculator", input: { expr: "2+2" } },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: "t1",
                  content: "4",
                },
              ],
            },
            { role: "assistant", content: [{ type: "text", text: "The answer is 4." }] },
          ],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        deleteThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });

    await registry.dispatch("context-analyze", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;

    // Should have all three categories
    expect(msg).toContain("User messages");
    expect(msg).toContain("Assistant messages");
    expect(msg).toContain("Tool results");
    expect(msg).toContain("Messages: 4");
  });

  it("percentage calculation is correct for known token counts", async () => {
    // Create a thread with enough text to verify percentages are non-zero
    const longText = "a".repeat(4000); // ~1000 tokens for ASCII
    const registry = makeRegistry();
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          title: null,
          messages: [{ role: "user", content: [{ type: "text", text: longText }] }],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        deleteThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });

    await registry.dispatch("context-analyze", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;

    // Extract the "Used: X tokens (Y% used)" line
    const usedMatch = msg.match(/Used:\s+([\d,]+)\s+tokens\s+\(([\d.]+)%/);
    expect(usedMatch).not.toBeNull();
    const usedTokens = Number.parseInt(usedMatch![1]!.replace(/,/g, ""), 10);
    const usedPercent = Number.parseFloat(usedMatch![2]!);

    // Tokens should be positive
    expect(usedTokens).toBeGreaterThan(0);
    // Percentage should be positive but small relative to 968k context
    expect(usedPercent).toBeGreaterThan(0);
    expect(usedPercent).toBeLessThan(1); // ~1004 tokens out of 968,000
  });

  it("uses API token count when contextAnalyzer provides it", async () => {
    const registry = makeRegistry();
    const ctx = makeContext({
      contextAnalyzer: {
        modelId: "claude-sonnet-4-20250514",
        lastApiInputTokens: 50_000,
      },
    });

    await registry.dispatch("context-analyze", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;

    // Should use the API count (50,000) not approximate count
    expect(msg).toContain("50,000 tokens");
    // Should NOT show the approximation disclaimer
    expect(msg).not.toContain("approximate estimates");
  });

  it("shows warning when context is >90% full", async () => {
    const registry = makeRegistry();
    // claude-sonnet-4: contextWindow=1M, maxOutput=32k → maxContextTokens=968k
    // We need >90% of 968k ≈ 871,200 tokens via API count
    const ctx = makeContext({
      contextAnalyzer: {
        modelId: "claude-sonnet-4-20250514",
        lastApiInputTokens: 900_000,
      },
    });

    await registry.dispatch("context-analyze", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;

    expect(msg).toContain("WARNING: Context window is nearly full");
    expect(msg).toContain("/compact");
  });

  it("does NOT show warning when context usage is low", async () => {
    const registry = makeRegistry();
    const ctx = makeContext({
      contextAnalyzer: {
        modelId: "claude-sonnet-4-20250514",
        lastApiInputTokens: 1000,
      },
    });

    await registry.dispatch("context-analyze", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;

    expect(msg).not.toContain("WARNING");
  });

  it("falls back to default model when config has no model set", async () => {
    const registry = makeRegistry();
    const ctx = makeContext({
      configService: {
        get: () => ({ settings: {} }),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });

    await registry.dispatch("context-analyze", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;

    // Falls back to claude-sonnet-4-20250514
    expect(msg).toContain("Model: claude-sonnet-4-20250514");
  });

  it("handles null thread snapshot gracefully", async () => {
    const registry = makeRegistry();
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => null,
        setCachedThread: mock(() => {}),
        deleteThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });

    await registry.dispatch("context-analyze", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0]?.[0] as string;

    // Should still produce valid output with 0 tokens
    expect(msg).toContain("Context Usage Analysis");
    expect(msg).toContain("Used:  0 tokens (0.0% used)");
    expect(msg).toContain("Messages: 0");
  });
});
