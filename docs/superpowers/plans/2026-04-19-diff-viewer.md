# File Diff Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw text rendering of Edit tool results with an inline diff viewer that shows color-coded additions (green) and deletions (red), matching amp's `cE0()` diff rendering function.

**Architecture:** Amp generates unified diffs using the `$A()` function (which wraps `iM()` / `createTwoFilesPatch` from the `diff` library), then renders them via `cE0()` which splits on newlines and color-codes `+`/`-` prefixed lines. The diff is stored on the tool result's `diff` field and rendered inside the expanded tool action view. Flitter needs: (1) a `DiffWidget` that parses and renders unified diff text with colors, (2) diff generation for Edit tool results (computing old_str/new_str diff), (3) integration into `ConversationView._buildToolWidget` for edit-kind tools.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/tui` (RichText, TextSpan, Column), `diff` npm package (for `createTwoFilesPatch`)

**Amp reference:**
- `amp-cli-reversed/modules/1186_unknown_dWT.js:1-7` ($A — unified diff generator using `iM`/`createTwoFilesPatch`)
- `amp-cli-reversed/chunk-004.js:21064-21067` — edit branch: `if (T.diff) t.push(cE0(T.diff, R))`
- `amp-cli-reversed/chunk-004.js:21105-21125` — `cE0()`: splits diff text on newlines, colors `+` lines green (diffAdded), `-` lines red (diffRemoved), context lines dim
- `amp-cli-reversed/chunk-004.js:8931-8934` — theme: `diffAdded`, `diffRemoved`, `diffChanged`, `diffContext`
- `amp-cli-reversed/chunk-004.js:9041-9044` — dark theme colors: `diffAdded: LT.green`, `diffRemoved: LT.red`, `diffChanged: LT.yellow`, `diffContext: LT.index(8)`
- `amp-cli-reversed/chunk-004.js:29563-29566` — Tokyo Night: `diffAdded: T.success`, `diffRemoved: T.destructive`, `diffChanged: T.warning`, `diffContext: T.mutedForeground`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/cli/src/widgets/diff-widget.ts` | DiffWidget: parse and render unified diff with colors |
| Modify | `packages/cli/src/widgets/conversation-view.ts` | Integrate DiffWidget for edit tool results |
| Modify | `packages/cli/src/widgets/display-items.ts` | Add `diff` field to ToolItem for edit/create-file kinds |
| Create | `packages/cli/src/widgets/__tests__/diff-widget.test.ts` | Unit tests for diff rendering |

---

### Task 1: Create DiffWidget that renders unified diff with colors

**Why first:** This is the core rendering component. Everything else depends on it.

**Files:**
- Create: `packages/cli/src/widgets/diff-widget.ts`
- Create: `packages/cli/src/widgets/__tests__/diff-widget.test.ts`

**Amp reference:** `chunk-004.js:21105-21125` — `cE0(T, R)`:
```
function cE0(T, R) {
  let a = T.split("\n"), e = [];
  for (let t of a) {
    if (e.length > 0) e.push(new G("\n"));
    if (t.startsWith("+")) e.push(new G(t, new cT({ color: R.app.diffAdded })));
    else if (t.startsWith("-")) e.push(new G(t, new cT({ color: R.app.diffRemoved })));
    else e.push(new G(t, new cT({ color: R.colors.foreground, dim: true })));
  }
  return new xT({ text: new G("", void 0, e), selectable: true });
}
```

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/widgets/__tests__/diff-widget.test.ts
import { describe, expect, it } from "bun:test";
import { parseDiffLines, type DiffLine } from "../diff-widget";

describe("parseDiffLines", () => {
  it("parses unified diff into typed lines", () => {
    const diff = `--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
 const x = 1;
