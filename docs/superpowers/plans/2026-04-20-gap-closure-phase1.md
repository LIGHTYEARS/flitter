# Phase 1: Critical + High Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Source Spec:** `docs/superpowers/specs/2026-04-20-full-gap-closure-design.md` — Phase 1
**Goal:** Fix production reliability issues and unblock core capabilities — 9 gaps across 4 sessions.
**Baseline:** master @ `a708123`

**Tech Stack:** TypeScript, Bun test runner, `@flitter/agent-core`, `@flitter/llm`, `@flitter/tui`, `@flitter/data`, `@flitter/cli`, `@flitter/schemas`, `@flitter/util`

---

## Gap Inventory

| Gap ID | Domain | What | Package | Session |
|--------|--------|------|---------|---------|
| GAP-TOOL-01 | Tools | `apply_patch` — Codex-format multi-file patches | `agent-core` | 1A |
| GAP-LLM-01 | LLM | Stream idle timeout (120s idle → `StreamIdleTimeoutError`, warn >30s) | `llm` | 1B |
| GAP-LLM-02 | LLM | `maxRetries: 0` on Anthropic SDK stream calls | `llm` | 1B |
| GAP-CORE-01 | Core | Wire PluginService into `container.ts` | `flitter` | 1B |
| GAP-TUI-01 | TUI | Kitty Graphics Protocol image widget | `tui` | 1C |
| GAP-TUI-02 | TUI | 5th approval option: "guarded-file deny" | `cli` + `agent-core` | 1C |
| GAP-DATA-01 | Data | ThreadRemoteTransport stub (local-file backing) | `data` | 1D |
| GAP-DATA-02 | Data | Thread metadata remote update (calls stub transport) | `data` | 1D |
| GAP-CLI-01 | CLI | `skill` command group: `skill add/list/remove/info` | `cli` | 1D |

---

## File Structure (all sessions)

| Action | Path | Gap |
|--------|------|-----|
| Create | `packages/agent-core/src/tools/builtin/apply-patch.ts` | TOOL-01 |
| Create | `packages/agent-core/src/tools/builtin/__tests__/apply-patch.test.ts` | TOOL-01 |
| Modify | `packages/agent-core/src/index.ts` | TOOL-01 |
| Modify | `packages/flitter/src/factory.ts` | TOOL-01 |
| Create | `packages/llm/src/stream-idle-timeout.ts` | LLM-01 |
| Create | `packages/llm/src/__tests__/stream-idle-timeout.test.ts` | LLM-01 |
| Modify | `packages/llm/src/providers/anthropic/provider.ts` | LLM-01, LLM-02 |
| Modify | `packages/llm/src/index.ts` | LLM-01 |
| Modify | `packages/flitter/src/container.ts` | CORE-01 |
| Create | `packages/tui/src/widgets/kitty-image.ts` | TUI-01 |
| Create | `packages/tui/src/widgets/__tests__/kitty-image.test.ts` | TUI-01 |
| Modify | `packages/tui/src/index.ts` | TUI-01 |
| Modify | `packages/cli/src/widgets/approval-widget.ts` | TUI-02 |
| Create | `packages/data/src/thread/thread-remote-stub.ts` | DATA-01 |
| Create | `packages/data/src/thread/__tests__/thread-remote-stub.test.ts` | DATA-01 |
| Modify | `packages/data/src/thread/thread-upload.ts` | DATA-02 |
| Modify | `packages/data/src/index.ts` | DATA-01 |
| Create | `packages/cli/src/commands/skill-commands.ts` | CLI-01 |
| Create | `packages/cli/src/commands/__tests__/skill-commands.test.ts` | CLI-01 |

---

# Session 1A: GAP-TOOL-01 — apply_patch

**Complexity:** High (~300-400 lines core logic)
**Amp reference:**
- `amp-cli-reversed/modules/2026_tail_anonymous.js:139870-140100` — patch schema `nzT` + examples `Z5R`
- `amp-cli-reversed/modules/2026_tail_anonymous.js:13600-13850` — parser `XS(patchText)` + applicator `X5R(filePath, content, chunks)`
- Patch format: `*** Begin Patch` / `*** End Patch` with operations `*** Add File:`, `*** Update File:`, `*** Delete File:`, `*** Move to:`
- Lock pattern: `gA(uri).acquire()` for per-file mutex
- FileChangeTracker recording: `r.record({ toolUse, uri, before, after })`

**Pattern to follow:** `packages/agent-core/src/tools/builtin/bash.ts` — ToolSpec export with `inputSchema`, `execute(args, context)`, `executionProfile`

---

### Task 1: Patch parser — parse `*** Begin Patch` format into structured operations

**Why first:** All subsequent tasks depend on correctly parsing patch text into operations.

**Files:**
- Create: `packages/agent-core/src/tools/builtin/apply-patch.ts`
- Create: `packages/agent-core/src/tools/builtin/__tests__/apply-patch.test.ts`

**Amp reference:** `2026_tail_anonymous.js:13600-13700` — `XS(patchText)` returns `{ hunks: PatchHunk[], warnings: string[] }`. Each hunk has `{ type, filePath, destPath?, chunks? }`. Chunks have lines with `kind: "context" | "add" | "remove"`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/agent-core/src/tools/builtin/__tests__/apply-patch.test.ts
import { describe, expect, it } from "bun:test";
import { parsePatch, type PatchOperation } from "../apply-patch";

