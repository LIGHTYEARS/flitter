# Gap S04: No Immutability in State Model

## Problem Statement

`ConversationState` (in `packages/flitter-amp/src/state/conversation.ts`) manages the
entire conversation model through pervasive in-place mutation. Every method directly
mutates array elements, pushes onto shared arrays, and overwrites fields on objects that
are simultaneously referenced by both the state layer and the widget tree.

A near-identical copy of the same mutable pattern exists in `SessionState`
(`packages/flitter-amp/src/acp/session.ts`), which is itself flagged for removal in
gap #47. External consumers -- `app.ts`, `tmux-harness.ts`, and multiple test files --
also reach directly into `items` to mutate individual objects.

### Comprehensive mutation inventory

#### `ConversationState` (state/conversation.ts)

| Line(s) | Method | Mutation | Risk |
|---------|--------|----------|------|
| 27 | `addUserMessage` | `this.items.push(...)` | Mutates shared array reference |
| 43 | `appendAssistantChunk` | `this.items.push(msg)` | Mutates shared array; alias created |
| 45 | `appendAssistantChunk` | `this._streamingMessage.text += text` | Mutates object that is aliased inside `items` |
| 50 | `finalizeAssistantMessage` | `this._streamingMessage.isStreaming = false` | Mutates aliased object in place |
| 65 | `appendThinkingChunk` | `this.items.push(item)` | Mutates shared array; alias created |
| 67 | `appendThinkingChunk` | `this._streamingThinking.text += text` | Mutates aliased object |
| 72 | `finalizeThinking` | `this._streamingThinking.isStreaming = false` | Mutates aliased object |
| 86 | `addToolCall` | `this.items.push(...)` | Mutates shared array |
| 104-109 | `updateToolCall` | `item.status = ...; item.result = ...` | Mutates found element in place |
| 119-122 | `setPlan` | `existingPlan.entries = entries` or `this.items.push(...)` | Mutates found element or shared array |
| 132-136 | `toggleToolCalls` | Loop setting `item.collapsed` | Mutates every tool call item in place |
| 140-146 | `clear` | Wholesale reassignment | Safe-ish but breaks referential equality invariants |

#### `SessionState` (acp/session.ts) -- duplicated mutable pattern

| Line(s) | Method | Mutation |
|---------|--------|----------|
| 29 | `addUserMessage` | `this.items.push(...)` |
| 44 | `startAssistantMessage` | `this.items.push(msg)` + alias |
| 52 | `appendAssistantChunk` | `this._streamingMessage!.text += text` |
| 57 | `finalizeAssistantMessage` | `this._streamingMessage.isStreaming = false` |
| 74 | `addToolCall` | `this.items.push(...)` |
| 95-96 | `updateToolCall` | `item.status = ...; item.result = ...` |
| 105 | `setPlan` | `existingPlan.entries = entries` |
| 107 | `setPlan` | `this.items.push(...)` |

#### External mutation sites

| File | Line(s) | Mutation |
|------|---------|----------|
| `app.ts` | 126-131 | `toggleThinking` iterates `items` and sets `item.collapsed = !item.collapsed` |
| `test-utils/tmux-harness.ts` | 69-71 | Finds thinking item and sets `thinkingItem.collapsed = false` |
| `__tests__/visual-snapshot.test.ts` | 267-268 | `thinkingItem.collapsed = false` |
| `__tests__/visual-snapshot.test.ts` | 334-335 | `thinkingItem.collapsed = false` |
| `__tests__/visual-snapshot.test.ts` | 359 | `appState.conversation.items.push({...})` |
| `__tests__/visual-cell-assertions.test.ts` | 229-231 | `thinkingItem.collapsed = false` |
| `__tests__/visual-cell-assertions.test.ts` | 284 | `appState.conversation.items.push({...})` |

### Why this is harmful

1. **No change detection.** When `AppState.notifyListeners()` fires, the widget tree
   must unconditionally rebuild because there is no way to know *which* items changed.
   The framework cannot short-circuit `build()` for unchanged subtrees since the
   underlying objects are the same references with mutated contents.

2. **Aliased references.** `_streamingMessage` and `_streamingThinking` are aliases into
   the `items` array. Mutations through the alias silently change what the widget tree
   sees, creating a temporal coupling between streaming updates and render cycles.

3. **Impossible undo/time-travel.** There is no prior snapshot to restore because every
   operation destructively overwrites the previous state.

4. **Race-window bugs.** The 50ms throttle in `AppStateWidget._flushUpdate()` means
   multiple mutations can accumulate between renders. Because they are in-place, a render
   that fires mid-batch sees a half-updated state (e.g., `isStreaming` flipped but text
   not yet appended, or tool status updated but result not yet attached).

5. **Difficult testing.** Asserting that a method produced the correct state requires
   deep-cloning before and after, since the "before" snapshot is destroyed. Test code
   resorts to direct mutation of items (pushing raw objects, flipping `collapsed` flags)
   because the class provides no immutable API for these operations.

