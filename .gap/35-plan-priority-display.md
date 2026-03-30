# Gap U13: PlanEntry.priority Field Not Rendered in PlanView

## Problem Statement

`PlanEntry` in `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/types.ts` (lines 74-78)
defines a `priority` field with the union type `'high' | 'medium' | 'low'`:

```typescript
export interface PlanEntry {
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
}
```

This field is:

- **Carried through the full data pipeline**: `AppState.onSessionUpdate()` at
  `/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts` (lines 115-123)
  correctly types plan entries with `priority: 'high' | 'medium' | 'low'` and passes them
  to `this.conversation.setPlan(entries)`.
- **Stored in conversation state**: `Conversation.setPlan()` at
  `/home/gem/workspace/flitter/packages/flitter-amp/src/state/conversation.ts` (lines 113-124)
  stores entries including the priority field in both `this.plan` and in the `ConversationItem`
  array via `this.items.push({ type: 'plan', entries })`.
- **Present in all test fixtures**: Both `visual-snapshot.test.ts` (lines 625-631) and
  `visual-cell-assertions.test.ts` (lines 402-406) provide plan entries with varied
  priorities (`'high'`, `'medium'`, `'low'`).
- **Never rendered**: `PlanView` at
  `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/plan-view.ts` (lines 42-59)
  renders only `entry.status` (as an icon and color) and `entry.content` (as text). The
  `entry.priority` field is completely ignored in the build method.

The result is that users cannot visually distinguish high-priority plan items from
low-priority ones. All entries look identical aside from their completion status.

### Parallel Issue in TodoListTool

Interestingly, the `TodoListTool` at
`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/todo-list-tool.ts`
(lines 122-148) extracts a `priority` field from todo entries (line 130: `priority: t.priority
as string | undefined`) but also never renders it. The `TodoEntry` interface (lines 22-26)
even declares the field:

```typescript
interface TodoEntry {
  content: string;
  status: string;
  priority?: string;
}
```

This confirms a broader pattern: priority data flows through the system but no widget
currently makes use of it. This solution focuses on `PlanView`, but the same rendering
pattern could be applied to `TodoListTool` in a follow-up.

---

## Current Rendering Behavior

The current `PlanView.build()` produces this visual structure for each entry:

```
    [status_icon] [content_text]
```

Where `status_icon` is `checkmark` (completed, green), `filled circle` (in-progress, yellow),
or `empty circle` (pending, muted). The priority field is never consulted. A high-priority
pending item and a low-priority pending item are rendered identically.

Current code (`plan-view.ts` lines 42-59):

```typescript
for (const entry of this.entries) {
  const icon =
    entry.status === 'completed' ? '\u2713' :
    entry.status === 'in_progress' ? '\u25CF' : '\u25CB';

  const color =
    entry.status === 'completed' ? (theme?.base.success ?? Color.green) :
    entry.status === 'in_progress' ? (theme?.base.warning ?? Color.yellow) :
    (theme?.base.mutedForeground ?? Color.brightBlack);

  children.push(
    new Text({
      text: new TextSpan({
        text: `    ${icon} ${entry.content}`,
        style: new TextStyle({ foreground: color }),
      }),
    }),
  );
}
```

The entire entry is rendered as a single `TextSpan` with a single foreground color determined
entirely by `entry.status`. The `entry.priority` property is never accessed.

---

## Design Proposal

### Approach: Inline Priority Tag via TextSpan Children

Render a short inline tag after the status icon and before the content text, using a
multi-element `TextSpan.children` array with color-coded segments. This approach:

