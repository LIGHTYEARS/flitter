# Phase 38: 全链路可观测能力 - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Source:** AMP reverse-engineered source (traceStore, agentSpan, usage schemas) + flitter-cli codebase audit + interactive discussion

<domain>
## Phase Boundary

Build end-to-end observability for the local agentic loop in flitter-cli, aligned with AMP's tracing architecture. The scope covers three pillars:

1. **End-to-end request tracing** — From user input → prompt assembly → API call → stream processing → tool execution → rendering, with traceId/spanId correlation. Each interaction's full lifecycle is traceable in a single NDJSON log file.

2. **Rendering pipeline performance linkage** — Bridge flitter-core's existing FrameStats/PerfOverlay with flitter-cli's business events: which widget rebuild caused a frame overrun, which tool-call render consumed the most paint time.

3. **Structured error capture** — Catch all exceptions in the agentic loop (prompt-controller), record to NDJSON with stack trace + context + threadId, following AMP's `Z.error()` structured logging pattern.

### What is NOT in scope
- WebSocket/remote executor tracing (flitter-cli is local-only)
- External telemetry/analytics upload (no Sentry, no cloud ingestion)
- Widget-level ErrorBoundary (deferred — requires flitter-core changes)
- TUI overlay for traces/metrics (deferred — use NDJSON log files + jq)
- Session-level crash-free rate statistics (deferred)

</domain>

<decisions>
## Implementation Decisions

### AMP Architecture Alignment

AMP's ThreadWorker has a built-in tracing system:
- `traceStore` object with 4 operations: `startTrace(span)`, `recordTraceEvent(span, event)`, `recordTraceAttributes(span, attributes)`, `endTrace(span)`
- `currentAgentSpan: { span: string, messageId: string }` tracks the active agent span
- `startAgentSpan(messageId)` generates a unique span ID via `LLR()`, emits `trace:start` delta
- `stopAgentSpan(spanId)` emits `trace:end` delta
- `createTracer(parentSpan)` returns a tracer that creates child spans via `DLR(traceStore, parentSpan)`
- `startActiveSpan("tools", { context }, async callback)` creates nested spans for tool execution
- Thread deltas include: `trace:start`, `trace:end`, `trace:event`, `trace:attributes`

flitter-cli should implement the same span model but emit to NDJSON log instead of thread deltas.

### Tracing Architecture