6. **Duplicated mutable code.** `SessionState` in `acp/session.ts` duplicates the entire
   mutable pattern. Any immutability improvement must either unify these classes or apply
   consistently to both.

---

## Design Principles

The solution follows four principles:

1. **Structural sharing.** New state references are created only for changed subtrees.
   Unchanged items keep the same object identity, enabling `===` equality checks in
   widget `build()` to skip unchanged sections.

2. **Replace-not-mutate at every layer.** `items` is always a new array (or a
   structurally shared persistent list). Individual items are replaced with new objects
   when their fields change. The old objects are never touched.

3. **Streaming as a special concern.** High-frequency text appends during streaming need
   an efficient path that avoids copying the entire items array on every chunk. We
   handle this with a dedicated streaming buffer that is periodically flushed into the
   immutable items list.

4. **Single source of truth.** Remove `SessionState` as a duplicate and ensure all state
   flows through the single immutable `ConversationState`.

---

## Proposed Architecture

### Phase 1: Readonly types and immutable item construction

Define `Readonly` branded types for all conversation items so that the compiler enforces
non-mutation at the type level. These types are *deep* readonly -- nested arrays and
objects are also marked readonly.

```typescript
// state/immutable-types.ts

import type {
  UserMessage,
  AssistantMessage,
  ThinkingItem,
  ToolCallItem,
  ToolCallResult,
  PlanItem,
  PlanEntry,
  UsageInfo,
} from '../acp/types';

/** Deep-readonly versions of all item types */
export type ImmutableUserMessage = Readonly<UserMessage>;

export type ImmutableAssistantMsg = Readonly<AssistantMessage>;

export type ImmutableThinkingItem = Readonly<ThinkingItem>;

export type ImmutableToolCallResult = Readonly<{
  status: ToolCallResult['status'];
  content?: ReadonlyArray<Readonly<{
    type: string;
    content?: Readonly<{ type: string; text: string }>;
  }>>;
  rawOutput?: Readonly<Record<string, unknown>>;
}>;

export type ImmutableToolCallItem = Readonly<{
  type: 'tool_call';
  toolCallId: string;
  title: string;
  kind: string;
  status: ToolCallItem['status'];
  locations?: ReadonlyArray<Readonly<{ path: string }>>;
  rawInput?: Readonly<Record<string, unknown>>;
  result?: ImmutableToolCallResult;
  collapsed: boolean;
}>;

export type ImmutablePlanItem = Readonly<{
  type: 'plan';
  entries: ReadonlyArray<Readonly<PlanEntry>>;
}>;

export type ImmutableConversationItem =
  | ImmutableUserMessage
  | ImmutableAssistantMsg
  | ImmutableThinkingItem
  | ImmutableToolCallItem
  | ImmutablePlanItem;

/** The immutable state snapshot exposed to consumers */
export interface ConversationSnapshot {
  readonly items: ReadonlyArray<ImmutableConversationItem>;
  readonly plan: ReadonlyArray<Readonly<PlanEntry>>;
  readonly usage: Readonly<UsageInfo> | null;
  readonly isProcessing: boolean;
  readonly toolCallsExpanded: boolean;
  readonly version: number; // monotonic counter for cheap dirty-check
}
```

The `version` counter gives consumers an O(1) dirty-check: if the version has not
changed since the last render, the entire conversation is unchanged.

**Key distinction from the mutable types:** The `ImmutableToolCallItem` makes `result`,
`locations`, and `rawInput` all deeply readonly, preventing the kind of nested mutation
seen in `updateToolCall` where `item.result = { ... }` silently changes what widgets see.

### Phase 2: Immutable ConversationState

Replace every mutating method with one that produces a new snapshot. The class becomes a
thin wrapper around a `ConversationSnapshot` reference.

