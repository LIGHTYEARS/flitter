---
phase: 38
plan: 02
title: "Rendering pipeline bridge — setPipelineLogSink integration and frame-overrun events"
subsystem: flitter-cli/observability
tags: [pipeline-bridge, logging, frame-timing, observability]
dependency_graph:
  requires: [38-01-PLAN.md]
  provides: [pipeline-bridge.ts, frame-overrun-events]
  affects: [packages/flitter-cli/src/index.ts, packages/flitter-cli/src/utils/pipeline-bridge.ts]
tech_stack:
  added: []
  patterns: [pipeline-log-sink, ndjson-structured-logging]
key_files:
  created:
    - packages/flitter-cli/src/utils/pipeline-bridge.ts
  modified:
    - packages/flitter-cli/src/index.ts
decisions:
  - "teardownPipelineBridge() placed after gracefulShutdown() and before closeLogFile() in main() rather than inside gracefulShutdown() to ensure it always runs at app exit"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 38 Plan 02: Rendering Pipeline Bridge Summary

**One-liner:** setPipelineLogSink bridge redirecting flitter-core frame timing and diagnostics into flitter-cli NDJSON logger with frame-overrun warnings at 16.67ms threshold.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create the pipeline-bridge module | a65d1cf | packages/flitter-cli/src/utils/pipeline-bridge.ts |
| 2 | Wire the pipeline bridge into startup and shutdown | aeea852 | packages/flitter-cli/src/index.ts |

## What Was Built

### pipeline-bridge.ts

A new utility module that bridges flitter-core's diagnostic logging system into flitter-cli's structured NDJSON logger:

- **`pipelineSink(tag, msg)`** — Internal sink function registered with flitter-core:
  - `FRAME` tagged messages are parsed with a regex for timing components (total, build, layout, paint, render)
  - Frames exceeding 16.67ms emit `log.warn('frame-overrun', { totalMs, buildMs, layoutMs, paintMs, renderMs })`
  - All other pipeline messages forwarded as `log.debug('[pipeline:TAG] msg')`

- **`initPipelineBridge()`** — Exported startup function; calls `setPipelineLogSink(pipelineSink)` to activate the bridge

- **`teardownPipelineBridge()`** — Exported shutdown function; calls `resetPipelineLogSink()` to restore flitter-core's default stderr sink

### index.ts Changes

- Import: `import { initPipelineBridge, teardownPipelineBridge } from './utils/pipeline-bridge'`
- Startup (line 62): `initPipelineBridge()` called immediately after `initLogFile(config.logRetentionDays)`
- Shutdown (line 253): `teardownPipelineBridge()` called before `closeLogFile()`

## Verification Results

- TypeScript: No errors in modified files (`src/utils/pipeline-bridge.ts`, `src/index.ts`)
- Pre-existing errors in unrelated files are unchanged (scope boundary respected)
- Tests: 1126 pass, 7 fail — the 7 failures are pre-existing and unrelated to pipeline bridge work
- Acceptance criteria for both tasks: all passing

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — the pipeline bridge is fully wired and functional.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. The pipeline bridge only intercepts in-process log calls.

## Self-Check: PASSED

- `packages/flitter-cli/src/utils/pipeline-bridge.ts` — FOUND
- Commit `a65d1cf` — FOUND
- Commit `aeea852` — FOUND
- `grep -c 'export function initPipelineBridge' packages/flitter-cli/src/utils/pipeline-bridge.ts` — returns 1
- `grep -c 'export function teardownPipelineBridge' packages/flitter-cli/src/utils/pipeline-bridge.ts` — returns 1
- `grep "initPipelineBridge" packages/flitter-cli/src/index.ts` — returns 2 matches (import + call at line 62)
- `grep "teardownPipelineBridge" packages/flitter-cli/src/index.ts` — returns 2 matches (import + call at line 253)
- `initPipelineBridge()` at line 62 is after `initLogFile()` at line 61 — confirmed
- `teardownPipelineBridge()` at line 253 is before `closeLogFile()` at line 254 — confirmed