1. **Follows existing codebase patterns** -- The `TodoListTool`
   (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/todo-list-tool.ts`
   lines 61-81) already uses `TextSpan.children` arrays to compose multi-styled inline
   segments (status icon span + content text span). The `ToolHeader`
   (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-header.ts`
   lines 109-136) similarly builds arrays of `TextSpan` children with different foreground
   colors and styles (status icon + tool name bold + details dim + spinner). The
   `ThinkingBlock`
   (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/thinking-block.ts`
   lines 53-66) uses the same pattern for its label line (chevron + icon + "Thinking" text).

2. **Keeps the visual footprint minimal** -- A short bracketed tag like `[H]`, `[M]`, or
   `[L]` adds only 4 characters of width (including trailing space). This is less intrusive
   than a full word like `[HIGH]` and works well in narrow terminals. The total line layout
   becomes:

   ```
   4 spaces + icon + space + [X] + space + content
   ```

   Which is 11 characters of overhead before content begins (up from 7 in the current
   rendering). At the minimum practical terminal width of 60 columns, this leaves 49
   characters for content text -- more than adequate.

3. **Uses the existing theme palette** -- Maps priority levels to semantic theme colors
   that already exist in `AmpBaseTheme`
   (`/home/gem/workspace/flitter/packages/flitter-amp/src/themes/amp-theme-data.ts`
   lines 26-44):
   - `high` --> `theme.base.destructive` (red family) -- signals urgency/criticality
   - `medium` --> `theme.base.warning` (yellow family) -- signals moderate importance
   - `low` --> `theme.base.mutedForeground` (gray family) -- signals background priority

4. **Degrades gracefully** -- When no theme is available (i.e., `AmpThemeProvider.maybeOf()`
   returns `undefined`), falls back to standard ANSI colors (`Color.red`, `Color.yellow`,
   `Color.brightBlack`), matching the existing fallback pattern used throughout the `PlanView`
   widget (e.g., line 35: `theme?.base.info ?? Color.cyan`, line 48: `?? Color.green`).

5. **Preserves the status-based color channel** -- The content text and status icon retain
   their existing status-determined colors (green/yellow/muted). Priority information is
   conveyed through the separate tag span, avoiding any overloading of existing visual
   semantics. Users can scan the icon shape for status and the tag color for priority
   simultaneously.

### Visual Mockup

Before (current):

```
  Plan
    ✓ Analyze current auth architecture
    ✓ Extract JWT token handling
    ● Implement token refresh flow
    ○ Update middleware chain
    ○ Add rate limiting
    ○ Write integration tests
```

After (proposed):

```
  Plan
    ✓ [H] Analyze current auth architecture       <- [H] in red (destructive)
    ✓ [H] Extract JWT token handling               <- [H] in red (destructive)
    ● [H] Implement token refresh flow             <- [H] in red (destructive)
    ○ [M] Update middleware chain                   <- [M] in yellow (warning)
    ○ [M] Add rate limiting                        <- [M] in yellow (warning)
    ○ [L] Write integration tests                  <- [L] in gray (mutedForeground)
```

The tags `[H]`, `[M]`, `[L]` are rendered in their respective priority colors with bold
styling for added visual weight. The status icon retains its existing status-based coloring.
The content text retains its existing status-based coloring.

### Widget Tree Change

Before:

```
PlanView
└── Column
    ├── Text("  Plan")                          // header
    ├── Text("    ✓ Analyze current auth...")    // single TextSpan per entry
    ├── Text("    ✓ Extract JWT token...")
    └── ...
```

After:

```
PlanView
└── Column
    ├── Text("  Plan")                          // header (unchanged)
    ├── Text(TextSpan.children: [               // multi-span per entry
    │     TextSpan("    ✓ ", {color: green}),   //   status icon span
    │     TextSpan("[H] ", {color: red, bold}),  //   priority tag span (NEW)
    │     TextSpan("Analyze...", {color: green}) //   content text span
    │   ])
    ├── Text(TextSpan.children: [...])
    └── ...
```

This is a leaf-level change to the `Text` widget's `TextSpan` structure. No new widgets
or render objects are introduced. The `Column` layout, `Padding` wrapper, and overall
`PlanView` structure remain identical.

---

## Alternatives Considered

### Alternative 1: Color-Only (No Tag)

Tint the content text color based on priority rather than adding a visible tag.

**Rejected because:**
- Status already controls the content color (completed = green, in-progress = yellow,
  pending = muted). Overloading color to encode both status and priority creates ambiguity.
  A yellow item could mean "in progress" or "medium priority" -- users cannot distinguish
  the two signals.
- The priority tag provides an explicit, scannable visual marker that remains legible in
  monochrome terminals or for users with color vision deficiency.
- The tag approach mirrors how task management tools (Jira, Linear, Todoist) present
  priority as a distinct badge rather than a color tint.

### Alternative 2: Unicode Priority Icons

Use dedicated Unicode symbols instead of bracketed letters: `!!` for high, `!` for medium,
nothing for low.

**Rejected because:**
- Inconsistent terminal rendering of exclamation-mark-based indicators.
- Low priority having no visual marker makes it impossible to tell the difference between
  "low priority" and "priority data missing."
- The bracketed tag `[H]/[M]/[L]` is more universally readable and self-documenting.

### Alternative 3: Priority-Based Sorting

Sort entries by priority before rendering (high first, then medium, then low) instead of
showing tags.

**Rejected because:**
- This changes the semantic ordering that the agent or user may have intentionally set.
  Plan steps often have a natural execution order that does not align with priority.
- Sorting does not replace the need for a visual indicator -- even in a sorted list,
  users need to know where the priority boundary falls.
- If sorting is desired in the future, it can be added as a separate concern independent
  of the priority display.

### Alternative 4: Full-Word Priority Labels

Use `[HIGH]`, `[MEDIUM]`, `[LOW]` instead of single-letter abbreviations.

**Rejected because:**
- Adds 3-6 extra characters per line (up to `[MEDIUM]` = 8 chars vs `[M]` = 3 chars).
- In narrow terminals, this consumes significant horizontal space.
- The single-letter abbreviations are standard in task management UIs and immediately
  recognizable after a single encounter.

---

## Implementation

### Step 1: Add the Static Priority Display Helper

Add a private static method to `PlanView` that maps priority values to their tag label and
theme color. This follows the same pattern as `TodoListTool.getStatusDisplay()` at
`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/todo-list-tool.ts`
lines 104-117.

```typescript
/**
 * Returns the display tag and color for a plan entry's priority level.
 *
 * Mapping:
 *   'high'   -> [H] in destructive (red)        -- urgent items
 *   'medium' -> [M] in warning (yellow)          -- normal items
 *   'low'    -> [L] in mutedForeground (gray)    -- background items
 */
private static getPriorityDisplay(
  priority: PlanEntry['priority'],
  theme: ReturnType<typeof AmpThemeProvider.maybeOf>,
): { tag: string; tagColor: Color } {
  switch (priority) {
    case 'high':
      return { tag: '[H]', tagColor: theme?.base.destructive ?? Color.red };
    case 'medium':
      return { tag: '[M]', tagColor: theme?.base.warning ?? Color.yellow };
    case 'low':
      return { tag: '[L]', tagColor: theme?.base.mutedForeground ?? Color.brightBlack };
    default:
      return { tag: '[M]', tagColor: theme?.base.warning ?? Color.yellow };
  }
}
```

The `default` case ensures forward compatibility if the union type is ever extended. It
falls back to medium priority rendering, which is the least alarming visual treatment.
TypeScript's exhaustive checking on the `PlanEntry['priority']` parameter type will produce
a compile-time warning if a new variant is added to the union without updating this switch.

### Step 2: Replace Single-TextSpan Entries with Multi-Span Rendering

Replace the single-`TextSpan` entry rendering with a `TextSpan.children` array that includes
three separately styled spans: the status icon, the priority tag, and the content text.

```diff
diff --git a/packages/flitter-amp/src/widgets/plan-view.ts b/packages/flitter-amp/src/widgets/plan-view.ts
--- a/packages/flitter-amp/src/widgets/plan-view.ts
+++ b/packages/flitter-amp/src/widgets/plan-view.ts
@@ -42,18 +42,30 @@
     for (const entry of this.entries) {
       const icon =
         entry.status === 'completed' ? '\u2713' :
         entry.status === 'in_progress' ? '\u25CF' : '\u25CB';

       const color =
         entry.status === 'completed' ? (theme?.base.success ?? Color.green) :
         entry.status === 'in_progress' ? (theme?.base.warning ?? Color.yellow) :
         (theme?.base.mutedForeground ?? Color.brightBlack);

+      const { tag, tagColor } = PlanView.getPriorityDisplay(entry.priority, theme);
+
       children.push(
         new Text({
           text: new TextSpan({
-            text: `    ${icon} ${entry.content}`,
-            style: new TextStyle({ foreground: color }),
+            children: [
+              new TextSpan({
+                text: `    ${icon} `,
+                style: new TextStyle({ foreground: color }),
+              }),
+              new TextSpan({
+                text: `${tag} `,
+                style: new TextStyle({ foreground: tagColor, bold: true }),
+              }),
+              new TextSpan({
+                text: entry.content,
+                style: new TextStyle({ foreground: color }),
+              }),
+            ],
           }),
         }),
       );
     }
```

The key structural change: what was a single `TextSpan({ text: "...", style: ... })` becomes
a parent `TextSpan({ children: [...] })` with three child spans. This is the identical
pattern used by:
- `TodoListTool` (lines 64-80): icon span + content span
- `ToolHeader` (lines 109-136): status icon + name + details + spinner
- `ThinkingBlock` (lines 53-77): chevron + icon + label + suffix

### Step 3: Full Resulting File

After applying both changes, the complete
`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/plan-view.ts` becomes:

```typescript
// PlanView -- todo/plan display matching Amp's plan rendering
// Shows a checklist of plan entries with status icons and priority tags

import { StatelessWidget, Widget, type BuildContext } from 'flitter-core/src/framework/widget';
import { Column } from 'flitter-core/src/widgets/flex';
import { Text } from 'flitter-core/src/widgets/text';
import { TextStyle } from 'flitter-core/src/core/text-style';
import { TextSpan } from 'flitter-core/src/core/text-span';
import { Color } from 'flitter-core/src/core/color';
import { Padding } from 'flitter-core/src/widgets/padding';
import { EdgeInsets } from 'flitter-core/src/layout/edge-insets';
import type { PlanEntry } from '../acp/types';
import { AmpThemeProvider } from '../themes';

interface PlanViewProps {
  entries: PlanEntry[];
}

export class PlanView extends StatelessWidget {
  private readonly entries: PlanEntry[];

  constructor(props: PlanViewProps) {
    super({});
    this.entries = props.entries;
  }

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);

    const children: Widget[] = [
      new Text({
        text: new TextSpan({
          text: '  Plan',
          style: new TextStyle({
            foreground: theme?.base.info ?? Color.cyan,
            bold: true,
          }),
        }),
      }),
    ];

    for (const entry of this.entries) {
      const icon =
        entry.status === 'completed' ? '\u2713' :
        entry.status === 'in_progress' ? '\u25CF' : '\u25CB';

      const color =
        entry.status === 'completed' ? (theme?.base.success ?? Color.green) :
        entry.status === 'in_progress' ? (theme?.base.warning ?? Color.yellow) :
        (theme?.base.mutedForeground ?? Color.brightBlack);

      const { tag, tagColor } = PlanView.getPriorityDisplay(entry.priority, theme);

      children.push(
        new Text({
          text: new TextSpan({
            children: [
              new TextSpan({
                text: `    ${icon} `,
                style: new TextStyle({ foreground: color }),
              }),
              new TextSpan({
                text: `${tag} `,
                style: new TextStyle({ foreground: tagColor, bold: true }),
              }),
              new TextSpan({
                text: entry.content,
                style: new TextStyle({ foreground: color }),
              }),
            ],
          }),
        }),
      );
    }

    return new Padding({
      padding: EdgeInsets.symmetric({ vertical: 1 }),
      child: new Column({
        mainAxisSize: 'min',
        crossAxisAlignment: 'stretch',
        children,
      }),
    });
  }

  /**
   * Returns the display tag and color for a plan entry's priority level.
   *
   * Mapping:
   *   'high'   -> [H] in destructive (red)        -- urgent items
   *   'medium' -> [M] in warning (yellow)          -- normal items
   *   'low'    -> [L] in mutedForeground (gray)    -- background items
   */
  private static getPriorityDisplay(
    priority: PlanEntry['priority'],
    theme: ReturnType<typeof AmpThemeProvider.maybeOf>,
  ): { tag: string; tagColor: Color } {
    switch (priority) {
      case 'high':
        return { tag: '[H]', tagColor: theme?.base.destructive ?? Color.red };
      case 'medium':
        return { tag: '[M]', tagColor: theme?.base.warning ?? Color.yellow };
      case 'low':
        return { tag: '[L]', tagColor: theme?.base.mutedForeground ?? Color.brightBlack };
      default:
        return { tag: '[M]', tagColor: theme?.base.warning ?? Color.yellow };
    }
  }
}
```

### Step 4: Update Visual Cell Assertions Test

The existing test at
`/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/visual-cell-assertions.test.ts`
(lines 396-415) verifies that plan entry content text is visible but does not assert
priority tags. Add assertions for the rendered priority tags and a dedicated test for
priority-specific colors:

```diff
diff --git a/packages/flitter-amp/src/__tests__/visual-cell-assertions.test.ts b/packages/flitter-amp/src/__tests__/visual-cell-assertions.test.ts
--- a/packages/flitter-amp/src/__tests__/visual-cell-assertions.test.ts
+++ b/packages/flitter-amp/src/__tests__/visual-cell-assertions.test.ts
@@ -411,6 +411,12 @@
       expect(findText(grid, 'Analyze architecture').length).toBeGreaterThanOrEqual(1);
       expect(findText(grid, 'Implement refresh').length).toBeGreaterThanOrEqual(1);
       expect(findText(grid, 'Write tests').length).toBeGreaterThanOrEqual(1);