```typescript
// state/conversation.ts  (rewritten)

import type {
  ImmutableConversationItem,
  ImmutableAssistantMsg,
  ImmutableThinkingItem,
  ImmutableToolCallItem,
  ConversationSnapshot,
} from './immutable-types';
import type { PlanEntry, UsageInfo, ToolCallItem } from '../acp/types';

function nextVersion(prev: number): number {
  return prev + 1;
}

/** Replace item at index, returning a new array. O(n) but with structural sharing
 *  of every element except the replaced one. */
function replaceAt<T>(
  arr: ReadonlyArray<T>,
  index: number,
  newItem: T,
): ReadonlyArray<T> {
  const copy = arr.slice();
  copy[index] = newItem;
  return copy;
}

/** Append item, returning a new array. */
function append<T>(arr: ReadonlyArray<T>, item: T): ReadonlyArray<T> {
  return [...arr, item];
}

const EMPTY_SNAPSHOT: ConversationSnapshot = Object.freeze({
  items: Object.freeze([]),
  plan: Object.freeze([]),
  usage: null,
  isProcessing: false,
  toolCallsExpanded: false,
  version: 0,
});

export class ConversationState {
  private _snapshot: ConversationSnapshot = EMPTY_SNAPSHOT;

  // Streaming accumulator -- NOT part of the snapshot.
  // Text chunks accumulate here and are flushed into the snapshot
  // on a coalesced schedule or on finalization.
  private _streamingTextBuffer: string = '';
  private _streamingThinkingBuffer: string = '';
  private _streamingMsgIndex: number = -1;
  private _streamingThinkingIndex: number = -1;

  /** The current immutable snapshot. Consumers read ONLY this. */
  get snapshot(): ConversationSnapshot {
    return this._snapshot;
  }

  // ---- Convenience accessors (backward compat during migration) ----

  get items(): ReadonlyArray<ImmutableConversationItem> {
    return this._snapshot.items;
  }
  get plan(): ReadonlyArray<Readonly<PlanEntry>> {
    return this._snapshot.plan;
  }
  get usage(): Readonly<UsageInfo> | null {
    return this._snapshot.usage;
  }
  get isProcessing(): boolean {
    return this._snapshot.isProcessing;
  }
  set isProcessing(val: boolean) {
    this._snapshot = {
      ...this._snapshot,
      isProcessing: val,
      version: nextVersion(this._snapshot.version),
    };
  }
  get toolCallsExpanded(): boolean {
    return this._snapshot.toolCallsExpanded;
  }

  // ---- Immutable update methods ----

  addUserMessage(text: string): void {
    const item: ImmutableConversationItem = Object.freeze({
      type: 'user_message' as const,
      text,
      timestamp: Date.now(),
    });
    this._snapshot = {
      ...this._snapshot,
      items: append(this._snapshot.items, item),
      version: nextVersion(this._snapshot.version),
    };
  }

  appendAssistantChunk(text: string): void {
    if (this._streamingMsgIndex === -1) {
      // Create the streaming message placeholder in the snapshot
      const msg: ImmutableAssistantMsg = Object.freeze({
        type: 'assistant_message' as const,
        text: '',
        timestamp: Date.now(),
        isStreaming: true,
      });
      const newItems = append(this._snapshot.items, msg);
      this._streamingMsgIndex = newItems.length - 1;
      this._streamingTextBuffer = '';
      this._snapshot = {
        ...this._snapshot,
        items: newItems,
        version: nextVersion(this._snapshot.version),
      };
    }
    // Accumulate in the buffer -- no snapshot update yet.
    this._streamingTextBuffer += text;
  }

  /** Flush accumulated streaming text into the snapshot.
   *  Called by the throttled render cycle or by finalize methods. */
  flushStreamingText(): boolean {
    let changed = false;

    if (this._streamingMsgIndex >= 0 && this._streamingTextBuffer.length > 0) {
      const prev = this._snapshot.items[this._streamingMsgIndex] as ImmutableAssistantMsg;
      const updated: ImmutableAssistantMsg = Object.freeze({
        ...prev,
        text: prev.text + this._streamingTextBuffer,
      });
      this._streamingTextBuffer = '';
      this._snapshot = {
        ...this._snapshot,
        items: replaceAt(this._snapshot.items, this._streamingMsgIndex, updated),
        version: nextVersion(this._snapshot.version),
      };
      changed = true;
    }

    if (this._streamingThinkingIndex >= 0 && this._streamingThinkingBuffer.length > 0) {
      const prev = this._snapshot.items[this._streamingThinkingIndex] as ImmutableThinkingItem;
      const updated: ImmutableThinkingItem = Object.freeze({
        ...prev,
        text: prev.text + this._streamingThinkingBuffer,
      });
      this._streamingThinkingBuffer = '';
      this._snapshot = {
        ...this._snapshot,
        items: replaceAt(this._snapshot.items, this._streamingThinkingIndex, updated),
        version: nextVersion(this._snapshot.version),
      };
      changed = true;
    }

    return changed;
  }

  finalizeAssistantMessage(): void {
    this.flushStreamingText();
    if (this._streamingMsgIndex >= 0) {
      const prev = this._snapshot.items[this._streamingMsgIndex] as ImmutableAssistantMsg;
      const updated: ImmutableAssistantMsg = Object.freeze({
        ...prev,
        isStreaming: false,
      });
      this._snapshot = {
        ...this._snapshot,
        items: replaceAt(this._snapshot.items, this._streamingMsgIndex, updated),
        version: nextVersion(this._snapshot.version),
      };
      this._streamingMsgIndex = -1;
      this._streamingTextBuffer = '';
    }
  }

  appendThinkingChunk(text: string): void {
    if (this._streamingThinkingIndex === -1) {
      const item: ImmutableThinkingItem = Object.freeze({
        type: 'thinking' as const,
        text: '',
        timestamp: Date.now(),
        isStreaming: true,
        collapsed: true,
      });
      const newItems = append(this._snapshot.items, item);
      this._streamingThinkingIndex = newItems.length - 1;
      this._streamingThinkingBuffer = '';
      this._snapshot = {
        ...this._snapshot,
        items: newItems,
        version: nextVersion(this._snapshot.version),
      };
    }
    this._streamingThinkingBuffer += text;
  }

  finalizeThinking(): void {
    this.flushStreamingText();
    if (this._streamingThinkingIndex >= 0) {
      const prev = this._snapshot.items[this._streamingThinkingIndex] as ImmutableThinkingItem;
      const updated: ImmutableThinkingItem = Object.freeze({
        ...prev,
        isStreaming: false,
      });
      this._snapshot = {
        ...this._snapshot,
        items: replaceAt(this._snapshot.items, this._streamingThinkingIndex, updated),
        version: nextVersion(this._snapshot.version),
      };
      this._streamingThinkingIndex = -1;
      this._streamingThinkingBuffer = '';
    }
  }

  addToolCall(
    toolCallId: string,
    title: string,
    kind: string,
    status: ToolCallItem['status'],
    locations?: Array<{ path: string }>,
    rawInput?: Record<string, unknown>,
  ): void {
    this.finalizeAssistantMessage();
    const item: ImmutableToolCallItem = Object.freeze({
      type: 'tool_call' as const,
      toolCallId,
      title,
      kind,
      status,
      locations: locations
        ? Object.freeze(locations.map(l => Object.freeze({ ...l })))
        : undefined,
      rawInput: rawInput ? Object.freeze({ ...rawInput }) : undefined,
      collapsed: !this._snapshot.toolCallsExpanded,
    });
    this._snapshot = {
      ...this._snapshot,
      items: append(this._snapshot.items, item),
      version: nextVersion(this._snapshot.version),
    };
  }

  updateToolCall(
    toolCallId: string,
    status: 'completed' | 'failed',
    content?: Array<{ type: string; content?: { type: string; text: string } }>,
    rawOutput?: Record<string, unknown>,
  ): void {
    const index = this._snapshot.items.findIndex(
      (i) => i.type === 'tool_call' && (i as ImmutableToolCallItem).toolCallId === toolCallId,
    );
    if (index === -1) return;

    const prev = this._snapshot.items[index] as ImmutableToolCallItem;
    const updated: ImmutableToolCallItem = Object.freeze({
      ...prev,
      status,
      result: Object.freeze({ status, content, rawOutput }),
    });
    this._snapshot = {
      ...this._snapshot,
      items: replaceAt(this._snapshot.items, index, updated),
      version: nextVersion(this._snapshot.version),
    };
  }

  setPlan(entries: PlanEntry[]): void {
    const frozenEntries = Object.freeze(entries.map(e => Object.freeze({ ...e })));
    const existingIndex = this._snapshot.items.findIndex(i => i.type === 'plan');
    const planItem: ImmutableConversationItem = Object.freeze({
      type: 'plan' as const,
      entries: frozenEntries,
    });

    let newItems: ReadonlyArray<ImmutableConversationItem>;
    if (existingIndex >= 0) {
      newItems = replaceAt(this._snapshot.items, existingIndex, planItem);
    } else {
      newItems = append(this._snapshot.items, planItem);
    }

    this._snapshot = {
      ...this._snapshot,
      items: newItems,
      plan: frozenEntries,
      version: nextVersion(this._snapshot.version),
    };
  }

  setUsage(usage: UsageInfo): void {
    this._snapshot = {
      ...this._snapshot,
      usage: Object.freeze({ ...usage }),
      version: nextVersion(this._snapshot.version),
    };
  }

  toggleToolCalls(): void {
    const expanded = !this._snapshot.toolCallsExpanded;
    const newItems = this._snapshot.items.map(item => {
      if (item.type === 'tool_call') {
        return Object.freeze({ ...item, collapsed: !expanded });
      }
      return item; // structural sharing: unchanged items keep identity
    });
    this._snapshot = {
      ...this._snapshot,
      items: newItems,
      toolCallsExpanded: expanded,
      version: nextVersion(this._snapshot.version),
    };
  }

  /** Toggle collapsed state of all thinking items. Replaces the direct
   *  mutation loop previously in app.ts toggleThinking(). */
  toggleThinking(): void {
    const newItems = this._snapshot.items.map(item => {
      if (item.type === 'thinking') {
        return Object.freeze({ ...item, collapsed: !item.collapsed });
      }
      return item;
    });
    this._snapshot = {
      ...this._snapshot,
      items: newItems,
      version: nextVersion(this._snapshot.version),
    };
  }

  /** Set collapsed state for a specific item by index. Used for targeted
   *  expand/collapse of individual thinking blocks or tool calls. */
  setItemCollapsed(index: number, collapsed: boolean): void {
    const item = this._snapshot.items[index];
    if (!item) return;
    if (item.type !== 'thinking' && item.type !== 'tool_call') return;
    if (item.collapsed === collapsed) return; // no-op

    const updated = Object.freeze({ ...item, collapsed });
    this._snapshot = {
      ...this._snapshot,
      items: replaceAt(this._snapshot.items, index, updated),
      version: nextVersion(this._snapshot.version),
    };
  }

  clear(): void {
    this._streamingMsgIndex = -1;
    this._streamingThinkingIndex = -1;
    this._streamingTextBuffer = '';
    this._streamingThinkingBuffer = '';
    this._snapshot = {
      ...EMPTY_SNAPSHOT,
      version: nextVersion(this._snapshot.version),
    };
  }
}
```

