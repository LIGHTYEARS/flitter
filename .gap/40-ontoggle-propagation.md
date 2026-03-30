# Gap T02 (#40): `onToggle` Not Propagated to Specialized Renderers

## 1. Problem Summary

The `ToolCallWidget` class in `tool-call-widget.ts` acts as a top-level dispatch router,
selecting one of nine specialized renderers (or a `GenericToolCard` fallback) based on the
tool name. It accepts an `onToggle?: () => void` callback in its props, intended to let
parent widgets react when a user toggles a tool card between expanded and collapsed states.

**The bug:** `onToggle` is only forwarded to `GenericToolCard` instances -- it is silently
dropped for all nine specialized renderers. Any parent widget relying on `onToggle` to manage
expand/collapse state will find that the callback never fires for the most commonly used tools
(Read, Bash, Grep, edit_file, etc.).

## 2. Detailed Analysis

### 2.1 Where `onToggle` Is Defined

File: `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-call-widget.ts`

```typescript
// Line 18-22
interface ToolCallWidgetProps {
  toolCall: ToolCallItem;
  isExpanded?: boolean;
  onToggle?: () => void;
}
```

The callback is stored as a private field at line 69 and assigned in the constructor at
line 75:

```typescript
// Lines 66-76
export class ToolCallWidget extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;

  constructor(props: ToolCallWidgetProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded ?? !props.toolCall.collapsed;
    this.onToggle = props.onToggle;
  }
```

### 2.2 Where `onToggle` Is Forwarded (Only 2 of 12 Branches)

In the `build()` method (lines 78-148), the dispatch switch has 12 distinct return points.
`onToggle` appears in only two of them:

1. **Lines 135-139** -- the explicit `GenericToolCard` branch for utility tools:
   ```typescript
   case 'painter':
   case 'mermaid':
   // ...
     return new GenericToolCard({
       toolCall: this.toolCall,
       isExpanded: expanded,
       onToggle: this.onToggle,   // <-- forwarded
     });
   ```

2. **Lines 142-146** -- the `default` fallback:
   ```typescript
   default:
     return new GenericToolCard({
       toolCall: this.toolCall,
       isExpanded: expanded,
       onToggle: this.onToggle,   // <-- forwarded
     });
   ```

### 2.3 Where `onToggle` Is Dropped (10 Branches)

The following branches silently discard `onToggle`:

| Line(s) | Renderer          | Tool Names                                    |
|---------|-------------------|-----------------------------------------------|
| 83-85   | `TaskTool`        | `sa__*`, `tb__*` (prefix match)               |
| 88-89   | `ReadTool`        | `Read`                                        |
| 91-94   | `EditFileTool`    | `edit_file`, `apply_patch`, `undo_edit`       |
| 96-97   | `CreateFileTool`  | `create_file`                                 |
| 99-102  | `BashTool`        | `Bash`, `shell_command`, `REPL`               |
| 104-108 | `GrepTool`        | `Grep`, `glob`, `Glob`, `Search`              |
| 110-112 | `WebSearchTool`   | `WebSearch`, `read_web_page`                  |
| 114-118 | `TaskTool`        | `Task`, `oracle`, `code_review`, `librarian`  |
| 120-121 | `HandoffTool`     | `handoff`                                     |
| 123-126 | `TodoListTool`    | `todo_list`, `todo_write`, `todo_read`        |

### 2.4 Root Cause in Specialized Renderer Props

Each specialized renderer defines its own narrow props interface containing only `toolCall`
and `isExpanded`. None declare `onToggle`:

- `ReadToolProps` (read-tool.ts, lines 16-19)
- `EditFileToolProps` (edit-file-tool.ts, lines 17-20)
- `BashToolProps` (bash-tool.ts, lines 16-19)
- `GrepToolProps` (grep-tool.ts, lines 16-19)
- `CreateFileToolProps` (create-file-tool.ts, lines 17-20)
- `WebSearchToolProps` (web-search-tool.ts, lines 17-20)
- `TaskToolProps` (task-tool.ts, lines 8-11)
- `HandoffToolProps` (handoff-tool.ts, lines 17-20)
- `TodoListToolProps` (todo-list-tool.ts, lines 17-20)

