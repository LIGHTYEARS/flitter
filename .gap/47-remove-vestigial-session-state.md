# S01: Dual ConversationState and SessionState Implementation

## Problem

Two overlapping session state classes exist in `packages/flitter-amp/src/`:

- **`acp/session.ts`** -- exports `SessionState`
- **`state/conversation.ts`** -- exports `ConversationState`

Both classes manage the same set of concerns: an ordered list of conversation
items (`items: ConversationItem[]`), a plan (`plan: PlanEntry[]`), usage tracking
(`usage: UsageInfo | null`), a processing flag (`isProcessing`), and streaming
assistant message assembly. They import the same types from `acp/types.ts`. Their
method signatures are nearly identical: `addUserMessage`, `appendAssistantChunk`,
`finalizeAssistantMessage`, `addToolCall`, `updateToolCall`, `setPlan`,
`setUsage`.

`SessionState` is **completely dead code**. It is never imported, never
instantiated, and never referenced by any other module in the codebase. A
project-wide grep for `SessionState` returns exactly one hit: its own class
declaration at `acp/session.ts:11`. There are no barrel exports, no test files,
and no dynamic `require()` calls that reference it.

`ConversationState` is the **sole active implementation**. It is imported by
`state/app-state.ts` and instantiated as `AppState.conversation`. All ACP event
processing in `AppState.onSessionUpdate()` and `AppState.onPromptComplete()`
delegates to `ConversationState` methods. The entire TUI rendering pipeline reads
from `AppState.conversation`.

The two classes diverged during development: `ConversationState` gained several
capabilities that `SessionState` never received, making the older class not just
dead but also **functionally incomplete** relative to the live code.

## Detailed Divergence Analysis

### Feature comparison

| Capability | `SessionState` | `ConversationState` |
|-----------|---------------|---------------------|
| `items: ConversationItem[]` | Yes | Yes |
| `plan: PlanEntry[]` | Yes | Yes |
| `usage: UsageInfo` | Yes | Yes |
| `isProcessing` | Yes | Yes |
| `addUserMessage(text)` | Yes | Yes |
| `appendAssistantChunk(text)` | Yes | Yes |
| `startAssistantMessage()` | Yes (public, returns `AssistantMessage`) | Inlined into `appendAssistantChunk` (private) |
| `finalizeAssistantMessage()` | Yes | Yes |
| `addToolCall(...)` | Yes | Yes |
| `updateToolCall(...)` | Yes (no `rawOutput` param) | Yes (accepts `rawOutput`) |
| `setPlan(entries)` | Yes | Yes |
| `setUsage(usage)` | Yes | Yes |
| **Thinking support** | **No** | **Yes** (`appendThinkingChunk`, `finalizeThinking`, `_streamingThinking`) |
| **Tool expand toggle** | **No** | **Yes** (`toolCallsExpanded`, `toggleToolCalls()`) |
| **`clear()` method** | **No** | **Yes** |
| **`id` / `cwd` fields** | **Yes** (`readonly id`, `readonly cwd`) | **No** (session identity lives in `AppState`) |
| **`currentMode` field** | **Yes** | **No** (lives in `AppState`) |

### Structural differences in shared methods

Even where both classes implement the same method name, the implementations
differ in subtle ways:

**`appendAssistantChunk`**: `SessionState` delegates to a public
`startAssistantMessage()` that returns the `AssistantMessage` object.
`ConversationState` creates the message inline within `appendAssistantChunk`,
keeping the creation logic private. The `ConversationState` approach is simpler
since no external caller needs a reference to the in-progress message object.

**`addToolCall`**: `SessionState` hard-codes `collapsed: true` on every new tool
call. `ConversationState` respects the `toolCallsExpanded` toggle:
`collapsed: !this.toolCallsExpanded`. This is the only implementation that
correctly handles the Alt+T global toggle behavior.

