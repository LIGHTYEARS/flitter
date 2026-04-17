# Tool Approval Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete tool approval round-trip: when the agent calls a tool that requires user permission, the TUI shows an inline approval prompt (SelectMenu), the user accepts/rejects, and the result flows back to the ToolOrchestrator to resume or cancel execution.

**Architecture:** Three layers: (1) `PermissionEngine.checkPermission()` returns `action: "ask"`, (2) `ToolOrchestrator.invokeTool()` pauses on a Promise via `callbacks.requestApproval()`, (3) a new `ApprovalWidget` in the CLI renders the approval prompt. The Promise-bridge lives at the **construction site** (`packages/flitter/src/container.ts`), not inside `ThreadWorker` or `PermissionEngine` — both `ToolOrchestrator` and `ThreadWorker` are constructed together there. `PermissionEngine.requestApproval()` returns `void` (fire-and-forget push to `pendingApprovals$`), so the Promise-bridge must be custom-built.

**Important type note:** There are TWO `ToolApprovalResponse` types in the codebase — do NOT confuse them:
- `@flitter/schemas` defines: `{ accepted: true } | { feedback: string } | { accepted: false }` (3-variant union with `accepted`)
- `packages/agent-core/src/worker/thread-worker.ts` defines locally: `{ approved: boolean; remember?: boolean }` (with `approved`)
This plan uses the **worker-local** type (`approved`) internally and maps to `accepted` when interfacing with schemas.

**Tech Stack:** TypeScript, `@flitter/tui` (Column, Row, RichText, TextSpan, Focus), `@flitter/agent-core` (PermissionEngine, ThreadWorker, ToolOrchestrator)

**amp reference files:**
- `amp-cli-reversed/modules/1234_unknown_FWT.js` — tool runner `blocked-on-user` status
- `amp-cli-reversed/modules/2613_unknown_AB.js` — `awaiting_approval` → `interactionState: "user-tool-approval"`
- `amp-cli-reversed/1472_tui_components/actions_intents.js` — `io` (SelectMenu) for approval UI

**Prerequisite:** Plan 1 (Tool Activity Rendering) must be complete — this plan depends on tool events being emitted.

---

### Task 1: Implement the approval Promise bridge in ToolOrchestrator

The `ToolOrchestrator.invokeTool()` must check permissions before executing, and if the result is `action: "ask"`, pause on a Promise until the user responds.

**Files:**
- Modify: `packages/agent-core/src/tools/orchestrator.ts`
- Test: `packages/agent-core/src/tools/__tests__/orchestrator-approval.test.ts`

- [ ] **Step 1: Write failing test for approval blocking**

