# Phase 3: Chat View Alignment — Tool Detail & Interaction Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining UI gaps between flitter-cli and amp-cli's chat view: thinking block click-to-expand, apply_patch multi-file diff rendering, bash sed/perl write-like detection, and specialized activity group builders (finder, code_review, code_tour).

**Architecture:** All changes are in the widget layer (display-items.ts transformer + conversation-view.ts renderer). No backend/API changes needed. Each task is independent except Task 1 (Disclosure consumer) which should precede Task 4 (finder/code_review/code_tour share the same ActivityAction extension).

**Tech Stack:** TypeScript, @flitter/tui widgets, Bun test runner

**Deferred to Phase 4** (require backend API changes or major new systems):
- Message edit/selection/restore (GQ/zQ) — needs thread handle API, focus management, new widget types
- Image preview modal — needs Kitty graphics protocol, image loading pipeline
- aggman mode — entirely separate agent mode

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/cli/src/widgets/display-items.ts` | Modify | Tasks 2, 3, 4: apply_patch parsing, bash classifier, activity group builders |
| `packages/cli/src/widgets/conversation-view.ts` | Modify | Tasks 1, 2, 3: thinking click, apply_patch rendering, sed/perl as edit row |
| `packages/cli/src/utils/bash-classifier.ts` | Create | Task 3: Shell command classifier (逆向: WO/IzR/yzT) |
| `packages/cli/src/widgets/__tests__/thinking-click.test.ts` | Create | Task 1 tests |
| `packages/cli/src/widgets/__tests__/apply-patch-diff.test.ts` | Create | Task 2 tests |
| `packages/cli/src/utils/__tests__/bash-classifier.test.ts` | Create | Task 3 tests |
| `packages/cli/src/widgets/__tests__/activity-group-builders.test.ts` | Create | Task 4 tests |

---

### Task 1: Thinking Block Click-to-Expand

**Context:** The thinking block shows a ▶/▼ chevron but has no GestureDetector — clicking does nothing. amp wraps the header in G0 (GestureDetector) only when the block is complete and has content. The existing Disclosure widget (packages/tui/src/widgets/disclosure.ts) is currently unused — this task gives it a consumer.

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts` (the `_buildThinkingWidget` method, ~lines 982-1056)
- Test: `packages/cli/src/widgets/__tests__/thinking-click.test.ts`

**amp reference:** `fJT.build()` at chunk-006.js:16900-17026. Header wrapped in `G0` only when `isComplete && c` (has content). Streaming blocks always show content, never collapsible. `_handleHeaderClick` toggles `_localExpanded` and fires `onToggle`.

- [ ] **Step 1: Write failing tests**

```typescript
// packages/cli/src/widgets/__tests__/thinking-click.test.ts
import { describe, expect, test } from "bun:test";
import { GestureDetector } from "@flitter/tui";
import { ThinkingItem } from "../display-items.js";

// Helper: find GestureDetector in widget tree
function findGestureDetector(widget: any): any | null {
  if (widget instanceof GestureDetector) return widget;
  const children = widget?.children ?? widget?.child ? [widget.child] : [];
  for (const c of Array.isArray(children) ? children : [children]) {
    if (!c) continue;
    const found = findGestureDetector(c);
    if (found) return found;
  }
  return null;
}

describe("thinking block click-to-expand", () => {
  test("complete thinking with content has GestureDetector", () => {
    // Build a ThinkingItem that is complete (not streaming, not cancelled) with content
    const item: ThinkingItem = { type: "thinking", text: "Let me analyze this...", isStreaming: false, isCancelled: false };
    // Will test that _buildThinkingWidget produces a tree containing GestureDetector
    // (exact test structure depends on how we expose the builder for testing)
    expect(true).toBe(true); // placeholder — real test calls the widget builder
  });

  test("streaming thinking has NO GestureDetector", () => {
    const item: ThinkingItem = { type: "thinking", text: "Analyzing...", isStreaming: true };
    // Should NOT have a GestureDetector — streaming blocks are always expanded
    expect(true).toBe(true);
  });

  test("complete thinking with empty text has NO GestureDetector", () => {
    const item: ThinkingItem = { type: "thinking", text: "", isStreaming: false };
    // No content → no expand/collapse
    expect(true).toBe(true);
  });

  test("cancelled thinking with content has GestureDetector", () => {
    const item: ThinkingItem = { type: "thinking", text: "Was thinking...", isCancelled: true };
    // Cancelled but has content → still clickable (matches amp behavior)
    expect(true).toBe(true);
  });
});
```

