/**
 * Tests for CLI-39 (clipboard), CLI-36 (agents-md), CLI-42 (mcp) commands.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js
 *   CLI-39: e0R:341-467  — copy-url, copy-id, copy-markdown
 *   CLI-36: e0R:1105-1139 — agents-md-generate, agents-md-list
 *   CLI-42: e0R:1321-1351 — mcp-reload, mcp-status
 */

import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { createBuiltinCommands } from "../slash-handlers.js";
import type { SlashCommandContext } from "../slash-registry.js";
import { SlashCommandRegistry } from "../slash-registry.js";

// ─── Helpers ──────────────────────────────────────────────

type Ctx = SlashCommandContext & { messages: string[]; submitted: string[] };

function makeCtx(overrides: Partial<SlashCommandContext> = {}): Ctx {
  const messages: string[] = [];
  const submitted: string[] = [];
  return {
    messages,
    submitted,
    threadId: "test-thread-id",
    threadStore: {
      getThreadSnapshot: () =>
        ({
          id: "test-thread-id",
          v: 1,
          title: "Test Thread",
          messages: [
            { role: "user", content: [{ type: "text", text: "hello world" }] },
            { role: "assistant", content: [{ type: "text", text: "hi there" }] },
          ],
          relationships: [],
          // biome-ignore lint/suspicious/noExplicitAny: test snapshot
        }) as any,
      setCachedThread: () => {},
      deleteThread: () => {},
    },
    threadWorker: {
      runInference: async () => {},
      cancelInference: () => {},
    },
    configService: {
      get: () => ({ settings: {} }),
    },
    showMessage: (msg) => messages.push(msg),
    clearInput: () => {},
    submitMessage: (text) => submitted.push(text),
    ...overrides,
  };
}

function makeRegistry(): SlashCommandRegistry {
  const registry = new SlashCommandRegistry();
  createBuiltinCommands(registry);
  return registry;
}

// ─── CLI-39: Clipboard Commands ───────────────────────────

describe("/copy-url", () => {
  it("is registered with alias copy-thread-url", () => {
    const registry = makeRegistry();
    assert.ok(registry.has("copy-url"), "/copy-url should be registered");
    assert.ok(registry.has("copy-thread-url"), "alias copy-thread-url should resolve");
  });

  it("writes thread URL to clipboard when writeClipboard is available", async () => {
    const registry = makeRegistry();
    const written: string[] = [];
    const ctx = makeCtx({
      appBaseUrl: "https://app.example.com/thread",
      writeClipboard: async (text) => {
        written.push(text);
        return true;
      },
    });

    await registry.dispatch("copy-url", "", ctx);

    assert.equal(written.length, 1);
    assert.ok(
      written[0]!.includes("test-thread-id"),
      `URL should include thread ID: ${written[0]}`,
    );
    assert.ok(
      written[0]!.startsWith("https://app.example.com/thread"),
      `URL should use appBaseUrl: ${written[0]}`,
    );
    assert.ok(
      ctx.messages[0]!.includes("Copied to clipboard"),
      `Expected confirmation: ${ctx.messages[0]}`,
    );
  });

  it("shows URL even when clipboard write fails", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      writeClipboard: async () => false,
    });

    await registry.dispatch("copy-url", "", ctx);

    assert.equal(ctx.messages.length, 1);
    assert.ok(ctx.messages[0]!.includes("test-thread-id"), "Message should contain thread ID");
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("could not copy"),
      `Expected failure message: ${ctx.messages[0]}`,
    );
  });

  it("shows message when writeClipboard is absent", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({ writeClipboard: undefined });

    await registry.dispatch("copy-url", "", ctx);

    assert.equal(ctx.messages.length, 1);
    assert.ok(ctx.messages[0]!.includes("test-thread-id"), "Should still show URL");
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("not available"),
      `Expected 'not available': ${ctx.messages[0]}`,
    );
  });
});

describe("/copy-id", () => {
  it("is registered with alias copy-thread-id", () => {
    const registry = makeRegistry();
    assert.ok(registry.has("copy-id"), "/copy-id should be registered");
    assert.ok(registry.has("copy-thread-id"), "alias copy-thread-id should resolve");
  });

  it("writes thread ID to clipboard", async () => {
    const registry = makeRegistry();
    const written: string[] = [];
    const ctx = makeCtx({
      writeClipboard: async (text) => {
        written.push(text);
        return true;
      },
    });

    await registry.dispatch("copy-id", "", ctx);

    assert.equal(written.length, 1);
    assert.equal(written[0], "test-thread-id", "Should write the exact thread ID");
    assert.ok(
      ctx.messages[0]!.includes("Copied to clipboard"),
      `Expected confirmation: ${ctx.messages[0]}`,
    );
  });

  it("shows ID even when clipboard fails", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({ writeClipboard: async () => false });

    await registry.dispatch("copy-id", "", ctx);

    assert.ok(ctx.messages[0]!.includes("test-thread-id"));
    assert.ok(ctx.messages[0]!.toLowerCase().includes("could not copy"));
  });

  it("shows ID when writeClipboard is absent", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({ writeClipboard: undefined });

    await registry.dispatch("copy-id", "", ctx);

    assert.ok(ctx.messages[0]!.includes("test-thread-id"));
    assert.ok(ctx.messages[0]!.toLowerCase().includes("not available"));
  });
});

