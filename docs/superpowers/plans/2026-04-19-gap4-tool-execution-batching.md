# Gap 4: Tool Execution Planning / Batching

> Implementation plan for parallel tool execution with resource-based conflict detection.

## Overview

When an LLM requests multiple tool calls in a single response, amp determines which tools can run in parallel vs. must run sequentially. It uses a resource-based conflict model: tools declare what files/resources they read/write, and tools with conflicting resources are serialized. Flitter already has `batchToolsByDependency()` and `hasResourceConflict()` in `orchestrator.ts` — but the execution profiles on individual tools need to be wired up correctly.

## Amp Reference

**Batching algorithm:** `chunk-002.js:20697-20725` — three functions:
- `MwR(T, R, registry)` — do two tools conflict? Check `serial` flag, then compare resource keys for read/write conflicts
- `DwR(T, batch, registry)` — does tool T conflict with any tool in a batch?
- `wwR(tools, registry)` — group tools into sequential batches, each batch runs in parallel

**Execution:** `chunk-002.js:20945` — `executeToolBatchesSequentially(batches)` processes batches sequentially, each batch with `Promise.allSettled()`.

**Execution profiles:**
| Tool | Profile |
|---|---|
| Bash / shell_command | `{ serial: true }` — always runs alone |
| Read | `resourceKeys: (args) => [{ key: args.path, mode: "read" }]` |
| Write / create_file | `resourceKeys: (args) => [{ key: args.path, mode: "write" }]` |
| Edit / edit_file | `resourceKeys: (args) => [{ key: args.path, mode: "write" }]` |
| Glob | `resourceKeys: () => []` — no conflicts |
| Grep | `resourceKeys: () => []` — no conflicts |
| Task (subagent) | `resourceKeys: () => []` — independent |
| Toolbox (`tb__*`) | `{ serial: false, resourceKeys: () => [] }` — always parallel |

**Conflict rule:** Two tools conflict if either is `serial`, OR they share a resource key where at least one access is `mode: "write"`.

## Current Flitter State

**File:** `packages/agent-core/src/tools/orchestrator.ts`

Already has:
```typescript
export function hasResourceConflict(a: ToolUseItem, b: ToolUseItem, registry: ToolRegistry): boolean
export function batchToolsByDependency(toolUses: ToolUseItem[], registry: ToolRegistry): ToolUseItem[][]
```

And `executeToolsWithPlan()` calls `batchToolsByDependency()` then processes batches.

**Current issue:** The builtin tools export `executionProfile` functions but they need to be:
1. Registered properly on the ToolSpec
2. Called by the batching algorithm via `registry.getExecutionProfile(name, args)`

---

## Implementation Tasks

### Task 1: Verify ExecutionProfile type

**File:** `packages/agent-core/src/tools/types.ts`

Ensure the `ExecutionProfile` type matches amp's model:

```typescript
export interface ResourceKey {
  key: string;
  mode: "read" | "write";
}

export interface ExecutionProfile {
  serial?: boolean;           // if true, always runs alone
  resourceKeys: (args: Record<string, unknown>) => ResourceKey[];
}
```

### Task 2: Verify builtin tool profiles

Each tool should have an `executionProfile` that matches amp:

**`bash.ts`:** Already has `executionProfile: { serial: true }` — correct.

**`read.ts`:** Should have:
```typescript
executionProfile: {
  resourceKeys: (args) => args.file_path ? [{ key: String(args.file_path), mode: "read" }] : []
}
```

**`write.ts`:** Should have:
```typescript
executionProfile: {
  resourceKeys: (args) => args.file_path ? [{ key: String(args.file_path), mode: "write" }] : []
}
```

**`edit.ts`:** Should have:
```typescript
executionProfile: {
  resourceKeys: (args) => args.file_path ? [{ key: String(args.file_path), mode: "write" }] : []
}
```

**`glob.ts`:** `executionProfile: { resourceKeys: () => [] }` (no file conflicts)

**`grep.ts`:** `executionProfile: { resourceKeys: () => [] }` (no file conflicts)

**`fuzzy-find.ts`:** `executionProfile: { resourceKeys: () => [] }` (no file conflicts)

**`task.ts`:** `executionProfile: { resourceKeys: () => [] }` (independent subagent)

