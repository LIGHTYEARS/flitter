# Phase 38: 全链路可观测能力 — Research

**Researched:** 2026-04-08
**Status:** Complete
**Method:** Full source code audit of flitter-cli agentic loop, logger infrastructure, provider stream events, flitter-core diagnostics APIs, and AMP reverse-engineered tracing architecture.

---

## 1. Agentic Loop Flow in prompt-controller.ts

**File:** `packages/flitter-cli/src/state/prompt-controller.ts` (788 lines)

### 1.1 Complete Lifecycle

The agentic loop has 6 distinct phases, each a natural span insertion point:

```
submitPrompt(text)
  │
  ├─ 1. Guard & Reset (lines 162-183)
  │     - Double-submit prevention (_isSubmitting)
  │     - Auto-reset from terminal states (complete/cancelled/error)
  │     - _startElapsedTimer() — Date.now() based, 100ms tick interval
  │     - session.startProcessing(text) — transitions to 'processing'
  │
  ├─ 2. _agenticLoop() (lines 226-306) — while loop, max 50 iterations
  │     │
  │     ├─ 2a. _buildMessages() (lines 721-763)
  │     │     - Converts ConversationItem[] → ProviderMessage[]
  │     │     - Maps user_message, assistant_message, tool_call items
  │     │     - This is the "prompt-assembly" span target
  │     │
  │     ├─ 2b. _streamResponse() (lines 381-465) — with retry
  │     │     - Creates provider.sendPrompt() async iterable
  │     │     - Tracks hasBegunStreaming for retry eligibility
  │     │     - Dispatches events via _dispatchEvent()
  │     │     - Collects PendingToolCall[] from tool_call_ready events
  │     │     - Retry: exponential backoff, only pre-stream errors
  │     │     - Returns { stopReason, pendingToolCalls }
  │     │     - This is the "inference" span target
  │     │
  │     ├─ 2c. Tool Execution (lines 254-271) — if stopReason='tool_use'
  │     │     - session.beginToolExecution(stopReason)
  │     │     - _executeToolCalls(pendingCalls) (lines 470-573)
  │     │       - Permission check per tool
  │     │       - session.addToolCall() → executor.execute() → session.updateToolCall()
  │     │       - Each tool call is a "tool:{name}" span target
  │     │     - session.resumeAfterToolExecution(toolResults)
  │     │     - continue → next iteration
  │     │
  │     ├─ 2d. Auto-dequeue (lines 276-294) — QUEUE-02
  │     │     - If end_turn and queued messages exist, dequeue first
  │     │     - session.reset() + session.startProcessing(next.text)
  │     │     - continue → next iteration
  │     │
  │     └─ 2e. Compaction check (lines 297-367) — COMP-01
  │           - Check usage % vs threshold, prune old messages
  │
  └─ 3. Finally block (lines 208-216)
        - _stopElapsedTimer()
        - _isSubmitting = false
        - _onStreamComplete() callback if lifecycle is 'complete'
```

### 1.2 Error Handling Paths

| Location | Error Type | Current Handling |
|----------|-----------|-----------------|
| `submitPrompt` catch (line 191) | Provider exceptions | `log.error()` + `session.handleError()` |
| `_streamResponse` error event (line 431) | Stream errors | Retry if retryable + pre-stream; else `_dispatchEvent(error)` |
| `_executeToolCalls` catch (line 557) | Tool execution errors | `log.error()` + `session.updateToolCall('failed')` |
| `_requestToolPermission` catch (line 612) | Permission handler errors | Returns `false` (auto-deny) |

**Key observation:** All error paths use `log.error()` with string messages. No structured error records with stack traces, spanId, or error categories exist today.

### 1.3 Timing Infrastructure

- `_promptStartedAt: number | null` — set on `submitPrompt()`, cleared on `_stopElapsedTimer()`
- `elapsedMs: number` — updated every 100ms via `setInterval`, read by border UI
- **No `performance.now()` usage** — all timing is `Date.now()` based
- **No per-phase timing** — no prompt-assembly vs. inference vs. tool-execution breakdown
- **No TTFT (time-to-first-token) tracking** — the `hasBegunStreaming` flag exists but no timestamp is recorded

### 1.4 Span Insertion Points (Recommended)

