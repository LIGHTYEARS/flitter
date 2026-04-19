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
      observeThreadEntries: () => ({
        getValue: () => [
          { id: "thread-1", title: "Thread 1", userLastInteractedAt: 1700000000000 },
          { id: "thread-2", title: "Thread 2", userLastInteractedAt: 1700000001000 },
        ],
      }),
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
      updateSettings: mock(() => {}),
      // biome-ignore lint/suspicious/noExplicitAny: test mock
    } as any,
    showMessage: mock(() => {}),
    clearInput: mock(() => {}),
    ...overrides,
  };
}

describe("createBuiltinCommands", () => {
  it("registers all expected commands", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const commands = registry.listCommands();
    // Should have the original 6 + many new ones
    expect(commands.length).toBeGreaterThanOrEqual(30);

    // Original 6
    expect(registry.has("help")).toBe(true);
    expect(registry.has("clear")).toBe(true);
    expect(registry.has("compact")).toBe(true);
    expect(registry.has("cost")).toBe(true);
    expect(registry.has("model")).toBe(true);
    expect(registry.has("status")).toBe(true);

    // Upgraded commands
    expect(registry.has("new")).toBe(true);
    expect(registry.has("switch")).toBe(true);
    expect(registry.has("quit")).toBe(true);
    expect(registry.has("delete")).toBe(true);
    expect(registry.has("archive")).toBe(true);
    expect(registry.has("settings")).toBe(true);
    expect(registry.has("mcp")).toBe(true);
    expect(registry.has("tasks")).toBe(true);
    expect(registry.has("refresh")).toBe(true);
    expect(registry.has("editor")).toBe(true);
    expect(registry.has("history")).toBe(true);
    expect(registry.has("permissions")).toBe(true);
    expect(registry.has("mode")).toBe(true);

    // New commands
    expect(registry.has("handoff")).toBe(true);
    expect(registry.has("back")).toBe(true);
    expect(registry.has("forward")).toBe(true);
    expect(registry.has("queue")).toBe(true);
    expect(registry.has("dequeue")).toBe(true);
    expect(registry.has("copy-url")).toBe(true);
    expect(registry.has("copy-id")).toBe(true);
    expect(registry.has("remove-label")).toBe(true);
    expect(registry.has("toggle-thinking-blocks")).toBe(true);
    expect(registry.has("dashboard")).toBe(true);
  });

  // ── Original commands ─────────────────────────────────

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

  // ── Upgraded commands ─────────────────────────────────

  it("/new creates a new thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("new", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("New thread created");
    // Should have set a new thread in the store
    expect(ctx.threadStore.setCachedThread).toHaveBeenCalled();
  });

  it("/new does nothing for empty thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 0,
          title: null,
          messages: [],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });
    await registry.dispatch("new", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("already empty");
  });

  it("/switch shows usage when no args", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("switch", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Usage");
  });

  it("/switch reports not found for unknown thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: (id: string) => (id === "test-thread" ? { id: "test-thread", v: 1, messages: [], relationships: [] } : null),
        setCachedThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });
    await registry.dispatch("switch", "unknown-id", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("not found");
  });

  it("/delete deletes the current thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const deleteFn = mock(() => {});
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        deleteThread: deleteFn,
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });
    await registry.dispatch("delete", "", ctx);
    expect(deleteFn).toHaveBeenCalledWith("test-thread");
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("deleted");
  });

  it("/archive sets archived flag on thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("archive", "", ctx);
    expect(ctx.threadStore.setCachedThread).toHaveBeenCalled();
    const snapshot = (ctx.threadStore.setCachedThread as ReturnType<typeof mock>).mock.calls[0][0];
    expect(snapshot.archived).toBe(true);
  });

  it("/archive rejects empty thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 0,
          messages: [],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });
    await registry.dispatch("archive", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Cannot archive an empty thread");
  });

  it("/settings lists current config", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("settings", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("internal.model");
  });

  it("/mcp lists configured servers", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      configService: {
        get: () => ({
          settings: {
            "mcp.servers": { "my-server": { command: "node", args: ["server.js"] } },
          },
        }),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });
    await registry.dispatch("mcp", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("my-server");
    expect(msg).toContain("stdio");
  });

  it("/mcp shows empty when no servers configured", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("mcp", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("No MCP servers configured");
  });

  it("/tasks shows not available when no subAgentManager", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("tasks", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("not available");
  });

  it("/refresh shows refreshed message", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("refresh", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("refreshed");
  });

  it("/history lists recent threads", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("history", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Thread 1");
    expect(msg).toContain("Thread 2");
  });

  it("/permissions shows defaults when no custom rules", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("permissions", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("No custom permission rules");
  });

  it("/mode shows current mode when no args", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("mode", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Current mode");
  });

  it("/mode sets mode with valid name", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("mode", "smart", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Mode set to: smart");
  });

  it("/mode rejects invalid mode", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("mode", "invalid-mode", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Unknown mode");
  });

  it("/rename updates thread title", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("rename", "New Title", ctx);
    expect(ctx.threadStore.setCachedThread).toHaveBeenCalled();
    const snapshot = (ctx.threadStore.setCachedThread as ReturnType<typeof mock>).mock.calls[0][0];
    expect(snapshot.title).toBe("New Title");
  });

  it("/rename rejects long title", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("rename", "a".repeat(300), ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("cannot exceed 256");
  });

  it("/label adds label to thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("label", "bug", ctx);
    expect(ctx.threadStore.setCachedThread).toHaveBeenCalled();
    const snapshot = (ctx.threadStore.setCachedThread as ReturnType<typeof mock>).mock.calls[0][0];
    expect(snapshot.labels).toContain("bug");
  });

  it("/label rejects invalid format", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("label", "Invalid Label!", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("alphanumeric");
  });

  it("/remove-label removes existing label", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          labels: ["bug", "urgent"],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });
    await registry.dispatch("remove-label", "bug", ctx);
    expect(ctx.threadStore.setCachedThread).toHaveBeenCalled();
    const snapshot = (ctx.threadStore.setCachedThread as ReturnType<typeof mock>).mock.calls[0][0];
    expect(snapshot.labels).toEqual(["urgent"]);
  });

  it("/remove-label reports missing label", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("remove-label", "nonexistent", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("does not have label");
  });

  it("/toggle-thinking-blocks toggles state", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("toggle-thinking-blocks", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toMatch(/Thinking blocks: (visible|hidden)/);
  });

  it("/dashboard shows thread list", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("dashboard", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Threads");
    expect(msg).toContain("Thread 1");
  });

  // ── New commands ──────────────────────────────────────

  it("/handoff shows usage when no args", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("handoff", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Usage");
  });

  it("/handoff reports not available when executeHandoff missing", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("handoff", "fix the bug", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("not available");
  });

  it("/back reports not available when threadNavigator missing", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("back", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("not available");
  });

  it("/forward reports not available when threadNavigator missing", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("forward", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("not available");
  });

  it("/queue shows usage when no args", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("queue", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Usage");
  });

  it("/queue reports not available when enqueueMessage missing", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("queue", "test message", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("not available");
  });

  it("/dequeue reports not available when dequeueMessage missing", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("dequeue", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("not available");
  });

  it("/copy-url rejects empty thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 0,
          messages: [],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });
    await registry.dispatch("copy-url", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Cannot copy URL from an empty thread");
  });

  it("/copy-id rejects empty thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 0,
          messages: [],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });
    await registry.dispatch("copy-id", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Cannot copy ID from an empty thread");
  });

  // ── Alias resolution ──────────────────────────────────

  it("aliases resolve correctly", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);

    // /? → /help
    expect(registry.has("?")).toBe(true);
    // /h → /help
    expect(registry.has("h")).toBe(true);
    // /start → /new
    expect(registry.has("start")).toBe(true);
    // /exit → /quit
    expect(registry.has("exit")).toBe(true);
    // /q → /quit
    expect(registry.has("q")).toBe(true);
    // /continue → /switch
    expect(registry.has("continue")).toBe(true);
    // /previous → /back
    expect(registry.has("previous")).toBe(true);
    // /next → /forward
    expect(registry.has("next")).toBe(true);
    // /thinking → /toggle-thinking-blocks
    expect(registry.has("thinking")).toBe(true);
    // /url → /copy-url
    expect(registry.has("url")).toBe(true);
  });

  it("/cost shows usage data from thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          messages: [
            { role: "user", content: [{ type: "text", text: "hi" }] },
            {
              role: "assistant",
              content: [{ type: "text", text: "hello" }],
              usage: { inputTokens: 100, outputTokens: 50 },
            },
          ],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        // biome-ignore lint/suspicious/noExplicitAny: test mock
      } as any,
    });
    await registry.dispatch("cost", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("100");
    expect(msg).toContain("50");
    expect(msg).toContain("150");
  });

  it("/compact shows message (no contextManager)", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("compact", "", ctx);
    const msg = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(msg).toContain("Compaction requested");
  });
});
