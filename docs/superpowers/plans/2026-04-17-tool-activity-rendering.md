# Tool Activity Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render tool-use blocks, tool-result blocks, and activity groups in the conversation view so users can see what the agent is doing — the single biggest UX gap between Flitter and amp.

**Architecture:** Replace the flat `Message { role, content: string }` model with a richer `DisplayItem` discriminated union (message / tool / activity-group), following amp's `yx0()` transformation pipeline. The `ConversationView` gets new render methods for each display item type. `ThreadStateWidget` subscribes to `tool:start` / `tool:data` / `tool:complete` events from the worker and tracks live tool progress. Tool events that are currently defined but never emitted in the `ThreadWorker`/`ToolOrchestrator` get wired up.

**Tech Stack:** TypeScript, `@flitter/tui` (RichText, TextSpan, Column, Row, Expanded, SizedBox, Container, Border), `@flitter/schemas` (ToolUseBlock, ToolResultBlock, ToolRun), `@flitter/agent-core` (AgentEvent, ThreadWorker, ToolOrchestrator)

**amp reference files:**
- `amp-cli-reversed/modules/2154_Subagent_yx0.js` — display item transformation pipeline
- `amp-cli-reversed/1472_tui_components/actions_intents.js` — `Y1T` activity group widget (braille spinner)

---

### Task 1: Emit tool:start and tool:complete events from ToolOrchestrator

The `AgentEvent` union defines `tool:start`, `tool:data`, `tool:complete` but they are never emitted. The orchestrator's `invokeTool` method must emit these through a callback so `ThreadWorker` can forward them to `events$`.

**Files:**
- Modify: `packages/agent-core/src/tools/orchestrator.ts` (OrchestratorCallbacks, invokeTool)
- Modify: `packages/agent-core/src/worker/thread-worker.ts` (wire callback to events$)
- Test: `packages/agent-core/src/tools/__tests__/orchestrator-events.test.ts`

- [ ] **Step 1: Write failing test for tool event emission**

```ts
// packages/agent-core/src/tools/__tests__/orchestrator-events.test.ts
import { describe, it, expect, mock } from "bun:test";
import { ToolOrchestrator } from "../orchestrator";
import type { ToolRegistry } from "../registry";
import type { AgentEvent } from "../../worker/events";

function createMockRegistry(tools: Record<string, { execute: () => Promise<unknown> }>): ToolRegistry {
  return {
    get(name: string) {
      const t = tools[name];
      if (!t) return undefined;
      return {
        name,
        description: "test",
        inputSchema: { type: "object" as const, properties: {} },
        execute: t.execute,
        serial: false,
      };
    },
    getToolDefinitions() { return []; },
    list() { return []; },
    register() {},
  } as unknown as ToolRegistry;
}

describe("ToolOrchestrator event emission", () => {
  it("emits tool:start and tool:complete for each tool invocation", async () => {
    const events: AgentEvent[] = [];
    const registry = createMockRegistry({
      Read: { execute: async () => ({ content: "file contents" }) },
    });

    const orchestrator = new ToolOrchestrator(
      "test-thread-id",
      registry,
      {
        getConfig: async () => ({ settings: {} } as any),
        updateThread: async () => {},
        getToolRunEnvironment: async () => ({} as any),
        applyHookResult: async () => ({ abortOp: false }),
        applyPostHookResult: async () => {},
        updateFileChanges: async () => {},
        getDisposed$: () => ({ subscribe: () => ({ unsubscribe() {} }) } as any),
        onToolEvent: (event: AgentEvent) => { events.push(event); },
      },
    );

    await orchestrator.executeToolsWithPlan([
      { id: "tu_1", name: "Read", input: { file_path: "/tmp/test.txt" } },
    ]);

    const starts = events.filter(e => e.type === "tool:start");
    const completes = events.filter(e => e.type === "tool:complete");
    expect(starts).toHaveLength(1);
    expect(starts[0]).toEqual({ type: "tool:start", toolUseId: "tu_1", toolName: "Read" });
    expect(completes).toHaveLength(1);
    expect(completes[0]).toEqual({ type: "tool:complete", toolUseId: "tu_1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent-core && bun test src/tools/__tests__/orchestrator-events.test.ts`
