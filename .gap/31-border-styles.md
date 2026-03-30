# Gap U09: No Dashed or Double Border Styles

## Problem Statement

The border rendering system in flitter-core supports only two box-drawing styles:
`'rounded'` and `'solid'`. Both use the same horizontal (`\u2500`) and vertical
(`\u2502`) line characters, differing only in corner glyphs (rounded uses arc
corners `\u256D\u256E\u2570\u256F`, solid uses right-angle corners `\u250C\u2510\u2514\u2518`).

Unicode box-drawing block U+2500..U+257F provides dedicated character sets for
dashed and double-line borders, but flitter-core does not expose them. This
limits visual differentiation of UI regions. For example, a focused panel cannot
use a double border to distinguish itself from an unfocused panel with a solid
border. Dashed borders are useful for indicating provisional or ephemeral
boundaries (e.g., drop targets, selection outlines, placeholder regions).

The `BorderStyle` type is defined in two separate locations with identical values,
creating a maintenance risk when new styles are added:

1. `paint-context.ts` line 16: `export type BorderStyle = 'rounded' | 'solid';`
2. `render-decorated.ts` line 15: `export type BorderStyle = 'rounded' | 'solid';`

The parallel `BoxDrawingStyle` type in `border-painter.ts` line 43 also mirrors
the same two-value union: `export type BoxDrawingStyle = 'rounded' | 'solid';`

Adding a new style requires updating all three type definitions, two
`BORDER_CHARS` lookup tables (paint-context.ts and border-painter.ts), and the
`ClipCanvas.drawBorder()` override -- a fragile process with no compile-time
safety net to catch missed locations.

## Affected Files

| File | Role |
|------|------|
| `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/paint-context.ts` | `BorderStyle` type (line 16), `BORDER_CHARS` lookup (lines 18-24), `drawBorder()` method (lines 236-269) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/clip-canvas.ts` | `drawBorder()` override (lines 138-170) that delegates to per-character `drawChar` calls for clipping |
| `/home/gem/workspace/flitter/packages/flitter-core/src/painting/border-painter.ts` | `BoxDrawingStyle` type (line 43), `BOX_DRAWING` lookup (lines 45-58), `BoxDrawingChars` interface (lines 25-41), utility functions `drawHorizontalDivider`, `drawVerticalDivider`, `drawGridBorder` |
| `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-decorated.ts` | `BorderStyle` type (line 15), `BorderSide` class (line 20), `Border` class (line 46), `BoxDecoration` class (line 93), `RenderDecoratedBox._paintDecoration()` (line 250) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-grid-border.ts` | `RenderGridBorder` uses `BoxDrawingStyle` from border-painter for grid borders |
| `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-table.ts` | `RenderTable` uses `BoxDrawingStyle` from border-painter for table borders |
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/grid-border.ts` | `GridBorder` widget accepts `BoxDrawingStyle` |
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/table.ts` | `Table` widget accepts `BoxDrawingStyle` |
| `/home/gem/workspace/flitter/packages/flitter-core/src/index.ts` | Public barrel exports for `BoxDrawingStyle`, `BorderPaintStyle`, `BOX_DRAWING` |
| `/home/gem/workspace/flitter/packages/flitter-core/src/diagnostics/perf-overlay.ts` | `PerformanceOverlay._drawBorder()` uses `BORDER_CHARS` directly on ScreenBuffer |
| `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/__tests__/paint-context.test.ts` | Tests for `drawBorder` with `'rounded'` and `'solid'` styles |
| `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/__tests__/clip-canvas.test.ts` | Tests for clipped `drawBorder` |

## Current Architecture Analysis

### Dual Type Definitions

The `BorderStyle` type appears in two files that do not import from each other:

```typescript
// paint-context.ts:16
export type BorderStyle = 'rounded' | 'solid';

// render-decorated.ts:15
export type BorderStyle = 'rounded' | 'solid';
```

The `BoxDrawingStyle` in `border-painter.ts` is a third copy:

```typescript
// border-painter.ts:43
export type BoxDrawingStyle = 'rounded' | 'solid';
```

These three definitions are functionally identical but independently maintained.
The `border-painter.ts` version adds T-junction and cross characters for grid
layouts; the `paint-context.ts` version has only corners and edges.