-const y = 2;
+const y = 3;
 const z = 4;`;
    const lines = parseDiffLines(diff);
    // Should skip header lines (---/+++/@@) and parse content
    expect(lines.length).toBe(7);
    expect(lines[0]).toEqual({ type: "meta", text: "--- a/file.ts" });
    expect(lines[1]).toEqual({ type: "meta", text: "+++ b/file.ts" });
    expect(lines[2]).toEqual({ type: "meta", text: "@@ -1,3 +1,3 @@" });
    expect(lines[3]).toEqual({ type: "context", text: " const x = 1;" });
    expect(lines[4]).toEqual({ type: "removed", text: "-const y = 2;" });
    expect(lines[5]).toEqual({ type: "added", text: "+const y = 3;" });
    expect(lines[6]).toEqual({ type: "context", text: " const z = 4;" });
  });

  it("handles empty diff", () => {
    const lines = parseDiffLines("");
    expect(lines).toEqual([]);
  });

  it("handles diff with only additions", () => {
    const diff = `+line 1
+line 2`;
    const lines = parseDiffLines(diff);
    expect(lines).toEqual([
      { type: "added", text: "+line 1" },
      { type: "added", text: "+line 2" },
    ]);
  });

  it("handles diff with only deletions", () => {
    const diff = `-old line 1
-old line 2`;
    const lines = parseDiffLines(diff);
    expect(lines).toEqual([
      { type: "removed", text: "-old line 1" },
      { type: "removed", text: "-old line 2" },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/diff-widget.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the DiffWidget module**

```typescript
// packages/cli/src/widgets/diff-widget.ts
/**
 * DiffWidget -- inline unified diff renderer with color-coded lines.
 *
 * 逆向: cE0() (chunk-004.js:21105-21125)
 * Renders unified diff text with:
 * - Green for added lines (+)
 * - Red for removed lines (-)
 * - Dim for context lines (space prefix)
 * - Muted for meta lines (---/+++/@@)
 *
 * Also exports parseDiffLines() for testability and
 * generateUnifiedDiff() for computing diffs from old/new strings.
 *
 * @module
 */

import type { Widget } from "@flitter/tui";
import { Color, RichText, TextSpan, TextStyle } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Colors (Tokyo Night theme, matching amp)
// ════════════════════════════════════════════════════

/**
 * Diff line colors matching amp's Tokyo Night theme.
 * 逆向: chunk-004.js:29563-29566
 * - diffAdded: T.success (#9ece6a)
 * - diffRemoved: T.destructive (#f7768e)
 * - diffContext: T.mutedForeground (#565f89)
 */
const DIFF_ADDED_COLOR = Color.rgb(0x9e, 0xce, 0x6a);
const DIFF_REMOVED_COLOR = Color.rgb(0xf7, 0x76, 0x8e);
const DIFF_CONTEXT_COLOR = Color.rgb(0x56, 0x5f, 0x89);
const DIFF_META_COLOR = Color.rgb(0x56, 0x5f, 0x89);

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

export type DiffLineType = "added" | "removed" | "context" | "meta";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

// ════════════════════════════════════════════════════
//  Parser
// ════════════════════════════════════════════════════

/**
 * Parse unified diff text into typed lines.
 *
 * 逆向: cE0 splits on "\n" then checks startsWith("+") / startsWith("-")
 * We add "meta" type for ---/+++/@@ header lines.
 */
export function parseDiffLines(diffText: string): DiffLine[] {
  if (!diffText || diffText.trim() === "") return [];

  const rawLines = diffText.split("\n");
  const result: DiffLine[] = [];

  for (const line of rawLines) {
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) {
      result.push({ type: "meta", text: line });
    } else if (line.startsWith("+")) {
      result.push({ type: "added", text: line });
    } else if (line.startsWith("-")) {
      result.push({ type: "removed", text: line });
    } else {
      result.push({ type: "context", text: line });
    }
  }

  return result;
}

// ════════════════════════════════════════════════════
//  Diff generation
// ════════════════════════════════════════════════════

