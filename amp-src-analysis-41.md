# Analysis 41: Divider Widgets, Collapsible/Expandable Containers, and Drawer Widgets

## 1. All Divider/Separator Widgets Found

The flitter codebase contains several distinct approaches to visual separation between content areas, spanning from a dedicated `Divider` widget to lower-level border-painting utilities and structural spacing via `SizedBox`/`Spacer`.

### 1.1 `Divider` Widget (`flitter-core/src/widgets/divider.ts`)

The primary divider widget is a `LeafRenderObjectWidget` backed by `RenderDivider`. It is a purpose-built horizontal line separator.

**File:** `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/divider.ts`

```typescript
export class Divider extends LeafRenderObjectWidget {
  readonly color?: Color;

  constructor(opts?: { key?: Key; color?: Color }) {
    super(opts?.key !== undefined ? { key: opts.key } : undefined);
    this.color = opts?.color;
  }

  createRenderObject(): RenderDivider {
    return new RenderDivider(this.color);
  }

  updateRenderObject(renderObject: RenderObject): void {
    if (renderObject instanceof RenderDivider) {
      renderObject.color = this.color;
    }
  }
}
```

Key characteristics:
- It is a leaf widget (no children).
- It accepts an optional `Color` for the line.
- It delegates rendering to `RenderDivider`.
- It is exported from the public API in `flitter-core/src/index.ts` (indirectly, via other modules that import it).

### 1.2 `RenderDivider` Render Object (`flitter-core/src/widgets/divider.ts`)

The render object handles layout and painting of the horizontal rule.

```typescript
export class RenderDivider extends RenderBox {
  performLayout(): void {
    const constraints = this.constraints!;
    const width = constraints.hasBoundedWidth ? constraints.maxWidth : 80;
    this.size = constraints.constrain(new Size(width, 1));
  }

  paint(context: PaintContext, offset: Offset): void {
    const ctx = context as DividerPaintContext;
    if (!ctx.setChar) return;
    const style = this._color ? { fg: this._color } : undefined;
    for (let x = 0; x < this.size.width; x++) {
      ctx.setChar(offset.col + x, offset.row, '\u2500', style);
    }
  }
}
```

Layout behavior:
- Takes the **full available width** from constraints (falls back to 80 if unbounded).
- Height is always **1 row**.
- The size is then constrained through `constraints.constrain()`.

### 1.3 `drawHorizontalDivider` and `drawVerticalDivider` (Border Painter Utilities)

**File:** `/home/gem/workspace/flitter/packages/flitter-core/src/painting/border-painter.ts`

These are lower-level painting functions used internally by `RenderGridBorder` (the render object for `GridBorder`). They are not widgets themselves, but imperative drawing routines.

```typescript
export function drawHorizontalDivider(ctx, x, y, width, opts?) { ... }
export function drawVerticalDivider(ctx, x, y, height, opts?) { ... }
```

- `drawHorizontalDivider` produces: `├───────┤` (teeRight + horizontal fill + teeLeft)
- `drawVerticalDivider` produces a vertical column of `┬`, `│` (repeated), `┴`

These are used by `drawGridBorder()` which orchestrates full grid borders with internal separators and cross-junctions.

### 1.4 Markdown Horizontal Rule Rendering

**File:** `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/markdown.ts`

The Markdown widget parses `---`, `***`, and `___` lines (3+ of the same character) as `horizontal-rule` block types, and renders them by instantiating a `Divider` widget:

```typescript
private _renderHorizontalRule(themeData?: ThemeData): Widget {
  return new Divider({ color: themeData?.border ?? Color.brightBlack });
}
```

This means Markdown horizontal rules and standalone `Divider` widgets produce identical visual output, which is a strong design consistency.

### 1.5 Markdown Table Separator Row

Within `Markdown._renderTable()`, table headers are separated from body rows using a manually constructed text separator:

```typescript
const sepCells = colWidths.map((w) => '\u2500'.repeat(w));
const sepText = '  ' + sepCells.join('\u2500\u253c\u2500');
```

This produces a line like `──┼──┼──` using the horizontal box-drawing character (`U+2500`) and the cross junction (`U+253C`). This is not a `Divider` widget instance; it is a `Text` widget with box-drawing content.

### 1.6 `Table` Widget with `showDividers`

**File:** `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/table.ts`

The simple `Table` widget has a `showDividers` boolean option. When enabled, it inserts `Divider` widgets between rows:

```typescript
if (this.showDividers && i < this.items.length - 1) {
  children.push(new Divider());
}
```