### Character Lookup Tables

**`paint-context.ts` (lines 18-24):**
```typescript
export const BORDER_CHARS: Record<
  BorderStyle,
  { tl: string; tr: string; bl: string; br: string; h: string; v: string }
> = {
  rounded: { tl: '\u256D', tr: '\u256E', bl: '\u2570', br: '\u256F', h: '\u2500', v: '\u2502' },
  solid:   { tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518', h: '\u2500', v: '\u2502' },
};
```

**`border-painter.ts` (lines 45-58):**
```typescript
export const BOX_DRAWING: Record<BoxDrawingStyle, BoxDrawingChars> = {
  rounded: {
    tl: '\u256D', tr: '\u256E', bl: '\u2570', br: '\u256F',
    h: '\u2500', v: '\u2502',
    teeDown: '\u252C', teeUp: '\u2534', teeRight: '\u251C', teeLeft: '\u2524',
    cross: '\u253C',
  },
  solid: {
    tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518',
    h: '\u2500', v: '\u2502',
    teeDown: '\u252C', teeUp: '\u2534', teeRight: '\u251C', teeLeft: '\u2524',
    cross: '\u253C',
  },
};
```

Both tables must be extended in lockstep when a new style is added.

### Drawing Pipeline

The call chain for border painting is:

```
BoxDecoration.border
  -> RenderDecoratedBox._paintDecoration()
    -> PaintContext.drawBorder(x, y, w, h, style, color)
      -> looks up BORDER_CHARS[style]
      -> calls drawChar() for corners, h-edges, v-edges
```

For clipped contexts, `ClipCanvas.drawBorder()` overrides the base method with
identical logic but routed through `this.drawChar()` which performs per-character
clip testing.

For grid/table borders, the chain is:

```
RenderGridBorder.paint() / RenderTable.paint()
  -> BOX_DRAWING[style]
  -> PaintContext.drawChar() for each character
```

## Unicode Box-Drawing Characters for New Styles

### Dashed Style

Unicode provides light dashed box-drawing characters:

| Character | Codepoint | Description |
|-----------|-----------|-------------|
| `\u2504`  | U+2504    | Light triple dash horizontal |
| `\u2506`  | U+2506    | Light triple dash vertical |
| `\u254C`  | U+254C    | Light double dash horizontal |
| `\u254E`  | U+254E    | Light double dash vertical |
| `\u2508`  | U+2508    | Light quadruple dash horizontal |
| `\u250A`  | U+250A    | Light quadruple dash vertical |

For the dashed style, the triple-dash variants (`\u2504` horizontal, `\u2506`
vertical) provide the clearest visual distinction while maintaining the same
cell width as solid lines. Corners reuse the solid corners (`\u250C`, `\u2510`,
`\u2514`, `\u2518`) since Unicode does not define dashed corner glyphs.

T-junctions and crosses also reuse the solid variants, as there are no dedicated
dashed junction characters in Unicode.

### Double Style

Unicode provides full double-line box-drawing characters:

| Character | Codepoint | Description |
|-----------|-----------|-------------|
| `\u2550`  | U+2550    | Double horizontal |
| `\u2551`  | U+2551    | Double vertical |
| `\u2554`  | U+2554    | Double down and right (top-left corner) |
| `\u2557`  | U+2557    | Double down and left (top-right corner) |
| `\u255A`  | U+255A    | Double up and right (bottom-left corner) |
| `\u255D`  | U+255D    | Double up and left (bottom-right corner) |
| `\u2566`  | U+2566    | Double down and horizontal (tee-down) |
| `\u2569`  | U+2569    | Double up and horizontal (tee-up) |
| `\u2560`  | U+2560    | Double vertical and right (tee-right) |
| `\u2563`  | U+2563    | Double vertical and left (tee-left) |
| `\u256C`  | U+256C    | Double vertical and horizontal (cross) |

The double style has a complete set of junction characters, making it fully
compatible with the grid border and table rendering without any fallback needed.

## Proposed Solution

### 1. Consolidate the BorderStyle Type

Eliminate the three independent type definitions. Create a single canonical
definition in `border-painter.ts` and have all other files import from it.

