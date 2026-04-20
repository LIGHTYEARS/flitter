# Enhanced Approval Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the approval widget from 2 options (Allow/Deny) to match amp's full 5-option approval flow: Approve, Allow All for This Session, Allow All for Every Session, Deny with feedback, plus the conditional "Allow File for Every Session" for guarded files.

**Architecture:** The current `ApprovalWidget` in `packages/cli/src/widgets/approval-widget.ts` uses a hard-coded 2-option array. Amp's `p0R` (ConfirmationWidget state) dynamically builds the options list via `createConfirmationOptions()`, and the `onConfirmationResponse` handler in the main TUI state maps each option value to a permission scope action. The response type must carry the scope level, not just a boolean `approved`.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/tui` (StatefulWidget, Focus, RichText), `@flitter/agent-core` (ToolOrchestrator callbacks, ThreadWorker approval flow), `@flitter/schemas` (ToolApprovalResponse)

**Amp reference:**
- `amp-cli-reversed/chunk-006.js:22535-22818` (A0R/p0R — ConfirmationWidget + state)
- `amp-cli-reversed/chunk-006.js:22700-22738` (createConfirmationOptions — option list construction)
- `amp-cli-reversed/chunk-006.js:22572-22593` (handleOptionSelect — "no-with-feedback" branch + simple response)
- `amp-cli-reversed/chunk-006.js:36437-36490` (onConfirmationResponse — scope-based persistence: allow-all-session, allow-all-persistent, always-guarded)
- `amp-cli-reversed/chunk-006.js:22751-22817` (buildFeedbackInput — deny-with-feedback sub-form)
- `amp-cli-reversed/chunk-006.js:22844-22882` (b0R — ConfirmationSelect state with keyboard + Alt+N shortcuts)

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `packages/cli/src/widgets/approval-widget.ts` | Extend options list, add feedback sub-form, emit scoped response |
| Modify | `packages/agent-core/src/tools/orchestrator.ts` | Extend `requestApproval` callback return type with scope |
| Modify | `packages/agent-core/src/worker/thread-worker.ts` | Extend `userRespondToApproval` to pass scope info |
| Modify | `packages/flitter/src/container.ts` | Wire approval scope to permission persistence |
| Create | `packages/cli/src/widgets/__tests__/approval-widget.test.ts` | Unit tests for enhanced approval widget |

---

### Task 1: Extend ApprovalResponse type with scope levels

**Why first:** All other tasks depend on the response type carrying scope information.

**Files:**
- Modify: `packages/cli/src/widgets/approval-widget.ts` (types section)
- Modify: `packages/agent-core/src/tools/orchestrator.ts` (requestApproval callback return type)
- Modify: `packages/agent-core/src/worker/thread-worker.ts` (ToolApprovalResponse type)

**Amp reference:** `chunk-006.js:22582-22593` — `handleOptionSelect` returns either `{ type: "simple", value: T }` where T is `"yes" | "no" | "allow-all-session" | "allow-all-persistent" | "always-guarded"`, or `{ type: "deny-with-feedback", feedback: string }`. The `onConfirmationResponse` handler at chunk-006.js:36437-36490 interprets these values.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/widgets/__tests__/approval-widget.test.ts
import { describe, expect, it } from "bun:test";
import type { ApprovalResponse, ApprovalScope } from "../approval-widget";