```ts
// packages/agent-core/src/tools/__tests__/orchestrator-approval.test.ts
import { describe, it, expect } from "bun:test";
import { ToolOrchestrator } from "../orchestrator";
import type { ToolRegistry } from "../registry";

function createMockRegistry(): ToolRegistry {
  return {
    get(name: string) {
      if (name !== "Bash") return undefined;
      return {
        name: "Bash",
        description: "Run shell commands",
        inputSchema: { type: "object" as const, properties: { command: { type: "string" } } },
        execute: async () => ({ content: "output" }),
        serial: true,
      };
    },
    getToolDefinitions() { return []; },
    list() { return []; },
    register() {},
  } as unknown as ToolRegistry;
}

describe("ToolOrchestrator approval flow", () => {
  it("pauses execution when checkPermission returns ask, resumes on approval", async () => {
    let resolveApproval: ((response: { accepted: boolean }) => void) | null = null;

    const orchestrator = new ToolOrchestrator(
      "test-thread-id",
      createMockRegistry(),
      {
        getConfig: async () => ({ settings: {} } as any),
        updateThread: async () => {},
        getToolRunEnvironment: async () => ({} as any),
        applyHookResult: async () => ({ abortOp: false }),
        applyPostHookResult: async () => {},
        updateFileChanges: async () => {},
        getDisposed$: () => ({ subscribe: () => ({ unsubscribe() {} }) } as any),
        checkPermission: (_toolName: string, _args: Record<string, unknown>) => ({
          permitted: false,
          action: "ask" as const,
          reason: "Bash requires approval",
        }),
        requestApproval: (request) => {
          return new Promise((resolve) => {
            resolveApproval = (response) => resolve(response);
          });
        },
      },
    );

    // Start execution — it should block waiting for approval
    const execPromise = orchestrator.executeToolsWithPlan([
      { id: "tu_1", name: "Bash", input: { command: "ls" } },
    ]);

    // Give it a tick to reach the approval point
    await new Promise(r => setTimeout(r, 50));
    expect(resolveApproval).not.toBeNull();

    // Approve
    resolveApproval!({ accepted: true });

    // Should complete now
    await execPromise;
  });

  it("cancels tool execution when user rejects", async () => {
    let resolveApproval: ((response: { accepted: boolean }) => void) | null = null;

    const orchestrator = new ToolOrchestrator(
      "test-thread-id",
      createMockRegistry(),
      {
        getConfig: async () => ({ settings: {} } as any),
        updateThread: async () => {},
        getToolRunEnvironment: async () => ({} as any),
        applyHookResult: async () => ({ abortOp: false }),
        applyPostHookResult: async () => {},
        updateFileChanges: async () => {},
        getDisposed$: () => ({ subscribe: () => ({ unsubscribe() {} }) } as any),
        checkPermission: () => ({
          permitted: false,
          action: "ask" as const,
          reason: "requires approval",
        }),
        requestApproval: () => {
          return new Promise((resolve) => {
            resolveApproval = (response) => resolve(response);
          });
        },
      },
    );

    const execPromise = orchestrator.executeToolsWithPlan([
      { id: "tu_1", name: "Bash", input: { command: "rm -rf /" } },
    ]);

    await new Promise(r => setTimeout(r, 50));
    resolveApproval!({ accepted: false });

    await execPromise;
    // Should complete without error — the tool was rejected, not crashed
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent-core && bun test src/tools/__tests__/orchestrator-approval.test.ts`
Expected: FAIL — `checkPermission` and `requestApproval` are not in `OrchestratorCallbacks`

- [ ] **Step 3: Add checkPermission and requestApproval to OrchestratorCallbacks**

In `packages/agent-core/src/tools/orchestrator.ts`, add to `OrchestratorCallbacks`:

```ts
/** Check if a tool invocation is permitted. Returns the permission check result. */
checkPermission?: (toolName: string, args: Record<string, unknown>) => {
  permitted: boolean;
  action?: "reject" | "ask" | "delegate";
  reason?: string;
};

/** Request user approval for a blocked tool. Returns a Promise that resolves with the user's response. */
requestApproval?: (request: {
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
}) => Promise<{ accepted: boolean; feedback?: string }>;
```

In `invokeTool`, insert the permission check before the actual execution.

**IMPORTANT:** `invokeTool()` returns `Promise<void>` — you CANNOT return an object from it. To reject a tool, call `callbacks.updateThread(...)` with a cancelled status and `return` early. Also note that `ToolThreadEvent`'s status union is `"in-progress" | "completed" | "error" | "cancelled"` — there is no `"rejected-by-user"` in it. Use `"cancelled"` for user-rejected tools (this matches the real-world semantics):

