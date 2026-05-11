# Chat View Rendering Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the rendering gaps between flitter's chat view and the amp reference — covering message rendering, tool rendering, streaming text, and layout/interaction.

**Architecture:** Four independent workstreams: (A) message rendering enhancements — user message border, image blocks, token display; (B) tool rendering — edit dedup, apply_patch/undo_edit specialization, blocked-on-user status, activity group interaction; (C) streaming text projection — the highest-impact user-visible gap; (D) layout/interaction — info-role messages, manual_bash_invocation. Each task is self-contained with tests.

**Tech Stack:** TypeScript, @flitter/tui (Container, Border, BoxDecoration, EdgeInsets, GestureDetector, TextStyle, MarkdownRenderer), Bun test runner.

---

## File Structure

### New files
- `packages/cli/src/widgets/__tests__/streaming-projection.test.ts` — tests for streaming message projection
- `packages/cli/src/widgets/__tests__/edit-dedup.test.ts` — tests for Px0-style edit merging
- `packages/cli/src/widgets/__tests__/message-rendering.test.ts` — tests for user message border, image blocks

### Modified files
- `packages/cli/src/widgets/display-items.ts` — add `deduplicateEdits()`, `projectStreamingMessage()`, image block handling, info-role handling
- `packages/cli/src/widgets/conversation-view.ts` — user message left border, image block rendering, streaming message widget, blocked-on-user status, activity group click-to-expand, token usage per message
- `packages/cli/src/widgets/thread-state-widget.ts` — accumulate streaming blocks from `inference:delta`, project synthetic message, wire click handlers

---

## Task 1: Streaming Text Projection (highest impact)

**Why:** Users currently see a blank conversation area while the assistant generates a response. Amp projects a synthetic streaming message into the display list so users see text appear token-by-token.

**Interactive example:**
```
Before (current):
  You:
  What is 2+2?

  ...                          ← only this placeholder, no visible text

After (fixed):
  You:
  What is 2+2?

  Assistant:
  The answer is 4. Let me       ← live streaming text appears here
  explain why—█                  ← with a block cursor at the end
```

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts` (lines 278–340, event handling)
- Modify: `packages/cli/src/widgets/display-items.ts` (add `projectStreamingMessage()`)
- Modify: `packages/cli/src/widgets/conversation-view.ts` (render streaming message with cursor)
- Create: `packages/cli/src/widgets/__tests__/streaming-projection.test.ts`

### Step-by-step

- [ ] **Step 1: Write the failing test for `projectStreamingMessage`**

```ts
// packages/cli/src/widgets/__tests__/streaming-projection.test.ts
import { describe, expect, it } from "bun:test";
import { projectStreamingMessage } from "../display-items.js";