| Span Name | Start Point | End Point | Key Attributes |
|-----------|------------|-----------|----------------|
| `agent` | `submitPrompt()` line 183 (after guard) | `finally` block line 208 | threadId, messageText (truncated) |
| `prompt-assembly` | `_buildMessages()` entry | `_buildMessages()` return | messageCount, systemPromptSize, toolDefCount |
| `inference` | `_streamResponse()` entry | `_streamResponse()` return | model, provider, attempt, retryCount |
| `inference` attributes (enrich) | On `usage_update` event | — | inputTokens, outputTokens, cacheTokens, cost, TTFT |
| `tools` | Before `_executeToolCalls()` | After `_executeToolCalls()` | toolCount |
| `tool:{name}` | Before `executor.execute()` line 541 | After execute returns/throws | toolName, inputSummary, duration, success, outputSize |

---

## 2. Logger.ts Capabilities and Extension Points

**File:** `packages/flitter-cli/src/utils/logger.ts` (257 lines)

### 2.1 Current Architecture

```
logStream (WriteStream) → ~/.flitter-cli/logs/flitter-cli-YYYY-MM-DD.log (NDJSON)
  │
  ├─ writeDataLog(level, msg, data?) — debug/info/warn
  │     → { ts, level, msg, ctx?, data? }
  │
  └─ writeErrorLog(level, msg, error?, context?) — error/fatal
        → { ts, level, msg, ctx?, err?, data? }
```

### 2.2 Global State

| State | Type | Purpose |
|-------|------|---------|
| `currentLevel` | `LogLevel` | Minimum log level filter |
| `logStream` | `WriteStream \| null` | File output (null = stderr fallback) |
| `currentLogPath` | `string \| null` | Current log file path |
| `_logContext` | `Record<string, unknown>` | Global context injected into every entry |

### 2.3 Public API

- `setLogLevel(level)` — set minimum level
- `setLogContext(ctx)` — merge into global context
- `clearLogContext()` — reset context
- `initLogFile(retentionDays)` — open log file, prune old logs
- `getCurrentLogPath()` — get current log path
- `closeLogFile()` — close stream
- `log.debug/info/warn(msg, data?)` — structured data logging
- `log.error/fatal(msg, error?, context?)` — error logging with Error extraction

### 2.4 Extension Points for Phase 38

**The `kind` field strategy (from 38-CONTEXT.md):**

Current NDJSON entries have no `kind` field. All entries are implicitly `kind: "log"`. To add span and structured error records:

1. **Add `writeSpan()` function** — writes `{ kind: "span", ...spanData }` to the same logStream
2. **Enhance `writeErrorLog()` to emit `kind: "error"`** — add spanId/traceId context
3. **The `buildJsonEntry()` function (line 138)** is the single mutation point for adding `kind` to all entries

**Low-risk approach:** Add a new `writeEntry(entry: Record<string, unknown>)` function that bypasses level checking and writes raw NDJSON. Use this for span records. Existing `log.*()` functions remain unchanged.

### 2.5 Concerns

- `logStream.write()` is async (buffered) but not awaited — span records could be lost on crash. This is acceptable for local-only observability.
- `_logContext` is a global singleton — if we set `traceId`/`spanId` as context, concurrent operations (unlikely in CLI but possible with queue mode) could cross-contaminate. **Recommendation:** Pass traceId/spanId as explicit attributes in each span, not via `_logContext`.

---

## 3. PiAiProvider Stream Events and Timing Injection

**File:** `packages/flitter-cli/src/provider/pi-ai-provider.ts` (398 lines)

### 3.1 Event Flow

```
pi-ai stream(piModel, context, options)
  │
  ├─ start              → skipped
  ├─ text_start         → skipped
  ├─ text_delta         → { type: 'text_delta', text: event.delta }
  ├─ text_end           → skipped
  ├─ thinking_start     → skipped
  ├─ thinking_delta     → { type: 'thinking_delta', text: event.delta }
  ├─ thinking_end       → skipped
  ├─ toolcall_start     → { type: 'tool_call_start', toolCallId, name, title, kind }
  ├─ toolcall_delta     → { type: 'tool_call_input_delta', toolCallId, partialJson }
  ├─ toolcall_end       → { type: 'tool_call_ready', toolCallId, name, input }
  ├─ done               → { type: 'usage_update', usage } + { type: 'message_complete', stopReason }
  └─ error              → { type: 'error', error }
```

### 3.2 Usage Data Available in `done` Event (line 364)

From `event.message.usage` (pi-ai Usage type):

