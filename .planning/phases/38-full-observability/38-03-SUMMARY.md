---
phase: 38
plan: 3
subsystem: agentic-loop-instrumentation
tags: [tracing, observability, instrumentation, agentic-loop, spans, ttft, cache-tokens]
dependency_graph:
  requires: [38-01]
  provides: [agentic-loop-trace-spans, cache-token-tracking, structured-error-entries]
  affects: [prompt-controller, types, pi-ai-provider]
tech_stack:
  added: []
  patterns: [trace-span-try-catch, writeEntry-structured-errors, performance-now-ttft, span-attribute-enrichment]
key_files:
  created: []
  modified:
    - packages/flitter-cli/src/state/types.ts
    - packages/flitter-cli/src/provider/pi-ai-provider.ts
    - packages/flitter-cli/src/state/prompt-controller.ts
decisions:
  - "Use null (not undefined) for root span parentSpanId to match TraceStore signature"
  - "Cast lifecycle to string before 'error' comparison to avoid TS2367 narrowing error"
  - "Cast event.usage via 'as unknown as Record<string, unknown>' to satisfy TS2352"
  - "Inference span restart per attempt placed inside while loop, not before it"
metrics:
  duration_seconds: 1510
  completed_date: "2026-04-08"
  tasks_completed: 5
  files_modified: 3
---

# Phase 38 Plan 3: Agentic Loop Instrumentation Summary

Instrumented the agentic loop in prompt-controller.ts with 5 trace span types and structured error capture. Enriched UsageInfo with cache token fields and added TTFT measurement.

## What Was Built

**Task 1 — UsageInfo cache token fields (4567e0f)**
Added `cacheReadTokens?: number` and `cacheWriteTokens?: number` to the `UsageInfo` interface in `types.ts`. Updated `PiAiProvider` to map `usage.cacheRead` → `cacheReadTokens` and `usage.cacheWrite` → `cacheWriteTokens` in the `done` event handler.

**Task 2 — Agent and prompt-assembly spans (37b3a96)**
Added `traceStore` import and `_currentAgentSpan` instance field to `PromptController`. The `agent` root span is started at `submitPrompt()` entry with `threadId` and `messageText` attributes. The span ends in the catch block (with error status) and in the finally block (with lifecycle-derived status). The `prompt-assembly` child span wraps `_buildMessages()` with `messageCount` and `iteration` attributes.

**Task 3 — Inference span with TTFT measurement (bdad784)**
Added `inference` child span per retry attempt within `_streamResponse()`. Tracks `streamStartedAt = performance.now()` and emits a `first-token` span event with `ttftMs` at the `hasBegunStreaming` transition. At `message_complete`, span attributes are enriched with `stopReason`, `totalLatencyMs`, `attempt`, and raw usage data. Span ends with `ok` on normal completion, `error+retried=true` at retry boundary, `error+errorCode` on non-retryable errors, and `error+cancelled` on cancellation.

**Task 4 — Tools container and individual tool spans (9f01a0e)**
Added `tools` container span in `_agenticLoop()` wrapping `_executeToolCalls()`. Added `parentSpanId?: string` parameter to `_executeToolCalls()`. Each tool call gets a `tool:{name}` child span started BEFORE the permission check. Spans end with `ok/error` based on execution result, `error+permission_denied` on permission denial, and `error+executor_not_found` for unknown tools.

**Task 5 — Structured error capture (c8b5335)**
Added `writeEntry` import. Three `writeEntry` calls with `kind: 'error'`:
- `category: 'provider'` in `submitPrompt()` catch (includes `traceId`, `spanId`)
- `category: 'tool_execution'` in `_executeToolCalls()` catch (includes `toolName`, `toolCallId`, `traceId`, `spanId`)
- `category: 'permission'` in `_requestToolPermission()` catch (changed bare `catch {}` to `catch (err)`)

## Span Hierarchy

```
agent (root)
  └─ prompt-assembly (per iteration)
  └─ inference (per retry attempt, child of agent)
  └─ tools (when tool_use, child of agent)
       └─ tool:{name} (per tool call, child of tools)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript narrowing on lifecycle comparison**
- **Found during:** Task 2
- **Issue:** `this._session.lifecycle === 'error'` caused TS2367 because type was narrowed
- **Fix:** Assign to `const lifecycleAtEnd: string` before comparison
- **Files modified:** `packages/flitter-cli/src/state/prompt-controller.ts`
- **Commit:** 37b3a96

**2. [Rule 1 - Bug] TypeScript cast for UsageInfo → Record<string, unknown>**
- **Found during:** Task 3
- **Issue:** Direct cast `event.usage as Record<string, unknown>` failed TS2352
- **Fix:** Double-cast via `as unknown as Record<string, unknown>`
- **Files modified:** `packages/flitter-cli/src/state/prompt-controller.ts`
- **Commit:** bdad784

**3. [Rule 1 - Bug] Used null instead of undefined for root span parentSpanId**
- **Found during:** Task 2
- **Issue:** Plan code used `undefined` but TraceStore signature requires `string | null`
- **Fix:** Used `null` for root span (no parent)
- **Files modified:** `packages/flitter-cli/src/state/prompt-controller.ts`
- **Commit:** 37b3a96

## Known Stubs

None. All trace calls are wired to the live TraceStore singleton and writeEntry function.

## Verification Results

- TypeScript: `npx tsc --noEmit` — no new errors (4 pre-existing errors unchanged)
- Trace call count: 20 (exceeds minimum of 15)
- All traceStore calls wrapped in try/catch: confirmed via inspection
- Tests: 1126 pass, 7 fail — 7 failures are pre-existing (BashExecutor, AppState newThread, Lifecycle Integration, InputArea mode badge, resolveToolDisplayName)

## Self-Check: PASSED

- FOUND: 38-03-SUMMARY.md
- FOUND: packages/flitter-cli/src/state/types.ts
- FOUND: packages/flitter-cli/src/provider/pi-ai-provider.ts
- FOUND: packages/flitter-cli/src/state/prompt-controller.ts
- FOUND: commit 4567e0f (feat(38-03): enrich UsageInfo with cacheReadTokens and cacheWriteTokens)
- FOUND: commit 37b3a96 (feat(38-03): add agent and prompt-assembly spans)
- FOUND: commit bdad784 (feat(38-03): add inference span with TTFT measurement)
- FOUND: commit 9f01a0e (feat(38-03): add tools container span and individual tool spans)
- FOUND: commit c8b5335 (feat(38-03): structured error capture in all catch blocks)
