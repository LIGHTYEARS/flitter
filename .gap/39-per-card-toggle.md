# Gap T01: Per-Card Toggle Not Wired

## Problem Statement

The `onToggle` callback exists on `GenericToolCard` and is plumbed through `ToolCallWidget`, but `ChatView` never passes an `onToggle` closure when it instantiates `ToolCallWidget`. As a result, individual tool card expand/collapse toggling is non-functional. The only toggle mechanism available today is the bulk `Alt+T` keybinding (via `ConversationState.toggleToolCalls()`), which flips every tool card at once.

## Current Architecture

### Data Flow (Top-Down)

```
AppStateWidget (app.ts)
  -- owns AppState (state/app-state.ts)
     -- owns ConversationState (state/conversation.ts)
        -- items: ConversationItem[] (each ToolCallItem has a `collapsed: boolean` field)
  -- passes items to ChatView as a read-only prop
  -- ChatView is a StatelessWidget; it cannot call setState on its own

ChatView (chat-view.ts)
  -- iterates items, instantiates ToolCallWidget for each tool_call item
  -- passes isExpanded: !cur.collapsed
  -- does NOT pass onToggle

ToolCallWidget (tool-call-widget.ts)
  -- accepts onToggle?: () => void in ToolCallWidgetProps
  -- stores it, but only forwards it to GenericToolCard (for the default/fallback cases)
  -- specialized tool widgets (ReadTool, BashTool, GrepTool, etc.) do NOT accept onToggle at all

GenericToolCard (generic-tool-card.ts)
  -- accepts onToggle?: () => void in GenericToolCardProps
  -- stores it in the constructor, but NEVER calls it anywhere in build()
  -- the card renders as collapsed (header-only) or expanded based on isExpanded
  -- there is no MouseRegion, no keyboard handler, nothing that invokes onToggle
```

### Existing Bulk Toggle

`ConversationState.toggleToolCalls()` iterates every `ToolCallItem` in the items array and flips `collapsed` based on the `toolCallsExpanded` boolean. This is triggered by `Alt+T` in `AppStateWidget.build()` and by the `'toggle-tools'` command in `CommandPalette`. After mutation, `this.setState(() => {})` forces a rebuild.

### The Disconnect (Three Missing Pieces)

1. **ChatView does not pass onToggle to ToolCallWidget.** There is no closure that mutates the individual `ToolCallItem.collapsed` field. Looking at `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/chat-view.ts` lines 102-107, the `ToolCallWidget` is instantiated with only `toolCall` and `isExpanded` -- no `onToggle`.

2. **ToolCallWidget does not forward onToggle to specialized tool widgets.** Only the `GenericToolCard` fallback branches (the `default` case on line 142 and the visual/utility case on line 135 of `tool-call-widget.ts`) receive `onToggle`. The nine specialized widgets -- `ReadTool`, `BashTool`, `EditFileTool`, `GrepTool`, `WebSearchTool`, `TaskTool`, `HandoffTool`, `TodoListTool`, and `CreateFileTool` -- all lack `onToggle` in their prop interfaces.

3. **GenericToolCard never invokes onToggle.** Even if `onToggle` were wired all the way down, the card has no `MouseRegion` wrapping the header and no keyboard handler. The `onToggle` prop is accepted in `GenericToolCardProps` (line 24 of `generic-tool-card.ts`) but the constructor does not even store it -- notice that `GenericToolCard`'s constructor stores `toolCall`, `isExpanded`, `hideHeader`, and `extraChildren`, but `onToggle` is simply dropped on the floor. The callback is dead on arrival.

## Reference Pattern: CollapsibleDrawer