**Step 1a: Extend `BoxDrawingStyle` in `border-painter.ts`**

```typescript
// border-painter.ts:43 — single source of truth for all border style names
export type BoxDrawingStyle = 'rounded' | 'solid' | 'dashed' | 'double';
```

**Step 1b: Remove `BorderStyle` from `paint-context.ts`**

Delete the `BorderStyle` type and `BORDER_CHARS` constant from `paint-context.ts`.
Import `BoxDrawingStyle` and `BOX_DRAWING` from `border-painter.ts` instead.
The `drawBorder()` method signature changes from `borderStyle: BorderStyle` to
`borderStyle: BoxDrawingStyle`. The lookup changes from `BORDER_CHARS[borderStyle]`
to using the same `BOX_DRAWING` table (which already has the needed fields).

```typescript
// paint-context.ts — revised imports
import { BOX_DRAWING, type BoxDrawingStyle } from '../painting/border-painter';

// drawBorder() now uses the unified lookup:
drawBorder(
  x: number, y: number, w: number, h: number,
  borderStyle: BoxDrawingStyle,
  color?: Color,
): void {
  if (w < 2 || h < 2) return;
  const chars = BOX_DRAWING[borderStyle];
  const style: CellStyle = color ? { fg: color } : {};
  // ... corner and edge drawing unchanged ...
}
```

**Step 1c: Remove `BorderStyle` from `render-decorated.ts`**

Replace the local `BorderStyle` type with an import of `BoxDrawingStyle`:

```typescript
// render-decorated.ts — revised
import { type BoxDrawingStyle } from '../painting/border-painter';

export class BorderSide {
  readonly color: Color;
  readonly width: number;
  readonly style: BoxDrawingStyle;

  constructor(opts?: { color?: Color; width?: number; style?: BoxDrawingStyle }) {
    this.color = opts?.color ?? Color.defaultColor;
    this.width = Math.round(opts?.width ?? 1);
    this.style = opts?.style ?? 'solid';
  }
  // ...
}
```

**Step 1d: Update `clip-canvas.ts`**

The `ClipCanvas.drawBorder()` override must also switch from the removed local
`BorderStyle` + `BORDER_CHARS` to the imported `BoxDrawingStyle` + `BOX_DRAWING`:

```typescript
// clip-canvas.ts — revised imports
import { BOX_DRAWING, type BoxDrawingStyle } from '../painting/border-painter';

override drawBorder(
  x: number, y: number, w: number, h: number,
  borderStyle: BoxDrawingStyle,
  color?: Color,
): void {
  if (w < 2 || h < 2) return;
  const chars = BOX_DRAWING[borderStyle];
  const style: CellStyle = color ? { fg: color } : {};
  // ... per-character drawing unchanged ...
}
```

**Step 1e: Update `index.ts` exports**

Since `BorderStyle` is removed and replaced by `BoxDrawingStyle`, update the
barrel exports. `BoxDrawingStyle` is already exported from `border-painter.ts`.
Add a `BorderStyle` type alias for backward compatibility if needed:

```typescript
// index.ts — add backward-compatible alias
export { type BoxDrawingStyle as BorderStyle } from './painting/border-painter';
```

### 2. Add Dashed and Double Character Sets to `BOX_DRAWING`

Extend the `BOX_DRAWING` table in `border-painter.ts`:

```typescript
export const BOX_DRAWING: Record<BoxDrawingStyle, BoxDrawingChars> = {
  rounded: {
    tl: '\u256D', tr: '\u256E', bl: '\u2570', br: '\u256F',
    h: '\u2500', v: '\u2502',
    teeDown: '\u252C', teeUp: '\u2534', teeRight: '\u251C', teeLeft: '\u2524',
    cross: '\u253C',
  },
  solid: {
    tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518',
    h: '\u2500', v: '\u2502',
    teeDown: '\u252C', teeUp: '\u2534', teeRight: '\u251C', teeLeft: '\u2524',
    cross: '\u253C',
  },
  dashed: {
    tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518',
    h: '\u2504', v: '\u2506',
    teeDown: '\u252C', teeUp: '\u2534', teeRight: '\u251C', teeLeft: '\u2524',
    cross: '\u253C',
  },
  double: {
    tl: '\u2554', tr: '\u2557', bl: '\u255A', br: '\u255D',
    h: '\u2550', v: '\u2551',
    teeDown: '\u2566', teeUp: '\u2569', teeRight: '\u2560', teeLeft: '\u2563',
    cross: '\u256C',
  },
};
```