describe("parsePatch", () => {
  it("parses Add File operation", () => {
    const patch = `*** Begin Patch
*** Add File: path/to/new.ts
+const x = 1;
+export { x };
*** End Patch`;
    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("add");
    expect(result.operations[0].filePath).toBe("path/to/new.ts");
    expect(result.operations[0].content).toBe("const x = 1;\nexport { x };\n");
  });

  it("parses Delete File operation", () => {
    const patch = `*** Begin Patch
*** Delete File: old-file.ts
*** End Patch`;
    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("delete");
    expect(result.operations[0].filePath).toBe("old-file.ts");
  });

  it("parses Update File with context/remove/add lines", () => {
    const patch = `*** Begin Patch
*** Update File: src/util.ts
@@
 function foo() {
-  return 1;
+  return 2;
 }
*** End Patch`;
    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("update");
    expect(result.operations[0].hunks).toHaveLength(1);
    expect(result.operations[0].hunks![0].contextLines).toContain(" function foo() {");
  });

  it("parses Move File operation", () => {
    const patch = `*** Begin Patch
*** Update File: old/path.ts
*** Move to: new/path.ts
@@
 content
*** End Patch`;
    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("update");
    expect(result.operations[0].destPath).toBe("new/path.ts");
  });

  it("parses multi-file patch", () => {
    const patch = `*** Begin Patch
*** Add File: a.ts
+line1
*** Update File: b.ts
@@
-old
+new
*** Delete File: c.ts
*** End Patch`;
    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(3);
    expect(result.operations.map(o => o.type)).toEqual(["add", "update", "delete"]);
  });

  it("returns warnings for malformed patches", () => {
    const patch = "no begin patch marker";
    const result = parsePatch(patch);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement the parser**

```typescript
// packages/agent-core/src/tools/builtin/apply-patch.ts (partial — parser section)

/**
 * A single hunk within an Update operation.
 * 逆向: XS chunk parsing — context/remove/add lines, optional @@ header with search hint
 */
export interface PatchHunk {
  searchHint?: string;
  contextLines: string[];
  changes: Array<{ kind: "context" | "add" | "remove"; line: string }>;
}

/**
 * A single patch operation (add, update, delete, or move via update+destPath).
 * 逆向: XS returns array of these as "hunks" (naming from amp)
 */
export interface PatchOperation {
  type: "add" | "update" | "delete";
  filePath: string;
  destPath?: string;
  content?: string;
  hunks?: PatchHunk[];
}

export interface ParseResult {
  operations: PatchOperation[];
  warnings: string[];
}

/**
 * Parse a Codex-format patch text into structured operations.
 *
 * 逆向: XS function in 2026_tail_anonymous.js:13600-13700
 * Format:
 *   *** Begin Patch
 *   *** Add File: <path>    → all lines start with +
 *   *** Update File: <path> → @@ [hint], then context/ -remove/ +add lines
 *   *** Delete File: <path> → no body
 *   *** Move to: <path>     → follows Update File header
 *   *** End Patch
 */
export function parsePatch(patchText: string): ParseResult {
  // ... implementation following amp's XS logic
}
```

- [ ] **Step 3: Run test — expect pass**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/tools/builtin/__tests__/apply-patch.test.ts
# Expected: 6 pass, 0 fail
```

---

### Task 2: Patch applicator — apply parsed operations to filesystem

**Why second:** Parser produces operations, applicator consumes them to modify files.

**Files:**
- Modify: `packages/agent-core/src/tools/builtin/apply-patch.ts`
- Modify: `packages/agent-core/src/tools/builtin/__tests__/apply-patch.test.ts`

**Amp reference:** `2026_tail_anonymous.js:13700-13850` — `X5R(filePath, content, chunks)` applies hunks with a 5-tier fuzz cascade. Add File writes all `+` lines. Delete File removes the file. Move: rename then apply hunks.

**Fuzz matching algorithm (from amp's `oz` function):**

The applicator uses a **forward linear scan** from a cursor that advances after each hunk. For each hunk, it tries 5 comparators in strict cascade order — the first tier to find a contiguous match wins:

| Tier | Name | Per-line comparison |
|------|------|---------------------|
| 1 | `exact` | `s === A` |
| 2 | `rstrip` | `s.trimEnd() === A.trimEnd()` |
| 3 | `trim` | `s.trim() === A.trim()` |
| 4 | `unicode` | Normalize smart quotes/dashes/ellipsis/NBSP, then trim+compare |
| 5 | `spaceCollapsed` | Unicode normalize + tabs→spaces + collapse whitespace runs |

Key behaviors to implement:
- **No positional fuzz** — the match must be contiguous; there is no "off-by-N-lines" tolerance
- **Cursor-based scanning** — `qI(fileLines, patternLines, startOffset, compareFn)` scans forward from cursor
- **End-of-file anchor** — if `isEndOfFile` flag is set, check tail position first before forward scan
- **`changeContext` anchor** — if `@@` text is present, pre-position cursor to just after anchor match
- **Whitespace re-application (`F5R`)** — when match was found via a fuzzy tier, adjust indentation of new lines to match the file's actual indentation
- **Hard fail on no match** — throw with file path, expected lines, and up to 3 candidate locations for diagnostic context. No partial application.
- **Overlap check (`G5R`)** — after all hunks resolve, validate no splice records overlap; throw if they do
- **Reverse-order application (`V5R`)** — apply splice records from bottom-to-top so earlier splices don't shift later indices

Tests should cover: exact match, trailing-whitespace fuzz, full-trim fuzz, no-match error with diagnostics, multi-hunk cursor advancement, and end-of-file anchoring.

- [ ] **Step 1: Write the failing tests**

```typescript
// Append to apply-patch.test.ts
import { applyPatchOperations, type ApplyResult } from "../apply-patch";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("applyPatchOperations", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "apply-patch-test-"));
  });
  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a new file for Add operation", async () => {
    const ops: PatchOperation[] = [{
      type: "add",
      filePath: "new-file.ts",
      content: "const x = 1;\n",
    }];
    const result = await applyPatchOperations(ops, tempDir);
    expect(result.appliedFiles).toContain("new-file.ts");
    const content = await readFile(join(tempDir, "new-file.ts"), "utf-8");
    expect(content).toBe("const x = 1;\n");
  });

  it("deletes a file for Delete operation", async () => {
    await writeFile(join(tempDir, "to-delete.ts"), "old content");
    const ops: PatchOperation[] = [{
      type: "delete",
      filePath: "to-delete.ts",
    }];
    const result = await applyPatchOperations(ops, tempDir);
    expect(result.appliedFiles).toContain("to-delete.ts");
    const exists = await Bun.file(join(tempDir, "to-delete.ts")).exists();
    expect(exists).toBe(false);
  });

  it("updates a file for Update operation", async () => {
    await writeFile(join(tempDir, "src.ts"), "function foo() {\n  return 1;\n}\n");
    const ops: PatchOperation[] = [{
      type: "update",
      filePath: "src.ts",
      hunks: [{
        contextLines: [" function foo() {", "-  return 1;", "+  return 2;", " }"],
        changes: [
          { kind: "context", line: "function foo() {" },
          { kind: "remove", line: "  return 1;" },
          { kind: "add", line: "  return 2;" },
          { kind: "context", line: "}" },
        ],
      }],
    }];
    const result = await applyPatchOperations(ops, tempDir);
    expect(result.appliedFiles).toContain("src.ts");
    const content = await readFile(join(tempDir, "src.ts"), "utf-8");
    expect(content).toContain("return 2;");
    expect(content).not.toContain("return 1;");
  });

  it("moves a file when destPath is set", async () => {
    await writeFile(join(tempDir, "old.ts"), "content\n");
    const ops: PatchOperation[] = [{
      type: "update",
      filePath: "old.ts",
      destPath: "new.ts",
      hunks: [],
    }];
    const result = await applyPatchOperations(ops, tempDir);
    expect(result.appliedFiles).toContain("new.ts");
    const exists = await Bun.file(join(tempDir, "old.ts")).exists();
    expect(exists).toBe(false);
    const newContent = await readFile(join(tempDir, "new.ts"), "utf-8");
    expect(newContent).toBe("content\n");
  });

  it("creates intermediate directories for nested paths", async () => {
    const ops: PatchOperation[] = [{
      type: "add",
      filePath: "deep/nested/dir/file.ts",
      content: "export {};\n",
    }];
    const result = await applyPatchOperations(ops, tempDir);
    expect(result.appliedFiles).toContain("deep/nested/dir/file.ts");
  });
});
```

- [ ] **Step 2: Implement applyPatchOperations**

The function takes `PatchOperation[]` and a `workingDirectory`, applies each operation sequentially (with per-file locking if needed). For Update operations, implement hunk matching with fuzz tolerance (match context lines allowing whitespace differences). Record before/after for FileChangeTracker.

```typescript
/**
 * Apply parsed patch operations to the filesystem.
 *
 * 逆向: X5R function in 2026_tail_anonymous.js:13700-13850
 * - Add: write content, create parent dirs
 * - Delete: unlink file
 * - Update: read file, find hunk location by context matching, apply changes
 * - Move: rename first, then apply hunks to new path
 */
export async function applyPatchOperations(
  operations: PatchOperation[],
  workingDirectory: string,
): Promise<ApplyResult> {
  // ... implementation
}
```

- [ ] **Step 3: Run tests — expect all pass**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/tools/builtin/__tests__/apply-patch.test.ts
# Expected: 11 pass, 0 fail
```

---

### Task 3: ToolSpec definition — register `apply_patch` as a builtin tool