The codebase already has a working click-to-toggle pattern in `CollapsibleDrawer` (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/collapsible-drawer.ts`). It uses:

- `MouseRegion` wrapping the title bar with `onClick: () => this.toggle()` (line 172-174)
- `FocusScope` wrapping the title bar with `onKey` handler for Enter/Space (lines 178-181, 248-253)
- Internal `_expanded` state managed by `setState` (line 110-113)
- An optional `onChanged` callback to notify the parent (line 112)

This is the canonical pattern for toggle-on-click in this codebase and should be followed closely.

## MouseRegion API

The `MouseRegion` widget at `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/mouse-region.ts` is a `SingleChildRenderObjectWidget` that creates a `RenderMouseRegion`. Key API:

```typescript
new MouseRegion({
  onClick: (event: MouseRegionEvent) => void,   // fired on mouse click
  onEnter: (event: MouseRegionEvent) => void,   // hover enter
  onExit: (event: MouseRegionEvent) => void,    // hover exit
  cursor: string,                                // optional cursor style
  opaque: boolean,                               // blocks hit-testing below (default true)
  child: Widget,                                 // required child to wrap
})
```

The `RenderMouseRegion.handleMouseEvent()` dispatches events to callbacks. The `MouseManager` in flitter-core handles terminal mouse protocol and routes events through the render tree via hit-testing.

## Proposed Solution

The fix requires changes across five layers: `ConversationState`, `ChatView`, `AppStateWidget` (in `app.ts`), `ToolCallWidget`, and the tool header click target. The strategy follows the existing `CollapsibleDrawer` pattern.

### Layer 1: ConversationState -- Add `toggleSingleToolCall(toolCallId)`

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/state/conversation.ts`

Add a method to toggle a single tool call's `collapsed` state by its `toolCallId`. This parallels the existing `toggleToolCalls()` bulk method.

```typescript
/**
 * Toggles the collapsed state of a single tool call by its toolCallId.
 * Unlike toggleToolCalls() which flips all tool calls at once,
 * this allows per-card expand/collapse toggling.
 */
toggleSingleToolCall(toolCallId: string): void {
  const item = this.items.find(
    (i): i is ToolCallItem => i.type === 'tool_call' && i.toolCallId === toolCallId,
  );
  if (item) {
    item.collapsed = !item.collapsed;
  }
}
```

This mutates the item in-place, which is consistent with how `toggleToolCalls()` (line 130-137) and `updateToolCall()` (lines 98-111) already work -- they mutate items directly and rely on the parent calling `setState`/`notifyListeners` to trigger a rebuild.

**Insertion point:** After the existing `toggleToolCalls()` method (after line 137), before `clear()`.

### Layer 2: ChatView -- Accept and Wire an `onToggleToolCall` Callback

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/chat-view.ts`

ChatView is a `StatelessWidget`. It cannot own state or call `setState`. The toggle action must be performed by the parent (`AppStateWidget`), which has access to `AppState.conversation`. ChatView therefore needs to accept a callback prop that the parent provides.

**Change the interface and constructor (lines 36-49):**

```typescript
interface ChatViewProps {
  items: ConversationItem[];
  error?: string | null;
  onToggleToolCall?: (toolCallId: string) => void;  // NEW
}

export class ChatView extends StatelessWidget {
  private readonly items: ConversationItem[];
  private readonly error: string | null;
  private readonly onToggleToolCall?: (toolCallId: string) => void;  // NEW

  constructor(props: ChatViewProps) {
    super({});
    this.items = props.items;
    this.error = props.error ?? null;
    this.onToggleToolCall = props.onToggleToolCall;  // NEW
  }
```

**Change the tool_call instantiation (lines 102-107):**

```typescript
} else if (cur.type === 'tool_call') {
  const toolCallId = cur.toolCallId;  // capture for closure
  turnWidgets.push(new ToolCallWidget({
    toolCall: cur,
    isExpanded: !cur.collapsed,
    onToggle: this.onToggleToolCall
      ? () => this.onToggleToolCall!(toolCallId)
      : undefined,
  }));
  i++;
}
```

The closure captures the specific `toolCallId` so that when invoked, it toggles only that card. The `toolCallId` variable is captured by value in the loop iteration, avoiding the classic closure-over-mutable-variable bug (since `const` is used inside the loop body).

### Layer 3: AppStateWidget -- Provide the Callback

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts`

In `AppStateWidget.build()`, both `ChatView` instantiation sites must pass `onToggleToolCall`:

**Site 1 -- The `Center` branch for empty conversation (line 220-224):**

```typescript
child: new ChatView({
  items,
  error: appState.error,
  onToggleToolCall: (toolCallId: string) => {
    appState.conversation.toggleSingleToolCall(toolCallId);
    this.setState(() => {});
  },
}),
```

**Site 2 -- The `SingleChildScrollView` branch for normal conversation (line 237-240):**

```typescript
child: new ChatView({
  items,
  error: appState.error,
  onToggleToolCall: (toolCallId: string) => {
    appState.conversation.toggleSingleToolCall(toolCallId);
    this.setState(() => {});
  },
}),
```

This follows the exact same pattern used by the `Alt+T` handler at lines 182-186:

```typescript
// Existing Alt+T handler:
if (event.altKey && event.key === 't') {
  appState.conversation.toggleToolCalls();
  this.setState(() => {});
  return 'handled';
}
```

The `setState(() => {})` call triggers a widget rebuild, which re-evaluates `!cur.collapsed` for every tool card and passes the updated `isExpanded` value down.

**Optional DRY improvement:** Extract the callback into a method on `AppStateWidget` to avoid duplicating the closure:

```typescript
// In AppStateWidget:
private handleToggleToolCall = (toolCallId: string) => {
  this.widget.appState.conversation.toggleSingleToolCall(toolCallId);
  this.setState(() => {});
};
```

Then both `ChatView` sites pass `onToggleToolCall: this.handleToggleToolCall`.

### Layer 4: ToolCallWidget -- Forward `onToggle` to ALL Tool Widgets

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-call-widget.ts`

Currently, only the `GenericToolCard` branches (lines 135-146) receive `onToggle`. All specialized tool branches must also receive it. This requires two sub-changes:

**4a. Add `onToggle` to all specialized tool widget props.**

Each specialized tool widget (`ReadTool`, `BashTool`, `EditFileTool`, `GrepTool`, `WebSearchTool`, `TaskTool`, `HandoffTool`, `TodoListTool`, `CreateFileTool`) must accept an optional `onToggle?: () => void` in its props interface and store it. For example, in `ReadTool` at `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/read-tool.ts`:

```typescript
interface ReadToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
  onToggle?: () => void;  // NEW
}