This is the only usage of `Divider` as an inter-row separator within a data display widget.

### 1.7 `SizedBox` as Structural Spacer

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/chat-view.ts`

The `ChatView` uses `SizedBox({ height: 1 })` as a structural separator between conversation items:

```typescript
if (children.length > 0) {
  children.push(new SizedBox({ height: 1 }));
}
```

This is purely empty space (no drawn line), serving as a visual gap between user messages and assistant turns.

### 1.8 `GridBorder` Internal Dividers

**File:** `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/grid-border.ts`

The `GridBorder` widget, used by the `PromptBar`, contains internal vertical and horizontal dividers between panes. These are painted by the `RenderGridBorder` render object using the `drawGridBorder()` utility function.

---

## 2. Collapsible/Expandable Container Implementations

### 2.1 `CollapsibleDrawer` (flitter-core)

**File:** `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/collapsible-drawer.ts`

This is the primary collapsible container in the framework. It is a `StatefulWidget` with `CollapsibleDrawerState`.

**Constructor options:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `Widget` | required | The always-visible title bar widget |
| `child` | `Widget` | required | The content shown when expanded |
| `expanded` | `boolean` | `false` | Initial expanded state |
| `onChanged` | `(boolean) => void` | undefined | Callback on state change |
| `maxContentLines` | `number` | undefined | Truncate content if set |
| `showViewAll` | `boolean` | `true` | Show "[View all]" link when truncated |
| `spinner` | `boolean` | `false` | Show braille spinner animation |

**Build output:**
- **Collapsed**: Returns a `FocusScope` wrapping a `MouseRegion` wrapping a `Row` containing `[spinner?, indicator, Expanded(title)]`. The indicator is `\u25B6` (right-pointing triangle).
- **Expanded**: Returns a `Column` with `[focusedTitleBar, content]`. The indicator changes to `\u25BC` (downward-pointing triangle). Content is either the child directly, or wrapped in `SizedBox` + `ClipRect` if `maxContentLines` is set.

### 2.2 `ThinkingBlock` (flitter-amp)

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/thinking-block.ts`

A `StatelessWidget` that displays thinking/reasoning content. It uses the `collapsed` property from the data model (`ThinkingItem`) directly -- it does not manage its own expand/collapse state.

```typescript
const chevron = item.collapsed ? '\u25B6' : '\u25BC';
// ...
if (!item.collapsed && item.text.length > 0) {
  // render content
}
```

Visual states:
- **Streaming**: Magenta `●` dot, accent color
- **Completed**: Green `\u2713` (checkmark)
- **Cancelled/Empty**: Yellow, with `(interrupted)` suffix

When expanded, content is shown with dim, italic styling, padded 2 columns on each side, and truncated at 10,000 characters with an ellipsis.

### 2.3 `GenericToolCard` (flitter-amp)

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/generic-tool-card.ts`

A `StatelessWidget` that serves as the default renderer for all tool types. It accepts an `isExpanded` boolean prop.

```typescript
if (!this.isExpanded) {
  return header;
}
```

When collapsed, it returns only the `ToolHeader`. When expanded, it wraps the header and body in a `StickyHeader`, with the body containing input text, diff views or markdown output, and any extra children.

### 2.4 `BashTool` and Other Specialized Tool Widgets (flitter-amp)

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/bash-tool.ts`

Each specialized tool widget (`BashTool`, `ReadTool`, `EditFileTool`, `GrepTool`, `CreateFileTool`, `WebSearchTool`, `TaskTool`, `HandoffTool`, `TodoListTool`) follows the same pattern: accept `isExpanded` as a prop and conditionally render body content.

```typescript
if (!this.isExpanded) {
  return header;
}
// ... build body children
return new Column({
  mainAxisSize: 'min',
  crossAxisAlignment: 'stretch',
  children: [header, ...bodyChildren],
});
```