Note: The exact test approach depends on whether we can instantiate `_buildThinkingWidget` in isolation. If not, test via `transformThreadToDisplayItems` + widget tree inspection. The implementer should determine the best testing strategy.

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/cli/src/widgets/__tests__/thinking-click.test.ts -v`

- [ ] **Step 3: Implement click-to-expand**

In `_buildThinkingWidget` (conversation-view.ts ~line 982):

1. **Guard the chevron:** Only show ▶/▼ when `!item.isStreaming && hasContent` (currently shows when `hasContent` only).

2. **Wrap header in GestureDetector** when `!item.isStreaming && hasContent`:
```typescript
import { GestureDetector } from "@flitter/tui";

// Inside _buildThinkingWidget, after building headerRow:
const isComplete = !item.isStreaming;
const isClickable = isComplete && hasContent;

if (isClickable) {
  const clickableHeader = new GestureDetector({
    onTap: () => {
      this.setState(() => {
        if (this._expandedThinking.has(itemIndex)) {
          this._expandedThinking.delete(itemIndex);
        } else {
          this._expandedThinking.add(itemIndex);
        }
      });
    },
    child: headerRow,
  });
  // Use clickableHeader instead of headerRow in the Column
}
```

3. **Streaming blocks always show content** (already the case — when `isStreaming`, content is shown regardless of `_expandedThinking`). Add explicit guard:
```typescript
const showContent = hasContent && (item.isStreaming || isExpanded);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/cli/src/widgets/__tests__/thinking-click.test.ts -v`

- [ ] **Step 5: Run full test suite**

Run: `bun test`

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/thinking-click.test.ts
git commit -m "feat(cli): thinking block click-to-expand with GestureDetector"
```

---

### Task 2: apply_patch Multi-File Diff Rendering

