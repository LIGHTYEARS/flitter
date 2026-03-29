# Analysis 20: StickyHeader Widget and Its Role in Chat View

## Overview

The StickyHeader widget is a composite layout primitive that pairs a **header** widget with a **body** widget, implementing "sticky" pinning behavior: when the user scrolls and the header would normally disappear above the viewport, the header stays fixed at the top of the visible area. This is the terminal-UI analogue of CSS `position: sticky` and is essential for keeping contextual labels (role indicators, tool names) visible while the user scrolls through long conversation content.

## Source Files

| File | Purpose |
|------|---------|
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/sticky-header.ts` | Widget declaration (header + body pair) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-sticky-header.ts` | RenderObject with layout and paint logic |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/chat-view.ts` | Primary consumer: wraps user and assistant turns |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/generic-tool-card.ts` | Secondary consumer: wraps individual tool call cards |

## Widget Design

`StickyHeader` extends `MultiChildRenderObjectWidget` and takes exactly two children, supplied as `header` and `body` in its options object. These are passed to the superclass as `children: [header, body]`, preserving a fixed ordering contract: index 0 is always the header, index 1 is always the body. The widget's `createRenderObject()` instantiates a `RenderStickyHeader`, and `updateRenderObject()` is a no-op because the render object has no mutable configuration properties -- all behavior is derived from the two children themselves.

```typescript
export class StickyHeader extends MultiChildRenderObjectWidget {
  readonly header: Widget;
  readonly body: Widget;

  constructor(opts: { key?: Key; header: Widget; body: Widget }) {
    super({ key: opts.key, children: [opts.header, opts.body] });
    this.header = opts.header;
    this.body = opts.body;
  }

  createRenderObject(): RenderStickyHeader {
    return new RenderStickyHeader();
  }

  updateRenderObject(_renderObject: RenderObject): void {}
}
```

## RenderStickyHeader: Layout Protocol

`RenderStickyHeader` extends `ContainerRenderBox`, which provides an ordered `children` array of `RenderBox` instances. The class exposes private getters `_header` (children[0]) and `_body` (children[1]) for clarity.

### performLayout()

The layout algorithm measures header and body independently with **unbounded height** constraints:

1. Both children receive `BoxConstraints` with `minWidth`/`maxWidth` from the parent but `minHeight: 0` and `maxHeight: Infinity`. This allows each child to size itself to its natural content height.
2. The header is positioned at `Offset.zero` (top-left of the StickyHeader).
3. The body is positioned at `new Offset(0, headerHeight)`, immediately below the header.
4. The total size is `constraints.constrain(new Size(maxChildWidth, headerHeight + bodyHeight))`.

This vertical stacking is a simple two-child column layout, but the magic happens at paint time.

```typescript
performLayout(): void {
  const childConstraints = new BoxConstraints({
    minWidth: constraints.minWidth,
    maxWidth: constraints.maxWidth,
    minHeight: 0,
    maxHeight: Infinity,
  });

  // header at row 0, body at row headerHeight
  // total height = headerHeight + bodyHeight
}
```

## RenderStickyHeader: Paint Behavior (The Sticky Effect)

The `paint()` method is where the sticky pinning logic lives. The algorithm has four distinct branches:

### Step 1: Paint the body at its normal position

The body is always painted first at `offset + body.offset`. This ensures the body content occupies its natural position in the scroll canvas.

### Step 2: Determine the viewport clip rect

The method calls `_getCurrentClip(context)` which extracts the current clip rectangle from the `PaintContext`. It handles two formats: a `ClipCanvas` with a `.clip` property that is a `Rect`, or a raw context with `clipX`/`clipY`/`clipW`/`clipH` fields. If no clip information is available, the header paints at its natural position (no sticky behavior).

### Step 3: Compute pinning conditions

Two boolean conditions are checked:

- **`isHeaderAboveViewport`**: `headerY < viewTop` -- the header's natural Y position has scrolled above the top of the visible viewport.
- **`isContentInViewport`**: the StickyHeader's total bounding box overlaps the viewport vertically, meaning `(offset.row + totalH) > viewTop && offset.row < (viewTop + clip.height)`.

### Step 4: Pin or push