export class ReadTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;  // NEW

  constructor(props: ReadToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;  // NEW
  }
```

The same pattern applies to all nine specialized tool widgets:
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/read-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/bash-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/edit-file-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/create-file-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/grep-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/web-search-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/task-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/handoff-tool.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/todo-list-tool.ts`

**4b. Forward `onToggle` in all switch branches of `ToolCallWidget.build()`.**

Every `new XxxTool({...})` call in the switch statement must include `onToggle: this.onToggle`:

```typescript
// Prefixed tools (line 84):
if (name.startsWith('sa__') || name.startsWith('tb__')) {
  return new TaskTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: this.onToggle });
}

switch (name) {
  case 'Read':
    return new ReadTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: this.onToggle });

  case 'edit_file':
  case 'apply_patch':
  case 'undo_edit':
    return new EditFileTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: this.onToggle });

  case 'create_file':
    return new CreateFileTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: this.onToggle });

  case 'Bash':
  case 'shell_command':
  case 'REPL':
    return new BashTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: this.onToggle });

  case 'Grep':
  case 'glob':
  case 'Glob':
  case 'Search':
    return new GrepTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: this.onToggle });

  case 'WebSearch':
  case 'read_web_page':
    return new WebSearchTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: this.onToggle });

  case 'Task':
  case 'oracle':
  case 'code_review':
  case 'librarian':
    return new TaskTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: this.onToggle });

  case 'handoff':
    return new HandoffTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: this.onToggle });

  case 'todo_list':
  case 'todo_write':
  case 'todo_read':
    return new TodoListTool({ toolCall: this.toolCall, isExpanded: expanded, onToggle: this.onToggle });

  // GenericToolCard cases already pass onToggle (lines 135-146)
}
```

### Layer 5: Make the Header Clickable with MouseRegion

This is the most critical piece. The header of every tool card must become a click target. There are two strategies:

**Strategy A: Wrap at Each Tool Widget's Build Method**

Every tool widget (GenericToolCard, ReadTool, BashTool, etc.) wraps its `header` in a `MouseRegion`:

```typescript
import { MouseRegion } from 'flitter-core/src/widgets/mouse-region';

// Inside build():
const rawHeader = new ToolHeader({
  name: this.toolCall.kind,
  status: this.toolCall.status,
  details,
});

const header = this.onToggle
  ? new MouseRegion({
      onClick: () => this.onToggle!(),
      cursor: 'pointer',
      child: rawHeader,
    })
  : rawHeader;
```