| Field | Availability | Mapping |
|-------|-------------|---------|
| `usage.input` | Always | `inputTokens` |
| `usage.output` | Always | `outputTokens` |
| `usage.cacheRead` | Pi-ai provides | Not currently extracted to UsageInfo |
| `usage.cacheWrite` | Pi-ai provides | Not currently extracted to UsageInfo |
| `usage.totalTokens` | Pi-ai provides | Not currently extracted |
| `usage.cost.total` | When available | `cost.amount` |
| `usage.cost.input` | When available | Not extracted |
| `usage.cost.output` | When available | Not extracted |
| `usage.cost.cacheRead` | When available | Not extracted |
| `usage.cost.cacheWrite` | When available | Not extracted |

**Key observation:** `cacheRead` and `cacheWrite` token counts are available from pi-ai but NOT currently propagated to the UsageInfo type or the inference span. The AMP usage schema (from `20_thread_management.js` line 84) includes: `cacheCreationInputTokens`, `cacheReadInputTokens`, `thinkingBudget`. These should be added to the inference span attributes.

### 3.3 TTFT Injection Point

TTFT (time-to-first-token) can be measured in `_streamResponse()` at `prompt-controller.ts` line 402:

```typescript
// Current code:
if (!hasBegunStreaming && (event.type === 'text_delta' || ...)) {
  this._session.beginStreaming();
  hasBegunStreaming = true;
}
```

Insert `performance.now()` at the start of `_streamResponse()` and compute TTFT when `hasBegunStreaming` transitions to `true`. This is the cleanest location because it's already the semantic boundary between "waiting for response" and "receiving content."

### 3.4 Total Latency

Total latency = time from `sendPrompt()` call to `message_complete` event. Currently the retry loop in `_streamResponse()` resets per attempt, so latency should be measured per-attempt (span attribute) and total (parent inference span).

---

## 4. Frame-Stats and Pipeline-Debug APIs for Bridging

### 4.1 FrameStats (diagnostics/frame-stats.ts — Ring Buffer)

**File:** `packages/flitter-core/src/diagnostics/frame-stats.ts` (319 lines)

This is the **diagnostic** FrameStats class — a ring-buffer based statistics collector. Different from the scheduler's `FrameStats` interface (which is a simple `{ lastFrameTime, phaseStats }` snapshot).

| API | Purpose |
|-----|---------|
| `recordFrame(totalMs)` | Push total frame time |
| `recordPhase(phase, ms)` | Push per-phase timing |
| `recordKeyEvent(ms)` | Push keyboard event time |
| `recordRepaintPercent(%)` | Push repaint percentage |
| `recordBytesWritten(n)` | Push output size |
| `p50, p95, p99` | Percentile accessors |
| `getPhaseP95(phase)` | Per-phase percentile |
| `lastFrameMs` | Most recent frame time |
| `averageMs` | Average frame time |

**Current usage in flitter-cli: NONE.** The FrameStats class from diagnostics is not imported or used anywhere in the CLI package. The frame scheduler records timing internally via `recordFrameStats()` and `recordPhaseStats()` but into its own `_stats` object, not the diagnostic ring buffer.

### 4.2 Pipeline Debug (diagnostics/pipeline-debug.ts)

| API | Purpose |
|-----|---------|
| `setPipelineLogSink(sink)` | Redirect all pipeline logs to custom function |
| `resetPipelineLogSink()` | Restore to default stderr writer |
| `pipelineLog(tag, msg)` | Write a tagged debug message |
| `dumpPaintTree(rootRO)` | Dump render tree as human-readable string |
| `logMutation(op, child, parent)` | Log tree mutation with 5-line stack trace |

**Current usage in flitter-cli: NONE.** The `setPipelineLogSink` is exported from flitter-core's public API (`index.ts` line 67) but not used by flitter-cli.

### 4.3 Frame Scheduler Timing (scheduler/frame-scheduler.ts)

The scheduler's `executeFrame()` method (line 352) already records:
- Total frame time: `performance.now() - startTime`
- Per-phase time: `performance.now() - phaseStart` for BUILD/LAYOUT/PAINT/RENDER
- Writes to `pipelineLog('FRAME', ...)` when `debugFlags.debugShowFrameStats` is true

The scheduler has `setErrorLogger()` (line 238) for redirecting frame execution errors.

### 4.4 Bridging Strategy

The bridge needs to:

1. **Hook `setPipelineLogSink()`** — redirect pipeline logs into the structured logger with `kind: "log"` and pipeline tag
2. **Hook `setErrorLogger()`** on the frame scheduler — redirect frame errors into structured error records
3. **Read scheduler `frameStats` getter** — snapshot per-phase timing after each frame and check for overruns
4. **Emit frame-overrun trace events** — when `lastFrameTime > FRAME_BUDGET_MS`, emit `{ name: "frame-overrun", attributes: { totalMs, buildMs, layoutMs, paintMs } }` into the active span

