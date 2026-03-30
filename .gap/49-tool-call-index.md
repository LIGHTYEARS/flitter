# Gap S03 (#49): Linear O(n) Scan for `updateToolCall` -- Add Map Index for O(1) Lookup

## Problem Statement

`ConversationState.updateToolCall()` in
`packages/flitter-amp/src/state/conversation.ts` (lines 98-111) performs a linear
`Array.prototype.find()` over the entire heterogeneous `items` array every time an
ACP `tool_call_update` event arrives:

```typescript
// packages/flitter-amp/src/state/conversation.ts, lines 98-111 (current)
updateToolCall(
  toolCallId: string,
  status: 'completed' | 'failed',
  content?: Array<{ type: string; content?: { type: string; text: string } }>,
  rawOutput?: Record<string, unknown>,
): void {
  const item = this.items.find(
    (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
  );
  if (item) {
    item.status = status;
    item.result = { status, content, rawOutput };
  }
}
```

The `items` array is a union-typed list containing `UserMessage`,
`AssistantMessage`, `ThinkingItem`, `PlanItem`, and `ToolCallItem` entries. The
`.find()` call must visit every element, performing a discriminated-union type
check (`type === 'tool_call'`) followed by a string comparison on `toolCallId`,
to locate the target item.

### Duplicate in `SessionState`

The identical pattern is present in `SessionState.updateToolCall()` in
`packages/flitter-amp/src/acp/session.ts` (lines 86-98):

```typescript
// acp/session.ts, lines 86-98 (current)
updateToolCall(
  toolCallId: string,
  status: 'completed' | 'failed',
  content?: ToolCallItem['result'],
): void {
  const item = this.items.find(
    (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
  );
  if (item) {
    item.status = status;
    if (content) item.result = content;
  }
}
```

Note: Gap #47 proposes removing `SessionState` entirely as vestigial dead code.
If that lands first, only `ConversationState` needs the fix. This document covers
both classes.

---

## Why It Matters

### Quantitative Cost Analysis

During a typical agentic conversation with Claude, the assistant may invoke
50-200+ tool calls (file reads, greps, edits, bash commands, writes). Each tool
call generates two ACP events:

1. `tool_call` -- handled by `addToolCall()` (O(1) push, no scan needed)
2. `tool_call_update` -- handled by `updateToolCall()` (O(n) scan today)

Between those tool calls, the `items` array accumulates interleaved entries:

| Item type          | Typical count per conversation |
|--------------------|-------------------------------|
| `UserMessage`      | 1-5                           |
| `AssistantMessage` | 5-20 (one per streaming chunk group) |
| `ThinkingItem`     | 5-20                          |
| `ToolCallItem`     | 50-200+                       |
| `PlanItem`         | 0-1                           |
| **Total `items`**  | **60-250+**                   |

For each of the t tool calls, `updateToolCall` scans up to n items where n is
the current array length. Since items are appended in chronological order, the
average scan length is n/2. The total work across a full conversation is:

```
Sum(i=1..t) of n_i  ~  t * n_avg  ~  t * (n_final / 2)
```

For a conversation with 200 tool calls and 300 total items:
- **Linear scan total**: 200 * 150 = **30,000 comparisons**
- **Map lookup total**: 200 * 1 = **200 lookups**

This is a 150x reduction in the number of operations. While individual
comparisons are cheap (string equality), the aggregate cost is wasteful and
grows quadratically with conversation length.

### Worst-Case Scenario

In agentic coding sessions where the assistant iterates heavily (e.g., running
tests, reading multiple files, performing search-replace cycles), tool call
counts can exceed 500. With assistant message chunks and thinking items
interleaved, the `items` array can reach 1,000+ entries. The linear scan at
that scale performs up to 500 * 500 = 250,000 comparison operations over the
session lifetime. The Map-indexed approach keeps this at exactly 500 lookups.

### Effect on Rendering Pipeline

Each `updateToolCall` call triggers `AppState.notifyListeners()` (via the
`onSessionUpdate` callback in `app-state.ts` line 150), which in turn triggers
a TUI rebuild. If the linear scan itself takes measurable time, it adds latency
between receiving the ACP event and starting the widget rebuild. With a Map
lookup, the state mutation is near-instantaneous.