**Context:** Currently `apply_patch` is classified as `kind: "edit"` but shows no diff because the diff computation path requires `old_string`/`new_string` (which `apply_patch` doesn't have — it uses `patchText`). amp's `WET()` parses the result's `files[]` array (each containing a `diff` string), then renders per-file blocks with path, +/- stats, and colored diff.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` — new `apply_patch` branch before generic EDIT_TOOLS
- Modify: `packages/cli/src/widgets/conversation-view.ts` — render multi-file diff result
- Test: `packages/cli/src/widgets/__tests__/apply-patch-diff.test.ts`

**amp reference:**
- `WET()` at modules/1604_unknown_WET.js — parses `result.files[]` from tool result
- `$9R` at modules/1472_tui_components/misc_utils.js:6962 — renders per-file diff blocks
- `fp` at modules/1472_tui_components/text_rendering.js:2858 — line-level diff renderer
- Tool result shape: `{ summary, files: [{ path, uri, type, additions, deletions, diff }] }`

- [ ] **Step 1: Extend ToolItem type for apply_patch files**

In `display-items.ts`, add an optional `files` field to `ToolItem`:

```typescript
export interface ToolItem {
  // ... existing fields ...
  /** apply_patch result: per-file diffs (逆向: WET result.files[]) */
  files?: Array<{
    path: string;
    type: "add" | "update" | "delete" | "move";
    additions: number;
    deletions: number;
    diff?: string;
  }>;
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// packages/cli/src/widgets/__tests__/apply-patch-diff.test.ts
import { describe, expect, test } from "bun:test";
import { transformThreadToDisplayItems, type ToolItem } from "../display-items.js";

describe("apply_patch multi-file diff", () => {
  test("apply_patch with result.files populates ToolItem.files", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu-1",
            name: "apply_patch",
            input: { patchText: "..." },
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            tool_use_id: "tu-1",
            run: {
              status: "done",
              result: {
                summary: "update: src/foo.ts (+3/-1)",
                files: [
                  { path: "src/foo.ts", type: "update", additions: 3, deletions: 1, diff: "--- a/src/foo.ts\n+++ b/src/foo.ts\n@@ -1,3 +1,5 @@\n line1\n-old\n+new\n+added\n line3" },
                ],
              },
            },
          },
        ],
        state: { type: "complete" as const },
      },
    ];
    const items = transformThreadToDisplayItems(messages as any);
    const tool = items.find((i) => i.type === "tool" && i.toolName === "apply_patch") as ToolItem | undefined;
    expect(tool).toBeDefined();
    expect(tool!.files).toHaveLength(1);
    expect(tool!.files![0].path).toBe("src/foo.ts");
    expect(tool!.files![0].additions).toBe(3);
    expect(tool!.files![0].diff).toContain("+new");
  });

  test("apply_patch without result.files still renders as edit tool", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [{ type: "tool_use" as const, id: "tu-2", name: "apply_patch", input: { patchText: "..." } }],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [{ type: "tool_result" as const, tool_use_id: "tu-2", run: { status: "done", result: "Applied patch" } }],
        state: { type: "complete" as const },
      },
    ];
    const items = transformThreadToDisplayItems(messages as any);
    const tool = items.find((i) => i.type === "tool" && i.toolName === "apply_patch") as ToolItem | undefined;
    expect(tool).toBeDefined();
    expect(tool!.kind).toBe("edit");
    expect(tool!.files).toBeUndefined();
  });

  test("apply_patch path shows summary from result", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [{ type: "tool_use" as const, id: "tu-3", name: "apply_patch", input: { patchText: "..." } }],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            tool_use_id: "tu-3",
            run: {
              status: "done",
              result: {
                summary: "update: a.ts (+1/-1), create: b.ts (+5/-0)",
                files: [
                  { path: "a.ts", type: "update", additions: 1, deletions: 1, diff: "diff..." },
                  { path: "b.ts", type: "add", additions: 5, deletions: 0, diff: "diff..." },
                ],
              },
            },
          },
        ],
        state: { type: "complete" as const },
      },
    ];
    const items = transformThreadToDisplayItems(messages as any);
    const tool = items.find((i) => i.type === "tool" && i.toolName === "apply_patch") as ToolItem | undefined;
    expect(tool!.files).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test packages/cli/src/widgets/__tests__/apply-patch-diff.test.ts -v`

- [ ] **Step 4: Implement apply_patch branch in display-items.ts**

Add a dedicated `apply_patch` check BEFORE the generic `EDIT_TOOLS` branch. Remove `apply_patch` from `EDIT_TOOLS` set.

```typescript
// Remove apply_patch from EDIT_TOOLS
const EDIT_TOOLS = new Set(["Edit", "edit_file", "undo_edit"]);

// New branch before EDIT_TOOLS check:
} else if (block.name === "apply_patch") {
  // 逆向: yx0 apply_patch branch + WET() in 1604_unknown_WET.js
  flushActivityBuffer();
  // Extract per-file diffs from structured result (逆向: result.files[])
  const resultObj = result?.run?.result;
  const files = typeof resultObj === "object" && resultObj !== null && Array.isArray((resultObj as any).files)
    ? (resultObj as any).files.map((f: any) => ({
        path: typeof f.path === "string" ? f.path : "unknown",
        type: (f.type ?? "update") as "add" | "update" | "delete" | "move",
        additions: typeof f.additions === "number" ? f.additions : 0,
        deletions: typeof f.deletions === "number" ? f.deletions : 0,
        diff: typeof f.diff === "string" ? f.diff : undefined,
      }))
    : undefined;
  const summary = typeof resultObj === "object" && resultObj !== null && typeof (resultObj as any).summary === "string"
    ? (resultObj as any).summary
    : undefined;
  items.push({
    type: "tool",
    toolUseId: block.id,
    toolName: block.name,
    kind: "edit",
    status,
    path: summary,  // Use summary as path detail (e.g., "update: foo.ts (+3/-1)")
    files,
    error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
  });
```

- [ ] **Step 5: Implement apply_patch rendering in conversation-view.ts**

In `_buildToolWidget`, after the existing diff rendering block (line ~788), add a `files` rendering block:

```typescript
// After: if ((tool.kind === "edit" || tool.kind === "create-file") && tool.diff) { ... }
// Add:
if (tool.files && tool.files.length > 0) {
  // 逆向: $9R per-file diff rendering (misc_utils.js:6962)
  // Header: "N files M changes +A -D"
  const totalAdded = tool.files.reduce((s, f) => s + f.additions, 0);
  const totalDeleted = tool.files.reduce((s, f) => s + f.deletions, 0);
  const totalChanges = totalAdded + totalDeleted;
  const headerSpans: TextSpan[] = [
    new TextSpan({ text: `${tool.files.length} file${tool.files.length > 1 ? "s" : ""} `, style: new TextStyle({ foreground: DIM_COLOR }) }),
    new TextSpan({ text: `${totalChanges} change${totalChanges !== 1 ? "s" : ""} `, style: new TextStyle({ foreground: DIM_COLOR }) }),
  ];
  if (totalAdded > 0) headerSpans.push(new TextSpan({ text: `+${totalAdded} `, style: new TextStyle({ foreground: SUCCESS_COLOR }) }));
  if (totalDeleted > 0) headerSpans.push(new TextSpan({ text: `-${totalDeleted}`, style: new TextStyle({ foreground: ERROR_COLOR }) }));
  columnChildren.push(new RichText({ text: new TextSpan({ children: headerSpans }) }));

  // Per-file diffs
  for (const file of tool.files) {
    const fileSpans: TextSpan[] = [
      new TextSpan({ text: `  ${file.path} `, style: new TextStyle({ foreground: MUTED_TEXT_COLOR, dim: true }) }),
    ];
    if (file.additions > 0) fileSpans.push(new TextSpan({ text: `+${file.additions} `, style: new TextStyle({ foreground: SUCCESS_COLOR }) }));
    if (file.deletions > 0) fileSpans.push(new TextSpan({ text: `-${file.deletions}`, style: new TextStyle({ foreground: ERROR_COLOR }) }));
    columnChildren.push(new RichText({ text: new TextSpan({ children: fileSpans }) }));

    if (file.diff) {
      columnChildren.push(buildDiffWidget(file.diff));
    }
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun test packages/cli/src/widgets/__tests__/apply-patch-diff.test.ts -v`

- [ ] **Step 7: Run full test suite**

Run: `bun test`

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/apply-patch-diff.test.ts
git commit -m "feat(cli): apply_patch multi-file diff rendering with per-file stats"
```

---

### Task 3: Bash sed/perl Write-Like Detection

**Context:** amp detects bash commands that modify files (sed -i, perl -pie, find -delete, redirects) and promotes them to `kind: "edit"` with a file path. Currently flitter treats all bash commands as `kind: "bash"`. This task creates a command classifier matching amp's `WO`/`IzR`/`yzT` chain, but scoped to just the write-like detection (the full read/search/list classification is out of scope for Phase 3).

**Files:**
- Create: `packages/cli/src/utils/bash-classifier.ts`
- Modify: `packages/cli/src/widgets/display-items.ts` — use classifier in Bash branch
- Test: `packages/cli/src/utils/__tests__/bash-classifier.test.ts`

**amp reference:**
- `yzT()` at modules/1405_unknown_yzT.js — core write-like predicate
- `IzR()` at modules/1403_unknown_IzR.js — full command classifier
- `WO()` at modules/1402_unknown_WO.js — cache wrapper
- Call site: chunk-004.js:7752-7787 — Bash branch in yx0

- [ ] **Step 1: Write failing tests for bash classifier**

```typescript
// packages/cli/src/utils/__tests__/bash-classifier.test.ts
import { describe, expect, test } from "bun:test";
import { classifyBashCommand } from "../bash-classifier.js";

describe("bash command classifier", () => {
  test("sed -i is write-like", () => {
    const r = classifyBashCommand("sed -i 's/foo/bar/g' file.txt");
    expect(r.isWriteLike).toBe(true);
    expect(r.program).toBe("sed");
  });

  test("sed without -i is NOT write-like", () => {
    const r = classifyBashCommand("sed 's/foo/bar/g' file.txt");
    expect(r.isWriteLike).toBe(false);
  });

  test("sed --in-place is write-like", () => {
    const r = classifyBashCommand("sed --in-place 's/foo/bar/g' file.txt");
    expect(r.isWriteLike).toBe(true);
  });

  test("sed -i.bak is write-like (starts with -i)", () => {
    const r = classifyBashCommand("sed -i.bak 's/foo/bar/g' file.txt");
    expect(r.isWriteLike).toBe(true);
  });

  test("perl -pie is write-like", () => {
    const r = classifyBashCommand("perl -pie 's/foo/bar/g' file.txt");
    expect(r.isWriteLike).toBe(true);
    expect(r.program).toBe("perl");
  });

  test("perl -pi is write-like", () => {
    const r = classifyBashCommand("perl -pi -e 's/foo/bar/g' file.txt");
    expect(r.isWriteLike).toBe(true);
  });

  test("perl without -p[ie] is NOT write-like", () => {
    const r = classifyBashCommand("perl script.pl");
    expect(r.isWriteLike).toBe(false);
  });

  test("redirect > is write-like", () => {
    const r = classifyBashCommand("echo hello > file.txt");
    expect(r.isWriteLike).toBe(true);
  });

  test("append >> is write-like", () => {
    const r = classifyBashCommand("cat data >> output.txt");
    expect(r.isWriteLike).toBe(true);
  });

  test("pipe to tee is write-like", () => {
    const r = classifyBashCommand("echo hello | tee file.txt");
    expect(r.isWriteLike).toBe(true);
  });

  test("simple grep is NOT write-like", () => {
    const r = classifyBashCommand("grep -r pattern .");
    expect(r.isWriteLike).toBe(false);
  });

  test("cat is NOT write-like", () => {
    const r = classifyBashCommand("cat file.txt");
    expect(r.isWriteLike).toBe(false);
  });

  test("find -delete is write-like", () => {
    const r = classifyBashCommand("find . -name '*.tmp' -delete");
    expect(r.isWriteLike).toBe(true);
    expect(r.program).toBe("find");
  });

  test("find without -delete is NOT write-like", () => {
    const r = classifyBashCommand("find . -name '*.ts'");
    expect(r.isWriteLike).toBe(false);
  });

  test("empty command returns not write-like", () => {
    const r = classifyBashCommand("");
    expect(r.isWriteLike).toBe(false);
  });

  test("extracts path from sed -i", () => {
    const r = classifyBashCommand("sed -i 's/old/new/g' src/foo.ts");
    expect(r.path).toBe("src/foo.ts");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/cli/src/utils/__tests__/bash-classifier.test.ts -v`

- [ ] **Step 3: Implement bash-classifier.ts**

```typescript
// packages/cli/src/utils/bash-classifier.ts
/**
 * Classify a bash command as write-like or not.
 *
 * 逆向: WO() (1402_unknown_WO.js) → IzR() (1403_unknown_IzR.js) → yzT() (1405_unknown_yzT.js)
 *
 * Scope: Only the write-like detection path. The full read/search/list classification
 * from IzR is deferred to a later phase.
 */

export interface BashClassification {
  isWriteLike: boolean;
  program?: string;
  path?: string;
}

/** 逆向: PzR regex — quick check for shell redirects and tee */
const REDIRECT_PATTERN = /(\s|^)(>>?|\|\s*tee(\s|$))/;

/** 逆向: yzR set — programs that are inherently write-like */
const WRITE_PROGRAMS = new Set(["python", "node", "ruby", "go"]);

/** 逆向: kzR set — find flags that imply file mutation */
const FIND_WRITE_FLAGS = new Set(["-delete", "-exec", "-ok", "-execdir"]);

/**
 * Classify a bash command string.
 *
 * 逆向: IzR(T, R) at 1403_unknown_IzR.js — simplified to write-like detection only.
 */
export function classifyBashCommand(command: string): BashClassification {
  if (!command || !command.trim()) return { isWriteLike: false };
  const trimmed = command.trim();

  // Quick check: shell redirects or pipe-to-tee (逆向: PzR)
  if (REDIRECT_PATTERN.test(trimmed)) return { isWriteLike: true };

  // Tokenize: extract first program and its args
  const tokens = simpleTokenize(trimmed);
  if (tokens.length === 0) return { isWriteLike: false };

  // Find the primary program (skip env vars like FOO=bar)
  let progIdx = 0;
  while (progIdx < tokens.length && tokens[progIdx].includes("=")) progIdx++;
  if (progIdx >= tokens.length) return { isWriteLike: false };

  const program = normalizeProgram(tokens[progIdx]);
  const args = tokens.slice(progIdx + 1);

  // 逆向: yzT(program, args) — core write-like predicate
  if (isWriteLike(program, args)) {
    return { isWriteLike: true, program, path: extractPath(program, args) };
  }

  return { isWriteLike: false, program };
}

/** 逆向: yzT() at 1405_unknown_yzT.js */
function isWriteLike(program: string, args: string[]): boolean {
  if (WRITE_PROGRAMS.has(program)) return true;
  if (program === "sed" && args.some((a) => a.startsWith("-i") || a === "--in-place")) return true;
  if (program === "perl" && args.some((a) => /^-p[ie]/.test(a))) return true;
  if (program === "find" && args.some((a) => FIND_WRITE_FLAGS.has(a))) return true;
  return false;
}

/** Extract the target file path from args (逆向: $zR) */
function extractPath(program: string, args: string[]): string | undefined {
  if (program === "sed" || program === "perl") {
    // Last non-flag arg is typically the file path
    for (let i = args.length - 1; i >= 0; i--) {
      if (!args[i].startsWith("-") && !args[i].startsWith("'") && !args[i].startsWith('"') && !args[i].includes("/")) continue;
      if (!args[i].startsWith("-")) return args[i];
    }
    // Fallback: last arg that doesn't start with -
    for (let i = args.length - 1; i >= 0; i--) {
      if (!args[i].startsWith("-") && !/^'.*'$/.test(args[i]) && !/^s[\/|,]/.test(args[i])) return args[i];
    }
  }
  return undefined;
}

/** Normalize program name: strip path, resolve common aliases */
function normalizeProgram(token: string): string {
  // Strip path prefix (e.g., /usr/bin/sed → sed)
  const base = token.includes("/") ? token.split("/").pop()! : token;
  return base;
}

/** Simple shell tokenizer — splits on whitespace, respects single/double quotes */
function simpleTokenize(cmd: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (ch === " " && !inSingle && !inDouble) {
      if (current) { tokens.push(current); current = ""; }
      continue;
    }
    // Stop at pipe or redirect (these are separate commands)
    if ((ch === "|" || ch === ">" || ch === "<" || ch === ";") && !inSingle && !inDouble) {
      if (current) { tokens.push(current); current = ""; }
      break; // Only classify the first command in a pipeline
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/cli/src/utils/__tests__/bash-classifier.test.ts -v`

- [ ] **Step 5: Wire classifier into display-items.ts**

In the Bash branch of `transformThreadToDisplayItems` (around line 430), add write-like detection:

```typescript
import { classifyBashCommand } from "../utils/bash-classifier.js";

// In the BASH_TOOLS branch:
if (BASH_TOOLS.has(block.name)) {
  // 逆向: yx0 Bash/shell_command branch + WO() write-like check
  const cmd = typeof block.input?.command === "string" ? block.input.command : undefined;
  const classification = cmd ? classifyBashCommand(cmd) : undefined;

  // 逆向: chunk-004.js:7752-7787 — sed/perl promoted to edit kind
  if (classification?.isWriteLike && (classification.program === "sed" || classification.program === "perl")) {
    flushActivityBuffer();
    items.push({
      type: "tool",
      toolUseId: block.id,
      toolName: block.name,
      kind: "edit",
      status,
      path: classification.path ?? cmd,
      command: cmd,
      error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
    });
  } else {
    flushActivityBuffer();
    items.push({
      type: "tool",
      toolUseId: block.id,
      toolName: block.name,
      kind: "bash",
      status,
      command: cmd,
      output: typeof result?.run?.result === "string" ? result.run.result : undefined,
      error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
    });
  }
```

- [ ] **Step 6: Write integration test for sed/perl as edit row**

Add to existing test files or create new test:

```typescript
test("sed -i command produces edit kind tool item", () => {
  const messages = [{
    role: "assistant" as const,
    content: [{ type: "tool_use" as const, id: "tu-1", name: "Bash", input: { command: "sed -i 's/foo/bar/g' src/app.ts" } }],
    state: { type: "complete" as const },
  }, {
    role: "user" as const,
    content: [{ type: "tool_result" as const, tool_use_id: "tu-1", run: { status: "done", result: "" } }],
    state: { type: "complete" as const },
  }];
  const items = transformThreadToDisplayItems(messages as any);
  const tool = items.find(i => i.type === "tool") as ToolItem | undefined;
  expect(tool).toBeDefined();
  expect(tool!.kind).toBe("edit");
  expect(tool!.path).toBe("src/app.ts");
});
```

- [ ] **Step 7: Run full test suite**

Run: `bun test`

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/utils/bash-classifier.ts packages/cli/src/utils/__tests__/bash-classifier.test.ts packages/cli/src/widgets/display-items.ts
git commit -m "feat(cli): bash sed/perl write-like detection promotes to edit kind"
```

---

### Task 4: Specialized Activity Group Builders (finder, code_review, code_tour)

**Context:** amp has three specialized activity group types (finder, code_review, code_tour) with custom action builders and summaries. Currently flitter treats all tools as either bash/edit/create-file or generic activity items. The specialized activity groups need their own processing in `transformThreadToDisplayItems` — they are identified by tool name patterns in the raw messages.

**Important note:** This task requires understanding how amp identifies these activity groups. In amp, `finder`/`code_review`/`code_tour` are NOT individual tool_use blocks — they are subagent interactions that produce multiple tool_uses. The parent tool_use (e.g., `"Task"` with a specific mode) is the trigger. The activity group builder then iterates the sub-tool-uses within the result to build actions.

Since flitter currently handles `"Task"` tool as a Subagent (Phase 2, Task 9), the implementation needs to detect when a Task's purpose matches finder/code_review/code_tour and apply the specialized builder instead of the generic Subagent rendering.

**Files:**
- Modify: `packages/cli/src/widgets/display-items.ts` — detect and apply specialized builders
- Test: `packages/cli/src/widgets/__tests__/activity-group-builders.test.ts`

**amp reference:**
- `Ux0()` at modules/2171_unknown_Ux0.js — finder
- `qx0()` at modules/2174_unknown_qx0.js — code_review
- `Hx0()` at modules/2172_unknown_Hx0.js — code_tour
- `FtT()` — iterates sub-tool-uses from activity
- `Vw()` — maps tool use to action {kind, title}
- Activity group dispatch at chunk-004.js:7878-7991

- [ ] **Step 1: Add "explore" and "thinking" to ActivityAction.kind**

Currently `ActivityAction.kind` is `"read" | "search" | "list"`. amp's specialized builders use `"explore"` and `"thinking"` kinds. Extend the union:

```typescript
export interface ActivityAction {
  kind: "read" | "search" | "list" | "explore" | "thinking";
  // ... rest unchanged
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// packages/cli/src/widgets/__tests__/activity-group-builders.test.ts
import { describe, expect, test } from "bun:test";
import { transformThreadToDisplayItems, type ActivityGroupItem } from "../display-items.js";

describe("specialized activity group builders", () => {
  test("finder task produces activity group with explore actions", () => {
    const messages = [{
      role: "assistant" as const,
      content: [{
        type: "tool_use" as const,
        id: "tu-1",
        name: "Task",
        input: { description: "Find all auth-related files", mode: "finder", query: "auth" },
      }],
      state: { type: "complete" as const },
    }, {
      role: "user" as const,
      content: [{
        type: "tool_result" as const,
        tool_use_id: "tu-1",
        run: { status: "done", result: "Found 5 files" },
      }],
      state: { type: "complete" as const },
    }];
    const items = transformThreadToDisplayItems(messages as any);
    const group = items.find(i => i.type === "activity-group") as ActivityGroupItem | undefined;
    expect(group).toBeDefined();
    expect(group!.summary).toContain("finder");
  });

  test("code_review task produces activity group with check summary", () => {
    const messages = [{
      role: "assistant" as const,
      content: [{
        type: "tool_use" as const,
        id: "tu-2",
        name: "Task",
        input: { description: "Review the changes", mode: "code_review" },
      }],
      state: { type: "complete" as const },
    }, {
      role: "user" as const,
      content: [{
        type: "tool_result" as const,
        tool_use_id: "tu-2",
        run: { status: "done", result: "Review complete" },
      }],
      state: { type: "complete" as const },
    }];
    const items = transformThreadToDisplayItems(messages as any);
    const group = items.find(i => i.type === "activity-group") as ActivityGroupItem | undefined;
    expect(group).toBeDefined();
    expect(group!.summary).toContain("code review");
  });

  test("code_tour task produces activity group with tour summary", () => {
    const messages = [{
      role: "assistant" as const,
      content: [{
        type: "tool_use" as const,
        id: "tu-3",
        name: "Task",
        input: { description: "Tour the authentication flow", mode: "code_tour", focus: "auth flow" },
      }],
      state: { type: "complete" as const },
    }, {
      role: "user" as const,
      content: [{
        type: "tool_result" as const,
        tool_use_id: "tu-3",
        run: { status: "done", result: "Tour complete" },
      }],
      state: { type: "complete" as const },
    }];
    const items = transformThreadToDisplayItems(messages as any);
    const group = items.find(i => i.type === "activity-group") as ActivityGroupItem | undefined;
    expect(group).toBeDefined();
    expect(group!.summary).toContain("code tour");
    expect(group!.summary).toContain("auth flow");
  });

  test("Task without special mode still renders as Subagent tool", () => {
    const messages = [{
      role: "assistant" as const,
      content: [{
        type: "tool_use" as const,
        id: "tu-4",
        name: "Task",
        input: { description: "Do something generic" },
      }],
      state: { type: "complete" as const },
    }, {
      role: "user" as const,
      content: [{
        type: "tool_result" as const,
        tool_use_id: "tu-4",
        run: { status: "done", result: "Done" },
      }],
      state: { type: "complete" as const },
    }];
    const items = transformThreadToDisplayItems(messages as any);
    const tool = items.find(i => i.type === "tool" && (i as any).toolName === "Subagent");
    expect(tool).toBeDefined();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun test packages/cli/src/widgets/__tests__/activity-group-builders.test.ts -v`

- [ ] **Step 4: Implement specialized activity group detection**

In `display-items.ts`, modify the `Task` branch to check for `mode` in the input:

```typescript
} else if (block.name === "Task") {
  const mode = typeof block.input?.mode === "string" ? block.input.mode : undefined;

  if (mode === "finder" || mode === "code_review" || mode === "code_tour") {
    // 逆向: yx0 activity-group dispatch (chunk-004.js:7878-7991)
    flushActivityBuffer();
    const { actions, summary } = buildSpecializedActivityGroup(mode, block, result, status);
    items.push({
      type: "activity-group",
      actions,
      summary,
      hasInProgress: status === "in-progress" || status === "queued",
    });
  } else {
    // Generic Task → Subagent (existing Phase 2 code)
    flushActivityBuffer();
    const detail = extractDetail(block.input as Record<string, unknown>) ?? JSON.stringify(block.input ?? {});
    items.push({
      type: "tool",
      toolUseId: block.id,
      toolName: "Subagent",
      kind: "generic",
      status,
      args: { detail },
      error: result?.run?.status === "error" ? result?.run?.error?.message : undefined,
    });
  }
}
```

Then implement `buildSpecializedActivityGroup`:

```typescript
/**
 * Build specialized activity group for finder/code_review/code_tour.
 *
 * 逆向: Ux0 (finder), qx0 (code_review), Hx0 (code_tour)
 */
function buildSpecializedActivityGroup(
  mode: string,
  block: RawContentBlock,
  result: RawContentBlock | undefined,
  status: ToolItem["status"],
): { actions: ActivityAction[]; summary: string } {
  const actions: ActivityAction[] = [];
  const baseAction: Omit<ActivityAction, "kind" | "detail"> = {
    toolName: block.name,
    toolUseId: block.id,
    status,
  };

  if (mode === "finder") {
    // 逆向: Ux0() — simple: one "explore" action with query
    const query = typeof block.input?.query === "string" ? block.input.query : undefined;
    actions.push({
      ...baseAction,
      kind: "explore",
      detail: query ? `Search codebase: ${query}` : "Search codebase",
    });
    if (status === "done") actions.push({ ...baseAction, kind: "explore", detail: "Search complete" });
    return { actions, summary: query ? `finder: ${query}` : "finder" };
  }

  if (mode === "code_review") {
    // 逆向: qx0() — review with optional checks
    actions.push({ ...baseAction, kind: "thinking", detail: status === "done" ? "Code review complete" : "Reviewing code changes..." });
    return { actions, summary: "code review" };
  }

  if (mode === "code_tour") {
    // 逆向: Hx0() — tour with optional focus
    const focus = typeof block.input?.focus === "string" ? block.input.focus.trim() : undefined;
    actions.push({
      ...baseAction,
      kind: "thinking",
      detail: status === "done" ? "Code tour complete" : "Generating code tour...",
    });
    return { actions, summary: focus ? `code tour: ${focus}` : "code tour" };
  }

  return { actions, summary: mode };
}
```

- [ ] **Step 5: Update conversation-view.ts for new action kinds**

In `_getActionStatusIcon` and `_getActionStatusColor`, add cases for `"explore"` and `"thinking"`:

```typescript
case "explore":
  // Same icon mapping as "search" — magnifying glass
  return /* same as search case */;
case "thinking":
  // Spinner when in-progress, check when done
  return /* same as generic done/in-progress icon */;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `bun test packages/cli/src/widgets/__tests__/activity-group-builders.test.ts -v`

- [ ] **Step 7: Run full test suite**

Run: `bun test`

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/__tests__/activity-group-builders.test.ts
git commit -m "feat(cli): specialized activity groups for finder, code_review, code_tour"
```

---

## Dependency Graph

```
Task 1 (thinking click)     — independent
Task 2 (apply_patch diff)   — independent
Task 3 (bash classifier)    — independent
Task 4 (activity groups)    — depends on nothing, but extends ActivityAction.kind which Task 1-3 don't touch
```

All 4 tasks are independent. Tasks 1+2 can run in parallel, then 3+4 in parallel.

## Verification

After all tasks:

1. **Run full test suite:** `bun test` — all tests must pass
2. **TypeScript check:** `bunx tsc --noEmit` or the existing e2e typecheck test
3. **Manual verification (if possible):** Launch flitter-cli and verify:
   - Thinking blocks are clickable when complete
   - apply_patch results show per-file diffs
   - `sed -i` commands render as edit rows
   - (Activity groups require a thread with finder/code_review/code_tour tools)