Expected: FAIL — `onToolEvent` is not in `OrchestratorCallbacks`

- [ ] **Step 3: Add onToolEvent callback to OrchestratorCallbacks**

In `packages/agent-core/src/tools/orchestrator.ts`, add to the `OrchestratorCallbacks` interface:

```ts
/** Emit tool lifecycle events to the TUI layer */
onToolEvent?: (event: import("../worker/events").AgentEvent) => void;
```

In `invokeTool`, emit events at the start and end:

```ts
// At the very start of invokeTool, after cancel check:
this.callbacks.onToolEvent?.({ type: "tool:start", toolUseId: toolUse.id, toolName: toolUse.name });

// At the very end of invokeTool, in the finally block:
this.callbacks.onToolEvent?.({ type: "tool:complete", toolUseId: toolUse.id });
```

- [ ] **Step 4: Wire ThreadWorker to forward tool events to events$**

The `ToolOrchestrator` is injected into `ThreadWorker` via `ThreadWorkerOptions.toolOrchestrator` — ThreadWorker does **not** construct it. The wiring must happen at the **factory site** that creates the orchestrator (likely `packages/flitter/src/factory.ts` or `packages/flitter/src/container.ts`).

In the factory that creates the orchestrator, add `onToolEvent` to the callbacks object that gets passed into `new ToolOrchestrator(threadId, registry, callbacks)`:

```ts
// In the factory/container that creates the orchestrator and ThreadWorker:
const worker = new ThreadWorker({ ...opts, toolOrchestrator });

// The onToolEvent callback in the orchestrator's callbacks object should
// forward events to the ThreadWorker's events$ Subject:
onToolEvent: (event: AgentEvent) => {
  worker.events$.next(event);
},
```

If the orchestrator is created before the worker (circular dependency), use a deferred callback pattern:

```ts
let workerEvents$: Subject<AgentEvent> | null = null;

const orchestrator = new ToolOrchestrator(threadId, registry, {
  ...otherCallbacks,
  onToolEvent: (event) => { workerEvents$?.next(event); },
});

const worker = new ThreadWorker({ ...opts, toolOrchestrator: orchestrator });
workerEvents$ = worker.events$;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/agent-core && bun test src/tools/__tests__/orchestrator-events.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/agent-core/src/tools/orchestrator.ts packages/agent-core/src/worker/thread-worker.ts packages/agent-core/src/tools/__tests__/orchestrator-events.test.ts
git commit -m "feat(agent-core): emit tool:start and tool:complete events from ToolOrchestrator"
```

---

### Task 2: Define DisplayItem types and thread-to-display-item transformer

Replace the flat `Message { role, content: string }` model with a richer type system that mirrors amp's `yx0()` output.

**Files:**
- Create: `packages/cli/src/widgets/display-items.ts`
- Test: `packages/cli/src/widgets/__tests__/display-items.test.ts`

- [ ] **Step 1: Write failing tests for display item transformation**

