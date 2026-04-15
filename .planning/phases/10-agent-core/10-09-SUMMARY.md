---
phase: 10
plan: 09
status: complete
---

# ThreadWorker State Machine — Summary

## One-Liner
Implemented the ThreadWorker agent state machine that drives the full inference loop (compaction check, system prompt build, LLM streaming, tool execution, recursive re-inference) with idle/running/cancelled state transitions and a discriminated-union AgentEvent stream.

## What Was Built
- `InferenceState` type: `"idle" | "running" | "cancelled"`
- `AgentEvent` discriminated union with 10 event types: inference:start, inference:delta, inference:complete, inference:error, tool:start, tool:data, tool:complete, turn:complete, compaction:start, compaction:complete
- Event interfaces with appropriate payloads (StreamDelta for delta, usage for complete, Error for error, toolUseId/toolName for tool events, ToolResult for tool:data)
- `ThreadWorkerOptions` callback-based DI interface: getThreadSnapshot, updateThreadSnapshot, getMessages, provider (LLMProvider), toolOrchestrator, buildSystemPrompt, checkAndCompact, getConfig, toolRegistry
- `ThreadWorker` class:
  - `inferenceState$` BehaviorSubject (initial "idle"), `events$` Subject
  - `runInference()`: full loop — set running, check compaction, build prompt, get tool defs, construct StreamParams, iterate provider.stream(), update assistant content, emit deltas, check tool_use blocks, recurse or emit turn:complete
  - `cancelInference()`: abort controller + cancel all tools + set cancelled
  - `retry()`: cancelled -> idle -> runInference
  - `userProvideInput` / `userRespondToApproval`: placeholder stubs for future approval flow
  - `dispose()`: abort, dispose orchestrator, unsubscribe all
  - Private helpers: `checkCompaction`, `updateAssistantContent` (accumulate mode), `extractToolUses` (scan last assistant message for tool_use blocks)
- `ToolApprovalResponse` interface (approved, remember)

## Key Decisions
- Callback-based DI for all dependencies (no direct service imports) — consistent with context-blocks.ts pattern
- Recursive `runInference()` for multi-turn tool use: after ToolOrchestrator completes, calls itself again
- `updateAssistantContent` either updates the last assistant message or appends a new one based on current thread state
- `extractToolUses` scans content blocks for `type: "tool_use"` in the last assistant message
- Error handling catches all exceptions, transitions to idle, and emits inference:error
- `userProvideInput` and `userRespondToApproval` are placeholder stubs (noted in code comments)

## Test Coverage
30 tests in `thread-worker.test.ts` covering: constructor (initial idle state, events$ observable), runInference (state transitions, inference:start/delta/complete events, turn:complete on no tools, tool_use triggers orchestrator, recursive inference, compaction events, error handling), cancelInference (abort controller, cancelled state, tool cancellation), retry (cancelled to idle transition, re-runs inference), dispose (abort, orchestrator dispose, subscription cleanup, post-dispose runInference no-op), extractToolUses (tool_use block extraction, no tools returns empty).

## Artifacts
- `packages/agent-core/src/worker/events.ts`
- `packages/agent-core/src/worker/thread-worker.ts`
- `packages/agent-core/src/worker/thread-worker.test.ts`