/**
 * Generate a minimal unified diff from old and new strings.
 *
 * 逆向: $A(T, R, a) in modules/1186_unknown_dWT.js
 * Uses `iM()` which is `createTwoFilesPatch` from the `diff` library.
 *
 * Since we want to avoid adding a dependency on the `diff` npm package
 * (and amp bundles it inline), we implement a simple line-diff here.
 * For the MVP, we generate a simplified diff showing removed/added lines.
 * If exact `diff` library parity is needed later, add the dep.
 */
export function generateSimpleDiff(oldStr: string, newStr: string, fileName = "file"): string {
  const oldLines = normalizeLineEndings(oldStr).split("\n");
  const newLines = normalizeLineEndings(newStr).split("\n");

  const result: string[] = [];
  result.push(`--- a/${fileName}`);
  result.push(`+++ b/${fileName}`);

  // Simple LCS-based diff — for short strings this is sufficient.
  // For production, consider using the `diff` package.
  const { hunks } = computeHunks(oldLines, newLines);

  for (const hunk of hunks) {
    result.push(`@@ -${hunk.oldStart + 1},${hunk.oldCount} +${hunk.newStart + 1},${hunk.newCount} @@`);
    for (const line of hunk.lines) {
      result.push(line);
    }
  }

  return result.join("\n");
}

function normalizeLineEndings(str: string): string {
  return str.replace(/\r\n/g, "\n");
}

interface Hunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}

/**
 * Compute diff hunks using a simple approach:
 * If old is empty, everything is added; if new is empty, everything is removed.
 * Otherwise, find common prefix/suffix and show the changed middle.
 */