Visual reference for each style:

```
solid:                 rounded:
┌───────┬────┐         ╭───────┬────╮
│       │    │         │       │    │
├───────┼────┤         ├───────┼────┤
│       │    │         │       │    │
└───────┴────┘         ╰───────┴────╯

dashed:                double:
┌┄┄┄┄┄┄┄┬┄┄┄┄┐        ╔═══════╦════╗
┆       ┆    ┆        ║       ║    ║
├┄┄┄┄┄┄┄┼┄┄┄┄┤        ╠═══════╬════╣
┆       ┆    ┆        ║       ║    ║
└┄┄┄┄┄┄┄┴┄┄┄┄┘        ╚═══════╩════╝
```

### 3. No Changes to Drawing Logic

The `drawBorder()` method in both `PaintContext` and `ClipCanvas` is entirely
data-driven: it looks up characters from the `BORDER_CHARS` / `BOX_DRAWING`
table and passes them to `drawChar()`. No algorithmic changes are needed.
The same applies to `drawHorizontalDivider()`, `drawVerticalDivider()`, and
`drawGridBorder()` in `border-painter.ts` -- they all index into `BOX_DRAWING`
by style name and use the resulting characters directly.

Adding new entries to the lookup table is sufficient for full rendering support
of the new styles in all contexts: plain borders, clipped borders, grid borders,
table borders, and the performance overlay.

### 4. Update the PerformanceOverlay

The `PerformanceOverlay` in `perf-overlay.ts` uses `BORDER_CHARS` from
`paint-context.ts` directly against a `ScreenBuffer`. After consolidation, it
should import from `border-painter.ts` instead:

```typescript
// perf-overlay.ts — revised import
import { BOX_DRAWING } from '../painting/border-painter';
```

The overlay currently hardcodes `'solid'` style in its `_drawBorder()` method.
No functional change is needed, only the import path.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Consolidate three type definitions into one in `border-painter.ts` | Eliminates the maintenance hazard of keeping three identical union types in sync. A single source of truth means adding a new style requires editing one type definition and one lookup table. |
| Reuse solid corners for the dashed style | Unicode does not define dashed corner characters. All terminal emulators render solid corners at the same cell width, so the visual mismatch is minimal and matches common practice in TUI frameworks (e.g., `ncurses`, `blessed`, `ink`). |
| Use triple-dash variants (`\u2504`, `\u2506`) over double-dash (`\u254C`, `\u254E`) | Triple-dash has wider terminal support and provides a more visually distinct pattern. Double-dash characters are less commonly rendered correctly in older terminal emulators. |
| Reuse solid T-junctions and crosses for the dashed style | Unicode has no dashed junction glyphs. Using solid junctions at intersection points maintains structural clarity while dashed edges provide the visual pattern between junctions. |
| Full double-line junction set for the double style | Unicode provides a complete set of double-line junctions. Using them ensures that grid borders and tables with `'double'` style render with consistent line weight at all intersections. |
| Rename `BorderStyle` to import `BoxDrawingStyle` everywhere | The `BoxDrawingStyle` name is more descriptive (it refers to Unicode box-drawing characters) and already exists in the more complete `border-painter.ts` module. Keeping `BorderStyle` as a type alias provides backward compatibility. |
| No `drawBorder()` logic changes | The drawing methods are already fully data-driven. Adding new lookup table entries is sufficient. This minimizes the risk of introducing rendering bugs. |

## Testing Strategy

### 5a. Unit Tests for New Styles in `paint-context.test.ts`

Add test cases for `'dashed'` and `'double'` styles alongside the existing
`'rounded'` and `'solid'` tests:

```typescript
// paint-context.test.ts — new tests in the drawBorder describe block

test('draws dashed border with correct corners and edges', () => {
  ctx.drawBorder(0, 0, 5, 3, 'dashed');

  const chars = BORDER_CHARS['dashed']; // or BOX_DRAWING after consolidation

  // Corners (reuse solid)
  expect(screen.getCell(0, 0).char).toBe(chars.tl); // \u250C
  expect(screen.getCell(4, 0).char).toBe(chars.tr); // \u2510
  expect(screen.getCell(0, 2).char).toBe(chars.bl); // \u2514
  expect(screen.getCell(4, 2).char).toBe(chars.br); // \u2518

  // Top edge (dashed horizontal)
  expect(screen.getCell(1, 0).char).toBe('\u2504');
  expect(screen.getCell(2, 0).char).toBe('\u2504');
  expect(screen.getCell(3, 0).char).toBe('\u2504');

  // Left edge (dashed vertical)
  expect(screen.getCell(0, 1).char).toBe('\u2506');

  // Right edge (dashed vertical)
  expect(screen.getCell(4, 1).char).toBe('\u2506');
});

test('draws double border with correct corners and edges', () => {
  ctx.drawBorder(0, 0, 5, 3, 'double');

  // Double corners
  expect(screen.getCell(0, 0).char).toBe('\u2554'); // top-left
  expect(screen.getCell(4, 0).char).toBe('\u2557'); // top-right
  expect(screen.getCell(0, 2).char).toBe('\u255A'); // bottom-left
  expect(screen.getCell(4, 2).char).toBe('\u255D'); // bottom-right

  // Double horizontal edge
  expect(screen.getCell(1, 0).char).toBe('\u2550');
  expect(screen.getCell(2, 0).char).toBe('\u2550');
  expect(screen.getCell(3, 0).char).toBe('\u2550');

  // Double vertical edge
  expect(screen.getCell(0, 1).char).toBe('\u2551');
  expect(screen.getCell(4, 1).char).toBe('\u2551');
});
```

### 5b. ClipCanvas Tests for New Styles

Add corresponding tests in `clip-canvas.test.ts` to verify clipping behavior
with dashed and double borders:

```typescript
test('draws dashed border fully inside clip', () => {
  const clip = new Rect(0, 0, 10, 10);
  const canvas = new ClipCanvas(ctx, clip);

  canvas.drawBorder(1, 1, 5, 3, 'dashed');
  expect(screen.getCell(1, 1).char).toBe('\u250C'); // solid corner
  expect(screen.getCell(2, 1).char).toBe('\u2504'); // dashed horizontal
  expect(screen.getCell(1, 2).char).toBe('\u2506'); // dashed vertical
});

test('draws double border fully inside clip', () => {
  const clip = new Rect(0, 0, 10, 10);
  const canvas = new ClipCanvas(ctx, clip);

  canvas.drawBorder(1, 1, 5, 3, 'double');
  expect(screen.getCell(1, 1).char).toBe('\u2554'); // double corner
  expect(screen.getCell(2, 1).char).toBe('\u2550'); // double horizontal
  expect(screen.getCell(1, 2).char).toBe('\u2551'); // double vertical
});
```

### 5c. Border Painter Utility Tests

Verify that `drawHorizontalDivider`, `drawVerticalDivider`, and `drawGridBorder`
work correctly with the new styles:

```typescript
test('drawHorizontalDivider with dashed style', () => {
  drawHorizontalDivider(ctx, 0, 0, 5, { style: 'dashed' });
  expect(screen.getCell(0, 0).char).toBe('\u251C'); // teeRight (solid)
  expect(screen.getCell(1, 0).char).toBe('\u2504'); // dashed horizontal
  expect(screen.getCell(4, 0).char).toBe('\u2524'); // teeLeft (solid)
});

test('drawGridBorder with double style', () => {
  drawGridBorder(ctx, 0, 0, 10, 5, [5], [2], { style: 'double' });
  // Double corners
  expect(screen.getCell(0, 0).char).toBe('\u2554');
  expect(screen.getCell(9, 0).char).toBe('\u2557');
  // Double T-junction at column split
  expect(screen.getCell(5, 0).char).toBe('\u2566'); // teeDown
  // Double cross at intersection
  expect(screen.getCell(5, 2).char).toBe('\u256C'); // cross
});
```

### 5d. RenderDecoratedBox Integration Tests