### Phase 3: Integrate flush cycle with the throttled render

In `AppState`, the `notifyListeners` path already has a 50ms throttle in the App widget.
We hook `flushStreamingText()` into the render cycle so that multiple streaming chunks
coalesce into a single snapshot update:

```typescript
// In AppStateWidget._flushUpdate():
private _flushUpdate(): void {
  if (this._pendingTimer) {
    clearTimeout(this._pendingTimer);
    this._pendingTimer = null;
  }
  this._lastUpdate = Date.now();
  const wasAtBottom = this.scrollController.atBottom;

  // Flush any accumulated streaming text into an immutable snapshot
  this.widget.appState.conversation.flushStreamingText();

  this.setState(() => {});
  if (this.widget.appState.isProcessing && wasAtBottom) {
    this.scrollController.enableFollowMode();
  }
}
```

This means `appendAssistantChunk` and `appendThinkingChunk` are now nearly free --
they only append to a string buffer. The expensive snapshot replacement happens at
most once per 50ms render frame.

**Streaming data flow (before and after):**

```
BEFORE (current):
  ACP event -> appendAssistantChunk() -> mutates items[n].text
  50ms later -> notifyListeners() -> rebuild sees half-mutated state

AFTER (proposed):
  ACP event -> appendAssistantChunk() -> appends to _streamingTextBuffer (O(1))
  ACP event -> appendAssistantChunk() -> appends to _streamingTextBuffer (O(1))
  ACP event -> appendAssistantChunk() -> appends to _streamingTextBuffer (O(1))
  50ms later -> _flushUpdate() -> flushStreamingText() -> single snapshot replacement
             -> notifyListeners() -> rebuild sees consistent snapshot
```