describe("/copy-markdown", () => {
  it("is registered with alias copy-md", () => {
    const registry = makeRegistry();
    assert.ok(registry.has("copy-markdown"), "/copy-markdown should be registered");
    assert.ok(registry.has("copy-md"), "alias copy-md should resolve");
  });

  it("writes message content as markdown to clipboard", async () => {
    const registry = makeRegistry();
    const written: string[] = [];
    const ctx = makeCtx({
      writeClipboard: async (text) => {
        written.push(text);
        return true;
      },
    });

    await registry.dispatch("copy-markdown", "", ctx);

    assert.equal(written.length, 1);
    assert.ok(
      written[0]!.includes("hello world"),
      `Markdown should include user message: ${written[0]}`,
    );
    assert.ok(
      written[0]!.includes("hi there"),
      `Markdown should include assistant message: ${written[0]}`,
    );
    assert.ok(written[0]!.includes("**User**"), `Markdown should include role headers`);
    assert.ok(written[0]!.includes("**Assistant**"), `Markdown should include assistant header`);
  });

  it("includes thread title when present", async () => {
    const registry = makeRegistry();
    const written: string[] = [];
    const ctx = makeCtx({
      writeClipboard: async (text) => {
        written.push(text);
        return true;
      },
    });

    await registry.dispatch("copy-markdown", "", ctx);

    assert.ok(
      written[0]!.includes("# Test Thread"),
      `Should include thread title as H1: ${written[0]}`,
    );
  });

  it("shows character count in confirmation", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      writeClipboard: async () => true,
    });

    await registry.dispatch("copy-markdown", "", ctx);

    assert.ok(
      ctx.messages[0]!.includes("chars"),
      `Confirmation should show character count: ${ctx.messages[0]}`,
    );
  });

  it("shows error for empty thread", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      threadStore: {
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        getThreadSnapshot: () => ({ id: "t", v: 1, messages: [], relationships: [] }) as any,
        setCachedThread: () => {},
        deleteThread: () => {},
      },
    });

    await registry.dispatch("copy-markdown", "", ctx);

    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("empty"),
      `Expected empty thread error: ${ctx.messages[0]}`,
    );
  });

  it("gracefully handles missing writeClipboard", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({ writeClipboard: undefined });

    await registry.dispatch("copy-markdown", "", ctx);

    assert.ok(ctx.messages.length > 0, "Should show a message");
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("not available"),
      `Expected 'not available': ${ctx.messages[0]}`,
    );
  });
});

// ─── CLI-36: AGENTS.md Commands ───────────────────────────

describe("/agents-md-generate", () => {
  it("is registered with alias generate-agents-md", () => {
    const registry = makeRegistry();
    assert.ok(registry.has("agents-md-generate"), "/agents-md-generate should be registered");
    assert.ok(registry.has("generate-agents-md"), "alias generate-agents-md should resolve");
  });

  it("submits the AGENTS.md generation prompt via submitMessage", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx();

    await registry.dispatch("agents-md-generate", "", ctx);

    assert.equal(ctx.submitted.length, 1, "Should submit exactly one message");
    assert.ok(
      ctx.submitted[0]!.includes("AGENTS.md"),
      `Prompt should mention AGENTS.md: ${ctx.submitted[0]!.slice(0, 80)}`,
    );
    assert.ok(
      ctx.submitted[0]!.includes("analyze this codebase"),
      `Prompt should ask to analyze codebase: ${ctx.submitted[0]!.slice(0, 80)}`,
    );
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("generating"),
      `Expected generating confirmation: ${ctx.messages[0]}`,
    );
  });

  it("shows error when submitMessage is not available", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({ submitMessage: undefined });

    await registry.dispatch("agents-md-generate", "", ctx);

    assert.equal(ctx.submitted.length, 0, "Should not submit without submitMessage");
    assert.ok(ctx.messages.length > 0, "Should show an error message");
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("not available") ||
        ctx.messages[0]!.toLowerCase().includes("requires"),
      `Expected unavailability message: ${ctx.messages[0]}`,
    );
  });
});

