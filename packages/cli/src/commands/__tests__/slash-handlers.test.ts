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
    // Original 6 + 25 new = 31
    expect(commands.length).toBeGreaterThanOrEqual(31);
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

  // ── Gap #31: /handoff, /queue, /dequeue ────────────────

  it("registers /handoff, /queue, /dequeue, /toggle-thinking-blocks", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("handoff")).toBe(true);
    expect(registry.has("queue")).toBe(true);
    expect(registry.has("dequeue")).toBe(true);
    expect(registry.has("toggle-thinking-blocks")).toBe(true);
    // alias
    expect(registry.has("thinking")).toBe(true);
  });

  it("/handoff with empty thread shows error", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
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
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("handoff", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Cannot handoff from an empty thread");
  });

  it("/handoff with message shows handoff request", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("handoff", "summarize this thread", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Handoff requested");
    expect(message).toContain("summarize this thread");
  });

  it("/handoff without args shows usage info", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("handoff", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Handoff mode requested");
    expect(message).toContain("Usage:");
  });

  it("/queue without args shows usage", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("queue", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Usage:");
  });

  it("/queue enqueues message when enqueueMessage is available", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const enqueueMock = mock(() => {});
    const ctx = makeContext({
      threadWorker: {
        runInference: mock(async () => {}),
        cancelInference: mock(() => {}),
        enqueueMessage: enqueueMock,
      } as Partial<SlashCommandContext["threadWorker"]> as SlashCommandContext["threadWorker"],
    });
    await registry.dispatch("queue", "do this next", ctx);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const arg = enqueueMock.mock.calls[0][0] as {
      role: string;
      content: Array<{ type: string; text: string }>;
    };
    expect(arg.role).toBe("user");
    expect(arg.content[0].text).toBe("do this next");
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Queued message");
  });

  it("/queue shows not available when enqueueMessage missing", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext(); // default has no enqueueMessage
    await registry.dispatch("queue", "something", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("not available");
  });

  it("/dequeue dequeues when messages exist", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const dequeueMock = mock(() => {});
    const ctx = makeContext({
      threadWorker: {
        runInference: mock(async () => {}),
        cancelInference: mock(() => {}),
        dequeueMessage: dequeueMock,
        messageQueueLength: 2,
      } as Partial<SlashCommandContext["threadWorker"]> as SlashCommandContext["threadWorker"],
    });
    await registry.dispatch("dequeue", "", ctx);
    expect(dequeueMock).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Dequeued 1 message");
    expect(message).toContain("1 remaining");
  });

  it("/dequeue shows empty queue message when no messages", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadWorker: {
        runInference: mock(async () => {}),
        cancelInference: mock(() => {}),
        dequeueMessage: mock(() => {}),
        messageQueueLength: 0,
      } as Partial<SlashCommandContext["threadWorker"]> as SlashCommandContext["threadWorker"],
    });
    await registry.dispatch("dequeue", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("No messages in the queue");
  });

  it("/dequeue shows not available when dequeueMessage missing", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext(); // default has no dequeueMessage
    await registry.dispatch("dequeue", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("not available");
  });

  // ── Gap #35: /toggle-thinking-blocks ──────────────────

  it("/toggle-thinking-blocks on empty thread shows error", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
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
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("toggle-thinking-blocks", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Cannot toggle thinking blocks on an empty thread");
  });

  it("/toggle-thinking-blocks calls toggleThinkingBlocks callback", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const toggleMock = mock(() => {});
    const ctx = makeContext({
      showThinkingBlocks: true,
      toggleThinkingBlocks: toggleMock,
    });
    await registry.dispatch("toggle-thinking-blocks", "", ctx);
    expect(toggleMock).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Thinking blocks");
  });

  it("/toggle-thinking-blocks without toggle callback shows not available", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext(); // no toggleThinkingBlocks
    await registry.dispatch("toggle-thinking-blocks", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("not available");
  });

  it("/thinking alias dispatches to toggle-thinking-blocks", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const toggleMock = mock(() => {});
    const ctx = makeContext({
      showThinkingBlocks: false,
      toggleThinkingBlocks: toggleMock,
    });
    const dispatched = await registry.dispatch("thinking", "", ctx);
    expect(dispatched).toBe(true);
    expect(toggleMock).toHaveBeenCalledTimes(1);
  });

  // ── Gap CLI-25: /delete actually deletes ──────────────

  it("/delete calls deleteThread on threadStore", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const deleteMock = mock(() => {});
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          title: null,
          messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        deleteThread: deleteMock,
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("delete", "", ctx);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith("test-thread");
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("deleted");
  });

  it("/delete shows error when snapshot not found", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => null,
        setCachedThread: mock(() => {}),
        deleteThread: mock(() => {}),
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("delete", "", ctx);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Error");
  });

  // ── Iteration 18: /history, /editor, /new ──────────────

  it("/history shows thread message summary", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("history", "", ctx);
    expect(ctx.showMessage).toHaveBeenCalledTimes(1);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Thread history (2 messages)");
    expect(message).toContain("USER");
    expect(message).toContain("ASSISTANT");
    expect(message).toContain("hello");
  });

  it("/history on empty thread shows no messages", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
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
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("history", "", ctx);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("No messages");
  });

  it("/history shows tool_use blocks with tool name", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          title: null,
          messages: [
            {
              role: "assistant",
              content: [{ type: "tool_use", name: "bash", input: { command: "ls" } }],
            },
          ],
          relationships: [],
        }),
        setCachedThread: mock(() => {}),
        deleteThread: mock(() => {}),
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("history", "", ctx);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("[tool: bash]");
  });

  it("/new creates a new thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const setCachedMock = mock(() => {});
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => null,
        setCachedThread: setCachedMock,
        deleteThread: mock(() => {}),
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("new", "", ctx);
    expect(setCachedMock).toHaveBeenCalledTimes(1);
    const snapshot = setCachedMock.mock.calls[0][0] as { id: string; messages: unknown[] };
    expect(snapshot.id).toBeTruthy();
    expect(snapshot.messages).toEqual([]);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("New thread created:");
    expect(message).toContain(snapshot.id);
  });

  it("/editor dispatches and shows message when editor exits immediately", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    // Set FLITTER_EDITOR to 'true' which exits immediately with empty file
    const origEditor = process.env.FLITTER_EDITOR;
    process.env.FLITTER_EDITOR = "true";
    try {
      const dispatched = await registry.dispatch("editor", "", ctx);
      expect(dispatched).toBe(true);
      // showMessage should have been called (empty content message)
      expect(ctx.showMessage).toHaveBeenCalled();
      const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
      expect(message).toContain("empty content");
    } finally {
      if (origEditor) {
        process.env.FLITTER_EDITOR = origEditor;
      } else {
        delete process.env.FLITTER_EDITOR;
      }
    }
  });

  // ── Iteration 26: /remove-label ──────────────────────────

  it("registers /remove-label command", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("remove-label")).toBe(true);
    expect(registry.has("unlabel")).toBe(true); // alias
  });

  it("registers /toolbox command", () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    expect(registry.has("toolbox")).toBe(true);
    expect(registry.has("toolbox-list")).toBe(true); // alias
  });

  it("/remove-label without args shows usage", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext();
    await registry.dispatch("remove-label", "", ctx);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Usage:");
  });

  it("/remove-label on thread with no labels shows empty message", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          title: null,
          messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
          relationships: [],
          labels: [],
        }),
        setCachedThread: mock(() => {}),
        deleteThread: mock(() => {}),
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("remove-label", "foo", ctx);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("no labels to remove");
  });

  it("/remove-label with non-existent label shows not found", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          title: null,
          messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
          relationships: [],
          labels: ["bug", "feature"],
        }),
        setCachedThread: mock(() => {}),
        deleteThread: mock(() => {}),
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("remove-label", "nonexistent", ctx);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("not found");
    expect(message).toContain("bug, feature");
  });

  it("/remove-label removes existing label and updates thread", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const setCachedMock = mock(() => {});
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          title: null,
          messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
          relationships: [],
          labels: ["bug", "feature", "urgent"],
        }),
        setCachedThread: setCachedMock,
        deleteThread: mock(() => {}),
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("remove-label", "feature", ctx);
    expect(setCachedMock).toHaveBeenCalledTimes(1);
    const snapshot = setCachedMock.mock.calls[0][0] as { labels: string[] };
    expect(snapshot.labels).toEqual(["bug", "urgent"]);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain('Removed label "feature"');
    expect(message).toContain("bug, urgent");
  });

  it("/remove-label removing last label shows no-labels message", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const setCachedMock = mock(() => {});
    const ctx = makeContext({
      threadStore: {
        getThreadSnapshot: () => ({
          id: "test-thread",
          v: 1,
          title: null,
          messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
          relationships: [],
          labels: ["only-one"],
        }),
        setCachedThread: setCachedMock,
        deleteThread: mock(() => {}),
      } as Partial<SlashCommandContext["threadStore"]> as SlashCommandContext["threadStore"],
    });
    await registry.dispatch("remove-label", "only-one", ctx);
    expect(setCachedMock).toHaveBeenCalledTimes(1);
    const snapshot = setCachedMock.mock.calls[0][0] as { labels: string[] };
    expect(snapshot.labels).toEqual([]);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Thread has no labels");
  });

  // ── Iteration 26: /toolbox ──────────────────────────

  it("/toolbox without toolboxService shows not available", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext(); // no toolboxService
    await registry.dispatch("toolbox", "", ctx);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("not available");
  });

  it("/toolbox with no tools shows help message", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      toolboxService: {
        getTools: () => [],
        getStatus: () => ({ type: "ready" }),
      },
    });
    await registry.dispatch("toolbox", "", ctx);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("No toolbox scripts found");
    expect(message).toContain("tools make");
  });

  it("/toolbox shows initializing when status is initializing", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      toolboxService: {
        getTools: () => [],
        getStatus: () => ({ type: "initializing" }),
      },
    });
    await registry.dispatch("toolbox", "", ctx);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("initializing");
  });

  it("/toolbox lists discovered tools with status icons", async () => {
    const registry = new SlashCommandRegistry();
    createBuiltinCommands(registry);
    const ctx = makeContext({
      toolboxService: {
        getTools: () => [
          { name: "my-tool", description: "Does stuff", status: "ready" },
          { name: "broken-tool", description: "Fails", status: "error", error: "parse error" },
        ],
        getStatus: () => ({ type: "ready", toolCount: 2 }),
      },
    });
    await registry.dispatch("toolbox", "", ctx);
    const message = (ctx.showMessage as ReturnType<typeof mock>).mock.calls[0][0] as string;
    expect(message).toContain("Toolbox scripts (2)");
    expect(message).toContain("[+] my-tool");
    expect(message).toContain("[!] broken-tool");
    expect(message).toContain("(parse error)");
  });
});
