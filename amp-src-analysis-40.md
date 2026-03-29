# Analysis 40: Table and Grid Layout System in Flitter-Core

## 1. Overview of Table/Grid Layout Widgets

Flitter-core provides three distinct approaches to multi-column layout in the terminal, each targeting a different level of abstraction and use case:

| Widget | File | Purpose |
|--------|------|---------|
| `Table<T>` | `widgets/table.ts` | Backward-compatible 2-column table using Row+Expanded composition |
| `DataTable` | `widgets/table.ts` | N-column table with custom `RenderTable` layout engine |
| `GridBorder` | `widgets/grid-border.ts` | Split-pane bordered container with left/right layout |

Additionally, the `Markdown` widget (`widgets/markdown.ts`) has its own internal table renderer for GFM (GitHub Flavored Markdown) tables, which takes a completely different approach using pre-formatted text strings.

The Amp reference uses `Row` + `Expanded` for virtually all multi-column layouts at the application level (header bar, bottom grid, tool headers), reserving the custom table render objects for structured data display.

### Amp Binary Cross-Reference

The CLAUDE.md for flitter-core documents the minified identifier `jA` as mapping to `Table`, and the `XYH` class as the full custom table RenderObject. The `GJH` class maps to `RenderGridBorder`, used by `F0H` (PromptBar).

---

## 2. The Two-Column `Table<T>` Widget

The simplest table is a `StatelessWidget` that composes standard flex layout primitives:

```typescript
// From /home/gem/workspace/flitter/packages/flitter-core/src/widgets/table.ts
export class Table<T = unknown> extends StatelessWidget {
  readonly items: T[];
  readonly renderRow: (item: T) => [Widget, Widget];
  readonly showDividers: boolean;

  build(_context: BuildContext): Widget {
    const children: Widget[] = [];
    for (let i = 0; i < this.items.length; i++) {
      const [left, right] = this.renderRow(this.items[i]!);
      children.push(
        new Row({
          children: [
            new Expanded({ child: left }),
            new Expanded({ child: right }),
          ],
        }),
      );
      if (this.showDividers && i < this.items.length - 1) {
        children.push(new Divider());
      }
    }
    return new Column({ mainAxisSize: 'min', children });
  }
}
```

Key characteristics:
- **Fixed at 2 columns** -- each side gets an `Expanded` child with equal flex factor (both default to 1), so each column gets exactly 50% of available width.
- **No column width customization** -- both columns are always equally sized.
- **No borders** -- only optional horizontal `Divider` widgets between rows.
- **Typed items** -- generic `T` parameter allows typed data arrays.
- **Pure composition** -- no custom RenderObject; the entire table is built from `Column`, `Row`, `Expanded`, and `Divider`.

This pattern matches how most multi-column layouts work throughout the Amp application layer, where `Row` + `Expanded` is the dominant approach (see section 4).

---

## 3. The N-Column `DataTable` Widget and `RenderTable`

### 3.1 DataTable Widget

`DataTable` is a `MultiChildRenderObjectWidget` that flattens a 2D array of widgets into a flat children list and delegates all layout to `RenderTable`:

```typescript
// From /home/gem/workspace/flitter/packages/flitter-core/src/widgets/table.ts
export class DataTable extends MultiChildRenderObjectWidget {
  readonly columnCount: number;
  readonly columnWidths: TableColumnWidth[];
  readonly showBorder: boolean;
  readonly borderStyle: BoxDrawingStyle;
  readonly borderColor?: Color;
  readonly cellPadding: number;
  // ...
}
```

The rows are provided as `Widget[][]` and flattened in the constructor:

```typescript
const flatChildren: Widget[] = [];
for (const row of opts.rows) {
  for (const cell of row) {
    flatChildren.push(cell);
  }
}
```

This row-major flattening is the convention for RenderTable: children are indexed as `childIdx = row * cols + col`.

### 3.2 Column Width Specification

The `TableColumnWidth` class (`/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-table.ts`) provides three sizing modes:

```typescript
export type TableColumnWidthType = 'fixed' | 'flex' | 'intrinsic';

export class TableColumnWidth {
  readonly type: TableColumnWidthType;
  readonly value: number;

  static fixed(width: number): TableColumnWidth;    // exact char count
  static flex(factor: number = 1): TableColumnWidth; // proportional share
  static intrinsic(): TableColumnWidth;              // measure children
}
```