### Task 3: Verify ToolRegistry.getExecutionProfile()

**File:** `packages/agent-core/src/tools/registry.ts`

Ensure the registry exposes:
```typescript
getExecutionProfile(toolName: string, args?: Record<string, unknown>): ExecutionProfile | null
```

This should look up the tool's `executionProfile`:
- If it's a static object with `serial: true`, return it directly
- If it has a `resourceKeys` function, return it
- If the tool has no profile, return `null` (treated as conflicting with everything)

### Task 4: Verify batching algorithm

**File:** `packages/agent-core/src/tools/orchestrator.ts`

The existing `hasResourceConflict()` should match amp's logic:

```typescript
export function hasResourceConflict(
  a: ToolUseItem,
  b: ToolUseItem,
  registry: ToolRegistry,
): boolean {
  const profileA = registry.getExecutionProfile(a.name, a.input);
  const profileB = registry.getExecutionProfile(b.name, b.input);

  // No profile = always serial (conservative)
  if (!profileA || !profileB) return true;

  // Either is serial = conflict
  if (profileA.serial || profileB.serial) return true;

  // Check resource key conflicts
  const keysA = profileA.resourceKeys(a.input ?? {});
  const keysB = profileB.resourceKeys(b.input ?? {});
  for (const ka of keysA) {
    for (const kb of keysB) {
      if (ka.key === kb.key && (ka.mode === "write" || kb.mode === "write")) {
        return true;
      }
    }
  }
  return false;
}
```

### Task 5: Verify parallel execution

**File:** `packages/agent-core/src/tools/orchestrator.ts`

In `executeToolsWithPlan()`:
```typescript
async executeToolsWithPlan(toolUses: ToolUseItem[]): Promise<void> {
  const batches = batchToolsByDependency(toolUses, this.toolRegistry);
  for (const batch of batches) {
    // All tools in this batch can run in parallel
    const results = await Promise.allSettled(
      batch.map(toolUse => this.invokeTool(toolUse))
    );
    // Log any rejections, continue to next batch
    for (const result of results) {
      if (result.status === "rejected") {
        this.logger?.warn("Tool execution failed in batch", result.reason);
      }
    }
  }
}
```

### Task 6: Per-tool AbortController

Each tool in a batch gets its own `AbortController`:
```typescript
const controller = new AbortController();
this.runningTools.set(toolUse.id, { abort: controller });
```

`cancelAll()` aborts all controllers:
```typescript
cancelAll(): void {
  for (const [id, { abort }] of this.runningTools) {
    abort.abort();
  }
  this.runningTools.clear();
}
```

### Task 7: Tests

**File:** `packages/agent-core/src/tools/__tests__/batching.test.ts`

Test cases:
1. Two Read tools on different files → single batch (parallel)
2. Read + Write on same file → two batches (serial)
3. Two Writes on different files → single batch (parallel)
4. Two Writes on same file → two batches (serial)
5. Bash + anything → Bash alone in first batch
6. Three Glob tools → single batch (all parallel)
7. Mixed: Read(a) + Write(b) + Write(a) → batch1: [Read(a), Write(b)], batch2: [Write(a)]

---

## Expected Behavior Examples

**LLM requests: Read file A, Read file B, Grep for pattern**
→ Batch 1: [Read(A), Read(B), Grep] — all parallel (no write conflicts)

**LLM requests: Read file A, Edit file A, Write file B**
→ Batch 1: [Read(A), Write(B)] — parallel (read A + write B don't conflict)
→ Batch 2: [Edit(A)] — sequential (write A conflicts with read A)

**LLM requests: Bash "git status", Read file A**
→ Batch 1: [Bash] — alone (serial)
→ Batch 2: [Read(A)]

---

## Estimated Scope

| Task | Files | Complexity |
|---|---|---|
| Verify/fix ExecutionProfile type | 1 | Low |
| Verify/fix builtin tool profiles | 7 | Low |
| Verify ToolRegistry.getExecutionProfile | 1 | Low |
| Verify/fix batching algorithm | 1 | Low |
| Verify parallel execution | 1 | Medium |
| Per-tool AbortController | 1 | Low |
| Tests | 1 new | Medium |

**Note:** Much of this may already be implemented correctly. The main task is verification and fixing any mismatches with amp's behavior.