### 2.5 `ToolCallBlock` (Deprecated Wrapper)

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call-block.ts`

A deprecated backward-compatibility wrapper that delegates to `ToolCallWidget`. It reads `collapsed` from the data model and inverts it for `isExpanded`:

```typescript
return new ToolCallWidget({
  toolCall: this.item,
  isExpanded: !this.item.collapsed,
});
```

---

## 3. How Expand/Collapse State Is Managed

There are two distinct state management approaches in this codebase:

### 3.1 Internal State (CollapsibleDrawer)

`CollapsibleDrawer` uses `CollapsibleDrawerState`, a proper `State` subclass. The state is managed internally via `setState()`:

```typescript
toggle(): void {
  this.setState(() => {
    this._expanded = !this._expanded;
    this.widget.onChanged?.(this._expanded);
  });
}
```

The state synchronizes with the widget prop only when it changes externally:

```typescript
didUpdateWidget(oldWidget: CollapsibleDrawer): void {
  if (oldWidget.expanded !== this.widget.expanded) {
    this._expanded = this.widget.expanded;
  }
}
```

This means locally toggled state persists across widget rebuilds as long as the parent does not change the `expanded` prop. This is tested explicitly in the test suite:

```typescript
test('didUpdateWidget does not change expanded when widget prop is unchanged', () => {
  // Toggle to true manually (state diverges from widget prop)
  state.toggle();
  expect(state.expanded).toBe(true);
  // Update with same expanded=false - state persists
  updateWidget(state, widget2);
  expect(state.expanded).toBe(true);
});
```

### 3.2 External State (Data Model-Driven)

All amp-layer widgets (`ThinkingBlock`, `GenericToolCard`, `BashTool`, etc.) use the **data model** to determine expand/collapse state. The `ToolCallItem` and `ThinkingItem` interfaces both have a `collapsed: boolean` field:

```typescript
export interface ToolCallItem {
  // ...
  collapsed: boolean;
}