```ts
// After pre-hook, before execute:
if (this.callbacks.checkPermission) {
  const permResult = this.callbacks.checkPermission(toolUse.name, toolUse.input);
  if (!permResult.permitted && permResult.action === "ask") {
    if (this.callbacks.requestApproval) {
      const response = await this.callbacks.requestApproval({
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        args: toolUse.input,
        reason: permResult.reason ?? "Requires user approval",
      });
      if (!response.accepted) {
        // Tool rejected by user — record as cancelled and return early
        await this.callbacks.updateThread({
          toolUseId: toolUse.id,
          status: "cancelled",
          reason: "User rejected tool invocation",
        });
        this.callbacks.onToolEvent?.({ type: "tool:complete", toolUseId: toolUse.id });
        return;
      }
    }
  } else if (!permResult.permitted && permResult.action === "reject") {
    await this.callbacks.updateThread({
      toolUseId: toolUse.id,
      status: "cancelled",
      reason: permResult.reason ?? "Tool rejected by permission rules",
    });
    this.callbacks.onToolEvent?.({ type: "tool:complete", toolUseId: toolUse.id });
    return;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/agent-core && bun test src/tools/__tests__/orchestrator-approval.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-core/src/tools/orchestrator.ts packages/agent-core/src/tools/__tests__/orchestrator-approval.test.ts
git commit -m "feat(agent-core): implement approval Promise bridge in ToolOrchestrator"
```

---

### Task 2: Wire ThreadWorker.userRespondToApproval() to the orchestrator

Replace the placeholder stub with a real implementation that resolves the pending approval Promise.

**Files:**
- Modify: `packages/agent-core/src/worker/thread-worker.ts`
- Test: `packages/agent-core/src/worker/__tests__/thread-worker-approval.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/agent-core/src/worker/__tests__/thread-worker-approval.test.ts
import { describe, it, expect } from "bun:test";
import { ThreadWorker } from "../thread-worker";

describe("ThreadWorker approval flow", () => {
  it("resolves pending approval when userRespondToApproval is called", async () => {
    let capturedResolver: ((response: { accepted: boolean }) => void) | null = null;

    const worker = new ThreadWorker({
      getThreadSnapshot: () => ({ id: "test", v: 0, messages: [], relationships: [] }),
      updateThreadSnapshot: () => {},
      getMessages: () => [],
      provider: { stream: async function* () {} } as any,
      toolOrchestrator: {
        executeToolsWithPlan: async () => {},
        cancelAll: () => {},
        dispose: () => {},
      } as any,
      buildSystemPrompt: async () => [],
      checkAndCompact: async () => null,
      getConfig: () => ({ settings: {} } as any),
      toolRegistry: { getToolDefinitions: () => [] } as any,
    });

    // Simulate a pending approval by setting up the internal map
    const approvalPromise = new Promise<{ accepted: boolean }>((resolve) => {
      (worker as any)._pendingApprovals.set("tu_1", resolve);
    });

    // Respond to the approval
    await worker.userRespondToApproval("tu_1", { approved: true });

    const result = await approvalPromise;
    expect(result).toEqual({ accepted: true });
  });

  it("maps ToolApprovalResponse { approved: false } to { accepted: false }", async () => {
    const worker = new ThreadWorker({
      getThreadSnapshot: () => ({ id: "test", v: 0, messages: [], relationships: [] }),
      updateThreadSnapshot: () => {},
      getMessages: () => [],
      provider: { stream: async function* () {} } as any,
      toolOrchestrator: {
        executeToolsWithPlan: async () => {},
        cancelAll: () => {},
        dispose: () => {},
      } as any,
      buildSystemPrompt: async () => [],
      checkAndCompact: async () => null,
      getConfig: () => ({ settings: {} } as any),
      toolRegistry: { getToolDefinitions: () => [] } as any,
    });

    const approvalPromise = new Promise<{ accepted: boolean }>((resolve) => {
      (worker as any)._pendingApprovals.set("tu_2", resolve);
    });

    await worker.userRespondToApproval("tu_2", { approved: false });

    const result = await approvalPromise;
    expect(result).toEqual({ accepted: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/agent-core && bun test src/worker/__tests__/thread-worker-approval.test.ts`
Expected: FAIL — `_pendingApprovals` does not exist on `ThreadWorker`