This must be applied in all 10 tool widget build methods.

**Strategy B (Recommended): Centralize in ToolHeader**

Instead of wrapping at every call site, modify `ToolHeader` itself to accept an optional `onToggle` and wrap its own output in a `MouseRegion`. This reduces the surface area of changes and centralizes click handling in one place, following the `CollapsibleDrawer` pattern where the title bar owns its own click handler.

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-header.ts`

**Change the props interface (line 17-22):**

```typescript
interface ToolHeaderProps {
  name: string;
  status: ToolCallItem['status'];
  details?: string[];
  children?: Widget[];
  onToggle?: () => void;  // NEW
}
```

**Update the widget class to store onToggle (lines 37-53):**

```typescript
export class ToolHeader extends StatefulWidget {
  readonly name: string;
  readonly status: ToolCallItem['status'];
  readonly details: string[];
  readonly extraChildren: Widget[];
  readonly onToggle?: () => void;  // NEW

  constructor(props: ToolHeaderProps) {
    super({});
    this.name = props.name;
    this.status = props.status;
    this.details = props.details ?? [];
    this.extraChildren = props.children ?? [];
    this.onToggle = props.onToggle;  // NEW
  }
```

**Wrap the build output in MouseRegion (at the end of `ToolHeaderState.build()`, lines 134-146):**

```typescript
// Current code ends with:
//   if (this.widget.extraChildren.length === 0) {
//     return headerText;
//   }
//   return new Row({...});
//
// Replace with:

let result: Widget;
if (this.widget.extraChildren.length === 0) {
  result = headerText;
} else {
  result = new Row({
    mainAxisSize: 'min',
    children: [headerText, ...this.widget.extraChildren],
  });
}

if (this.widget.onToggle) {
  result = new MouseRegion({
    onClick: () => this.widget.onToggle!(),
    child: result,
  });
}

return result;
```

**Required import in tool-header.ts:**

```typescript
import { MouseRegion } from 'flitter-core/src/widgets/mouse-region';
```

**Then each tool widget passes `onToggle` through to `ToolHeader`:**

```typescript
// In ReadTool, BashTool, GrepTool, etc.:
const header = new ToolHeader({
  name: this.toolCall.kind,
  status: this.toolCall.status,
  details,
  onToggle: this.onToggle,
});
```

**For GenericToolCard specifically:** The `GenericToolCard` currently accepts `onToggle` in its props but never stores it (the constructor on lines 46-52 does not assign it to a field). This must be fixed:

```typescript
export class GenericToolCard extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly hideHeader: boolean;
  private readonly extraChildren: Widget[];
  private readonly onToggle?: () => void;  // NEW -- was accepted but never stored