### Phase 4: Eliminate ALL external mutation of items

Every site that reaches into `items` to mutate objects must be converted.

#### 4a. `app.ts` -- `toggleThinking`

```typescript
// BEFORE (mutating):
private toggleThinking(appState: AppState): void {
  for (const item of appState.conversation.items) {
    if (item.type === 'thinking') {
      item.collapsed = !item.collapsed;
    }
  }
}

// AFTER (delegate to immutable method):
case 'toggle-thinking':
  appState.conversation.toggleThinking();
  break;
```

#### 4b. `test-utils/tmux-harness.ts` -- expanding thinking items

```typescript
// BEFORE (direct mutation):
const thinkingItem = appState.conversation.items.find(i => i.type === 'thinking');
if (thinkingItem && thinkingItem.type === 'thinking') {
  thinkingItem.collapsed = false;
}

// AFTER (use the new targeted collapse method):
const thinkingIndex = appState.conversation.items.findIndex(i => i.type === 'thinking');
if (thinkingIndex >= 0) {
  appState.conversation.setItemCollapsed(thinkingIndex, false);
}
```

#### 4c. Test files -- direct `items.push()` and `collapsed` mutation

The test files `visual-snapshot.test.ts` and `visual-cell-assertions.test.ts` do two
problematic things:

1. **Push raw objects** directly onto `items`:
   ```typescript
   appState.conversation.items.push({ type: 'thinking', ... });
   ```

2. **Mutate `collapsed`** on found items:
   ```typescript
   thinkingItem.collapsed = false;
   ```

Both must be replaced. For (1), add a test helper method or use the existing
`appendThinkingChunk` + `finalizeThinking` flow. For interrupted thinking (empty text),
add a dedicated method:

```typescript
// Add to ConversationState:
/** Insert an interrupted thinking block (empty text, not streaming). */
addInterruptedThinking(): void {
  const item: ImmutableThinkingItem = Object.freeze({
    type: 'thinking' as const,
    text: '',
    timestamp: Date.now(),
    isStreaming: false,
    collapsed: false,
  });
  this._snapshot = {
    ...this._snapshot,
    items: append(this._snapshot.items, item),
    version: nextVersion(this._snapshot.version),
  };
}
```

Test code then becomes:

```typescript
// BEFORE:
appState.conversation.items.push({
  type: 'thinking', text: '', timestamp: Date.now(),
  isStreaming: false, collapsed: false,
});

// AFTER:
appState.conversation.addInterruptedThinking();
```