**Span model** (aligned with AMP's trace deltas):
```
{
  kind: "span",
  traceId: string,      // per-user-interaction, generated on submit
  spanId: string,        // unique per operation
  parentSpanId?: string, // for nesting (agent → inference → tools)
  name: string,          // "agent" | "inference" | "tool:{name}" | "prompt-assembly" | "stream-processing"
  startTime: string,     // ISO 8601
  endTime?: string,      // ISO 8601, set on span close
  duration?: number,     // ms, computed on close
  attributes: Record<string, unknown>,  // threadId, messageId, model, provider, etc.
  events?: Array<{ name: string, time: string, attributes?: Record<string, unknown> }>,
  status: "ok" | "error"
}
```

**Span hierarchy for a single user interaction:**
```
agent (traceId=T1)
  ├── prompt-assembly (parentSpanId=agent)
  ├── inference (parentSpanId=agent)
  │     attributes: { model, provider, inputTokens, outputTokens, cacheReadTokens, TTFT, totalLatency }
  ├── tools (parentSpanId=agent)
  │     ├── tool:bash (parentSpanId=tools)
  │     ├── tool:edit_file (parentSpanId=tools)
  │     └── tool:read_file (parentSpanId=tools)
  └── inference (parentSpanId=agent)  // next agentic loop iteration
```

### Rendering Pipeline Linkage

Bridge flitter-core's FrameStats into the trace context:
- When a span is active, tag frame stats with the current `traceId`/`spanId`
- On frame overrun (>16.67ms budget), emit a trace event `{ name: "frame-overrun", attributes: { totalMs, buildMs, layoutMs, paintMs } }`
- Use flitter-core's existing `setPipelineLogSink()` to redirect pipeline logs into the structured logger

### Error Capture

Follow AMP's `Z.error(message, { name, threadID, error })` pattern:
- Wrap all catch blocks in prompt-controller's agentic loop with structured error emission
- Each error record includes: stack trace, active spanId/traceId, threadId, error code/category
- Error records are NDJSON entries with `kind: "error"` (distinguished from regular logs and spans)

### Storage Strategy

Reuse existing `logger.ts` infrastructure. All observability data writes to the same NDJSON log file (`~/.flitter-cli/logs/flitter-cli-YYYY-MM-DD.log`), distinguished by a `kind` field:
- `kind: "log"` — existing structured logs (no change)
- `kind: "span"` — trace spans (new)
- `kind: "error"` — structured error records (enhanced from existing error logs)

This avoids introducing new file I/O paths, new retention logic, or new configuration — zero technical debt. Consumers use `jq 'select(.kind == "span")'` to filter.

### Claude's Discretion
- Whether to use `crypto.randomUUID()` or a lighter ID generator for spanId/traceId
- Whether to emit span-start and span-end as separate NDJSON lines or a single line on span close
- Log level for trace spans (debug vs info)
- Whether frame-overrun events need their own threshold configuration

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AMP Tracing Architecture (reverse-engineered)
- `tmux-capture/amp-source/29_thread_worker_statemachine.js` — `traceStore`, `startAgentSpan()`, `stopAgentSpan()`, `createTracer()`, `startActiveSpan()`, `trace:start`/`trace:end` deltas
- `tmux-capture/amp-source/26_toast_skills.js` — ThreadWorker constructor with `traceStore` initialization: `startTrace`, `recordTraceEvent`, `recordTraceAttributes`, `endTrace`
- `tmux-capture/amp-source/20_thread_queue_handoff.js` — `_turnStartTime`, `_turnElapsedMs`, `currentAgentSpan`, `currentSpan`
- `tmux-capture/amp-source/20_thread_management.js` — Usage schema: `totalInputTokens`, `maxInputTokens`, `inputTokens`, `outputTokens`, `cacheCreationInputTokens`, `cacheReadInputTokens`, `thinkingBudget`

### flitter-cli Existing Infrastructure
- `packages/flitter-cli/src/utils/logger.ts` — NDJSON structured logger (extend with `kind` field)
- `packages/flitter-cli/src/state/prompt-controller.ts` — Agentic loop (primary instrumentation target)
- `packages/flitter-cli/src/provider/pi-ai-provider.ts` — API call site (inference span source)
- `packages/flitter-cli/src/state/app-state.ts` — State management (thread context for span attributes)
- `packages/flitter-cli/src/utils/token-tracker.ts` — Existing token accumulation (integrate into inference span attributes)
- `packages/flitter-cli/src/utils/activity-tracker.ts` — Existing activity tracking

### flitter-core Diagnostics (bridge targets)
- `packages/flitter-core/src/diagnostics/frame-stats.ts` — FrameStats with per-phase timing
- `packages/flitter-core/src/diagnostics/pipeline-debug.ts` — `setPipelineLogSink()` for redirecting pipeline logs
- `packages/flitter-core/src/diagnostics/debug-flags.ts` — `debugShowFrameStats` flag
- `packages/flitter-core/src/scheduler/frame-scheduler.ts` — `performance.now()` frame timing, `setErrorLogger()`

### Tests
- `packages/flitter-core/src/diagnostics/__tests__/` — 4 existing diagnostic test files (reference for test patterns)
- `packages/flitter-cli/src/__tests__/` — 6 existing test files

</canonical_refs>

<specifics>
## Specific Ideas

- AMP's `LLR()` generates unique span IDs — flitter can use `crypto.randomUUID()` (Bun built-in, zero deps)
- AMP stores traces as thread deltas (`trace:start`, `trace:end`) because it has a WebSocket server; flitter should emit directly to NDJSON since it's local-only
- The `inference` span should capture: model name, provider, input/output tokens, cache tokens, TTFT (time to first token), total latency, cost estimate — all data already available from `pi-ai-provider.ts` stream events
- For rendering pipeline linkage, inject the active traceId into flitter-core's `FrameStats` via a global context (similar to `setLogContext()`)
- The `prompt-assembly` span should capture: system prompt size, message count, tool definition count, total estimated tokens before API call
- Tool spans should capture: tool name, arguments summary (truncated), duration, success/failure, output size

</specifics>

<deferred>
## Deferred Ideas

- Widget-level ErrorBoundary in flitter-core (requires framework changes, separate phase)
- TUI overlay for live trace/metric visualization (complex UI work, use jq for now)
- Session-level statistics (crash-free rate, total session cost, avg latency) — can be computed offline from NDJSON
- HTTP debug-inspector extensions (`/traces`, `/metrics` endpoints) — useful but not essential for initial observability
- OpenTelemetry-compatible export (OTLP) for external tools — over-engineering for a CLI tool
- Automatic frame-overrun → widget attribution (requires render-object → widget reverse mapping during active span)

</deferred>

---

*Phase: 38-full-observability*
*Context gathered: 2026-04-08 via AMP source analysis + interactive discussion*