**Key gap:** There is currently no mechanism to associate a frame with an active traceId/spanId. We need a global "active trace context" that frame-level hooks can read. This is the primary bridge complexity.

### 4.5 flitter-core Public Exports (index.ts)

Currently exported:
- `setPipelineLogSink`, `resetPipelineLogSink` (from pipeline-debug.ts)

NOT exported but needed for bridging:
- `FrameStats` class (from diagnostics/frame-stats.ts) — not needed if we hook via pipeline sink
- `debugFlags`, `setDebugFlag` (from debug-flags.ts) — not exported publicly
- Frame scheduler instance access — not directly exported

**Recommendation:** The bridge should use `setPipelineLogSink()` (already exported) to intercept frame timing logs rather than reaching into the scheduler internals. For frame-overrun detection, we can parse the pipelineLog messages or add a dedicated callback to the scheduler.

---

## 5. AMP's Tracing Architecture

### 5.1 TraceStore (from 26_toast_skills.js constructor)

AMP's ThreadWorker initializes a `traceStore` in its constructor with 4 operations:

```javascript
this.traceStore = {
  startTrace: (span) => {
    this.updateThread({ type: "trace:start", span: span })
  },
  recordTraceEvent: (span, event) => {
    this.updateThread({ type: "trace:event", span: span, event: event })
  },
  recordTraceAttributes: (span, attributes) => {
    this.updateThread({ type: "trace:attributes", span: span, attributes: attributes })
  },
  endTrace: (span) => {
    this.updateThread({ type: "trace:end", span: span })
  }
}
```

AMP emits these as thread deltas (WebSocket-based). flitter-cli should emit them directly to NDJSON log.

### 5.2 Agent Span Lifecycle (from 29_thread_worker_statemachine.js)

```javascript
// Start agent span on user message submission
startAgentSpan(messageId) {
  let spanId = LLR();  // generate unique span ID
  this.currentAgentSpan = { span: spanId, messageId: messageId };
  this.updateThread({
    type: "trace:start",
    span: { name: "agent", id: spanId, startTime: new Date().toISOString(), context: { messageId } }
  });
}

// Stop agent span on completion/cancellation
stopAgentSpan(spanId) {
  this.updateThread({
    type: "trace:end",
    span: { name: "agent", id: spanId, endTime: new Date().toISOString() }
  });
  if (this.currentAgentSpan?.span === spanId)
    this.currentAgentSpan = null;
}
```

### 5.3 Nested "tools" Span (from 29_thread_worker_statemachine.js)

When `stopReason === "tool_use"`, AMP creates a nested "tools" span:

```javascript
let tracer = this.currentAgentSpan
  ? this.createTracer(this.currentAgentSpan.span)
  : Fl;  // Fl = no-op tracer fallback

tracer.startActiveSpan("tools", { context: { messageId } }, async () => {
  await this.toolOrchestrator.onAssistantMessageComplete(message);
});
```

### 5.4 createTracer / DLR Pattern

```javascript
createTracer(parentSpanId) {
  return DLR(this.traceStore, parentSpanId);
}
```

`DLR()` returns a tracer object with a `startActiveSpan(name, options, callback)` method. The tracer:
1. Creates a child span with `parentSpanId` set to the given parent
2. Calls `traceStore.startTrace(childSpan)`
3. Executes the callback
4. Calls `traceStore.endTrace(childSpan)` on completion

### 5.5 Span Trigger Points in AMP

| Event | Action |
|-------|--------|
| `user:message-queue:dequeue` | `startAgentSpan(messageId)` |
| `inference:completed` + `stopReason === "tool_use"` | `createTracer(agentSpan).startActiveSpan("tools")` |
| `inference:completed` + `stopReason === "end_turn"` | `stopAgentSpan()` |
| `cancelled` | `stopAgentSpan()` |
| `assistant:message` + `stopReason === "tool_use"` | `createTracer(agentSpan).startActiveSpan("tools")` |

### 5.6 Turn Timing in AMP

```javascript
_turnStartTime = new BehaviorSubject(undefined);
_turnElapsedMs = new BehaviorSubject(undefined);

// On user message dequeue:
this._turnStartTime.next(Date.now());

// On inference:completed + end_turn:
let elapsed = Date.now() - this._turnStartTime.getValue();
this._turnElapsedMs.next(elapsed);
assistantMessage.turnElapsedMs = elapsed;
```

