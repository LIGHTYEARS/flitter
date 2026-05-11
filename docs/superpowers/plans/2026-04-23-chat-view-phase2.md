# Chat View Phase 2: Full Amp Alignment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining rendering and interaction gaps between flitter's chat view and the amp reference — covering cancellation-requested status, manual bash invocation as tool rows, user message interrupted state, thinking block streaming/cancelled state, discoveredGuidanceFiles annotation, specialized tool rendering, and the Disclosure collapsible widget needed for Task tool and activity group collapse.

**Architecture:** Three workstreams: (A) Data model fixes — add missing statuses and flags to display item types; (B) Rendering enhancements — thinking block streaming state, user message interrupted state, manual bash as tool row, specialized tool kinds; (C) Interaction — Disclosure widget, Task collapsible, activity group collapse.

**Tech Stack:** TypeScript, @flitter/tui (Container, Border, BoxDecoration, EdgeInsets, GestureDetector, Stack, Positioned, TextStyle, BrailleSpinner), Bun test runner.

---

## File Structure

### New files
- `packages/tui/src/widgets/disclosure.ts` — Collapsible disclosure widget (逆向: Ds)
- `packages/cli/src/widgets/__tests__/cancellation-requested.test.ts` — Tests for cancellation-requested status
- `packages/cli/src/widgets/__tests__/manual-bash-tool.test.ts` — Tests for manual bash invocation as tool row
- `packages/cli/src/widgets/__tests__/thinking-streaming.test.ts` — Tests for thinking block streaming/cancelled state
- `packages/cli/src/widgets/__tests__/specialized-tools.test.ts` — Tests for web_search, read_web_page, mermaid, task_list rendering
- `packages/cli/src/widgets/__tests__/disclosure.test.ts` — Tests for Disclosure widget

### Modified files
- `packages/tui/src/index.ts` — Export Disclosure widget
- `packages/cli/src/widgets/display-items.ts:43-87` — Add `cancellation-requested` to status unions, add `interrupted`/`discoveredGuidanceFiles`/`isStreaming`/`isCancelled` to item types, add new ToolKinds, fix manual bash invocation
- `packages/cli/src/widgets/conversation-view.ts:860-925,1080-1198` — Thinking streaming/cancelled rendering, interrupted user messages, discoveredGuidanceFiles, cancellation-requested in switch cases, specialized tool rendering, Disclosure-based activity groups
- `packages/cli/src/widgets/thread-state-widget.ts` — Pass interrupted/cancelled state through to display items

---

## Task 1: Add `cancellation-requested` Status

**Why:** Amp's `sE0`, `oE0`, `xW`, `qr` all handle `cancellation-requested` as a distinct status. Flitter's `ToolItem.status` and `ActivityAction.status` unions are missing it, causing TypeScript switch statements to silently fall through with no icon/color when a tool has this status.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts:50-57` (ToolItem.status union)
- Modify: `packages/cli/src/widgets/display-items.ts:80-81` (ActivityAction.status union)
- Modify: `packages/cli/src/widgets/conversation-view.ts:1080-1094` (_getStatusIcon)
- Modify: `packages/cli/src/widgets/conversation-view.ts:1107-1122` (_getStatusColor)
- Modify: `packages/cli/src/widgets/conversation-view.ts:1164-1177` (_getActionStatusIcon)
- Modify: `packages/cli/src/widgets/conversation-view.ts:1185-1199` (_getActionStatusColor)
- Create: `packages/cli/src/widgets/__tests__/cancellation-requested.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/cancellation-requested.test.ts
import { describe, expect, it } from "bun:test";
import { transformThreadToDisplayItems } from "../display-items.js";
import type { ToolItem } from "../display-items.js";

