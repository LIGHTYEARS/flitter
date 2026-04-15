---
phase: 1
plan: 04
status: complete
---

# Thread 持久化 — Summary

## One-Liner
Defined the complete Thread persistence and DTW state management type system as Zod schemas, covering thread snapshots, 9 content block types, 28 conversation delta event types, connection/compaction states, and thread summaries.

## What Was Built
- `ThreadSnapshotSchema` root persistence format with id, version, messages, queued messages, relationships, meta, and environment
- `ThreadMessageSchema` discriminated union on `role`: `UserThreadMessage`, `AssistantThreadMessage`, `InfoThreadMessage`
- `ThreadContentBlockSchema` union covering 9 block types: text, tool_use, tool_result, thinking, redacted_thinking, summary, manual_bash_invocation, server_tool_use, image
- `AssistantMessageStateSchema` discriminated union: streaming, complete (end_turn/tool_use), cancelled
- `GuidanceFileRefSchema` with uri, lineCount (int, nonneg), and optional content
- `ThreadRelationshipSchema` with handoff type and optional messageIndex/blockIndex/comment
- `QueuedMessageEntrySchema` with id, interrupt flag, and queued user message
- `ThreadMetaSchema`, `ThreadEnvironmentSchema` (with nested initial.trees.repository structure)
- `ConnectionStateSchema` enum (5 states), `ConnectionInfoSchema` with role and reconnect cause
- `CompactionStateSchema` enum (idle/compacting), `ConnectionModeSchema` enum (observer/executor+observer)
- `ThreadSummarySchema` for thread index with description, diffStats, archived flag
- `ConversationDeltaSchema` discriminated union with 28 event type variants covering user messages, queue operations, tool data, assistant messages, inference, navigation, tracing, and more
- `ReconnectCauseSchema` with type, timestamp, optional code/reason/error

## Key Decisions
- Thread content blocks use `z.union` (not discriminatedUnion) because tool_result block lacks a globally unique type discriminant pattern within the union context
- `AssistantMessageStateSchema` only includes `end_turn` and `tool_use` as stop reasons (not `max_tokens`), matching the thread persistence format which differs from the live message format
- `GuidanceFileRef.lineCount` validated as non-negative integer using `.int().nonnegative()`
- `ThreadEnvironmentSchema.trees` uses `z.array(z.unknown())` since tree entries are provider-specific
- ConversationDelta event payloads use relaxed types (`z.record`/`z.unknown`) where the delta carries partial or opaque data
- Imports `ToolRunSchema` and `UsageSchema` from messages.ts for cross-module type reuse

## Test Coverage
84 test cases across 18 describe blocks covering:
- GuidanceFileRef with/without content, negative lineCount rejection, non-integer rejection
- ThreadRelationship full and minimal, wrong type literal rejection
- ThreadMeta and ThreadEnvironment with nested repository info, missing platform rejection
- All 9 ThreadContentBlock type variants plus unknown type rejection
- UserThreadMessage full (with discoveredGuidanceFiles, parentToolUseId) and minimal
- AssistantThreadMessage with all 3 state variants, usage, cancelled flag, invalid stopReason rejection
- InfoThreadMessage with optional dtwMessageID and parentToolUseId
- ThreadMessage discriminated union for all 3 roles plus unknown role rejection
- QueuedMessageEntry with interrupt flag, missing interrupt rejection
- ThreadSnapshot full (messages, queue, relationships, meta, env) and minimal
- All 5 ConnectionState values plus invalid state rejection
- ConnectionInfo with reconnect cause, minimal, observer role
- CompactionState and ConnectionMode enums
- ThreadSummary full and minimal
- 22 ConversationDelta variants tested (cancelled, user:message, interrupt, append-content, enqueue/dequeue/discard, assistant:message, message-update, inference:completed, title, truncate, relationship, draft, agent-mode, environment, trace:start/end, tool:data, info:manual-bash-invocation, setPendingNavigation, clearPendingNavigation)
- 7 negative tests rejecting invalid roles, delta types, missing state/id/v, invalid role enum, missing ReconnectCause fields
- JSON Schema conversion for ThreadSnapshotSchema, ConnectionStateSchema, ConversationDeltaSchema

## Artifacts
- `packages/schemas/src/thread.ts`
- `packages/schemas/src/thread.test.ts`
- `packages/schemas/src/index.ts` (re-exports `./thread`)