For expanding thinking items in tests:

```typescript
// BEFORE:
const thinkingItem = appState.conversation.items.find(i => i.type === 'thinking');
if (thinkingItem && thinkingItem.type === 'thinking') {
  thinkingItem.collapsed = false;
}

// AFTER:
const idx = appState.conversation.items.findIndex(i => i.type === 'thinking');
if (idx >= 0) {
  appState.conversation.setItemCollapsed(idx, false);
}
```

### Phase 5: Version-gated widget rebuilds

With the `version` counter on `ConversationSnapshot`, widgets can skip rebuilds when
nothing changed. The `ChatView` widget can be enhanced:

```typescript
class ChatView extends StatelessWidget {
  readonly items: ReadonlyArray<ImmutableConversationItem>;
  readonly error: string | null;
  readonly version: number;

  // A parent widget can check:
  //   if (prevVersion === currentVersion) return cachedWidget;
  // before constructing a new ChatView.
}
```

For individual item widgets (tool call blocks, thinking blocks), the framework can
use referential equality as a short-circuit:

```typescript
// In a hypothetical shouldRebuild check:
if (prevItem === nextItem) {
  // Same frozen object reference -- skip rebuild entirely
  return false;
}
```

This is the key payoff of structural sharing: unchanged items keep the same `===`
identity across snapshots, so the widget layer can skip work proportional to what
actually changed.

### Phase 6: Remove `SessionState` duplication

Per gap #47, `SessionState` in `acp/session.ts` is vestigial. Once `ConversationState`
is immutable, `SessionState` should either:

