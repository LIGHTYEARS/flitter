# Analysis 14: Conversation Model and Message Management

## File Locations

- **Primary file**: `/home/gem/workspace/flitter/packages/flitter-amp/src/state/conversation.ts`
- **Type definitions**: `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/types.ts`
- **Integration point (AppState)**: `/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts`
- **Parallel implementation (SessionState)**: `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/session.ts`

## Overview

`ConversationState` is the central class that manages the ordered list of conversation items and tracks the current streaming state. It acts as a mutable in-memory store that AppState delegates to for all conversation-level operations. There is also a parallel `SessionState` class in the ACP layer (`session.ts`) with a nearly identical API, suggesting the design evolved or that SessionState serves as a per-session mirror.

## The `items` Array

The conversation is stored as a flat, heterogeneous `ConversationItem[]` array. The union type covers five variants:

| Type | Interface | Purpose |
|------|-----------|---------|
| `user_message` | `UserMessage` | User-submitted prompt text with timestamp |
| `assistant_message` | `AssistantMessage` | Agent response text, with `isStreaming` flag |
| `tool_call` | `ToolCallItem` | Individual tool invocation with status lifecycle |
| `thinking` | `ThinkingItem` | Extended thinking / chain-of-thought content |
| `plan` | `PlanItem` | Ordered plan entries with priority and status |

Items are appended strictly in chronological order. The array is the single source of truth consumed by the rendering layer (ChatView). There is no separate model for message threads or grouping -- everything is a flat list.

## Streaming Architecture: Private Cursors

Two private fields act as "cursors" into the items array during active streaming:

```typescript
private _streamingMessage: AssistantMessage | null = null;
private _streamingThinking: ThinkingItem | null = null;
```

These references point to the currently-being-built item in the `items` array. This is a mutable-reference pattern: the item is pushed into `items` once on creation, and subsequent chunk appends mutate the same object in place (via `item.text += text`). This means the rendering layer sees the item from the first chunk onward, and its text grows incrementally as more chunks arrive.

## Method-by-Method Analysis

### `addUserMessage(text: string)`

Creates a `UserMessage` with the current timestamp and pushes it to `items`. This is a one-shot operation -- user messages are never streamed. Called by `AppState.startProcessing()` which also sets `isProcessing = true` and notifies listeners.

### `appendAssistantChunk(text: string)`

This is the hot path for streaming. On the first call, it lazily creates a new `AssistantMessage` with `isStreaming: true`, empty text, and a timestamp, pushes it into `items`, and stores the reference in `_streamingMessage`. On all subsequent calls, it simply concatenates the text chunk onto the existing message's `text` field. This lazy-init pattern means no assistant message item exists until actual content arrives.

In `SessionState`, this pattern is slightly refactored: the lazy init calls a separate `startAssistantMessage()` method that returns the created item. The conversation.ts version inlines this logic.

### `finalizeAssistantMessage()`

Sets `isStreaming = false` on the current streaming message and nulls out `_streamingMessage`. After this call, the message is considered complete and no further chunks will be appended to it. This is called in three places:
1. **`onPromptComplete`** -- normal completion at the end of a turn.
2. **`handleError`** -- error recovery, so partial messages are finalized rather than left dangling.
3. **`addToolCall`** -- critically, when a tool call begins, any in-progress assistant message is finalized first. This ensures tool call items appear as discrete entries after the text that preceded them.

### `appendThinkingChunk(text: string)` and `finalizeThinking()`

These mirror the assistant message streaming pattern exactly, but for "thinking" / chain-of-thought content. The `ThinkingItem` also carries `isStreaming: boolean` and an additional `collapsed: true` default, meaning thinking blocks render collapsed in the UI by default. Like the assistant cursor, `_streamingThinking` tracks the in-flight thinking item. `finalizeThinking()` sets `isStreaming = false` and nulls the cursor.

Note that thinking items exist only in `ConversationState` -- the `SessionState` class in session.ts does not have thinking support, suggesting this was added later.

### `addToolCall(toolCallId, title, kind, status, locations?, rawInput?)`

Adds a `ToolCallItem` to the items array. Before doing so, it calls `finalizeAssistantMessage()` to close any streaming text. This is a key design choice: tool calls interrupt assistant text, ensuring the conversation renders as "text block, then tool call, then more text" rather than interleaving.

