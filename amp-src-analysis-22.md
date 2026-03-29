# Analysis 22: Container, BoxDecoration, and Border System

## Overview

The Container/BoxDecoration/Border system provides the primary mechanism for visual styling in Flitter's terminal UI. It mirrors Flutter's `Container` widget pattern: a high-level convenience wrapper that composes lower-level primitives (padding, sizing, decoration) into a single ergonomic API. Underneath, `RenderDecoratedBox` handles the actual rendering of borders and background fills using Unicode box-drawing characters.

## Container Widget (`packages/flitter-core/src/widgets/container.ts`)

`Container` is a `StatelessWidget` (Amp ref: class A8) that composes up to four nested widgets in its `build()` method, layered from outermost to innermost:

1. **Margin** (outer `Padding`) -- applies `EdgeInsets` as external spacing.
2. **Size constraints** (`SizedBox`) -- enforces explicit `width`, `height`, or `BoxConstraints`. When both `constraints` and `width`/`height` are provided, width/height override the corresponding constraint axis to create a tight constraint.
3. **Decoration** (`DecoratedBox`) -- paints background color and borders.
4. **Padding** (inner `Padding`) -- applies `EdgeInsets` as internal spacing around the child.

If none of these properties are set and no child is provided, the fallback is `SizedBox.shrink()`. This layered composition means Container never has its own `RenderObject` -- it is purely a widget-tree convenience that delegates to purpose-built render objects.

## BoxDecoration, Border, and BorderSide (`packages/flitter-core/src/layout/render-decorated.ts`)

### BorderSide

Represents a single edge of a border with three properties:

- **color** (`Color`) -- defaults to `Color.defaultColor`.
- **width** (`number`) -- rounded to the nearest integer, defaults to 1. A width of 0 signals "no border" via the static `BorderSide.none` sentinel.
- **style** (`BorderStyle`) -- either `'solid'` or `'rounded'`.

### Border

Holds four `BorderSide` values (`top`, `right`, `bottom`, `left`), each defaulting to `BorderSide.none`. The convenience factory `Border.all(side)` creates a uniform border on all four edges. Computed getters `horizontal` (left + right width) and `vertical` (top + bottom width) are used during layout to calculate constraint deflation.

### BoxDecoration

A simple value object carrying an optional `color` (background fill) and an optional `Border`. Equality is structural, comparing both fields deeply.

## RenderDecoratedBox -- Layout Algorithm

`RenderDecoratedBox` is a single-child `RenderBox` that implements a straightforward layout protocol:

1. **Deflate constraints**: Subtract border horizontal/vertical totals from the parent constraints, clamping to zero.
2. **Layout child**: Pass deflated constraints to the child. The child sizes itself within these reduced bounds.
3. **Position child**: Set the child's offset to `(borderLeft, borderTop)`, placing it inside the border region.
4. **Self-size**: The render box sizes to `childSize + borderWidths`, constrained by the parent.

When there is no child, the box sizes to the border widths alone (constrained). This means a `Container` with only a border and no child produces a minimal 2x2 cell box (1 cell per border side).

## RenderDecoratedBox -- Paint Algorithm

The `paint()` method calls `_paintDecoration()` then recurses into the child:

### Background Fill

If `BoxDecoration.color` is set, `ctx.fillRect()` fills the entire box area (including the border region) with space characters styled with the background color. This establishes the color behind both the border characters and the child content.

### Border Drawing

If `BoxDecoration.border` is set, `ctx.drawBorder()` renders Unicode box-drawing characters. The `PaintContext.drawBorder()` method (in `packages/flitter-core/src/scheduler/paint-context.ts`) requires a minimum size of 2x2 and draws:

- **Four corners** using style-specific characters.
- **Horizontal edges** (top and bottom rows, excluding corners) using the horizontal line character.
- **Vertical edges** (left and right columns, excluding corners) using the vertical line character.

The border character sets are defined in the `BORDER_CHARS` constant:

| Style | Top-Left | Top-Right | Bottom-Left | Bottom-Right | Horizontal | Vertical |
|-------|----------|-----------|-------------|--------------|------------|----------|
| `rounded` | `\u256D` | `\u256E` | `\u2570` | `\u256F` | `\u2500` | `\u2502` |
| `solid` | `\u250C` | `\u2510` | `\u2514` | `\u2518` | `\u2500` | `\u2502` |

Both styles share the same horizontal (`\u2500`) and vertical (`\u2502`) line characters; only the corners differ. The `rounded` style uses arc corners while `solid` uses right-angle corners.

