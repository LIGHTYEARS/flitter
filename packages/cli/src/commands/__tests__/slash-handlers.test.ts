import { describe, expect, it, mock } from "bun:test";
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
        messages: [
          { role: "user", content: [{ type: "text", text: "hello" }] },
          { role: "assistant", content: [{ type: "text", text: "hi" }] },
        ],
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

describe("createBuiltinCommands", () => {
  it("registers 6 built-in commands", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const commands = registry.listCommands();
    expect(commands.length).toBeGreaterThanOrEqual(6);
    expect(registry.has("help")).toBe(true);
    expect(registry.has("clear")).toBe(true);
    expect(registry.has("compact")).toBe(true);
    expect(registry.has("cost")).toBe(true);
    expect(registry.has("model")).toBe(true);
    expect(registry.has("status")).toBe(true);
  });

  it("/help calls showMessage with command list", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("help", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("/help");
    expect(message).toContain("/clear");
  });

  it("/clear resets thread messages to empty", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("clear", "", ctx);
    expect(ctx.threadStore.setCachedThread).toHaveBeenCalledTimes(1);
    const snapshot = (ctx.threadStore.setCachedThread as ReturnType<typeof mock>).mock.calls[0][0];
    expect(snapshot.messages).toEqual([]);
  });

  it("/model shows current model name", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("model", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("claude-sonnet-4-20250514");
  });

  it("/status shows thread info", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("status", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("test-thread");
    expect(message).toContain("2 messages");
  });
});