describe("projectStreamingMessage", () => {
  it("returns null when no streaming blocks", () => {
    expect(projectStreamingMessage([], null)).toBeNull();
  });

  it("returns null when streamingMessageId is null", () => {
    const blocks = [{ type: "text", text: "hello" }];
    expect(projectStreamingMessage(blocks, null)).toBeNull();
  });

  it("projects a synthetic assistant message from streaming blocks", () => {
    const blocks = [
      { type: "text", text: "The answer is " },
    ];
    const result = projectStreamingMessage(blocks, "msg-123");
    expect(result).not.toBeNull();
    expect(result!.role).toBe("assistant");
    expect(result!.content).toEqual(blocks);
    expect(result!.state).toEqual({ type: "streaming" });
  });

  it("projects thinking blocks alongside text", () => {
    const blocks = [
      { type: "thinking", thinking: "Let me reason..." },
      { type: "text", text: "The answer" },
    ];
    const result = projectStreamingMessage(blocks, "msg-456");
    expect(result).not.toBeNull();
    expect(result!.content).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/streaming-projection.test.ts`
Expected: FAIL — `projectStreamingMessage` is not exported from `display-items.js`

- [ ] **Step 3: Implement `projectStreamingMessage` in display-items.ts**

Add to the end of `packages/cli/src/widgets/display-items.ts`:

```ts
// ─── Streaming projection ───────────────────────

/**
 * Project a synthetic assistant message from streaming content blocks.
 *
 * 逆向: Wp0() in modules/0374_unknown_Wp0.js
 *   function Wp0(streamingMessageId, streamingBlocks, messageCount, parentToolUseId) {
 *     if (!streamingMessageId || streamingBlocks.length === 0) return null;
 *     return { role: "assistant", content: streamingBlocks,
 *              state: { type: "streaming" }, ... };
 *   }
 *
 * Returns null if there are no streaming blocks or no active streaming message.
 */
export function projectStreamingMessage(
  streamingBlocks: RawContentBlock[],
  streamingMessageId: string | null,
): RawMessage | null {
  if (!streamingMessageId || streamingBlocks.length === 0) return null;
  return {
    role: "assistant",
    content: streamingBlocks,
    state: { type: "streaming" },
  };
}
```

Also add to the existing export in `packages/cli/src/index.ts` if needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/streaming-projection.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Wire streaming block accumulation into ThreadStateWidget**

Modify `packages/cli/src/widgets/thread-state-widget.ts`. Add new private fields after the existing `_hasStartedStreaming` field (around line 170):

```ts
  /** Accumulated streaming content blocks (逆向: deltaState.streamingBlocks) */
  private _streamingBlocks: Array<{ type: string; text?: string; thinking?: string; [key: string]: unknown }> = [];

  /** Active streaming message ID (逆向: deltaState.streamingMessageId) */
  private _streamingMessageId: string | null = null;
```

Then modify the `inference:delta` event handler (around line 295). Replace the current handler:

```ts
        case "inference:delta": {
          const delta = ev as {
            type: string;
            blockType?: string;
            text?: string;
            thinking?: string;
            messageId?: string;
            blockIndex?: number;
          };
          // 逆向: qp0(R, this.deltaState) in ttT — accumulate streaming blocks
          if (delta.messageId && !this._streamingMessageId) {
            this._streamingMessageId = delta.messageId;
          }
          if (delta.blockType === "text" || (!delta.blockType && delta.text)) {
            // Accumulate text: find existing text block or create new one
            const lastBlock = this._streamingBlocks[this._streamingBlocks.length - 1];
            if (lastBlock?.type === "text") {
              lastBlock.text = (lastBlock.text ?? "") + (delta.text ?? "");
            } else {
              this._streamingBlocks.push({ type: "text", text: delta.text ?? "" });
            }
          } else if (delta.blockType === "thinking") {
            const lastBlock = this._streamingBlocks[this._streamingBlocks.length - 1];
            if (lastBlock?.type === "thinking") {
              lastBlock.thinking = (lastBlock.thinking ?? "") + (delta.thinking ?? "");
            } else {
              this._streamingBlocks.push({ type: "thinking", thinking: delta.thinking ?? "" });
            }
          }
          this.setState(() => {
            this._hasStartedStreaming = true;
          });
          break;
        }
```

Add clearing logic in the `inference:complete` and `turn:complete` handlers:

```ts
            this._streamingBlocks = [];
            this._streamingMessageId = null;
```

- [ ] **Step 6: Wire streaming projection into display items in ThreadStateWidget.build()**

In the `initState` thread subscription callback (around line 263), after `transformThreadToDisplayItems`, call `projectStreamingMessage` and append the result:

```ts
        this.setState(() => {
          this._items = transformThreadToDisplayItems(
            (snap.messages ?? []) as Parameters<typeof transformThreadToDisplayItems>[0],
          );
          // 逆向: ttT.emitThread() — append projected streaming message
          if (this._streamingBlocks.length > 0 && this._streamingMessageId) {
            const projected = projectStreamingMessage(
              this._streamingBlocks as any,
              this._streamingMessageId,
            );
            if (projected) {
              const projectedItems = transformThreadToDisplayItems([projected] as any);
              this._items = [...this._items, ...projectedItems];
            }
          }
        });
```

Also do the same in a new `_rebuildItems()` helper called from the `inference:delta` handler so the display updates on each delta.

- [ ] **Step 7: Add streaming cursor indicator in ConversationView**

In `packages/cli/src/widgets/conversation-view.ts`, modify `_buildMessageItemWidget` to detect streaming state and append a block cursor:

```ts
  private _buildMessageItemWidget(item: MessageItem): Widget {
    const roleConfig = ROLE_CONFIG[item.role] ?? {
      prefix: `${item.role}: `,
      color: MUTED_TEXT_COLOR,
    };

    const roleSpan = new TextSpan({
      text: roleConfig.prefix,
      style: new TextStyle({
        bold: true,
        foreground: roleConfig.color,
      }),
    });

    // 逆向: Z3 renders markdown for both streaming and complete text.
    // Streaming text uses renderStreaming() to strip trailing empty paragraphs.
    const ast = this._parser.parse(item.text);
    const contentSpans = item.isStreaming
      ? this._renderer.renderStreaming(ast)
      : this._renderer.render(ast);

    const children = [roleSpan, new TextSpan({ text: "\n" }), ...contentSpans];

    // Streaming cursor: append a block cursor at the end
    // 逆向: amp thinking blocks show spinner; text content shows live text without explicit cursor.
    // Flitter adds a block cursor for visual feedback.
    if (item.isStreaming) {
      children.push(
        new TextSpan({
          text: "\u2588", // █ block cursor
          style: new TextStyle({ foreground: ACCENT_COLOR }),
        }),
      );
    }

    return new RichText({
      text: new TextSpan({ children }),
    });
  }
```

This requires adding `isStreaming?: boolean` to the `MessageItem` interface in `display-items.ts`:

```ts
export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system";
  text: string;
  /** Whether this message is still being streamed (逆向: state.type === "streaming") */
  isStreaming?: boolean;
}
```

And setting it in `transformThreadToDisplayItems` when `msg.state?.type === "streaming"`:

```ts
      if (
        joined.trim().length > 0 &&
        (msg.role === "user" || msg.role === "assistant" || msg.role === "system")
      ) {
        pendingItems.push({
          type: "message",
          role: msg.role,
          text: joined,
          isStreaming: msg.state?.type === "streaming",
        });
      }
```

- [ ] **Step 8: Run all affected tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/streaming-projection.test.ts packages/cli/src/widgets/__tests__/display-items.test.ts packages/cli/src/widgets/thread-state-widget.test.ts packages/cli/src/widgets/conversation-view.test.ts`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/__tests__/streaming-projection.test.ts
git commit -m "feat(cli): streaming text projection — show assistant response as it generates

逆向: Wp0() + ttT.emitThread() + deltaState.streamingBlocks pattern.
Accumulates streaming blocks from inference:delta events and projects
a synthetic assistant message into the display list."
```

---

## Task 2: User Message Left Border Decoration

**Why:** Amp renders user messages with a 2-cell-wide left border in success/green color, giving clear visual separation between user and assistant messages. Flitter only shows a text prefix.

**Interactive example:**
```
Before (current):
  You:
  What is 2+2?

After (fixed):
  ▌ What is 2+2?               ← 2-cell green left border, no "You:" prefix
  ▌                               (content is italic, matching amp)
```

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts` (user message rendering)
- Create: `packages/cli/src/widgets/__tests__/message-rendering.test.ts`

- [ ] **Step 1: Write failing test for user message border**

```ts
// packages/cli/src/widgets/__tests__/message-rendering.test.ts
import { describe, expect, it } from "bun:test";
import { ConversationView } from "../conversation-view.js";

describe("ConversationView user message rendering", () => {
  it("wraps user messages in a Container with left border", () => {
    const view = new ConversationView({
      items: [{ type: "message", role: "user", text: "Hello" }],
    });
    const state = view.createState();
    // Verify the widget tree structure includes a Container for user messages
    expect(state).toBeDefined();
    // The actual widget tree test:
    // We test the _buildMessageItemWidget method produces a Container
    // for role === "user" by checking the returned widget type
    const widget = (state as any)._buildUserMessageWidget?.({ type: "message", role: "user", text: "Hello" });
    // This will fail because _buildUserMessageWidget doesn't exist yet
    expect(widget).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/message-rendering.test.ts`
Expected: FAIL — `_buildUserMessageWidget` does not exist

- [ ] **Step 3: Implement user message left border**

In `packages/cli/src/widgets/conversation-view.ts`, add imports:

```ts
import {
  // ... existing imports ...
  Border,
  BorderSide,
  BoxDecoration,
  Container,
  EdgeInsets,
} from "@flitter/tui";
```

Add a new `_buildUserMessageWidget` method and modify `_buildMessageItemWidget` to dispatch:

```ts
  /**
   * Build a user message with left border decoration.
   *
   * 逆向: S$ widget (chunk-006.js:31134-31143)
   *   decoration: { border: new h9(void 0, void 0, void 0, new e9(r, 2, "solid")) }
   *   padding: TR.only({ left: 1 })
   *   Color: e.success for normal, e.warning for interrupted
   */
  private _buildUserMessageWidget(item: MessageItem): Widget {
    const ast = this._parser.parse(item.text);
    const contentSpans = this._renderer.render(ast);

    // 逆向: amp renders user text with italic styling (not markdown)
    // but we keep markdown rendering since it's more useful in practice.
    const content = new RichText({
      text: new TextSpan({ children: contentSpans }),
    });

    return new Container({
      decoration: new BoxDecoration({
        border: new Border(
          undefined,                                              // top
          undefined,                                              // right
          undefined,                                              // bottom
          new BorderSide(SECONDARY_COLOR, 2, "solid"),            // left: success green, 2-wide
        ),
      }),
      padding: EdgeInsets.only({ left: 1 }),
      child: content,
    });
  }
```

Modify `_buildMessageItemWidget` to route user messages:

```ts
  private _buildMessageItemWidget(item: MessageItem): Widget {
    // 逆向: S$ widget — user messages get left border, not role prefix
    if (item.role === "user") {
      return this._buildUserMessageWidget(item);
    }

    // Assistant/system messages keep the role prefix + markdown
    const roleConfig = ROLE_CONFIG[item.role] ?? {
      prefix: `${item.role}: `,
      color: MUTED_TEXT_COLOR,
    };
    // ... rest unchanged ...
  }
```

- [ ] **Step 4: Update test to match actual implementation**

Update the test to verify the Container structure:

```ts
describe("ConversationView user message rendering", () => {
  it("user message widget has Container type name", () => {
    const view = new ConversationView({
      items: [{ type: "message", role: "user", text: "Hello" }],
    });
    const state = view.createState();
    // Access the internal method via the state object
    const widget = (state as any)._buildUserMessageWidget({
      type: "message", role: "user", text: "Hello",
    });
    // Container is the outermost widget
    expect(widget.constructor.name).toBe("Container");
  });
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/message-rendering.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/message-rendering.test.ts
git commit -m "feat(cli): user message left border decoration

逆向: S$ widget — 2-cell solid left border in success color.
Replaces 'You:' prefix with amp-style left edge indicator."
```

---

## Task 3: Image Content Block Rendering

**Why:** Amp renders image content blocks as clickable `[image N]` links. Flitter silently ignores them, so messages with images lose content.

**Interactive example:**
```
Before (current):
  ▌ (nothing visible — image block silently dropped)

After (fixed):
  ▌ [image 1] [image 2]        ← underlined, dim, non-interactive placeholder
  ▌ Please analyze these        ← text content follows
```

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` (extract image blocks)
- Modify: `packages/cli/src/widgets/conversation-view.ts` (render image placeholders)
- Modify: `packages/cli/src/widgets/__tests__/message-rendering.test.ts` (add image tests)

- [ ] **Step 1: Write failing test for image block extraction**

```ts
// Add to packages/cli/src/widgets/__tests__/display-items.test.ts
// (or the existing test file — find the right describe block)
import { describe, expect, it } from "bun:test";
import { transformThreadToDisplayItems } from "../display-items.js";

describe("transformThreadToDisplayItems — image blocks", () => {
  it("extracts image blocks into MessageItem.images array", () => {
    const messages = [{
      role: "user" as const,
      content: [
        { type: "image", source: { type: "base64", data: "abc123" } },
        { type: "text", text: "What is this?" },
      ],
    }];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("message");
    const msg = items[0] as { type: "message"; images?: number };
    expect(msg.images).toBe(1);
  });

  it("counts multiple image blocks", () => {
    const messages = [{
      role: "user" as const,
      content: [
        { type: "image", source: { type: "base64", data: "a" } },
        { type: "image", source: { type: "base64", data: "b" } },
        { type: "text", text: "Compare these" },
      ],
    }];
    const items = transformThreadToDisplayItems(messages);
    const msg = items[0] as { type: "message"; images?: number };
    expect(msg.images).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: FAIL — `images` field is undefined

- [ ] **Step 3: Add `images` field to MessageItem and extract in transformer**

In `packages/cli/src/widgets/display-items.ts`, update `MessageItem`:

```ts
export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system";
  text: string;
  isStreaming?: boolean;
  /** Number of image content blocks in this message (逆向: _8R image rendering) */
  images?: number;
}
```

In `transformThreadToDisplayItems`, inside the content-block loop (around line 225), count image blocks:

```ts
    let imageCount = 0;

    for (const block of msg.content) {
      if (block.type === "text" && block.text) {
        textParts.push(block.text);
      } else if (block.type === "thinking" && typeof block.thinking === "string") {
        flushTextParts();
        pendingItems.push({
          type: "thinking",
          text: block.thinking as string,
          isExpanded: false,
        });
      } else if (block.type === "image") {
        imageCount++;
      }
    }
```

Then in `flushTextParts`, pass the count:

```ts
    const flushTextParts = () => {
      if (textParts.length === 0) return;
      const joined = textParts.join("");
      if (
        joined.trim().length > 0 &&
        (msg.role === "user" || msg.role === "assistant" || msg.role === "system")
      ) {
        pendingItems.push({
          type: "message",
          role: msg.role,
          text: joined,
          isStreaming: msg.state?.type === "streaming",
          images: imageCount > 0 ? imageCount : undefined,
        });
      }
      textParts.length = 0;
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: PASS

- [ ] **Step 5: Render image placeholders in ConversationView**

In `_buildUserMessageWidget` and `_buildMessageItemWidget` in `conversation-view.ts`, prepend image labels when `item.images > 0`:

```ts
  private _buildImageLabels(count: number): TextSpan[] {
    // 逆向: _8R (1953_unknown__8R.js:23-27)
    //   new G(`[image ${h + 1}]`, cT({ underline: true }))
    const spans: TextSpan[] = [];
    for (let i = 0; i < count; i++) {
      if (i > 0) spans.push(new TextSpan({ text: " " }));
      spans.push(new TextSpan({
        text: `[image ${i + 1}]`,
        style: new TextStyle({
          underline: true,
          foreground: MUTED_TEXT_COLOR,
          italic: true,
        }),
      }));
    }
    spans.push(new TextSpan({ text: "\n" }));
    return spans;
  }
```

Prepend in `_buildUserMessageWidget`:

```ts
    const children: TextSpan[] = [];
    if (item.images && item.images > 0) {
      children.push(...this._buildImageLabels(item.images));
    }
    children.push(...contentSpans);
```

- [ ] **Step 6: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts packages/cli/src/widgets/__tests__/message-rendering.test.ts`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/display-items.test.ts packages/cli/src/widgets/__tests__/message-rendering.test.ts
git commit -m "feat(cli): render image content blocks as [image N] placeholders

逆向: _8R (1953_unknown__8R.js) — underlined italic labels.
Previously image blocks were silently dropped."
```

---

## Task 4: Edit Deduplication (Px0)

**Why:** Amp merges consecutive edit tool items targeting the same file path — combining diffs and summing line counts. Without this, editing a file 3 times produces 3 separate diff blocks instead of one merged view.

**Interactive example:**
```
Before (current):
  ✓ Edit src/app.ts
  --- a/src/app.ts
  +++ b/src/app.ts
  -old line 1
  +new line 1

  ✓ Edit src/app.ts             ← redundant repeated file path
  --- a/src/app.ts
  +++ b/src/app.ts
  -old line 2
  +new line 2

After (fixed):
  ✓ Edit src/app.ts             ← single merged entry
  --- a/src/app.ts
  +++ b/src/app.ts
  -old line 1
  +new line 1
  -old line 2
  +new line 2
```

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` (add `deduplicateEdits()`)
- Create: `packages/cli/src/widgets/__tests__/edit-dedup.test.ts`

- [ ] **Step 1: Write failing test for edit deduplication**

```ts
// packages/cli/src/widgets/__tests__/edit-dedup.test.ts
import { describe, expect, it } from "bun:test";
import { deduplicateEdits, type DisplayItem, type ToolItem } from "../display-items.js";

describe("deduplicateEdits", () => {
  it("returns empty array for empty input", () => {
    expect(deduplicateEdits([])).toEqual([]);
  });

  it("passes through non-tool items unchanged", () => {
    const items: DisplayItem[] = [
      { type: "message", role: "user", text: "hello" },
      { type: "message", role: "assistant", text: "hi" },
    ];
    expect(deduplicateEdits(items)).toEqual(items);
  });

  it("merges consecutive edit items with same path", () => {
    const items: DisplayItem[] = [
      {
        type: "tool", toolUseId: "1", toolName: "Edit", kind: "edit",
        status: "done", path: "src/app.ts", diff: "--- a/src/app.ts\n+++ b/src/app.ts\n-old1\n+new1",
      },
      {
        type: "tool", toolUseId: "2", toolName: "Edit", kind: "edit",
        status: "done", path: "src/app.ts", diff: "--- a/src/app.ts\n+++ b/src/app.ts\n-old2\n+new2",
      },
    ];
    const result = deduplicateEdits(items);
    expect(result).toHaveLength(1);
    expect((result[0] as ToolItem).diff).toContain("-old1");
    expect((result[0] as ToolItem).diff).toContain("-old2");
  });

  it("does not merge edit items with different paths", () => {
    const items: DisplayItem[] = [
      {
        type: "tool", toolUseId: "1", toolName: "Edit", kind: "edit",
        status: "done", path: "src/a.ts", diff: "diff-a",
      },
      {
        type: "tool", toolUseId: "2", toolName: "Edit", kind: "edit",
        status: "done", path: "src/b.ts", diff: "diff-b",
      },
    ];
    const result = deduplicateEdits(items);
    expect(result).toHaveLength(2);
  });

  it("does not merge non-consecutive edit items", () => {
    const items: DisplayItem[] = [
      {
        type: "tool", toolUseId: "1", toolName: "Edit", kind: "edit",
        status: "done", path: "src/app.ts", diff: "diff-1",
      },
      { type: "message", role: "assistant", text: "Done editing" },
      {
        type: "tool", toolUseId: "2", toolName: "Edit", kind: "edit",
        status: "done", path: "src/app.ts", diff: "diff-2",
      },
    ];
    const result = deduplicateEdits(items);
    expect(result).toHaveLength(3);
  });

  it("merges create-file + edit with same path", () => {
    const items: DisplayItem[] = [
      {
        type: "tool", toolUseId: "1", toolName: "Write", kind: "create-file",
        status: "done", path: "src/new.ts",
      },
      {
        type: "tool", toolUseId: "2", toolName: "Edit", kind: "edit",
        status: "done", path: "src/new.ts", diff: "--- a/src/new.ts\n+++ b/src/new.ts\n-old\n+new",
      },
    ];
    const result = deduplicateEdits(items);
    expect(result).toHaveLength(1);
    expect((result[0] as ToolItem).kind).toBe("edit");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/edit-dedup.test.ts`
Expected: FAIL — `deduplicateEdits` not exported

- [ ] **Step 3: Implement `deduplicateEdits`**

Add to `packages/cli/src/widgets/display-items.ts`:

```ts
// ─── Edit deduplication (Px0) ───────────────────

/**
 * Merge consecutive edit/create-file tool items targeting the same file path.
 *
 * 逆向: Px0() in modules/2155_unknown_Px0.js
 *
 * Three merge cases:
 * 1. edit + edit (same path): diffs concatenated, status from newer
 * 2. create-file + create-file (same path): newer replaces older
 * 3. create-file + edit (same path): merged into single edit, create's
 *    content prepended to edit's diff
 */
export function deduplicateEdits(items: DisplayItem[]): DisplayItem[] {
  if (items.length <= 1) return items;

  const result: DisplayItem[] = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const prev = result[result.length - 1];
    const curr = items[i];

    // Only merge consecutive tool items
    if (prev.type !== "tool" || curr.type !== "tool") {
      result.push(curr);
      continue;
    }

    // Must have same path and both be file-related
    const prevPath = prev.path;
    const currPath = curr.path;
    if (!prevPath || !currPath || prevPath !== currPath) {
      result.push(curr);
      continue;
    }

    // Case 1: edit + edit
    if (prev.kind === "edit" && curr.kind === "edit") {
      result[result.length - 1] = {
        ...prev,
        toolUseId: curr.toolUseId,
        status: curr.status === "error" ? "error" : curr.status,
        diff: prev.diff && curr.diff
          ? `${prev.diff}\n${curr.diff}`
          : (curr.diff ?? prev.diff),
        error: curr.error ?? prev.error,
      };
      continue;
    }

    // Case 2: create-file + create-file
    if (prev.kind === "create-file" && curr.kind === "create-file") {
      result[result.length - 1] = { ...curr, toolUseId: prev.toolUseId };
      continue;
    }

    // Case 3: create-file + edit
    if (prev.kind === "create-file" && curr.kind === "edit") {
      result[result.length - 1] = {
        ...curr,
        toolUseId: prev.toolUseId,
        kind: "edit",
        diff: curr.diff,
      };
      continue;
    }

    result.push(curr);
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/edit-dedup.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Wire `deduplicateEdits` into `transformThreadToDisplayItems`**

At the end of `transformThreadToDisplayItems`, before the return:

```ts
  flushActivityBuffer();
  return deduplicateEdits(items);
```

- [ ] **Step 6: Run full display-items test suite**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts packages/cli/src/widgets/__tests__/edit-dedup.test.ts`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/edit-dedup.test.ts
git commit -m "feat(cli): Px0 edit deduplication — merge consecutive same-path edits

逆向: Px0() in modules/2155_unknown_Px0.js.
Handles edit+edit, create+create, and create+edit merge cases."
```

---

## Task 5: blocked-on-user Tool Status + Status Icons Alignment

**Why:** Amp has `blocked-on-user` and `queued` tool statuses with distinct icons (`?` and `⋯`). Flitter is missing these statuses and uses different icons from amp for error/cancelled.

**Interactive example:**
```
Before (current):
  ⟳ Bash                       ← in-progress uses ⟳ (but spinner overrides)
  ✕ Bash ls                     ← error uses ✕
  ⊘ Edit src/app.ts             ← cancelled uses ⊘

After (fixed):
  ⋯ Bash                       ← in-progress uses ⋯ (matching amp)
  ✗ Bash ls                     ← error uses ✗ (matching amp)
  ✗ Edit src/app.ts             ← cancelled uses ✗ (matching amp)
  ? Bash rm -rf /               ← blocked-on-user uses ? in warning/yellow
```

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` (add `blocked-on-user` and `queued` status)
- Modify: `packages/cli/src/widgets/conversation-view.ts` (fix icons + colors, add new statuses)

- [ ] **Step 1: Add `blocked-on-user` and `queued` to ToolItem status union**

In `packages/cli/src/widgets/display-items.ts`, update the `ToolItem.status` type:

```ts
export interface ToolItem {
  type: "tool";
  toolUseId: string;
  toolName: string;
  kind: ToolKind;
  status: "done" | "error" | "cancelled" | "rejected-by-user" | "in-progress" | "blocked-on-user" | "queued";
  // ... rest unchanged
}
```

Also update `ActivityAction.status`:

```ts
export interface ActivityAction {
  kind: "read" | "search" | "list";
  toolName: string;
  toolUseId: string;
  status: "done" | "error" | "cancelled" | "in-progress" | "blocked-on-user" | "queued";
}
```

- [ ] **Step 2: Fix status icons to match amp**

In `packages/cli/src/widgets/conversation-view.ts`, update `_getStatusIcon`:

```ts
/**
 * 逆向: sE0() (modules/2465_unknown_sE0.js)
 * - done → "✓"
 * - error/cancelled/rejected-by-user → "✗"
 * - in-progress/queued → "⋯"
 * - blocked-on-user → "?"
 */
function _getStatusIcon(status: ToolItem["status"]): string {
  switch (status) {
    case "done":
      return "\u2713"; // ✓
    case "error":
    case "cancelled":
    case "rejected-by-user":
      return "\u2717"; // ✗
    case "in-progress":
    case "queued":
      return "\u22EF"; // ⋯
    case "blocked-on-user":
      return "?";
  }
}
```

Add a `WAITING_COLOR` constant:

```ts
/** waiting 色 (#e0af68) -- blocked-on-user / queued (same as TOOL_COLOR / warning)
 * 逆向: oE0 "blocked-on-user" → R.app.waiting → T.warning */
const WAITING_COLOR = TOOL_COLOR;
```

Update `_getStatusColor`:

```ts
/**
 * 逆向: oE0() (modules/2466_unknown_oE0.js)
 */
function _getStatusColor(status: ToolItem["status"]): Color {
  switch (status) {
    case "done":
      return SUCCESS_COLOR;
    case "error":
      return ERROR_COLOR_LOCAL;
    case "in-progress":
      return TOOL_COLOR;
    case "cancelled":
    case "rejected-by-user":
      return CANCELLED_COLOR;
    case "blocked-on-user":
    case "queued":
      return WAITING_COLOR;
  }
}
```

Apply same changes to `_getActionStatusIcon` and `_getActionStatusColor`.

- [ ] **Step 3: Run conversation-view tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/conversation-view.test.ts`
Expected: PASS (some tests may need icon string updates)

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts
git commit -m "fix(cli): align tool status icons and colors with amp reference

逆向: sE0/oE0 (2465/2466). Adds blocked-on-user/queued statuses.
Fixes error/cancelled icons from ✕/⊘ to ✗ (matching amp)."
```

---

## Task 6: Activity Group Click-to-Expand

**Why:** Amp's activity groups are interactive — clicking toggles expansion to reveal individual actions. Flitter renders a static tree with no interaction.

**Interactive example:**
```
Before (current):
  ✓ 2 reads, 1 search           ← static, always shows tree lines
      ├── ✓ Read
      ├── ✓ Read
      ╰── ✓ Grep

After (fixed):
  ✓ 2 reads, 1 search ▶         ← collapsed by default (clickable)

  (after click:)
  ✓ 2 reads, 1 search ▼         ← expanded
      ├── ✓ Read
      ├── ✓ Read
      ╰── ✓ Grep
```

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts` (add GestureDetector + collapse state)

- [ ] **Step 1: Add expand/collapse state tracking for activity groups**

In `ConversationViewState`, add a `Set<number>` to track expanded activity group indices (similar to existing `_expandedThinking`):

```ts
  /**
   * Set of item indices for expanded activity groups.
   * 逆向: n8R — stateController.denseViewItemStates local expand/collapse state
   */
  private _expandedActivityGroups: Set<number> = new Set();
```

- [ ] **Step 2: Wrap activity group header in GestureDetector**

Add `GestureDetector` to imports. Modify `_buildActivityGroupWidget`:

```ts
  private _buildActivityGroupWidget(group: ActivityGroupItem, itemIndex?: number): Widget {
    // ... existing header building code ...

    const isExpanded = itemIndex !== undefined && this._expandedActivityGroups.has(itemIndex);
    const hasActions = group.actions && group.actions.length > 0;

    // Add expand/collapse indicator
    if (hasActions && !group.isSubagent) {
      headerSpans.push(
        new TextSpan({
          text: isExpanded ? " \u25BC" : " \u25B6",
          style: new TextStyle({ foreground: DIM_COLOR }),
        }),
      );
    }

    const headerRow = new GestureDetector({
      onTap: hasActions && itemIndex !== undefined ? () => {
        this.setState(() => {
          if (this._expandedActivityGroups.has(itemIndex)) {
            this._expandedActivityGroups.delete(itemIndex);
          } else {
            this._expandedActivityGroups.add(itemIndex);
          }
        });
      } : undefined,
      child: new RichText({
        text: new TextSpan({ children: headerSpans }),
      }),
    });

    // Only show actions when expanded
    if (!isExpanded || !hasActions) {
      return headerRow;
    }

    // ... existing tree-line action rendering ...
  }
```

Update the call site in `_buildFromItems` to pass the index:

```ts
        case "activity-group":
          children.push(this._buildActivityGroupWidget(item, i));
          break;
```

- [ ] **Step 3: Auto-collapse completed groups**

Add logic in `didUpdateWidget` to auto-collapse groups when they complete (逆向: `_closeDenseActivityGroupsOnBoundary`):

```ts
  didUpdateWidget(_oldWidget: ConversationView): void {
    super.didUpdateWidget(_oldWidget);
    // ... existing animation start/stop ...

    // 逆向: _closeDenseActivityGroupsOnBoundary — auto-collapse completed groups
    const items = this.widget.config.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (
          item.type === "activity-group" &&
          !item.hasInProgress &&
          this._expandedActivityGroups.has(i)
        ) {
          // Auto-collapse completed groups
          this._expandedActivityGroups.delete(i);
        }
      }
    }
  }
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/conversation-view.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts
git commit -m "feat(cli): interactive activity group expand/collapse

逆向: n8R stateController — click to toggle, auto-collapse on completion.
Default: collapsed. Shows ▶/▼ indicator."
```

---

## Task 7: In-Progress Edit Tool Visibility

**Why:** The current code silently drops edit tools that aren't `status: "done"` (`display-items.ts:281`). This means when an edit is running, the user sees nothing — not even a spinner row.

**Interactive example:**
```
Before (current):
  (nothing — in-progress edit is invisible)

After (fixed):
  ⋯ Edit src/app.ts             ← spinner + tool name + path while running
```

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` (remove the `status !== "done"` guard, emit in-progress edit items without diff)

- [ ] **Step 1: Write failing test**

Add to `packages/cli/src/widgets/__tests__/display-items.test.ts`:

```ts
describe("transformThreadToDisplayItems — in-progress edits", () => {
  it("emits edit tool items with in-progress status (no diff)", () => {
    const messages = [{
      role: "assistant" as const,
      content: [
        { type: "tool_use", id: "tu-1", name: "Edit", input: { file_path: "src/app.ts", old_string: "a", new_string: "b" } },
      ],
    }];
    const items = transformThreadToDisplayItems(messages);
    const toolItem = items.find((i) => i.type === "tool");
    expect(toolItem).toBeDefined();
    expect((toolItem as any).status).toBe("in-progress");
    expect((toolItem as any).kind).toBe("edit");
    expect((toolItem as any).diff).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: FAIL — `toolItem` is undefined (filtered out)

- [ ] **Step 3: Remove the guard and conditionally compute diff**

In `packages/cli/src/widgets/display-items.ts`, change the EDIT_TOOLS branch (around line 278):

```ts
      } else if (EDIT_TOOLS.has(block.name)) {
        // 逆向: yx0 edit_file branch
        // Previously skipped non-done edits. Now show them without diff.
        flushActivityBuffer();
        const diffText =
          status === "done" &&
          typeof block.input?.old_string === "string" &&
          typeof block.input?.new_string === "string"
            ? generateSimpleDiff(
                block.input.old_string as string,
                block.input.new_string as string,
                (block.input.file_path as string) ?? "file",
              )
            : undefined;
        items.push({
          type: "tool",
          toolUseId: block.id,
          toolName: block.name,
          kind: "edit",
          status,
          path: typeof block.input?.file_path === "string" ? block.input.file_path : undefined,
          oldString:
            typeof block.input?.old_string === "string" ? block.input.old_string : undefined,
          newString:
            typeof block.input?.new_string === "string" ? block.input.new_string : undefined,
          diff: diffText,
        });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/display-items.test.ts
git commit -m "fix(cli): show in-progress edit tools instead of silently dropping them

Previously edit tool items were filtered when status !== 'done'.
Now they appear with a spinner/status icon but no diff."
```

---

## Task 8: Info-Role Messages (manual_bash_invocation)

**Why:** Amp handles `info`-role messages containing `manual_bash_invocation` — these represent user-run shell commands tracked by the session. Flitter ignores `info`-role messages entirely.

**Interactive example:**
```
Before (current):
  (info-role messages completely invisible)

After (fixed):
  $ git status                   ← manual bash invocation shown with "$ " prefix
                                    in dim/muted styling
```

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` (handle info-role messages)
- Modify: `packages/cli/src/widgets/conversation-view.ts` (render info messages)

- [ ] **Step 1: Write failing test**

```ts
// Add to packages/cli/src/widgets/__tests__/display-items.test.ts
describe("transformThreadToDisplayItems — info role", () => {
  it("extracts manual_bash_invocation from info messages", () => {
    const messages = [{
      role: "info" as const,
      content: [
        {
          type: "manual_bash_invocation",
          args: { cmd: "git status" },
          hidden: false,
        },
      ],
    }];
    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("message");
    const msg = items[0] as any;
    expect(msg.role).toBe("system");
    expect(msg.text).toContain("git status");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL — info-role messages produce no items

- [ ] **Step 3: Handle info-role messages in transformer**

In `transformThreadToDisplayItems`, add handling before the content-block loop (around line 194):

```ts
    // 逆向: ux0 — info role messages with manual_bash_invocation
    // Rendered as "$ cmd" or "$$ cmd" (hidden) in the user message style
    if (msg.role === "info") {
      if (typeof msg.content !== "string") {
        for (const block of msg.content) {
          if (block.type === "manual_bash_invocation" && block.args) {
            const cmd = (block.args as Record<string, unknown>).cmd as string;
            const hidden = block.hidden === true;
            if (cmd) {
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

Update the `RawMessage` interface to include `info` role (it already does at line 144).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/display-items.test.ts
git commit -m "feat(cli): render info-role manual_bash_invocation messages

逆向: ux0 + DN0 — info role 'manual_bash_invocation' shown as '$ cmd'.
Previously info-role messages were silently ignored."
```

---

## Task 9: Per-Message Token Usage Display

**Why:** Amp can show token usage below each assistant message. Flitter only shows cumulative tokens in the StatusBar.

**Interactive example:**
```
Before (current):
  Assistant:
  The answer is 4.
  (no token info visible per message)

After (fixed):
  Assistant:
  The answer is 4.
  ─ 142 input · 38 output       ← dim, compact usage line
```

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` (add `usage` to MessageItem)
- Modify: `packages/cli/src/widgets/conversation-view.ts` (render usage line)

- [ ] **Step 1: Add `usage` to MessageItem interface**

```ts
export interface MessageItem {
  type: "message";
  role: "user" | "assistant" | "system";
  text: string;
  isStreaming?: boolean;
  images?: number;
  /** Token usage for this assistant message (逆向: NJT feature flag) */
  usage?: { inputTokens: number; outputTokens: number };
}
```

- [ ] **Step 2: Extract usage from raw messages in transformer**

In the text-flush logic, check for usage data on the raw message:

```ts
    // After the content-block loop, check for usage on assistant messages
    // 逆向: x8R._buildAssistantMessageWidget appends token usage summary
    if (msg.role === "assistant") {
      const rawUsage = (msg as Record<string, unknown>).usage as
        | { inputTokens: number; outputTokens: number }
        | undefined;
      if (rawUsage && pendingItems.length > 0) {
        const lastItem = pendingItems[pendingItems.length - 1];
        if (lastItem.type === "message" && lastItem.role === "assistant") {
          lastItem.usage = rawUsage;
        }
      }
    }
```

- [ ] **Step 3: Render usage line in ConversationView**

In `_buildMessageItemWidget`, after building the RichText for assistant messages:

```ts
    // Token usage display (逆向: NJT feature flag)
    if (item.role === "assistant" && item.usage) {
      const usageText = `─ ${item.usage.inputTokens} input · ${item.usage.outputTokens} output`;
      const usageWidget = new RichText({
        text: new TextSpan({
          text: usageText,
          style: new TextStyle({ foreground: MUTED_TEXT_COLOR, dim: true }),
        }),
      });
      return new Column({ children: [messageWidget, usageWidget] });
    }
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/display-items.test.ts packages/cli/src/widgets/conversation-view.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts
git commit -m "feat(cli): per-message token usage display for assistant messages

逆向: NJT feature flag — dim usage line below assistant responses."
```

---

## Task Dependency Graph

```
Task 1 (Streaming)    — independent, highest priority
Task 2 (User border)  — independent
Task 3 (Images)       — depends on Task 2 (modifies same method)
Task 4 (Edit dedup)   — independent
Task 5 (Status icons) — independent
Task 6 (Activity expand) — independent
Task 7 (In-prog edit) — independent, can conflict with Task 4
Task 8 (Info role)     — independent
Task 9 (Token usage)   — depends on Task 3 (modifies same interface)
```

Recommended execution order: **1 → 5 → 7 → 4 → 2 → 3 → 6 → 8 → 9**

(Streaming first for maximum user-visible impact, then the quick fixes, then the feature additions.)