export interface ThinkingItem {
  // ...
  collapsed: boolean;
}
```

The `ChatView` reads this field and passes it through:

```typescript
turnWidgets.push(new ToolCallWidget({
  toolCall: cur,
  isExpanded: !cur.collapsed,
}));
```

The `ToolCallWidget` dispatcher then propagates `isExpanded` to each specialized tool widget. State changes must be made at the data model level (e.g., by the ACP session manager), not within the widget tree. This is a "controlled component" pattern.

### 3.3 Comparison of Approaches

| Aspect | CollapsibleDrawer | Tool/Thinking Blocks |
|--------|-------------------|----------------------|
| State location | Internal (`State`) | External (data model) |
| Toggle mechanism | `setState()` + `onChanged` callback | Data model mutation + rebuild |
| Keyboard support | Enter/Space | None (stateless) |
| Mouse support | Click on title bar | None in widget itself |
| Bidirectional sync | Yes (via `didUpdateWidget`) | N/A (read-only prop) |

---

## 4. Animation of Expand/Collapse

### 4.1 No Transition Animations

Notably, there are **no smooth expand/collapse animations** (no height interpolation, no tweening, no `AnimationController`). The transition between collapsed and expanded is **instantaneous**: the widget tree simply rebuilds with or without the content area.

- Collapsed: only the title/header is in the widget tree.
- Expanded: a `Column` with both the title/header and the content body.

This is consistent with a TUI environment where smooth animations at sub-character granularity are generally impractical.

### 4.2 Spinner Animations

The `CollapsibleDrawer` supports a **braille spinner** animation to indicate ongoing work:

```typescript
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
```

The spinner is driven by a `setInterval` timer at 200ms per frame:

```typescript
private _startSpinner(): void {
  this._spinnerTimer = setInterval(() => {
    this.setState(() => {
      this._spinnerFrame++;
    });
  }, 200);
}
```

The `ToolHeader` uses a separate `BrailleSpinner` utility class with a faster 100ms tick:

```typescript
this.timer = setInterval(() => {
  this.setState(() => {
    this.spinner.step();
  });
}, 100);
```

Both spinner mechanisms are lifecycle-managed: started in `initState()` or `didUpdateWidget()`, and cleaned up in `dispose()`.

### 4.3 Content Truncation (Progressive Disclosure)

While not an animation per se, `CollapsibleDrawer` supports a form of progressive disclosure via `maxContentLines`. When set, content is wrapped in a `SizedBox` + `ClipRect` combination to limit visible rows:

```typescript
new SizedBox({
  height: this.widget.maxContentLines,
  child: new ClipRect({ child: this.widget.child }),
}),
```

A clickable `[View all]` link (styled with underline and primary color) allows revealing full content:

```typescript
new MouseRegion({
  onClick: () => {
    this.setState(() => { this._showAll = true; });
  },
  child: new Text({
    text: new TextSpan({
      text: '  [View all]',
      style: new TextStyle({
        foreground: themeData?.primary ?? Color.cyan,
        underline: true,
      }),
    }),
  }),
}),
```

---

## 5. Visual Rendering of Dividers (Characters Used)

### 5.1 Unicode Box-Drawing Characters

The codebase uses Unicode box-drawing characters extensively. Here is a comprehensive inventory:

| Character | Unicode | Name | Used In |
|-----------|---------|------|---------|
| `─` | U+2500 | Box Drawings Light Horizontal | `Divider`, `drawHorizontalDivider`, Markdown table separator |
| `│` | U+2502 | Box Drawings Light Vertical | `drawVerticalDivider`, grid borders |
| `┌` | U+250C | Box Drawings Light Down and Right | Solid border TL |
| `┐` | U+2510 | Box Drawings Light Down and Left | Solid border TR |
| `└` | U+2514 | Box Drawings Light Up and Right | Solid border BL |
| `┘` | U+2518 | Box Drawings Light Up and Left | Solid border BR |
| `├` | U+251C | Box Drawings Light Vertical and Right | `drawHorizontalDivider` left T-junction |
| `┤` | U+2524 | Box Drawings Light Vertical and Left | `drawHorizontalDivider` right T-junction |
| `┬` | U+252C | Box Drawings Light Down and Horizontal | `drawVerticalDivider` top T-junction |
| `┴` | U+2534 | Box Drawings Light Up and Horizontal | `drawVerticalDivider` bottom T-junction |
| `┼` | U+253C | Box Drawings Light Vertical and Horizontal | Grid border cross, Markdown table separator |
| `╭` | U+256D | Box Drawings Light Arc Down and Right | Rounded border TL |
| `╮` | U+256E | Box Drawings Light Arc Down and Left | Rounded border TR |
| `╰` | U+2570 | Box Drawings Light Arc Up and Right | Rounded border BL |
| `╯` | U+256F | Box Drawings Light Arc Up and Left | Rounded border BR |

### 5.2 Indicator Characters for Expand/Collapse

| Character | Unicode | Name | Meaning |
|-----------|---------|------|---------|
| `▶` | U+25B6 | Black Right-Pointing Triangle | Collapsed (content hidden) |
| `▼` | U+25BC | Black Down-Pointing Triangle | Expanded (content visible) |
| `✓` | U+2713 | Check Mark | Tool/thinking completed |
| `✗` | U+2717 | Ballot X | Tool failed |
| `⋯` | U+22EF | Midline Horizontal Ellipsis | Tool in-progress/pending |
| `●` | U+25CF | Black Circle | Thinking streaming |

### 5.3 Border Style Variants

Two box-drawing styles are supported through the `BOX_DRAWING` constant:
- **`rounded`**: Uses arc corners (`╭╮╰╯`) for a softer appearance
- **`solid`**: Uses right-angle corners (`┌┐└┘`) for a traditional look

Both styles share identical horizontal, vertical, junction, and cross characters.

---

## 6. Usage Patterns in the Amp Application

### 6.1 Chat View Conversation Layout

The `ChatView` widget orchestrates all conversation rendering. It groups items into user messages (wrapped in `StickyHeader` with "You" label and green left border) and assistant turns (thinking blocks, markdown, tool calls).

Between each top-level group, `SizedBox({ height: 1 })` provides visual separation -- no `Divider` widgets are used at this level.

### 6.2 Tool Call Expand/Collapse Flow

The data flow for tool call collapse state is:

```
ACP Data Model (ToolCallItem.collapsed)
  -> ChatView (reads `!cur.collapsed`)
    -> ToolCallWidget (receives `isExpanded`)
      -> Dispatch to specialized tool (BashTool, ReadTool, etc.)
        -> if !isExpanded: return header only
        -> if isExpanded: return Column([header, ...body])
```

The `ToolCallWidget` dispatcher normalizes tool names through `TOOL_NAME_MAP` (handling 20+ aliases) before routing to one of 9 specialized renderers or the `GenericToolCard` fallback.

### 6.3 Thinking Block Collapse Flow

```
ACP Data Model (ThinkingItem.collapsed)
  -> ChatView (creates ThinkingBlock)
    -> ThinkingBlock reads item.collapsed
      -> Collapsed: chevron ▶ + status icon + "Thinking" label
      -> Expanded: chevron ▼ + status icon + "Thinking" label + padded dim italic text