function computeHunks(oldLines: string[], newLines: string[]): { hunks: Hunk[] } {
  // Find common prefix
  let prefixLen = 0;
  const minLen = Math.min(oldLines.length, newLines.length);
  while (prefixLen < minLen && oldLines[prefixLen] === newLines[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix (but not overlapping with prefix)
  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    oldLines[oldLines.length - 1 - suffixLen] === newLines[newLines.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const oldChanged = oldLines.slice(prefixLen, oldLines.length - suffixLen);
  const newChanged = newLines.slice(prefixLen, newLines.length - suffixLen);

  if (oldChanged.length === 0 && newChanged.length === 0) {
    return { hunks: [] };
  }

  const contextBefore = Math.min(3, prefixLen);
  const contextAfter = Math.min(3, suffixLen);

  const hunkOldStart = prefixLen - contextBefore;
  const hunkNewStart = prefixLen - contextBefore;
  const hunkLines: string[] = [];

  // Context before
  for (let i = prefixLen - contextBefore; i < prefixLen; i++) {
    hunkLines.push(` ${oldLines[i]}`);
  }

  // Removed lines
  for (const line of oldChanged) {
    hunkLines.push(`-${line}`);
  }

  // Added lines
  for (const line of newChanged) {
    hunkLines.push(`+${line}`);
  }

  // Context after
  for (let i = oldLines.length - suffixLen; i < oldLines.length - suffixLen + contextAfter; i++) {
    if (i < oldLines.length) {
      hunkLines.push(` ${oldLines[i]}`);
    }
  }

  const oldCount = contextBefore + oldChanged.length + contextAfter;
  const newCount = contextBefore + newChanged.length + contextAfter;

  return {
    hunks: [{
      oldStart: hunkOldStart,
      oldCount,
      newStart: hunkNewStart,
      newCount,
      lines: hunkLines,
    }],
  };
}

// ════════════════════════════════════════════════════
//  Widget
// ════════════════════════════════════════════════════

/**
 * Build a diff widget from unified diff text.
 *
 * 逆向: cE0(T, R) (chunk-004.js:21105-21125)
 * Returns a RichText widget with color-coded spans for each diff line.
 *
 * This is a function (not a StatefulWidget) because the diff is immutable
 * once rendered — no state transitions needed.
 */
export function buildDiffWidget(diffText: string): Widget {
  const lines = parseDiffLines(diffText);
  if (lines.length === 0) {
    return new RichText({
      text: new TextSpan({
        text: "(no changes)",
        style: new TextStyle({ foreground: DIFF_CONTEXT_COLOR }),
      }),
    });
  }

  const spans: TextSpan[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Newline between lines (逆向: cE0 pushes new G("\n") between lines)
    if (i > 0) {
      spans.push(new TextSpan({ text: "\n" }));
    }

    const color = _getLineColor(line.type);
    const dim = line.type === "context" || line.type === "meta";

    spans.push(
      new TextSpan({
        text: line.text,
        style: new TextStyle({ foreground: color, dim }),
      }),
    );
  }

  return new RichText({
    text: new TextSpan({ children: spans }),
  });
}

function _getLineColor(type: DiffLineType): Color {
  switch (type) {
    case "added":
      return DIFF_ADDED_COLOR;
    case "removed":
      return DIFF_REMOVED_COLOR;
    case "context":
      return DIFF_CONTEXT_COLOR;
    case "meta":
      return DIFF_META_COLOR;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/diff-widget.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/diff-widget.ts packages/cli/src/widgets/__tests__/diff-widget.test.ts
git commit -m "feat(tui): add DiffWidget for color-coded unified diff rendering

Implements parseDiffLines() to classify diff lines as added/removed/context/meta,
buildDiffWidget() to render them with green/red/dim colors matching amp's cE0(),
and generateSimpleDiff() for computing diffs from old/new strings.

逆向: amp cE0() (chunk-004.js:21105-21125),
       \$A() (modules/1186_unknown_dWT.js:1-7)"
```

---

### Task 2: Add diff field to ToolItem and generate diffs for edit results

**Why:** The conversation view needs a `diff` string on edit ToolItems to pass to the DiffWidget.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` (add `diff` field to ToolItem)
- Test: `packages/cli/src/widgets/__tests__/diff-widget.test.ts` (append)

**Amp reference:** `chunk-004.js:7793-7803` — when tool status is "done" and result has a `diff` field, it's stored on the display item. `chunk-004.js:8126-8137` — edit merges diff fields.

- [ ] **Step 1: Add diff field to ToolItem**

In `packages/cli/src/widgets/display-items.ts`, add to the ToolItem interface:

```typescript
// In ToolItem interface, after the error field:
  /** Unified diff text for edit/create-file results */
  diff?: string;
```

- [ ] **Step 2: Generate diff in transformThreadToDisplayItems for edit tools**

In `packages/cli/src/widgets/display-items.ts`, in the EDIT_TOOLS branch of the transformer, compute the diff:

```typescript
// Import at top:
import { generateSimpleDiff } from "./diff-widget";

// In the EDIT_TOOLS branch, after setting path/oldString/newString:
const diffText = (typeof block.input?.old_string === "string" && typeof block.input?.new_string === "string")
  ? generateSimpleDiff(
      block.input.old_string as string,
      block.input.new_string as string,
      (block.input.file_path as string) ?? "file",
    )
  : undefined;

// Add to the items.push call:
diff: diffText,
```

- [ ] **Step 3: Write test for diff generation in display items**

Append to test file:

```typescript
import { generateSimpleDiff } from "../diff-widget";

describe("generateSimpleDiff", () => {
  it("generates unified diff for simple replacement", () => {
    const diff = generateSimpleDiff("hello\nworld\n", "hello\nearth\n", "test.txt");
    expect(diff).toContain("--- a/test.txt");
    expect(diff).toContain("+++ b/test.txt");
    expect(diff).toContain("-world");
    expect(diff).toContain("+earth");
  });

  it("generates diff for pure addition", () => {
    const diff = generateSimpleDiff("", "new content\n", "new.txt");
    expect(diff).toContain("+new content");
  });

  it("generates empty hunks for identical content", () => {
    const diff = generateSimpleDiff("same\n", "same\n", "file.txt");
    // Should have headers but no hunks
    expect(diff).toContain("--- a/file.txt");
    expect(diff).not.toContain("+same");
    expect(diff).not.toContain("-same");
  });
});
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/diff-widget.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/diff-widget.test.ts
git commit -m "feat(tui): add diff field to ToolItem and generate diffs for edits

Edit tool results now carry a unified diff string computed from
old_string/new_string via generateSimpleDiff(). This diff text
is passed to the DiffWidget for rendering.

逆向: amp chunk-004.js:7793-7803 (diff field on tool result)"
```

---

### Task 3: Integrate DiffWidget into conversation-view for Edit tool results

**Why:** Wire the DiffWidget into the actual rendering path so users see color-coded diffs.

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts` (import buildDiffWidget, use in _buildToolWidget)
- Test: `packages/cli/src/widgets/__tests__/diff-widget.test.ts` (append integration test)

**Amp reference:** `chunk-004.js:21064-21067`:
```
case "edit":
  if (T.diff) t.push(cE0(T.diff, R));
  break;
```

- [ ] **Step 1: Import buildDiffWidget in conversation-view.ts**

At the top of `packages/cli/src/widgets/conversation-view.ts`:

```typescript
import { buildDiffWidget } from "./diff-widget.js";
```

- [ ] **Step 2: Add diff rendering to _buildToolWidget**

In `ConversationViewState._buildToolWidget`, after the main row, before the error check, add diff rendering for edit and create-file tools:

```typescript
  // 逆向: chunk-004.js:21064-21067 — edit branch renders diff
  if ((tool.kind === "edit" || tool.kind === "create-file") && tool.diff) {
    return new Column({
      children: [
        mainRow,
        buildDiffWidget(tool.diff),
      ],
    });
  }
```

This should be inserted before the existing error check block (`if (tool.error) { ... }`), with the error block becoming an `else if`.

- [ ] **Step 3: Write integration test**

Append to test file:

```typescript
describe("DiffWidget integration", () => {
  it("buildDiffWidget renders added lines with correct structure", () => {
    const widget = buildDiffWidget("+added line\n-removed line\n context");
    // Widget should be a RichText (we just verify it doesn't throw)
    expect(widget).toBeDefined();
  });

  it("buildDiffWidget handles empty diff gracefully", () => {
    const widget = buildDiffWidget("");
    expect(widget).toBeDefined();
  });
});
```

- [ ] **Step 4: Run full tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/diff-widget.test.ts`
Expected: PASS

- [ ] **Step 5: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/diff-widget.test.ts
git commit -m "feat(tui): integrate DiffWidget into conversation-view for edit results

Edit and create-file tool results now render inline color-coded diffs
with green additions and red deletions, matching amp's cE0() rendering.

逆向: amp chunk-004.js:21064-21067 (edit branch: cE0(T.diff, R))"
```

---

### Task 4: Full test suite and type check

- [ ] **Step 1: Run type check across all packages**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json && bunx tsc --noEmit -p packages/tui/tsconfig.json`
Expected: No type errors

- [ ] **Step 2: Run all existing tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 3: E2E verification**

```bash
tmux new-session -d -s test -x 80 -y 24 "bun run packages/cli/src/main.ts 2>/tmp/diff-test.log"
sleep 3
# Trigger an edit tool use and verify diff rendering
tmux send-keys -t test "edit a file to add a comment" Enter
sleep 10
# Should see green (+) and red (-) lines in the tool result
tmux capture-pane -t test -p | grep -E "^\+" && echo "OK: additions visible" || echo "FAIL: no additions"
tmux capture-pane -t test -p | grep -E "^-" && echo "OK: deletions visible" || echo "FAIL: no deletions"
tmux kill-session -t test
```
