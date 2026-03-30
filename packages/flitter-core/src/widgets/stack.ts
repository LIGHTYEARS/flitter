// Stack, Positioned, StackParentData, RenderStack
// Amp ref: ng (Stack), L4 (Positioned), hF (RenderStack)
// Source: amp-strings.txt:529716

import { Widget } from '../framework/widget';
import {
  MultiChildRenderObjectWidget,
  RenderBox,
  ContainerRenderBox,
  BoxParentData,
  type PaintContext,
  type RenderObject,
} from '../framework/render-object';
import { BoxConstraints } from '../core/box-constraints';
import { Offset, Size } from '../core/types';
import { Key } from '../core/key';
import { ParentDataWidget } from './parent-data-widget';

// ---------------------------------------------------------------------------
// StackParentData
// ---------------------------------------------------------------------------

/**
 * Parent data for positioned children in a Stack.
 * Stores left, top, right, bottom, width, height positioning info.
 */
export class StackParentData extends BoxParentData {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;

  /** Whether this child has any positioning information set. */
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

// ---------------------------------------------------------------------------
// StackFit type
// ---------------------------------------------------------------------------

export type StackFit = 'loose' | 'expand' | 'passthrough';

// ---------------------------------------------------------------------------
// Stack (Amp: ng)
// ---------------------------------------------------------------------------

/**
 * A widget that positions its children relative to the edges of its box.
 * Non-positioned children are laid out according to `fit`.
 * Positioned children use their left/top/right/bottom/width/height to determine layout.
 *
 * Amp ref: class ng extends An
 */
export class Stack extends MultiChildRenderObjectWidget {
  readonly fit: StackFit;

  constructor(opts?: {
    key?: Key;
    children?: Widget[];
    fit?: StackFit;
  }) {
    super({ key: opts?.key, children: opts?.children });
    this.fit = opts?.fit ?? 'loose';
  }

  createRenderObject(): RenderStack {
    return new RenderStack({ fit: this.fit });
  }

  updateRenderObject(renderObject: RenderStack): void {
    renderObject.fit = this.fit;
  }
}

// ---------------------------------------------------------------------------
// Positioned (Amp: L4) — ParentDataWidget
// ---------------------------------------------------------------------------

/**
 * A widget that controls where a child of a Stack is positioned.
 * Wraps a child and applies StackParentData fields to the child's render object.
 *
 * Amp ref: class L4 extends R_ (ParentDataWidget)
 */
export class Positioned extends ParentDataWidget {
  readonly left?: number;
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly width?: number;
  readonly height?: number;

  constructor(opts: {
    key?: Key;
    child: Widget;
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
    width?: number;
    height?: number;
  }) {
    super({ key: opts.key, child: opts.child });
    this.left = opts.left;
    this.top = opts.top;
    this.right = opts.right;
    this.bottom = opts.bottom;
    this.width = opts.width;
    this.height = opts.height;
  }

