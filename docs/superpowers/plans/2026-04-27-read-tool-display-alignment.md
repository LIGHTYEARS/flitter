# Read Tool Display Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align flitter-cli's Read tool display with amp-cli's rendering — file paths as clickable cyan hyperlinks, workspace-relative paths, read-range indicators, guidance file notices, amp-style summary text, middle-dot bullet action rows with nested expandability, and progressive animation.

**Architecture:** Six changes across the rendering pipeline: (1) wire `TextSpan.url` through `RenderParagraph.performPaint` → `Screen.writeChar` → `Cell` so OSC 8 hyperlinks actually render, (2) add `readRange` and `guidanceFiles` to `ActivityAction` data model, (3) rework `_buildActivityGroupWidget` to use `ExpandableToolHeader` (amp's `Ds`) with `toolName` color, (4) convert expanded action rows to middle-dot bullets with nested expandability, (5) add progressive animation for action rows, (6) update summary text to use "file read(s)" wording.

**Tech Stack:** TypeScript, flitter TUI framework (packages/tui + packages/cli), bun test

---

### Task 1: Wire `TextSpan.url` through paint pipeline to `Cell`

The OSC 8 hyperlink infrastructure exists (`Cell.url`, `ansi-renderer.ts` OSC8_START/END) but `RenderParagraph.performPaint` and `Screen.writeChar` don't propagate `TextSpan.url` to `Cell`. This task closes that gap.

**Files:**
- Modify: `packages/tui/src/widgets/rich-text.ts:43-52` (LayoutGlyph interface)
- Modify: `packages/tui/src/widgets/rich-text.ts:624-661` (performPaint)
- Modify: `packages/tui/src/widgets/rich-text.ts:679-685` (_collectGlyphs)
- Modify: `packages/tui/src/screen/screen.ts:177-183` (Screen.writeChar)
- Modify: `packages/tui/src/screen/buffer.ts:111-118` (ScreenBuffer.writeChar)
- Test: `packages/tui/src/widgets/rich-text.test.ts` or new `packages/tui/src/screen/__tests__/osc8-pipeline.test.ts`

**Amp reference:**
- `text_rendering.js:2052-2060` — `H3.createSpan` puts URL into `G` (TextSpan) via 4th arg `h = QVT(T)` (hyperlink escape)
- `misc_utils.js:7792-7799` — `B9R.build` passes `H3({ uri: JM(h,T), text: ki(h,T), style: {color: fileReference, dim, underline} })`

- [ ] **Step 1: Write failing test — TextSpan.url propagates to Cell**

Create test file `packages/tui/src/screen/__tests__/osc8-pipeline.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { TextSpan } from "../../widgets/text-span.js";
import { TextStyle } from "../text-style.js";
import { Screen } from "../screen.js";

describe("OSC 8 pipeline: TextSpan.url → Cell.url", () => {
  it("Screen.writeChar propagates url to Cell", () => {
    const screen = new Screen(10, 1);
    screen.writeChar(0, 0, "A", TextStyle.NORMAL, 1, "https://example.com");
    const cell = screen.back.getCell(0, 0);
    expect(cell?.url).toBe("https://example.com");
  });

  it("Screen.writeChar without url leaves Cell.url undefined", () => {
    const screen = new Screen(10, 1);
    screen.writeChar(0, 0, "B", TextStyle.NORMAL, 1);
    const cell = screen.back.getCell(0, 0);
    expect(cell?.url).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/tui/src/screen/__tests__/osc8-pipeline.test.ts`
Expected: FAIL — `Screen.writeChar` doesn't accept 6th argument `url`

- [ ] **Step 3: Add `url` parameter to `ScreenBuffer.writeChar`**

In `packages/tui/src/screen/buffer.ts:111`:

```ts
// Before:
writeChar(x: number, y: number, char: string, style: TextStyle, width: number = 1): void {
  const merged = this._mergeBackground(x, y, style);
  this.setCell(x, y, new Cell(char, merged, width));

// After:
writeChar(x: number, y: number, char: string, style: TextStyle, width: number = 1, url?: string): void {
  const merged = this._mergeBackground(x, y, style);
  this.setCell(x, y, new Cell(char, merged, width, url));
```

For width=2 continuation cell (line 114-116), also pass `url`:

```ts
  if (width === 2) {
    const merged2 = this._mergeBackground(x + 1, y, merged);
    this.setCell(x + 1, y, new Cell("", merged2, 0, url));
  }
```

- [ ] **Step 4: Add `url` parameter to `Screen.writeChar`**

In `packages/tui/src/screen/screen.ts:177`:

```ts
// Before:
writeChar(x: number, y: number, char: string, style: TextStyle, width: number = 1): void {
  this.back.writeChar(x, y, char, style, width);

// After:
writeChar(x: number, y: number, char: string, style: TextStyle, width: number = 1, url?: string): void {
  this.back.writeChar(x, y, char, style, width, url);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test packages/tui/src/screen/__tests__/osc8-pipeline.test.ts`
Expected: PASS

- [ ] **Step 6: Add `url` field to `LayoutGlyph` and propagate in `_collectGlyphs`**

In `packages/tui/src/widgets/rich-text.ts:43-52`, add `url` to `LayoutGlyph`:

```ts
interface LayoutGlyph {
  grapheme: string;
  style: TextStyle;
  width: number;
  span: TextSpan;
  /** OSC 8 hyperlink URL from the source TextSpan. */
  url?: string;
}
```

In `_collectGlyphs` (line 679-685), propagate `span.url`:

```ts
    if (span.text) {
      const segments = graphemeSegments(span.text);
      for (const seg of segments) {
        const w = charWidth(seg);
        out.push({ grapheme: seg, style: effectiveStyle, width: w, span, url: span.url });
      }
    }
```

- [ ] **Step 7: Pass `glyph.url` to `screen.writeChar` in `performPaint`**

In `performPaint` (line 657):

```ts
// Before:
screen.writeChar(x, y, glyph.grapheme, style, glyph.width);

// After:
screen.writeChar(x, y, glyph.grapheme, style, glyph.width, glyph.url);
```

- [ ] **Step 8: Write integration test — RichText with url renders Cell.url**

Append to the test file from Step 1:

```ts
import { RichText, RenderParagraph } from "../../widgets/rich-text.js";
import { BoxConstraints } from "../../tree/constraints.js";

describe("RichText → Cell.url integration", () => {
  it("TextSpan with url propagates through RenderParagraph to Cell", () => {
    const span = new TextSpan({
      text: "click",
      url: "file:///tmp/test.ts",
      style: new TextStyle({ underline: true }),
    });
    const rt = new RichText({ text: span });
    const ro = rt.createRenderObject() as RenderParagraph;
    ro.text = span;
    ro.performLayout(new BoxConstraints({ maxWidth: 20, maxHeight: 1 }));

    const screen = new Screen(20, 1);
    ro.performPaint(screen, 0, 0);

    // All 5 chars of "click" should carry the url
    for (let i = 0; i < 5; i++) {
      const cell = screen.back.getCell(i, 0);
      expect(cell?.url).toBe("file:///tmp/test.ts");
    }
    // char after "click" should have no url
    const after = screen.back.getCell(5, 0);
    expect(after?.url).toBeUndefined();
  });
});
```

- [ ] **Step 9: Run full test to verify**

Run: `bun test packages/tui/src/screen/__tests__/osc8-pipeline.test.ts`
Expected: PASS (all tests)

- [ ] **Step 10: Commit**

```bash
git add packages/tui/src/screen/__tests__/osc8-pipeline.test.ts packages/tui/src/screen/buffer.ts packages/tui/src/screen/screen.ts packages/tui/src/widgets/rich-text.ts
git commit -m "feat: wire TextSpan.url through paint pipeline to Cell for OSC 8 hyperlinks

Closes the gap between TextSpan.url declaration and actual Cell.url propagation.
ScreenBuffer.writeChar and Screen.writeChar now accept optional url parameter.
RenderParagraph._collectGlyphs carries span.url into LayoutGlyph, and
performPaint passes it to screen.writeChar."
```

---

### Task 2: Add `readRange` and `guidanceFiles` to `ActivityAction` data model

Extend the data model and extraction logic so the rendering layer has access to read-range and guidance file information.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts:101-119` (ActivityAction interface)
- Modify: `packages/cli/src/widgets/display-items.ts:449-473` (activityBuffer.push for Read)
- Test: `packages/cli/src/widgets/__tests__/display-items.test.ts`

**Amp reference:**
- `misc_utils.js:7800-7809` — `B9R.build` reads `R.input.read_range` and renders `@start-end`
- `misc_utils.js:7811-7816` — `B9R.build` reads `a.result.discoveredGuidanceFiles`
- `actions_intents.js:4489` — dense view action rows check `T.guidanceFiles`

- [ ] **Step 1: Write failing test — readRange and guidanceFiles in ActivityAction**

Append to `packages/cli/src/widgets/__tests__/display-items.test.ts`:

```ts
it("Read tool with read_range populates ActivityAction.readRange", () => {
  const items = transformThreadToDisplayItems([
    {
      role: "assistant",
      content: [
        { type: "tool_use", id: "t1", name: "Read", input: { file_path: "/tmp/a.ts", read_range: [10, 50] } },
      ],
    },
    {
      role: "tool",
      content: [
        {
          type: "tool_result",
          tool_use_id: "t1",
          content: "file content here",
          run: { status: "done", result: {} },
        },
      ],
    },
  ] as any);
  const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
  expect(group).toBeDefined();
  const action = group.actions[0]!;
  expect(action.readRange).toEqual([10, 50]);
});

it("Read tool with discoveredGuidanceFiles populates ActivityAction.guidanceFiles", () => {
  const items = transformThreadToDisplayItems([
    {
      role: "assistant",
      content: [
        { type: "tool_use", id: "t2", name: "Read", input: { file_path: "/tmp/b.ts" } },
      ],
    },
    {
      role: "tool",
      content: [
        {
          type: "tool_result",
          tool_use_id: "t2",
          content: "...",
          run: {
            status: "done",
            result: { discoveredGuidanceFiles: [{ uri: "/tmp/AGENTS.md", lineCount: 42 }] },
          },
        },
      ],
    },
  ] as any);
  const group = items.find((i) => i.type === "activity-group") as ActivityGroupItem;
  expect(group).toBeDefined();
  const action = group.actions[0]!;
  expect(action.guidanceFiles).toEqual([{ uri: "/tmp/AGENTS.md", lineCount: 42 }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: FAIL — `readRange` and `guidanceFiles` are undefined on ActivityAction

- [ ] **Step 3: Extend `ActivityAction` interface**

In `packages/cli/src/widgets/display-items.ts:101-119`, add two fields:

```ts
export interface ActivityAction {
  kind: "read" | "search" | "list" | "explore" | "thinking";
  toolName: string;
  toolUseId: string;
  status:
    | "done"
    | "error"
    | "cancelled"
    | "cancellation-requested"
    | "rejected-by-user"
    | "in-progress"
    | "blocked-on-user"
    | "queued";
  /** File path for Read, pattern/glob for search tools */
  path?: string;
  /** Additional detail (pattern for search, range for read) */
  detail?: string;
  /** Read range [start, end] line numbers (逆向: B9R R.input.read_range) */
  readRange?: [number, number];
  /** Guidance files discovered during this tool run (逆向: B9R a.result.discoveredGuidanceFiles) */
  guidanceFiles?: Array<{ uri: string; lineCount: number }>;
}
```

- [ ] **Step 4: Extract `readRange` from tool input and `guidanceFiles` from tool result**

In `packages/cli/src/widgets/display-items.ts`, within the `if (ACTIVITY_TOOLS[block.name])` block (line ~465-473), add extraction:

```ts
        // Extract readRange for Read tool (逆向: B9R R.input.read_range)
        let readRange: [number, number] | undefined;
        if (block.name === "Read" && Array.isArray(block.input?.read_range)) {
          const [start, end] = block.input.read_range as [unknown, unknown];
          if (typeof start === "number" && typeof end === "number" && start >= 0 && end >= 0) {
            readRange = [start, end];
          }
        }

        // Extract guidanceFiles from tool result (逆向: B9R a.result.discoveredGuidanceFiles)
        let guidanceFiles: Array<{ uri: string; lineCount: number }> | undefined;
        if (
          result?.run?.status === "done" &&
          typeof result.run.result === "object" &&
          result.run.result !== null &&
          Array.isArray((result.run.result as any).discoveredGuidanceFiles)
        ) {
          guidanceFiles = (result.run.result as any).discoveredGuidanceFiles;
        }

        activityBuffer.push({
          kind: ACTIVITY_TOOLS[block.name],
          toolName: block.name,
          toolUseId: block.id,
          status:
            status === "rejected-by-user" ? "cancelled" : (status as ActivityAction["status"]),
          path: toolPath,
          detail: toolDetail,
          readRange,
          guidanceFiles,
        });
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/display-items.test.ts
git commit -m "feat: add readRange and guidanceFiles to ActivityAction data model

Extract read_range from Read tool input and discoveredGuidanceFiles from
tool result into ActivityAction, making them available for rendering.
逆向: B9R (misc_utils.js:7800-7816)"
```

---

### Task 3: Add `cwd` to `ConversationViewConfig` for workspace-relative path conversion

The rendering layer needs access to the current working directory to convert absolute file paths to workspace-relative display paths (matching amp's `ki()` function).

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts:96-119` (ConversationViewConfig)
- Modify: `packages/cli/src/widgets/thread-state-widget.ts:1081-1087` (pass cwd to ConversationView)
- No new test needed — this is plumbing; Task 4 tests the rendering.

**Amp reference:**
- `2651_unknown_qD0.js:23-30` — `ki(path, context)` uses workspace root from BuildContext
- `1577_unknown_KnR.js:4-31` — `KnR(uri, env)` strips workspace prefix or uses `~/` fallback

- [ ] **Step 1: Add `cwd` field to `ConversationViewConfig`**

In `packages/cli/src/widgets/conversation-view.ts:96-119`:

```ts
export interface ConversationViewConfig {
  /** Display items (replaces old messages array) */
  items?: DisplayItem[];
  /** Legacy: flat messages (for backward compatibility during migration) */
  messages?: Message[];
  /** 推理状态 */
  inferenceState?: "idle" | "running";
  /** 最近一次推理错误 */
  error?: Error | null;
  /** 流式增量文本 */
  streamingDelta?: string | null;
  /**
   * Current working directory for workspace-relative path display.
   * Used to convert absolute file paths to short relative paths (逆向: ki() in 2651_unknown_qD0.js).
   */
  cwd?: string;
  /** ... existing selectedItemIndex ... */
  selectedItemIndex?: number | null;
}
```

- [ ] **Step 2: Pass `cwd` from ThreadStateWidget to ConversationView**

In `packages/cli/src/widgets/thread-state-widget.ts:1081-1087`, add cwd. The widget has access to `process.cwd()`:

```ts
              new ConversationView({
                items: displayItems,
                inferenceState:
                  this._inferenceState === "cancelled" ? "idle" : this._inferenceState,
                error: this._error,
                selectedItemIndex: this._selectedItemIndex,
                cwd: process.cwd(),
              }),
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/thread-state-widget.ts
git commit -m "feat: plumb cwd into ConversationViewConfig for workspace-relative paths

逆向: ki() (2651_unknown_qD0.js) uses workspace root to shorten paths"
```

---

### Task 4: Update summary text to use "file read(s)" and `toolName` color

Match amp's `lW0` summary format and colors in the activity group header.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts:965-979` (buildActivitySummary)
- Modify: `packages/cli/src/widgets/conversation-view.ts:1094-1131` (header rendering)
- Test: `packages/cli/src/widgets/__tests__/display-items.test.ts`

**Amp reference:**
- `2816_unknown_lW0.js:13-45` — `lW0(T, R)` builds `[count, "file read(s)"]` spans in `toolName` color
- `actions_intents.js:4461-4467` — header uses `toolRunning` / `toolSuccess` / `toolCancelled` icons + `toolName` color summary

- [ ] **Step 1: Write failing test — summary uses "file read(s)"**

Append to `packages/cli/src/widgets/__tests__/display-items.test.ts`:

```ts
it("buildActivitySummary uses 'file read' / 'file reads' for read actions", () => {
  const items1 = transformThreadToDisplayItems([
    {
      role: "assistant",
      content: [
        { type: "tool_use", id: "t1", name: "Read", input: { file_path: "/a.ts" } },
      ],
    },
    {
      role: "tool",
      content: [
        { type: "tool_result", tool_use_id: "t1", content: "...", run: { status: "done" } },
      ],
    },
  ] as any);
  const group1 = items1.find((i) => i.type === "activity-group") as ActivityGroupItem;
  expect(group1.summary).toBe("1 file read");

  const items2 = transformThreadToDisplayItems([
    {
      role: "assistant",
      content: [
        { type: "tool_use", id: "t1", name: "Read", input: { file_path: "/a.ts" } },
        { type: "tool_use", id: "t2", name: "Read", input: { file_path: "/b.ts" } },
      ],
    },
    {
      role: "tool",
      content: [
        { type: "tool_result", tool_use_id: "t1", content: "...", run: { status: "done" } },
        { type: "tool_result", tool_use_id: "t2", content: "...", run: { status: "done" } },
      ],
    },
  ] as any);
  const group2 = items2.find((i) => i.type === "activity-group") as ActivityGroupItem;
  expect(group2.summary).toBe("2 file reads");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: FAIL — current summary produces `"1 read"` / `"2 reads"` instead of `"1 file read"` / `"2 file reads"`

- [ ] **Step 3: Update `buildActivitySummary` to use "file read(s)"**

In `packages/cli/src/widgets/display-items.ts:974`:

```ts
// Before:
if (counts.read) parts.push(`${counts.read} read${counts.read > 1 ? "s" : ""}`);

// After (逆向: lW0 — "file read" / "file reads"):
if (counts.read) parts.push(`${counts.read} file read${counts.read > 1 ? "s" : ""}`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/cli/src/widgets/__tests__/display-items.test.ts`
Expected: PASS

- [ ] **Step 5: Update activity group header to use `toolName` color instead of dim**

In `packages/cli/src/widgets/conversation-view.ts`, within `_buildActivityGroupWidget` (around lines 1094-1131), change the summary text color from `DIM_COLOR` to `toolNameColor`.

The current code builds `headerSpans` with the summary text. Find the span that renders the summary text (e.g., `"1 file read, 2 searches"`) and change its color:

```ts
// Before:
new TextSpan({
  text: ` ${group.summary}`,
  style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
}),

// After (逆向: lW0 uses R.app.toolName color, no dim):
new TextSpan({
  text: ` ${group.summary}`,
  style: new TextStyle({ foreground: toolNameColor }),
}),
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/display-items.test.ts packages/cli/src/widgets/conversation-view.ts
git commit -m "feat: align activity group summary with amp — 'file read(s)' + toolName color

逆向: lW0 (2816_unknown_lW0.js) uses 'file read'/'file reads' wording
逆向: h9R.build (actions_intents.js:4454) uses R.app.toolName color"
```

---

### Task 5: Render file path as cyan underline hyperlink with workspace-relative path

Replace the dim plain-text path display in expanded activity action rows with a clickable cyan underlined hyperlink showing the workspace-relative path, and append `@start-end` range in yellow when `readRange` is present.

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts:1154-1197` (expanded action row rendering)
- Test: visual verification via tmux E2E

**Amp reference:**
- `misc_utils.js:7789-7809` — `B9R.build`: `H3({ uri: JM(h,T), text: ki(h,T), style: {color: fileReference, dim, underline} })` + `@start-end` in warning color
- `2651_unknown_qD0.js:23-30` — `ki()` workspace-relative path conversion
- `1940_unknown_WQ.js:5-9` — `JM()` file:// URI builder

- [ ] **Step 1: Import `cwdRelativePath` and path utilities at top of conversation-view.ts**

Add import at the top of `packages/cli/src/widgets/conversation-view.ts`:

```ts
import { cwdRelativePath } from "./guidance-file-display.js";
import { resolve, isAbsolute } from "node:path";
```

- [ ] **Step 2: Add helper function `toFileUri` near the color constants**

Add after the color constants section (around line 170) in `conversation-view.ts`:

```ts
/**
 * Build a file:// URI for a given path.
 * 逆向: JM() (1940_unknown_WQ.js:5-9) — resolves relative paths against cwd.
 */
function toFileUri(filePath: string, cwd?: string): string {
  if (filePath.startsWith("file://")) return filePath;
  const abs = isAbsolute(filePath) ? filePath : resolve(cwd ?? process.cwd(), filePath);
  return `file://${abs}`;
}
```

- [ ] **Step 3: Update expanded action row rendering for file-path hyperlinks**

In `_buildActivityGroupWidget`, replace the current path rendering block (lines ~1175-1190). Access `cwd` from `this.widget.config.cwd` and `fileReference` from `appTheme`.

```ts
      // 逆向: B9R (misc_utils.js:7789-7809) — file path as hyperlink + readRange
      const fileRefColor = appTheme?.fileReference ?? Color.cyan();
      const warningColor = appTheme?.warning ?? Color.indexed(3);

      spans.push(
        new TextSpan({
          text: action.toolName,
          style: new TextStyle({ bold: true, foreground: toolNameColor }),
        }),
      );

      const toolPath = action.path;
      if (toolPath) {
        // Workspace-relative display path (逆向: ki() 2651_unknown_qD0.js)
        const displayPath = cwdRelativePath(toolPath, this.widget.config.cwd);
        // Clickable OSC 8 hyperlink (逆向: H3 + JM())
        const fileUri = toFileUri(toolPath, this.widget.config.cwd);
        spans.push(
          new TextSpan({
            text: ` ${displayPath}`,
            style: new TextStyle({
              foreground: fileRefColor,
              dim: true,
              underline: true,
            }),
            url: fileUri,
          }),
        );
      } else if (action.detail) {
        spans.push(
          new TextSpan({
            text: ` ${action.detail}`,
            style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
          }),
        );
      }

      // Read range @start-end (逆向: B9R misc_utils.js:7800-7809)
      if (action.readRange) {
        const [start, end] = action.readRange;
        spans.push(
          new TextSpan({
            text: ` @${start}-${end}`,
            style: new TextStyle({ foreground: warningColor, dim: true }),
          }),
        );
      }
```

- [ ] **Step 4: Verify `warning` color exists in AppTheme**

Check `packages/cli/src/widgets/app-theme-controller.ts`. If `warning` is not in AppTheme, use `Color.indexed(3)` (yellow) directly — this matches amp's `e.colors.warning`. Add it to AppTheme if missing:

```ts
// In AppTheme interface:
warning?: Color;

// In default theme factory:
warning: Color.indexed(3),
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/app-theme-controller.ts
git commit -m "feat: render Read tool path as cyan underline hyperlink + readRange

File paths in expanded activity rows now display as:
- Workspace-relative path (逆向: ki() 2651_unknown_qD0.js)
- Cyan, dim, underlined, clickable OSC 8 hyperlink (逆向: H3/B9R)
- @start-end range suffix in yellow when readRange present (逆向: B9R:7800)"
```

---

### Task 6: Add guidance file notices below action rows

When a Read action discovers guidance files (e.g., AGENTS.md), display "Loaded filename.md (N lines)" in dim green below the action row, matching amp's `B9R` tail rendering.

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts` (expanded action row section)
- Test: visual verification

**Amp reference:**
- `misc_utils.js:7811-7816` — `B9R.build` renders `Loaded ${ZA(h.uri)} (${h.lineCount} lines)` in `toolSuccess` dim

- [ ] **Step 1: Import GuidanceFileDisplay or inline the rendering**

The existing `GuidanceFileDisplay` widget in `packages/cli/src/widgets/guidance-file-display.ts` handles this exact pattern. Check if it can be reused. If `GuidanceFileDisplay` takes an array and returns a widget, use it directly. Otherwise, inline the rendering.

Add to the expanded action row rendering in `_buildActivityGroupWidget`, after building the action `RichText`, conditionally append a guidance file widget:

```ts
      // Guidance file notices (逆向: B9R misc_utils.js:7811-7816)
      if (action.guidanceFiles && action.guidanceFiles.length > 0) {
        const guidanceSpans: TextSpan[] = [];
        for (const gf of action.guidanceFiles) {
          const filename = cwdRelativePath(gf.uri, this.widget.config.cwd);
          guidanceSpans.push(
            new TextSpan({
              text: `  Loaded ${filename} (${gf.lineCount} lines)\n`,
              style: new TextStyle({ foreground: toolSuccessColor, dim: true }),
            }),
          );
        }
        actionWidgets.push(
          new RichText({
            text: new TextSpan({ children: guidanceSpans }),
          }),
        );
      }
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts
git commit -m "feat: display guidance file notices in Read tool activity rows

Shows 'Loaded AGENTS.md (N lines)' in dim green below Read actions
that discovered guidance files.
逆向: B9R (misc_utils.js:7811-7816)"
```

---

### Task 7: Convert action rows to middle-dot bullets with `ExpandableToolHeader`

Replace the current status-icon-prefixed flat rows with amp-style `·` (middle dot) bullet rows. Actions with `detail` or `guidanceFiles` become expandable (nested `ExpandableToolHeader`). Actions without detail remain simple one-line rows.

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts:1152-1203` (expanded action rows)
- The existing `ExpandableToolHeader` widget at `packages/cli/src/widgets/expandable-tool-header.ts` serves as flitter's `Ds`.

**Amp reference:**
- `2817_unknown_Og.js:0-13` — `Og(action, theme)` renders `· title` in `mutedForeground` dim
- `actions_intents.js:4486-4516` — `buildActionRow` wraps in `Ds` when detail/guidanceFiles present
- `2818_unknown_AW0.js:0-23` — `AW0(action, theme)` renders expandable detail (file content + guidance files)

- [ ] **Step 1: Refactor expanded action rows to use middle-dot bullets**

In `_buildActivityGroupWidget`, replace the current action row building loop (lines 1152-1197) with:

```ts
    // Expanded: header + individual action rows
    // 逆向: h9R.buildActionRow (actions_intents.js:4486-4516) — Og() for simple rows, Ds for expandable
    const actionWidgets: Widget[] = [];
    for (const action of group.actions) {
      const fileRefColor = appTheme?.fileReference ?? Color.cyan();
      const warningColor = appTheme?.warning ?? Color.indexed(3);
      const mutedColor = appTheme?.mutedForeground ?? DIM_COLOR;

      // Build the one-line label: "· toolName path @range"
      // 逆向: Og (2817_unknown_Og.js) — "· " bullet in mutedForeground, dim
      const labelSpans: TextSpan[] = [];
      labelSpans.push(
        new TextSpan({
          text: "· ",
          style: new TextStyle({ foreground: mutedColor, dim: true }),
        }),
      );

      // Tool title (path for Read, pattern for search, toolName fallback)
      const toolPath = action.path;
      if (toolPath && action.kind === "read") {
        const displayPath = cwdRelativePath(toolPath, this.widget.config.cwd);
        const fileUri = toFileUri(toolPath, this.widget.config.cwd);
        labelSpans.push(
          new TextSpan({
            text: displayPath,
            style: new TextStyle({
              foreground: fileRefColor,
              dim: true,
              underline: true,
            }),
            url: fileUri,
          }),
        );
      } else {
        const title = toolPath || action.detail || action.toolName;
        labelSpans.push(
          new TextSpan({
            text: title,
            style: new TextStyle({ foreground: mutedColor, dim: true }),
          }),
        );
      }

      // Read range @start-end (逆向: B9R misc_utils.js:7800-7809)
      if (action.readRange) {
        const [start, end] = action.readRange;
        labelSpans.push(
          new TextSpan({
            text: ` @${start}-${end}`,
            style: new TextStyle({ foreground: warningColor, dim: true }),
          }),
        );
      }

      // Determine if this action should be expandable
      // 逆向: actions_intents.js:4489 — expandable when detail or guidanceFiles present
      const hasExpandableContent =
        (action.detail && action.kind === "read" && action.path) ||
        (action.guidanceFiles && action.guidanceFiles.length > 0);

      if (!hasExpandableContent) {
        // Simple one-line row (逆向: Og returns plain xT)
        actionWidgets.push(
          new Padding({
            padding: EdgeInsets.only({ left: 1 }),
            child: new RichText({
              text: new TextSpan({ children: labelSpans }),
              maxLines: 1,
            }),
          }),
        );
      } else {
        // Expandable row with nested detail (逆向: Ds wrapping)
        const detailChildren: Widget[] = [];

        // Detail text (逆向: AW0 renders action.detail in mutedForeground dim)
        if (action.detail) {
          detailChildren.push(
            new RichText({
              text: new TextSpan({
                text: action.detail,
                style: new TextStyle({ foreground: mutedColor, dim: true }),
              }),
            }),
          );
        }

        // Guidance file notices
        if (action.guidanceFiles && action.guidanceFiles.length > 0) {
          const guidanceSpans: TextSpan[] = [];
          for (const gf of action.guidanceFiles) {
            const filename = cwdRelativePath(gf.uri, this.widget.config.cwd);
            guidanceSpans.push(
              new TextSpan({
                text: `Loaded ${filename} (${gf.lineCount} lines)\n`,
                style: new TextStyle({ foreground: toolSuccessColor, dim: true }),
              }),
            );
          }
          detailChildren.push(
            new RichText({
              text: new TextSpan({ children: guidanceSpans }),
            }),
          );
        }

        const detailWidget =
          detailChildren.length === 1
            ? detailChildren[0]!
            : new Column({
                mainAxisSize: "min",
                children: detailChildren,
              });

        actionWidgets.push(
          new Padding({
            padding: EdgeInsets.only({ left: 1 }),
            child: new ExpandableToolHeader({
              label: new RichText({
                text: new TextSpan({ children: labelSpans }),
                maxLines: 1,
              }),
              child: new Padding({
                padding: EdgeInsets.only({ left: 2 }),
                child: detailWidget,
              }),
              isExpanded: false,
            }),
          }),
        );
      }
    }
```

Note: Check `ExpandableToolHeader`'s constructor signature. It uses `ExpandableToolHeaderConfig`. Adapt the above to match the actual API (it may use `config.label` / `config.child` / `config.isExpanded`). Read the `expandable-tool-header.ts` file and adjust field names.

- [ ] **Step 2: Remove the now-superseded guidance-file rendering from Task 6**

Since guidance files are now rendered inside expandable action rows (as nested detail), remove any standalone guidance file rendering added in Task 6 if it was placed outside the action row loop. The guidance file rendering is now part of the expandable content in this task.

- [ ] **Step 3: Verify `mutedForeground` exists in AppTheme**

Check `packages/cli/src/widgets/app-theme-controller.ts`. If `mutedForeground` is not in AppTheme, add it:

```ts
// In AppTheme interface:
mutedForeground?: Color;

// In default theme factory (逆向: yS.default() → LT.default() = mutedForeground):
mutedForeground: Color.default(),
```

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/app-theme-controller.ts
git commit -m "feat: middle-dot bullet action rows with nested expandable detail

Activity group expanded rows now use '·' prefix like amp's Og function.
Read actions with guidanceFiles are expandable via ExpandableToolHeader.
逆向: Og (2817_unknown_Og.js), h9R.buildActionRow (actions_intents.js:4486)"
```

---

### Task 8: Wrap activity group header in `ExpandableToolHeader` (amp's `Ds`)

Replace the current `GestureDetector` + `RichText` + manual `▶/▼` header with the existing `ExpandableToolHeader` widget, matching amp's `Ds` pattern for the entire activity group.

**Important:** `ExpandableToolHeaderConfig.title` is currently a `string` (rendered with `toolName` TextStyle internally). But amp's `Ds` accepts a **Widget** as `title`, and the activity group summary needs custom styled spans (count in one color, "file reads" in another — `lW0` produces styled `TextSpan[]`). We must first extend `ExpandableToolHeaderConfig` to support a `titleWidget` alternative that accepts a pre-built `Widget`.

**Files:**
- Modify: `packages/cli/src/widgets/expandable-tool-header.ts:76-123` (ExpandableToolHeaderConfig) — add `titleWidget?: Widget`
- Modify: `packages/cli/src/widgets/expandable-tool-header.ts:347-420` (ExpandableToolHeaderState.build) — use `titleWidget` when provided
- Modify: `packages/cli/src/widgets/conversation-view.ts:1074-1203` (_buildActivityGroupWidget)

**Amp reference:**
- `misc_utils.js:934-995` — `Ds` accepts `title: Widget` (not string)
- `actions_intents.js:4468-4484` — activity group wrapped in `new Ds({ title: summaryXt, child: actionColumn, expanded, onChanged: onToggle })`

- [ ] **Step 1: Extend `ExpandableToolHeaderConfig` with `titleWidget`**

In `packages/cli/src/widgets/expandable-tool-header.ts:76-78`:

```ts
export interface ExpandableToolHeaderConfig {
  /** Tool name/title displayed in the header row (rendered with toolName style). */
  title?: string;

  /**
   * Pre-built title widget. Takes precedence over `title` string.
   * Use this when the header needs custom styled spans (e.g., activity group summary).
   * 逆向: Ds.title is Widget, not string — needed for lW0-style styled summary.
   */
  titleWidget?: Widget;

  // ... rest of fields unchanged
```

At least one of `title` or `titleWidget` must be provided.

- [ ] **Step 2: Update `ExpandableToolHeaderState.build` to use `titleWidget`**

In `packages/cli/src/widgets/expandable-tool-header.ts`, inside `build()` (line ~370-377), replace:

```ts
    // Before:
    // Title (tool name)
    headerSpans.push(
      new TextSpan({
        text: title,
        style: new TextStyle({ foreground: TOOL_NAME_COLOR }),
      }),
    );

    const labelWidget = new RichText({
      text: new TextSpan({ children: headerSpans }),
    }) as unknown as Widget;

    // After:
    let labelWidget: Widget;
    if (this.widget.config.titleWidget) {
      // Custom title widget — prepend status icon if present
      if (headerSpans.length > 0) {
        // headerSpans contains only the status icon span at this point
        const iconWidget = new RichText({
          text: new TextSpan({ children: headerSpans }),
        }) as unknown as Widget;
        labelWidget = new Row({
          children: [iconWidget, this.widget.config.titleWidget],
        }) as unknown as Widget;
      } else {
        labelWidget = this.widget.config.titleWidget;
      }
    } else {
      // String title — original behavior
      headerSpans.push(
        new TextSpan({
          text: title ?? "",
          style: new TextStyle({ foreground: TOOL_NAME_COLOR }),
        }),
      );
      labelWidget = new RichText({
        text: new TextSpan({ children: headerSpans }),
      }) as unknown as Widget;
    }
```

- [ ] **Step 3: Refactor `_buildActivityGroupWidget` to use `ExpandableToolHeader`**

Replace the manual header construction and expand/collapse logic with `ExpandableToolHeader`. The header contains the styled summary. The child is the column of action rows.

```ts
  private _buildActivityGroupWidget(
    group: ActivityGroupItem,
    itemIndex?: number,
    appTheme?: AppTheme | null,
  ): Widget {
    const toolRunningColor = appTheme?.toolRunning ?? TOOL_RUNNING_COLOR;
    const toolSuccessColor = appTheme?.toolSuccess ?? SUCCESS_COLOR;
    const toolNameColor = appTheme?.toolName ?? TOOL_NAME_COLOR;
    const cancelledColor = appTheme?.toolCancelled ?? CANCELLED_COLOR;

    // Determine expand/collapse state
    // 逆向: denseViewItemStates.get(id) ?? !completed
    const isCompleted = !group.hasInProgress;
    const isExpanded = this._activityGroupExpanded.get(itemIndex ?? -1) ?? !isCompleted;

    // Build styled summary widget (逆向: lW0 — count + "file reads" in toolName color)
    const summaryWidget = new RichText({
      text: new TextSpan({
        text: group.summary,
        style: new TextStyle({ foreground: toolNameColor }),
      }),
      maxLines: 1,
    }) as unknown as Widget;

    // Build action rows (逆向: h9R.buildActionRow with Og / Ds nesting)
    const actionWidgets = this._buildActionRows(group, appTheme);

    const actionsColumn =
      actionWidgets.length === 0
        ? new SizedBox({})
        : new Column({
            mainAxisSize: "min",
            crossAxisAlignment: "start",
            children: actionWidgets,
          });

    // Determine status + color for ExpandableToolHeader icon
    const headerStatus = group.hasInProgress ? "in-progress" : "done";
    const statusColor = group.hasInProgress ? toolRunningColor : toolSuccessColor;

    return new ExpandableToolHeader({
      titleWidget: summaryWidget,
      child: actionsColumn,
      isExpanded,
      status: headerStatus as ToolStatus,
      statusColor,
      onToggle:
        itemIndex !== undefined
          ? (expanded: boolean) => {
              this.setState(() => {
                this._activityGroupExpanded.set(itemIndex, expanded);
              });
            }
          : undefined,
    });
  }
```

Extract the action row building into a private method `_buildActionRows(group, appTheme)` that contains the loop from Task 7.

- [ ] **Step 4: Verify status icons render correctly**

`ExpandableToolHeader` already supports all status states via `statusToIcon()`:
- `done` → `✓` with `statusColor` (green)
- `error` → `✗` with `statusColor` (red)
- `cancelled` → `✗` with `statusColor` (yellow)
- `in-progress` → braille spinner with `statusColor` (blue)

Pass the appropriate `statusColor` from the appTheme semantic colors to match amp exactly.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/expandable-tool-header.ts packages/cli/src/widgets/conversation-view.ts
git commit -m "feat: wrap activity group in ExpandableToolHeader matching amp's Ds

Extends ExpandableToolHeader with titleWidget for custom styled labels.
Activity groups now use ExpandableToolHeader for expand/collapse with
animated spinner during in-progress and status icons on completion.
逆向: Ds (misc_utils.js:934-995), h9R.build (actions_intents.js:4479)"
```

---

### Task 9: Progressive animation for action rows

When the activity group is active (in-progress), newly appearing action rows should animate in one-by-one at 90ms intervals, matching amp's `_scheduleAppendStep`.

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts` (ConversationViewState)

**Amp reference:**
- `actions_intents.js:4399-4443` — `h9R` state: `visibleActionCount`, `_scheduleAppendStep(T)` at 90ms, `_pendingAppendTimer`, progressive reveal

- [ ] **Step 1: Add progressive animation state to `ConversationViewState`**

Add state fields to `ConversationViewState`:

```ts
  /** Per activity-group progressive animation state.
   * 逆向: h9R (actions_intents.js:4397-4443) — visibleActionCount + _scheduleAppendStep(90ms) */
  private _activityGroupVisibleCount: Map<number, number> = new Map();
  private _activityGroupAppendTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();
```

- [ ] **Step 2: Implement `_scheduleAppendStep` method**

```ts
  /**
   * Progressively reveal action rows at 90ms intervals.
   * 逆向: h9R._scheduleAppendStep (actions_intents.js:4436-4443)
   */
  private _scheduleAppendStep(itemIndex: number, targetCount: number): void {
    if ((this._activityGroupVisibleCount.get(itemIndex) ?? 0) >= targetCount) return;
    if (this._activityGroupAppendTimers.has(itemIndex)) return;

    const timer = setTimeout(() => {
      this._activityGroupAppendTimers.delete(itemIndex);
      this.setState(() => {
        const current = this._activityGroupVisibleCount.get(itemIndex) ?? 0;
        this._activityGroupVisibleCount.set(itemIndex, Math.min(current + 1, targetCount));
      });
      this._scheduleAppendStep(itemIndex, targetCount);
    }, 90);
    this._activityGroupAppendTimers.set(itemIndex, timer);
  }
```

- [ ] **Step 3: Use `visibleCount` to slice action rows in rendering**

In `_buildActionRows` (or the expanded section of `_buildActivityGroupWidget`), when the group is in-progress:

```ts
    const totalActions = group.actions.length;
    let visibleCount: number;
    if (group.hasInProgress && itemIndex !== undefined) {
      visibleCount = this._activityGroupVisibleCount.get(itemIndex) ?? 0;
      // Schedule progressive reveal if not yet showing all
      if (visibleCount < totalActions) {
        this._scheduleAppendStep(itemIndex, totalActions);
      }
    } else {
      // Completed: show all immediately
      visibleCount = totalActions;
      // Clean up any pending timer
      if (itemIndex !== undefined) {
        const timer = this._activityGroupAppendTimers.get(itemIndex);
        if (timer) {
          clearTimeout(timer);
          this._activityGroupAppendTimers.delete(itemIndex);
        }
        this._activityGroupVisibleCount.delete(itemIndex);
      }
    }

    const visibleActions = group.actions.slice(0, visibleCount);
```

Then iterate `visibleActions` instead of `group.actions` when building rows.

- [ ] **Step 4: Clean up timers in `dispose`**

```ts
  override dispose(): void {
    for (const timer of this._activityGroupAppendTimers.values()) {
      clearTimeout(timer);
    }
    this._activityGroupAppendTimers.clear();
    super.dispose();
  }
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts
git commit -m "feat: progressive 90ms animation for activity group action rows

New action rows animate in one-by-one at 90ms intervals when the
activity group is in-progress, matching amp's h9R._scheduleAppendStep.
逆向: actions_intents.js:4436-4443"
```

---

### Task 10: Auto-collapse completed activity groups

When an activity group transitions from in-progress to done, auto-collapse it (matching amp's `_closeDenseActivityGroupsOnBoundary`).

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts`

**Amp reference:**
- `n8R._closeDenseActivityGroupsOnBoundary` (1951_unknown_n8R.js:218-244)
- `n8R._shouldCollapseDenseActivityGroup` (1951_unknown_n8R.js:227-244)

- [ ] **Step 1: Track previous `hasInProgress` state per group**

Add a map to track the previous in-progress state:

```ts
  private _activityGroupWasInProgress: Map<number, boolean> = new Map();
```

- [ ] **Step 2: Auto-collapse in `build` or `didUpdateWidget`**

In the method that builds activity groups, when rendering each group, check if it transitioned from in-progress to done, and auto-collapse:

```ts
    // 逆向: n8R._closeDenseActivityGroupsOnBoundary (1951_unknown_n8R.js:218-244)
    if (itemIndex !== undefined) {
      const wasInProgress = this._activityGroupWasInProgress.get(itemIndex) ?? false;
      if (wasInProgress && !group.hasInProgress) {
        // Auto-collapse when transitioning to done
        // Only if user hasn't manually toggled (touched) this group
        if (!this._activityGroupTouched.has(itemIndex)) {
          this._activityGroupExpanded.set(itemIndex, false);
        }
      }
      this._activityGroupWasInProgress.set(itemIndex, group.hasInProgress);
    }
```

Add a `_activityGroupTouched` set to track manual user toggles:

```ts
  private _activityGroupTouched: Set<number> = new Set();
```

In the `onToggle` callback, mark the group as touched:

```ts
    onToggle: (expanded: boolean) => {
      this.setState(() => {
        this._activityGroupExpanded.set(itemIndex, expanded);
        this._activityGroupTouched.add(itemIndex);
      });
    },
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts
git commit -m "feat: auto-collapse completed activity groups

Activity groups auto-collapse when transitioning from in-progress to done,
unless the user has manually toggled them.
逆向: n8R._closeDenseActivityGroupsOnBoundary (1951_unknown_n8R.js:218)"
```

---

### Task 11: Integration verification — tmux E2E test

Verify the complete rendering pipeline works in a real terminal session.

**Files:**
- Create: `tests/e2e/read-tool-display.sh`

- [ ] **Step 1: Build the project**

```bash
bun run build
```

Fix any type errors that arise from the changes.

- [ ] **Step 2: Run all existing tests**

```bash
bun test
```

Fix any failures.

- [ ] **Step 3: Write tmux E2E test**

Create `tests/e2e/read-tool-display.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Launch flitter in a tmux session with a mock conversation that triggers Read tool display.
# This test verifies the visual rendering matches amp's patterns.

APP="packages/cli/dist/index.js"
SESSION="test-read-display"
LOG="/tmp/test-read-display.log"

tmux new-session -d -s "$SESSION" -x 100 -y 30 "bun run $APP 2>$LOG" || true
sleep 2

# Capture the pane and check for expected patterns:
# 1. Activity group header should show "file read" (not just "read")
# 2. File paths should show relative paths (not absolute)
# 3. The ✓ or spinner icon should be present

OUTPUT=$(tmux capture-pane -t "$SESSION" -p 2>/dev/null || echo "CAPTURE_FAILED")

echo "=== Captured Output ==="
echo "$OUTPUT"
echo "======================="

# Cleanup
tmux kill-session -t "$SESSION" 2>/dev/null || true

echo "Manual verification required — check the captured output above."
echo "Expected patterns:"
echo "  - 'file read' in activity summary (not just 'read')"
echo "  - Relative file paths (not absolute /Users/... paths)"
echo "  - ✓ or spinner icons for status"
echo "  - · (middle dot) bullets for expanded action rows"
```

- [ ] **Step 4: Run the tmux E2E test**

```bash
chmod +x tests/e2e/read-tool-display.sh
bash tests/e2e/read-tool-display.sh
```

Manually inspect the output for correctness.

- [ ] **Step 5: Final commit**

```bash
git add tests/e2e/read-tool-display.sh
git commit -m "test: add tmux E2E test for Read tool display alignment

Verifies the complete rendering pipeline for Read tool activity groups:
hyperlink paths, file read summary, middle-dot bullets, and status icons."
```

---

### Task 12: Update HEALTH.md

Per project rule 6, update HEALTH.md with the changes made in this implementation.

- [ ] **Step 1: Update test counts and any affected sections**

Run the data verification commands from HEALTH.md and update:
- New test count
- Any new technical debt items
- Dependency changes (none expected)

- [ ] **Step 2: Commit**

```bash
git add HEALTH.md
git commit -m "chore: update HEALTH.md after Read tool display alignment"
```
