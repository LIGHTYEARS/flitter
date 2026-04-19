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

  // ── Part C: Command Palette Expansion ──────────────────

  it("registers 25 slash commands (expanded command palette)", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const commands = registry.listCommands();
    // Original 6 + 19 new = 25
    expect(commands.length).toBeGreaterThanOrEqual(25);
  });

  it("registers thread commands: /new, /switch, /dashboard, /delete, /archive", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("new")).toBe(true);
    expect(registry.has("switch")).toBe(true);
    expect(registry.has("dashboard")).toBe(true);
    expect(registry.has("delete")).toBe(true);
    expect(registry.has("archive")).toBe(true);
  });

  it("registers mode command: /mode", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("mode")).toBe(true);
  });

  it("registers settings commands: /settings, /theme", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("settings")).toBe(true);
    expect(registry.has("theme")).toBe(true);
  });

  it("registers MCP command: /mcp", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("mcp")).toBe(true);
  });

  it("registers task command: /tasks", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("tasks")).toBe(true);
  });

  it("registers screen command: /quit", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("quit")).toBe(true);
  });

  it("registers additional commands: /rename, /label, /editor, /history, /permissions, /plugins, /refresh", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("rename")).toBe(true);
    expect(registry.has("label")).toBe(true);
    expect(registry.has("editor")).toBe(true);
    expect(registry.has("history")).toBe(true);
    expect(registry.has("permissions")).toBe(true);
    expect(registry.has("plugins")).toBe(true);
    expect(registry.has("refresh")).toBe(true);
  });

  it("supports aliases: /start -> /new, /exit -> /quit, /continue -> /switch", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("start")).toBe(true);
    expect(registry.has("exit")).toBe(true);
    expect(registry.has("continue")).toBe(true);
    expect(registry.has("q")).toBe(true);
    expect(registry.has("dash")).toBe(true);
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

  // ── New command execution tests ────────────────────────

  it("/mode shows current mode when no args", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("mode", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Current mode:");
    expect(message).toContain("smart");
  });

  it("/mode <name> requests mode switch", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("mode", "deep", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("deep");
  });

  it("/mode with invalid mode shows error", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("mode", "invalid", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Unknown mode");
  });

  it("/quit shows exit message", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("quit", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Exiting");
  });

  it("/rename requires title argument", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("rename", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Usage:");
  });

  it("/rename with long title shows error", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    const longTitle = "a".repeat(257);
    await registry.dispatch("rename", longTitle, ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("256 characters");
  });

  it("/label validates label format", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("label", "INVALID_LABEL!", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("alphanumeric");
  });

  it("/label with valid label requests add", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("label", "my-label", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("my-label");
  });

  it("/mcp reload shows message", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("mcp", "reload", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("reload");
  });

  it("/theme shows current theme when no args", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("theme", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Current theme:");
  });

  it("/exit dispatches via /quit alias", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    const dispatched = await registry.dispatch("exit", "", ctx);
    expect(dispatched).toBe(true);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Exiting");
  });
});