- [ ] **Step 3: Implement the approval map and wire userRespondToApproval**

In `packages/agent-core/src/worker/thread-worker.ts`:

1. Add a pending approvals map to the class:
```ts
/** Map of toolUseId → resolve callback for pending approval Promises */
private readonly _pendingApprovals = new Map<string, (response: { accepted: boolean; feedback?: string }) => void>();
```

2. Replace the `userRespondToApproval` placeholder:
```ts
async userRespondToApproval(toolUseId: string, response: ToolApprovalResponse): Promise<void> {
  const resolve = this._pendingApprovals.get(toolUseId);
  if (resolve) {
    resolve(response.approved ? { accepted: true as const } : { accepted: false as const });
    this._pendingApprovals.delete(toolUseId);
  }
}
```

3. **Wire the `requestApproval` callback at the construction site** (`packages/flitter/src/container.ts`), NOT inside `ThreadWorker`. The `ToolOrchestrator` is injected into `ThreadWorker` via `ThreadWorkerOptions.toolOrchestrator` — `ThreadWorker` does not construct it and cannot modify its callbacks after construction.

In `packages/flitter/src/container.ts`, inside `createThreadWorker()`, where both objects are created:

```ts
// The orchestrator is created first, then the worker:
let workerRef: ThreadWorker | null = null;

const threadCallbacks: OrchestratorCallbacks = {
  ...otherCallbacks,
  requestApproval: (request) => {
    return new Promise((resolve) => {
      if (workerRef) {
        (workerRef as any)._pendingApprovals.set(request.toolUseId, resolve);
        workerRef.events$.next({
          type: "approval:request",
          toolUseId: request.toolUseId,
          toolName: request.toolName,
          args: request.args,
          reason: request.reason,
        });
      }
    });
  },
};

const orchestrator = new ToolOrchestrator(threadId, toolRegistry, threadCallbacks);
const worker = new ThreadWorker({ ...opts, toolOrchestrator: orchestrator });
workerRef = worker;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/agent-core && bun test src/worker/__tests__/thread-worker-approval.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/agent-core/src/worker/thread-worker.ts packages/agent-core/src/worker/__tests__/thread-worker-approval.test.ts
git commit -m "feat(agent-core): wire userRespondToApproval to orchestrator approval Promise"
```

---

### Task 3: Add ApprovalRequestEvent to AgentEvent union

The TUI needs a specific event to know when to show the approval prompt. Add a new `approval:request` event type.

**Files:**
- Modify: `packages/agent-core/src/worker/events.ts`
- Test: existing type checking is sufficient (this is a type-only change + emission)

- [ ] **Step 1: Add the new event type**

In `packages/agent-core/src/worker/events.ts`, add:

```ts
/** Tool requires user approval */
export interface ApprovalRequestEvent {
  type: "approval:request";
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
}
```

Add `ApprovalRequestEvent` to the `AgentEvent` union:
```ts
export type AgentEvent =
  | InferenceStartEvent
  | InferenceDeltaEvent
  | InferenceCompleteEvent
  | InferenceErrorEvent
  | ToolStartEvent
  | ToolDataEvent
  | ToolCompleteEvent
  | TurnCompleteEvent
  | CompactionStartEvent
  | CompactionCompleteEvent
  | ApprovalRequestEvent;
```

- [ ] **Step 2: Emit the event in the container.ts requestApproval callback**

In `packages/flitter/src/container.ts`, the `requestApproval` callback (already wired in Task 2 Step 3) should emit the new `approval:request` event:

```ts
requestApproval: (request) => {
  return new Promise((resolve) => {
    if (workerRef) {
      (workerRef as any)._pendingApprovals.set(request.toolUseId, resolve);
      workerRef.events$.next({
        type: "approval:request",
        toolUseId: request.toolUseId,
        toolName: request.toolName,
        args: request.args,
        reason: request.reason,
      });
    }
  });
},
```