```

### 6.4 StickyHeader for Pinned Scroll Headers

The `StickyHeader` widget pins role labels ("You") to the viewport top during scrolling, with push-away behavior when the next section arrives. This is used for:
- User messages: `StickyHeader({ header: "You" label, body: message })`
- Assistant turns: `StickyHeader({ header: SizedBox.shrink(), body: Column(turnWidgets) })`
- Tool calls (via GenericToolCard): `StickyHeader({ header: ToolHeader, body: bodyColumn })`

### 6.5 Markdown Rendering of Dividers

When assistant messages contain markdown with `---` or `***` or `___` horizontal rules, they are parsed into `horizontal-rule` block type and rendered as `Divider({ color: themeData?.border ?? Color.brightBlack })`.

---

## 7. Code Patterns and Observations

### 7.1 Stateless vs. Stateful Expand/Collapse

A notable architectural decision is the split between `CollapsibleDrawer` (which manages its own state) and the amp-layer tool/thinking blocks (which are stateless and derive their state from the data model). This suggests:

- `CollapsibleDrawer` was designed as a reusable core framework widget suitable for any context where local toggle state is appropriate.
- The amp application chose to centralize collapse state in its data model, making the widgets pure renderers of external state. This simplifies reasoning about state but means toggle interactions must be handled at a higher level (the ACP session manager or similar controller).

### 7.2 Consistent Indicator Convention

All collapsible elements use the same visual language:
- `\u25B6` (right triangle) for collapsed
- `\u25BC` (down triangle) for expanded

This convention is shared between `CollapsibleDrawer`, `ThinkingBlock`, and implicitly by any widget that would use `CollapsibleDrawer` as its base.

### 7.3 Divider as a Pure Leaf

The `Divider` widget is a pure `LeafRenderObjectWidget`, meaning it has no children and paints directly. This is the simplest possible widget architecture, matching the pattern used by `Text` and other leaf widgets. The decision to use `setChar` for character-by-character painting (rather than a drawText approach) is consistent with the TUI rendering model where each cell is individually addressable.

### 7.4 Fallback Width of 80

When `RenderDivider` encounters unbounded width constraints (`Infinity`), it defaults to 80 characters. This is a reasonable terminal default that prevents infinite loops in the paint method while providing a sensible display width.

### 7.5 Color Propagation via Theme

`Divider` accepts an explicit `color` prop but can also inherit from theme data when used through `Markdown._renderHorizontalRule()` which passes `themeData?.border ?? Color.brightBlack`. The `CollapsibleDrawer` uses `Theme.maybeOf(context)` for indicator and interactive element colors. This is consistent theming throughout.

### 7.6 Test Coverage

The `CollapsibleDrawer` has extensive test coverage (720+ lines in `collapsible-drawer.test.ts`) covering:
- Constructor defaults and all-options construction
- State initialization and toggle mechanics
- `didUpdateWidget` synchronization behavior
- Keyboard handling (Enter/Space toggle, other keys ignored)
- Spinner lifecycle (start/stop/update/dispose)
- Build output structure for collapsed/expanded states
- Content truncation and "View all" behavior
- Edge cases (rapid toggles, dispose safety)

The `Divider` is tested in `interactive-widgets.test.ts` covering:
- Widget construction with and without color
- `createRenderObject` and `updateRenderObject`
- Layout behavior (full width, tight constraints, unbounded fallback)
- Paint output (correct character `U+2500`, correct color style application)
- Color setter behavior (update vs. no-op for same color)

### 7.7 No Drawer/Accordion in the Traditional Sense

Despite the name "CollapsibleDrawer", there is no slide-in/slide-out drawer widget (like a navigation drawer). The widget is purely a vertically collapsible section. There is also no accordion widget (mutually exclusive collapsible sections). Each `CollapsibleDrawer` operates independently.

### 7.8 ClipRect for Content Truncation

The use of `SizedBox` + `ClipRect` for content truncation is an elegant TUI-specific pattern. `SizedBox` constrains the height to `maxContentLines`, and `ClipRect` ensures any content that would overflow beyond those lines is silently discarded during painting. The `RenderClipRect` implements this through `PaintContext.withClip()`, creating a restricted sub-context.

### 7.9 Absence of Animation Infrastructure

The codebase does not include any `AnimatedContainer`, `AnimatedSize`, or similar animation widgets for the expand/collapse transition. This is a deliberate choice for a TUI framework where frame-by-frame height interpolation would produce visual artifacts (partial rows are not meaningful in a character grid). The only animations present are the braille spinner cycles which operate at the individual-character level.

### 7.10 Dual Box-Drawing Style System

The `BOX_DRAWING` constant provides both `rounded` and `solid` character sets. The `GridBorder` widget defaults to `rounded` style, which produces visually softer borders with arc corners. Both styles share the same junction and cross characters, which means internal dividers look identical regardless of corner style.