**`updateToolCall`**: `SessionState` accepts an optional `content` parameter
typed as `ToolCallItem['result']` and assigns it directly. `ConversationState`
accepts separate `content` and `rawOutput` parameters and constructs the
`ToolCallResult` object from them. The `ConversationState` signature matches what
`AppState.onSessionUpdate()` actually passes in the `tool_call_update` case.

### Dead fields in `SessionState`

`SessionState` carries two fields that `ConversationState` does not:

- `readonly id: string` -- The ACP session ID. In the active architecture, this
  is stored as `AppState.sessionId` (set by `AppState.setConnected()`). There is
  no reason for the conversation item collection to know the session ID.

- `readonly cwd: string` -- The working directory. Also stored on `AppState` and
  passed to the TUI's status bar. The conversation item list does not need it.

- `currentMode: string | null` -- The agent mode. Already managed by
  `AppState.currentMode`, updated from the `current_mode_update` session event.

These fields suggest `SessionState` was an early attempt to bundle session
identity with conversation state, before the design settled on a clear separation
of concerns: `AppState` holds session-level metadata, `ConversationState` holds
the message list and streaming state.

## Impact of the Dead Code

1. **Confusion for contributors** -- A developer encountering both classes must
   determine which is canonical. The names (`SessionState` vs.
   `ConversationState`) suggest they might serve different purposes, but they do
   not. The `acp/session.ts` header comment ("Session state management -- tracks
   messages, tool calls, plan, usage per session") describes exactly what
   `ConversationState` does.

2. **Drift risk** -- If a future contributor adds a feature to `SessionState`
   thinking it is live, the change has no effect and the bug is invisible. If
   they modify `ConversationState` but notice `SessionState` and try to keep it
   in sync, they waste effort maintaining dead code.

3. **Incomplete type coverage** -- `SessionState.updateToolCall` uses
   `ToolCallItem['result']` as the content type, which does not match the actual
   ACP event structure (`content` + `rawOutput` as separate fields). If anyone
   tried to wire it up, they would encounter a type mismatch.

4. **Missing capabilities** -- `SessionState` has no thinking support and no
   `clear()` method. Any attempt to use it as a drop-in replacement for
   `ConversationState` would fail at runtime when the agent emits
   `agent_thought_chunk` events or when the user triggers a conversation reset.

## Proposed Solution

### Step 1: Delete `acp/session.ts`

Remove the entire file. Since no module imports or references `SessionState`,
this is a zero-impact deletion.

```bash
rm packages/flitter-amp/src/acp/session.ts
```

Verification command:

```bash
# Confirm no imports or references exist anywhere in the monorepo
grep -r "SessionState" packages/flitter-amp/src/
grep -r "session\.ts" packages/flitter-amp/src/ --include="*.ts"
grep -r "from.*acp/session" packages/flitter-amp/src/
```

All three greps should return zero results after deletion (the first will match
only the file itself before deletion, and nothing after).

### Step 2: Audit `acp/` directory exports

Confirm that `acp/session.ts` is not re-exported from any barrel file. The
codebase currently has no `acp/index.ts` barrel, so there is nothing to update.
If a barrel is added in the future, `SessionState` should not be included since
it no longer exists.

### Step 3: Add a header comment to `ConversationState` clarifying it is the single source of truth

Update the doc comment in `state/conversation.ts` to explicitly state its role
and prevent future duplication:

```typescript
// state/conversation.ts

/**
 * ConversationState is the single source of truth for the ordered list of
 * conversation items, streaming state, and usage tracking within a session.
 *
 * This class is owned by AppState and should not be duplicated. Session-level
 * metadata (session ID, working directory, agent mode) belongs on AppState,
 * not here. This class is concerned only with the message/tool-call/plan
 * item list and the mechanics of streaming assembly.
 *
 * Previously, a parallel SessionState class existed in acp/session.ts. It was
 * removed in gap S01 because it was vestigial dead code that lacked thinking
 * support, the tool-call expand toggle, the clear() method, and the correct
 * updateToolCall signature. See .gap/47-remove-vestigial-session-state.md.
 */
export class ConversationState {
  // ... existing implementation unchanged
```

### Step 4: Consider extracting a conversation state interface (optional, future)

If the project grows to support multiple frontends (e.g., a web UI alongside the
TUI), it may be valuable to extract an `IConversationState` interface from
`ConversationState`. This would allow different implementations to exist
legitimately, unlike the current situation where two concrete classes overlap by
accident. This step is **not required** for the immediate cleanup but is noted as
a future direction that would prevent the same pattern from recurring.

```typescript
// Hypothetical future interface (not part of this PR)
export interface IConversationState {
  readonly items: ReadonlyArray<ConversationItem>;
  readonly plan: ReadonlyArray<PlanEntry>;
  readonly usage: UsageInfo | null;
  readonly isProcessing: boolean;

  addUserMessage(text: string): void;
  appendAssistantChunk(text: string): void;
  finalizeAssistantMessage(): void;
  appendThinkingChunk(text: string): void;
  finalizeThinking(): void;
  addToolCall(
    toolCallId: string,
    title: string,
    kind: string,
    status: ToolCallItem['status'],
    locations?: Array<{ path: string }>,
    rawInput?: Record<string, unknown>,
  ): void;
  updateToolCall(
    toolCallId: string,
    status: 'completed' | 'failed',
    content?: Array<{ type: string; content?: { type: string; text: string } }>,
    rawOutput?: Record<string, unknown>,
  ): void;
  setPlan(entries: PlanEntry[]): void;
  setUsage(usage: UsageInfo): void;
  clear(): void;
}
```

This is only warranted if a second implementation is actually needed. Until then,
the concrete class is sufficient and simpler.

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `src/acp/session.ts` | **Delete** | -114 lines |
| `src/state/conversation.ts` | Update doc comment | +10 lines (net) |
| **Total** | | **-104 lines net** |

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Something dynamically imports `SessionState` at runtime | **None** -- grep confirms zero references | Pre-deletion grep across entire monorepo |
| Test file references `SessionState` | **None** -- no test file exists for `acp/session.ts` | `grep -r SessionState packages/` returns only the class definition |
| Future feature needs `SessionState`'s `id`/`cwd` fields | **None** -- these already live on `AppState` | `AppState.sessionId` and `AppState.cwd` are the canonical locations |
| Build breaks | **None** -- removing an unreferenced export cannot break compilation | TypeScript will report zero errors since no import site exists |

## Verification Checklist

After applying the changes:

1. `grep -r "SessionState" packages/flitter-amp/` returns no results.
2. `grep -r "acp/session" packages/flitter-amp/` returns no results.
3. TypeScript compilation succeeds: `cd packages/flitter-amp && npx tsc --noEmit`.
4. All existing tests pass (no test depended on `SessionState`).
5. The TUI starts and processes a prompt end-to-end (manual smoke test):
   streaming text, tool calls, thinking blocks, plan display, and usage tracking
   all function identically since the only active code path (`ConversationState`)
   is untouched.
6. The `ConversationState` doc comment references this gap document, providing
   traceability for anyone who later wonders why only one state class exists.

## Relationship to Other Gaps

- **Gap 33 (`session-id-display`)**: Displays `AppState.sessionId` in the status
  bar. Unaffected by this change since the session ID was never sourced from
  `SessionState`.

- **Gap 45 (`shared-output-extraction`)** and **Gap 46 (`truncation-consistency`)**:
  Both operate on tool-call rendering, not on the state layer. No interaction
  with this cleanup.

## Summary

`SessionState` in `acp/session.ts` is vestigial dead code: zero importers, zero
test coverage, missing thinking support, missing `clear()`, incorrect
`updateToolCall` signature, and structural assumptions (bundling session identity
with conversation items) that the architecture has since rejected. The active
implementation is `ConversationState` in `state/conversation.ts`, exclusively
used through `AppState.conversation`. The fix is straightforward: delete the dead
file and annotate the live class to prevent recurrence. Net result is 104 fewer
lines of code and one fewer source of contributor confusion.