**Why third:** Wire parser + applicator into ToolSpec interface so the tool is invocable by the model.

**Files:**
- Modify: `packages/agent-core/src/tools/builtin/apply-patch.ts` (add ToolSpec export)
- Modify: `packages/agent-core/src/index.ts` (re-export)
- Modify: `packages/flitter/src/factory.ts` (register in `registerBuiltinTools`)

**Amp reference:** `2026_tail_anonymous.js:139870-139878` — `nzT = K.object({ patchText: K.string() })`, tool name is `apply_patch`

- [ ] **Step 1: Write the failing integration test**

```typescript
// Append to apply-patch.test.ts
import { ApplyPatchTool } from "../apply-patch";
import type { ToolContext } from "../../types";

describe("ApplyPatchTool (ToolSpec)", () => {
  it("has correct name and schema", () => {
    expect(ApplyPatchTool.name).toBe("apply_patch");
    expect(ApplyPatchTool.source).toBe("builtin");
    expect(ApplyPatchTool.inputSchema.properties.patchText).toBeDefined();
  });

  it("applies a patch end-to-end", async () => {
    const dir = await mkdtemp(join(tmpdir(), "apply-patch-e2e-"));
    try {
      await writeFile(join(dir, "hello.ts"), "export const x = 1;\n");
      const ctx: ToolContext = {
        workingDirectory: dir,
        signal: new AbortController().signal,
        threadId: "test",
        config: { settings: {}, secrets: { getToken: async () => "" } } as any,
      };
      const result = await ApplyPatchTool.execute(
        {
          patchText: `*** Begin Patch
*** Update File: hello.ts
@@
-export const x = 1;
+export const x = 2;
*** End Patch`,
        },
        ctx,
      );
      expect(result.status).toBe("done");
      const content = await readFile(join(dir, "hello.ts"), "utf-8");
      expect(content).toContain("x = 2");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Implement the ToolSpec**

```typescript
// End of apply-patch.ts
export const ApplyPatchTool: ToolSpec = {
  name: "apply_patch",
  source: "builtin",
  isReadOnly: false,
  description:
    "Applies a patch to files. " +
    "The patch format supports adding, updating, deleting, and moving files. " +
    "Use *** Begin Patch / *** End Patch markers.",
  executionProfile: {
    serial: true,
  },
  inputSchema: {
    type: "object",
    properties: {
      patchText: {
        type: "string",
        description: "The full patch text that describes all changes to be made",
      },
    },
    required: ["patchText"],
    additionalProperties: false,
  },
  async execute(args, context) {
    const patchText = args.patchText;
    if (typeof patchText !== "string" || patchText.trim().length === 0) {
      return { status: "error", error: "patchText must be a non-empty string" };
    }
    const parsed = parsePatch(patchText);
    if (parsed.warnings.length > 0 && parsed.operations.length === 0) {
      return { status: "error", error: parsed.warnings.join("\n") };
    }
    const result = await applyPatchOperations(parsed.operations, context.workingDirectory);
    let content = `Applied patch to ${result.appliedFiles.length} file(s): ${result.appliedFiles.join(", ")}`;
    if (parsed.warnings.length > 0) {
      content += `\nWarnings: ${parsed.warnings.join("; ")}`;
    }
    if (result.errors.length > 0) {
      content += `\nErrors: ${result.errors.join("; ")}`;
      return { status: "error", error: content };
    }
    return { status: "done", content, outputFiles: result.appliedFiles };
  },
};
```

- [ ] **Step 3: Register in agent-core barrel export and factory**

In `packages/agent-core/src/index.ts` (the actual barrel — there is no `builtin/index.ts`):
```typescript
export { ApplyPatchTool, parsePatch, applyPatchOperations } from "./tools/builtin/apply-patch";
export type { PatchOperation, PatchHunk, ParseResult, ApplyResult } from "./tools/builtin/apply-patch";
```

In `packages/flitter/src/factory.ts`, add to `registerBuiltinTools`:
```typescript
import { ApplyPatchTool } from "@flitter/agent-core";
// Inside registerBuiltinTools:
registry.register(ApplyPatchTool);
```

- [ ] **Step 4: Run all tests + typecheck**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/agent-core/src/tools/builtin/__tests__/apply-patch.test.ts
# Expected: 13+ pass, 0 fail

cd /Users/bytedance/workspace/flitter && tsc --noEmit
# Expected: 0 errors
```

---

# Session 1B: GAP-LLM-01 + GAP-LLM-02 + GAP-CORE-01

---

## GAP-LLM-01: Stream Idle Timeout

**Amp reference:**
- `amp-cli-reversed/modules/1069_unknown_C4R.js` — `C4R(asyncIterable, timeoutMs = 120000)` wraps an async iterator, races each `.next()` against a timeout
- `amp-cli-reversed/modules/2026_tail_anonymous.js:99988-99993` — `StreamIdleTimeoutError extends Error`
- `amp-cli-reversed/modules/1089_unknown_EUT.js:98-108` — usage: `for await (let w of C4R(L, tLR))`, warns on gap > `rLR` (30s)
- Constants: `tLR = 120000` (120s idle timeout), `rLR = 30000` (30s warning threshold)

### Task 4: StreamIdleTimeoutError + withIdleTimeout wrapper

**Files:**
- Create: `packages/llm/src/stream-idle-timeout.ts`
- Create: `packages/llm/src/__tests__/stream-idle-timeout.test.ts`

**Setup:** The `packages/llm/src/__tests__/` directory does not exist yet. Create it before writing the test file:
```bash
mkdir -p packages/llm/src/__tests__
```

- [ ] **Step 1: Write the failing test**

```typescript
// packages/llm/src/__tests__/stream-idle-timeout.test.ts
import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test";
import {
  withStreamIdleTimeout,
  StreamIdleTimeoutError,
  STREAM_IDLE_TIMEOUT_MS,
  STREAM_GAP_WARNING_MS,
} from "../stream-idle-timeout";

describe("StreamIdleTimeoutError", () => {
  it("has correct name and message", () => {
    const err = new StreamIdleTimeoutError(120000);
    expect(err.name).toBe("StreamIdleTimeoutError");
    expect(err.message).toContain("120000");
  });
});

describe("withStreamIdleTimeout", () => {
  it("yields items from a normal stream", async () => {
    async function* source() {
      yield "a";
      yield "b";
      yield "c";
    }
    const items: string[] = [];
    for await (const item of withStreamIdleTimeout(source(), 5000)) {
      items.push(item);
    }
    expect(items).toEqual(["a", "b", "c"]);
  });

  it("throws StreamIdleTimeoutError when stream stalls", async () => {
    async function* stalled() {
      yield "first";
      await new Promise(() => {}); // never resolves
    }
    const items: string[] = [];
    try {
      for await (const item of withStreamIdleTimeout(stalled(), 50)) {
        items.push(item);
      }
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(StreamIdleTimeoutError);
    }
    expect(items).toEqual(["first"]);
  });

  it("resets timer on each yield", async () => {
    async function* slowButAlive() {
      yield "a";
      await new Promise(r => setTimeout(r, 30));
      yield "b";
      await new Promise(r => setTimeout(r, 30));
      yield "c";
    }
    const items: string[] = [];
    for await (const item of withStreamIdleTimeout(slowButAlive(), 100)) {
      items.push(item);
    }
    expect(items).toEqual(["a", "b", "c"]);
  });

  it("exports correct constant values", () => {
    expect(STREAM_IDLE_TIMEOUT_MS).toBe(120_000);
    expect(STREAM_GAP_WARNING_MS).toBe(30_000);
  });
});
```

