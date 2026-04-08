---
phase: 38
plan: 01
title: "Tracer infrastructure — TraceStore, Span types, logger writeEntry()"
subsystem: observability
tags: [tracing, logging, ndjson, infrastructure]
dependency_graph:
  requires: []
  provides: [tracer.ts, writeEntry, TraceStore, Span, SpanHandle, SpanEvent, createTracer, traceStore]
  affects: [packages/flitter-cli/src/utils/logger.ts, packages/flitter-cli/src/utils/tracer.ts]
tech_stack:
  added: [crypto.randomUUID (Bun built-in)]
  patterns: [NDJSON structured logging, span lifecycle, AMP DLR createTracer pattern]
key_files:
  created:
    - packages/flitter-cli/src/utils/tracer.ts
  modified:
    - packages/flitter-cli/src/utils/logger.ts
decisions:
  - "Use crypto.randomUUID() for span/trace ID generation — Bun built-in, zero additional dependencies"
  - "endSpan is idempotent via isActive() check — createTracer catch/finally blocks work safely without double-emit"
  - "kind field is set at buildJsonEntry level for logs and overridden to 'error' in writeErrorLog — minimal surface change"
metrics:
  duration: "5m"
  completed: "2026-04-08"
  tasks_completed: 2
  files_modified: 1
  files_created: 1
---

# Phase 38 Plan 01: Tracer Infrastructure Summary

**One-liner:** NDJSON tracer infrastructure with TraceStore span lifecycle, kind-tagged log entries, and AMP-aligned createTracer factory.

## What Was Built

### Task 1: logger.ts — writeEntry() and kind field

Added `writeEntry()` as an exported function after `closeLogFile()` in `logger.ts`. This function writes raw NDJSON entries directly to the log stream, bypassing level checks. Falls back to stderr if no log file is open.

Added `kind: 'log'` as the first field in every `buildJsonEntry()` output. This enables `jq` filtering by entry type across the unified NDJSON log file.

Added `entry.kind = 'error'` override in `writeErrorLog()` so that error/fatal entries have `kind: "error"` instead of `kind: "log"`, making them discoverable via `jq 'select(.kind == "error")'`.

**Files modified:**
- `/packages/flitter-cli/src/utils/logger.ts` — lines 92-104 (writeEntry), line 159 (kind: 'log'), line 223 (entry.kind = 'error')

### Task 2: tracer.ts — TraceStore, Span types, createTracer factory

Created a new `tracer.ts` module with:

**Interfaces:**
- `SpanEvent` — timestamped event recorded within a span (name, time, attributes)
- `Span` — complete span data model with kind:'span', traceId, spanId, parentSpanId, name, startTime, endTime, duration, attributes, events, status
- `SpanHandle` — opaque readonly reference (spanId, traceId) returned by startSpan

**TraceStore class:**
- `startSpan(name, parentSpanId, attributes?, traceId?)` — creates span with traceId inheritance from parent or fresh generation
- `addSpanEvent(spanId, name, attributes?)` — pushes timestamped event into span.events (no-op if not found)
- `setSpanAttributes(spanId, attributes)` — merges attributes into span (no-op if not found)
- `endSpan(spanId, status?, finalAttributes?)` — closes span, computes duration, emits via writeEntry(), removes from map (no-op/idempotent if not found)
- `isActive(spanId)` — checks if span is still in active map

**createTracer factory:**
Aligned with AMP's `createTracer(parentSpan) → DLR(traceStore, parentSpan)` pattern. Returns an object with `startActiveSpan<T>(name, attributes, fn)` that creates a child span bound to the parent's traceId, calls fn with the child handle, and correctly closes with 'error' status on throw or 'ok' on success. The catch/finally pair is safe: catch calls endSpan('error') removing it from map, finally checks isActive() before calling endSpan('ok') — no double-emit.

**Module singleton:**
- `traceStore` — exported singleton TraceStore instance for CLI process use

## Verification Results

- `bunx tsc --noEmit` passes with no new errors in tracer.ts or logger.ts
- All pre-existing 7 test failures unchanged (BashExecutor, AppState, Lifecycle, InputArea, resolveToolDisplayName — pre-existing, unrelated to this plan)
- 1126 tests passing, 7323 expect() calls — no regressions from logger.ts kind field addition
- All acceptance criteria met for both tasks

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — tracer.ts is fully functional infrastructure with no stubs or placeholders.

## Threat Flags

None — tracer.ts writes to existing log file via writeEntry(), which is already part of the log system's threat surface. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries introduced.

## Self-Check: PASSED

**Files exist:**
- `packages/flitter-cli/src/utils/tracer.ts` — FOUND
- `packages/flitter-cli/src/utils/logger.ts` — FOUND (modified)

**Commits exist:**
- `44d023c` — feat(38-01): add writeEntry() and kind field to logger.ts — FOUND
- `5853a49` — feat(38-01): create tracer.ts with TraceStore, Span types, and createTracer factory — FOUND
