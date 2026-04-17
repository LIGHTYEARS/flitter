# Live Status Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the static StatusBar (model name + hardcoded 0 tokens) into a live status bar that shows inference state, live token counts, compaction state, and context usage warnings — matching amp's `yB()` state machine.

**Architecture:** Replace `StatusBarConfig` with a richer `StatusBarState` model driven by `ThreadWorker.events$` and `ContextManager.compactionState$`. The `ThreadStateWidget` derives this state from events and passes it down. The `StatusBar` widget renders the highest-priority status message using a priority-ordered if-chain matching amp's `yB()` function.

**Tech Stack:** TypeScript, `@flitter/tui` (StatelessWidget, Row, Expanded, RichText, TextSpan, Padding), `@flitter/agent-core` (AgentEvent, InferenceState)

**amp reference files:**
- `amp-cli-reversed/modules/2731_unknown_yB.js` — status bar content state machine (10+ state mappings)
- `amp-cli-reversed/modules/2613_unknown_AB.js` — threadViewState derivation

**Prerequisite:** Plan 1 (tool events emitted) should be complete for full tool-running status.

---

### Task 1: Define StatusBarState model

Replace the flat `StatusBarConfig` with a richer state model that captures all the states amp supports.

**Files:**
- Modify: `packages/cli/src/widgets/status-bar.ts`
- Test: `packages/cli/src/widgets/__tests__/status-bar-state.test.ts`

- [ ] **Step 1: Write failing tests for status message derivation**

```ts
// packages/cli/src/widgets/__tests__/status-bar-state.test.ts
import { describe, it, expect } from "bun:test";
import { deriveStatusMessage, type StatusBarState } from "../status-bar";

describe("deriveStatusMessage", () => {
  it('returns "Streaming response..." when inference running and streaming started', () => {
    const state: StatusBarState = {
      modelName: "claude-sonnet",
      inferenceState: "running",
      hasStartedStreaming: true,
      tokenUsage: { inputTokens: 1000, outputTokens: 200, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    };
    expect(deriveStatusMessage(state)).toBe("Streaming response...");
  });

  it('returns "Waiting for response..." when inference running but no streaming', () => {
    const state: StatusBarState = {
      modelName: "claude-sonnet",
      inferenceState: "running",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 0, outputTokens: 0, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    };
    expect(deriveStatusMessage(state)).toBe("Waiting for response...");
  });

  it('returns "Waiting for approval..." when waiting for approval', () => {
    const state: StatusBarState = {
      modelName: "claude-sonnet",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 0, outputTokens: 0, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: true,
    };
    expect(deriveStatusMessage(state)).toBe("Waiting for approval...");
  });

  it('returns "Running N tools..." when multiple tools running', () => {
    const state: StatusBarState = {
      modelName: "claude-sonnet",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 0, outputTokens: 0, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 3,
      waitingForApproval: false,
    };
    expect(deriveStatusMessage(state)).toBe("Running 3 tools...");
  });

  it('returns "Running tools..." when 1 tool running', () => {
    const state: StatusBarState = {
      modelName: "claude-sonnet",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 0, outputTokens: 0, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 1,
      waitingForApproval: false,
    };
    expect(deriveStatusMessage(state)).toBe("Running tools...");
  });

  it('returns "Auto-compacting..." when compacting', () => {
    const state: StatusBarState = {
      modelName: "claude-sonnet",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 0, outputTokens: 0, maxInputTokens: 200000 },
      compactionState: "compacting",
      runningToolCount: 0,
      waitingForApproval: false,
    };
    expect(deriveStatusMessage(state)).toBe("Auto-compacting...");
  });

  it('returns "Cancelled" when inference cancelled', () => {
    const state: StatusBarState = {
      modelName: "claude-sonnet",
      inferenceState: "cancelled",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 0, outputTokens: 0, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    };
    expect(deriveStatusMessage(state)).toBe("Cancelled");
  });

  it('returns context warning at danger threshold', () => {
    const state: StatusBarState = {
      modelName: "claude-sonnet",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 185000, outputTokens: 0, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    };
    expect(deriveStatusMessage(state)).toBe("Context near full.");
  });

  it("returns null when idle with low context usage", () => {
    const state: StatusBarState = {
      modelName: "claude-sonnet",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 1000, outputTokens: 200, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    };
    expect(deriveStatusMessage(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/__tests__/status-bar-state.test.ts`
Expected: FAIL — `deriveStatusMessage` and `StatusBarState` do not exist

- [ ] **Step 3: Implement StatusBarState and deriveStatusMessage**

In `packages/cli/src/widgets/status-bar.ts`, add:

```ts
// ─── StatusBarState ──────────────────────────────────

/**
 * Rich status bar state.
 * 逆向: yB() input shape (2731_unknown_yB.js)
 */
export interface StatusBarState {
  modelName: string;
  inferenceState: "idle" | "running" | "cancelled";
  hasStartedStreaming: boolean;
  tokenUsage: { inputTokens: number; outputTokens: number; maxInputTokens: number };
  compactionState: "idle" | "compacting";
  runningToolCount: number;
  waitingForApproval: boolean;
}

// ─── Context thresholds (逆向: GN0/KN0 in yB.js) ────

const CONTEXT_RECOMMENDATION = 0.6;
const CONTEXT_WARNING = 0.8;
const CONTEXT_DANGER = 0.9;

/**
 * Derive the status message from state.
 * Priority-ordered if-chain matching amp's yB().
 * 逆向: yB (2731_unknown_yB.js)
 */
export function deriveStatusMessage(state: StatusBarState): string | null {
  if (state.compactionState === "compacting") {
    return "Auto-compacting...";
  }
  if (state.waitingForApproval) {
    return "Waiting for approval...";
  }
  if (state.runningToolCount > 1) {
    return `Running ${state.runningToolCount} tools...`;
  }
  if (state.runningToolCount === 1) {
    return "Running tools...";
  }
  if (state.inferenceState === "running" && !state.hasStartedStreaming) {
    return "Waiting for response...";
  }
  if (state.inferenceState === "running" && state.hasStartedStreaming) {
    return "Streaming response...";
  }
  if (state.inferenceState === "cancelled") {
    return "Cancelled";
  }
  // Context warnings (only when idle)
  if (state.inferenceState === "idle" && state.tokenUsage.maxInputTokens > 0) {
    const ratio = state.tokenUsage.inputTokens / state.tokenUsage.maxInputTokens;
    if (ratio >= CONTEXT_DANGER) return "Context near full.";
    if (ratio >= CONTEXT_WARNING) return "High context usage.";
    if (ratio >= CONTEXT_RECOMMENDATION) return "Optimize context.";
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/__tests__/status-bar-state.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/status-bar.ts packages/cli/src/widgets/__tests__/status-bar-state.test.ts
git commit -m "feat(cli): add StatusBarState model and deriveStatusMessage state machine"
```

---

### Task 2: Rewrite StatusBar widget to render StatusBarState

Replace the old `StatusBarConfig` rendering with the new `StatusBarState` rendering that includes a center status message with color coding.

**Files:**
- Modify: `packages/cli/src/widgets/status-bar.ts`
- Test: `packages/cli/src/widgets/status-bar.test.ts` (update existing tests)

- [ ] **Step 1: Update existing StatusBar tests**

Update `packages/cli/src/widgets/status-bar.test.ts` to test with `StatusBarState`:

```ts
import { describe, it, expect } from "bun:test";
import { StatusBar, type StatusBarState } from "../status-bar";

describe("StatusBar", () => {
  it("creates with StatusBarState", () => {
    const state: StatusBarState = {
      modelName: "claude-sonnet-4-20250514",
      inferenceState: "idle",
      hasStartedStreaming: false,
      tokenUsage: { inputTokens: 1234, outputTokens: 100, maxInputTokens: 200000 },
      compactionState: "idle",
      runningToolCount: 0,
      waitingForApproval: false,
    };
    const bar = new StatusBar({ state });
    expect(bar).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && bun test src/widgets/status-bar.test.ts`
Expected: FAIL — `StatusBar` still expects old `StatusBarConfig`

- [ ] **Step 3: Rewrite StatusBar.build() to use StatusBarState**

In `packages/cli/src/widgets/status-bar.ts`:

1. Change the config type:
```ts
export interface StatusBarConfig {
  state: StatusBarState;
}
```

2. Rewrite `build()`:
```ts
build(_context: BuildContext): Widget {
  const { state } = this.config;
  const totalTokens = state.tokenUsage.inputTokens + state.tokenUsage.outputTokens;
  const statusMsg = deriveStatusMessage(state);

  const WARNING_COLOR = Color.rgb(0xe0, 0xaf, 0x68);
  const DANGER_COLOR = Color.rgb(0xf7, 0x76, 0x8e);
  const mutedStyle = new TextStyle({ foreground: MUTED_TEXT_COLOR });

  // Status message color
  let statusStyle = mutedStyle;
  if (statusMsg === "Context near full.") {
    statusStyle = new TextStyle({ foreground: DANGER_COLOR, bold: true });
  } else if (statusMsg === "High context usage.") {
    statusStyle = new TextStyle({ foreground: WARNING_COLOR });
  }

  const children: Widget[] = [
    // Left: model name
    new RichText({
      text: new TextSpan({ text: state.modelName, style: mutedStyle }),
    }),
  ];

  if (statusMsg) {
    children.push(
      new Expanded({ child: new SizedBox({ width: 0, height: 1 }) }),
      new RichText({
        text: new TextSpan({ text: statusMsg, style: statusStyle }),
      }),
      new Expanded({ child: new SizedBox({ width: 0, height: 1 }) }),
    );
  } else {
    children.push(
      new Expanded({ child: new SizedBox({ width: 0, height: 1 }) }),
    );
  }

  // Right: token count
  children.push(
    new RichText({
      text: new TextSpan({ text: `${totalTokens} tokens`, style: mutedStyle }),
    }),
  );

  return new Padding({
    padding: EdgeInsets.symmetric({ horizontal: 2 }),
    child: new Row({ children }),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && bun test src/widgets/status-bar.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/status-bar.ts packages/cli/src/widgets/status-bar.test.ts
git commit -m "feat(cli): rewrite StatusBar to render live StatusBarState with status messages"
```