**Mode details:**

| Mode | Behavior | `value` meaning |
|------|----------|-----------------|
| `fixed(n)` | Column is exactly `n` characters wide | Width in characters |
| `flex(f)` | Column takes proportional share of remaining space | Flex factor (default 1) |
| `intrinsic()` | Column width = max intrinsic width of all cells in that column | Unused (0) |

If a column index has no explicit width specification, it defaults to `flex(1)`.

### 3.3 Column Sizing Algorithm

The sizing algorithm in `RenderTable.performLayout()` at `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-table.ts` runs in two passes:

**Pass 1: Resolve fixed and intrinsic widths**

```typescript
for (let c = 0; c < cols; c++) {
  const spec = this._columnWidths[c] ?? TableColumnWidth.flex(1);
  if (spec.type === 'fixed') {
    colWidths[c] = spec.value;
    fixedTotal += spec.value;
  } else if (spec.type === 'intrinsic') {
    let maxW = 0;
    for (let r = 0; r < rows; r++) {
      const childIdx = r * cols + c;
      if (childIdx < children.length) {
        const child = children[childIdx];
        child.layout(new BoxConstraints({
          minWidth: 0, maxWidth: availableWidth,
          minHeight: 0, maxHeight: ...
        }));
        maxW = Math.max(maxW, child.size.width - pad2);
      }
    }
    colWidths[c] = Math.max(0, maxW);
    fixedTotal += colWidths[c];
  } else {
    flexTotal += spec.value;
  }
}
```

For intrinsic columns, every cell in the column is laid out with loose constraints to determine its natural width. The column width becomes the maximum cell width across all rows. This is a full measure-all-cells approach.

**Pass 2: Distribute remaining space to flex columns**

```typescript
const remainingWidth = Math.max(0, availableWidth - fixedTotal - pad2 * cols);
for (let c = 0; c < cols; c++) {
  const spec = this._columnWidths[c] ?? TableColumnWidth.flex(1);
  if (spec.type === 'flex' && flexTotal > 0) {
    colWidths[c] = Math.floor((spec.value / flexTotal) * remainingWidth);
  }
}
```

Flex columns divide the remaining space proportionally using `Math.floor`, then any rounding error is added to the first flex column.

**Available width calculation** accounts for border overhead:

```typescript
const borderColDividers = this._showBorder ? cols - 1 : 0;
const borderOuterH = this._showBorder ? 2 : 0;
const availableWidth = Math.max(0, constraints.maxWidth - borderOuterH - borderColDividers);
```

### 3.4 Cell Rendering and Row Height

After column widths are resolved, each cell is laid out with tight width constraints (forcing it to the column width + padding) and loose height constraints:

```typescript
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const cellWidth = colWidths[c] + pad2;
    const cellConstraints = new BoxConstraints({
      minWidth: cellWidth,
      maxWidth: cellWidth,
      minHeight: 0,
      maxHeight: Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : Infinity,
    });
    child.layout(cellConstraints);
    pd.row = r;
    pd.col = c;
    rowHeights[r] = Math.max(rowHeights[r], child.size.height);
  }
}
```

Row height is determined by the tallest cell in each row. This is a standard table layout behavior.

### 3.5 Cell Positioning

Children are positioned in a grid, accounting for borders:

```typescript
let currentY = this._showBorder ? 1 : 0;
for (let r = 0; r < rows; r++) {
  let currentX = this._showBorder ? 1 : 0;
  for (let c = 0; c < cols; c++) {
    child.offset = new Offset(currentX, currentY);
    currentX += colWidths[c] + pad2;
    if (this._showBorder && c < cols - 1) {
      currentX += 1; // column divider
    }
  }
  currentY += rowHeights[r];
  if (this._showBorder && r < rows - 1) {
    currentY += 1; // row divider
  }
}
```

Each column divider and row divider consumes exactly 1 character cell. The outer border consumes 1 character on each edge (2 total horizontally, 2 total vertically).

### 3.6 TableCellParentData

Each cell's `RenderBox` gets a `TableCellParentData` attached:

```typescript
export class TableCellParentData extends ParentData {
  row: number = 0;
  col: number = 0;
}
```

This is set during layout and allows the paint pass to look up which row/column a child belongs to. The parent data is set via the standard `setupParentData()` hook that `ContainerRenderBox` calls when adopting children.