describe("/agents-md-list", () => {
  it("is registered with aliases list-agents-md and agent-files", () => {
    const registry = makeRegistry();
    assert.ok(registry.has("agents-md-list"), "/agents-md-list should be registered");
    assert.ok(registry.has("list-agents-md"), "alias list-agents-md should resolve");
    assert.ok(registry.has("agent-files"), "alias agent-files should resolve");
  });

  it("finds AGENTS.md files in a temp directory", async () => {
    const registry = makeRegistry();

    // Create temp dir with AGENTS.md file
    const tmpDir = path.join(os.tmpdir(), `flitter-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const agentFile = path.join(tmpDir, "AGENTS.md");
    writeFileSync(agentFile, "# Test AGENTS.md");

    const originalCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const ctx = makeCtx();
      await registry.dispatch("agents-md-list", "", ctx);

      assert.ok(ctx.messages.length > 0, "Should show a message");
      assert.ok(
        ctx.messages[0]!.includes("AGENTS.md"),
        `Should list the AGENTS.md file: ${ctx.messages[0]}`,
      );
      assert.ok(
        ctx.messages[0]!.includes("Agent File"),
        `Should use 'Agent File' label: ${ctx.messages[0]}`,
      );
    } finally {
      process.chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("shows 'not found' message when no AGENTS.md exists", async () => {
    const registry = makeRegistry();

    // Create empty temp dir
    const tmpDir = path.join(os.tmpdir(), `flitter-test-empty-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    const originalCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const ctx = makeCtx();
      await registry.dispatch("agents-md-list", "", ctx);

      assert.ok(ctx.messages.length > 0, "Should show a message");
      assert.ok(
        ctx.messages[0]!.toLowerCase().includes("no") &&
          ctx.messages[0]!.toLowerCase().includes("agents.md"),
        `Should indicate no files found: ${ctx.messages[0]}`,
      );
    } finally {
      process.chdir(originalCwd);
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─── CLI-42: MCP Commands ─────────────────────────────────

describe("/mcp-reload", () => {
  it("is registered with alias mcp-restart", () => {
    const registry = makeRegistry();
    assert.ok(registry.has("mcp-reload"), "/mcp-reload should be registered");
    assert.ok(registry.has("mcp-restart"), "alias mcp-restart should resolve");
  });

  it("calls restartServers on mcpServerManager", async () => {
    const registry = makeRegistry();
    let restartCalled = false;
    const ctx = makeCtx({
      mcpServerManager: {
        restartServers: () => {
          restartCalled = true;
        },
        getServers: () => [],
      },
    });

    await registry.dispatch("mcp-reload", "", ctx);

    assert.ok(restartCalled, "restartServers should be called");
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("reloading"),
      `Expected 'Reloading' message: ${ctx.messages[0]}`,
    );
  });

  it("shows error when mcpServerManager is not available", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({ mcpServerManager: undefined });

    await registry.dispatch("mcp-reload", "", ctx);

    assert.ok(ctx.messages.length > 0, "Should show a message");
    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("not available"),
      `Expected 'not available': ${ctx.messages[0]}`,
    );
  });
});

describe("/mcp-status", () => {
  it("is registered", () => {
    const registry = makeRegistry();
    assert.ok(registry.has("mcp-status"), "/mcp-status should be registered");
  });

  it("shows server status list", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      mcpServerManager: {
        restartServers: () => {},
        getServers: () => [
          { name: "filesystem", status: "connected", toolCount: 5 },
          { name: "fetch", status: "disconnected" },
          { name: "github", status: "error", error: "auth failed" },
        ],
      },
    });

    await registry.dispatch("mcp-status", "", ctx);

    assert.ok(ctx.messages.length > 0, "Should show a message");
    assert.ok(
      ctx.messages[0]!.includes("filesystem"),
      `Should list server 'filesystem': ${ctx.messages[0]}`,
    );
    assert.ok(ctx.messages[0]!.includes("fetch"), `Should list server 'fetch': ${ctx.messages[0]}`);
    assert.ok(
      ctx.messages[0]!.includes("github"),
      `Should list server 'github': ${ctx.messages[0]}`,
    );
    assert.ok(ctx.messages[0]!.includes("1/3"), `Should show connected count: ${ctx.messages[0]}`);
  });

  it("shows error count for servers with issues", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      mcpServerManager: {
        restartServers: () => {},
        getServers: () => [{ name: "bad-server", status: "error", error: "connection refused" }],
      },
    });

    await registry.dispatch("mcp-status", "", ctx);

    assert.ok(
      ctx.messages[0]!.includes("connection refused"),
      `Should show error detail: ${ctx.messages[0]}`,
    );
  });

  it("shows 'no servers' when list is empty", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({
      mcpServerManager: {
        restartServers: () => {},
        getServers: () => [],
      },
    });

    await registry.dispatch("mcp-status", "", ctx);

    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("no mcp") ||
        ctx.messages[0]!.toLowerCase().includes("no server"),
      `Expected 'no servers' message: ${ctx.messages[0]}`,
    );
  });

  it("shows error when mcpServerManager is absent", async () => {
    const registry = makeRegistry();
    const ctx = makeCtx({ mcpServerManager: undefined });

    await registry.dispatch("mcp-status", "", ctx);

    assert.ok(
      ctx.messages[0]!.toLowerCase().includes("not available"),
      `Expected 'not available': ${ctx.messages[0]}`,
    );
  });
});