---

## Current Code Walkthrough

### `addToolCall` (lines 77-96)

```typescript
addToolCall(
  toolCallId: string,
  title: string,
  kind: string,
  status: ToolCallItem['status'],
  locations?: Array<{ path: string }>,
  rawInput?: Record<string, unknown>,
): void {
  this.finalizeAssistantMessage();
  this.items.push({
    type: 'tool_call',
    toolCallId,
    title,
    kind,
    status,
    locations,
    rawInput,
    collapsed: !this.toolCallsExpanded,
  });
}
```

The object literal is constructed inline and pushed directly into `items`. No
reference is retained, so there is no way to look it up later without scanning
the array.

### `updateToolCall` (lines 98-111)

Already shown above. The `.find()` callback performs two checks per element:
1. Type discriminant: `i.type === 'tool_call'` (fast string compare)
2. ID match: `i.toolCallId === toolCallId` (only reached for tool call items)

Both checks are necessary because `items` is heterogeneous. The Map-based
approach eliminates both checks entirely.

### `clear` (lines 139-146)

```typescript
clear(): void {
  this.items = [];
  this.plan = [];
  this.usage = null;
  this._streamingMessage = null;
  this._streamingThinking = null;
  this.isProcessing = false;
}
```

Resets all state. Any index must also be cleared here to avoid stale references.

### `setPlan` (lines 113-124)

Note: `setPlan` has a similar `.find()` pattern for locating an existing plan
item. However, there is at most one plan item in the array, so indexing it would
be over-engineering. The plan lookup is O(n) but executes at most once per plan
update, which is far less frequent than tool call updates. Mentioned here for
completeness but explicitly out of scope.

---

## Proposed Solution

Introduce a private `Map<string, ToolCallItem>` field on `ConversationState`
that provides O(1) amortized lookup by `toolCallId`. The Map stores references
to the same objects that live in the `items` array, so mutations through one
path are visible through the other.

### Design Principles

1. **Zero public API change** -- The `_toolCallIndex` field is private. Method
   signatures for `addToolCall`, `updateToolCall`, and `clear` are unchanged.
   All callers (in `app-state.ts`, test harnesses, and snapshot tests) require
   zero modifications.

2. **Referential identity** -- JavaScript objects are reference types. Storing
   the same `ToolCallItem` in both `items[]` and `_toolCallIndex` means a
   mutation through `Map.get()` is visible when iterating `items` for rendering.
   No data duplication or synchronization is needed.

3. **Minimal memory overhead** -- The Map stores one pointer per tool call item,
   plus Map bookkeeping. For 200 tool calls, this is approximately 200 pointers
   (~1.6 KB on 64-bit) plus Map internal structures (~few KB). Negligible
   compared to the tool call items themselves, which contain string titles,
   raw input/output objects, and result payloads.

4. **No serialization impact** -- The Map is a runtime-only acceleration
   structure. It is not serialized or exposed in any protocol message.

---

## Implementation Details

### Step 1: Add the private index field

```typescript
// conversation.ts -- add after the existing private fields (line 24)
private _toolCallIndex: Map<string, ToolCallItem> = new Map();
```

The field is initialized eagerly with an empty Map so it is always safe to call
`.get()` or `.set()` without null checks.

### Step 2: Capture and index the item in `addToolCall`

```typescript
addToolCall(
  toolCallId: string,
  title: string,
  kind: string,
  status: ToolCallItem['status'],
  locations?: Array<{ path: string }>,
  rawInput?: Record<string, unknown>,
): void {
  this.finalizeAssistantMessage();
  const item: ToolCallItem = {
    type: 'tool_call',
    toolCallId,
    title,
    kind,
    status,
    locations,
    rawInput,
    collapsed: !this.toolCallsExpanded,
  };
  this.items.push(item);
  this._toolCallIndex.set(toolCallId, item);
}
```

Key change: The `ToolCallItem` object literal is now captured in a local
variable `item` so the same reference can be stored in both `items` and the
index. The `push` and `set` are adjacent synchronous statements, so there is
no window where the array contains an item that the index does not.