Border color is applied as the foreground (`fg`) style on each drawn character. If the border color equals `Color.defaultColor`, no explicit color is set, allowing the terminal default to show through.

### Background Color Inheritance

A subtle detail in `PaintContext`: the `_mergeWithExistingBg()` method ensures that when text or characters are drawn without an explicit background, they inherit the background color already present in the cell. This means child content rendered inside a colored `Container` automatically picks up the container's background without each child needing to specify it.

## DecoratedBox Widget (`packages/flitter-core/src/widgets/decorated-box.ts`)

`DecoratedBox` is the thin `SingleChildRenderObjectWidget` bridge between the widget tree and `RenderDecoratedBox`. Its `createRenderObject()` instantiates a `RenderDecoratedBox` with the given decoration, and `updateRenderObject()` updates the decoration property (which triggers `markNeedsPaint()` and `markNeedsLayout()` if the decoration has changed, checked via structural equality).

## Usage in Amp Widgets

Container with BoxDecoration is the most pervasive styling pattern across the flitter-amp application layer:

### ChatView (`packages/flitter-amp/src/widgets/chat-view.ts`)

User messages use a Container with a left-only border to create a colored accent bar:

```typescript
new Container({
  decoration: new BoxDecoration({
    border: new Border({
      left: new BorderSide({ color: successColor, width: 2, style: 'solid' }),
    }),
  }),
  padding: EdgeInsets.only({ left: 1 }),
  child: new Text({ ... }),
})
```

This produces a 2-cell-wide green vertical bar on the left edge of each user message, a signature visual element of the Amp CLI interface.

### InputArea (`packages/flitter-amp/src/widgets/input-area.ts`)

The text input field is wrapped in a Container with a rounded border whose color changes based on mode (shell mode uses cyan, normal mode uses the theme border color):

```typescript
const border = Border.all(
  new BorderSide({ color: borderColor, width: 1, style: 'rounded' })
);
new Container({
  decoration: new BoxDecoration({ border }),
  padding: EdgeInsets.symmetric({ horizontal: 1 }),
  height: 5,
  child: autocompleteWrapped,
})
```

### DiffCard (`packages/flitter-amp/src/widgets/diff-card.ts`)

File diffs are enclosed in a uniform border with horizontal internal padding:

```typescript
new Container({
  decoration: new BoxDecoration({ border: Border.all(borderSide) }),
  padding: EdgeInsets.symmetric({ horizontal: 1 }),
  child: diffContent,
})
```

### CommandPalette and PermissionDialog

Both dialog-style widgets use `Border.all()` with themed border sides to create framed panels, demonstrating how Container serves as the universal "put a box around it" primitive.

## Border Showcase Example

The `border-showcase.ts` example (`packages/flitter-core/examples/border-showcase.ts`) exercises every combination:

- Solid vs. rounded border styles side by side.
- Per-color borders (red, green, blue, yellow).
- Background color fills without borders.
- Combined background + border (e.g., cyan border on blue background).
- Triple-nested containers demonstrating border stacking (solid outer, rounded middle, colored inner).

## Test Coverage

The test suite (`packages/flitter-core/src/layout/__tests__/render-decorated.test.ts`) validates:

- **Constraint deflation**: Child receives parent constraints minus border widths.
- **Child offset**: Positioned at `(borderLeft, borderTop)`.
- **Self-sizing**: Box size equals child size plus border widths; no-child box sizes to border alone.
- **Paint correctness**: Verifies exact Unicode characters at corner and edge positions for both `rounded` and `solid` styles.
- **Background fill**: Confirms interior cells contain space characters with the specified background color.
- **Offset translation**: Paint with a non-zero offset shifts all border characters correctly.
- **Decoration update**: Changing the decoration triggers relayout with new border widths.

## Key Architectural Notes

1. **No "dashed" or "double" border styles**: Despite the type being named `BorderStyle`, only `'rounded'` and `'solid'` are implemented. Both share the same line characters; only corners differ.
2. **Integer border widths**: `BorderSide` rounds width to the nearest integer via `Math.round()`, consistent with Flitter's integer-coordinate-only terminal model.
3. **Single style per border**: The paint method reads the border style from `border.top.style` only, meaning all four sides use the same style. Per-side style differentiation is structurally possible but not utilized in the paint path.
4. **Background fills the entire region**: `fillRect` covers the full box including border cells, so border characters are drawn on top of the background fill. This ensures the background color shows through any gaps in the border characters.