---

## 4. How Multi-Column Layouts Are Achieved in Practice

Despite `DataTable` and `RenderTable` being available, the Amp application layer (`flitter-amp`) does **not** use them for its primary UI. Instead, virtually all multi-column layouts are built from `Row` + `Expanded`:

### 4.1 HeaderBar (2-column: agent name left, usage right)

From `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/header-bar.ts`:

```typescript
return new Padding({
  padding: EdgeInsets.symmetric({ vertical: 0, horizontal: 1 }),
  child: new Row({
    children: [
      new Expanded({
        child: new Text({ text: leftTextSpan }),
      }),
      new Text({ text: rightTextSpan }),
    ],
  }),
});
```

Pattern: `Expanded` on the left pushes the right-side text to the far right. This is the "spacer" pattern.

### 4.2 App Root (chat view + scrollbar)

From `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts`:

```
Column (mainAxisSize: max)
  |-- Expanded
  |     \-- Row (crossAxisAlignment: stretch)
  |           |-- Expanded
  |           |     \-- SingleChildScrollView
  |           \-- Scrollbar (1-col wide)
  |-- InputArea
  \-- StatusBar
```

The outer `Row` splits the main content area into the scrollable chat (flex) and the fixed-width scrollbar.

### 4.3 ToolHeader (inline row of elements)

From `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/tool-call/tool-header.ts`:

```typescript
return new Row({
  mainAxisSize: 'min',
  children: [headerText, ...this.widget.extraChildren],
});
```

Uses `mainAxisSize: 'min'` to shrink-wrap rather than fill available width.

### 4.4 Markdown GFM Tables (text-based approach)

The `Markdown` widget renders GFM tables not as widget tables but as pre-formatted `Text` widgets:

From `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/markdown.ts` (lines 743-803):

```typescript
private _renderTable(block: MarkdownBlock, themeData?: ThemeData): Widget {
  // Compute column widths from text lengths
  const colWidths: number[] = headers.map((h) => h.length);
  for (const row of rows) {
    for (let c = 0; c < colCount; c++) {
      const cellLen = (row[c] ?? '').length;
      if (cellLen > colWidths[c]!) colWidths[c] = cellLen;
    }
  }

  // Header row: padEnd to column width, join with |
  const headerCells = headers.map((h, c) => h.padEnd(colWidths[c]!));
  const headerText = '  ' + headerCells.join(' \u2502 ');

  // Separator: horizontal lines joined with cross chars
  const sepCells = colWidths.map((w) => '\u2500'.repeat(w));
  const sepText = '  ' + sepCells.join('\u2500\u253c\u2500');

  // Data rows: same padding and joining
  // ...
  return new Column({ children: tableLines });
}
```

This is a fundamentally different approach: column widths are computed from string lengths (not widget intrinsic sizes), and the entire table is composed of pre-formatted `Text` widgets in a `Column`. No custom RenderObject is involved. The visual border characters are embedded directly in the text strings.

---

## 5. GridBorder: The Split-Pane Container

### 5.1 Widget API

