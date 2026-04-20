# Slash Command Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `parseCommandInput` (already exists) into the TUI's `onSubmit` path so that `/help`, `/clear`, `/compact`, `/cost`, `/model`, `/status` are intercepted, routed to handlers, and never sent to the LLM.

**Architecture:** Amp uses a `CommandRegistry` class (`e0R` in `2785_unknown_e0R.js`) with a `commands: Map<string, Command>` and `register()` / `execute()` methods. Each command has `id`, `noun`, `verb`, `description`, `execute(context)`, optional `aliases`, `isShown`, and `customFlow`. The registry is constructed once and commands are registered in `registerCommands()`. The TUI intercepts user input before sending to the agent: if it starts with `/`, it parses the command and calls `registry.execute(commandId, context)`.

Flitter already has `parseCommandInput()` in `packages/cli/src/widgets/command-detection.ts` that returns `{ command, args }` for `/foo bar` input. The gap is: (1) no registry to dispatch to, (2) no handlers, (3) `onSubmit` in `interactive.ts` sends everything to the LLM unconditionally.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/cli` (widgets, interactive mode)

**Amp reference:** `amp-cli-reversed/modules/2785_unknown_e0R.js` (e0R CommandRegistry class, ~1560 lines), `amp-cli-reversed/modules/2785_unknown_e0R.js:192-1560` (registerCommands with all built-in commands).

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/cli/src/commands/slash-registry.ts` | SlashCommandRegistry with register/dispatch |
| Create | `packages/cli/src/commands/slash-handlers.ts` | Handler implementations for /help /clear /compact /cost /model /status |
| Modify | `packages/cli/src/modes/interactive.ts` | Intercept onSubmit with slash command detection |
| Modify | `packages/cli/src/widgets/command-detection.ts` | Re-export from commands/ (already exists, may stay as-is) |
| Create | `packages/cli/src/commands/__tests__/slash-registry.test.ts` | Unit tests for registry |
| Create | `packages/cli/src/commands/__tests__/slash-handlers.test.ts` | Unit tests for handlers |
| Create | `packages/cli/src/commands/__tests__/slash-routing.test.ts` | Integration test: input -> parse -> dispatch -> effect |

---

### Task 1: Create SlashCommandRegistry with register/dispatch

**Why first:** The registry is the core dispatch mechanism. Handlers and wiring depend on it.

**Files:**
- Create: `packages/cli/src/commands/slash-registry.ts`
- Create: `packages/cli/src/commands/__tests__/slash-registry.test.ts`

**Amp reference:** `amp-cli-reversed/modules/2785_unknown_e0R.js:7-86` -- `e0R` class has `commands = new Map()`, `register(command)`, `execute(commandId, context, args, abortController)`. Amp's execute does telemetry submission, creates an execution ID, calls `onExecute` callback, then `command.execute(context, abortController, args)`, then `onExecutionComplete`. Flitter simplifies: no telemetry, no abort controller, synchronous onExecute/onComplete.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/commands/__tests__/slash-registry.test.ts
import { describe, expect, it, mock } from "bun:test";
import { SlashCommandRegistry } from "../slash-registry";
import type { SlashCommand, SlashCommandContext } from "../slash-registry";

function makeContext(overrides?: Partial<SlashCommandContext>): SlashCommandContext {
  return {
    threadId: "test-thread",
    threadStore: { getThreadSnapshot: () => null, setCachedThread: () => {} } as any,
    threadWorker: { runInference: () => {}, cancelInference: () => {} } as any,
    configService: { get: () => ({ settings: {} }) } as any,
    showMessage: () => {},
    clearInput: () => {},
    ...overrides,
  };
}