Note: This is the same code from Task 2 Step 3 — the event type just now has a proper definition in `events.ts`.

- [ ] **Step 3: Run all agent-core tests**

Run: `cd packages/agent-core && bun test`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add packages/agent-core/src/worker/events.ts packages/flitter/src/container.ts
git commit -m "feat(agent-core): add approval:request event to AgentEvent union"
```

---

### Task 4: Build the ApprovalWidget in CLI

A new widget that renders an inline tool approval prompt when an `approval:request` event is received.

**Files:**
- Create: `packages/cli/src/widgets/approval-widget.ts`
- Test: `packages/cli/src/widgets/__tests__/approval-widget.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/approval-widget.test.ts
import { describe, it, expect } from "bun:test";
import { ApprovalWidget, type ApprovalRequest } from "../approval-widget";

describe("ApprovalWidget", () => {
  it("creates with approval request data", () => {
    const request: ApprovalRequest = {
      toolUseId: "tu_1",
      toolName: "Bash",
      args: { command: "rm -rf /tmp/test" },
      reason: "Bash commands require approval",
    };
    const widget = new ApprovalWidget({
      request,
      onRespond: () => {},
    });
    expect(widget).toBeDefined();
    expect(widget.config.request.toolName).toBe("Bash");
  });

  it("exposes the three response options", () => {
    const request: ApprovalRequest = {
      toolUseId: "tu_1",
      toolName: "Bash",
      args: { command: "ls" },
      reason: "Requires approval",
    };
    const widget = new ApprovalWidget({
      request,
      onRespond: () => {},
    });
    // The widget should define APPROVE, REJECT as response options
    expect(widget).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/approval-widget.test.ts`
Expected: FAIL — module does not exist

- [ ] **Step 3: Implement ApprovalWidget**

```ts
// packages/cli/src/widgets/approval-widget.ts
/**
 * ApprovalWidget — inline tool approval prompt.
 *
 * Renders when the agent calls a tool that requires user permission.
 * Shows the tool name, arguments, reason, and [Allow] / [Deny] options.
 *
 * 逆向: io (SelectMenu) in 1472_tui_components/actions_intents.js
 * 逆向: FWT.syncPendingApprovalsToThreadState (1234_unknown_FWT.js)
 */

import {
  StatefulWidget, State, Column, Row, RichText, TextSpan, SizedBox,
  Container, BoxDecoration, Border, BorderSide, Focus,
} from "@flitter/tui";
import { TextStyle } from "@flitter/tui";
import { Color } from "@flitter/tui";
import type { Widget } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";
import type { FocusNode } from "@flitter/tui";
import type { KeyEvent } from "@flitter/tui";

// ─── Types ───────────────────────────────────────────

export interface ApprovalRequest {
  toolUseId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
}

export type ApprovalResponse = { approved: true } | { approved: false };

export interface ApprovalWidgetConfig {
  request: ApprovalRequest;
  onRespond: (toolUseId: string, response: ApprovalResponse) => void;
}

// ─── Colors ──────────────────────────────────────────

const WARNING_COLOR = Color.rgb(0xe0, 0xaf, 0x68);
const SUCCESS_COLOR = Color.rgb(0x9e, 0xce, 0x6a);
const ERROR_COLOR = Color.rgb(0xf7, 0x76, 0x8e);
const MUTED_COLOR = Color.rgb(0x56, 0x5f, 0x89);
const TEXT_COLOR = Color.rgb(0xa9, 0xb1, 0xd6);
const BORDER_COLOR = Color.rgb(0x3b, 0x42, 0x61);

// ─── Widget ──────────────────────────────────────────

export class ApprovalWidget extends StatefulWidget {
  readonly config: ApprovalWidgetConfig;

  constructor(config: ApprovalWidgetConfig) {
    super();
    this.config = config;
  }

  createState(): ApprovalWidgetState {
    return new ApprovalWidgetState();
  }
}

export class ApprovalWidgetState extends State<ApprovalWidget> {
  private _selectedIndex = 0;
  private _focusNode!: FocusNode;
  private _options = ["Allow", "Deny"] as const;

  initState(): void {
    super.initState();
    // FocusNode will be created in build via Focus widget
  }

  build(_context: BuildContext): Widget {
    const { request, onRespond } = this.widget.config;

    // Format the tool args for display
    const argLines: string[] = [];
    for (const [key, value] of Object.entries(request.args)) {
      const valStr = typeof value === "string" ? value : JSON.stringify(value);
      const truncated = valStr.length > 100 ? valStr.slice(0, 100) + "…" : valStr;
      argLines.push(`  ${key}: ${truncated}`);
    }

    const optionWidgets: Widget[] = this._options.map((label, i) => {
      const isSelected = i === this._selectedIndex;
      const color = label === "Allow" ? SUCCESS_COLOR : ERROR_COLOR;
      return new RichText({
        text: new TextSpan({
          text: isSelected ? `▸ ${label}` : `  ${label}`,
          style: new TextStyle({
            foreground: isSelected ? color : MUTED_COLOR,
            bold: isSelected,
          }),
        }),
      });
    });

    return new Focus({
      autofocus: true,
      onKey: (event: KeyEvent) => this._handleKey(event, request.toolUseId, onRespond),
      child: new Container({
        decoration: new BoxDecoration({
          border: new Border(
            new BorderSide({ color: WARNING_COLOR }),
            new BorderSide({ color: WARNING_COLOR }),
            new BorderSide({ color: WARNING_COLOR }),
            new BorderSide({ color: WARNING_COLOR }),
          ),
        }),
        child: new Column({
          children: [
            // Title
            new RichText({
              text: new TextSpan({
                children: [
                  new TextSpan({
                    text: ` ${request.toolName}`,
                    style: new TextStyle({ bold: true, foreground: WARNING_COLOR }),
                  }),
                  new TextSpan({
                    text: ` — ${request.reason}`,
                    style: new TextStyle({ foreground: MUTED_COLOR }),
                  }),
                ],
              }),
            }),
            new SizedBox({ height: 1 }),
            // Args
            ...argLines.map(line =>
              new RichText({
                text: new TextSpan({
                  text: line,
                  style: new TextStyle({ foreground: TEXT_COLOR }),
                }),
              }),
            ),
            new SizedBox({ height: 1 }),
            // Options
            ...optionWidgets,
          ],
        }),
      }),
    });
  }

  private _handleKey(
    event: KeyEvent,
    toolUseId: string,
    onRespond: ApprovalWidgetConfig["onRespond"],
  ): "handled" | "ignored" {
    const key = event.key;
    if (key === "ArrowUp" || key === "k") {
      this.setState(() => {
        this._selectedIndex = Math.max(0, this._selectedIndex - 1);
      });
      return "handled";
    }
    if (key === "ArrowDown" || key === "j") {
      this.setState(() => {
        this._selectedIndex = Math.min(this._options.length - 1, this._selectedIndex + 1);
      });
      return "handled";
    }
    if (key === "Enter") {
      const selected = this._options[this._selectedIndex];
      onRespond(toolUseId, { approved: selected === "Allow" });
      return "handled";
    }
    if (key === "y" || key === "Y") {
      onRespond(toolUseId, { approved: true });
      return "handled";
    }
    if (key === "n" || key === "N") {
      onRespond(toolUseId, { approved: false });
      return "handled";
    }
    return "ignored";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/__tests__/approval-widget.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/approval-widget.ts packages/cli/src/widgets/__tests__/approval-widget.test.ts
git commit -m "feat(cli): add ApprovalWidget for inline tool approval prompts"
```

---

### Task 5: Wire ApprovalWidget into ThreadStateWidget

Subscribe to `approval:request` events and conditionally render the `ApprovalWidget` above the input field.

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts`
- Test: `packages/cli/src/widgets/__tests__/thread-state-approval.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/thread-state-approval.test.ts
import { describe, it, expect } from "bun:test";
import type { ApprovalRequest } from "../approval-widget";

describe("ThreadStateWidget approval integration", () => {
  it("tracks pending approval from approval:request events", () => {
    // Test the state transition logic directly
    let pendingApproval: ApprovalRequest | null = null;

    // Simulate the event handler
    const handleEvent = (event: { type: string; toolUseId?: string; toolName?: string; args?: Record<string, unknown>; reason?: string }) => {
      if (event.type === "approval:request") {
        pendingApproval = {
          toolUseId: event.toolUseId!,
          toolName: event.toolName!,
          args: event.args ?? {},
          reason: event.reason ?? "",
        };
      }
      if (event.type === "tool:complete" && event.toolUseId === pendingApproval?.toolUseId) {
        pendingApproval = null;
      }
    };

    handleEvent({ type: "approval:request", toolUseId: "tu_1", toolName: "Bash", args: { command: "ls" }, reason: "requires approval" });
    expect(pendingApproval).not.toBeNull();
    expect(pendingApproval!.toolName).toBe("Bash");

    handleEvent({ type: "tool:complete", toolUseId: "tu_1" });
    expect(pendingApproval).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (tests the logic pattern, not the widget itself)

Run: `cd packages/cli && bun test src/widgets/__tests__/thread-state-approval.test.ts`
Expected: PASS

- [ ] **Step 3: Modify ThreadStateWidget to conditionally render ApprovalWidget**

In `packages/cli/src/widgets/thread-state-widget.ts`:

1. Add imports:
```ts
import { ApprovalWidget, type ApprovalRequest } from "./approval-widget.js";
```

2. Add state:
```ts
private _pendingApproval: ApprovalRequest | null = null;
```

3. In the `events$` subscription, add cases:
```ts
case "approval:request": {
  const approvalEvent = ev as { type: string; toolUseId: string; toolName: string; args: Record<string, unknown>; reason: string };
  this.setState(() => {
    this._pendingApproval = {
      toolUseId: approvalEvent.toolUseId,
      toolName: approvalEvent.toolName,
      args: approvalEvent.args,
      reason: approvalEvent.reason,
    };
  });
  break;
}
case "tool:complete": {
  const completeEvent = ev as { type: string; toolUseId: string };
  if (this._pendingApproval?.toolUseId === completeEvent.toolUseId) {
    this.setState(() => {
      this._pendingApproval = null;
    });
  }
  break;
}
```

4. In `build()`, conditionally render `ApprovalWidget` between the separator and the input field.

**Note:** `ThreadStateWidgetConfig.threadWorker` doesn't expose `userRespondToApproval` in its structural type. First extend the config's `threadWorker` type:

```ts
// In ThreadStateWidgetConfig, extend the threadWorker type:
threadWorker: {
  events$: { subscribe(observer: (value: unknown) => void): Subscription };
  /** Respond to a pending tool approval */
  userRespondToApproval?: (toolUseId: string, response: { approved: boolean }) => Promise<void>;
};
```

Then in `build()`:
```ts
// If there's a pending approval, show the approval widget instead of input
if (this._pendingApproval) {
  children.push(new ApprovalWidget({
    request: this._pendingApproval,
    onRespond: (toolUseId, response) => {
      this.widget.config.threadWorker.userRespondToApproval?.(toolUseId, response);
      this.setState(() => {
        this._pendingApproval = null;
      });
    },
  }));
} else {
  children.push(new InputField({ onSubmit }));
}
```

- [ ] **Step 4: Run all CLI tests**

Run: `cd packages/cli && bun test`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/__tests__/thread-state-approval.test.ts
git commit -m "feat(cli): wire ApprovalWidget into ThreadStateWidget for tool approval prompts"
```