- [ ] **Step 2: Implement the module**

```typescript
// packages/llm/src/stream-idle-timeout.ts

/**
 * @flitter/llm — Stream idle timeout wrapper
 *
 * Wraps an async iterable with a per-chunk idle timer.
 * If no chunk arrives within timeoutMs, throws StreamIdleTimeoutError.
 *
 * 逆向: C4R function in amp-cli-reversed/modules/1069_unknown_C4R.js
 * 逆向: I3T (StreamIdleTimeoutError) in 2026_tail_anonymous.js:99988-99993
 * 逆向: Constants tLR=120000, rLR=30000 in 2026_tail_anonymous.js:11897-11898
 */

/** Default idle timeout: 120 seconds (2 minutes) */
export const STREAM_IDLE_TIMEOUT_MS = 120_000;

/** Gap threshold for warning log: 30 seconds */
export const STREAM_GAP_WARNING_MS = 30_000;

/**
 * Error thrown when an LLM stream stalls.
 * 逆向: I3T extends Error — 2026_tail_anonymous.js:99988-99993
 */
export class StreamIdleTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Stream stalled: no data received for ${timeoutMs}ms`);
    this.name = "StreamIdleTimeoutError";
  }
}

/**
 * Wrap an async iterable with an idle timeout.
 * Each call to iterator.next() races against a setTimeout.
 *
 * 逆向: C4R(T, R = 120000) in modules/1069_unknown_C4R.js
 *
 * Resource cleanup: Three cancellation paths exist and must all be handled:
 * 1. Normal completion (iterator.next() returns done:true) — timer cleared
 * 2. Idle timeout fires — timer cleanup, iterator.return() called to release upstream
 * 3. External AbortSignal — listener clears timer, calls iterator.return()
 * All three paths are mutually exclusive via the `settled` flag.
 *
 * @param source - The async iterable to wrap
 * @param timeoutMs - Max idle time per chunk (default: 120000)
 * @param signal - Optional AbortSignal for external cancellation
 */
export async function* withStreamIdleTimeout<T>(
  source: AsyncIterable<T>,
  timeoutMs: number = STREAM_IDLE_TIMEOUT_MS,
  signal?: AbortSignal,
): AsyncGenerator<T> {
  const iterator = source[Symbol.asyncIterator]();
  try {
    while (true) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let settled = false;

      const cleanup = () => {
        if (timer !== null) { clearTimeout(timer); timer = null; }
      };

      // Link AbortSignal to cleanup + iterator release
      const onAbort = signal ? () => {
        if (!settled) {
          settled = true;
          cleanup();
          iterator.return?.();
        }
      } : undefined;
      if (onAbort) signal!.addEventListener("abort", onAbort, { once: true });

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              reject(new StreamIdleTimeoutError(timeoutMs));
            }
          }, timeoutMs);
        });
        const result = await Promise.race([iterator.next(), timeoutPromise]);
        settled = true;
        cleanup();
        if (result.done) return;
        yield result.value;
      } catch (err) {
        settled = true;
        cleanup();
        // On timeout, release the upstream iterator
        await iterator.return?.();
        throw err;
      } finally {
        if (onAbort) signal!.removeEventListener("abort", onAbort);
        cleanup();
      }
    }
  } finally {
    // Ensure iterator is always closed on generator return
    await iterator.return?.();
  }
}
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/llm/src/__tests__/stream-idle-timeout.test.ts
# Expected: 4 pass, 0 fail
```

---

### Task 5: Wire idle timeout into Anthropic provider + add gap warning logging

**Files:**
- Modify: `packages/llm/src/providers/anthropic/provider.ts`
- Modify: `packages/llm/src/index.ts` (re-export)

**Amp reference:** `modules/1089_unknown_EUT.js:94-108` — `for await (let w of C4R(L, tLR))`, logs warn when gap > rLR

- [ ] **Step 1: Write the failing test**

```typescript
// packages/llm/src/__tests__/stream-idle-timeout.test.ts (append)
describe("provider integration", () => {
  it("StreamIdleTimeoutError is exported from @flitter/llm", async () => {
    // Just verify the re-export works
    const { StreamIdleTimeoutError: Err } = await import("../index");
    expect(Err).toBeDefined();
    expect(new Err(1000).name).toBe("StreamIdleTimeoutError");
  });
});
```

- [ ] **Step 2: Integrate into Anthropic provider**

In `packages/llm/src/providers/anthropic/provider.ts`, wrap the SDK stream:

```typescript
// Inside stream() method, replace:
//   for await (const event of stream) {
// With:
import { withStreamIdleTimeout, STREAM_IDLE_TIMEOUT_MS, STREAM_GAP_WARNING_MS } from "../../stream-idle-timeout";
import { createLogger } from "@flitter/util";
const streamLog = createLogger("llm:stream");

// ... in stream():
let lastEventTime = Date.now();
// Pass the AbortSignal from params so external cancellation cleans up the timeout
for await (const event of withStreamIdleTimeout(stream, STREAM_IDLE_TIMEOUT_MS, signal)) {
  const now = Date.now();
  const gap = now - lastEventTime;
  if (gap > STREAM_GAP_WARNING_MS) {
    streamLog.warn("Long gap between stream events", {
      gapMs: gap,
      model,
    });
  }
  lastEventTime = now;
  const delta = this._transformer.fromProviderDelta(event as AnthropicSSEEvent, state);
  yield delta;
}
```

- [ ] **Step 3: Add re-export in llm/index.ts**

```typescript
export { StreamIdleTimeoutError, withStreamIdleTimeout, STREAM_IDLE_TIMEOUT_MS, STREAM_GAP_WARNING_MS } from "./stream-idle-timeout";
```

- [ ] **Step 4: Run tests + typecheck**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/llm/src/__tests__/stream-idle-timeout.test.ts
# Expected: 5 pass, 0 fail

cd /Users/bytedance/workspace/flitter && tsc --noEmit
# Expected: 0 errors
```

---

## GAP-LLM-02: maxRetries: 0 on Anthropic SDK

**Amp reference:** Amp disables SDK-level retries so its own `RetryScheduler` handles all retry logic. The Anthropic SDK's `maxRetries` option defaults to 2 — causing double-retries.

### Task 6: Add maxRetries: 0

**Files:**
- Modify: `packages/llm/src/providers/anthropic/provider.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/llm/src/providers/anthropic/__tests__/provider.test.ts (create or append)
import { describe, expect, it, mock } from "bun:test";
// Verify that when stream() is called, the SDK stream call includes maxRetries: 0
// This is best verified by inspecting the client construction or call options
```

- [ ] **Step 2: Add maxRetries: 0 to stream call**

In `packages/llm/src/providers/anthropic/provider.ts`, line ~106:

```typescript
// BEFORE:
const stream = client.messages.stream(body as Parameters<typeof client.messages.stream>[0], {
  signal,
});

// AFTER:
const stream = client.messages.stream(body as Parameters<typeof client.messages.stream>[0], {
  signal,
  maxRetries: 0,
});
```

Also add to `_createClient` if the SDK accepts it at client level, or keep it per-call.

- [ ] **Step 3: Verify no double retry — typecheck**

```bash
cd /Users/bytedance/workspace/flitter && tsc --noEmit
# Expected: 0 errors
```

---

## GAP-CORE-01: Wire PluginService into container.ts

**Amp reference:** `chunk-002.js:27190-27510` — PluginService is created during container init, connected to ToolOrchestrator for interception hooks.