---

### Task 3: Drive StatusBarState from ThreadStateWidget

Wire `ThreadStateWidget` to derive `StatusBarState` from `AgentEvent` subscriptions and pass it to `StatusBar`.

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts`
- Modify: `packages/cli/src/modes/interactive.ts` (remove hardcoded tokenCount: 0)

- [ ] **Step 1: Add state tracking fields to ThreadStateWidgetState**

In `packages/cli/src/widgets/thread-state-widget.ts`, add:

```ts
import { deriveStatusMessage, type StatusBarState } from "./status-bar.js";
import type { InferenceState } from "@flitter/agent-core";

// In ThreadStateWidgetState, UPDATE the existing _inferenceState type to include "cancelled":
// (Currently it is `"idle" | "running"` — must be widened to the full InferenceState type)
private _inferenceState: InferenceState = "idle";  // was: "idle" | "running"
private _hasStartedStreaming = false;
private _totalInputTokens = 0;
private _totalOutputTokens = 0;
private _runningToolCount = 0;
private _waitingForApproval = false;
private _compactionState: "idle" | "compacting" = "idle";
```

- [ ] **Step 2: Subscribe to all relevant events**

Update the `events$` subscription to track these fields:

**Note:** `inference:complete` is defined in `events.ts` but is NOT currently emitted by `ThreadWorker.runInference()` — only `turn:complete` is emitted. Plan 1 (Tool Activity Rendering) must wire tool events first, or you must add `inference:complete` emission inside `runInference()` where the stream loop completes (just before the tool-use check). For now, the token counter below handles the case where `inference:complete` is never emitted by keeping tokens at 0.

Also note: the existing event handler currently sets `_inferenceState` to `"idle"` on `turn:complete` and `"running"` on `inference:start`. The `"cancelled"` state comes from `cancelInference()` which changes `inferenceState$` but does NOT emit an event — it uses the BehaviorSubject directly. To track cancellation in the widget, either subscribe to `threadWorker.inferenceState$` (if exposed in the config type) or add a `"inference:cancelled"` event.

```ts
case "inference:start":
  this.setState(() => {
    this._inferenceState = "running";
    this._hasStartedStreaming = false;
  });
  break;
case "inference:delta":
  if (!this._hasStartedStreaming) {
    this.setState(() => { this._hasStartedStreaming = true; });
  }
  break;
case "inference:complete": {
  const completeEv = ev as { usage?: { inputTokens: number; outputTokens: number } };
  this.setState(() => {
    this._inferenceState = "idle";
    if (completeEv.usage) {
      this._totalInputTokens += completeEv.usage.inputTokens;
      this._totalOutputTokens += completeEv.usage.outputTokens;
    }
  });
  break;
}
case "tool:start":
  this.setState(() => { this._runningToolCount++; });
  break;
case "tool:complete":
  this.setState(() => { this._runningToolCount = Math.max(0, this._runningToolCount - 1); });
  break;
case "compaction:start":
  this.setState(() => { this._compactionState = "compacting"; });
  break;
case "compaction:complete":
  this.setState(() => { this._compactionState = "idle"; });
  break;
case "approval:request":
  this.setState(() => { this._waitingForApproval = true; });
  break;
// Clear approval on response (handled in approval widget onRespond)
```

- [ ] **Step 3: Build StatusBarState in build() and pass to StatusBar**

```ts
const statusBarState: StatusBarState = {
  modelName: modelName ?? "unknown",
  inferenceState: this._inferenceState,  // already typed as InferenceState
  hasStartedStreaming: this._hasStartedStreaming,
  tokenUsage: {
    inputTokens: this._totalInputTokens,
    outputTokens: this._totalOutputTokens,
    maxInputTokens: 200000, // TODO: derive from model config
  },
  compactionState: this._compactionState,
  runningToolCount: this._runningToolCount,
  waitingForApproval: this._waitingForApproval,
};

// Replace the old StatusBar instantiation:
new StatusBar({ state: statusBarState }),
```

- [ ] **Step 4: Remove hardcoded tokenCount: 0 from interactive.ts**

In `packages/cli/src/modes/interactive.ts`, remove the `tokenCount: 0` line from the `ThreadStateWidget` config since tokens are now tracked internally.

- [ ] **Step 5: Run all CLI tests**

Run: `cd packages/cli && bun test`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/status-bar.ts packages/cli/src/modes/interactive.ts
git commit -m "feat(cli): drive live StatusBarState from ThreadWorker events"
```