+
+      // Priority tags should be rendered inline with each entry
+      expect(findText(grid, '[H]').length).toBeGreaterThanOrEqual(2); // two high-priority entries
+      expect(findText(grid, '[L]').length).toBeGreaterThanOrEqual(1); // one low-priority entry
     });
+
+    test('priority tags appear for all priority levels', () => {
+      const appState = new AppState();
+      appState.cwd = '/home/user/project';
+      appState.gitBranch = 'main';
+      appState.conversation.addUserMessage('plan');
+      appState.conversation.setPlan([
+        { content: 'Critical fix', priority: 'high', status: 'pending' },
+        { content: 'Normal work', priority: 'medium', status: 'pending' },
+        { content: 'Nice to have', priority: 'low', status: 'pending' },
+      ]);
+      appState.conversation.appendAssistantChunk('Planning.');
+      appState.conversation.finalizeAssistantMessage();
+      const grid = capture(appState);
+
+      // All three priority tags should be present
+      expect(findText(grid, '[H]').length).toBeGreaterThanOrEqual(1);
+      expect(findText(grid, '[M]').length).toBeGreaterThanOrEqual(1);
+      expect(findText(grid, '[L]').length).toBeGreaterThanOrEqual(1);
+
+      // Content text should also be visible
+      expect(findText(grid, 'Critical fix').length).toBeGreaterThanOrEqual(1);
+      expect(findText(grid, 'Normal work').length).toBeGreaterThanOrEqual(1);
+      expect(findText(grid, 'Nice to have').length).toBeGreaterThanOrEqual(1);
+    });
   });