### Task 7: Instantiate PluginService in createContainer

**Files:**
- Modify: `packages/flitter/src/container.ts`

**Existing code:** `PluginService` class at `packages/agent-core/src/plugins/plugin-service.ts` — constructor takes `{ workspaceDir }`, has `loadPlugins()`, `onToolCall()`, `dispose()`.

**Currently missing in container.ts:** PluginService is NOT instantiated, NOT in ServiceContainer interface, NOT in disposal chain.

- [ ] **Step 1: Write the failing test (container test)**

```typescript
// packages/flitter/src/__tests__/container.test.ts (append)
import { describe, expect, it } from "bun:test";

describe("container PluginService wiring", () => {
  it("ServiceContainer interface includes pluginService", async () => {
    // Type-level check — if PluginService is in ServiceContainer, this compiles
    const container = await createContainer(/* ... test opts ... */);
    expect(container.pluginService).toBeDefined();
    await container.asyncDispose();
  });
});
```

- [ ] **Step 2: Add PluginService to ServiceContainer interface (as optional)**

In `container.ts`, add to `ServiceContainer` interface as **optional** to avoid breaking existing test mocks and consumers. Callers that need PluginService must null-check or use `container.pluginService!` after verifying availability:

```typescript
import { PluginService } from "@flitter/agent-core";
// ...
export interface ServiceContainer {
  // existing...
  /** Plugin service (discovers + manages plugin hooks). Optional: absent in test environments. */
  pluginService?: PluginService;
  // ...
}
```

- [ ] **Step 3: Instantiate after ToolRegistry, wire interception hooks**

Insert between step 2c (Toolbox) and step 3 (PermissionEngine).

> **Why this ordering:** PluginService must follow ToolRegistry (plugins may register additional tools) and precede PermissionEngine (plugin-registered tools need permission rules). This matches amp's `chunk-002.js:27190-27510` ordering.

```typescript
// 2d. PluginService — discover and load plugins
// 逆向: X3 — PluginService wired after ToolRegistry, before PermissionEngine
// Must follow ToolRegistry (plugins may register tools); must precede PermissionEngine
const pluginService = new PluginService({ workspaceDir: opts.workspaceRoot });
try {
  await pluginService.loadPlugins();
  log.info("PluginService loaded", { pluginCount: pluginService.pluginCount });
} catch (err) {
  log.warn("PluginService load failed, continuing without plugins", { error: err });
}
disposables.push(pluginService);
```

Wire interception hooks into ToolOrchestrator (the connection the spec mentions but the original plan omitted):

```typescript
// Connect plugin hooks to tool execution pipeline
// 逆向: chunk-002.js:27350 — pluginService.onToolCall connected to orchestrator
if (pluginService.pluginCount > 0) {
  toolOrchestrator.addPreExecuteHook(async (toolUse) => {
    await pluginService.onToolCall({ toolName: toolUse.name, args: toolUse.args });
  });
  toolOrchestrator.addPostExecuteHook(async (toolUse, result) => {
    await pluginService.onToolResult({ toolName: toolUse.name, result });
  });
}
```

Add to the container object:

```typescript
const container: ServiceContainer = {
  // existing...
  pluginService,
  // ...
};
```

- [ ] **Step 4: Run typecheck + tests**

```bash
cd /Users/bytedance/workspace/flitter && tsc --noEmit
# Expected: 0 errors

cd /Users/bytedance/workspace/flitter && bun test packages/flitter/
# Expected: all pass
```

---

# Session 1C: GAP-TUI-01 + GAP-TUI-02

---

## GAP-TUI-01: Kitty Graphics Protocol Image Widget

**Complexity:** High
**Amp reference:** Search `amp-cli-reversed/` for Kitty/image/APC protocol. The widget uses:
- APC (Application Program Command) escape: `\x1b_Gf=32,a=T,t=d,...;\x1b\\`
- Base64-chunked image data (4096 byte chunks with `m=1` continuation)
- Format detection: PNG preferred, JPEG fallback, RGB raw
- Terminal capability probe: check `$TERM_PROGRAM` or query

**Pattern:** Follow existing `@flitter/tui` widget pattern: `extends StatelessWidget`, `build()` returns a composition of primitives, or `extends LeafRenderObjectWidget` with custom `performLayout` + `performPaint` for direct cell painting.

### Task 8: KittyImage widget — base64 encoding + APC transmission

**Files:**
- Create: `packages/tui/src/widgets/kitty-image.ts`
- Create: `packages/tui/src/widgets/__tests__/kitty-image.test.ts`
- Modify: `packages/tui/src/index.ts` (re-export)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/tui/src/widgets/__tests__/kitty-image.test.ts
import { describe, expect, it } from "bun:test";
import {
  encodeKittyPayload,
  buildKittyTransmission,
  KITTY_CHUNK_SIZE,
} from "../kitty-image";

describe("encodeKittyPayload", () => {
  it("base64-encodes image data", () => {
    const data = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic
    const encoded = encodeKittyPayload(data);
    expect(typeof encoded).toBe("string");
    expect(Buffer.from(encoded, "base64").toString("hex")).toBe("89504e47");
  });
});