### Step 3: Rewrite `updateToolCall` to use the index

```typescript
updateToolCall(
  toolCallId: string,
  status: 'completed' | 'failed',
  content?: Array<{ type: string; content?: { type: string; text: string } }>,
  rawOutput?: Record<string, unknown>,
): void {
  const item = this._toolCallIndex.get(toolCallId);
  if (item) {
    item.status = status;
    item.result = { status, content, rawOutput };
  }
}
```

This replaces the O(n) `.find()` with a single `Map.get()` -- O(1) amortized.
The guard `if (item)` handles the case where `toolCallId` is unknown (same
behavior as the original `.find()` returning `undefined`).

### Step 4: Clear the index in `clear()`

```typescript
clear(): void {
  this.items = [];
  this.plan = [];
  this.usage = null;
  this._streamingMessage = null;
  this._streamingThinking = null;
  this.isProcessing = false;
  this._toolCallIndex.clear();
}
```

`Map.clear()` removes all entries in O(1) amortized time. This ensures that
after a conversation reset (e.g., user presses Ctrl+L), the index does not
hold stale references to items that no longer exist in the `items` array.

### Step 5: Apply the same change to `SessionState` (if retained)

`acp/session.ts` has its own `items` array and its own `addToolCall` /
`updateToolCall` pair. The identical `_toolCallIndex` field, insertion in
`addToolCall`, lookup in `updateToolCall` should be added. Note that
`SessionState` lacks a `clear()` method, but since the class has no callers
(see gap #47), adding one is unnecessary. If gap #47 (removing vestigial
`SessionState`) lands first, this step is moot.

---

## Full Unified Diff for `conversation.ts`

```diff
--- a/packages/flitter-amp/src/state/conversation.ts
+++ b/packages/flitter-amp/src/state/conversation.ts
@@ -16,6 +16,7 @@ export class ConversationState {

   private _streamingMessage: AssistantMessage | null = null;
   private _streamingThinking: ThinkingItem | null = null;
+  private _toolCallIndex: Map<string, ToolCallItem> = new Map();

   addUserMessage(text: string): void {
     this.items.push({
@@ -77,13 +78,15 @@ export class ConversationState {
     rawInput?: Record<string, unknown>,
   ): void {
     this.finalizeAssistantMessage();
-    this.items.push({
+    const item: ToolCallItem = {
       type: 'tool_call',
       toolCallId,
       title,
       kind,
       status,
       locations,
       rawInput,
       collapsed: !this.toolCallsExpanded,
-    });
+    };
+    this.items.push(item);
+    this._toolCallIndex.set(toolCallId, item);
   }

   updateToolCall(
@@ -93,10 +96,7 @@ export class ConversationState {
     content?: Array<{ type: string; content?: { type: string; text: string } }>,
     rawOutput?: Record<string, unknown>,
   ): void {
-    const item = this.items.find(
-      (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
-    );
+    const item = this._toolCallIndex.get(toolCallId);
     if (item) {
       item.status = status;
       item.result = { status, content, rawOutput };
@@ -139,6 +139,7 @@ export class ConversationState {
     this._streamingMessage = null;
     this._streamingThinking = null;
     this.isProcessing = false;
+    this._toolCallIndex.clear();
   }
 }
```

---

## Full Unified Diff for `acp/session.ts` (if retained)

```diff
--- a/packages/flitter-amp/src/acp/session.ts
+++ b/packages/flitter-amp/src/acp/session.ts
@@ -14,6 +14,7 @@ export class SessionState {
   isProcessing = false;
   currentMode: string | null = null;
   private _streamingMessage: AssistantMessage | null = null;
+  private _toolCallIndex: Map<string, ToolCallItem> = new Map();

   constructor(id: string, cwd: string) {
     this.id = id;
@@ -62,7 +63,7 @@ export class SessionState {
     rawInput?: Record<string, unknown>,
   ): void {
     this.finalizeAssistantMessage();
-    this.items.push({
+    const item: ToolCallItem = {
       type: 'tool_call',
       toolCallId,
       title,
       kind,
       status,
       locations,
       rawInput,
       collapsed: true,
-    });
+    };
+    this.items.push(item);
+    this._toolCallIndex.set(toolCallId, item);
   }

   updateToolCall(
@@ -86,10 +89,7 @@ export class SessionState {
     status: 'completed' | 'failed',
     content?: ToolCallItem['result'],
   ): void {
-    const item = this.items.find(
-      (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
-    );
+    const item = this._toolCallIndex.get(toolCallId);
     if (item) {
       item.status = status;
       if (content) item.result = content;
```