```ts
// packages/cli/src/widgets/__tests__/display-items.test.ts
import { describe, it, expect } from "bun:test";
import { transformThreadToDisplayItems, type DisplayItem } from "../display-items";

describe("transformThreadToDisplayItems", () => {
  it("transforms a simple user+assistant exchange into message items", () => {
    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "Hello" }] },
      {
        role: "assistant" as const,
        content: [{ type: "text" as const, text: "Hi there!" }],
        state: { type: "complete" as const },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ type: "message", role: "user", text: "Hello" });
    expect(items[1]).toEqual({ type: "message", role: "assistant", text: "Hi there!" });
  });

  it("transforms a tool_use + tool_result into a tool item", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "Let me read that file." },
          { type: "tool_use" as const, id: "tu_1", name: "Read", input: { file_path: "/tmp/a.txt" }, complete: true },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_1",
            run: { status: "done" as const, result: "file contents" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(2); // message text + tool row
    expect(items[0]).toEqual({ type: "message", role: "assistant", text: "Let me read that file." });
    expect(items[1]).toMatchObject({
      type: "tool",
      toolUseId: "tu_1",
      toolName: "Read",
      status: "done",
      kind: "read",
    });
  });

  it("groups lightweight read/search tools into activity-group items", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "tool_use" as const, id: "tu_1", name: "Read", input: { file_path: "/a.txt" }, complete: true },
          { type: "tool_use" as const, id: "tu_2", name: "Grep", input: { pattern: "foo" }, complete: true },
          { type: "tool_use" as const, id: "tu_3", name: "Glob", input: { pattern: "*.ts" }, complete: true },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          { type: "tool_result" as const, toolUseID: "tu_1", run: { status: "done" as const, result: "contents" } },
          { type: "tool_result" as const, toolUseID: "tu_2", run: { status: "done" as const, result: "matches" } },
          { type: "tool_result" as const, toolUseID: "tu_3", run: { status: "done" as const, result: "files" } },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "activity-group",
      actions: [
        { kind: "read", toolName: "Read", toolUseId: "tu_1" },
        { kind: "search", toolName: "Grep", toolUseId: "tu_2" },
        { kind: "search", toolName: "Glob", toolUseId: "tu_3" },
      ],
    });
  });

  it("renders Bash tool as a bash tool item", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "tool_use" as const, id: "tu_1", name: "Bash", input: { command: "ls -la" }, complete: true },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_1",
            run: { status: "done" as const, result: "total 42\n-rw-r--r-- 1 user" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "tool",
      kind: "bash",
      toolName: "Bash",
      status: "done",
      command: "ls -la",
      output: "total 42\n-rw-r--r-- 1 user",
    });
  });

  it("renders Edit tool as an edit tool item", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Edit",
            input: { file_path: "/tmp/a.ts", old_string: "foo", new_string: "bar" },
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_1",
            run: { status: "done" as const, result: "OK" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "tool",
      kind: "edit",
      toolName: "Edit",
      status: "done",
      path: "/tmp/a.ts",
    });
  });

  it("handles in-progress tool uses without results", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "tool_use" as const, id: "tu_1", name: "Bash", input: { command: "sleep 10" }, complete: true },
        ],
        state: { type: "streaming" as const },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "tool",
      kind: "bash",
      status: "in-progress",
      command: "sleep 10",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/display-items.test.ts`
Expected: FAIL — module `../display-items` does not exist

- [ ] **Step 3: Implement display-items.ts**