describe("buildKittyTransmission", () => {
  it("builds single-chunk APC for small images", () => {
    const data = Buffer.from("tiny");
    const chunks = buildKittyTransmission({
      data,
      format: 100, // PNG
      width: 10,
      height: 5,
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain("\x1b_G");
    expect(chunks[0]).toContain("f=100");
    expect(chunks[0]).toContain("m=0"); // no continuation
    expect(chunks[0]).toEndWith("\x1b\\");
  });

  it("chunks large data with m=1 continuation", () => {
    const data = Buffer.alloc(KITTY_CHUNK_SIZE * 2 + 100, 0xff);
    const chunks = buildKittyTransmission({
      data,
      format: 100,
      width: 100,
      height: 100,
    });
    expect(chunks.length).toBeGreaterThan(1);
    // First N-1 chunks have m=1, last has m=0
    for (let i = 0; i < chunks.length - 1; i++) {
      expect(chunks[i]).toContain("m=1");
    }
    expect(chunks[chunks.length - 1]).toContain("m=0");
  });
});
```

- [ ] **Step 2: Implement kitty-image.ts**

```typescript
// packages/tui/src/widgets/kitty-image.ts

/**
 * @flitter/tui — Kitty Graphics Protocol image widget
 *
 * Transmits inline images using the Kitty Graphics Protocol (APC sequences).
 * Supports PNG and RGB raw formats, chunked for large images.
 *
 * 逆向: amp-cli-reversed image display (search for "kitty" / "APC" / "graphics")
 * Protocol spec: https://sw.kovidgoyal.net/kitty/graphics-protocol/
 *
 * APC format:
 *   \x1b_G<key>=<value>,...;<base64 data>\x1b\\
 *
 * Keys used:
 *   f = format (100=PNG, 32=RGB, 24=RGBA)
 *   a = action (T=transmit+display, t=transmit, p=display)
 *   t = transmission (d=direct)
 *   m = more chunks (1=yes, 0=last)
 *   s = width in pixels
 *   v = height in pixels
 *   c = columns (terminal cells)
 *   r = rows (terminal cells)
 */

export const KITTY_CHUNK_SIZE = 4096;

export interface KittyTransmissionOptions {
  data: Buffer;
  format: 100 | 32 | 24; // PNG, RGB, RGBA
  width: number;
  height: number;
  columns?: number;
  rows?: number;
}

export function encodeKittyPayload(data: Buffer): string {
  return data.toString("base64");
}

export function buildKittyTransmission(opts: KittyTransmissionOptions): string[] {
  // ... implementation
}

// Widget class (LeafRenderObjectWidget or StatelessWidget)
// ... will paint the APC sequences into the render buffer
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/widgets/__tests__/kitty-image.test.ts
# Expected: 3 pass, 0 fail
```

- [ ] **Step 4: Export from tui index + typecheck**

```bash
cd /Users/bytedance/workspace/flitter && tsc --noEmit
# Expected: 0 errors
```

- [ ] **Step 5: Rendering integration — how APC meets cell-based painting**

The KittyImage widget must bridge two worlds: flitter's cell-based rendering pipeline (where `performPaint` writes character cells) and Kitty's APC escape sequences (which are raw terminal escapes, not cells).

**Architecture decision:** Use `LeafRenderObjectWidget` with `performLayout` to reserve a rectangular region of blank cells (sized by `columns × rows`), and `performPaint` to emit APC sequences as **raw escape passthrough** into the render buffer. This follows the same pattern terminal emulators use — the image occupies a cell rectangle but the actual image data is transmitted out-of-band via APC.

**Implementation notes:**
- `performLayout`: compute `columns × rows` from image pixel dimensions + terminal cell size (query via `TIOCGWINSZ` or assume 8×16 fallback). Reserve that many cells in the layout.
- `performPaint`: write placeholder cells (e.g., spaces) to the reserved region, then append APC chunks to the renderer's **passthrough buffer** (a buffer for raw escapes that bypass cell diffing).
- If the renderer lacks a passthrough buffer, this must be added to `AnsiRenderer` — a `passthroughSequences: string[]` that gets flushed after the cell diff frame.
- Terminal capability detection: only emit APC when `$TERM_PROGRAM` is `kitty`, `WezTerm`, or `ghostty` (or when the Kitty graphics query response is positive). Fall back to `[image: <filename>]` placeholder text on unsupported terminals.

**Integration test (tmux E2E per CLAUDE.md Rule 2):**

```typescript
// packages/tui/src/widgets/__tests__/kitty-image.test.ts (append)
import { describe, expect, it } from "bun:test";

describe("KittyImage rendering integration", () => {
  it("reserves correct cell rectangle for image dimensions", () => {
    // Unit test: given image 160x80px and cell size 8x16,
    // widget should request 20 columns × 5 rows
    const widget = new KittyImageRenderObject({
      data: Buffer.from("fake"),
      format: 100,
      pixelWidth: 160,
      pixelHeight: 80,
      cellWidth: 8,
      cellHeight: 16,
    });
    widget.performLayout({ maxWidth: 80, maxHeight: 24 });
    expect(widget.size.width).toBe(20);
    expect(widget.size.height).toBe(5);
  });

  it("emits APC sequences in passthrough buffer during paint", () => {
    // Verify paint output contains APC escape, not cell characters
    const widget = new KittyImageRenderObject({ /* ... */ });
    const mockCanvas = { writePassthrough: [] as string[] };
    widget.performPaint(mockCanvas as any);
    expect(mockCanvas.writePassthrough.length).toBeGreaterThan(0);
    expect(mockCanvas.writePassthrough[0]).toContain("\x1b_G");
  });
});
```

**Manual verification (after unit tests pass):**
```bash
# Requires Kitty, WezTerm, or Ghostty terminal
tmux new-session -d -s test -x 80 -y 24 "bun run test-kitty-image-app 2>/tmp/kitty-test.log"
sleep 2
tmux capture-pane -t test -p | head -10  # Should show reserved blank region
# Visual confirmation: image should appear in the terminal
tmux kill-session -t test
```

---

## GAP-TUI-02: 5th Approval Option — "Allow File for Every Session"

**Amp reference:**
- `chunk-006.js:22722-22738` — `createConfirmationOptions` adds a 5th option when the tool is a file-guarded tool
- `chunk-006.js:36437-36490` — `onConfirmationResponse` handles `"always-guarded"` scope
- Existing type: `ApprovalScope` already includes `"always-guarded"` in `approval-widget.ts:82`

**Existing plan:** `docs/superpowers/plans/2026-04-19-approval-widget.md` covers this — the 5th option renders conditionally for file-access tools.

### Task 9: Add 5th "Allow File" option to approval widget

**Files:**
- Modify: `packages/cli/src/widgets/approval-widget.ts`

**Current state:** `APPROVAL_OPTIONS` array has 4 options (lines 196-200). The `ApprovalScope` type already includes `"always-guarded"` (line 82). We need to:
1. Add 5th option to the options array (conditional on tool being a file-guarded tool)
2. Map the 5th option to scope `"always-guarded"` in the response

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/widgets/__tests__/approval-widget.test.ts (create or append)
import { describe, expect, it } from "bun:test";
import { buildApprovalOptions, type ApprovalRequest } from "../approval-widget";

describe("buildApprovalOptions", () => {
  it("returns 4 options for non-file tools", () => {
    const request: ApprovalRequest = {
      toolUseId: "1",
      toolName: "Bash",
      args: { command: "ls" },
      reason: "needs approval",
    };
    const opts = buildApprovalOptions(request);
    expect(opts).toHaveLength(4);
  });

  it("returns 5 options for file-guarded tools", () => {
    const request: ApprovalRequest = {
      toolUseId: "1",
      toolName: "Edit",
      args: { filePath: "/src/main.ts" },
      reason: "needs approval",
      isGuardedFile: true,
    };
    const opts = buildApprovalOptions(request);
    expect(opts).toHaveLength(5);
    expect(opts[3].value).toBe("allow-file-persistent");
  });
});
```

- [ ] **Step 2: Implement conditional 5th option**

Add `isGuardedFile?: boolean` to `ApprovalRequest`. Extract option building into `buildApprovalOptions(request)`. Insert 5th option after "Allow All for Every Session" when `isGuardedFile` is true:

```typescript
{ value: "allow-file-persistent", label: "Allow File for Every Session", color: SUCCESS_COLOR }
```

Map it to `ApprovalScope = "always-guarded"` in the response handler.

- [ ] **Step 3: Run tests + typecheck**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/approval-widget.test.ts
# Expected: all pass

cd /Users/bytedance/workspace/flitter && tsc --noEmit
# Expected: 0 errors
```

---

# Session 1D: GAP-DATA-01 + GAP-DATA-02 + GAP-CLI-01

---

## GAP-DATA-01: ThreadRemoteTransport Stub

**Existing interface:** `ThreadRemoteTransport` defined at `packages/data/src/thread/thread-upload.ts:23-28`:
```typescript
export interface ThreadRemoteTransport {
  uploadThread(thread: ThreadSnapshot): Promise<void>;
  getThread(id: string): Promise<ThreadSnapshot | null>;
  listThreads(opts?: { limit?: number | null }): Promise<ThreadEntry[]>;
  deleteThread(id: string): Promise<void>;
}
```

**Goal:** Implement a local-file-backed stub that implements this interface. Same signatures as a real server transport — drop-in replaceable.

### Task 10: LocalThreadTransport stub

**Files:**
- Create: `packages/data/src/thread/thread-remote-stub.ts`
- Create: `packages/data/src/thread/__tests__/thread-remote-stub.test.ts`
- Modify: `packages/data/src/index.ts` (re-export)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/data/src/thread/__tests__/thread-remote-stub.test.ts
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { LocalThreadTransport } from "../thread-remote-stub";
import type { ThreadSnapshot } from "@flitter/schemas";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("LocalThreadTransport", () => {
  let dir: string;
  let transport: LocalThreadTransport;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "thread-transport-test-"));
    transport = new LocalThreadTransport(dir);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  // ThreadSnapshot needs enough fields for LocalThreadTransport.listThreads()
  // to produce complete ThreadEntry objects (id, v, created, title,
  // userLastInteractedAt, messageCount, relationships, summaryStats, usesDtw)
  const makeThread = (id: string): ThreadSnapshot => ({
    id,
    v: 1,
    title: `Thread ${id}`,
    messages: [],
    created: Date.now(),
    userLastInteractedAt: Date.now(),
    env: "local",
    agentMode: "normal",
  } as unknown as ThreadSnapshot);

  it("uploadThread + getThread round-trips", async () => {
    const thread = makeThread("t1");
    await transport.uploadThread(thread);
    const loaded = await transport.getThread("t1");
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe("t1");
    expect(loaded!.title).toBe("Thread t1");
  });

  it("getThread returns null for non-existent", async () => {
    const result = await transport.getThread("nonexistent");
    expect(result).toBeNull();
  });

  it("listThreads returns uploaded threads with complete ThreadEntry shape", async () => {
    await transport.uploadThread(makeThread("a"));
    await transport.uploadThread(makeThread("b"));
    const list = await transport.listThreads();
    expect(list).toHaveLength(2);
    // Verify ThreadEntry required fields are present
    for (const entry of list) {
      expect(entry.id).toBeDefined();
      expect(typeof entry.v).toBe("number");
      expect(typeof entry.created).toBe("number");
      expect(typeof entry.messageCount).toBe("number");
      expect(Array.isArray(entry.relationships)).toBe(true);
      expect(entry.summaryStats).toBeDefined();
      expect(typeof entry.usesDtw).toBe("boolean");
    }
  });

  it("listThreads respects limit", async () => {
    await transport.uploadThread(makeThread("a"));
    await transport.uploadThread(makeThread("b"));
    await transport.uploadThread(makeThread("c"));
    const list = await transport.listThreads({ limit: 2 });
    expect(list).toHaveLength(2);
  });

  it("deleteThread removes from storage", async () => {
    await transport.uploadThread(makeThread("del"));
    await transport.deleteThread("del");
    const result = await transport.getThread("del");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Implement LocalThreadTransport**

```typescript
// packages/data/src/thread/thread-remote-stub.ts

/**
 * @flitter/data — Local file-backed ThreadRemoteTransport stub
 *
 * Implements ThreadRemoteTransport interface using local JSON files.
 * Drop-in replaceable when a real server exists.
 *
 * 逆向: amp-cli-reversed/modules/1342_ThreadService_azT.js — remote transport interface
 * Storage: one JSON file per thread at <dir>/<threadId>.json
 */
import type { ThreadSnapshot } from "@flitter/schemas";
import { createLogger } from "@flitter/util";
import type { ThreadRemoteTransport } from "./thread-upload";
import type { ThreadEntry } from "./types";
import { readdir, readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { join, basename } from "node:path";

const log = createLogger("thread-transport:local");

export class LocalThreadTransport implements ThreadRemoteTransport {
  private readonly dir: string;

  constructor(storageDir: string) {
    this.dir = storageDir;
  }

  async uploadThread(thread: ThreadSnapshot): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const filePath = join(this.dir, `${thread.id}.json`);
    await writeFile(filePath, JSON.stringify(thread, null, 2));
    log.debug("Uploaded thread to local storage", { threadId: thread.id });
  }

  async getThread(id: string): Promise<ThreadSnapshot | null> {
    try {
      const content = await readFile(join(this.dir, `${id}.json`), "utf-8");
      return JSON.parse(content) as ThreadSnapshot;
    } catch {
      return null;
    }
  }

  async listThreads(opts?: { limit?: number | null }): Promise<ThreadEntry[]> {
    try {
      const files = await readdir(this.dir);
      let jsonFiles = files.filter(f => f.endsWith(".json"));
      if (opts?.limit != null) {
        jsonFiles = jsonFiles.slice(0, opts.limit);
      }
      // Build complete ThreadEntry objects from stored snapshots.
      // ThreadEntry requires: id, v, created, title, userLastInteractedAt,
      // messageCount, relationships, summaryStats, usesDtw
      const entries: ThreadEntry[] = [];
      for (const f of jsonFiles) {
        try {
          const content = await readFile(join(this.dir, f), "utf-8");
          const snapshot = JSON.parse(content) as ThreadSnapshot;
          entries.push({
            id: snapshot.id,
            v: snapshot.v ?? 1,
            created: snapshot.created ?? Date.now(),
            title: snapshot.title ?? null,
            userLastInteractedAt: snapshot.userLastInteractedAt ?? Date.now(),
            messageCount: snapshot.messages?.length ?? 0,
            relationships: [],
            summaryStats: { messageCount: snapshot.messages?.length ?? 0 },
            usesDtw: false,
          });
        } catch {
          // Skip corrupt files
        }
      }
      return entries;
    } catch {
      return [];
    }
  }

  async deleteThread(id: string): Promise<void> {
    try {
      await unlink(join(this.dir, `${id}.json`));
      log.debug("Deleted thread from local storage", { threadId: id });
    } catch {
      // File may not exist
    }
  }
}
```

- [ ] **Step 3: Export + run tests**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/data/src/thread/__tests__/thread-remote-stub.test.ts
# Expected: 5 pass, 0 fail
```

---

## GAP-DATA-02: Thread Metadata Remote Update

**Goal:** When thread metadata changes (title, labels), call the stub transport to persist. Currently ThreadUploadManager calls `remote.uploadThread()` for dirty threads — this task ensures metadata-only changes also trigger an upload.

### Task 11: Metadata update triggers upload

**Files:**
- Modify: `packages/data/src/thread/thread-upload.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/data/src/thread/__tests__/thread-remote-stub.test.ts (append)
import { ThreadUploadManager } from "../thread-upload";

describe("ThreadUploadManager metadata updates", () => {
  it("marks thread dirty on metadata change and flushes", async () => {
    const uploaded: string[] = [];
    const transport = new LocalThreadTransport(dir);
    const thread = makeThread("meta-test");
    const manager = new ThreadUploadManager({
      getThreadSnapshot: () => thread,
      remote: {
        ...transport,
        uploadThread: async (t) => { uploaded.push(t.id); },
        getThread: transport.getThread.bind(transport),
        listThreads: transport.listThreads.bind(transport),
        deleteThread: transport.deleteThread.bind(transport),
      },
      throttleMs: 10,
    });
    manager.markDirty("meta-test");
    await new Promise(r => setTimeout(r, 50));
    expect(uploaded).toContain("meta-test");
  });
});
```

- [ ] **Step 2: Verify existing flow handles metadata — may already work**

The existing `ThreadUploadManager.markDirty()` + `flushPendingUploads()` should handle this. The task may only need:
1. Ensuring `ThreadStore.updateMetadata()` calls `uploadManager.markDirty()`
2. Adding a `updateMetadata` method if it doesn't exist

- [ ] **Step 3: Run tests**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/data/src/thread/__tests__/thread-remote-stub.test.ts
# Expected: 6 pass, 0 fail
```

---

## GAP-CLI-01: skill Command Group

**Existing code:** `SkillService` at `packages/data/src/skill/skill-service.ts` — has `scan()`, `list()`, `getDiscoveryPaths()`, `skills: BehaviorSubject<Skill[]>`.

**Slash command pattern:** `packages/cli/src/commands/slash-handlers.ts` uses `createBuiltinCommands(registry)` with `registry.register({ name, description, execute })`.

**Goal:** Add `skill add/list/remove/info` CLI subcommands. Since flitter uses commander for CLI, add a `skill` command group.

### Task 12: skill command group

**Files:**
- Create: `packages/cli/src/commands/skill-commands.ts`
- Create: `packages/cli/src/commands/__tests__/skill-commands.test.ts`
- Modify: `packages/cli/src/commands/slash-handlers.ts` (register `/skill` slash command)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/commands/__tests__/skill-commands.test.ts
import { describe, expect, it, mock } from "bun:test";
import { handleSkillCommand } from "../skill-commands";

describe("handleSkillCommand", () => {
  // Note: SkillService.list() returns SkillFrontmatter[] which has {name, description}
  // but no `path` field. For `info` to show location, we need skills.getValue()
  // which returns Skill[] with {name, description, baseDir, frontmatter, body}.
  const mockSkillService = {
    list: () => [
      { name: "test-skill", description: "A test skill" },
    ],
    skills: {
      getValue: () => [
        { name: "test-skill", description: "A test skill", baseDir: "/path/to/skill", frontmatter: { name: "test-skill", description: "A test skill" }, body: "" },
      ],
    },
    scan: mock(() => Promise.resolve()),
    getDiscoveryPaths: () => ["/home/.config/flitter/skills", ".flitter/skills"],
  };

  it("lists installed skills", async () => {
    const output = await handleSkillCommand("list", mockSkillService as any);
    expect(output).toContain("test-skill");
    expect(output).toContain("A test skill");
  });

  it("shows info for a specific skill", async () => {
    const output = await handleSkillCommand("info test-skill", mockSkillService as any);
    expect(output).toContain("test-skill");
    expect(output).toContain("/path/to/skill");
  });

  it("returns error for unknown subcommand", async () => {
    const output = await handleSkillCommand("unknown", mockSkillService as any);
    expect(output).toContain("Unknown skill subcommand");
  });

  it("handles empty skill list", async () => {
    const emptyService = { ...mockSkillService, list: () => [] };
    const output = await handleSkillCommand("list", emptyService as any);
    expect(output).toContain("No skills installed");
  });
});
```

- [ ] **Step 2: Implement skill command handler**

```typescript
// packages/cli/src/commands/skill-commands.ts

/**
 * @flitter/cli — skill command group: add/list/remove/info
 *
 * Provides CLI and slash-command access to SkillService functionality.
 * Available as `/skill` slash command and `flitter skill` CLI subcommand.
 *
 * 逆向: amp-cli-reversed skill management (search for "skill" in CLI entrypoint)
 */
import type { SkillService } from "@flitter/data";

/**
 * Handle a skill subcommand.
 *
 * @param argsStr - Subcommand and arguments (e.g., "list", "info my-skill", "add <path>")
 * @param skillService - The SkillService instance
 * @returns Formatted output string
 */
export async function handleSkillCommand(
  argsStr: string,
  skillService: SkillService,
): Promise<string> {
  const parts = argsStr.trim().split(/\s+/);
  const subcommand = parts[0] ?? "list";
  const args = parts.slice(1);

  switch (subcommand) {
    case "list":
      return handleList(skillService);
    case "info":
      return handleInfo(args[0], skillService);
    case "add":
      return handleAdd(args[0], skillService);
    case "remove":
      return handleRemove(args[0], skillService);
    default:
      return `Unknown skill subcommand: "${subcommand}". Available: list, info, add, remove`;
  }
}

function handleList(service: SkillService): string {
  const skills = service.list();
  if (skills.length === 0) return "No skills installed. Discovery paths: " + service.getDiscoveryPaths().join(", ");
  return skills.map(s => `  ${s.name} — ${s.description ?? "(no description)"}`).join("\n");
}

function handleInfo(name: string | undefined, service: SkillService): string {
  if (!name) return "Usage: skill info <name>";
  // Use skills.getValue() to get full Skill objects (with baseDir),
  // not list() which returns SkillFrontmatter[] (no path info)
  const skill = service.skills.getValue().find(s => s.name === name);
  if (!skill) return `Skill "${name}" not found`;
  return `Name: ${skill.name}\nDescription: ${skill.description ?? "(none)"}\nPath: ${skill.baseDir}`;
}

async function handleAdd(path: string | undefined, _service: SkillService): Promise<string> {
  if (!path) return "Usage: skill add <path>";
  // TODO: Implement skill installation from path/URL
  return `Skill installation from "${path}" is not yet implemented. Copy skill files to a discovery path.`;
}

async function handleRemove(name: string | undefined, _service: SkillService): Promise<string> {
  if (!name) return "Usage: skill remove <name>";
  // TODO: Implement skill removal
  return `Skill removal for "${name}" is not yet implemented.`;
}
```

- [ ] **Step 3: Register as slash command**

In `packages/cli/src/commands/slash-handlers.ts`, add:

```typescript
import { handleSkillCommand } from "./skill-commands";

// Inside createBuiltinCommands(registry):
registry.register({
  name: "skill",
  aliases: ["skills"],
  description: "Manage skills: list, info, add, remove",
  async execute(args, ctx) {
    const output = await handleSkillCommand(args, ctx.skillService);
    ctx.showMessage(output);
  },
});
```

- [ ] **Step 4: Run tests + typecheck**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/skill-commands.test.ts
# Expected: 4 pass, 0 fail

cd /Users/bytedance/workspace/flitter && tsc --noEmit
# Expected: 0 errors
```

---

## Phase 1 Exit Criteria Checklist

After all 4 sessions, verify:

- [ ] `apply_patch` can create, modify, delete, and move files via patch text
- [ ] A stalled LLM stream throws `StreamIdleTimeoutError` after 120s
- [ ] No double-retry observed (SDK retries = 0, RetryScheduler handles all)
- [ ] PluginService instantiated and discoverable in container
- [ ] Image data encoded + chunked correctly for Kitty protocol
- [ ] Approval widget shows 5 options for file-guarded tools, 4 for others
- [ ] Thread operations go through remote transport interface (backed by local files)
- [ ] Thread metadata changes trigger upload via transport
- [ ] `/skill list` shows installed skills, `/skill info <name>` shows details

**Final verification command:**

```bash
cd /Users/bytedance/workspace/flitter && bun test && tsc --noEmit
# Expected: all tests pass, 0 type errors
```

---

## Commit Strategy

One commit per gap (or logical subtask for high-complexity gaps):

1. `feat(agent-core): add apply_patch tool — Codex-format multi-file patches [GAP-TOOL-01]`
2. `feat(llm): add stream idle timeout wrapper (120s) [GAP-LLM-01]`
3. `fix(llm): set maxRetries: 0 on Anthropic SDK stream calls [GAP-LLM-02]`
4. `feat(flitter): wire PluginService into container [GAP-CORE-01]`
5. `feat(tui): add KittyImage widget — Kitty Graphics Protocol [GAP-TUI-01]`
6. `feat(cli): add 5th approval option for guarded files [GAP-TUI-02]`
7. `feat(data): add LocalThreadTransport stub [GAP-DATA-01]`
8. `feat(data): thread metadata remote update [GAP-DATA-02]`
9. `feat(cli): add skill command group [GAP-CLI-01]`

After all commits, update `GAPS.md` (move closed gaps) and `HEALTH.md`.