---

## Complexity Analysis

| Operation          | Before            | After                         | Notes |
|--------------------|-------------------|-------------------------------|-------|
| `addToolCall`      | O(1) array push   | O(1) push + O(1) Map.set      | Constant overhead, two O(1) ops |
| `updateToolCall`   | **O(n) find**     | **O(1) Map.get**              | Core improvement |
| `clear`            | O(1) reset        | O(1) reset + O(1) Map.clear   | `Map.clear()` is O(1) amortized |
| `toggleToolCalls`  | O(n) scan         | O(n) scan (unchanged)         | Must visit all items; index does not help |
| `setPlan`          | O(n) find         | O(n) find (unchanged)         | At most 1 plan item; not worth indexing |

### Aggregate Improvement Over Full Conversation

| Metric                      | Before (linear) | After (indexed) |
|-----------------------------|-----------------|-----------------|
| Per-update cost             | O(n)            | O(1)            |
| Total for t updates, n items| O(n * t)        | O(t)            |
| 200 tool calls, 300 items   | ~30,000 ops     | ~200 ops        |
| 500 tool calls, 1000 items  | ~250,000 ops    | ~500 ops        |

### Memory Overhead

One `Map` entry per tool call stores a string key (the `toolCallId`, typically a
UUID of ~36 characters) and a pointer to the existing `ToolCallItem` object. No
data is duplicated. For 200 tool calls:

- Keys: 200 * ~72 bytes (UTF-16 encoding of 36-char UUID) = ~14.4 KB
- Value pointers: 200 * 8 bytes = 1.6 KB
- Map internal bookkeeping: ~1-2 KB
- **Total: ~17 KB** -- negligible relative to the tool call items themselves,
  which contain title strings, raw input/output objects, and result payloads
  easily totaling hundreds of KB.

---

## Correctness Argument

### 1. Referential identity ensures consistency

The same `ToolCallItem` object is stored in both `this.items` (the array used
for rendering) and `this._toolCallIndex` (the Map used for lookup). When
`updateToolCall` retrieves the item via `Map.get()` and mutates `item.status`
and `item.result`, these changes are immediately visible to any code iterating
`this.items` -- because they are the same object in memory. No copy, no sync.

### 2. Lifecycle completeness -- no orphaned entries

Every code path that adds a tool call to `items` also adds it to the index:

| Entry point     | Adds to `items`? | Adds to `_toolCallIndex`? |
|-----------------|:----------------:|:-------------------------:|
| `addToolCall()` | Yes (push)       | Yes (set)                 |

There is no other code path that creates `ToolCallItem` objects in `items`.
The `push` and `set` are adjacent synchronous statements within the same
method, so there is no asynchronous window where one succeeds and the other
does not.

### 3. No stale references after clear

Items are never individually removed from `items`. The only bulk-removal path
is `clear()`, which now also calls `this._toolCallIndex.clear()`. After
`clear()`, both the array and the Map are empty. A subsequent `updateToolCall`
for a pre-clear `toolCallId` will correctly return `undefined` from `Map.get()`
and be a no-op, matching the original behavior (`.find()` on an empty array
returns `undefined`).

### 4. No individual item removal path exists today

Currently, `ConversationState` never removes individual items from `items`. If
such a feature is added in the future (e.g., deleting a single message or tool
call), the removal code must also call:

```typescript
this._toolCallIndex.delete(removedItem.toolCallId);
```

This should be documented with a code comment adjacent to the `_toolCallIndex`
declaration.

### 5. Duplicate `toolCallId` edge case