Verify that `Container` / `DecoratedBox` widgets render borders with the new
styles through the full paint pipeline:

```typescript
test('Container with dashed border renders dashed edges', () => {
  const decoration = new BoxDecoration({
    border: Border.all(new BorderSide({ style: 'dashed' })),
  });
  // ... render via WidgetTester, verify screen characters ...
});

test('Container with double border renders double edges', () => {
  const decoration = new BoxDecoration({
    border: Border.all(new BorderSide({ style: 'double' })),
  });
  // ... render via WidgetTester, verify screen characters ...
});
```

## Migration Plan

The implementation can be done in two atomic commits:

**Commit 1: Consolidate types and add character sets (no behavioral change for existing styles)**
- Extend `BoxDrawingStyle` in `border-painter.ts` to include `'dashed' | 'double'`
- Add `dashed` and `double` entries to the `BOX_DRAWING` table
- Remove the `BorderStyle` type and `BORDER_CHARS` constant from `paint-context.ts`
- Update `paint-context.ts` and `clip-canvas.ts` to import from `border-painter.ts`
- Remove the `BorderStyle` type from `render-decorated.ts`, import `BoxDrawingStyle`
- Add backward-compatible `BorderStyle` type alias in `index.ts`
- Update `perf-overlay.ts` import path
- Run existing tests to verify no regressions for `'rounded'` and `'solid'`

**Commit 2: Add tests for new styles**
- Add `'dashed'` and `'double'` test cases to `paint-context.test.ts`
- Add `'dashed'` and `'double'` test cases to `clip-canvas.test.ts`
- Add border-painter utility tests for new styles
- Add integration tests for `RenderDecoratedBox` with new styles

## File Inventory

| File | Action | Description |
|------|--------|-------------|
| `src/painting/border-painter.ts` | **MODIFY** | Extend `BoxDrawingStyle` union with `'dashed' \| 'double'`; add two new entries to `BOX_DRAWING` table |
| `src/scheduler/paint-context.ts` | **MODIFY** | Remove local `BorderStyle` type and `BORDER_CHARS` constant; import `BoxDrawingStyle` and `BOX_DRAWING` from `border-painter.ts`; update `drawBorder()` signature |
| `src/scheduler/clip-canvas.ts` | **MODIFY** | Update import to use `BoxDrawingStyle` and `BOX_DRAWING` from `border-painter.ts`; update `drawBorder()` override signature |
| `src/layout/render-decorated.ts` | **MODIFY** | Remove local `BorderStyle` type; import `BoxDrawingStyle` from `border-painter.ts`; update `BorderSide.style` type |
| `src/diagnostics/perf-overlay.ts` | **MODIFY** | Update import to use `BOX_DRAWING` from `border-painter.ts` instead of `BORDER_CHARS` from `paint-context.ts` |
| `src/index.ts` | **MODIFY** | Add `BorderStyle` as backward-compatible type alias for `BoxDrawingStyle` |
| `src/scheduler/__tests__/paint-context.test.ts` | **MODIFY** | Add test cases for `'dashed'` and `'double'` border styles |
| `src/scheduler/__tests__/clip-canvas.test.ts` | **MODIFY** | Add test cases for `'dashed'` and `'double'` border styles under clipping |

## Estimated Complexity

- **`border-painter.ts` changes**: ~20 lines (extend type, add two table entries)
- **`paint-context.ts` changes**: net -10 lines (remove type + constant, update imports)
- **`clip-canvas.ts` changes**: ~5 lines (update imports and signature)
- **`render-decorated.ts` changes**: ~5 lines (update import, change type references)
- **`perf-overlay.ts` changes**: ~3 lines (update import)
- **`index.ts` changes**: ~2 lines (add alias)
- **`paint-context.test.ts` changes**: ~40 lines (two new test cases)
- **`clip-canvas.test.ts` changes**: ~25 lines (two new test cases)
- **Total new/changed code**: ~110 lines
- **Risk**: Low. The implementation is purely additive to the lookup table. All existing drawing logic is data-driven and requires no algorithmic changes. The type consolidation is a mechanical refactor with full type-safety enforced by the TypeScript compiler -- any missed reference will produce a compile error.