  /**
   * Apply positioning data to the child's render object's parentData.
   *
   * Amp ref: L4.applyParentData(renderObject) via R_.applyParentData
   */
  applyParentData(renderObject: RenderObject): void {
    if (renderObject.parentData instanceof StackParentData) {
      const pd = renderObject.parentData;
      let needsLayout = false;

      if (pd.left !== this.left) {
        pd.left = this.left;
        needsLayout = true;
      }
      if (pd.top !== this.top) {
        pd.top = this.top;
        needsLayout = true;
      }
      if (pd.right !== this.right) {
        pd.right = this.right;
        needsLayout = true;
      }
      if (pd.bottom !== this.bottom) {
        pd.bottom = this.bottom;
        needsLayout = true;
      }
      if (pd.width !== this.width) {
        pd.width = this.width;
        needsLayout = true;
      }
      if (pd.height !== this.height) {
        pd.height = this.height;
        needsLayout = true;
      }

      if (needsLayout && renderObject.parent) {
        (renderObject.parent as RenderObject).markNeedsLayout();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// RenderStack (Amp: hF)
// ---------------------------------------------------------------------------

/**
 * Renders a stack of children, positioning them according to their parent data.
 * Non-positioned children are laid out per the `fit` property.
 * Positioned children use left/top/right/bottom/width/height constraints.
 *
 * Amp ref: class hF extends ContainerRenderBox
 */
export class RenderStack extends ContainerRenderBox {
  fit: StackFit;

  constructor(opts?: { fit?: StackFit }) {
    super();
    this.fit = opts?.fit ?? 'loose';
    // Positioned children can overflow the Stack's own bounds, so hit-testing
    // must check children even when the position is outside our bounds.
    // Amp ref: hF.allowHitTestOutsideBounds = !0
    this.allowHitTestOutsideBounds = true;
  }

  override setupParentData(child: RenderObject): void {
    if (!(child.parentData instanceof StackParentData)) {
      child.parentData = new StackParentData();
    }
  }

  /**
   * Layout algorithm:
   * 1. Compute child constraints based on fit
   * 2. Layout non-positioned children, track max width/height for self-sizing
   * 3. Self-size: constrained to parent constraints
   * 4. Layout positioned children with computed constraints
   * 5. Position all children
   */
  performLayout(): void {
    const constraints = this.constraints!;
    let maxWidth = 0;
    let maxHeight = 0;

    // Compute non-positioned child constraints based on fit
    let nonPositionedConstraints: BoxConstraints;
    switch (this.fit) {
      case 'loose':
        nonPositionedConstraints = constraints.loosen();
        break;
      case 'expand':
        nonPositionedConstraints = BoxConstraints.tight(constraints.biggest);
        break;
      case 'passthrough':
        nonPositionedConstraints = constraints;
        break;
    }

    // Pass 1: Layout non-positioned children and determine size
    for (const child of this.children) {
      if (this._isPositioned(child)) continue;

      child.layout(nonPositionedConstraints);
      maxWidth = Math.max(maxWidth, child.size.width);
      maxHeight = Math.max(maxHeight, child.size.height);
    }

    // Self-size: use max of non-positioned children, constrained to parent
    this.size = constraints.constrain(new Size(maxWidth, maxHeight));

    // Pass 2: Layout positioned children
    for (const child of this.children) {
      if (!this._isPositioned(child)) {
        // Position non-positioned children at (0, 0)
        child.offset = Offset.zero;
        continue;
      }

      const pos = this._getPositionData(child);
      const childConstraints = this._computePositionedConstraints(pos);
      child.layout(childConstraints);

      // Position the child
      const childOffset = this._computePositionedOffset(pos, child.size);
      child.offset = childOffset;
    }
  }

  paint(context: PaintContext, offset: Offset): void {
    for (const child of this.children) {
      child.paint(context, offset.add(child.offset));
    }
  }

  // --- Internal helpers ---

  private _isPositioned(child: RenderBox): boolean {
    if (child.parentData instanceof StackParentData) {
      return child.parentData.isPositioned();
    }
    return false;
  }

  private _getPositionData(child: RenderBox): {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
    width?: number;
    height?: number;
  } {
    if (child.parentData instanceof StackParentData) {
      const pd = child.parentData;
      return {
        left: pd.left,
        top: pd.top,
        right: pd.right,
        bottom: pd.bottom,
        width: pd.width,
        height: pd.height,
      };
    }
    return {};
  }

  private _computePositionedConstraints(pos: {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
    width?: number;
    height?: number;
  }): BoxConstraints {
    let minWidth = 0;
    let maxWidth = Infinity;
    let minHeight = 0;
    let maxHeight = Infinity;

    // Width computation
    if (pos.left !== undefined && pos.right !== undefined) {
      // Both left and right set: width is determined
      const w = this.size.width - pos.left - pos.right;
      minWidth = Math.max(0, w);
      maxWidth = Math.max(0, w);
    } else if (pos.width !== undefined) {
      minWidth = pos.width;
      maxWidth = pos.width;
    } else {
      // Loose: 0 to stack width
      maxWidth = this.size.width;
    }

    // Height computation
    if (pos.top !== undefined && pos.bottom !== undefined) {
      const h = this.size.height - pos.top - pos.bottom;
      minHeight = Math.max(0, h);
      maxHeight = Math.max(0, h);
    } else if (pos.height !== undefined) {
      minHeight = pos.height;
      maxHeight = pos.height;
    } else {
      maxHeight = this.size.height;
    }

    return new BoxConstraints({ minWidth, maxWidth, minHeight, maxHeight });
  }

  private _computePositionedOffset(
    pos: {
      left?: number;
      top?: number;
      right?: number;
      bottom?: number;
      width?: number;
      height?: number;
    },
    childSize: Size,
  ): Offset {
    let x = 0;
    let y = 0;

    if (pos.left !== undefined) {
      x = pos.left;
    } else if (pos.right !== undefined) {
      x = this.size.width - pos.right - childSize.width;
    }

    if (pos.top !== undefined) {
      y = pos.top;
    } else if (pos.bottom !== undefined) {
      y = this.size.height - pos.bottom - childSize.height;
    }

    return new Offset(x, y);
  }
}