The `collapsed` property is set based on `this.toolCallsExpanded` (an Alt+T toggle), so newly added tool calls respect the user's current preference.

The `status` field starts as whatever the ACP protocol provides (typically `'pending'` or `'in_progress'`), and `locations` optionally carries file paths associated with the tool call (e.g., for file edit tools).

### `updateToolCall(toolCallId, status, content?, rawOutput?)`

Finds an existing tool call in the items array by `toolCallId` using a linear scan with a type guard. Updates its `status` to `'completed'` or `'failed'` and attaches the result object. The result contains structured content (an array of typed content blocks) and optional raw output.

The linear scan approach is O(n) in the number of items, but is adequate given conversation lengths. There is no index or Map for faster lookups.

### `setPlan(entries: PlanEntry[])`

Plan management uses an upsert pattern. It first searches for an existing `PlanItem` in the items array. If found, the entries are replaced in place. If not, a new plan item is pushed. The plan is also stored separately in `this.plan` for direct access outside the items array.

Each `PlanEntry` has `content`, `priority` (high/medium/low), and `status` (pending/in_progress/completed), mapping closely to a todo-list model.

### `toggleToolCalls()`

A UI-level toggle (bound to Alt+T) that flips `toolCallsExpanded` and updates the `collapsed` flag on every existing `ToolCallItem` in the array. This is a bulk mutation over all items.

### `setUsage(usage: UsageInfo)`

Stores token usage and cost info. `UsageInfo` tracks `size` (context window size), `used` (tokens consumed), and optional `cost` (amount + currency).

### `clear()`

Full reset: empties the items array, clears the plan and usage, nulls out both streaming cursors, and resets `isProcessing` to false. Used when starting a new conversation or session.

## The `isStreaming` Flag Lifecycle

The `isStreaming` boolean on `AssistantMessage` and `ThinkingItem` follows a strict lifecycle:

1. **Created as `true`** -- when the first chunk arrives and the item is instantiated.
2. **Stays `true`** -- throughout all `appendAssistantChunk` / `appendThinkingChunk` calls. The rendering layer uses this to show a streaming indicator (cursor, animation, etc.).
3. **Set to `false`** -- by `finalizeAssistantMessage()` / `finalizeThinking()`. This happens on prompt completion, error, or tool call interruption.

The separate `isProcessing` flag on `ConversationState` tracks whether the entire turn is in progress, while `isStreaming` is per-item granularity. A turn can have `isProcessing = true` even when no message is currently streaming (e.g., during tool execution between text segments).

## Integration with AppState

`AppState` owns a single `ConversationState` instance and implements the `ClientCallbacks` interface. ACP session update events are dispatched in `onSessionUpdate()`:

| ACP Event | ConversationState Method |
|-----------|-------------------------|
| `agent_message_chunk` | `appendAssistantChunk(text)` |
| `agent_thought_chunk` | `appendThinkingChunk(text)` |
| `tool_call` | `addToolCall(...)` |
| `tool_call_update` | `updateToolCall(...)` |
| `plan` | `setPlan(entries)` |
| `usage_update` | `setUsage(usage)` |

After every event, `AppState.notifyListeners()` is called to trigger UI re-renders. The `onPromptComplete()` callback finalizes both streaming cursors and sets `isProcessing = false`. Error handling (`handleError`) follows the same finalization sequence, ensuring no streaming items are left in a dangling state.

## Key Design Observations

1. **Mutable reference pattern**: Streaming items are mutated in place within the items array. This avoids array replacement on every chunk (which would be expensive) but means the rendering layer must detect text changes on the same object reference.
2. **Flat item list**: No message grouping or threading -- the array order is the conversation order.
3. **Tool calls interrupt text**: `addToolCall` always finalizes the current streaming message, enforcing a clean separation between text and tool invocations.
4. **Dual implementation**: `ConversationState` and `SessionState` share almost identical logic, with ConversationState adding thinking support and the tool collapse toggle. This suggests an evolutionary codebase where the state layer was duplicated for different contexts.
5. **No immutability**: The entire model is mutable classes with direct property assignment, not immutable records or signals. State change notification is handled by the explicit listener pattern in AppState.
