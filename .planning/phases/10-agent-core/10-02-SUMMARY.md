---
phase: 10
plan: 02
status: complete
---

# Tool Orchestrator — Summary

## One-Liner
Implemented the tool execution engine with resource conflict detection, greedy dependency batching, and a ToolOrchestrator class that executes batches sequentially with intra-batch parallelism via Promise.allSettled.

## What Was Built
- `ToolUseItem` interface (id, name, input) for orchestrator consumption
- `ToolThreadEvent`, `ToolDataEvent`, `HookResult` event/callback types
- `OrchestratorCallbacks` interface (getConfig, updateThread, getToolRunEnvironment, applyHookResult, applyPostHookResult, updateFileChanges, getDisposed$)
- `hasResourceConflict(a, b, registry)` — detects conflicts via serial flag or shared write-mode resource keys
- `batchToolsByDependency(toolUses, registry)` — greedy algorithm placing each tool in the last batch unless conflicting
- `ToolOrchestrator` class with executeToolsWithPlan, invokeTool (full lifecycle: cancel check, pre-hook, AbortController, execute, Observable-to-Promise conversion, post-hook, error wrapping, cleanup), cancelAll, cancelTool, hasRunningTools, dispose

## Key Decisions
- Greedy batching: tools are added to the last batch; conflict starts a new batch (simple, deterministic)
- `Promise.allSettled` for intra-batch execution so one tool failure does not abort siblings
- Observable results converted via `observableToPromise` helper (takes last emitted value)
- `invokeTool` uses try/catch/finally to guarantee `runningTools` cleanup even on errors
- Cancelled tools get a "cancelled" status update rather than silently dropping

## Test Coverage
34 tests in `orchestrator.test.ts` covering: hasResourceConflict (no profile, serial flags, shared read-write keys, different keys), batchToolsByDependency (no conflict, all serial, mixed conflicts, empty/single input, read-read same resource), ToolOrchestrator (parallel timing verification, serial batches, empty input, success/error/cancel/not-found paths, cancelAll, cancelTool, hasRunningTools, dispose).

## Artifacts
- `packages/agent-core/src/tools/orchestrator.ts`
- `packages/agent-core/src/tools/orchestrator.test.ts`