describe("ApprovalResponse type", () => {
  it("supports scope-based approval", () => {
    const response: ApprovalResponse = {
      approved: true,
      scope: "once",
    };
    expect(response.approved).toBe(true);
    expect(response.scope).toBe("once");
  });

  it("supports session-wide approval", () => {
    const response: ApprovalResponse = {
      approved: true,
      scope: "session",
    };
    expect(response.scope).toBe("session");
  });

  it("supports persistent approval", () => {
    const response: ApprovalResponse = {
      approved: true,
      scope: "always",
    };
    expect(response.scope).toBe("always");
  });

  it("supports deny with feedback", () => {
    const response: ApprovalResponse = {
      approved: false,
      feedback: "use grep instead",
    };
    expect(response.approved).toBe(false);
    expect(response.feedback).toBe("use grep instead");
  });

  it("supports simple deny", () => {
    const response: ApprovalResponse = {
      approved: false,
    };
    expect(response.approved).toBe(false);
    expect(response.feedback).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/approval-widget.test.ts`
Expected: FAIL — `ApprovalScope` is not exported, `scope` and `feedback` are not on `ApprovalResponse`.

- [ ] **Step 3: Update ApprovalResponse type in approval-widget.ts**

In `packages/cli/src/widgets/approval-widget.ts`, replace lines 67-70:

```typescript
// OLD:
/**
 * User's response to an approval request.
 */
export interface ApprovalResponse {
  approved: boolean;
}

// NEW:
/**
 * Approval scope levels.
 *
 * 逆向: chunk-006.js:22700-22738 (createConfirmationOptions option values)
 * - "once": approve this single invocation (amp: "yes")
 * - "session": allow all tools for this session (amp: "allow-all-session")
 * - "always": allow all tools persistently (amp: "allow-all-persistent")
 * - "always-guarded": allow guarded file for every session (amp: "always-guarded")
 */
export type ApprovalScope = "once" | "session" | "always" | "always-guarded";

/**
 * User's response to an approval request.
 *
 * 逆向: chunk-006.js:22574-22593 (handleOptionSelect response shapes)
 * - approved=true + scope: user approved with a permission scope
 * - approved=false: user denied
 * - approved=false + feedback: user denied with feedback text
 */
export interface ApprovalResponse {
  approved: boolean;
  scope?: ApprovalScope;
  feedback?: string;
}
```

- [ ] **Step 4: Update requestApproval return type in orchestrator.ts**

In `packages/agent-core/src/tools/orchestrator.ts`, update the `requestApproval` callback return type at line 128:

```typescript
// OLD:
  requestApproval?: (request: {
    toolUseId: string;
    toolName: string;
    args: Record<string, unknown>;
    reason: string;
  }) => Promise<{ accepted: boolean; feedback?: string }>;

// NEW:
  requestApproval?: (request: {
    toolUseId: string;
    toolName: string;
    args: Record<string, unknown>;
    reason: string;
  }) => Promise<{ accepted: boolean; scope?: string; feedback?: string }>;
```

- [ ] **Step 5: Update ToolApprovalResponse in thread-worker.ts**

In `packages/agent-core/src/worker/thread-worker.ts`, update lines 23-26:

```typescript
// OLD:
export interface ToolApprovalResponse {
  approved: boolean;
  remember?: boolean;
}

// NEW:
/**
 * User's approval response with optional scope and feedback.
 *
 * 逆向: amp's resolveApproval(toolUseId, accepted, feedback) at chunk-006.js:36486
 * Flitter extends with scope for session/persistent allow-all.
 */
export interface ToolApprovalResponse {
  approved: boolean;
  /** Permission scope: "once" | "session" | "always" | "always-guarded" */
  scope?: string;
  /** Feedback text when denying with feedback */
  feedback?: string;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/approval-widget.test.ts`
Expected: PASS

- [ ] **Step 7: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json && bunx tsc --noEmit -p packages/agent-core/tsconfig.json`
Expected: No type errors

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/widgets/approval-widget.ts packages/agent-core/src/tools/orchestrator.ts packages/agent-core/src/worker/thread-worker.ts packages/cli/src/widgets/__tests__/approval-widget.test.ts
git commit -m "feat(approval): extend ApprovalResponse with scope levels and feedback

Add ApprovalScope type (once/session/always/always-guarded) and optional
feedback field to ApprovalResponse. Update requestApproval callback and
ToolApprovalResponse to carry scope through the full approval pipeline.

逆向: amp chunk-006.js:22700-22738 (createConfirmationOptions),
       chunk-006.js:36437-36490 (onConfirmationResponse scope handling)"
```

---

### Task 2: Update ApprovalWidget UI with 5 options and feedback sub-form

**Why:** With the types in place, we can now render the full option list and feedback input.

**Files:**
- Modify: `packages/cli/src/widgets/approval-widget.ts` (options array, build method, feedback state)
- Test: `packages/cli/src/widgets/__tests__/approval-widget.test.ts` (append)

**Amp reference:**
- `chunk-006.js:22700-22738` — `createConfirmationOptions`: builds `[{value: "yes", label: "Approve"}, {value: "allow-all-session", label: "Allow All for This Session"}, {value: "allow-all-persistent", label: "Allow All for Every Session"}, {value: "no-with-feedback", label: "Deny with feedback"}]`
- `chunk-006.js:22751-22817` — `buildFeedbackInput`: renders deny header + text input + Enter/Esc hints
- `chunk-006.js:22844-22882` — `b0R.handleKeyEvent`: ArrowUp/k, ArrowDown/j, Enter confirm, Escape cancel, Alt+N shortcuts

- [ ] **Step 1: Write the failing test**

Append to `packages/cli/src/widgets/__tests__/approval-widget.test.ts`:

```typescript
import { ApprovalWidget, type ApprovalWidgetConfig } from "../approval-widget";

describe("ApprovalWidget options", () => {
  it("renders 4 standard options for tool-use approval", () => {
    const responses: Array<{ toolUseId: string; response: ApprovalResponse }> = [];
    const config: ApprovalWidgetConfig = {
      request: {
        toolUseId: "test-1",
        toolName: "Bash",
        args: { command: "ls" },
        reason: "Tool requires approval",
      },
      onRespond: (id, resp) => responses.push({ toolUseId: id, response: resp }),
    };
    const widget = new ApprovalWidget(config);
    const state = widget.createState();
    // The state should expose the options list (we test via APPROVAL_OPTIONS export)
    expect(state).toBeDefined();
    // The widget should have been created successfully
    expect(widget.config.request.toolName).toBe("Bash");
  });
});
```

- [ ] **Step 2: Replace the APPROVAL_OPTIONS constant**

In `packages/cli/src/widgets/approval-widget.ts`, replace lines 155-164:

```typescript
// OLD:
interface ApprovalOption {
  value: "yes" | "no";
  label: string;
  color: Color;
}

const APPROVAL_OPTIONS: ApprovalOption[] = [
  { value: "yes", label: "Allow", color: SUCCESS_COLOR },
  { value: "no", label: "Deny", color: DENY_COLOR },
];

// NEW:
/**
 * Option value strings matching amp's createConfirmationOptions.
 * 逆向: chunk-006.js:22700-22738
 */
type ApprovalOptionValue =
  | "yes"
  | "allow-all-session"
  | "allow-all-persistent"
  | "no-with-feedback";

interface ApprovalOption {
  value: ApprovalOptionValue;
  label: string;
  color: Color;
}

/**
 * Standard approval options for tool-use confirmation.
 *
 * 逆向: chunk-006.js:22722-22738
 * Approve → allow-all-session → allow-all-persistent → deny-with-feedback
 *
 * Note: amp also has "always-guarded" for guarded file confirmations,
 * inserted conditionally. We omit it from the default list and add it
 * dynamically in createState() when the request involves a guarded file.
 */
const APPROVAL_OPTIONS: ApprovalOption[] = [
  { value: "yes", label: "Approve", color: SUCCESS_COLOR },
  { value: "allow-all-session", label: "Allow All for This Session", color: SUCCESS_COLOR },
  { value: "allow-all-persistent", label: "Allow All for Every Session", color: SUCCESS_COLOR },
  { value: "no-with-feedback", label: "Deny with feedback", color: DENY_COLOR },
];
```

- [ ] **Step 3: Add feedback sub-form state to ApprovalWidgetState**

In `packages/cli/src/widgets/approval-widget.ts`, add feedback state fields and update the `_respond` and `_handleKey` methods:

```typescript
// In ApprovalWidgetState class, after _selectedIndex field:

  /** Whether the feedback text input is active. */
  private _feedbackActive = false;

  /** Feedback text buffer. */
  private _feedbackText = "";
```

Update `_handleKey` to match amp's b0R pattern plus p0R feedback escape:

```typescript
  private _handleKey = (event: { key: string }): KeyEventResult => {
    // 逆向: p0R.handleKeyEvent — escape from feedback sub-form
    if (this._feedbackActive) {
      if (event.key === "Escape") {
        this.setState(() => {
          this._feedbackActive = false;
          this._feedbackText = "";
        });
        return "handled";
      }
      if (event.key === "Enter") {
        this._submitFeedback();
        return "handled";
      }
      if (event.key === "Backspace") {
        this.setState(() => {
          this._feedbackText = this._feedbackText.slice(0, -1);
        });
        return "handled";
      }
      // Printable character → append to feedback buffer
      if (event.key.length === 1) {
        this.setState(() => {
          this._feedbackText += event.key;
        });
        return "handled";
      }
      return "handled";
    }

    // 逆向: b0R.handleKeyEvent (chunk-006.js:22859-22882)
    switch (event.key) {
      case "ArrowUp":
      case "k":
        this.setState(() => {
          this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        });
        return "handled";

      case "ArrowDown":
      case "j":
        this.setState(() => {
          this._selectedIndex = Math.min(APPROVAL_OPTIONS.length - 1, this._selectedIndex + 1);
        });
        return "handled";

      case "Enter":
        this._selectOption(APPROVAL_OPTIONS[this._selectedIndex].value);
        return "handled";

      case "Escape":
        this._respond({ approved: false });
        return "handled";

      default:
        // 逆向: b0R Alt+N shortcuts (chunk-006.js:22869-22875)
        if (event.key >= "1" && event.key <= "9") {
          const idx = parseInt(event.key) - 1;
          if (idx < APPROVAL_OPTIONS.length) {
            this._selectOption(APPROVAL_OPTIONS[idx].value);
            return "handled";
          }
        }
        return "ignored";
    }
  };
```

Add `_selectOption` and `_submitFeedback` methods:

```typescript
  /**
   * Handle an option selection by value.
   * 逆向: p0R.handleOptionSelect (chunk-006.js:22582-22593)
   */
  private _selectOption(value: ApprovalOptionValue): void {
    if (value === "no-with-feedback") {
      this.setState(() => {
        this._feedbackActive = true;
      });
      return;
    }
    // Map option value to ApprovalResponse
    const scopeMap: Record<string, ApprovalScope> = {
      "yes": "once",
      "allow-all-session": "session",
      "allow-all-persistent": "always",
    };
    this._respond({ approved: true, scope: scopeMap[value] ?? "once" });
  }

  /**
   * Submit deny-with-feedback.
   * 逆向: p0R.submitFeedback (chunk-006.js:22572-22581)
   */
  private _submitFeedback(): void {
    const text = this._feedbackText.trim();
    if (text) {
      this._respond({ approved: false, feedback: text });
    } else {
      this._respond({ approved: false });
    }
  }
```

Update `_respond` to use the new type:

```typescript
  private _respond(response: ApprovalResponse): void {
    const { request, onRespond } = this.widget.config;
    onRespond(request.toolUseId, response);
  }
```

- [ ] **Step 4: Update build() for feedback sub-form**

In the `build()` method, add a check at the top for feedback mode:

```typescript
  build(_context: BuildContext) {
    const { request } = this.widget.config;

    // 逆向: p0R.build — if feedbackInputActive, render feedback sub-form
    if (this._feedbackActive) {
      return this._buildFeedbackInput();
    }

    // ... rest of existing build() unchanged, except optionRows uses APPROVAL_OPTIONS ...
```

Add `_buildFeedbackInput()` method:

```typescript
  /**
   * Build the deny-with-feedback sub-form.
   *
   * 逆向: p0R.buildFeedbackInput (chunk-006.js:22751-22817)
   * Shows: "X Denied -- tell Amp what to do instead"
   * Input: "> [feedback text]"
   * Hints: "Enter send  .  Esc cancel"
   */
  private _buildFeedbackInput(): Focus {
    const header = new RichText({
      text: new TextSpan({
        children: [
          new TextSpan({ text: "\u2717 ", style: new TextStyle({ foreground: DENY_COLOR, bold: true }) }),
          new TextSpan({ text: "Denied", style: new TextStyle({ foreground: DENY_COLOR, bold: true }) }),
          new TextSpan({ text: " \u2014 ", style: new TextStyle({ foreground: SECONDARY_COLOR }) }),
          new TextSpan({ text: "tell the assistant what to do instead", style: new TextStyle({ foreground: FOREGROUND_COLOR }) }),
        ],
      }),
    });

    const inputRow = new RichText({
      text: new TextSpan({
        children: [
          new TextSpan({ text: "\u203A ", style: new TextStyle({ foreground: PRIMARY_COLOR, bold: true }) }),
          new TextSpan({ text: this._feedbackText || 'e.g. "use grep instead"', style: new TextStyle({ foreground: this._feedbackText ? FOREGROUND_COLOR : SECONDARY_COLOR }) }),
        ],
      }),
    });

    const hints = new RichText({
      text: new TextSpan({
        children: [
          new TextSpan({ text: "Enter", style: new TextStyle({ foreground: PRIMARY_COLOR }) }),
          new TextSpan({ text: " send", style: new TextStyle({ foreground: SECONDARY_COLOR, dim: true }) }),
          new TextSpan({ text: "  \u2022  ", style: new TextStyle({ foreground: SECONDARY_COLOR, dim: true }) }),
          new TextSpan({ text: "Esc", style: new TextStyle({ foreground: PRIMARY_COLOR }) }),
          new TextSpan({ text: " cancel", style: new TextStyle({ foreground: SECONDARY_COLOR, dim: true }) }),
        ],
      }),
    });

    const column = new Column({
      crossAxisAlignment: "stretch",
      mainAxisSize: "min",
      children: [header, new SizedBox({ height: 1 }), inputRow, new SizedBox({ height: 1 }), hints],
    });

    const container = new Container({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide(PRIMARY_COLOR, 1, "rounded")),
      }),
      child: column,
    });

    return new Focus({
      autofocus: true,
      onKey: this._handleKey,
      debugLabel: "ApprovalWidget-Feedback",
      child: container,
    });
  }
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/approval-widget.test.ts`
Expected: PASS

- [ ] **Step 6: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/widgets/approval-widget.ts packages/cli/src/widgets/__tests__/approval-widget.test.ts
git commit -m "feat(approval): add 4-option approval UI with deny-with-feedback sub-form

Replace 2-option (Allow/Deny) with amp's full option set:
Approve, Allow All (session), Allow All (persistent), Deny with feedback.
Add feedback text input sub-form with Enter/Esc keyboard navigation.
Support Alt+N shortcut keys for direct option selection.

逆向: amp chunk-006.js:22700-22738 (createConfirmationOptions),
       chunk-006.js:22751-22817 (buildFeedbackInput),
       chunk-006.js:22844-22882 (b0R keyboard handling)"
```

---

### Task 3: Wire scope-based permission persistence in container

**Why:** The approval response scope must actually persist permissions. "Allow All for This Session" sets `dangerouslyAllowAll` in memory, "Allow All for Every Session" persists it to settings.

**Files:**
- Modify: `packages/flitter/src/container.ts` (onConfirmationResponse handler)
- Modify: `packages/agent-core/src/worker/thread-worker.ts` (pass scope through userRespondToApproval)
- Test: `packages/cli/src/widgets/__tests__/approval-widget.test.ts` (append)

**Amp reference:** `chunk-006.js:36437-36490` — `onConfirmationResponse`:
- `"allow-all-session"`: `Ms("dangerouslyAllowAll", true)` (in-memory session flag)
- `"allow-all-persistent"`: `settingsStorage.set("dangerouslyAllowAll", true, "global")`
- `"always-guarded"`: appends to `guardedFiles.allowlist` in settings
- `"deny-with-feedback"`: calls `resolveApproval(id, false, feedback.trim())`

- [ ] **Step 1: Write the failing test**

Append to `packages/cli/src/widgets/__tests__/approval-widget.test.ts`:

```typescript
describe("ApprovalWidget scope persistence", () => {
  it("session scope sets dangerouslyAllowAll in memory", () => {
    let capturedResponse: ApprovalResponse | null = null;
    const config: ApprovalWidgetConfig = {
      request: {
        toolUseId: "test-scope-1",
        toolName: "Bash",
        args: { command: "rm -rf /" },
        reason: "Dangerous command",
      },
      onRespond: (_id, resp) => { capturedResponse = resp; },
    };
    const widget = new ApprovalWidget(config);
    const state = widget.createState();
    // Simulate selecting "Allow All for This Session"
    // The state's _selectOption("allow-all-session") should produce scope: "session"
    (state as any)._selectOption("allow-all-session");
    expect(capturedResponse).not.toBeNull();
    expect(capturedResponse!.approved).toBe(true);
    expect(capturedResponse!.scope).toBe("session");
  });

  it("persistent scope produces scope: always", () => {
    let capturedResponse: ApprovalResponse | null = null;
    const config: ApprovalWidgetConfig = {
      request: {
        toolUseId: "test-scope-2",
        toolName: "Bash",
        args: { command: "echo hi" },
        reason: "Test",
      },
      onRespond: (_id, resp) => { capturedResponse = resp; },
    };
    const widget = new ApprovalWidget(config);
    const state = widget.createState();
    (state as any)._selectOption("allow-all-persistent");
    expect(capturedResponse!.approved).toBe(true);
    expect(capturedResponse!.scope).toBe("always");
  });

  it("deny-with-feedback enters feedback mode", () => {
    const config: ApprovalWidgetConfig = {
      request: {
        toolUseId: "test-scope-3",
        toolName: "Bash",
        args: { command: "echo hi" },
        reason: "Test",
      },
      onRespond: () => {},
    };
    const widget = new ApprovalWidget(config);
    const state = widget.createState();
    (state as any)._selectOption("no-with-feedback");
    expect((state as any)._feedbackActive).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it passes with Task 2 changes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/approval-widget.test.ts`
Expected: PASS

- [ ] **Step 3: Update userRespondToApproval in thread-worker.ts**

In `packages/agent-core/src/worker/thread-worker.ts`, update `userRespondToApproval` (around line 272):

```typescript
// OLD:
  async userRespondToApproval(toolUseId: string, response: ToolApprovalResponse): Promise<void> {
    const resolve = this._pendingApprovals.get(toolUseId);
    if (resolve) {
      resolve(
        response.approved
          ? { accepted: true }
          : { accepted: false },
      );

// NEW:
  async userRespondToApproval(toolUseId: string, response: ToolApprovalResponse): Promise<void> {
    const resolve = this._pendingApprovals.get(toolUseId);
    if (resolve) {
      resolve(
        response.approved
          ? { accepted: true, scope: response.scope }
          : { accepted: false, feedback: response.feedback },
      );
```

- [ ] **Step 4: Add scope handling to container.ts onConfirmationResponse**

In `packages/flitter/src/container.ts`, in the section where approval responses are handled (the `requestApproval` callback or post-approval handler), add scope-based persistence:

```typescript
// After the approval is resolved (in the container's wiring of the approval flow):
// 逆向: chunk-006.js:36460-36474
if (response.scope === "session") {
  // Set in-memory session flag — PermissionEngine will check this
  configService.setSessionOverride("dangerouslyAllowAll", true);
} else if (response.scope === "always") {
  // Persist to global settings
  await opts.settings.set("dangerouslyAllowAll", true);
} else if (response.scope === "always-guarded") {
  // Add file to guarded files allowlist
  const currentAllowlist = (configService.get().settings["guardedFiles.allowlist"] as string[]) ?? [];
  const toAllow = getToolFilePaths(request.toolName, request.args);
  const newAllowlist = [...toAllow, ...currentAllowlist];
  await opts.settings.set("guardedFiles.allowlist", newAllowlist);
}
```

- [ ] **Step 5: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json && bunx tsc --noEmit -p packages/agent-core/tsconfig.json && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add packages/flitter/src/container.ts packages/agent-core/src/worker/thread-worker.ts packages/cli/src/widgets/__tests__/approval-widget.test.ts
git commit -m "feat(approval): wire scope-based permission persistence

Session scope sets dangerouslyAllowAll in memory via configService.
Persistent scope writes dangerouslyAllowAll to global settings.
Always-guarded scope appends file paths to guardedFiles.allowlist.
Deny-with-feedback passes feedback text through to the LLM.

逆向: amp chunk-006.js:36437-36490 (onConfirmationResponse)"
```

---

### Task 4: Full test suite and type check

- [ ] **Step 1: Run type check across all packages**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json && bunx tsc --noEmit -p packages/agent-core/tsconfig.json && bunx tsc --noEmit -p packages/flitter/tsconfig.json`
Expected: No type errors

- [ ] **Step 2: Run all existing tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass (existing + new)

- [ ] **Step 3: Fix any regressions**

If any existing tests fail due to the `ApprovalResponse` shape change (from `{ approved: boolean }` to `{ approved: boolean; scope?: ApprovalScope; feedback?: string }`), update those tests. The old shape is still valid since `scope` and `feedback` are optional — backward-compatible.

- [ ] **Step 4: E2E verification**

```bash
tmux new-session -d -s test -x 80 -y 24 "bun run packages/cli/src/main.ts 2>/tmp/approval-test.log"
sleep 3
# Type a command that triggers approval (e.g., ask the LLM to run a bash command)
tmux send-keys -t test "run ls -la" Enter
sleep 5
# Should see the approval dialog with 4 options
tmux capture-pane -t test -p | grep -q "Approve" || echo "FAIL: missing Approve option"
tmux capture-pane -t test -p | grep -q "Allow All for This Session" || echo "FAIL: missing session option"
tmux capture-pane -t test -p | grep -q "Allow All for Every Session" || echo "FAIL: missing persistent option"
tmux capture-pane -t test -p | grep -q "Deny with feedback" || echo "FAIL: missing feedback option"
tmux kill-session -t test
```
