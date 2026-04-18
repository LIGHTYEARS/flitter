import { describe, expect, it, mock } from "bun:test";
import { parseCommandInput } from "../../widgets/command-detection";
import { createBuiltinCommands } from "../slash-handlers";
import type { SlashCommandContext } from "../slash-registry";
import { SlashCommandRegistry } from "../slash-registry";

function makeContext(overrides?: Partial<SlashCommandContext>): SlashCommandContext {
  return {
    threadId: "test-thread",
    threadStore: {
      getThreadSnapshot: () => ({
        id: "test-thread",
        v: 1,
        title: null,
        messages: [],
        relationships: [],
      }),
      setCachedThread: mock(() => {}),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any,
    threadWorker: {
      runInference: mock(async () => {}),
      cancelInference: mock(() => {}),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any,
    configService: {
      get: () => ({ settings: { "internal.model": "claude-sonnet-4-20250514" } }),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any,
    showMessage: mock(() => {}),
    clearInput: mock(() => {}),
    ...overrides,
  };
}

describe("slash command routing integration", () => {
  it("routes /help to handler instead of LLM", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();

    // Simulate onSubmit logic
    const text = "/help";
    const parsed = parseCommandInput(text);
    expect(parsed).not.toBeNull();

    if (parsed) {
      const handled = await registry.dispatch(parsed.command, parsed.args, ctx);
      expect(handled).toBe(true);
    }

    // LLM should NOT have been called
    expect(ctx.threadWorker.runInference).not.toHaveBeenCalled();
  });

  it("passes non-command input through to LLM path", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);

    const text = "What is TypeScript?";
    const parsed = parseCommandInput(text);
    expect(parsed).toBeNull();
    // Caller would proceed to LLM path
  });

  it("routes /status with correct context", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();

    const parsed = parseCommandInput("/status");
    if (parsed) {
      await registry.dispatch(parsed.command, parsed.args, ctx);
    }

    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("test-thread");
  });
});