When both conditions are true (header has scrolled out, but the body is still partially visible):

- **Pinned position**: `pinnedY = viewTop` -- the header is painted at the very top of the viewport.
- **Push-away condition**: If the remaining visible height of the StickyHeader area (`(offset.row + totalH) - viewTop`) is less than the header's height, the header is pushed upward: `pinnedY = (offset.row + totalH) - headerHeight`. This creates the visual effect of the next StickyHeader "pushing" the current one off the top of the screen.

Before painting the pinned header, `fillRect()` is called on the paint context to clear the header row with spaces, preventing body content that has scrolled underneath from bleeding through.

```typescript
if (isContentInViewport && isHeaderAboveViewport) {
  let pinnedY = viewTop;
  if ((offset.row + totalH) - viewTop < headerH) {
    pinnedY = (offset.row + totalH) - headerH;  // push-away
  }
  paintCtx.fillRect(clip.left, pinnedY, clip.width, headerH, ' ');
  header.paint(context, new Offset(offset.col + header.offset.col, pinnedY));
}
```

## ChatView's Use of StickyHeader

`ChatView` (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/chat-view.ts`) is the main scrollable conversation renderer. It uses StickyHeader in two distinct ways to group conversation items:

### User Message Groups

Each user message is wrapped in a StickyHeader via `buildUserStickyHeader()`:

- **Header**: A bold green `Text` widget displaying "You" -- the role label.
- **Body**: A `Container` with a left border (green, width 2) containing the user's message text in italic.

When the user scrolls past a long user message, the "You" label stays pinned at the viewport top, providing persistent context about who authored the visible content.

```typescript
private buildUserStickyHeader(text: string, theme?: AmpTheme): Widget {
  const header = new Text({ text: new TextSpan({ text: 'You', ... }) });
  const body = new Container({
    decoration: new BoxDecoration({
      border: new Border({
        left: new BorderSide({ color: successColor, width: 2, style: 'solid' }),
      }),
    }),
    child: new Text({ text: new TextSpan({ text: text, ... }) }),
  });
  return new StickyHeader({ header, body });
}
```

### Assistant Turn Groups

Consecutive assistant-related items (thinking blocks, assistant messages, and tool calls) are grouped into a single "turn" and wrapped in a StickyHeader via `buildAssistantStickyHeader()`:

- **Header**: `SizedBox.shrink()` -- an empty zero-height widget. The assistant turn has no visible role label header.
- **Body**: Either a single widget (if the turn has one item) or a `Column` of all turn widgets.

The grouping algorithm walks the `items` array, accumulating consecutive `thinking`, `assistant_message`, and `tool_call` items into a single turn. The loop breaks when it encounters a `user_message` or `plan`, which start their own groups. This grouping ensures that an assistant's entire response (thinking, text, and tool invocations) scrolls as one cohesive unit.

### Nested StickyHeaders in Tool Cards

The `GenericToolCard` widget also uses StickyHeader internally. When a tool call is expanded, the card wraps its `ToolHeader` (status icon + tool name + details) as the header and the input/output column as the body. This creates a nested sticky effect: the tool header pins to the viewport while the tool's output scrolls.

## Visual Effect in the Terminal UI

In a running terminal session, the sticky header system produces the following visual experience:

1. **At rest**: Headers appear immediately above their bodies in natural document order with `SizedBox(height: 1)` spacers between groups.
2. **During scroll (body partially visible)**: As the user scrolls down, a header that passes the viewport top "sticks" in place. The body content continues scrolling underneath, with `fillRect` clearing the header row to prevent visual artifacts.
3. **During push-away (next group approaching)**: When the next StickyHeader's content reaches the viewport top, the currently pinned header is pushed upward and eventually off-screen, replaced by the next group's header.
4. **Nested stickiness**: Within an expanded tool call, the tool header can independently pin while the tool output scrolls, operating within its own clip context.

This creates a familiar "section header" UX in a terminal environment -- users always know which conversation participant or tool produced the content currently visible on screen. The tests in `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/chat-view.test.ts` validate the structural invariants: user messages produce StickyHeader wrappers, consecutive assistant items are grouped under a single StickyHeader, and SizedBox spacers separate top-level groups.
