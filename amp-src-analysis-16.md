# Analysis 16: Flex Layout System -- Column, Row, and RenderFlex

## File Inventory

| File | Purpose |
|------|---------|
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/flex.ts` | Widget-layer classes: `Flex`, `Row`, `Column` |
| `/home/gem/workspace/flitter/packages/flitter-core/src/layout/render-flex.ts` | `RenderFlex` -- the render-object implementing the 6-step flex layout algorithm |
| `/home/gem/workspace/flitter/packages/flitter-core/src/layout/parent-data.ts` | `FlexParentData` (flex factor + fit mode) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/flexible.ts` | `Flexible` and `Expanded` ParentDataWidgets |

---

## 1. Widget Hierarchy: Flex, Row, Column

The three-class widget hierarchy mirrors Flutter exactly and maps to specific Amp minified identifiers:

```
Flex (IJ)  extends MultiChildRenderObjectWidget (An)
  Row (q8)    extends Flex -- direction = 'horizontal'
  Column (o8) extends Flex -- direction = 'vertical'
```

`Flex` is the abstract base. It stores four configuration properties:

- **`direction: Axis`** -- `'horizontal'` or `'vertical'`. Row hardcodes horizontal, Column hardcodes vertical.
- **`mainAxisAlignment: MainAxisAlignment`** -- How children are distributed along the main axis. Options: `start`, `end`, `center`, `spaceBetween`, `spaceAround`, `spaceEvenly`. Default: `'start'`.
- **`crossAxisAlignment: CrossAxisAlignment`** -- How children are aligned along the cross axis. Options: `start`, `end`, `center`, `stretch`, `baseline`. Default: `'center'`.
- **`mainAxisSize: MainAxisSize`** -- Whether the flex container should expand to fill its parent (`'max'`, the default) or shrink-wrap its children (`'min'`).

Both `Row` and `Column` provide static factory methods for common alignment patterns (e.g., `Row.spaceBetween(children)`, `Column.center(children)`), which serve as convenience constructors.

The `createRenderObject()` method instantiates a `RenderFlex`, and `updateRenderObject()` patches all four properties via setters that call `markNeedsLayout()` on change.

---

## 2. FlexParentData: Flex Factor and Fit

`FlexParentData` (Amp: `S_`) extends `BoxParentData` and carries two fields:

- **`flex: number`** (default `0`) -- The flex factor. Children with `flex > 0` are flex children; those with `flex === 0` are non-flex (rigid) children. The flex factor determines the proportional share of free space a child receives.
- **`fit: FlexFit`** (default `'tight'`) -- Either `'tight'` or `'loose'`. With `tight` fit, the child is forced to occupy exactly its allocated flex space (min == max along the main axis). With `loose` fit, the child may be smaller than its allocation (min == 0, max == allocated space).

`RenderFlex.setupParentData()` ensures every child gets a `FlexParentData` instance, replacing any existing parent data that is not already of that type.

---

## 3. Expanded and Flexible Widgets

These are `ParentDataWidget` subclasses that inject `FlexParentData` onto their child's render object:

### Flexible (Amp: `lv`)

Wraps a child and sets `flex` (default 1) and `fit` (default `'loose'`). With loose fit, the child can be anywhere from 0 up to its allocated share of free space along the main axis. The `applyParentData()` method mutates the child's `FlexParentData.flex` and `FlexParentData.fit` properties, and if either changed, triggers `markNeedsLayout()` on the parent `RenderFlex`.

### Expanded (Amp: `u3`)

Subclass of `Flexible` that hardcodes `fit = 'tight'`. This means the child is forced to fill exactly its proportional share of remaining space. `Expanded` is the most commonly used flex widget in the chat view, typically wrapping the scrollable content area so it fills all vertical space not consumed by the header or input bar.

---

## 4. The RenderFlex 6-Step Layout Algorithm

`RenderFlex.performLayout()` (Amp: `oU0.performLayout()`) implements the core layout logic. The algorithm operates in terms of "main axis" and "cross axis", where the axis semantics flip depending on direction (horizontal for Row, vertical for Column).

### Step 1: Separate Flex vs. Non-Flex Children

Iterate all children. Each child's `FlexParentData.flex` determines its category:
- `flex > 0`: added to the flex pool; its `flex` value accumulates into `totalFlex`.
- `flex === 0`: non-flex (rigid) child.

### Step 2: Layout Non-Flex Children with Unbounded Main Axis

Non-flex children are laid out first with constraints that are **unbounded along the main axis** (Infinity) but bounded along the cross axis. If `crossAxisAlignment === 'stretch'`, the cross-axis constraint is tight (min == max == maxCross); otherwise it is loose (0..maxCross). This allows rigid children to take exactly as much main-axis space as they need intrinsically.

After layout, the algorithm accumulates `allocatedSize` (total main-axis space consumed) and tracks `maxCrossSize` (the largest cross-axis extent among all children laid out so far).

### Step 3: Distribute Remaining Space to Flex Children

```
freeSpace = max(0, maxMain - allocatedSize)
spacePerFlex = totalFlex > 0 ? freeSpace / totalFlex : 0
```

Each flex child receives `floor(spacePerFlex * child.flex)` pixels along the main axis. The constraint applied depends on the child's `fit`:

- **`tight`**: `minMain = maxMain = childMainSize` -- the child must be exactly this size. This is what `Expanded` uses.
- **`loose`**: `minMain = 0, maxMain = childMainSize` -- the child may be smaller. This is what `Flexible` (with default fit) uses.

Cross-axis constraints follow the same stretch/non-stretch logic as Step 2. After layout, each flex child's actual size is added to `allocatedSize` and `maxCrossSize` is updated.

### Step 4: Compute Final Self Size

The container's own main-axis extent depends on `mainAxisSize`:
- **`'max'`**: If the constraint max is finite, use it; otherwise fall back to `allocatedSize`. This makes Column/Row expand to fill their parent by default.
- **`'min'`**: Use `allocatedSize` (shrink-wrap).

The cross-axis extent is the maximum of `maxCrossSize` and `minCross`, clamped to `maxCross` if finite. The final `Size` is constrained by the parent's box constraints.

### Step 5: Position Children Along the Main Axis (mainAxisAlignment)

The algorithm computes `remainingSpace = actualMainSize - allocatedSize`, then distributes it according to the alignment mode:

| Alignment | Leading Space | Between Space |
|-----------|---------------|---------------|
| `start` | 0 | 0 |
| `end` | remainingSpace | 0 |
| `center` | remainingSpace / 2 | 0 |
| `spaceBetween` | 0 | remainingSpace / (n - 1) |
| `spaceAround` | half-between | remainingSpace / n |
| `spaceEvenly` | equal-between | remainingSpace / (n + 1) |

### Step 6: Apply Cross-Axis Offsets and Set Positions

For each child in insertion order, compute the cross-axis offset:

| CrossAxisAlignment | Offset |
|--------------------|--------|
| `start` | 0 |
| `center` | (actualCrossSize - childCrossSize) / 2 |
| `end` | actualCrossSize - childCrossSize |
| `stretch` | 0 (child was already forced to fill cross axis in Step 2/3) |
| `baseline` | 0 (TUI simplification; terminal cells share a baseline) |

The child's `offset` property is set to an `Offset(col, row)` combining the main-axis position (with cumulative `mainOffset + betweenSpace`) and the cross-axis offset, flipped according to direction. All main-axis offsets are `Math.round()`-ed to integer positions for terminal rendering.

---

## 5. Intrinsic Size Calculations

`RenderFlex` provides all four intrinsic size methods, which are critical for parent widgets that need to query natural sizes before running the full layout pass:

- **Along the main axis (min)**: Sum of non-flex children's intrinsic sizes. Flex children contribute 0 to the minimum, since they can collapse.
- **Along the main axis (max)**: Sum of non-flex children plus flex-proportional scaling for flex children. The proportional calculation finds `max(childIntrinsic / flex)` across all flex children, then multiplies by `totalFlex`. This ensures the flex distribution would not force any flex child below its natural size.
- **Along the cross axis (min and max)**: Maximum across all children's cross-axis intrinsic sizes (since children are arranged along the main axis, they compete for cross-axis space).

---

## 6. How Column Drives the Chat View's Vertical Layout

In the Amp TUI, the top-level chat screen is structured as a `Column` with `mainAxisSize: 'max'` and `mainAxisAlignment: 'start'`. This Column fills the entire terminal height. A typical child list looks like:

1. **Header bar** (non-flex, rigid) -- A Row containing the title, model badge, and cost display. It sizes itself to exactly 1-2 rows.
2. **Scrollable message area** (wrapped in `Expanded`) -- The `SingleChildScrollView` containing the conversation. Because it is wrapped in `Expanded` (flex=1, fit=tight), it receives all remaining vertical space after the header and input area are laid out.
3. **Input area / status bar** (non-flex, rigid) -- The text input field and tool status indicators, sizing themselves to their intrinsic height.

The layout sequence is:
1. Column's `RenderFlex` measures the header and input area first (Step 2), consuming perhaps 3-5 rows.
2. All remaining terminal rows are allocated to the Expanded child (Step 3), giving the message scroll area maximum real estate.
3. Children are positioned top-to-bottom starting at row 0 (Step 5, mainAxisAlignment='start').
4. Cross-axis alignment centers or stretches children horizontally across the full terminal width (Step 6).

This architecture ensures the chat view dynamically adapts to terminal resizes: the rigid header and input areas keep their natural sizes while the scrollable message area absorbs all remaining space, exactly matching the behavior observed in the original Amp binary.

---

## 7. Paint Pass

`RenderFlex.paint()` is straightforward: it iterates children in order and delegates to each child's `paint()` method, passing `offset.add(child.offset)` to accumulate the global position. Because child offsets were computed as integer terminal coordinates during layout, no further rounding is needed during painting.

---

## Summary

The Flex layout system is the backbone of Flitter's spatial arrangement. The widget layer (`Flex`/`Row`/`Column`) provides a declarative API with alignment and sizing options. The `FlexParentData` mechanism, injected by `Flexible` and `Expanded` ParentDataWidgets, annotates children with flex factors and fit modes. The `RenderFlex` render object executes a precise 6-step algorithm -- separate, measure rigid, distribute flex, size self, position along main axis, align on cross axis -- that faithfully reproduces Flutter's flex layout semantics in a terminal-oriented integer-coordinate system. Column, as the vertical specialization, is the primary structural widget driving the chat view's top-to-bottom layout where rigid UI chrome (header, input) coexists with an Expanded scrollable message area.