  constructor(props: GenericToolCardProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.hideHeader = props.hideHeader ?? false;
    this.extraChildren = props.children ?? [];
    this.onToggle = props.onToggle;  // NEW -- actually store the callback
  }
```

Then in `GenericToolCard.build()`, pass `onToggle` to `ToolHeader` (around line 59):

```typescript
const header = this.hideHeader
  ? new SizedBox({})
  : new ToolHeader({
      name: this.toolCall.kind,
      status: this.toolCall.status,
      details,
      onToggle: this.onToggle,  // NEW
    });
```

**Recommendation:** Strategy B is preferable because:
1. It keeps click target logic centralized in `ToolHeader` (single point of change for interaction behavior).
2. It avoids duplicating `MouseRegion` import and wrapping across 10 separate files.
3. It follows the `CollapsibleDrawer` pattern from flitter-core where the title bar widget owns its own click handling (`new MouseRegion({ onClick: () => this.toggle(), child: titleRow })`).
4. Future enhancements (hover highlighting, keyboard focus, cursor changes) only need to be added in one place.

## Files Changed (Summary)

| # | File | Change |
|---|------|--------|
| 1 | `state/conversation.ts` | Add `toggleSingleToolCall(toolCallId: string)` method |
| 2 | `widgets/chat-view.ts` | Add `onToggleToolCall` prop; pass `onToggle` closure to `ToolCallWidget` |
| 3 | `app.ts` | Pass `onToggleToolCall` callback to both `ChatView` instantiation sites |
| 4 | `widgets/tool-call/tool-call-widget.ts` | Forward `onToggle` to all specialized tool widget constructors |
| 5 | `widgets/tool-call/tool-header.ts` | Accept `onToggle` prop; wrap output in `MouseRegion` when present; add import |
| 6 | `widgets/tool-call/generic-tool-card.ts` | Actually store `onToggle` in constructor; forward to `ToolHeader` |
| 7 | `widgets/tool-call/read-tool.ts` | Add `onToggle` to props; store it; forward to `ToolHeader` |
| 8 | `widgets/tool-call/bash-tool.ts` | Add `onToggle` to props; store it; forward to `ToolHeader` |
| 9 | `widgets/tool-call/edit-file-tool.ts` | Add `onToggle` to props; store it; forward to `ToolHeader` |
| 10 | `widgets/tool-call/create-file-tool.ts` | Add `onToggle` to props; store it; forward to `ToolHeader` |
| 11 | `widgets/tool-call/grep-tool.ts` | Add `onToggle` to props; store it; forward to `ToolHeader` |
| 12 | `widgets/tool-call/web-search-tool.ts` | Add `onToggle` to props; store it; forward to `ToolHeader` |
| 13 | `widgets/tool-call/task-tool.ts` | Add `onToggle` to props; store it; forward to `ToolHeader`/`GenericToolCard` |
| 14 | `widgets/tool-call/handoff-tool.ts` | Add `onToggle` to props; store it; forward to `ToolHeader` |
| 15 | `widgets/tool-call/todo-list-tool.ts` | Add `onToggle` to props; store it; forward to `ToolHeader` |

**Total: 15 files touched.**

## Interaction with Existing Bulk Toggle (`Alt+T`)

The per-card toggle and the bulk toggle are complementary. They both mutate the same `ToolCallItem.collapsed` field on the data model. After per-card toggling, the user can still press `Alt+T` to reset all cards to a uniform state (all expanded or all collapsed via `toolCallsExpanded`). This matches the expected Amp CLI behavior where individual cards can be toggled independently, and `Alt+T` acts as a "reset all" operation.

One behavioral nuance: after a user individually expands card A and collapses card B, pressing `Alt+T` will flip the `toolCallsExpanded` boolean and overwrite all per-card states. This is correct and consistent -- the bulk toggle is an intentional override.

Another nuance: `ConversationState.addToolCall()` (line 94) sets `collapsed: !this.toolCallsExpanded`. This means new tool calls arriving after a bulk expand will also start expanded, which is correct. The per-card toggle does not affect `toolCallsExpanded`, so newly arriving tool calls will respect the most recent bulk toggle state, not any individual card's state.

## Detailed Implementation Walkthrough

### Step-by-step execution order for a single click:

1. User clicks on a tool card header row in the terminal.
2. The `MouseManager` in flitter-core receives the terminal mouse event and performs hit-testing on the render tree.
3. The `RenderMouseRegion` inside `ToolHeader` is hit. Its `handleMouseEvent('click', event)` fires.
4. The `onClick` callback invokes `this.widget.onToggle!()`.
5. `onToggle` was set to `() => this.onToggleToolCall!(toolCallId)` by `ChatView`.
6. `onToggleToolCall` was set to the callback from `AppStateWidget`: `(toolCallId) => { appState.conversation.toggleSingleToolCall(toolCallId); this.setState(() => {}); }`.
7. `ConversationState.toggleSingleToolCall(toolCallId)` finds the matching `ToolCallItem` and flips `item.collapsed`.
8. `AppStateWidget.setState(() => {})` marks the widget as dirty and schedules a frame via `BuildOwner.scheduleBuildFor()` -> `FrameScheduler.requestFrame()`.
9. On the next frame, `AppStateWidget.build()` runs, creating a new `ChatView` with the updated items.
10. `ChatView.build()` iterates items. For the toggled tool call, `!cur.collapsed` produces the new `isExpanded` value.
11. `ToolCallWidget` receives the new `isExpanded` and builds either the header-only (collapsed) or the full card (expanded).
12. The render tree updates and the terminal screen is repainted.

### Latency characteristics:

The 50ms throttle in `AppStateWidget._flushUpdate()` (lines 86-96) applies to `AppState.notifyListeners()`, which is used for ACP streaming events. However, the per-card toggle calls `this.setState(() => {})` directly on `AppStateWidget`, which bypasses the throttle and goes straight through `Element.markNeedsRebuild()` -> `BuildOwner.scheduleBuildFor()`. The toggle should feel instantaneous.

## Test Plan

### Unit Tests (state/conversation.ts)

```typescript
describe('ConversationState.toggleSingleToolCall', () => {
  it('should toggle collapsed state of a specific tool call', () => {
    const state = new ConversationState();
    state.addToolCall('tc-1', 'Read file', 'Read', 'completed');
    state.addToolCall('tc-2', 'Run bash', 'Bash', 'completed');

    // Both start collapsed (toolCallsExpanded = false)
    const tc1 = state.items.find(
      i => i.type === 'tool_call' && i.toolCallId === 'tc-1'
    ) as ToolCallItem;
    const tc2 = state.items.find(
      i => i.type === 'tool_call' && i.toolCallId === 'tc-2'
    ) as ToolCallItem;
    expect(tc1.collapsed).toBe(true);
    expect(tc2.collapsed).toBe(true);

    // Toggle only tc-1
    state.toggleSingleToolCall('tc-1');
    expect(tc1.collapsed).toBe(false);
    expect(tc2.collapsed).toBe(true);  // unchanged

    // Toggle tc-1 again
    state.toggleSingleToolCall('tc-1');
    expect(tc1.collapsed).toBe(true);  // back to collapsed
  });

  it('should be a no-op for non-existent toolCallId', () => {
    const state = new ConversationState();
    state.addToolCall('tc-1', 'Read file', 'Read', 'completed');
    state.toggleSingleToolCall('tc-nonexistent');
    // No error thrown, tc-1 unchanged
    const tc1 = state.items.find(
      i => i.type === 'tool_call' && i.toolCallId === 'tc-1'
    ) as ToolCallItem;
    expect(tc1.collapsed).toBe(true);
  });

  it('should not interfere with bulk toggleToolCalls', () => {
    const state = new ConversationState();
    state.addToolCall('tc-1', 'Read file', 'Read', 'completed');
    state.addToolCall('tc-2', 'Run bash', 'Bash', 'completed');

    // Per-card toggle tc-1 to expanded
    state.toggleSingleToolCall('tc-1');
    const tc1 = state.items.find(
      i => i.type === 'tool_call' && i.toolCallId === 'tc-1'
    ) as ToolCallItem;
    const tc2 = state.items.find(
      i => i.type === 'tool_call' && i.toolCallId === 'tc-2'
    ) as ToolCallItem;
    expect(tc1.collapsed).toBe(false);
    expect(tc2.collapsed).toBe(true);

    // Bulk toggle should override both
    state.toggleToolCalls();  // toolCallsExpanded becomes true
    expect(tc1.collapsed).toBe(false);  // already expanded, stays expanded
    expect(tc2.collapsed).toBe(false);  // flipped to expanded

    // Bulk toggle back
    state.toggleToolCalls();  // toolCallsExpanded becomes false
    expect(tc1.collapsed).toBe(true);
    expect(tc2.collapsed).toBe(true);
  });
});
```

### Widget Tree Tests (chat-view.test.ts)

```typescript
describe('ChatView: per-card toggle wiring', () => {
  it('should pass onToggle to ToolCallWidget when onToggleToolCall is provided', () => {
    const toggledIds: string[] = [];
    const items: ConversationItem[] = [
      {
        type: 'tool_call',
        toolCallId: 'tc-1',
        title: 'Read file',
        kind: 'Read',
        status: 'completed' as const,
        collapsed: true,
      },
    ];
    const view = new ChatView({
      items,
      onToggleToolCall: (id) => toggledIds.push(id),
    });
    // Build and verify ToolCallWidget receives an onToggle closure
    // (implementation depends on test harness ability to inspect widget tree)
  });

  it('should not pass onToggle when onToggleToolCall is not provided', () => {
    const items: ConversationItem[] = [
      {
        type: 'tool_call',
        toolCallId: 'tc-1',
        title: 'Read file',
        kind: 'Read',
        status: 'completed' as const,
        collapsed: true,
      },
    ];
    const view = new ChatView({ items });
    // Build and verify ToolCallWidget.onToggle is undefined (backward compatible)
  });
});
```

### ToolHeader MouseRegion Tests

```typescript
describe('ToolHeader: mouse click toggle', () => {
  it('should wrap output in MouseRegion when onToggle is provided', () => {
    let toggled = false;
    const header = new ToolHeader({
      name: 'Read',
      status: 'completed',
      onToggle: () => { toggled = true; },
    });
    // Build with a test context, verify that a MouseRegion is in the widget tree
    // Simulate click event and verify `toggled` becomes true
  });

  it('should render without MouseRegion when onToggle is not provided', () => {
    const header = new ToolHeader({
      name: 'Read',
      status: 'completed',
    });
    // Build with a test context, verify no MouseRegion in the widget tree
    // (backward compatible with existing tests)
  });
});
```

### Integration / Manual Testing

1. Start the TUI with a conversation containing multiple tool calls.
2. Click on a tool card header -- it should expand if collapsed, or collapse if expanded.
3. Click another tool card header -- only that card changes.
4. Press `Alt+T` -- all cards flip to the same state.
5. Click individual cards again -- per-card toggling continues to work.
6. Verify the scroll position does not jump unexpectedly when a card is toggled.
7. Verify that in-progress tool calls (with spinners) can still be toggled.
8. Verify that new tool calls arriving during streaming respect `toolCallsExpanded`.

## Edge Cases

- **Streaming tool call (in_progress):** Toggling should still work. The `BrailleSpinner` animation in `ToolHeader` continues in the header regardless of expanded/collapsed state. The spinner timer is managed by `ToolHeaderState` lifecycle, not by the expanded state.

- **Rapid clicking:** Each click mutates `collapsed` and triggers `setState`. Multiple rapid clicks are safe because `setState` synchronously marks the element dirty, and the next frame processes all pending rebuilds at once. There is no race condition.

- **Empty items list:** The welcome screen branch in `ChatView` has no tool calls, so no toggle wiring is needed there (the callback simply goes unused). The empty-state `ChatView` in the `Center` branch still receives `onToggleToolCall` but it is never invoked.

- **No mouse support in terminal:** If the terminal does not support mouse events (e.g., a basic terminal without mouse protocol), `MouseRegion` is inert -- it still lays out and paints its child normally but never receives click events. The `Alt+T` bulk toggle remains available as the keyboard-only fallback. A future enhancement could add per-card keyboard navigation (e.g., focus on a card header and press Enter/Space), following the `CollapsibleDrawer` pattern which includes `FocusScope` + `onKey` handling.

- **TaskTool delegating to GenericToolCard:** `TaskTool` currently creates a `GenericToolCard` without `onToggle`. After the fix, `TaskTool` must forward `onToggle` to `GenericToolCard`:

  ```typescript
  build(_context: BuildContext): Widget {
    return new GenericToolCard({
      toolCall: this.toolCall,
      isExpanded: this.isExpanded,
      onToggle: this.onToggle,  // NEW
    });
  }
  ```

- **Deprecated `ToolCallBlock` wrapper:** The file at `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call-block.ts` is a deprecated backward-compat wrapper. It does not pass `onToggle` either. If any code still uses it, it will not have per-card toggle. Since it is deprecated, this is acceptable -- callers should migrate to `ToolCallWidget` directly.

## Implementation Priority

The recommended implementation order minimizes breakage at each step:

1. **Layer 1** (ConversationState) -- Pure additive, no existing behavior changes.
2. **Layer 5** (ToolHeader + MouseRegion) -- Add the prop and wrapping, but since nobody passes `onToggle` yet, behavior is unchanged.
3. **Layer 4** (Specialized tools + ToolCallWidget) -- Add `onToggle` props and forwarding. Still no behavioral change since upstream does not provide `onToggle` yet.
4. **Layer 2** (ChatView) -- Wire the callback prop. Still dormant until `AppStateWidget` provides it.
5. **Layer 3** (AppStateWidget) -- Final connection. This is the step that activates everything.

This order ensures that at each step, the existing test suite continues to pass because no existing behavior is altered until the final wiring in step 5.
