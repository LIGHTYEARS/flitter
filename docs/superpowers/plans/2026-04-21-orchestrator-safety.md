# Orchestrator Safety: onResume + isDangerousToResume + blocked-on-user

> **Gaps:** GAP-CORE-05, GAP-CORE-06, GAP-CORE-07
> **Status:** PLAN — iteration 8 implementation target
> **Priority:** High (production reliability)
> **Effort:** Medium (3 files, ~150 LOC)

## Problem Statement

When a thread is resumed after crash/restart/reconnect, in-progress tool invocations are lost:

1. **No resume (CORE-05):** Flitter only truncates incomplete assistant messages on resume. Tools that were mid-execution are silently abandoned — the user sees "cancelled" but the tool never restarts.

2. **No safety gate (CORE-06):** If resume were naively implemented, destructive tools (Bash, Task) would re-execute on reconnect, potentially re-running dangerous commands.

3. **No persisted approval state (CORE-07):** Approval requests are in-memory only. After restart, the user is never prompted again — the tool hangs forever.

## Amp Reference

### Source files
- `modules/1234_unknown_FWT.js` lines 37-93: `onResume()` full implementation
- `modules/1234_unknown_FWT.js` lines 545-547: `isDangerousToResume()`
- `chunk-001.js` line 5722: `wt()` — terminal status check
- `chunk-002.js` line 20762: `onResume()` duplicate in chunk

### `onResume()` decision tree

For each `tool_result` in the latest user message:

```
tool_result.run.status === "blocked-on-user"
  → toolService.restoreApproval({ toolUseId, toolName, args, reason, toAllow })
  → skip further processing

wt(run.status) === true  (done | error | rejected-by-user | cancelled)
  → skip (already terminal)

runningTools.has(toolUseId)
  → skip (already executing)

isDangerousToResume(tool.name) === true
  → write { status: "cancelled", reason: "system:safety", progress: <existing> }
  → skip

otherwise
  → invokeTool(tool, userInput)  // re-execute safe tool
```

### `isDangerousToResume()` tool list

| Constant | Tool name |
|----------|-----------|
| U8 | `"Bash"` |
| S2 | `"run_terminal_command"` |
| Eb | `"shell_command"` |
| Dt | `"Task"` |
| j0T | `"handoff"` |

**Notable:** File mutation tools (`write_file`, `edit_file`, `apply_patch`) are NOT dangerous to resume — they are considered idempotent enough to replay.

### `blocked-on-user` persistence

Written to `tool_result.run` when approval is requested:
```json
{
  "status": "blocked-on-user",
  "reason": "string — why approval is required",
  "toAllow": ["string[] — file paths or commands"]
}
```

`syncPendingApprovalsToThreadState()` subscribes to `pendingApprovals$` and writes the state for each new approval. `writtenBlockedToolUseIds` Set deduplicates writes.

## Implementation Plan

### Step 1: Add `blocked-on-user` status to schemas

**File:** `packages/schemas/src/permissions.ts`

Add `"blocked-on-user"` to `ToolRunInternalStatusSchema`. This is the status that gets persisted to the thread's tool_result entries.

### Step 2: Add `isDangerousToResume()` to orchestrator

**File:** `packages/agent-core/src/tools/orchestrator.ts`

```typescript
const DANGEROUS_TO_RESUME: ReadonlySet<string> = new Set([
  "Bash",
  "run_terminal_command",
  "shell_command",
  "Task",
  "handoff",
]);

function isDangerousToResume(toolName: string): boolean {
  return DANGEROUS_TO_RESUME.has(toolName);
}
```

Export this for use by ThreadWorker.

### Step 3: Add `isTerminalStatus()` utility

**File:** `packages/agent-core/src/tools/orchestrator.ts` (or a shared utility)

```typescript
// 逆向: wt (chunk-001.js:5722)
function isTerminalStatus(status: string): boolean {
  return status === "done" || status === "error" ||
         status === "rejected-by-user" || status === "cancelled";
}
```

### Step 4: Implement `onResume()` on ToolOrchestrator

**File:** `packages/agent-core/src/tools/orchestrator.ts`

Add an `onResume(thread: ThreadSnapshot)` method that:
1. Finds the latest user message (scan from end for `role: "user"`)
2. Iterates `tool_result` blocks in that message
3. For each non-terminal tool_result:
   - `blocked-on-user` → emit an approval-request event (details TBD based on approval system)
   - `isDangerousToResume(name)` → write `{ status: "cancelled", reason: "system:safety" }` via callback
   - Otherwise → call `invokeTool()` to re-execute

### Step 5: Wire `onResume()` into ThreadWorker.resume()

**File:** `packages/agent-core/src/worker/thread-worker.ts`

After the existing truncation logic in the resume path, call `this.toolOrchestrator.onResume(thread)`.

### Step 6: Add `syncPendingApprovalsToThreadState()`

**File:** `packages/agent-core/src/tools/orchestrator.ts`

Subscribe to the approval queue. When a new approval is pending, write `{ status: "blocked-on-user", reason, toAllow }` to the thread via callback. Track written IDs to avoid duplicate writes.

### Step 7: Tests

- Unit test `isDangerousToResume()` — verify exact tool name set
- Unit test `isTerminalStatus()` — verify all 4 terminal statuses
- Unit test `onResume()` with mock thread containing:
  - A terminal tool_result (should be skipped)
  - A blocked-on-user tool_result (should be restored)
  - A dangerous non-terminal tool_result (should be cancelled)
  - A safe non-terminal tool_result (should be re-invoked)

## Dependencies

- Approval system (`toolService.restoreApproval`) — currently the approval system in flitter is partially implemented via `ApprovalRequestEvent`. The `restoreApproval` path may need to be added.
- `processingMutex` (GAP-CORE-10) — amp wraps `onResume` in a mutex. We can add this as a follow-up or use a simple guard flag.

## Risk Assessment

- **Low risk:** `isDangerousToResume` and `isTerminalStatus` are pure functions, easy to test
- **Medium risk:** `onResume()` touches thread state and tool invocation — needs careful integration testing
- **Out of scope:** `processingMutex` (CORE-10), `cancelToolOnly` (CORE-11), `rejected-by-user` status (CORE-13)