```ts
// packages/cli/src/widgets/display-items.ts
/**
 * DisplayItem types and thread-to-display-item transformer.
 *
 * Mirrors amp's yx0() pipeline (2154_Subagent_yx0.js):
 * raw thread messages → flat list of typed display rows.
 *
 * 逆向: yx0 + ux0 (2154_Subagent_yx0.js)
 */

// ─── Display Item Types ─────────────────────────────

export type DisplayItem = MessageItem | ToolItem | ActivityGroupItem;

export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system";
  text: string;
}

export type ToolKind = "bash" | "edit" | "create-file" | "read" | "search" | "generic";

export interface ToolItem {
  type: "tool";
  toolUseId: string;
  toolName: string;
  kind: ToolKind;
  status: "done" | "error" | "cancelled" | "rejected-by-user" | "in-progress";
  // bash-specific
  command?: string;
  output?: string;
  exitCode?: number;
  // edit/create-file-specific
  path?: string;
  oldString?: string;
  newString?: string;
  // generic
  args?: Record<string, unknown>;
  error?: string;
}

export interface ActivityAction {
  kind: "read" | "search" | "list";
  toolName: string;
  toolUseId: string;
  status: "done" | "error" | "cancelled" | "in-progress";
}

export interface ActivityGroupItem {
  type: "activity-group";
  actions: ActivityAction[];
  summary: string;
  hasInProgress: boolean;
}

// ─── Tool classification ─────────────────────────────

/** Tools that get their own full row (逆向: yx0 switch cases) */
const BASH_TOOLS = new Set(["Bash", "shell_command"]);
const EDIT_TOOLS = new Set(["Edit", "edit_file", "apply_patch", "undo_edit"]);
const CREATE_TOOLS = new Set(["Write", "create_file"]);

/** Tools grouped into activity rows (逆向: yx0 lightweight-tool checks) */
const ACTIVITY_TOOLS: Record<string, "read" | "search" | "list"> = {
  Read: "read",
  Grep: "search",
  Glob: "search",
  FuzzyFind: "search",
  file_tree: "list",
  read_thread: "read",
  find_thread: "search",
  skill: "read",
  get_diagnostics: "read",
};

/** Tools to silently skip (逆向: bx0 / _x0 set) */
const HIDDEN_TOOLS = new Set(["thread_status"]);

// ─── Transformer ─────────────────────────────────────

interface RawContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  complete?: boolean;
  toolUseID?: string;
  run?: { status: string; result?: unknown; error?: { message: string; errorCode?: string } };
  [key: string]: unknown;
}

interface RawMessage {
  role: "user" | "assistant" | "system" | "info";
  content: string | RawContentBlock[];
  state?: { type: string };
}

/**
 * Transform raw thread messages into a flat display item list.
 * 逆向: yx0 + ux0 (2154_Subagent_yx0.js)
 */
export function transformThreadToDisplayItems(messages: RawMessage[]): DisplayItem[] {
  // Step 1: Build tool_use → tool_result lookup
  const resultMap = new Map<string, RawContentBlock>();
  for (const msg of messages) {
    if (typeof msg.content === "string") continue;
    for (const block of msg.content) {
      if (block.type === "tool_result" && block.toolUseID) {
        resultMap.set(block.toolUseID, block);
      }
    }
  }

  // Step 2: Walk messages and build display items
  const items: DisplayItem[] = [];
  const activityBuffer: ActivityAction[] = [];

  const flushActivityBuffer = () => {
    if (activityBuffer.length === 0) return;
    const hasInProgress = activityBuffer.some(a => a.status === "in-progress");
    items.push({
      type: "activity-group",
      actions: [...activityBuffer],
      summary: buildActivitySummary(activityBuffer),
      hasInProgress,
    });
    activityBuffer.length = 0;
  };

  for (const msg of messages) {
    if (typeof msg.content === "string") {
      // Simple string content (legacy format)
      if (msg.role !== "user" || !msg.content) continue;
      flushActivityBuffer();
      items.push({ type: "message", role: msg.role, text: msg.content });
      continue;
    }

    // Extract text blocks as message items
    const textParts: string[] = [];
    for (const block of msg.content) {
      if (block.type === "text" && block.text) {
        textParts.push(block.text);
      }
    }
    if (textParts.length > 0 && (msg.role === "user" || msg.role === "assistant" || msg.role === "system")) {
      // Only emit message item if there's actual text (skip tool_result-only user messages)
      const hasToolResults = msg.content.some(b => b.type === "tool_result");
      if (!hasToolResults || textParts.some(t => t.trim())) {
        flushActivityBuffer();
        items.push({ type: "message", role: msg.role, text: textParts.join("") });
      }
    }

    // Process tool_use blocks
    for (const block of msg.content) {
      if (block.type !== "tool_use") continue;
      if (!block.id || !block.name) continue;
      if (HIDDEN_TOOLS.has(block.name)) continue;

      const result = resultMap.get(block.id);
      const status = (result?.run?.status as ToolItem["status"]) ?? "in-progress";

      // Classify the tool
      if (ACTIVITY_TOOLS[block.name]) {
        activityBuffer.push({
          kind: ACTIVITY_TOOLS[block.name],
          toolName: block.name,
          toolUseId: block.id,
          status: status === "rejected-by-user" ? "cancelled" : (status as ActivityAction["status"]),
        });
      } else if (BASH_TOOLS.has(block.name)) {
        flushActivityBuffer();
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "bash",
          status,
          command: typeof block.input?.command === "string" ? block.input.command : undefined,
          output: typeof result?.run?.result === "string" ? result.run.result : undefined,
          error: result?.run?.status === "error" ? result.run.error?.message : undefined,
        });
      } else if (EDIT_TOOLS.has(block.name)) {
        flushActivityBuffer();
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "edit",
          status,
          path: typeof block.input?.file_path === "string" ? block.input.file_path : undefined,
          oldString: typeof block.input?.old_string === "string" ? block.input.old_string : undefined,
          newString: typeof block.input?.new_string === "string" ? block.input.new_string : undefined,
        });
      } else if (CREATE_TOOLS.has(block.name)) {
        flushActivityBuffer();
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "create-file",
          status,
          path: typeof block.input?.file_path === "string" ? block.input.file_path : undefined,
        });
      } else {
        flushActivityBuffer();
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "generic",
          status,
          args: block.input,
          error: result?.run?.status === "error" ? result.run.error?.message : undefined,
        });
      }
    }
  }

  flushActivityBuffer();
  return items;
}

/**
 * Build a summary string for an activity group.
 * 逆向: cfT() in yx0 — "3 reads, 2 searches"
 */
function buildActivitySummary(actions: ActivityAction[]): string {
  const counts: Record<string, number> = {};
  for (const a of actions) {
    counts[a.kind] = (counts[a.kind] ?? 0) + 1;
  }
  const parts: string[] = [];
  if (counts.read) parts.push(`${counts.read} read${counts.read > 1 ? "s" : ""}`);
  if (counts.search) parts.push(`${counts.search} search${counts.search > 1 ? "es" : ""}`);
  if (counts.list) parts.push(`${counts.list} list${counts.list > 1 ? "s" : ""}`);
  return parts.join(", ") || "activity";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/__tests__/display-items.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/display-items.test.ts
git commit -m "feat(cli): add DisplayItem types and thread-to-display-item transformer"
```