If the ACP server sends two `tool_call` events with the same `toolCallId`
(a protocol violation), the Map will point to the *second* item (last-write-wins
semantics of `Map.set`). The previous `.find()` implementation would return the
*first* item (first-match semantics of `Array.find()`). In practice,
`toolCallId` values are unique UUIDs generated by the agent, so this edge case
is academic.

If strict first-wins semantics are desired (to match the old behavior exactly),
guard the `set` call:

```typescript
if (!this._toolCallIndex.has(toolCallId)) {
  this._toolCallIndex.set(toolCallId, item);
}
```

However, this adds an extra Map lookup per insertion and addresses a scenario
that should never occur. The recommended approach is to use unconditional `set`
and document the last-write-wins behavior.

---

## Testing Strategy

### Unit Tests

There is currently no dedicated test file for `ConversationState`. Tests
exercise it indirectly through `AppState` in `visual-snapshot.test.ts` and
`visual-cell-assertions.test.ts`. A new test file should be created.

Suggested file: `packages/flitter-amp/src/__tests__/conversation-state.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';
import { ConversationState } from '../state/conversation';
import type { ToolCallItem } from '../acp/types';

describe('ConversationState', () => {
  describe('tool call index', () => {
    it('updateToolCall finds item in O(1) via index', () => {
      const state = new ConversationState();
      state.addToolCall('tc-1', 'Read file', 'read', 'in_progress');
      state.addToolCall('tc-2', 'Write file', 'write', 'in_progress');
      state.addToolCall('tc-3', 'Run bash', 'bash', 'in_progress');

      state.updateToolCall('tc-2', 'completed', undefined, { stdout: 'ok' });

      const updated = state.items.find(
        (i): i is ToolCallItem =>
          i.type === 'tool_call' && i.toolCallId === 'tc-2',
      );
      expect(updated?.status).toBe('completed');
      expect(updated?.result?.rawOutput).toEqual({ stdout: 'ok' });

      // Other items are unaffected
      const tc1 = state.items.find(
        (i): i is ToolCallItem =>
          i.type === 'tool_call' && i.toolCallId === 'tc-1',
      );
      expect(tc1?.status).toBe('in_progress');
    });

    it('updateToolCall is a no-op for unknown toolCallId', () => {
      const state = new ConversationState();
      state.addToolCall('tc-1', 'Read', 'read', 'in_progress');

      // Should not throw
      state.updateToolCall('tc-nonexistent', 'failed');

      const item = state.items.find(
        (i): i is ToolCallItem =>
          i.type === 'tool_call' && i.toolCallId === 'tc-1',
      );
      expect(item?.status).toBe('in_progress');
    });

    it('clear() resets the index so subsequent updates are no-ops', () => {
      const state = new ConversationState();
      state.addToolCall('tc-1', 'Read', 'read', 'in_progress');
      state.clear();

      // The item is gone from items; update should be a no-op
      state.updateToolCall('tc-1', 'completed');
      expect(state.items.length).toBe(0);
    });

    it('index holds same reference as items array (referential identity)', () => {
      const state = new ConversationState();
      state.addToolCall('tc-1', 'Read', 'read', 'in_progress');

      // Mutate through updateToolCall (which uses the Map)
      state.updateToolCall('tc-1', 'completed');

      // The item visible in the items array should also be updated
      const fromArray = state.items[0] as ToolCallItem;
      expect(fromArray.status).toBe('completed');
      expect(fromArray.result).toBeDefined();
    });

    it('handles many tool calls interleaved with other item types', () => {
      const state = new ConversationState();

      // Simulate a realistic conversation
      state.addUserMessage('Fix the bug');
      state.appendAssistantChunk('Let me look at the code.');
      state.finalizeAssistantMessage();

      for (let i = 0; i < 100; i++) {
        state.addToolCall(`tc-${i}`, `Tool ${i}`, 'read', 'in_progress');
        state.appendAssistantChunk(`Analyzing result ${i}...`);
        state.finalizeAssistantMessage();
      }

      // Update the 50th tool call
      state.updateToolCall('tc-49', 'completed', undefined, { lines: 42 });

      const tc49 = state.items.find(
        (i): i is ToolCallItem =>
          i.type === 'tool_call' && i.toolCallId === 'tc-49',
      );
      expect(tc49?.status).toBe('completed');
      expect(tc49?.result?.rawOutput).toEqual({ lines: 42 });
    });

    it('can update the same tool call multiple times', () => {
      const state = new ConversationState();
      state.addToolCall('tc-1', 'Bash', 'bash', 'pending');

      state.updateToolCall('tc-1', 'completed', undefined, { v: 1 });
      state.updateToolCall('tc-1', 'failed', undefined, { v: 2, error: 'oops' });

      const item = state.items[0] as ToolCallItem;
      expect(item.status).toBe('failed');
      expect(item.result?.rawOutput).toEqual({ v: 2, error: 'oops' });
    });

    it('index survives addToolCall after clear', () => {
      const state = new ConversationState();
      state.addToolCall('tc-1', 'Read', 'read', 'in_progress');
      state.clear();

      // Add a new tool call with the same ID after clear
      state.addToolCall('tc-1', 'Write', 'write', 'pending');
      state.updateToolCall('tc-1', 'completed');

      const item = state.items[0] as ToolCallItem;
      expect(item.title).toBe('Write');
      expect(item.status).toBe('completed');
    });
  });
});
```