`GridBorder` (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/grid-border.ts`) provides a bordered split-pane layout:

```typescript
export class GridBorder extends MultiChildRenderObjectWidget {
  readonly style: BoxDrawingStyle;
  readonly borderColor?: Color;
  readonly rightPaneWidth: number;
  readonly bannerMode: boolean;
}
```

Children are interpreted as:
- `children[0]` -- left pane (fills remaining width)
- `children[1..n]` -- right pane children (stacked vertically with dividers)

### 5.2 RenderGridBorder Layout

From `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-grid-border.ts`:

The layout is a fixed-right, fluid-left split:

```
+--------------------+------+
| left child         | rt1  |
|                    |------+
|                    | rt2  |
+--------------------+------+
```

Key sizing:
- Outer border consumes 2 chars horizontally and 2 chars vertically
- Vertical divider between panes consumes 1 char
- Right pane width is fixed (`rightPaneWidth` property)
- Left pane gets all remaining width: `leftWidth = innerWidth - dividerWidth - rightWidth`
- Right pane children are distributed evenly: `perChildHeight = Math.floor(availableRightHeight / rightCount)`
- Height remainder is distributed one extra row each to earlier children

Left child gets tight constraints matching the full left pane area. Right children each get tight constraints for their slot.

### 5.3 Banner Mode

The `bannerMode` flag replaces the top-left corner character from the standard corner (`\u256D` for rounded) with a right-pointing T-junction (`\u251C`), allowing the border to visually merge with a banner widget above it. This is used by the PromptBar (F0H in Amp) to create a seamless bordered area below a header.

### 5.4 Border Painting

`RenderGridBorder.paint()` draws:
1. Outer border (4 corners + horizontal/vertical edges)
2. Vertical divider between left and right panes (T-junctions at top and bottom)
3. Horizontal dividers between right-pane children (cross junctions at intersections)

All drawing uses `PaintContext.drawChar()` with box-drawing characters from the `BOX_DRAWING` lookup table.

---

## 6. Integration with the Constraint System

### 6.1 BoxConstraints Flow

`RenderTable` receives constraints from its parent and immediately subtracts border overhead to compute `availableWidth`. The constraint propagation follows the standard box layout protocol:

1. **Parent provides constraints** to RenderTable via `layout(constraints)`
2. **RenderTable subtracts** border overhead (outer border + column dividers)
3. **Intrinsic columns** are measured with loose constraints (minWidth=0, maxWidth=availableWidth)
4. **Flex columns** receive their proportional share of remaining space
5. **Final cell layout** uses tight width constraints (minWidth = maxWidth = cellWidth) with loose height
6. **RenderTable sets its size** via `constraints.constrain(totalSize)`

The `BoxConstraints.constrain()` method (`/home/gem/workspace/flitter/packages/flitter-core/src/core/box-constraints.ts`) clamps the computed total size to fit within the parent's bounds.

### 6.2 Unbounded Height Handling

When `maxHeight` is infinite (common inside `SingleChildScrollView`), the table allows cells to be as tall as they want:

```typescript
maxHeight: Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : Infinity
```

For intrinsic measurement, when height is infinite, the code uses a fallback of 1000:

```typescript
maxHeight: Number.isFinite(constraints.maxHeight) ? constraints.maxHeight : 1000
```

This is a practical guard against infinite layout during the intrinsic width measurement pass.

### 6.3 GridBorder Constraint Handling

`RenderGridBorder` always fills its parent's maximum size, making it a "fill" widget:

```typescript
this.size = constraints.constrain(
  new Size(constraints.maxWidth, constraints.maxHeight),
);
```

The left child receives tight constraints matching the computed left pane dimensions. Right children receive tight constraints for their individual slots. This means the GridBorder always fully occupies its allocated space, which makes sense for a bordered container that needs to paint its border to the edges.

---

## 7. Border and Separator Rendering

### 7.1 Box-Drawing Character Sets

The `border-painter.ts` (`/home/gem/workspace/flitter/packages/flitter-core/src/painting/border-painter.ts`) defines two complete box-drawing character sets:

```typescript
export const BOX_DRAWING: Record<BoxDrawingStyle, BoxDrawingChars> = {
  rounded: {
    tl: '\u256D', tr: '\u256E', bl: '\u2570', br: '\u256F',  // rounded corners
    h: '\u2500', v: '\u2502',
    teeDown: '\u252C', teeUp: '\u2534', teeRight: '\u251C', teeLeft: '\u2524',
    cross: '\u253C',
  },
  solid: {
    tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518',  // sharp corners
    // same edges and junctions as rounded
  },
};
```

The only difference between `rounded` and `solid` is the corner characters. All T-junctions and cross characters are identical.

### 7.2 RenderTable Border Painting

The `_paintBorders` method in RenderTable draws a complete grid:

1. **Outer border**: 4 corners, horizontal top/bottom edges, vertical left/right edges
2. **Column dividers**: Vertical lines with T-junctions at top and bottom edges
3. **Row dividers**: Horizontal lines with T-junctions at left and right edges
4. **Cross junctions**: At every intersection of row and column dividers

The column divider X positions are computed by walking through computed column widths:

```typescript
let cx = col + 1;
for (let c = 0; c < cols - 1; c++) {
  cx += this._computedColWidths[c] + pad2;
  colDividerXs.push(cx);
  // Draw vertical line from top to bottom...
  cx += 1;
}
```

Row divider Y positions are similarly computed from row heights.

### 7.3 Utility Functions

The `border-painter.ts` module also exports standalone utility functions:

- `drawHorizontalDivider()` -- draws `\u251C\u2500\u2500\u2500\u2524` patterns
- `drawVerticalDivider()` -- draws `\u252C` / `\u2502` / `\u2534` patterns
- `drawGridBorder()` -- draws a complete grid given column and row split positions

These are general-purpose utilities that any render object can use. The `drawGridBorder` function is exported from `flitter-core/src/index.ts`.

### 7.4 Paint Order

Children are painted **before** borders in `RenderTable`:

```typescript
paint(context: PaintContext, offset: Offset): void {
  for (const child of this.children) {
    child.paint(context, offset.add(child.offset));
  }
  if (this._showBorder) {
    this._paintBorders(context, offset);
  }
}
```

This means borders are drawn on top of cell content. Since borders occupy the space between cells (which cells do not write to), this generally works correctly. However, if a cell overflow its allocated space, the border characters would overwrite the overflow.

In `RenderGridBorder`, the order is reversed -- borders first, then children:

```typescript
paint(context: PaintContext, offset: Offset): void {
  // Draw outer border and dividers...
  for (const child of this.children) {
    child.paint(context, offset.add(child.offset));
  }
}
```

This is likely intentional: GridBorder's children are inset within the border, so painting order is borders first to establish the frame, then children fill the interior.

---

## 8. Comparison with Flutter's Table Widget

### 8.1 Similarities

| Aspect | Flutter | Flitter |
|--------|---------|---------|
| Column width types | `FixedColumnWidth`, `FlexColumnWidth`, `IntrinsicColumnWidth` | `fixed()`, `flex()`, `intrinsic()` |
| Row-major child ordering | Yes | Yes |
| Per-column width specification | `Map<int, TableColumnWidth>` | `TableColumnWidth[]` |
| Default column width | `FlexColumnWidth(1.0)` | `TableColumnWidth.flex(1)` |
| Row heights | Max of cells in row | Max of cells in row |
| Border support | `TableBorder` object | `showBorder` + `borderStyle` + `borderColor` |

### 8.2 Differences

| Aspect | Flutter | Flitter |
|--------|---------|---------|
| Children structure | `List<TableRow>` with row widgets | Flat `Widget[][]` array |
| Column width defaulting | Per-column via `defaultColumnWidth` | Missing entries default to `flex(1)` |
| Vertical alignment | Per-cell via `TableCellVerticalAlignment` | Not implemented (cells top-aligned) |
| Horizontal alignment | Not in Table (delegated to cell widgets) | Same approach |
| Span support | Not built-in | Not built-in |
| Border style options | `TableBorder` with per-side control | `BoxDrawingStyle` (rounded/solid) only |
| Cell padding | Not in Table (delegated to `Padding` widget) | Built-in `cellPadding` property |
| `IntrinsicColumnWidth` | Uses `computeMaxIntrinsicWidth` protocol | Performs full layout with loose constraints |

### 8.3 Missing Flutter Features

Flitter's table does not implement:
- `TableCellVerticalAlignment` (top, middle, bottom, baseline, fill)
- Per-row decoration (`TableRow.decoration`)
- `defaultVerticalAlignment`
- Per-column width via map (uses array indexing instead)
- `textDirection` for RTL support
- `border` with per-side configuration (only uniform border)

### 8.4 Flitter-Specific Features

Flitter's table adds terminal-specific features:
- **Box-drawing characters**: Full Unicode box-drawing with corners, T-junctions, and crosses
- **Cell padding in character units**: Integer-based padding appropriate for terminal grids
- **Two drawing styles**: Rounded and solid box-drawing variants
- **Border color**: Direct color support via the `Color` type
- **Backward-compatible 2-column Table**: Simpler API for common 2-column case

---

## 9. Code Patterns and Observations

### 9.1 Dual Table Architecture

The codebase provides two fundamentally different table mechanisms:
- **Composition-based** (`Table<T>`): Built from standard layout primitives, limited to 2 columns, no custom RenderObject
- **Custom RenderObject** (`DataTable`/`RenderTable`): Full N-column layout engine with border painting

This dual approach means simple cases use the lightweight composition approach while complex tables can use the full engine. However, neither is actually used in the Amp application layer -- the header bar, bottom grid, tool headers, and all multi-column layouts use `Row` + `Expanded` directly.

### 9.2 Markdown Table as a Third Approach

The Markdown widget's `_renderTable` method represents a third approach entirely: computing column widths from text string lengths and constructing pre-formatted `Text` widgets. This bypasses the widget table system entirely. While pragmatic for markdown rendering (where content is always text), it means markdown tables cannot contain interactive widgets, styled sub-trees, or variable-height cells.

### 9.3 GridBorder as Layout Primitive

`GridBorder`/`RenderGridBorder` is purpose-built for the PromptBar split-pane layout. It is not a general-purpose grid -- it only supports a 2-pane split (left + right) with the right pane subdivided vertically. The `bannerMode` flag reveals its tight coupling to a specific UI pattern. This is an example of creating a specialized RenderObject for a specific layout requirement rather than composing from general primitives.

### 9.4 Integer Coordinate System

All layout calculations use integer arithmetic (with `Math.floor` for division), consistent with the terminal's character-cell grid. There is no sub-pixel rendering. Rounding errors from flex distribution are corrected by adding the remainder to the first flex column, a simple but effective approach.

### 9.5 Intrinsic Width Measurement Limitation

The intrinsic column width measurement performs a **full layout** of each cell rather than using a dedicated `computeMaxIntrinsicWidth` method. This means:
- Cells are laid out twice for intrinsic columns (once to measure, once for final layout)
- The measurement uses a conservative `maxHeight` of 1000 when the constraint height is infinite
- The width calculation subtracts `pad2` from the measured size, suggesting padding is included in the child's reported size

### 9.6 Border Overhead Calculation

The border overhead is carefully tracked separately from content layout:
- **Horizontal**: 2 outer border chars + (cols-1) column divider chars
- **Vertical**: 2 outer border chars + (rows-1) row divider chars

These are subtracted from available space before column width calculation and added back for total size computation. This ensures border drawing does not reduce cell content area unexpectedly.

### 9.7 Paint Context Integration

All border painting uses `PaintContext.drawChar()`, which:
1. Computes character width (via `wcwidth`)
2. Checks clip bounds
3. Merges with existing background style
4. Writes to the `ScreenBuffer`

The `drawChar` with explicit `width: 1` is used for all box-drawing characters, which is correct since all Unicode box-drawing characters are single-width.

### 9.8 Immutability and Dirty Tracking

Both `RenderTable` and `RenderGridBorder` implement proper dirty tracking through their property setters:
- Layout-affecting changes (column count, widths, padding, right pane width) call `markNeedsLayout()`
- Paint-only changes (border style, color) call `markNeedsPaint()`
- Same-value assignments short-circuit to avoid unnecessary work

This follows the standard Flutter/Flitter pattern of minimizing redundant layout and paint passes.

### 9.9 Export Surface

From `/home/gem/workspace/flitter/packages/flitter-core/src/index.ts`:

```typescript
export { GridBorder } from './widgets/grid-border';
export { RenderGridBorder } from './layout/render-grid-border';
export type { GridBorderConfig } from './layout/render-grid-border';
export { DataTable, TableColumnWidth } from './widgets/table';
export { RenderTable } from './layout/render-table';
export type { TableConfig, TableCellParentData } from './layout/render-table';
```

Both widget and render object layers are publicly exported, allowing consumers to either use the high-level widget API or create custom render objects that extend or compose with the table layout engine.

---

## 10. Summary

The table and grid layout system in Flitter-core is a well-structured, three-tier system:

1. **Simple 2-column Table**: Composition of Row + Expanded, zero custom layout code
2. **Full DataTable + RenderTable**: Custom multi-child RenderObject with fixed/flex/intrinsic column widths, border painting, and cell padding
3. **GridBorder + RenderGridBorder**: Specialized split-pane bordered container for application chrome

In practice, the Amp application layer predominantly uses `Row` + `Expanded` for its multi-column layouts rather than the formal table system. The `DataTable`/`RenderTable` engine exists as infrastructure for structured data display but is not exercised in the current Amp UI reconstruction. The Markdown widget bypasses the table system entirely, using text-formatting to create visual tables from GFM markup.

The system faithfully mirrors Flutter's `Table` widget API patterns (column width types, row-major ordering, max-height rows) while adding terminal-specific capabilities (box-drawing characters, integer coordinates, rounded/solid styles). The main omissions compared to Flutter are vertical cell alignment and per-side border control.