- Be deleted entirely (preferred, as gap #47 proposes), or
- Be refactored to delegate to the immutable `ConversationState`.

The immutability work here makes the deletion cleaner because all state management is
centralized in a single class with a well-defined snapshot interface.

---

## Migration Strategy

The rewrite must be incremental because `ConversationState` is consumed by `AppState`,
`App`, `ChatView`, and multiple test files.

### Step 1: Add `immutable-types.ts` (non-breaking)

Create the readonly type aliases. No runtime changes. All existing code continues to
work since `Readonly<T>` is assignable to `T` in TypeScript (but not the reverse).

**Files touched:** 1 new file (`state/immutable-types.ts`).

### Step 2: Rewrite `ConversationState` internals (semi-breaking)

Replace the class body with the immutable implementation above. Keep the same public
method signatures. Add the `snapshot` getter. Add `toggleThinking()`,
`setItemCollapsed()`, and `addInterruptedThinking()` methods.

The `items` getter now returns `ReadonlyArray` which is a subtype of the old
`ConversationItem[]` for read access but will cause compile errors on any code that does
`state.items.push(...)` or `state.items[i].collapsed = ...`.

**Files touched:** 1 file rewritten (`state/conversation.ts`).

### Step 3: Fix compile errors in consumers

These are the exact files and changes needed:

| File | Change |
|------|--------|
| `app.ts` line 126-131 | Replace `toggleThinking` loop with `conversation.toggleThinking()` |
| `test-utils/tmux-harness.ts` line 69-71 | Use `setItemCollapsed()` |
| `__tests__/visual-snapshot.test.ts` lines 267-268, 334-335 | Use `setItemCollapsed()` |
| `__tests__/visual-snapshot.test.ts` line 359 | Use `addInterruptedThinking()` |
| `__tests__/visual-cell-assertions.test.ts` lines 229-231 | Use `setItemCollapsed()` |
| `__tests__/visual-cell-assertions.test.ts` line 284 | Use `addInterruptedThinking()` |

**Files touched:** 4 files edited.

### Step 4: Wire `flushStreamingText` into the render cycle

Modify `AppStateWidget._flushUpdate()` as shown in Phase 3. Verify streaming still works
correctly with the coalesced flush.

**Files touched:** 1 file edited (`app.ts`).

### Step 5: Propagate `version` to widgets (optimization)

Thread `snapshot.version` through to `ChatView` and other widgets that can benefit
from version-gated rebuild skipping. This is an optimization pass and can be done
incrementally.

**Files touched:** `chat-view.ts`, `thinking-block.ts`, `tool-call/index.ts`.

### Step 6: Update `ChatView` and widget props types

Update props interfaces to accept readonly types:

```typescript
// chat-view.ts
interface ChatViewProps {
  items: ReadonlyArray<ImmutableConversationItem>;  // was ConversationItem[]
  error?: string | null;
}
```

This is a type-level change; no runtime behavior changes.

---

## Performance Considerations

| Operation | Old cost | New cost | Notes |
|-----------|----------|----------|-------|
| `appendAssistantChunk` | O(1) string concat on mutable object | O(1) string concat on buffer | No snapshot copy during streaming |
| `flushStreamingText` | N/A (implicit) | O(n) array copy | Happens at most 20x/sec (50ms throttle) |
| `addUserMessage` | O(1) push | O(n) spread + push | n = items.length; negligible for typical conversations |
| `updateToolCall` | O(n) find + O(1) mutate | O(n) find + O(n) replaceAt | Still O(n); structural sharing means only one new object |
| `toggleToolCalls` | O(k) mutations in loop | O(n) map producing new array | Same asymptotic; new array enables === checks downstream |
| `setItemCollapsed` | N/A (was external mutation) | O(n) replaceAt | New method; was O(n) find + O(1) mutate externally |
| Widget rebuild | Must rebuild all items (no change detection) | Can skip items with same reference | Net win for large conversations |

The key insight is that the O(n) array copies are amortized by the massive savings in
widget rebuild avoidance. A conversation with 200 items where only 1 changed goes from
rebuilding all 200 item widgets to rebuilding just 1.

**Streaming performance detail:** During an active streaming response, the model can emit
hundreds of text chunks per second. Under the old design, each chunk mutates the
`items[n].text` string in place, and the 50ms throttle means 5-10 mutations pile up
invisibly between renders. Under the new design, those 5-10 chunks accumulate in a plain
string buffer (`_streamingTextBuffer += text`) with zero snapshot overhead. The single
`flushStreamingText()` call per render frame produces exactly one new frozen
`AssistantMessage` and one new items array. This is strictly better: same O(n) copy
but only once per frame instead of the current "mutate and hope nobody's reading" pattern.

---

## Testing Strategy

Immutability is directly testable:

```typescript
describe('ConversationState immutability', () => {
  it('should not mutate previous snapshot when adding a message', () => {
    const state = new ConversationState();
    const snap1 = state.snapshot;

    state.addUserMessage('hello');
    const snap2 = state.snapshot;

    expect(snap1.items).toHaveLength(0);  // snap1 unchanged
    expect(snap2.items).toHaveLength(1);
    expect(snap1).not.toBe(snap2);        // different references
    expect(snap1.version).toBeLessThan(snap2.version);
  });

  it('should preserve item identity for unchanged items (structural sharing)', () => {
    const state = new ConversationState();
    state.addUserMessage('first');
    const itemRef = state.snapshot.items[0];

    state.addUserMessage('second');
    expect(state.snapshot.items[0]).toBe(itemRef);  // same reference
  });

  it('should coalesce streaming chunks until flush', () => {
    const state = new ConversationState();
    const versionBefore = state.snapshot.version;

    state.appendAssistantChunk('Hello');
    state.appendAssistantChunk(' world');
    state.appendAssistantChunk('!');

    // Version changed once (for the placeholder creation) but text is buffered
    const msg = state.snapshot.items[0] as ImmutableAssistantMsg;
    expect(msg.text).toBe('');  // text still empty -- in buffer

    state.flushStreamingText();
    const flushed = state.snapshot.items[0] as ImmutableAssistantMsg;
    expect(flushed.text).toBe('Hello world!');
    expect(state.snapshot.version).toBeGreaterThan(versionBefore);
  });

  it('should freeze all produced objects', () => {
    const state = new ConversationState();
    state.addUserMessage('test');
    const item = state.snapshot.items[0];

    expect(Object.isFrozen(item)).toBe(true);
    expect(() => { (item as any).text = 'mutated'; }).toThrow();
  });

  it('should replace only the changed item in updateToolCall', () => {
    const state = new ConversationState();
    state.addUserMessage('run tests');
    state.addToolCall('tc-1', 'bun test', 'bash', 'in_progress');
    const userItemRef = state.snapshot.items[0];
    const toolItemRef = state.snapshot.items[1];

    state.updateToolCall('tc-1', 'completed', undefined, { exit: 0 });

    expect(state.snapshot.items[0]).toBe(userItemRef);     // unchanged
    expect(state.snapshot.items[1]).not.toBe(toolItemRef);  // replaced
    expect((state.snapshot.items[1] as ImmutableToolCallItem).status).toBe('completed');
  });

  it('should handle toggleThinking without external mutation', () => {
    const state = new ConversationState();
    state.appendThinkingChunk('thinking...');
    state.finalizeThinking();

    const before = state.snapshot.items[0] as ImmutableThinkingItem;
    expect(before.collapsed).toBe(true);

    state.toggleThinking();
    const after = state.snapshot.items[0] as ImmutableThinkingItem;
    expect(after.collapsed).toBe(false);
    expect(before.collapsed).toBe(true);  // original unchanged
  });

  it('should handle setItemCollapsed for targeted expand', () => {
    const state = new ConversationState();
    state.appendThinkingChunk('thinking...');
    state.finalizeThinking();
    state.addUserMessage('hello');

    state.setItemCollapsed(0, false);
    expect((state.snapshot.items[0] as ImmutableThinkingItem).collapsed).toBe(false);
    // User message at index 1 is unchanged reference
    const userRef = state.snapshot.items[1];
    state.setItemCollapsed(0, true);
    expect(state.snapshot.items[1]).toBe(userRef);
  });

  it('should handle addInterruptedThinking', () => {
    const state = new ConversationState();
    state.addInterruptedThinking();

    const item = state.snapshot.items[0] as ImmutableThinkingItem;
    expect(item.text).toBe('');
    expect(item.isStreaming).toBe(false);
    expect(item.collapsed).toBe(false);
    expect(Object.isFrozen(item)).toBe(true);
  });

  it('should return false from flushStreamingText when nothing to flush', () => {
    const state = new ConversationState();
    expect(state.flushStreamingText()).toBe(false);

    state.addUserMessage('hello');
    expect(state.flushStreamingText()).toBe(false);
  });

  it('clear should produce a new snapshot with incremented version', () => {
    const state = new ConversationState();
    state.addUserMessage('hello');
    const prevVersion = state.snapshot.version;

    state.clear();
    expect(state.snapshot.items).toHaveLength(0);
    expect(state.snapshot.version).toBeGreaterThan(prevVersion);
  });
});
```

---

## Files Changed

| File | Change |
|------|--------|
| `packages/flitter-amp/src/state/immutable-types.ts` | **New.** Readonly type aliases with deep readonly for nested structures, and `ConversationSnapshot` interface with version counter. |
| `packages/flitter-amp/src/state/conversation.ts` | **Rewrite.** All methods produce new snapshots via spread + `Object.freeze`. Streaming uses buffer + flush pattern. New methods: `toggleThinking()`, `setItemCollapsed()`, `addInterruptedThinking()`, `flushStreamingText()`. |
| `packages/flitter-amp/src/state/app-state.ts` | **Minor.** No changes to method signatures. `isProcessing` setter triggers immutable update internally. |
| `packages/flitter-amp/src/app.ts` | **Minor.** Replace `toggleThinking` loop with `conversation.toggleThinking()`. Wire `flushStreamingText()` into `_flushUpdate()`. |
| `packages/flitter-amp/src/acp/types.ts` | **No change.** Existing mutable types remain for ACP SDK compat; the immutable wrappers live in `immutable-types.ts`. |
| `packages/flitter-amp/src/widgets/chat-view.ts` | **Minor.** Accept `ReadonlyArray<ImmutableConversationItem>` in props. |
| `packages/flitter-amp/src/widgets/thinking-block.ts` | **Minor.** Accept `ImmutableThinkingItem`. |
| `packages/flitter-amp/src/widgets/tool-call/index.ts` | **Minor.** Accept `ImmutableToolCallItem`. |
| `packages/flitter-amp/src/test-utils/tmux-harness.ts` | **Minor.** Replace direct `collapsed` mutation with `setItemCollapsed()`. |
| `packages/flitter-amp/src/__tests__/visual-snapshot.test.ts` | **Minor.** Replace all `items.push()` and `collapsed` mutations with immutable API calls. |
| `packages/flitter-amp/src/__tests__/visual-cell-assertions.test.ts` | **Minor.** Same treatment as above. |

---

## Interaction with Other Gaps

| Gap | Relationship |
|-----|-------------|
| **#47 (Remove vestigial SessionState)** | Prerequisite synergy. Once `SessionState` is removed, the only state class is the immutable `ConversationState`. Do #47 first or simultaneously. |
| **#39 (Per-card toggle)** | `setItemCollapsed()` introduced here is exactly the API needed for per-card expand/collapse. The current per-card toggle relies on direct mutation; this gap provides the immutable foundation. |
| **#40 (Toggle propagation)** | `toggleToolCalls()` and `toggleThinking()` already handle propagation immutably. The `onToggle` callback design in gap #40 should delegate to these methods. |
| **#36 (Expand/collapse animation)** | Animation state needs to be derived from the collapsed field on frozen items. The immutable `setItemCollapsed()` gives animation triggers a clean before/after pair to work with. |

---

## Future Enhancements

1. **Persistent data structures.** If conversations grow very large (1000+ items), replace
   the naive `array.slice()` + `replaceAt` with a persistent vector (e.g., a 32-way
   branching trie like Immutable.js `List`) for O(log n) updates.

2. **Selector memoization.** Provide derived selectors (e.g., `selectToolCalls`,
   `selectLastAssistantMessage`) that cache based on `snapshot.version` and return
   stable references when the relevant subset has not changed.

3. **Undo/redo stack.** With immutable snapshots, implementing undo is trivial: maintain
   a `past: ConversationSnapshot[]` stack and restore by swapping `_snapshot`.

4. **Snapshot serialization.** Frozen snapshots are trivially serializable for session
   persistence, crash recovery, or cross-process state transfer.

5. **Fine-grained subscriptions.** With the version counter, implement per-section
   version tracking (e.g., `itemsVersion`, `planVersion`, `usageVersion`) so that
   widgets that only care about plan changes can ignore item updates entirely.