describe("cancellation-requested status", () => {
  it("passes cancellation-requested status through to ToolItem", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-cr",
            name: "Bash",
            input: { command: "ls" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-cr",
            run: { status: "cancellation-requested" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool).toBeDefined();
    expect(tool.status).toBe("cancellation-requested");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/cancellation-requested.test.ts`
Expected: TypeScript compile error — `"cancellation-requested"` is not assignable to `ToolItem["status"]`

- [ ] **Step 3: Add `cancellation-requested` to status unions**

In `packages/cli/src/widgets/display-items.ts`, update `ToolItem.status` (line 50-57):

```ts
  status:
    | "done"
    | "error"
    | "cancelled"
    | "cancellation-requested"
    | "rejected-by-user"
    | "in-progress"
    | "blocked-on-user"
    | "queued";
```

Update `ActivityAction.status` (line 80-81):

```ts
  status: "done" | "error" | "cancelled" | "cancellation-requested" | "in-progress" | "blocked-on-user" | "queued";
```

- [ ] **Step 4: Add `cancellation-requested` to icon/color switch cases**

In `packages/cli/src/widgets/conversation-view.ts`, update `_getStatusIcon` (line 1080):

```ts
function _getStatusIcon(status: ToolItem["status"]): string {
  switch (status) {
    case "done":
      return "\u2713"; // ✓
    case "error":
      return "\u2717"; // ✗
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return "\u2298"; // ⊘
    case "blocked-on-user":
      return "?";
    case "in-progress":
    case "queued":
      return "\u22EF"; // ⋯
  }
}
```

Update `_getStatusColor` (line 1107):

```ts
function _getStatusColor(status: ToolItem["status"]): Color {
  switch (status) {
    case "done":
      return SUCCESS_COLOR;
    case "error":
      return ERROR_COLOR_LOCAL;
    case "in-progress":
      return TOOL_COLOR;
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return CANCELLED_COLOR;
    case "blocked-on-user":
    case "queued":
      return TOOL_COLOR;
  }
}
```

Apply the same pattern to `_getActionStatusIcon` (line 1164) and `_getActionStatusColor` (line 1185).

Also update the bash tool rendering in `_buildToolWidget` (around line 649-682) — add `cancellation-requested` alongside `cancelled`:

```ts
      if (tool.status === "cancelled" || tool.status === "cancellation-requested") {
        spans.push(
          new TextSpan({
            text: firstLine,
            style: new TextStyle({ bold: true, strikethrough: true }),
          }),
        );
      }
```

And the status suffix section:

```ts
      } else if (tool.status === "cancelled" || tool.status === "cancellation-requested") {
        spans.push(
          new TextSpan({
            text: " (cancelled)",
            style: new TextStyle({ foreground: CANCELLED_COLOR, italic: true }),
          }),
        );
      }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/cancellation-requested.test.ts`
Expected: PASS

- [ ] **Step 6: Run full test suite to check for regressions**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/cancellation-requested.test.ts
git commit -m "feat(cli): add cancellation-requested tool status

逆向: sE0/oE0/xW/qr — cancellation-requested is a distinct status
in amp that maps to ⊘ icon and toolCancelled color. Previously
missing from flitter's type union, causing silent switch fallthrough."
```

---

## Task 2: Manual Bash Invocation as Tool Row

**Why:** Amp renders `manual_bash_invocation` from info-role messages as full bash tool rows with command, output, exit code, and status. Flitter currently renders them as plain `"$ cmd"` system text messages, losing all tool run data.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts:217-236` (info-role handling)
- Create: `packages/cli/src/widgets/__tests__/manual-bash-tool.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/manual-bash-tool.test.ts
import { describe, expect, it } from "bun:test";
import { transformThreadToDisplayItems } from "../display-items.js";
import type { ToolItem } from "../display-items.js";

describe("manual_bash_invocation as tool row", () => {
  it("renders manual bash invocation as bash ToolItem with output", () => {
    const messages = [
      {
        role: "info" as const,
        content: [
          {
            type: "manual_bash_invocation",
            args: { cmd: "git status" },
            hidden: false,
            toolRun: {
              status: "done",
              result: { output: "On branch master\nnothing to commit", exitCode: 0 },
            },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("tool");
    const tool = items[0] as ToolItem;
    expect(tool.kind).toBe("bash");
    expect(tool.command).toBe("git status");
    expect(tool.status).toBe("done");
    expect(tool.output).toBe("On branch master\nnothing to commit");
    expect(tool.exitCode).toBe(0);
  });

  it("renders hidden bash invocation with $$ prefix in command", () => {
    const messages = [
      {
        role: "info" as const,
        content: [
          {
            type: "manual_bash_invocation",
            args: { cmd: "secret-cmd" },
            hidden: true,
            toolRun: {
              status: "done",
              result: { output: "ok", exitCode: 0 },
            },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items[0] as ToolItem;
    // hidden commands use $$ prefix — stored as-is since the renderer handles display
    expect(tool.kind).toBe("bash");
    expect(tool.command).toBe("secret-cmd");
  });

  it("handles manual bash with error status", () => {
    const messages = [
      {
        role: "info" as const,
        content: [
          {
            type: "manual_bash_invocation",
            args: { cmd: "bad-cmd" },
            toolRun: {
              status: "error",
              error: { message: "command not found" },
            },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items[0] as ToolItem;
    expect(tool.status).toBe("error");
    expect(tool.error).toBe("command not found");
  });

  it("falls back to system message when toolRun is missing", () => {
    const messages = [
      {
        role: "info" as const,
        content: [
          {
            type: "manual_bash_invocation",
            args: { cmd: "simple-cmd" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    // Without toolRun data, fall back to simple text message
    expect(items[0].type).toBe("message");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/manual-bash-tool.test.ts`
Expected: FAIL — first test expects type "tool" but gets type "message"

- [ ] **Step 3: Rewrite info-role handling to emit ToolItem when toolRun exists**

Replace the info-role block in `packages/cli/src/widgets/display-items.ts` (lines 217-236):

```ts
    // 逆向: ux0 — info role messages with manual_bash_invocation
    // When toolRun data exists, emit as bash ToolItem (逆向: yx0 manualBashInvocation branch).
    // When no toolRun, fall back to plain system message.
    if (msg.role === "info") {
      if (typeof msg.content !== "string") {
        for (let blockIdx = 0; blockIdx < msg.content.length; blockIdx++) {
          const block = msg.content[blockIdx];
          if (block.type === "manual_bash_invocation" && block.args) {
            const cmd = ((block as Record<string, unknown>).args as Record<string, unknown>)
              .cmd as string;
            if (!cmd) continue;

            const toolRun = (block as Record<string, unknown>).toolRun as
              | { status: string; result?: { output?: string; exitCode?: number }; error?: { message?: string } }
              | undefined;

            if (toolRun) {
              // 逆向: yx0 manualBashInvocation → bash ToolItem with output/exitCode/error
              flushActivityBuffer();
              const msgId = (msg as Record<string, unknown>).messageId ?? "info";
              items.push({
                type: "tool",
                toolUseId: `manual-bash:${msgId}:${blockIdx}`,
                toolName: "Bash",
                kind: "bash",
                status: (toolRun.status as ToolItem["status"]) ?? "done",
                command: cmd,
                output: typeof toolRun.result?.output === "string" ? toolRun.result.output : undefined,
                exitCode: typeof toolRun.result?.exitCode === "number" ? toolRun.result.exitCode : undefined,
                error: toolRun.error?.message,
              });
            } else {
              // Fallback: no toolRun data, render as system text (逆向: DN0 hidden prefix)
              const hidden = block.hidden === true;
              flushActivityBuffer();
              items.push({
                type: "message",
                role: "system",
                text: `${hidden ? "$$" : "$"} ${cmd}`,
              });
            }
          }
        }
      }
      continue;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/manual-bash-tool.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run existing display-items tests to check for regressions**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: PASS — the existing info-role test may need updating since the shape changed

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/manual-bash-tool.test.ts
git commit -m "feat(cli): render manual_bash_invocation as bash tool row with output

逆向: yx0 manualBashInvocation branch — info-role messages with toolRun
data now render as full bash ToolItems with command, output, exitCode,
and error. Falls back to plain text when toolRun is missing."
```

---

## Task 3: User Message Interrupted State

**Why:** Amp uses `e.warning` (amber/yellow) color for the user message left border when `message.interrupted === true`. Flitter always uses `SECONDARY_COLOR` (green), giving no visual indication that a message was interrupted.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts:25-35` (add `interrupted` to MessageItem)
- Modify: `packages/cli/src/widgets/display-items.ts:245-265` (pass interrupted from raw message)
- Modify: `packages/cli/src/widgets/conversation-view.ts:562-589` (_buildUserMessageWidget)

- [ ] **Step 1: Write failing test**

Add to `packages/cli/src/widgets/__tests__/display-items.test.ts`:

```ts
describe("transformThreadToDisplayItems — interrupted messages", () => {
  it("passes interrupted flag from raw user message", () => {
    const messages = [
      {
        role: "user" as const,
        content: [{ type: "text", text: "Hello" }],
        interrupted: true,
      },
    ];
    const items = transformThreadToDisplayItems(messages as any);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("message");
    expect((items[0] as any).interrupted).toBe(true);
  });

  it("does not set interrupted when false or missing", () => {
    const messages = [
      {
        role: "user" as const,
        content: [{ type: "text", text: "Hello" }],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    expect((items[0] as any).interrupted).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: FAIL — `interrupted` is undefined

- [ ] **Step 3: Add `interrupted` to MessageItem and pass through**

In `packages/cli/src/widgets/display-items.ts`, update `MessageItem` (line 25-35):

```ts
export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system";
  text: string;
  isStreaming?: boolean;
  images?: number;
  usage?: { inputTokens: number; outputTokens: number };
  /** Whether this user message was interrupted (逆向: S$ R.interrupted → e.warning border) */
  interrupted?: boolean;
}
```

In the `flushTextParts` closure (around line 245-265), pass the interrupted flag:

```ts
        pendingItems.push({
          type: "message",
          role: msg.role,
          text: joined,
          ...(msg.state?.type === "streaming" ? { isStreaming: true } : {}),
          ...(imageCount > 0 ? { images: imageCount } : {}),
          ...((msg as Record<string, unknown>).interrupted === true ? { interrupted: true } : {}),
        });
```

- [ ] **Step 4: Use interrupted flag in _buildUserMessageWidget**

In `packages/cli/src/widgets/conversation-view.ts`, add a warning color constant near line 123:

```ts
/** warning 色 (#e0af68) -- interrupted user message border
 * 逆向: $R.app.warning / S$ R.interrupted → e.warning */
const WARNING_COLOR = Color.rgb(0xe0, 0xaf, 0x68);
```

Update `_buildUserMessageWidget` (line 562-589) to use the warning color when interrupted:

```ts
  private _buildUserMessageWidget(item: MessageItem): Widget {
    const ast = this._parser.parse(item.text);
    const contentSpans = this._renderer.render(ast);

    const allSpans: TextSpan[] = [];
    if (item.images && item.images > 0) {
      allSpans.push(...this._buildImageLabels(item.images));
    }
    allSpans.push(...contentSpans);

    // 逆向: S$ — append " (interrupted)" in warning italic when message was interrupted
    if (item.interrupted) {
      allSpans.push(
        new TextSpan({
          text: " (interrupted)",
          style: new TextStyle({ foreground: WARNING_COLOR, italic: true }),
        }),
      );
    }

    const content = new RichText({
      text: new TextSpan({ children: allSpans }),
    });

    // 逆向: S$ — border color: e.success for normal, e.warning for interrupted
    const borderColor = item.interrupted ? WARNING_COLOR : SECONDARY_COLOR;

    return new Container({
      decoration: new BoxDecoration({
        border: new Border(
          undefined,
          undefined,
          undefined,
          new BorderSide(borderColor, 2, "solid"),
        ),
      }),
      padding: EdgeInsets.only({ left: 1 }),
      child: content,
    });
  }
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts packages/cli/src/widgets/conversation-view.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/display-items.test.ts
git commit -m "feat(cli): user message interrupted state with warning color border

逆向: S$ widget — R.interrupted switches border from e.success (green)
to e.warning (amber). Also appends ' (interrupted)' suffix text."
```

---

## Task 4: Thinking Block Streaming and Cancelled State

**Why:** Amp's thinking block widget (`Rd`/`fJT`) shows three states: streaming (accent color + spinner), cancelled (warning color + "(interrupted)"), and complete (success color + ✓). Flitter always shows the complete state.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts:110-114` (add isStreaming/isCancelled to ThinkingItem)
- Modify: `packages/cli/src/widgets/display-items.ts:267-281` (set streaming/cancelled flags)
- Modify: `packages/cli/src/widgets/conversation-view.ts:860-925` (_buildThinkingWidget)
- Create: `packages/cli/src/widgets/__tests__/thinking-streaming.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/thinking-streaming.test.ts
import { describe, expect, it } from "bun:test";
import { transformThreadToDisplayItems } from "../display-items.js";
import type { ThinkingItem } from "../display-items.js";

describe("thinking block streaming/cancelled state", () => {
  it("marks last thinking block as streaming when message is streaming", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "thinking", thinking: "Let me think..." },
        ],
        state: { type: "streaming" },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const thinking = items.find((i) => i.type === "thinking") as ThinkingItem;
    expect(thinking).toBeDefined();
    expect(thinking.isStreaming).toBe(true);
    expect(thinking.isCancelled).toBeFalsy();
  });

  it("marks last thinking block as cancelled when message is cancelled", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "thinking", thinking: "I was thinking..." },
        ],
        state: { type: "cancelled" },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const thinking = items.find((i) => i.type === "thinking") as ThinkingItem;
    expect(thinking).toBeDefined();
    expect(thinking.isCancelled).toBe(true);
    expect(thinking.isStreaming).toBeFalsy();
  });

  it("only marks the last thinking block, not earlier ones", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "thinking", thinking: "First thought" },
          { type: "thinking", thinking: "Second thought" },
        ],
        state: { type: "streaming" },
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const thinkingItems = items.filter((i) => i.type === "thinking") as ThinkingItem[];
    expect(thinkingItems).toHaveLength(2);
    expect(thinkingItems[0].isStreaming).toBeFalsy();
    expect(thinkingItems[1].isStreaming).toBe(true);
  });

  it("does not mark thinking as streaming for complete messages", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          { type: "thinking", thinking: "Done thinking" },
          { type: "text", text: "The answer is 4." },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const thinking = items.find((i) => i.type === "thinking") as ThinkingItem;
    expect(thinking.isStreaming).toBeFalsy();
    expect(thinking.isCancelled).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/thinking-streaming.test.ts`
Expected: FAIL — `isStreaming` is undefined on ThinkingItem

- [ ] **Step 3: Add isStreaming/isCancelled to ThinkingItem**

In `packages/cli/src/widgets/display-items.ts`, update `ThinkingItem` (line 110-114):

```ts
export interface ThinkingItem {
  type: "thinking";
  text: string;
  isExpanded: boolean;
  /** Whether this thinking block is currently streaming (逆向: fJT isStreaming) */
  isStreaming?: boolean;
  /** Whether this thinking block was cancelled/interrupted (逆向: fJT isCancelled) */
  isCancelled?: boolean;
}
```

- [ ] **Step 4: Set flags in transformer**

In `transformThreadToDisplayItems`, after the content-block loop (around line 282), before `items.push(...pendingItems)`, post-process the last thinking block:

```ts
    // 逆向: x8R._buildThinkingBlock — only the last thinking block gets streaming/cancelled flags
    // let r = a === t, h = e.state?.type === "streaming" && r, i = e.state?.type === "cancelled" && r
    const msgState = msg.state?.type;
    if (msgState === "streaming" || msgState === "cancelled") {
      // Find the last thinking item in pendingItems
      for (let j = pendingItems.length - 1; j >= 0; j--) {
        if (pendingItems[j].type === "thinking") {
          const thinkingItem = pendingItems[j] as ThinkingItem;
          if (msgState === "streaming") {
            thinkingItem.isStreaming = true;
          } else {
            thinkingItem.isCancelled = true;
          }
          break;
        }
      }
    }
```

Place this right before the existing `if (pendingItems.length > 0)` block.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/thinking-streaming.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Update _buildThinkingWidget rendering**

In `packages/cli/src/widgets/conversation-view.ts`, rewrite `_buildThinkingWidget` (line 860-925):

```ts
  private _buildThinkingWidget(item: ThinkingItem, itemIndex: number): Widget {
    const isExpanded = this._expandedThinking.has(itemIndex);

    const spans: TextSpan[] = [];

    // 逆向: fJT.build() line 3089-3094
    // isCancelled → warning color, no icon
    // isComplete (!isStreaming) → success color, "✓ "
    // isStreaming → accent color, spinner
    if (item.isCancelled) {
      // No icon prefix for cancelled (逆向: t = "" when isCancelled)
    } else if (item.isStreaming) {
      spans.push(
        new TextSpan({
          text: `${this._spinner.toBraille()} `,
          style: new TextStyle({ foreground: ACCENT_COLOR }),
        }),
      );
    } else {
      spans.push(
        new TextSpan({
          text: "\u2713 ",
          style: new TextStyle({ foreground: SUCCESS_COLOR }),
        }),
      );
    }

    // "Thinking" label — color depends on state
    const labelColor = item.isCancelled ? WARNING_COLOR : DIM_COLOR;
    spans.push(
      new TextSpan({
        text: "Thinking",
        style: new TextStyle({ foreground: labelColor }),
      }),
    );

    // 逆向: fJT — append " (interrupted)" in warning when cancelled
    if (item.isCancelled) {
      spans.push(
        new TextSpan({
          text: " (interrupted)",
          style: new TextStyle({ foreground: WARNING_COLOR, italic: true }),
        }),
      );
    }

    // Expand/collapse indicator
    const hasContent = item.text.trim().length > 0;
    if (hasContent) {
      spans.push(new TextSpan({ text: " " }));
      spans.push(
        new TextSpan({
          text: isExpanded ? "\u25BC" : "\u25B6",
          style: new TextStyle({ foreground: DIM_COLOR }),
        }),
      );
    }

    const headerRow = new RichText({
      text: new TextSpan({ children: spans }),
    });

    if (isExpanded && hasContent) {
      const indentedText = item.text
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");

      return new Column({
        children: [
          headerRow,
          new RichText({
            text: new TextSpan({
              text: indentedText,
              style: new TextStyle({ foreground: DIM_COLOR, italic: true }),
            }),
          }),
        ],
      });
    }

    return headerRow;
  }
```

- [ ] **Step 7: Update _hasInProgress to include streaming thinking**

In `_hasInProgress` (line 276-284), add streaming thinking detection so the spinner animation runs:

```ts
  private _hasInProgress(): boolean {
    const items = this.widget.config.items;
    if (!items) return false;
    return items.some(
      (item) =>
        (item.type === "activity-group" && item.hasInProgress) ||
        (item.type === "tool" && item.status === "in-progress") ||
        (item.type === "thinking" && (item as ThinkingItem).isStreaming === true),
    );
  }
```

Add the import for `ThinkingItem` to the import block at the top of conversation-view.ts.

- [ ] **Step 8: Run full test suite**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/thinking-streaming.test.ts
git commit -m "feat(cli): thinking block streaming and cancelled state

逆向: Rd/fJT — three states for thinking blocks:
- streaming: accent color + braille spinner
- cancelled: warning color + '(interrupted)' suffix
- complete: success color + ✓ checkmark"
```

---

## Task 5: discoveredGuidanceFiles Annotation

**Why:** Amp renders `discoveredGuidanceFiles` below user messages — showing which guidance files (CLAUDE.md, etc.) were loaded. This gives users visibility into what context the model received.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts:25-35` (add discoveredGuidanceFiles to MessageItem)
- Modify: `packages/cli/src/widgets/display-items.ts:245-265` (extract from raw message)
- Modify: `packages/cli/src/widgets/conversation-view.ts:562-589` (_buildUserMessageWidget)

- [ ] **Step 1: Write failing test**

Add to `packages/cli/src/widgets/__tests__/display-items.test.ts`:

```ts
describe("transformThreadToDisplayItems — discoveredGuidanceFiles", () => {
  it("passes discoveredGuidanceFiles from raw user message", () => {
    const messages = [
      {
        role: "user" as const,
        content: [{ type: "text", text: "Hello" }],
        discoveredGuidanceFiles: [
          { uri: "/project/CLAUDE.md", lineCount: 42 },
          { uri: "/project/.claude/settings.json", lineCount: 15 },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages as any);
    expect(items).toHaveLength(1);
    const msg = items[0] as any;
    expect(msg.discoveredGuidanceFiles).toHaveLength(2);
    expect(msg.discoveredGuidanceFiles[0].uri).toBe("/project/CLAUDE.md");
    expect(msg.discoveredGuidanceFiles[0].lineCount).toBe(42);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: FAIL — `discoveredGuidanceFiles` is undefined

- [ ] **Step 3: Add discoveredGuidanceFiles to MessageItem and extract**

In `packages/cli/src/widgets/display-items.ts`, update `MessageItem`:

```ts
export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system";
  text: string;
  isStreaming?: boolean;
  images?: number;
  usage?: { inputTokens: number; outputTokens: number };
  interrupted?: boolean;
  /** Guidance files discovered for this user message (逆向: b8R widget) */
  discoveredGuidanceFiles?: Array<{ uri: string; lineCount: number }>;
}
```

In the `flushTextParts` closure, add:

```ts
          ...(Array.isArray((msg as Record<string, unknown>).discoveredGuidanceFiles)
            ? { discoveredGuidanceFiles: (msg as Record<string, unknown>).discoveredGuidanceFiles as Array<{ uri: string; lineCount: number }> }
            : {}),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: PASS

- [ ] **Step 5: Render discoveredGuidanceFiles in _buildUserMessageWidget**

In `packages/cli/src/widgets/conversation-view.ts`, in `_buildUserMessageWidget`, after the Container return, wrap in a Column when guidance files exist:

```ts
  private _buildUserMessageWidget(item: MessageItem): Widget {
    // ... existing border + content logic ...

    const borderWidget = new Container({
      decoration: new BoxDecoration({
        border: new Border(
          undefined,
          undefined,
          undefined,
          new BorderSide(borderColor, 2, "solid"),
        ),
      }),
      padding: EdgeInsets.only({ left: 1 }),
      child: content,
    });

    // 逆向: b8R — render discovered guidance files below user message
    if (item.discoveredGuidanceFiles && item.discoveredGuidanceFiles.length > 0) {
      const guidanceWidgets: Widget[] = item.discoveredGuidanceFiles.map((file) => {
        const basename = file.uri.split("/").pop() ?? file.uri;
        return new RichText({
          text: new TextSpan({
            text: `Loaded ${basename} (${file.lineCount} lines)`,
            style: new TextStyle({ foreground: SUCCESS_COLOR, dim: true }),
          }),
        });
      });
      return new Column({
        children: [borderWidget, ...guidanceWidgets],
      });
    }

    return borderWidget;
  }
```

- [ ] **Step 6: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/display-items.test.ts
git commit -m "feat(cli): discoveredGuidanceFiles annotation on user messages

逆向: b8R widget — renders 'Loaded {file} ({N} lines)' in dim green
below user messages when guidance files were discovered."
```

---

## Task 6: Specialized Tool Rendering — web_search, task_list

**Why:** Amp renders `web_search` and `task_list` tools with specialized detail text instead of dumping raw JSON args. These are high-frequency tools that benefit from readable rendering.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts:303-403` (tool classification switch)
- Create: `packages/cli/src/widgets/__tests__/specialized-tools.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/specialized-tools.test.ts
import { describe, expect, it } from "bun:test";
import { transformThreadToDisplayItems } from "../display-items.js";
import type { ToolItem } from "../display-items.js";

describe("specialized tool rendering", () => {
  it("renders web_search with query as detail", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-ws",
            name: "web_search",
            input: { query: "TypeScript generics tutorial" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-ws",
            run: { status: "done" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool).toBeDefined();
    expect(tool.kind).toBe("generic");
    expect(tool.toolName).toBe("Web Search");
    expect(tool.args).toEqual({ detail: "TypeScript generics tutorial" });
  });

  it("renders task_list with action and title as detail", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-tl",
            name: "task_list",
            input: { action: "add", title: "Fix login bug" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-tl",
            run: { status: "done" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool.toolName).toBe("task_list");
    expect(tool.args).toHaveProperty("detail");
    const detail = (tool.args as Record<string, unknown>).detail as string;
    expect(detail).toContain("add");
    expect(detail).toContain("Fix login bug");
  });

  it("renders read_web_page with URL as detail", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-rwp",
            name: "read_web_page",
            input: { url: "https://example.com/docs" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-rwp",
            run: { status: "done" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool.kind).toBe("generic");
    expect(tool.toolName).toBe("read_web_page");
    expect(tool.args).toEqual({ detail: "https://example.com/docs" });
  });

  it("renders mermaid with code as detail", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-m",
            name: "mermaid",
            input: { code: "graph TD; A-->B;" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-m",
            run: { status: "done" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool.kind).toBe("generic");
    expect(tool.toolName).toBe("Mermaid");
    expect(tool.args).toHaveProperty("detail");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/specialized-tools.test.ts`
Expected: FAIL — web_search tool has toolName "web_search" not "Web Search"

- [ ] **Step 3: Add specialized tool handling before the generic fallback**

In `packages/cli/src/widgets/display-items.ts`, add specialized tool cases **before** the generic fallback (line 390). Insert after the CREATE_TOOLS block (line 389) and before the `else` block (line 390):

```ts
      } else if (block.name === "web_search") {
        // 逆向: yx0 web_search branch — w1T(_) extracts query
        flushActivityBuffer();
        const query = typeof block.input?.query === "string" ? block.input.query : "";
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: "Web Search",
          kind: "generic",
          status,
          args: { detail: query },
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else if (block.name === "read_web_page") {
        // 逆向: yx0 read_web_page branch — D1T(_) extracts URL
        flushActivityBuffer();
        const url = typeof block.input?.url === "string" ? block.input.url : "";
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: "read_web_page",
          kind: "generic",
          status,
          args: { detail: url },
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else if (block.name === "mermaid") {
        // 逆向: yx0 mermaid branch
        flushActivityBuffer();
        const code = typeof block.input?.code === "string" ? block.input.code : "";
        const truncated = code.length > 60 ? code.slice(0, 60) + "..." : code;
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: "Mermaid",
          kind: "generic",
          status,
          args: { detail: truncated },
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else if (block.name === "task_list") {
        // 逆向: yx0 task_list branch
        flushActivityBuffer();
        const action = typeof block.input?.action === "string" ? block.input.action : "";
        const title = typeof block.input?.title === "string" ? block.input.title : "";
        const detail = title ? `Task list: ${action} "${title}"` : `Task list: ${action}`;
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: "task_list",
          kind: "generic",
          status,
          args: { detail },
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
      } else {
```

- [ ] **Step 4: Update _getToolDetail to read `detail` from args**

In `packages/cli/src/widgets/conversation-view.ts`, update the `generic` case in `_getToolDetail` (line 1148-1155):

```ts
    case "generic": {
      // 逆向: specialized tools store a pre-formatted detail string in args.detail
      if (tool.args && typeof tool.args.detail === "string") {
        const detail = tool.args.detail;
        return detail.length > MAX_DETAIL_LENGTH
          ? detail.slice(0, MAX_DETAIL_LENGTH) + "..."
          : detail;
      }
      if (!tool.args || Object.keys(tool.args).length === 0) return null;
      const summary = JSON.stringify(tool.args);
      return summary.length > MAX_DETAIL_LENGTH
        ? summary.slice(0, MAX_DETAIL_LENGTH) + "..."
        : summary;
    }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/specialized-tools.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Run full test suite**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/specialized-tools.test.ts
git commit -m "feat(cli): specialized rendering for web_search, read_web_page, mermaid, task_list

逆向: yx0 specialized tool branches — render human-readable detail
instead of raw JSON args for high-frequency tools."
```

---

## Task 7: Disclosure Widget

**Why:** Amp uses a `Ds` (Disclosure) widget for both activity group collapse and Task tool collapsible items. Flitter needs this primitive to implement those features. This is a reusable @flitter/tui widget.

**Files:**
- Create: `packages/tui/src/widgets/disclosure.ts`
- Modify: `packages/tui/src/index.ts` (export Disclosure)
- Create: `packages/cli/src/widgets/__tests__/disclosure.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// packages/cli/src/widgets/__tests__/disclosure.test.ts
import { describe, expect, it } from "bun:test";
// The Disclosure widget should be exported from @flitter/tui
// This test verifies the API exists
import { Disclosure } from "@flitter/tui";

describe("Disclosure widget", () => {
  it("can be instantiated with title and child", () => {
    // Disclosure needs: title (Widget), child (Widget), expanded (boolean), onChanged (callback)
    // For unit test, we just verify the constructor doesn't throw
    const widget = new Disclosure({
      title: null as any, // placeholder — real widget in integration
      child: null as any,
      expanded: false,
    });
    expect(widget).toBeDefined();
    expect(widget.config.expanded).toBe(false);
  });

  it("accepts onChanged callback", () => {
    let changed = false;
    const widget = new Disclosure({
      title: null as any,
      child: null as any,
      expanded: true,
      onChanged: (val: boolean) => { changed = val; },
    });
    expect(widget.config.expanded).toBe(true);
    // Callback is stored but not invoked in constructor
    widget.config.onChanged?.(false);
    expect(changed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/disclosure.test.ts`
Expected: FAIL — `Disclosure` is not exported from `@flitter/tui`

- [ ] **Step 3: Implement Disclosure widget**

Create `packages/tui/src/widgets/disclosure.ts`:

```ts
/**
 * Disclosure — collapsible toggle widget.
 *
 * Renders a clickable title row with ▶/▼ indicator.
 * When expanded, shows the child widget below.
 *
 * 逆向: Ds class (chunk-006.js:934) — Disclosure widget used for
 * activity groups and Task tool collapsible items.
 *
 * @example
 * ```ts
 * new Disclosure({
 *   title: new Text("3 reads, 1 search"),
 *   child: new Column({ children: actionRows }),
 *   expanded: false,
 *   onChanged: (expanded) => setState(() => { ... }),
 * })
 * ```
 */

import type { BuildContext, Widget } from "../framework/index.js";
import { State, StatefulWidget } from "../framework/index.js";
import { GestureDetector } from "./gesture-detector.js";
import { Column } from "./column.js";
import { Row } from "./row.js";
import { RichText, TextSpan, TextStyle } from "./rich-text.js";
import { SizedBox } from "./sized-box.js";

export interface DisclosureConfig {
  /** The title widget displayed in the header row */
  title: Widget;
  /** The child widget shown when expanded */
  child: Widget;
  /** Whether the disclosure is currently expanded */
  expanded: boolean;
  /** Callback when expansion state changes */
  onChanged?: (expanded: boolean) => void;
}

export class Disclosure extends StatefulWidget {
  readonly config: DisclosureConfig;

  constructor(config: DisclosureConfig) {
    super();
    this.config = config;
  }

  createState(): DisclosureState {
    return new DisclosureState();
  }
}

class DisclosureState extends State<Disclosure> {
  build(_context: BuildContext): Widget {
    const { title, child, expanded, onChanged } = this.widget.config;

    // 逆向: Ds.build() — chevron + title, click toggles
    const chevron = new RichText({
      text: new TextSpan({
        text: expanded ? "\u25BC " : "\u25B6 ",
        style: new TextStyle({ dim: true }),
      }),
    });

    const headerRow = new GestureDetector({
      onTap: () => {
        onChanged?.(!expanded);
      },
      child: new Row({
        children: [chevron, title],
      }),
    });

    if (!expanded) {
      return headerRow;
    }

    return new Column({
      children: [
        headerRow,
        child,
      ],
    });
  }
}
```

- [ ] **Step 4: Export from @flitter/tui index**

In `packages/tui/src/index.ts`, add the export:

```ts
export { Disclosure } from "./widgets/disclosure.js";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/disclosure.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/widgets/disclosure.ts packages/tui/src/index.ts packages/cli/src/widgets/__tests__/disclosure.test.ts
git commit -m "feat(tui): add Disclosure collapsible toggle widget

逆向: Ds class — renders clickable ▶/▼ header with toggleable child.
Used for activity group collapse and Task tool collapsible items."
```

---

## Task 8: Activity Group Collapse with Disclosure

**Why:** The current activity group rendering always shows individual actions expanded. Amp uses `Ds` (Disclosure) to collapse activity groups by default and expand on click. This reduces visual noise for completed tool groups.

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts:791-847` (_buildActivityGroupWidget)

- [ ] **Step 1: Add expansion state tracking**

In `ConversationViewState`, add a Map for activity group expansion (like amp's `denseViewItemStates`):

```ts
  /**
   * Expansion state for activity groups, keyed by item index.
   * 逆向: stateController.denseViewItemStates Map
   */
  private _activityGroupExpanded: Map<number, boolean> = new Map();
```

- [ ] **Step 2: Rewrite _buildActivityGroupWidget to use collapse logic**

```ts
  private _buildActivityGroupWidget(group: ActivityGroupItem, itemIndex?: number): Widget {
    const hasActions = group.actions.length > 0;

    // Determine expansion state:
    // 逆向: denseViewItemStates.get(id) ?? !completed — default expanded when in-progress
    const defaultExpanded = group.hasInProgress;
    const isExpanded = itemIndex !== undefined
      ? (this._activityGroupExpanded.get(itemIndex) ?? defaultExpanded)
      : defaultExpanded;

    // Build summary header row
    const headerSpans: TextSpan[] = [];

    // Status icon for the group
    if (group.hasInProgress) {
      headerSpans.push(
        new TextSpan({
          text: `${this._spinner.toBraille()} `,
          style: new TextStyle({ foreground: TOOL_COLOR }),
        }),
      );
    } else {
      headerSpans.push(
        new TextSpan({
          text: "\u2713 ",
          style: new TextStyle({ foreground: SUCCESS_COLOR }),
        }),
      );
    }

    // Summary text
    headerSpans.push(
      new TextSpan({
        text: group.summary,
        style: new TextStyle({ foreground: DIM_COLOR }),
      }),
    );

    // Expand/collapse indicator
    if (hasActions) {
      headerSpans.push(
        new TextSpan({
          text: isExpanded ? " \u25BC" : " \u25B6",
          style: new TextStyle({ foreground: DIM_COLOR }),
        }),
      );
    }

    const headerWidget = new GestureDetector({
      onTap: hasActions && itemIndex !== undefined
        ? () => {
            this.setState(() => {
              this._activityGroupExpanded.set(itemIndex, !isExpanded);
            });
          }
        : undefined,
      child: new RichText({
        text: new TextSpan({ children: headerSpans }),
      }),
    });

    // Collapsed: just the header
    if (!isExpanded || !hasActions) {
      return headerWidget;
    }

    // Expanded: header + individual action rows
    const actionWidgets: Widget[] = [];
    for (const action of group.actions) {
      const spans: TextSpan[] = [];

      if (action.status === "in-progress") {
        spans.push(
          new TextSpan({
            text: `${this._spinner.toBraille()} `,
            style: new TextStyle({ foreground: TOOL_COLOR }),
          }),
        );
      } else {
        const icon = _getActionStatusIcon(action.status);
        const color = _getActionStatusColor(action.status);
        spans.push(
          new TextSpan({
            text: `${icon} `,
            style: new TextStyle({ foreground: color }),
          }),
        );
      }

      spans.push(
        new TextSpan({
          text: action.toolName,
          style: new TextStyle({ foreground: TOOL_COLOR, bold: true }),
        }),
      );

      const toolDetail = action.path || action.detail;
      if (toolDetail) {
        spans.push(
          new TextSpan({
            text: ` ${toolDetail}`,
            style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
          }),
        );
      }

      actionWidgets.push(
        new RichText({
          text: new TextSpan({ children: spans }),
        }),
      );
    }

    return new Column({
      mainAxisSize: "min",
      children: [headerWidget, ...actionWidgets],
    });
  }
```

- [ ] **Step 3: Add auto-collapse on completion**

In `didUpdateWidget` (line 313), add auto-collapse logic for completed activity groups:

```ts
    // 逆向: _closeDenseActivityGroupsOnBoundary — auto-collapse completed groups
    const items = this.widget.config.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (
          item.type === "activity-group" &&
          !item.hasInProgress &&
          (this._activityGroupExpanded.get(i) === true)
        ) {
          this._activityGroupExpanded.set(i, false);
        }
      }
    }
```

- [ ] **Step 4: Add GestureDetector to imports if not already present**

Check the import block at the top of conversation-view.ts — `GestureDetector` needs to be imported from `@flitter/tui`. If missing:

```ts
import {
  // ... existing imports ...
  GestureDetector,
} from "@flitter/tui";
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/`
Expected: ALL PASS — existing activity group tests may need updates for the new collapsed-by-default behavior

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts
git commit -m "feat(cli): activity group collapse with click-to-expand

逆向: denseViewItemStates — activity groups now collapse by default
when completed, expand on click. In-progress groups start expanded.
Uses GestureDetector for click handling."
```

---

## Task 9: Task Tool Collapsible Rendering

**Why:** Amp renders `Task` tools (subagent invocations) as collapsible items using `Ds` (Disclosure). They auto-expand when in-progress and auto-collapse when complete. Flitter treats Task as a generic tool row.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts:303-403` (detect Task tool, emit with task-specific data)
- Modify: `packages/cli/src/widgets/conversation-view.ts` (render Task as collapsible)

- [ ] **Step 1: Write failing test**

Add to `packages/cli/src/widgets/__tests__/specialized-tools.test.ts`:

```ts
describe("Task tool rendering", () => {
  it("emits Task tool with kind generic and name Subagent", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use",
            id: "tu-task",
            name: "Task",
            input: { description: "Search for login bugs" },
          },
          {
            type: "tool_result",
            toolUseID: "tu-task",
            run: { status: "done", result: "Found 3 bugs" },
          },
        ],
      },
    ];
    const items = transformThreadToDisplayItems(messages);
    const tool = items.find((i) => i.type === "tool") as ToolItem;
    expect(tool).toBeDefined();
    expect(tool.kind).toBe("generic");
    expect(tool.toolName).toBe("Subagent");
    expect(tool.args).toHaveProperty("detail");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — Task currently falls through to generic with toolName "Task"

- [ ] **Step 3: Add Task tool handling**

In `packages/cli/src/widgets/display-items.ts`, add before the generic fallback:

```ts
      } else if (block.name === "Task") {
        // 逆向: yx0 Task branch — render as Subagent with description detail
        flushActivityBuffer();
        const description = typeof block.input?.description === "string"
          ? block.input.description
          : JSON.stringify(block.input ?? {});
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: "Subagent",
          kind: "generic",
          status,
          args: { detail: description },
          error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
        });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/specialized-tools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/specialized-tools.test.ts
git commit -m "feat(cli): Task tool rendered as Subagent with description detail

逆向: yx0 Task branch + YgT gate — Task tools now display as
'Subagent' with the task description as detail text."
```

---

## Task Dependency Graph

```
Task 1 (cancellation-requested) — independent, quick fix
Task 2 (manual bash tool row)   — independent
Task 3 (interrupted state)      — independent
Task 4 (thinking streaming)     — independent
Task 5 (guidanceFiles)          — depends on Task 3 (same MessageItem + _buildUserMessageWidget)
Task 6 (specialized tools)      — independent
Task 7 (Disclosure widget)      — independent (tui layer)
Task 8 (activity group collapse) — depends on Task 7 (uses GestureDetector, not Disclosure directly)
Task 9 (Task tool)              — depends on Task 6 (same tool classification block)
```

Recommended execution order: **1 → 2 → 3 → 4 → 5 → 6 → 9 → 7 → 8**

(Quick data model fixes first, then rendering enhancements, then the widget + interaction tasks last.)

---

## Out of Scope (Deferred to Phase 3)

These features exist in amp but are significant enough to warrant their own plan:

1. **Message edit/selection/restore (GQ/zQ)** — requires inline text editor widget, selection state management, and message forking logic
2. **"e to edit" keybind hint overlay** — requires Stack overlay in user message (blocked on GQ/zQ)
3. **apply_patch multi-file diff parsing** — requires a patch parser utility (kx0 equivalent)
4. **Bash sed/perl write-like detection** — requires command parsing utility (M1T/WO equivalent)
5. **finder/code_review/code_tour → activity-group** — requires result parsing utilities (Ux0/qx0/Hx0)
6. **Image preview callback** — requires image preview UI not yet designed
7. **aggman display mode** — requires understanding of aggregated management mode