Because the constructors do not accept `onToggle`, TypeScript prevents passing it in the
dispatch switch -- but since the code simply omits it rather than attempting to pass it,
there is no compile error. The bug is a silent omission.

### 2.5 Special Case: TaskTool Delegates to GenericToolCard

`TaskTool` is unique among the specialized renderers because it delegates to
`GenericToolCard` internally:

```typescript
// task-tool.ts, lines 27-32
build(_context: BuildContext): Widget {
  return new GenericToolCard({
    toolCall: this.toolCall,
    isExpanded: this.isExpanded,
  });
}
```

Even though `GenericToolCard` *does* accept `onToggle`, `TaskTool` cannot forward it because
`TaskTool` itself never receives it. This is a two-level propagation failure.

### 2.6 Impact on Consumers

Looking at the consumer side in `chat-view.ts` (lines 102-106):

```typescript
turnWidgets.push(new ToolCallWidget({
  toolCall: cur,
  isExpanded: !cur.collapsed,
}));
```

Currently `ChatView` does not pass `onToggle`, so the bug has no visible effect *yet*.
However, this makes the `onToggle` prop effectively dead code for specialized tools, and
any future feature (such as gap 39's per-card toggle) that relies on this callback being
propagated will be broken for Read, Bash, Grep, edit_file, and all other specialized tool
types.

The deprecated `ToolCallBlock` wrapper (tool-call-block.ts) similarly does not pass
`onToggle`, compounding the issue.

## 3. Proposed Solution

The fix is a coordinated change across 10 files (9 specialized renderers + the dispatch
switch), with an optional structural improvement to prevent recurrence.

### 3.1 Step 1: Define a Shared Base Props Type

Create a shared base interface that all tool renderer props extend. This is the key
structural improvement that prevents this class of bug from recurring.

**New file or addition to an existing shared types location:**

```typescript
// Recommended: add to tool-call-widget.ts or a new base-tool-props.ts

import type { ToolCallItem } from '../../acp/types';

/**
 * Base props shared by all tool renderers.
 * Any new common prop added here will automatically be required
 * in all specialized renderer constructors.
 */
export interface BaseToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
  onToggle?: () => void;
}
```

### 3.2 Step 2: Update Each Specialized Renderer's Props Interface

Each renderer's props interface should extend `BaseToolProps`. For renderers that have no
extra props, the interface becomes a simple extension:

#### read-tool.ts

```typescript
// BEFORE (lines 16-19):
interface ReadToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}

// AFTER:
import type { BaseToolProps } from './base-tool-props';

interface ReadToolProps extends BaseToolProps {
  // No additional props needed
}
```

#### bash-tool.ts

```typescript
// BEFORE (lines 16-19):
interface BashToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}

// AFTER:
import type { BaseToolProps } from './base-tool-props';

interface BashToolProps extends BaseToolProps {
  // No additional props needed
}
```

#### edit-file-tool.ts

```typescript
// BEFORE (lines 17-20):
interface EditFileToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}

// AFTER:
import type { BaseToolProps } from './base-tool-props';

interface EditFileToolProps extends BaseToolProps {}
```

#### grep-tool.ts

```typescript
// BEFORE (lines 16-19):
interface GrepToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}

// AFTER:
import type { BaseToolProps } from './base-tool-props';

interface GrepToolProps extends BaseToolProps {}
```

#### create-file-tool.ts

```typescript
// BEFORE (lines 17-20):
interface CreateFileToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}

// AFTER:
import type { BaseToolProps } from './base-tool-props';

interface CreateFileToolProps extends BaseToolProps {}
```

#### web-search-tool.ts

```typescript
// BEFORE (lines 17-20):
interface WebSearchToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}

// AFTER:
import type { BaseToolProps } from './base-tool-props';

interface WebSearchToolProps extends BaseToolProps {}
```

#### task-tool.ts

```typescript
// BEFORE (lines 8-11):
interface TaskToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}

// AFTER:
import type { BaseToolProps } from './base-tool-props';

interface TaskToolProps extends BaseToolProps {}
```

#### handoff-tool.ts

```typescript
// BEFORE (lines 17-20):
interface HandoffToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}

// AFTER:
import type { BaseToolProps } from './base-tool-props';

interface HandoffToolProps extends BaseToolProps {}
```

#### todo-list-tool.ts

```typescript
// BEFORE (lines 17-20):
interface TodoListToolProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
}

// AFTER:
import type { BaseToolProps } from './base-tool-props';

interface TodoListToolProps extends BaseToolProps {}
```

#### generic-tool-card.ts

`GenericToolCard` already has `onToggle` in its props. It should also extend `BaseToolProps`
to stay consistent, keeping its extra fields:

```typescript
// BEFORE (lines 21-27):
interface GenericToolCardProps {
  toolCall: ToolCallItem;
  isExpanded: boolean;
  onToggle?: () => void;
  hideHeader?: boolean;
  children?: Widget[];
}

// AFTER:
import type { BaseToolProps } from './base-tool-props';

interface GenericToolCardProps extends BaseToolProps {
  hideHeader?: boolean;
  children?: Widget[];
}
```

### 3.3 Step 3: Store `onToggle` in Each Renderer's Constructor

Each `StatelessWidget`-based renderer needs a new private field and constructor assignment:

**Pattern for StatelessWidget renderers (ReadTool, EditFileTool, BashTool, GrepTool,
CreateFileTool, WebSearchTool, TaskTool, TodoListTool):**

```typescript
export class ReadTool extends StatelessWidget {
  private readonly toolCall: ToolCallItem;
  private readonly isExpanded: boolean;
  private readonly onToggle?: () => void;    // ADD

  constructor(props: ReadToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;           // ADD
  }
  // ...
}
```

**Pattern for StatefulWidget renderer (HandoffTool):**

```typescript
export class HandoffTool extends StatefulWidget {
  readonly toolCall: ToolCallItem;
  readonly isExpanded: boolean;
  readonly onToggle?: () => void;             // ADD

  constructor(props: HandoffToolProps) {
    super({});
    this.toolCall = props.toolCall;
    this.isExpanded = props.isExpanded;
    this.onToggle = props.onToggle;           // ADD
  }
  // ...
}
```

### 3.4 Step 4: Forward `onToggle` in TaskTool's Delegation to GenericToolCard

`TaskTool` delegates to `GenericToolCard` but currently drops `onToggle`. Fix:

```typescript
// task-tool.ts -- BEFORE:
build(_context: BuildContext): Widget {
  return new GenericToolCard({
    toolCall: this.toolCall,
    isExpanded: this.isExpanded,
  });
}

// AFTER:
build(_context: BuildContext): Widget {
  return new GenericToolCard({
    toolCall: this.toolCall,
    isExpanded: this.isExpanded,
    onToggle: this.onToggle,       // Forward to GenericToolCard
  });
}
```

### 3.5 Step 5: Forward `onToggle` in Every Branch of the Dispatch Switch

In `tool-call-widget.ts`, update `build()` to pass `onToggle` to every renderer. Extract
the callback once at the top for readability:

```typescript
build(_context: BuildContext): Widget {
  const rawName = this.toolCall.kind;
  const name = TOOL_NAME_MAP[rawName] ?? rawName;
  const expanded = this.isExpanded;
  const toggle = this.onToggle;              // Extract once

  if (name.startsWith('sa__') || name.startsWith('tb__')) {
    return new TaskTool({
      toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
    });
  }

  switch (name) {
    case 'Read':
      return new ReadTool({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });

    case 'edit_file':
    case 'apply_patch':
    case 'undo_edit':
      return new EditFileTool({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });

    case 'create_file':
      return new CreateFileTool({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });

    case 'Bash':
    case 'shell_command':
    case 'REPL':
      return new BashTool({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });

    case 'Grep':
    case 'glob':
    case 'Glob':
    case 'Search':
      return new GrepTool({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });

    case 'WebSearch':
    case 'read_web_page':
      return new WebSearchTool({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });

    case 'Task':
    case 'oracle':
    case 'code_review':
    case 'librarian':
      return new TaskTool({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });

    case 'handoff':
      return new HandoffTool({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });

    case 'todo_list':
    case 'todo_write':
    case 'todo_read':
      return new TodoListTool({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });

    case 'painter':
    case 'mermaid':
    case 'chart':
    case 'look_at':
    case 'format_file':
    case 'skill':
    case 'get_diagnostics':
      return new GenericToolCard({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });

    default:
      return new GenericToolCard({
        toolCall: this.toolCall, isExpanded: expanded, onToggle: toggle,
      });
  }
}
```

## 4. Complete File Change Inventory

| # | File                                    | Change Description                                         |
|---|-----------------------------------------|------------------------------------------------------------|
| 1 | `base-tool-props.ts` (new)              | Define `BaseToolProps` with `toolCall`, `isExpanded`, `onToggle` |
| 2 | `tool-call-widget.ts`                   | Add `onToggle: toggle` to all 10 specialized constructor calls |
| 3 | `read-tool.ts`                          | Extend `BaseToolProps`, add `onToggle` field + constructor assignment |
| 4 | `edit-file-tool.ts`                     | Extend `BaseToolProps`, add `onToggle` field + constructor assignment |
| 5 | `bash-tool.ts`                          | Extend `BaseToolProps`, add `onToggle` field + constructor assignment |
| 6 | `grep-tool.ts`                          | Extend `BaseToolProps`, add `onToggle` field + constructor assignment |
| 7 | `create-file-tool.ts`                   | Extend `BaseToolProps`, add `onToggle` field + constructor assignment |
| 8 | `web-search-tool.ts`                    | Extend `BaseToolProps`, add `onToggle` field + constructor assignment |
| 9 | `task-tool.ts`                          | Extend `BaseToolProps`, add `onToggle` field + constructor assignment, forward to `GenericToolCard` |
| 10| `handoff-tool.ts`                       | Extend `BaseToolProps`, add `onToggle` readonly field + constructor assignment |
| 11| `todo-list-tool.ts`                     | Extend `BaseToolProps`, add `onToggle` field + constructor assignment |
| 12| `generic-tool-card.ts`                  | Extend `BaseToolProps` (remove duplicate fields from `GenericToolCardProps`) |

All files are located under:
`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/`

## 5. How Renderers Should Consume `onToggle`

Once `onToggle` is available on every renderer, there are two consumption patterns. The
choice depends on how toggle interaction will ultimately be wired (this is the concern of
gap 39, per-card expand/collapse):

### Pattern A: Renderer Wraps Header in a Clickable Region

Each renderer wraps its `ToolHeader` in a `GestureDetector` (or equivalent tap handler):

```typescript
build(context: BuildContext): Widget {
  const header = new ToolHeader({
    name: this.toolCall.kind,
    status: this.toolCall.status,
    details,
  });

  // Wrap the header to make it tappable
  const clickableHeader = this.onToggle
    ? new GestureDetector({ onTap: this.onToggle, child: header })
    : header;

  if (!this.isExpanded) {
    return clickableHeader;
  }

  return new Column({
    mainAxisSize: 'min',
    crossAxisAlignment: 'stretch',
    children: [clickableHeader, ...bodyChildren],
  });
}
```

### Pattern B: ToolHeader Gains Native Toggle Support

If `ToolHeader` is extended to accept `onToggle` directly (a natural follow-up enhancement),
each renderer simply passes it through as a prop:

```typescript
const header = new ToolHeader({
  name: this.toolCall.kind,
  status: this.toolCall.status,
  details,
  onToggle: this.onToggle,    // ToolHeader handles the tap internally
});
```

Pattern B is cleaner because it centralizes the clickable region logic in `ToolHeader`,
avoiding repetition across nine renderers. However, Pattern A can be implemented immediately
without modifying `ToolHeader`.

**Either pattern requires `onToggle` to be available on the renderer instance, which is
exactly what this fix ensures.**

## 6. Behavioral Impact

### Before Fix

- A parent widget passes `onToggle` to `ToolCallWidget`.
- For tools rendered by `GenericToolCard` (painter, mermaid, chart, look_at, format_file,
  skill, get_diagnostics, and any unknown tool), `onToggle` reaches the renderer.
- For all other tools (Read, Bash, Grep, edit_file, apply_patch, undo_edit, create_file,
  WebSearch, read_web_page, Task, oracle, code_review, librarian, handoff, todo_list,
  todo_write, todo_read, sa__*, tb__*), `onToggle` is silently dropped.
- The callback is effectively dead for the most commonly used tool types.

### After Fix

- `onToggle` is uniformly forwarded to every renderer, regardless of tool type.
- Parent widgets that supply `onToggle` to `ToolCallWidget` can rely on it reaching the
  actual renderer for all 35+ tool types.
- This is a prerequisite for per-card expand/collapse (gap 39) to work correctly.

### Backward Compatibility

- All changes are additive (new optional prop). No existing call sites break.
- `GenericToolCard`'s existing `onToggle` behavior is unchanged.
- Renderers that receive `onToggle` but do not yet consume it (because toggle UI is not yet
  wired) simply store it as an unused field -- no functional change until a consumer is added.

## 7. Testing Strategy

### 7.1 Unit Tests

For each specialized renderer, verify `onToggle` is accepted and stored:

```typescript
describe('ReadTool', () => {
  it('accepts and stores onToggle callback', () => {
    const mockToggle = jest.fn();
    const tool = new ReadTool({
      toolCall: mockToolCallItem(),
      isExpanded: false,
      onToggle: mockToggle,
    });
    // Access via reflection or test that it passes through to header
    expect(tool['onToggle']).toBe(mockToggle);
  });

  it('works without onToggle (backward compat)', () => {
    const tool = new ReadTool({
      toolCall: mockToolCallItem(),
      isExpanded: false,
    });
    expect(tool['onToggle']).toBeUndefined();
  });
});
```

Repeat for BashTool, GrepTool, EditFileTool, CreateFileTool, WebSearchTool, TaskTool,
HandoffTool, TodoListTool.

### 7.2 Integration Test: Dispatch Propagation

Verify that `ToolCallWidget` forwards `onToggle` for every tool type:

```typescript
const TOOL_NAMES = [
  'Read', 'edit_file', 'create_file', 'Bash', 'Grep',
  'WebSearch', 'Task', 'handoff', 'todo_list',
  'painter',     // GenericToolCard branch
  'unknown_tool' // default branch
];

for (const toolName of TOOL_NAMES) {
  it(`forwards onToggle for ${toolName}`, () => {
    const mockToggle = jest.fn();
    const widget = new ToolCallWidget({
      toolCall: { ...mockToolCallItem(), kind: toolName },
      onToggle: mockToggle,
    });
    const child = widget.build(mockContext);
    // Verify child has onToggle set
    expect(child['onToggle']).toBe(mockToggle);
  });
}
```

### 7.3 TaskTool Delegation Test

Verify TaskTool forwards `onToggle` to its internal `GenericToolCard`:

```typescript
it('TaskTool forwards onToggle to GenericToolCard', () => {
  const mockToggle = jest.fn();
  const taskTool = new TaskTool({
    toolCall: mockToolCallItem(),
    isExpanded: true,
    onToggle: mockToggle,
  });
  const innerCard = taskTool.build(mockContext);
  expect(innerCard).toBeInstanceOf(GenericToolCard);
  // Verify GenericToolCard received onToggle
});
```

### 7.4 TypeScript Compile-Time Verification

If `BaseToolProps` is adopted (Step 1), adding a new required field to `BaseToolProps`
will produce compile errors in any renderer that does not handle it, and in any dispatch
branch that does not pass it. This provides ongoing structural protection against this
class of omission bug.

## 8. Relationship to Other Gaps

- **Gap 39 (per-card toggle):** Depends on this fix. Gap 39 introduces the UI affordance
  and state management for expand/collapse, but requires `onToggle` to be available on every
  renderer to function. Without this fix, gap 39 would only work for `GenericToolCard`-rendered
  tools.

- **ToolHeader enhancement:** A natural follow-up where `ToolHeader` itself accepts
  `onToggle` and wraps its content in a tap handler. This simplifies the consumption pattern
  (Pattern B above) but is not strictly required for propagation to work.

## 9. Risk Assessment

**Risk: Low.** All changes are additive optional properties. No existing behavior changes.
No new runtime errors possible (the callback is optional and undefined by default). The
TypeScript compiler enforces type safety at every boundary.

**Scope: Moderate.** 10-12 files are touched, but each change is mechanical (add one field
to interface, one field to class, one assignment in constructor, one prop in dispatch call).
The changes are highly uniform and easily reviewable.