### Performance Micro-Benchmark (optional, not for CI)

To validate the improvement empirically:

```typescript
import { ConversationState } from '../state/conversation';

function benchmark(label: string, fn: () => void, iterations: number): void {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  console.log(`${label}: ${elapsed.toFixed(2)}ms (${iterations} iterations)`);
}

// Setup: 10,000 items, 5,000 of which are tool calls
const state = new ConversationState();
for (let i = 0; i < 5000; i++) {
  state.addUserMessage(`msg-${i}`);
  state.addToolCall(`tc-${i}`, `Tool ${i}`, 'read', 'in_progress');
}

// Benchmark: update 1,000 tool calls
benchmark('updateToolCall x1000', () => {
  for (let i = 0; i < 1000; i++) {
    state.updateToolCall(`tc-${i}`, 'completed');
  }
}, 1);
```

Expected result: the indexed version completes in constant time regardless of
array size, while the linear version scales proportionally with `items.length`.

---

## Interaction with Other Methods

### `toggleToolCalls` (lines 130-137)

```typescript
toggleToolCalls(): void {
  this.toolCallsExpanded = !this.toolCallsExpanded;
  for (const item of this.items) {
    if (item.type === 'tool_call') {
      item.collapsed = !this.toolCallsExpanded;
    }
  }
}
```

This method iterates all items to flip the `collapsed` property on every tool
call. The `_toolCallIndex` Map cannot help here because the goal is to visit
*all* tool call items, not look up a specific one. A separate optimization --
maintaining an auxiliary `ToolCallItem[]` array -- could speed this up by
avoiding non-tool-call items, but that is out of scope for this gap. If it were
added, the Map could be replaced with this array, and `updateToolCall` could
search the smaller array. However, the Map approach is simpler and addresses
the primary bottleneck.

### `setPlan` (lines 113-124)

Uses `.find()` to locate the existing plan item. Since there is at most one plan
item, this is effectively O(1) in practice (the plan item, if it exists, is
usually near the beginning of the array since it is added early). Not worth
indexing.

### `appendAssistantChunk` and `appendThinkingChunk`

These use a private reference (`_streamingMessage`, `_streamingThinking`) to
track the current streaming item. This is analogous to the Map-based approach
proposed here -- they avoid scanning by keeping a direct reference. The tool
call index follows the same principle, extended to multiple items keyed by ID.

---

## Migration Notes

- **No public API change** -- The `_toolCallIndex` field is private with a
  leading underscore, consistent with the existing `_streamingMessage` and
  `_streamingThinking` conventions. Method signatures are unchanged.

- **No serialization impact** -- The Map is not exposed through any getter,
  protocol message, or persistence layer.

- **Backward compatible** -- All existing callers in `app-state.ts` (lines 94-
  111), `tmux-harness.ts` (lines 43-48), `visual-snapshot.test.ts`, and
  `visual-cell-assertions.test.ts` call `addToolCall` and `updateToolCall` with
  the same arguments. They are unaffected.