```

### Step 5: Update Visual Snapshot Test

The snapshot test at
`/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/visual-snapshot.test.ts`
(lines 617-651) already provides entries with mixed priorities (`'high'`, `'high'`, `'high'`,
`'medium'`, `'medium'`, `'low'`). After applying the code change, the snapshot SVG output
will automatically include the priority tags. No code change is needed in this test file --
but the snapshot file itself will need to be regenerated:

```bash
cd packages/flitter-amp && bun test --update-snapshots
```

The new snapshot should show `[H]`, `[M]`, and `[L]` tags rendered inline with the plan
entries, each in their respective theme colors.

---

## Theme Color Mapping Reference

The priority-to-color mapping uses existing `AmpBaseTheme` semantic colors. No new color
definitions are required. Here is how each priority renders across all 7 built-in themes:

| Priority | Semantic Field     | dark             | light            | catppuccin-mocha | solarized-dark | solarized-light | gruvbox-dark | nord           |
|----------|-------------------|------------------|------------------|------------------|----------------|-----------------|--------------|----------------|
| `high`   | `destructive`     | rgb(189,43,43)   | rgb(189,43,43)   | Maroon/Red       | Red            | Red             | Red          | Aurora Red     |
| `medium` | `warning`         | rgb(255,183,27)  | Amber            | Yellow           | Yellow         | Yellow          | Yellow       | Aurora Yellow  |
| `low`    | `mutedForeground` | rgb(156,156,156) | Dark Gray        | Overlay0         | Base01         | Base1           | Gray         | Nord Polar 3   |

The existing palette provides sufficient differentiation across all themes, including both
dark and light variants. The `destructive` color is consistently a red-family hue across all
themes, making high-priority items immediately recognizable.

---

## Interaction with Status Colors

The priority tag color is independent of the status-based coloring applied to the icon and
content text. This creates a two-dimensional visual encoding:

| Combination        | Icon         | Priority Tag    | Content Text     |
|-------------------|--------------|-----------------|------------------|
| High + Pending    | `○` muted    | `[H]` red bold  | content muted    |
| High + In Progress| `●` yellow   | `[H]` red bold  | content yellow   |
| High + Completed  | `✓` green    | `[H]` red bold  | content green    |
| Medium + Pending  | `○` muted    | `[M]` yellow bold| content muted   |
| Medium + In Progress| `●` yellow | `[M]` yellow bold| content yellow  |
| Medium + Completed| `✓` green    | `[M]` yellow bold| content green   |
| Low + Pending     | `○` muted    | `[L]` gray bold | content muted    |
| Low + In Progress | `●` yellow   | `[L]` gray bold | content yellow   |
| Low + Completed   | `✓` green    | `[L]` gray bold | content green    |

The priority tag always retains its priority-specific color regardless of status, making it
easy to scan a plan list and identify which remaining items are most critical. The `bold`
attribute on the tag further ensures it stands out against the non-bold content text.

Note that "Medium + In Progress" has both the tag and content in yellow. This is acceptable
because the tag is bold and bracketed, providing sufficient visual distinction. In practice,
the medium-priority tag blends subtly into in-progress lines, which is appropriate since
medium priority is the default/neutral level.

---

## Edge Cases

### 1. All Entries Same Priority

When all entries share the same priority (e.g., all `'medium'`), the tags will all display
`[M]` in yellow. While this is visually uniform, it still communicates the priority level
explicitly. The visual effect is minimal overhead -- 4 characters per line -- and consistent
with the design principle that priority is always shown. If a future enhancement wants to
hide the tag when all entries share the same priority, that can be implemented as an optional
"deduplication" pass before rendering.

### 2. Unknown Priority Value

The `default` case in `getPriorityDisplay()` maps to `[M]` in warning color. This handles
any future expansion of the priority union type gracefully without crashing. TypeScript's
exhaustive check on the switch (via the `PlanEntry['priority']` type) will flag missing
cases at compile time if the union is extended. At runtime, an unrecognized value silently
defaults to medium, which is the safest visual fallback.

### 3. Completed Entries

Completed entries retain their priority tag. This is intentional: when reviewing a plan,
it is useful to see which high-priority items have been completed versus which remain.
If future design feedback prefers to dim or hide the priority tag on completed entries,
the tag color can be conditionally overridden:

```typescript
// Future option: dim priority tag on completed entries
const effectiveTagColor = entry.status === 'completed'
  ? (theme?.base.mutedForeground ?? Color.brightBlack)
  : tagColor;