### 5.7 Usage Schema (from 20_thread_management.js)

```javascript
{
  model: z.string().optional(),
  maxInputTokens: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheCreationInputTokens: z.number().nullable(),
  cacheReadInputTokens: z.number().nullable(),
  totalInputTokens: z.number(),
  thinkingBudget: z.number().optional(),
  timestamp: z.string().optional()
}
```

---

## 6. Recommended Span Insertion Points

### 6.1 Span Architecture for flitter-cli

```
TraceStore (new module)
  │
  ├─ startSpan(name, parentSpanId?, attributes?) → SpanHandle
  ├─ addSpanEvent(spanId, name, attributes?)
  ├─ setSpanAttributes(spanId, attributes)
  ├─ endSpan(spanId, status?)
  │
  └─ All operations emit to logger.ts writeEntry() with kind: "span"
```

### 6.2 Concrete Insertion Points

#### A. Agent Span — `submitPrompt()` in prompt-controller.ts

```
line 183: const agentSpan = traceStore.startSpan("agent", null, { threadId, messageText })
line 208: traceStore.endSpan(agentSpan, status)
```

**Complexity: Low.** Single entry/exit point. Status is determined by `_session.lifecycle` in the finally block.

#### B. Prompt-Assembly Span — `_buildMessages()` in prompt-controller.ts

```
line 234 (before call): const paSpan = traceStore.startSpan("prompt-assembly", agentSpanId)
line 234 (after call): traceStore.endSpan(paSpan, "ok", { messageCount, systemPromptSize, toolDefCount })
```

**Complexity: Low.** Pure function, no async.

#### C. Inference Span — `_streamResponse()` in prompt-controller.ts

```
line 388 (loop entry): const infSpan = traceStore.startSpan("inference", agentSpanId, { model, provider, attempt })
line 402 (hasBegunStreaming transition): traceStore.addSpanEvent(infSpan, "first-token", { ttft })
line 421 (message_complete): traceStore.setSpanAttributes(infSpan, { stopReason, tokens... })
line 460 (return): traceStore.endSpan(infSpan, "ok")
line 448 (error dispatch): traceStore.endSpan(infSpan, "error", { errorMsg })
```

**Complexity: Medium.** The retry loop creates multiple attempts; each attempt should be a separate span or the span should record retry count. The `usage_update` event (dispatched via `_dispatchEvent`) happens at line 699 — need to route usage data back to the inference span.

#### D. Tools Container Span — `_executeToolCalls()` in prompt-controller.ts

```
line 255 (before call): const toolsSpan = traceStore.startSpan("tools", agentSpanId, { toolCount })
line 260 (after call): traceStore.endSpan(toolsSpan)
```

**Complexity: Low.**

#### E. Individual Tool Spans — Inside `_executeToolCalls()` loop

```
line 530 (before execute): const toolSpan = traceStore.startSpan(`tool:${call.name}`, toolsSpanId, { toolName, inputSummary })
line 548 (success): traceStore.endSpan(toolSpan, "ok", { outputSize })
line 558 (catch): traceStore.endSpan(toolSpan, "error", { error })
line 516 (permission denied): traceStore.endSpan(toolSpan, "error", { error: "permission_denied" })
```

**Complexity: Medium.** Permission check (lines 513-527) is async and may result in a span with a long wait. Should we separate "permission" from "execution" as sub-spans? **Recommendation: No.** Keep it simple — the tool span includes permission time. Log a span event for the permission decision.

#### F. Structured Error Capture — All catch blocks

Every `catch` block in prompt-controller.ts should:
1. Enrich the existing `log.error()` call with active `traceId`/`spanId`
2. Emit a separate `kind: "error"` NDJSON entry with stack trace

### 6.3 Cross-Cutting Concerns

**Thread ID:** Available from `this._session.metadata` (if present) or via `_logContext`. Should be set as a span attribute on the root agent span.

**Agentic Loop Iteration:** The `iteration` counter (line 228) should be an attribute on each inference span to distinguish loop rounds.

**Queue Mode Dequeue:** When auto-dequeue triggers a new loop iteration (line 289), the agent span for the new message should be a new root span (new traceId), not a child of the previous interaction.

---

## 7. Risk Areas and Complexity Estimates