---

### Task 3: Render tool items in ConversationView

Add rendering methods for `ToolItem` display rows: bash commands, file edits, file creates, and generic tools.

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts` (replace Message[] with DisplayItem[], add tool renderers)
- Test: `packages/cli/src/widgets/__tests__/conversation-view-tools.test.ts`

- [ ] **Step 1: Write failing test for tool item rendering**

```ts
// packages/cli/src/widgets/__tests__/conversation-view-tools.test.ts
import { describe, it, expect } from "bun:test";
import { ConversationView } from "../conversation-view";
import type { DisplayItem } from "../display-items";

describe("ConversationView tool rendering", () => {
  it("accepts DisplayItem[] in its config", () => {
    const items: DisplayItem[] = [
      { type: "message", role: "user", text: "Run ls" },
      {
        type: "tool",
        toolUseId: "tu_1",
        toolName: "Bash",
        kind: "bash",
        status: "done",
        command: "ls -la",
        output: "total 42",
      },
      { type: "message", role: "assistant", text: "Here are the files." },
    ];
    // Should not throw
    const view = new ConversationView({ items });
    expect(view).toBeDefined();
    expect(view.config.items).toHaveLength(3);
  });

  it("accepts activity-group items", () => {
    const items: DisplayItem[] = [
      {
        type: "activity-group",
        actions: [
          { kind: "read", toolName: "Read", toolUseId: "tu_1", status: "done" },
          { kind: "search", toolName: "Grep", toolUseId: "tu_2", status: "done" },
        ],
        summary: "1 read, 1 search",
        hasInProgress: false,
      },
    ];
    const view = new ConversationView({ items });
    expect(view.config.items).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/conversation-view-tools.test.ts`
Expected: FAIL — `ConversationViewConfig` does not have `items` property

- [ ] **Step 3: Refactor ConversationView to accept DisplayItem[]**

In `packages/cli/src/widgets/conversation-view.ts`:

1. Add import: `import type { DisplayItem, ToolItem, ActivityGroupItem } from "./display-items.js";`

2. Change `ConversationViewConfig` to accept `items`:

**Note:** `ConversationViewConfig.messages` is currently **required** (non-optional). Making it optional while adding `items` is a breaking change — `ThreadStateWidget.build()` currently passes `messages: this._messages`. Both Task 3 and Task 4 must be implemented together, or keep `messages` required during the transition.

```ts
export interface ConversationViewConfig {
  /** Display items (replaces old messages array) */
  items: DisplayItem[];
  /** Legacy: flat messages (for backward compatibility during migration) */
  messages?: Message[];
  inferenceState?: "idle" | "running";
  error?: Error | null;
  streamingDelta?: string | null;
}
```

3. Update `build()` to iterate `config.items` instead of `config.messages`, dispatching to `_buildMessageWidget`, `_buildToolWidget`, or `_buildActivityGroupWidget` based on `item.type`.

4. Add `_buildToolWidget(tool: ToolItem): Widget`:
```ts
private _buildToolWidget(tool: ToolItem): Widget {
  const TOOL_COLOR = Color.rgb(0xe0, 0xaf, 0x68); // warning/tool color
  const DIM_COLOR = Color.rgb(0x56, 0x5f, 0x89);
  const SUCCESS_COLOR = Color.rgb(0x9e, 0xce, 0x6a);
  const ERROR_COLOR_LOCAL = Color.rgb(0xf7, 0x76, 0x8e);

  const statusColor = tool.status === "done" ? SUCCESS_COLOR
    : tool.status === "error" ? ERROR_COLOR_LOCAL
    : tool.status === "in-progress" ? TOOL_COLOR
    : DIM_COLOR;

  const statusIcon = tool.status === "done" ? "✓"
    : tool.status === "error" ? "✗"
    : tool.status === "in-progress" ? "⟳"
    : tool.status === "cancelled" ? "⊘"
    : "⊘";

  const children: TextSpan[] = [
    new TextSpan({
      text: `  ${statusIcon} `,
      style: new TextStyle({ foreground: statusColor }),
    }),
  ];

  if (tool.kind === "bash" && tool.command) {
    children.push(
      new TextSpan({ text: tool.toolName, style: new TextStyle({ bold: true, foreground: TOOL_COLOR }) }),
      new TextSpan({ text: ` ${tool.command}`, style: new TextStyle({ foreground: DIM_COLOR }) }),
    );
    if (tool.status === "done" && tool.output) {
      const truncated = tool.output.length > 200
        ? tool.output.slice(0, 200) + "…"
        : tool.output;
      children.push(
        new TextSpan({ text: `\n    ${truncated.replace(/\n/g, "\n    ")}`, style: new TextStyle({ foreground: DIM_COLOR }) }),
      );
    }
  } else if (tool.kind === "edit" && tool.path) {
    children.push(
      new TextSpan({ text: tool.toolName, style: new TextStyle({ bold: true, foreground: TOOL_COLOR }) }),
      new TextSpan({ text: ` ${tool.path}`, style: new TextStyle({ foreground: DIM_COLOR }) }),
    );
  } else if (tool.kind === "create-file" && tool.path) {
    children.push(
      new TextSpan({ text: tool.toolName, style: new TextStyle({ bold: true, foreground: TOOL_COLOR }) }),
      new TextSpan({ text: ` ${tool.path}`, style: new TextStyle({ foreground: DIM_COLOR }) }),
    );
  } else {
    children.push(
      new TextSpan({ text: tool.toolName, style: new TextStyle({ bold: true, foreground: TOOL_COLOR }) }),
    );
    if (tool.args) {
      const argStr = Object.entries(tool.args)
        .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join(", ");
      const truncated = argStr.length > 120 ? argStr.slice(0, 120) + "…" : argStr;
      children.push(
        new TextSpan({ text: ` ${truncated}`, style: new TextStyle({ foreground: DIM_COLOR }) }),
      );
    }
  }

  if (tool.error) {
    children.push(
      new TextSpan({ text: `\n    Error: ${tool.error}`, style: new TextStyle({ foreground: ERROR_COLOR_LOCAL }) }),
    );
  }

  return new RichText({ text: new TextSpan({ children }) });
}
```

5. Add `_buildActivityGroupWidget(group: ActivityGroupItem): Widget`:
```ts
private _buildActivityGroupWidget(group: ActivityGroupItem): Widget {
  const DIM_COLOR = Color.rgb(0x56, 0x5f, 0x89);
  const TOOL_COLOR = Color.rgb(0xe0, 0xaf, 0x68);
  const icon = group.hasInProgress ? "⟳" : "✓";
  const iconColor = group.hasInProgress ? TOOL_COLOR : Color.rgb(0x9e, 0xce, 0x6a);

  return new RichText({
    text: new TextSpan({
      children: [
        new TextSpan({ text: `  ${icon} `, style: new TextStyle({ foreground: iconColor }) }),
        new TextSpan({ text: group.summary, style: new TextStyle({ foreground: DIM_COLOR }) }),
      ],
    }),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/__tests__/conversation-view-tools.test.ts`
Expected: PASS

- [ ] **Step 5: Run existing ConversationView tests to check backward compat**

Run: `cd packages/cli && bun test src/widgets/conversation-view.test.ts`
Expected: PASS (existing tests may need updating if they use the old `messages` prop — update them to use `items` with `type: "message"`)

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/conversation-view-tools.test.ts
git commit -m "feat(cli): render tool items and activity groups in ConversationView"
```

---

### Task 4: Wire ThreadStateWidget to produce DisplayItems from thread snapshots

Update `ThreadStateWidget` to use `transformThreadToDisplayItems` instead of the old flat message mapping, and subscribe to tool events for live progress.

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts`
- Test: `packages/cli/src/widgets/__tests__/thread-state-widget-tools.test.ts`

- [ ] **Step 1: Write failing test for display item integration**

```ts
// packages/cli/src/widgets/__tests__/thread-state-widget-tools.test.ts
import { describe, it, expect } from "bun:test";
import { transformThreadToDisplayItems } from "../display-items";

describe("ThreadStateWidget display item integration", () => {
  it("transforms a thread snapshot with tool_use blocks into DisplayItems", () => {
    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "Read /tmp/a.txt" }] },
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "Reading the file." },
          { type: "tool_use" as const, id: "tu_1", name: "Read", input: { file_path: "/tmp/a.txt" }, complete: true },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          { type: "tool_result" as const, toolUseID: "tu_1", run: { status: "done" as const, result: "hello" } },
        ],
      },
      {
        role: "assistant" as const,
        content: [{ type: "text" as const, text: "The file contains 'hello'." }],
        state: { type: "complete" as const },
      },
    ];

    const items = transformThreadToDisplayItems(messages);
    expect(items.length).toBeGreaterThanOrEqual(3);
    // User message
    expect(items[0]).toMatchObject({ type: "message", role: "user" });
    // Assistant text + read activity or just activity
    const hasActivity = items.some(i => i.type === "activity-group");
    const hasAssistantText = items.some(i => i.type === "message" && i.role === "assistant");
    expect(hasActivity || hasAssistantText).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (this tests the transformer from Task 2, which should already exist)

Run: `cd packages/cli && bun test src/widgets/__tests__/thread-state-widget-tools.test.ts`
Expected: PASS

- [ ] **Step 3: Update ThreadStateWidget to use transformThreadToDisplayItems**

In `packages/cli/src/widgets/thread-state-widget.ts`:

1. Add import: `import { transformThreadToDisplayItems, type DisplayItem } from "./display-items.js";`

2. Replace `_messages: Message[]` with `_items: DisplayItem[]`:
```ts
private _items: DisplayItem[] = [];
```

3. In the `threadStore.observeThread` subscription, replace the message mapping with:
```ts
this._threadSub = thread$.subscribe((snapshot: unknown) => {
  const snap = snapshot as { messages?: Array<{ role: string; content: unknown; state?: unknown }> };
  this.setState(() => {
    this._items = transformThreadToDisplayItems(
      (snap.messages ?? []) as Parameters<typeof transformThreadToDisplayItems>[0],
    );
  });
  if (this._scrollController.followMode) {
    this._scrollController.scrollToBottom();
  }
});
```

4. Update `build()` to pass `items` to `ConversationView`:
```ts
new ConversationView({
  items: this._items,
  inferenceState: this._inferenceState,
  error: this._error,
}),
```

5. Subscribe to `tool:start` and `tool:complete` events for live tool progress indication. In the `events$` subscription, add cases:
```ts
case "tool:start":
case "tool:complete":
  // Force rebuild to update tool status indicators
  this.setState(() => {});
  break;
```

- [ ] **Step 4: Run all CLI widget tests**

Run: `cd packages/cli && bun test`
Expected: All PASS. Fix any existing tests that break due to the `Message[]` → `DisplayItem[]` change.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/__tests__/thread-state-widget-tools.test.ts
git commit -m "feat(cli): wire ThreadStateWidget to produce DisplayItems from thread snapshots"
```

---

### Task 5: Integration test — tool rendering in real TUI

Verify the full pipeline works by running a tmux e2e test that asserts tool rows appear in the terminal output.

**Files:**
- Create: `packages/cli/src/__tests__/tool-rendering.e2e.test.ts`

- [ ] **Step 1: Write e2e test**

```ts
// packages/cli/src/__tests__/tool-rendering.e2e.test.ts
import { describe, it, expect } from "bun:test";
import { transformThreadToDisplayItems } from "../widgets/display-items";

/**
 * Integration test: verify the full display pipeline from
 * raw thread messages → DisplayItems → correct item types.
 *
 * A real tmux test should be added once the TUI can be launched
 * headlessly. For now, test the data pipeline end-to-end.
 */
describe("tool rendering e2e pipeline", () => {
  it("full conversation with mixed tools produces correct display items", () => {
    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "Fix the bug in app.ts" }] },
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "Let me look at the code." },
          { type: "tool_use" as const, id: "tu_1", name: "Read", input: { file_path: "app.ts" }, complete: true },
          { type: "tool_use" as const, id: "tu_2", name: "Grep", input: { pattern: "bug" }, complete: true },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          { type: "tool_result" as const, toolUseID: "tu_1", run: { status: "done" as const, result: "code" } },
          { type: "tool_result" as const, toolUseID: "tu_2", run: { status: "done" as const, result: "line 42" } },
        ],
      },
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "Found the bug. Fixing it." },
          {
            type: "tool_use" as const,
            id: "tu_3",
            name: "Edit",
            input: { file_path: "app.ts", old_string: "buggy", new_string: "fixed" },
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          { type: "tool_result" as const, toolUseID: "tu_3", run: { status: "done" as const, result: "OK" } },
        ],
      },
      {
        role: "assistant" as const,
        content: [
          { type: "text" as const, text: "I fixed the bug by changing `buggy` to `fixed`." },
        ],
        state: { type: "complete" as const },
      },
    ];

    const items = transformThreadToDisplayItems(messages);

    // Should have: user msg, assistant msg, activity-group (read+grep), assistant msg, edit tool, assistant msg
    const types = items.map(i => i.type);
    expect(types).toContain("message");
    expect(types).toContain("activity-group");
    expect(types).toContain("tool");

    const editTool = items.find(i => i.type === "tool" && i.kind === "edit");
    expect(editTool).toBeDefined();
    expect(editTool).toMatchObject({ kind: "edit", path: "app.ts", status: "done" });

    const actGroup = items.find(i => i.type === "activity-group");
    expect(actGroup).toBeDefined();
    if (actGroup?.type === "activity-group") {
      expect(actGroup.actions).toHaveLength(2);
      expect(actGroup.summary).toContain("read");
      expect(actGroup.summary).toContain("search");
    }
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd packages/cli && bun test src/__tests__/tool-rendering.e2e.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/__tests__/tool-rendering.e2e.test.ts
git commit -m "test(cli): add tool rendering integration test"
```