describe("SlashCommandRegistry", () => {
  it("registers and dispatches a command", async () => {
    const registry = new SlashCommandRegistry();
    const handler = mock(async () => {});
    registry.register({
      name: "test",
      description: "Test command",
      execute: handler,
    });

    const ctx = makeContext();
    const result = await registry.dispatch("test", "", ctx);

    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("", ctx);
  });

  it("returns false for unknown command", async () => {
    const registry = new SlashCommandRegistry();
    const ctx = makeContext();
    const result = await registry.dispatch("nonexistent", "", ctx);
    expect(result).toBe(false);
  });

  it("dispatches with args", async () => {
    const registry = new SlashCommandRegistry();
    let receivedArgs = "";
    registry.register({
      name: "echo",
      description: "Echo args",
      execute: async (args) => { receivedArgs = args; },
    });

    const ctx = makeContext();
    await registry.dispatch("echo", "hello world", ctx);
    expect(receivedArgs).toBe("hello world");
  });

  it("lists all registered commands", () => {
    const registry = new SlashCommandRegistry();
    registry.register({ name: "a", description: "A", execute: async () => {} });
    registry.register({ name: "b", description: "B", execute: async () => {} });

    const commands = registry.listCommands();
    expect(commands).toHaveLength(2);
    expect(commands.map(c => c.name)).toEqual(["a", "b"]);
  });

  it("supports aliases", async () => {
    const registry = new SlashCommandRegistry();
    const handler = mock(async () => {});
    registry.register({
      name: "quit",
      aliases: ["exit", "q"],
      description: "Quit",
      execute: handler,
    });

    const ctx = makeContext();
    await registry.dispatch("exit", "", ctx);
    expect(handler).toHaveBeenCalledTimes(1);

    await registry.dispatch("q", "", ctx);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/slash-registry.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Implement SlashCommandRegistry**

```typescript
// packages/cli/src/commands/slash-registry.ts
/**
 * SlashCommandRegistry -- register/dispatch pattern for /slash commands.
 *
 * 逆向: e0R class in amp-cli-reversed/modules/2785_unknown_e0R.js:7-86
 * Amp's registry uses a Map<string, Command> with register/execute.
 * Flitter simplifies: no telemetry, no abort controller, no customFlow.
 */

import type { ThreadSnapshot } from "@flitter/schemas";

/**
 * Context passed to slash command handlers.
 *
 * 逆向: amp's command execute receives a context object with thread handle,
 * config service, editor dispatch, showToast, etc. Flitter passes a simpler
 * subset relevant to CLI mode.
 */
export interface SlashCommandContext {
  threadId: string;
  threadStore: {
    getThreadSnapshot(id: string): ThreadSnapshot | null;
    setCachedThread(snapshot: ThreadSnapshot, opts?: { scheduleUpload?: boolean }): void;
  };
  threadWorker: {
    runInference(): Promise<void>;
    cancelInference(): void;
  };
  configService: {
    get(): { settings: Record<string, unknown> };
  };
  /** Display a message to the user (e.g., toast or inline) */
  showMessage: (text: string) => void;
  /** Clear the input field */
  clearInput: () => void;
}

/**
 * Slash command definition.
 *
 * 逆向: amp's command object has id, noun, verb, description, execute,
 * aliases, isShown, customFlow. Flitter uses name + description + execute.
 */
export interface SlashCommand {
  /** Command name (without the leading /) */
  name: string;
  /** Alternative names */
  aliases?: string[];
  /** Human-readable description */
  description: string;
  /** Handler: receives args string and context */
  execute: (args: string, context: SlashCommandContext) => Promise<void>;
}

/**
 * SlashCommandRegistry -- simple register/dispatch for /commands.
 *
 * 逆向: e0R (2785_unknown_e0R.js:7-86)
 */
export class SlashCommandRegistry {
  private commands = new Map<string, SlashCommand>();
  private aliases = new Map<string, string>();

  register(command: SlashCommand): void {
    this.commands.set(command.name, command);
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }
  }

  async dispatch(name: string, args: string, context: SlashCommandContext): Promise<boolean> {
    const resolved = this.aliases.get(name) ?? name;
    const command = this.commands.get(resolved);
    if (!command) return false;
    await command.execute(args, context);
    return true;
  }

  listCommands(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  has(name: string): boolean {
    const resolved = this.aliases.get(name) ?? name;
    return this.commands.has(resolved);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/slash-registry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/slash-registry.ts packages/cli/src/commands/__tests__/slash-registry.test.ts
git commit -m "feat(cli): add SlashCommandRegistry with register/dispatch pattern

逆向: amp e0R class (2785_unknown_e0R.js:7-86) — Map-based registry
with register/execute. Flitter simplifies: no telemetry, no customFlow."
```

---

### Task 2: Implement slash command handlers

**Why:** With the registry in place, we need the actual handler implementations for the 6 commands.

**Files:**
- Create: `packages/cli/src/commands/slash-handlers.ts`
- Create: `packages/cli/src/commands/__tests__/slash-handlers.test.ts`

**Amp reference:**
- `/help`: `e0R:1528-1534` -- `R.openHelp()` opens a help modal listing all commands
- `/clear` (prompt clear): `e0R:918-926` -- `R.editorDispatch({ type: "clear" })` clears input. Note: amp has `clear` as "prompt: clear" (clears input, not conversation). Flitter implements `/clear` as clearing the conversation (more useful for CLI).
- `/compact`: amp does not have a direct `/compact` command -- compaction is automatic via `checkAndCompact`. Flitter adds a manual trigger.
- `/cost`: amp has `show-costs` (`e0R:1508-1517`) as a dogfooding toggle. Flitter's `/cost` displays session cost.
- `/model`: amp has `model-selector` (`e0R:1483-1506`) which shows a modal explaining why amp doesn't have one. Flitter's `/model` shows the current model and allows switching.
- `/status`: amp has `mcp-status` (`e0R:1345-1351`) -- `R.showMCPStatusModal()`. Flitter's `/status` shows thread + session status.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/commands/__tests__/slash-handlers.test.ts
import { describe, expect, it, mock } from "bun:test";
import { createBuiltinCommands } from "../slash-handlers";
import { SlashCommandRegistry } from "../slash-registry";
import type { SlashCommandContext } from "../slash-registry";

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
    } as any,
    threadWorker: {
      runInference: mock(async () => {}),
      cancelInference: mock(() => {}),
    } as any,
    configService: {
      get: () => ({
        settings: { "internal.model": "claude-sonnet-4-20250514" },
      }),
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/slash-handlers.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Implement handlers**

```typescript
// packages/cli/src/commands/slash-handlers.ts
/**
 * Built-in slash command handlers.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:192-1560
 * (registerCommands with all built-in commands)
 *
 * Flitter implements a minimal set: /help, /clear, /compact, /cost, /model, /status.
 */

import type { SlashCommandContext, SlashCommandRegistry } from "./slash-registry";

/**
 * Register all built-in slash commands on the given registry.
 *
 * 逆向: e0R.registerCommands() (2785_unknown_e0R.js:192)
 */
export function createBuiltinCommands(registry: SlashCommandRegistry): void {
  // /help -- show available commands
  // 逆向: e0R:1528-1534 (id: "help", verb: "help", execute: R.openHelp())
  registry.register({
    name: "help",
    aliases: ["?", "h"],
    description: "Show available slash commands",
    execute: async (_args, ctx) => {
      const commands = registry.listCommands();
      const lines = commands.map(c => `  /${c.name} — ${c.description}`);
      ctx.showMessage("Available commands:\n" + lines.join("\n"));
    },
  });

  // /clear -- clear conversation (reset thread messages)
  // 逆向: e0R:918-926 (id: "clear", verb: "clear"). Amp clears the editor input.
  // Flitter interprets /clear as clearing the conversation history, which is more
  // useful in a CLI context. The thread snapshot is reset to empty messages.
  registry.register({
    name: "clear",
    description: "Clear conversation history",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (snapshot) {
        ctx.threadStore.setCachedThread(
          { ...snapshot, messages: [] } as any,
          { scheduleUpload: true },
        );
      }
      ctx.showMessage("Conversation cleared.");
    },
  });

  // /compact -- manually trigger context compaction
  // Note: amp does not have a direct /compact command. Compaction is automatic.
  // Flitter adds manual trigger for user control.
  registry.register({
    name: "compact",
    description: "Manually trigger context compaction",
    execute: async (_args, ctx) => {
      ctx.showMessage("Compaction requested. The next inference turn will check context limits.");
      // Compaction runs as part of the inference loop (checkAndCompact).
      // We signal by showing a message. Full manual compaction would require
      // exposing contextManager.checkAndCompact on the context -- deferred.
    },
  });

  // /cost -- show session cost
  // 逆向: e0R:1508-1517 (show-costs toggles debug cost display)
  // Flitter: display accumulated session cost to user.
  registry.register({
    name: "cost",
    description: "Show session cost summary",
    execute: async (_args, ctx) => {
      // Cost data is displayed from status bar state or a SessionCostTracker.
      // For now, show a placeholder that will be wired to SessionCostTracker
      // once Plan 10 (cost-tracking) is implemented.
      ctx.showMessage(
        "Session cost tracking: use the status bar for live cost info.\n" +
        "(Detailed cost breakdown will be available after cost tracking is wired.)"
      );
    },
  });

  // /model -- show/switch model
  // 逆向: e0R:1483-1506 (model-selector shows explanation modal)
  // Flitter: show current model, allow switching via /model <name>
  registry.register({
    name: "model",
    description: "Show current model or switch model",
    execute: async (args, ctx) => {
      const config = ctx.configService.get();
      const currentModel =
        (config.settings as Record<string, unknown>)["internal.model"] as string ??
        "claude-sonnet-4-20250514";
      if (!args.trim()) {
        ctx.showMessage(`Current model: ${currentModel}`);
      } else {
        ctx.showMessage(
          `Model switching via /model <name> is not yet implemented.\n` +
          `Current model: ${currentModel}\n` +
          `Use 'flitter config set llm.model <model>' to change.`
        );
      }
    },
  });

  // /status -- show thread and session status
  // 逆向: e0R:1345-1351 (mcp-status shows MCP connection status)
  // Flitter: show thread ID, message count, model, inference state.
  registry.register({
    name: "status",
    description: "Show thread and session status",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      const messageCount = snapshot?.messages?.length ?? 0;
      const config = ctx.configService.get();
      const model =
        (config.settings as Record<string, unknown>)["internal.model"] as string ??
        "unknown";
      ctx.showMessage(
        `Thread: ${ctx.threadId}\n` +
        `Messages: ${messageCount} messages\n` +
        `Model: ${model}\n` +
        `Title: ${snapshot?.title ?? "(none)"}`
      );
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/slash-handlers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/slash-handlers.ts packages/cli/src/commands/__tests__/slash-handlers.test.ts
git commit -m "feat(cli): implement /help /clear /compact /cost /model /status handlers

逆向: amp e0R.registerCommands() (2785_unknown_e0R.js:192-1560)
registers built-in commands. Flitter implements 6 essential commands.
/clear resets thread messages (amp's /clear clears editor input)."
```

---

### Task 3: Wire slash command routing into onSubmit in interactive mode

**Why:** The registry and handlers exist but nothing calls them. The `onSubmit` callback in `interactive.ts:166-183` sends all input directly to the LLM. We need to intercept `/command` prefix before that.

**Files:**
- Modify: `packages/cli/src/modes/interactive.ts`
- Create: `packages/cli/src/commands/__tests__/slash-routing.test.ts`

**Amp reference:** Amp's input handling is in the TUI framework layer where the editor's submit action checks for command prefix. The `e0R.execute()` method is called from the command palette or from input interception. Flitter intercepts at the `onSubmit` callback level.

- [ ] **Step 1: Write the failing integration test**

```typescript
// packages/cli/src/commands/__tests__/slash-routing.test.ts
import { describe, expect, it, mock } from "bun:test";
import { parseCommandInput } from "../../widgets/command-detection";
import { createBuiltinCommands } from "../slash-handlers";
import { SlashCommandRegistry } from "../slash-registry";
import type { SlashCommandContext } from "../slash-registry";

function makeContext(overrides?: Partial<SlashCommandContext>): SlashCommandContext {
  return {
    threadId: "test-thread",
    threadStore: {
      getThreadSnapshot: () => ({
        id: "test-thread", v: 1, title: null, messages: [], relationships: [],
      }),
      setCachedThread: mock(() => {}),
    } as any,
    threadWorker: {
      runInference: mock(async () => {}),
      cancelInference: mock(() => {}),
    } as any,
    configService: {
      get: () => ({ settings: { "internal.model": "claude-sonnet-4-20250514" } }),
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
```

- [ ] **Step 2: Run test to verify it passes (this is a pure integration test, should pass after Task 2)**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/slash-routing.test.ts`
Expected: PASS

- [ ] **Step 3: Modify `interactive.ts` to intercept slash commands**

In `packages/cli/src/modes/interactive.ts`, add imports at the top:

```typescript
import { parseCommandInput } from "../widgets/command-detection.js";
import { SlashCommandRegistry, type SlashCommandContext } from "../commands/slash-registry.js";
import { createBuiltinCommands } from "../commands/slash-handlers.js";
```

Then in `launchInteractiveMode`, before the `runApp` call (after line 153: `const toastManager = new ToastManager();`), create and populate the registry:

```typescript
  // Slash command registry
  // 逆向: e0R construction in amp (2785_unknown_e0R.js:17-18)
  const slashRegistry = new SlashCommandRegistry();
  createBuiltinCommands(slashRegistry);
```

Then replace the `onSubmit` callback (lines 166-183):

```typescript
          onSubmit: (text: string) => {
            // Intercept slash commands before sending to LLM
            // 逆向: amp intercepts "/" prefix in editor submit action
            const parsed = parseCommandInput(text);
            if (parsed) {
              const ctx: SlashCommandContext = {
                threadId,
                threadStore: container.threadStore,
                threadWorker: worker,
                configService: container.configService,
                showMessage: (msg: string) => {
                  // Append as a system message in the thread for display
                  const snapshot = container.threadStore.getThreadSnapshot(threadId);
                  if (snapshot) {
                    container.threadStore.setCachedThread(
                      {
                        ...snapshot,
                        messages: [
                          ...snapshot.messages,
                          {
                            role: "assistant",
                            content: [{ type: "text", text: msg }],
                            state: { type: "complete" },
                          },
                        ],
                      } as any,
                    );
                  }
                },
                clearInput: () => {
                  // InputField clears on submit automatically
                },
              };
              slashRegistry.dispatch(parsed.command, parsed.args, ctx).catch((err) => {
                log.info("Slash command error", { error: err });
              });
              return;
            }

            // Not a slash command: send to LLM
            const snapshot = container.threadStore.getThreadSnapshot(threadId);
            if (snapshot) {
              container.threadStore.setCachedThread(
                {
                  ...snapshot,
                  messages: [
                    ...snapshot.messages,
                    { role: "user", content: [{ type: "text", text }] },
                  ],
                } as ThreadSnapshot,
                { scheduleUpload: true },
              );
            }
            worker.runInference();
          },
```

- [ ] **Step 4: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No new type errors

- [ ] **Step 5: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/modes/interactive.ts packages/cli/src/commands/__tests__/slash-routing.test.ts
git commit -m "feat(cli): wire slash command routing into interactive onSubmit

parseCommandInput intercepts /foo prefix before sending to LLM.
Dispatches to SlashCommandRegistry. Handler output is shown as an
assistant message in the thread for display.

逆向: amp intercepts '/' prefix in editor submit (e0R.execute)"
```

---

### Task 4: Run full test suite and verify

- [ ] **Step 1: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 2: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 3: Manual verification**

Run the TUI and type `/help` to verify command list appears instead of being sent to LLM:

```bash
cd /Users/bytedance/workspace/flitter && FLITTER_LOG_LEVEL=debug bun run packages/cli/src/main.ts
```

Type `/help` and verify the command list is displayed. Type `/status` and verify thread info appears.

- [ ] **Step 4: Fix any regressions**

If existing tests fail, investigate and fix before proceeding.