### 7.1 Risk Matrix

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Logger I/O bottleneck from span volume | Medium | Low | Spans are small JSON objects; same write path as existing logs |
| Span context cross-contamination in queue mode | High | Low | Use explicit span attributes, not global `_logContext` for traceId |
| Frame-overrun bridging requires flitter-core changes | Medium | Medium | Use `setPipelineLogSink()` to parse existing frame logs; no core changes needed |
| `_streamResponse` retry loop complicates inference span | Low | High | One span per `_streamResponse` call; record retryAttempt as attribute |
| `crypto.randomUUID()` performance | Low | Low | Bun's built-in is fast; ~100 calls/interaction maximum |
| Usage data flows through `_dispatchEvent()` not through `_streamResponse` return | Medium | High | Need to capture usage_update in `_streamResponse` before dispatching, or use a shared ref |

### 7.2 Complexity Estimates

| Component | New Lines (est.) | Complexity | Risk |
|-----------|-----------------|------------|------|
| **TraceStore module** (new) | ~120 | Low | Low — pure data structure, no side effects beyond NDJSON write |
| **Logger extension** (writeEntry) | ~20 | Low | Low — adds one function, no existing API changes |
| **prompt-controller instrumentation** | ~80 | Medium | Medium — touches the hot path; must not break existing error handling |
| **pi-ai-provider TTFT/latency** | ~15 | Low | Low — add 2 `performance.now()` calls |
| **UsageInfo type enrichment** | ~10 | Low | Low — add cacheRead/cacheWrite fields |
| **Frame pipeline bridge** | ~40 | Medium | Medium — depends on setPipelineLogSink parsing accuracy |
| **Structured error enhancement** | ~30 | Low | Low — wrap existing log.error calls |
| **Tests** | ~200 | Medium | Low — mostly unit tests for TraceStore and span lifecycle |
| **Total** | ~515 | | |

### 7.3 Dependencies

- **No flitter-core changes required.** All bridge points use already-exported APIs (`setPipelineLogSink`).
- **No new npm dependencies.** Uses `crypto.randomUUID()` (Bun built-in).
- **No breaking changes.** All new code is additive; existing `log.*()` API unchanged.

---

## 8. Findings Summary

### What do I need to know to PLAN this phase well?

1. **prompt-controller.ts is the primary instrumentation target.** It has 6 distinct phases (guard, prompt-assembly, inference, tool-execution, queue-dequeue, compaction) with clear entry/exit points. All spans nest under a root "agent" span per user interaction.

2. **logger.ts needs minimal extension.** Add a `writeEntry()` function for raw NDJSON and a `kind` field discriminator. The existing `buildJsonEntry()` helper and `logStream` infrastructure handle all I/O. No new file paths or retention logic needed.

3. **pi-ai-provider.ts has usage data available but not fully extracted.** `cacheRead`, `cacheWrite`, and per-component cost data exist in pi-ai's `Usage` type but are not propagated to `UsageInfo`. The inference span should capture the full set.

4. **TTFT is easy to measure.** The `hasBegunStreaming` flag transition in `_streamResponse()` is the exact semantic boundary. Add a `performance.now()` timestamp before the stream loop and compute delta when `hasBegunStreaming` goes true.

5. **FrameStats diagnostic class is unused in flitter-cli.** The bridge needs `setPipelineLogSink()` (already exported) to intercept frame timing logs. No direct FrameStats ring-buffer integration is needed for Phase 38 — the pipeline log sink captures the same data as formatted text.

6. **AMP's tracing architecture is simple.** TraceStore has 4 operations (start/event/attributes/end). Spans have a parent-child hierarchy via `parentSpanId`. The `createTracer(parentSpan)` pattern creates child spans scoped to a parent. flitter-cli's equivalent is even simpler because we emit to NDJSON, not thread deltas.

7. **The biggest design decision is span lifecycle for the retry loop.** When `_streamResponse()` retries, should each attempt be a separate span or one span with retry count? **Recommendation:** One "inference" span per `_streamResponse()` call, with `attempt` attribute. If retried, the span duration includes all attempts and the final attempt's data.

8. **No flitter-core changes are needed.** All bridge points use existing public APIs. This keeps the change scope entirely within `flitter-cli` plus minimal type additions.

9. **Estimated scope: ~515 new lines across 3-4 plans.** Primary risk is the prompt-controller instrumentation touching the hot path; careful error handling is needed to ensure tracing failures never break the agentic loop.

---

*Research completed: 2026-04-08*
*Files analyzed: 12 source files + 4 AMP reverse-engineered source files*