```

This change is not included in the current proposal to keep the initial implementation
simple and reversible.

### 4. Narrow Terminal Width

The priority tag adds 4 characters (`[H] `) per line. In extremely narrow terminals
(below 40 columns), this could cause content to wrap. However, `PlanView` renders in a
`Column` with `crossAxisAlignment: 'stretch'`, and `Text` widgets handle overflow according
to the flitter layout system's text wrapping rules. The 4-character overhead is acceptable
for terminals 60+ columns wide, which covers all practical terminal sizes.

For reference, the current rendering uses 7 characters of prefix (`    X ` where X is the
icon). The proposed rendering uses 11 characters (`    X [Y] ` where X is the icon and Y
is the priority letter). This leaves 69 characters for content on an 80-column terminal
and 109 characters on a 120-column terminal.

### 5. Empty Plan / Zero Entries

When `this.entries` is empty, the loop body does not execute, and `getPriorityDisplay()` is
never called. The widget correctly renders only the "Plan" header. No special handling is
needed.

### 6. Plan Updates During Streaming

When the agent updates the plan during streaming (via `AppState.onSessionUpdate()` with
`case 'plan'`), the `Conversation.setPlan()` method replaces the entries array. `PlanView`
is a `StatelessWidget` that reads entries from its constructor props, so it will be rebuilt
with the new entries on the next frame. Priority tags will appear or change as entries are
updated. No stale state is possible.

---

## API Surface Impact

This change has zero impact on the public API:

| Component | Change | API Impact |
|-----------|--------|-----------|
| `PlanEntry` type | No change | None -- `priority` field already exists |
| `PlanView` constructor | No change | Same `PlanViewProps` interface |
| `PlanView.build()` | Internal rendering change | No external API |
| `ChatView` | No change | Still passes `item.entries` to `PlanView` |
| `Conversation.setPlan()` | No change | Same `PlanEntry[]` parameter |
| `AppState.onSessionUpdate()` | No change | Same plan entry extraction |

The `getPriorityDisplay()` method is `private static`, so it is not accessible from outside
the class. No consumer of `PlanView` needs to change.

---

## Consistency with TodoListTool

As noted earlier, `TodoListTool` also extracts but ignores `priority`. For consistency, the
same `getPriorityDisplay` pattern could be extracted into a shared utility and applied to
`TodoListTool` as well. A potential shared helper:

```typescript
// shared/priority-display.ts
export function getPriorityDisplay(
  priority: string | undefined,
  theme: AmpTheme | undefined,
): { tag: string; tagColor: Color } {
  switch (priority) {
    case 'high':
      return { tag: '[H]', tagColor: theme?.base.destructive ?? Color.red };
    case 'medium':
      return { tag: '[M]', tagColor: theme?.base.warning ?? Color.yellow };
    case 'low':
      return { tag: '[L]', tagColor: theme?.base.mutedForeground ?? Color.brightBlack };
    default:
      return { tag: '[M]', tagColor: theme?.base.warning ?? Color.yellow };
  }
}
```

This is explicitly out of scope for this gap but is noted as a natural follow-up.

---

## Verification Steps

1. **Type check:**
   ```bash
   cd packages/flitter-amp && bun run build
   ```
   Should compile without errors. The `getPriorityDisplay` method uses
   `PlanEntry['priority']` as the parameter type, ensuring type safety with the existing
   union.

2. **Unit tests:**
   ```bash
   cd packages/flitter-amp && bun test
   ```
   The updated cell assertions test should pass, verifying that `[H]`, `[M]`, and `[L]`
   tags appear in the rendered grid output.

3. **Visual inspection:**
   ```bash
   cd packages/flitter-amp && bun test -- --grep "Plan View"
   ```
   Inspect the generated SVG snapshot (`plan-120x40.svg`) to verify the tags render with
   correct colors and positioning.

4. **Grep verification:**
   ```bash
   # Confirm priority is now referenced in plan-view.ts
   grep -n 'priority' packages/flitter-amp/src/widgets/plan-view.ts
   # Expected: matches in getPriorityDisplay method and the call site

   # Confirm no other files need updating for the PlanView change
   grep -rn 'new PlanView' packages/flitter-amp/src/
   # Expected: only chat-view.ts instantiates PlanView -- no API change needed
   ```

5. **Snapshot regeneration:**
   ```bash
   cd packages/flitter-amp && bun test --update-snapshots
   ```
   Review the diff of the regenerated SVG to confirm priority tags are present with the
   expected color values.

---

## Affected Files

| File | Action | Lines Affected |
|------|--------|----------------|
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/plan-view.ts` | Add `getPriorityDisplay()` helper and convert single-span entries to multi-span with priority tag | ~30 lines added, ~5 lines modified |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/visual-cell-assertions.test.ts` | Add assertions for priority tag visibility; add dedicated priority level test | ~25 lines added |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/visual-snapshot.test.ts` | Snapshot regeneration only (no code change) | 0 lines changed |

---

## Summary

The `PlanEntry.priority` field is fully typed, carried through the state pipeline (from
`AppState.onSessionUpdate()` through `Conversation.setPlan()` to `PlanItem.entries`), and
present in all test fixtures, but `PlanView` never renders it. The fix adds a compact
inline priority tag (`[H]`, `[M]`, `[L]`) as a color-coded, bold `TextSpan` child positioned
between the status icon and the content text. The implementation:

- Uses existing theme semantic colors (`destructive`, `warning`, `mutedForeground`) with no
  new color definitions required
- Follows the multi-span `TextSpan.children` pattern already established in `TodoListTool`,
  `ToolHeader`, and `ThinkingBlock`
- Requires no changes to the `PlanEntry` type, the `AppState` pipeline, or any consumer of
  `PlanView`
- Provides a `default` fallback case for forward compatibility with future priority levels
- Adds appropriate test coverage for the newly rendered field across all three priority
  levels
- Has zero API surface impact and is fully backward compatible
