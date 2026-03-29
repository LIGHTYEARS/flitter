# Analysis 28: Stack, Positioned, and Overlay Widgets

## Source File

`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/stack.ts`

This single file contains four exported types that together implement the complete Stack/Positioned overlay system: `StackParentData`, `Stack`, `Positioned` (with its `RenderPositioned`), and `RenderStack`. The Amp binary equivalents are `ng` (Stack), `L4` (Positioned), and `hF` (RenderStack).

---

## StackParentData

```ts
export class StackParentData extends BoxParentData {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;

  isPositioned(): boolean {
    return (
      this.left !== undefined ||
      this.top !== undefined ||
      this.right !== undefined ||
      this.bottom !== undefined ||
      this.width !== undefined ||
      this.height !== undefined
    );
  }
}
```

`StackParentData` extends `BoxParentData` to carry six optional positioning fields. Its `isPositioned()` method returns `true` if any field is set, which RenderStack uses to distinguish positioned children from non-positioned ones. This acts as the metadata channel between the Positioned widget and the RenderStack layout algorithm.

---

## Stack Widget

```ts
export class Stack extends MultiChildRenderObjectWidget {
  readonly fit: StackFit; // 'loose' | 'expand' | 'passthrough'
  // ...
  createRenderObject(): RenderStack {
    return new RenderStack({ fit: this.fit });
  }
}
```

Stack is a `MultiChildRenderObjectWidget` that layers its children on top of each other. Its single configuration property is `fit`, which controls how non-positioned children are constrained:

- **`'loose'`** (default): Children receive loosened constraints (minWidth/minHeight set to 0, maxes from parent). Each child sizes itself freely up to the parent maximum.
- **`'expand'`**: Children receive tight constraints equal to the parent's biggest size (`BoxConstraints.tight(constraints.biggest)`), forcing all non-positioned children to fill the entire available area.
- **`'passthrough'`**: The parent's constraints are forwarded as-is to children, preserving both min and max bounds.

The fit property is the only configuration the Stack widget holds; all positioning logic is delegated to child-level `Positioned` wrappers and the `RenderStack` layout algorithm.

---

## Positioned Widget and RenderPositioned

```ts
export class Positioned extends SingleChildRenderObjectWidget {
  readonly left?: number;
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly widthValue?: number;
  readonly heightValue?: number;
  // ...
}
```

`Positioned` wraps a single child and attaches edge/dimension constraints. Because `ParentDataWidget` is not yet available in this codebase (noted as Plan 07-01b), Positioned is implemented as a `SingleChildRenderObjectWidget` that creates a `RenderPositioned` render object. RenderPositioned stores the six positional fields and exposes an `isPositioned()` method. During its own `performLayout()`, it simply delegates layout to its child and adopts the child's size. During painting, it passes through to its child without offset modification -- the parent RenderStack is responsible for computing and applying the actual offset.

RenderStack detects positioned children in two ways: it checks if the child is an instance of `RenderPositioned` (the primary path), or if the child's `parentData` is a `StackParentData` with any fields set (the fallback path). This dual detection ensures compatibility whether the child is wrapped in a Positioned widget or has parent data injected through another mechanism.

---

## RenderStack Layout Algorithm

RenderStack extends `ContainerRenderBox` and implements a two-pass layout:

### Pass 1: Non-Positioned Children

```ts
for (const child of this.children) {
  if (this._isPositioned(child)) continue;
  child.layout(nonPositionedConstraints);
  maxWidth = Math.max(maxWidth, child.size.width);
  maxHeight = Math.max(maxHeight, child.size.height);
}
this.size = constraints.constrain(new Size(maxWidth, maxHeight));
```

The first pass iterates over all children, skipping positioned ones. Each non-positioned child is laid out according to the `fit`-derived constraints. The Stack tracks the maximum width and height across all non-positioned children, then self-sizes to that envelope (clamped to the parent constraints). This means the Stack's own size is determined entirely by its non-positioned children -- positioned children do not influence the Stack's dimensions.

### Pass 2: Positioned Children

```ts
for (const child of this.children) {
  if (!this._isPositioned(child)) {
    child.offset = Offset.zero;
    continue;
  }
  const pos = this._getPositionData(child);
  const childConstraints = this._computePositionedConstraints(pos);
  child.layout(childConstraints);
  const childOffset = this._computePositionedOffset(pos, child.size);
  child.offset = childOffset;
}
```

Non-positioned children are placed at `(0, 0)`. For positioned children, two helper methods compute constraints and offsets:

**`_computePositionedConstraints`**: Derives tight or loose constraints from edge values:
- If both `left` and `right` are set, width is forced to `stackWidth - left - right`.
- If only `width` is set, it becomes a tight width constraint.
- Otherwise, width is loose from 0 to the stack's width.
- The same logic applies vertically with `top`/`bottom`/`height`.

**`_computePositionedOffset`**: Calculates the child's position:
- If `left` is set, `x = left`.
- Else if `right` is set, `x = stackWidth - right - childWidth`.
- Same for `y` with `top`/`bottom`.