- **TypeScript type safety** -- The `Map<string, ToolCallItem>` generic
  parameters ensure that `Map.get()` returns `ToolCallItem | undefined`,
  matching the narrowed type from the original `.find()` with the type predicate
  `(i): i is ToolCallItem`. No type casts are needed.

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/flitter-amp/src/state/conversation.ts` | Add `_toolCallIndex` field; refactor `addToolCall` to capture item reference; rewrite `updateToolCall` to use `Map.get()`; add `_toolCallIndex.clear()` to `clear()` |
| `packages/flitter-amp/src/acp/session.ts` | Same changes (if class is retained post-gap-47) |
| `packages/flitter-amp/src/__tests__/conversation-state.test.ts` | New file: unit tests for index correctness, clear behavior, referential identity, and edge cases |

### Lines Changed (net)

| File | Added | Removed | Net |
|------|-------|---------|-----|
| `conversation.ts` | 4 | 3 | +1 |
| `session.ts` (if retained) | 4 | 3 | +1 |
| `conversation-state.test.ts` | ~100 | 0 | +100 |

---

## Relationship to Other Gaps

| Gap | Relationship |
|-----|-------------|
| **#47** (remove vestigial `SessionState`) | If landed first, `session.ts` changes are unnecessary. If this gap lands first, `session.ts` gets the same fix and #47 later deletes the file. No conflict either way. |
| **#39** (per-card toggle) | Proposes `toggleSingleToolCall(toolCallId)`. Could also use `_toolCallIndex` for O(1) lookup instead of scanning. Synergistic. |
| **#42** (streaming tool output) | Proposes `appendToolOutput(toolCallId, chunk)`. Would benefit from `_toolCallIndex.get(toolCallId)` for O(1) lookup of the item to append to. Synergistic. |
| **#50** (state immutability) | Proposes making `items` immutable. If adopted, the Map would store references to frozen objects, and updates would need to create new objects and replace them in both the array and the Map. The Map approach still helps but requires coordinated replacement logic. Should be considered during #50 design. |
| **#40** (toggle propagation) | Deals with `toggleToolCalls` propagation. The index does not affect this method's O(n) scan. No interaction. |

---

## Alternative Approaches Considered

### Alternative 1: Reverse iteration

Since tool calls are appended chronologically and updates typically arrive for
recently-added tool calls, iterating `items` from the end would find the target
faster on average. However, this is still O(n) in the worst case (e.g., an
early tool call that takes a long time to complete), and the code change is no
simpler than the Map approach.

### Alternative 2: Separate `ToolCallItem[]` array

Maintain a parallel array containing only tool call items. This would speed up
both `updateToolCall` (smaller array to scan) and `toggleToolCalls` (no
non-tool-call items to skip). However, `updateToolCall` would still be O(t)
where t is the number of tool calls, not O(1). The Map is strictly better for
the lookup use case. A combined approach (Map for lookup + array for iteration)
adds complexity without proportional benefit at the current scale.

### Alternative 3: Index by array position

Store the array index of each tool call item in a `Map<string, number>`. This
avoids storing object references but breaks when items are inserted or removed
at arbitrary positions (indices shift). Since `items` is append-only and
`clear()` is a bulk reset, this would work today, but it is more fragile and
less idiomatic than storing object references.

### Chosen: `Map<string, ToolCallItem>` (object reference)

The simplest, most robust, and most idiomatic approach. Works regardless of
future changes to insertion/removal patterns. Leverages JavaScript's reference
semantics for zero-copy synchronization between the array and the Map.

---

## Summary

`ConversationState.updateToolCall()` performs an O(n) linear scan over the
heterogeneous `items` array to find a tool call by its ID. During typical
agentic conversations with 100-500+ tool calls, this results in tens of
thousands of unnecessary comparisons. The fix is to add a private
`Map<string, ToolCallItem>` index, populated in `addToolCall` and queried in
`updateToolCall`, reducing each lookup to O(1) amortized. The change is four
lines of code with zero public API impact, zero serialization impact, and full
backward compatibility.