This means specifying `left: 5, right: 10` on a 40-wide stack gives a child a forced width of 25 and places it at x=5. Specifying `right: 5` alone lets the child size freely and then anchors its right edge 5 units from the stack's right edge.

### Painting

Painting iterates children in order, applying `offset.add(child.offset)`. Because children are painted in insertion order, later children visually overlay earlier ones -- this is the fundamental mechanism that makes Stack useful for overlays.

---

## Usage in the Amp App

### Permission Dialog Overlay (app.ts)

The top-level App widget uses Stack with `fit: 'expand'` to layer a modal permission dialog over the main content:

```ts
result = new Stack({
  fit: 'expand',
  children: [
    mainContent,
    new Positioned({
      top: 0, left: 0, right: 0, bottom: 0,
      child: new PermissionDialog({ ... }),
    }),
  ],
});
```

The `fit: 'expand'` ensures the stack fills the entire terminal area. The Positioned child with all four edges set to 0 stretches the PermissionDialog to cover the full screen. The same pattern is used for the CommandPalette overlay and the FilePicker overlay, with the FilePicker using `left: 1, bottom: 3` to position it near the bottom-left rather than filling the whole screen.

### PermissionDialog Internal Structure (permission-dialog.ts)

Inside PermissionDialog itself, there is a nested Stack also with `fit: 'expand'`:

```ts
return new Stack({
  fit: 'expand',
  children: [
    new Positioned({
      top: 0, left: 0, right: 0, bottom: 0,
      child: new Container({ color: Color.rgba(0, 0, 0, 0.6) }),
    }),
    new FocusScope({ autofocus: true, child: centeredDialogContent }),
  ],
});
```

The first child is a full-screen semi-transparent background mask (Positioned with all edges at 0). The second child is a non-positioned Column that centers the actual dialog box. Since non-positioned children are placed at (0, 0) and laid out with loose constraints, the Column uses `mainAxisAlignment: 'center'` and `crossAxisAlignment: 'center'` to visually center the dialog.

### Input Area Border Overlays (input-area.ts)

The InputArea widget uses Stack with `fit: 'passthrough'` to overlay badge text on top of the bordered input field:

```ts
inputWidget = new Stack({
  fit: 'passthrough',
  children: [borderedInput, ...overlays],
});
```

Overlays include a mode/model badge positioned at `top: 0, right: 1`, an image attachment count at `bottom: 0, left: 1`, and additional configurable overlay texts. Using `'passthrough'` ensures the stack adopts the same constraints the bordered input would have received, preserving the input area's natural sizing behavior while floating badge widgets at the corners.

### ContainerWithOverlays (container-with-overlays.ts)

This utility widget generalizes the overlay pattern. It groups `OverlaySpec` objects by position (`top`/`bottom`) and alignment (`left`/`center`/`right`), then builds a Stack with the container as the first child and one Positioned widget per group:

```ts
const stack = new Stack({
  children: [container, ...positionedChildren],
  fit: 'passthrough',
});
```

When alignment is `'center'`, it sets both `left` and `right` to the same offset value so the RenderStack constrains width symmetrically. Multiple overlays at the same position/alignment are arranged in a Row within a single Positioned widget.

### Welcome Screen

The welcome screen (shown when the conversation has no items) does not directly use Stack. Instead, it uses a `Center` widget wrapping a `ChatView`, bypassing `SingleChildScrollView` to allow vertical centering. The Stack overlay machinery activates only if a permission dialog, command palette, or file picker needs to appear on top.

---

## Test Coverage

The test file at `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/scroll-stack-builder.test.ts` (lines 354-648) covers:

1. **Stack widget creation**: Verifies default `fit: 'loose'` and custom fit propagation to RenderStack.
2. **RenderStack layout with loose fit**: Confirms children receive loosened constraints (min=0), stack sizes to the max envelope of non-positioned children, and non-positioned children are placed at (0,0).
3. **RenderStack with expand fit**: Children get tight constraints equal to the parent's biggest size.
4. **RenderStack with passthrough fit**: Parent constraints forwarded unchanged.
5. **Painting**: All children are painted with correct offsets.
6. **Positioned child placement**: `left+top` gives direct offset; `right+bottom` computes offset from stack size minus edge minus child size.
7. **Determined width from left+right**: Width forced to `stackWidth - left - right`.
8. **Explicit width**: Tight width constraint from the `width` property.
9. **StackParentData**: `isPositioned()` returns false when empty, true when any field is set.

---

## Summary

The Stack/Positioned system provides the fundamental layering mechanism for the Flitter TUI framework. RenderStack's two-pass algorithm first sizes non-positioned children to determine the stack's own dimensions, then constrains and places positioned children relative to those dimensions. The `fit` property controls how non-positioned children are constrained. Throughout the Amp application, this system enables modal dialogs (permission, command palette, file picker) as full-screen overlays and decorative badge overlays on the input area border, all achieved through the same consistent compositional pattern of `Stack` + `Positioned` children painted in z-order.
