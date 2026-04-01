// RenderFlex — the 6-step flex layout algorithm.
// Amp ref: class oU0 extends j9, .reference/render-tree.md
// This is the core layout engine for Row, Column, Expanded, Spacer, etc.

import { Offset, Size } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import {
  ContainerRenderBox,
  RenderBox,
  RenderObject,
  PaintContext,
} from '../framework/render-object';
import { FlexParentData } from './parent-data';
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Axis = 'horizontal' | 'vertical';

export type MainAxisAlignment =
  | 'start'
  | 'end'
  | 'center'
  | 'spaceBetween'
  | 'spaceAround'
  | 'spaceEvenly';

export type CrossAxisAlignment = 'start' | 'end' | 'center' | 'stretch' | 'baseline';

export type MainAxisSize = 'min' | 'max';

// ---------------------------------------------------------------------------
// RenderFlex (Amp: oU0 extends j9)
// ---------------------------------------------------------------------------

/**
 * A render box that displays its children in a one-dimensional array (row or column).
 *
 * Implements Flutter's 6-step flex layout algorithm:
 * 1. Separate flex vs non-flex children
 * 2. Layout non-flex children with unbounded main axis
 * 3. Distribute remaining space to flex children
 * 4. Compute final self size
 * 5. Position children using mainAxisAlignment
 * 6. Apply crossAxisAlignment offsets
 *
 * Amp ref: class oU0 extends j9, render-tree.md
 */
export class RenderFlex extends ContainerRenderBox {
  private _direction: Axis;
  private _mainAxisAlignment: MainAxisAlignment;
  private _crossAxisAlignment: CrossAxisAlignment;
  private _mainAxisSize: MainAxisSize;

  /**
   * Indicates whether children overflowed the main axis after layout.
   * Set to true when the total non-flex child sizes exceed the available
   * main axis constraint.
   */
  private _hasOverflow: boolean = false;

  /**
   * Returns true if children overflowed the main axis during the last layout pass.
   */
  get hasOverflow(): boolean {
    return this._hasOverflow;
  }

  constructor(opts?: {
    direction?: Axis;
    mainAxisAlignment?: MainAxisAlignment;
    crossAxisAlignment?: CrossAxisAlignment;
    mainAxisSize?: MainAxisSize;
  }) {
    super();
    this._direction = opts?.direction ?? 'vertical';
    this._mainAxisAlignment = opts?.mainAxisAlignment ?? 'start';
    this._crossAxisAlignment = opts?.crossAxisAlignment ?? 'start';
    this._mainAxisSize = opts?.mainAxisSize ?? 'max';
  }

  // --- Getters / Setters ---

  get direction(): Axis {
    return this._direction;
  }

  set direction(value: Axis) {
    if (this._direction !== value) {
      this._direction = value;
      this.markNeedsLayout();
    }
  }

  get mainAxisAlignment(): MainAxisAlignment {
    return this._mainAxisAlignment;
  }

  set mainAxisAlignment(value: MainAxisAlignment) {
    if (this._mainAxisAlignment !== value) {
      this._mainAxisAlignment = value;
      this.markNeedsLayout();
    }
  }

  get crossAxisAlignment(): CrossAxisAlignment {
    return this._crossAxisAlignment;
  }

  set crossAxisAlignment(value: CrossAxisAlignment) {
    if (this._crossAxisAlignment !== value) {
      this._crossAxisAlignment = value;
      this.markNeedsLayout();
    }
  }

  get mainAxisSize(): MainAxisSize {
    return this._mainAxisSize;
  }

  set mainAxisSize(value: MainAxisSize) {
    if (this._mainAxisSize !== value) {
      this._mainAxisSize = value;
      this.markNeedsLayout();
    }
  }

  // --- Intrinsic Sizes ---
  // Amp ref: oU0 intrinsic dimension methods
  // For horizontal (Row): main=width, cross=height
  // For vertical (Column): main=height, cross=width
  // Flexible children contribute 0 to min intrinsic main axis size.

  /**
   * Returns the minimum intrinsic width.
   * Horizontal: sum of children's minIntrinsicWidth (flex children contribute 0)
   * Vertical: max of children's minIntrinsicWidth
   */
  getMinIntrinsicWidth(height: number): number {
    if (this._direction === 'horizontal') {
      // Sum of children's minIntrinsicWidth; flex children contribute 0
      let total = 0;
      for (const child of this.children) {
        const pd = child.parentData as FlexParentData;
        if (pd.flex > 0) continue; // flex children contribute 0 to min
        total += child.getMinIntrinsicWidth(height);
      }
      return total;
    } else {
      // Vertical: max of children's minIntrinsicWidth
      let maxVal = 0;
      for (const child of this.children) {
        const val = child.getMinIntrinsicWidth(height);
        if (val > maxVal) maxVal = val;
      }
      return maxVal;
    }
  }

  /**
   * Returns the maximum intrinsic width.
   * Horizontal: sum of non-flex children + flex-proportional scaling for flex children.
   *   Each flex child contributes max(child.maxIntrinsicWidth / flex) * flex.
   * Vertical: max of children's maxIntrinsicWidth
   */
  getMaxIntrinsicWidth(height: number): number {
    if (this._direction === 'horizontal') {
      // Amp ref: oU0 max intrinsic along main axis uses flex-proportional scaling.
      let nonFlexTotal = 0;
      let totalFlex = 0;
      let maxPerFlex = 0;

      for (const child of this.children) {
        const pd = child.parentData as FlexParentData;
        if (pd.flex > 0) {
          totalFlex += pd.flex;
          const childIntrinsic = child.getMaxIntrinsicWidth(height);
          const perFlex = childIntrinsic / pd.flex;
          if (perFlex > maxPerFlex) maxPerFlex = perFlex;
        } else {
          nonFlexTotal += child.getMaxIntrinsicWidth(height);
        }
      }
      return nonFlexTotal + maxPerFlex * totalFlex;
    } else {
      // Vertical: max of children's maxIntrinsicWidth
      let maxVal = 0;
      for (const child of this.children) {
        const val = child.getMaxIntrinsicWidth(height);
        if (val > maxVal) maxVal = val;
      }
      return maxVal;
    }
  }

  /**
   * Returns the minimum intrinsic height.
   * Horizontal: max of children's minIntrinsicHeight
   * Vertical: sum of children's minIntrinsicHeight (flex children contribute 0)
   */
  getMinIntrinsicHeight(width: number): number {
    if (this._direction === 'horizontal') {
      // Horizontal: max of children's minIntrinsicHeight
      let maxVal = 0;
      for (const child of this.children) {
        const val = child.getMinIntrinsicHeight(width);
        if (val > maxVal) maxVal = val;
      }
      return maxVal;
    } else {
      // Vertical: sum of children's minIntrinsicHeight; flex children contribute 0
      let total = 0;
      for (const child of this.children) {
        const pd = child.parentData as FlexParentData;
        if (pd.flex > 0) continue; // flex children contribute 0 to min
        total += child.getMinIntrinsicHeight(width);
      }
      return total;
    }
  }

  /**
   * Returns the maximum intrinsic height.
   * Horizontal: max of children's maxIntrinsicHeight
   * Vertical: sum of non-flex children + flex-proportional scaling for flex children.
   */
  getMaxIntrinsicHeight(width: number): number {
    if (this._direction === 'horizontal') {
      // Horizontal: max of children's maxIntrinsicHeight
      let maxVal = 0;
      for (const child of this.children) {
        const val = child.getMaxIntrinsicHeight(width);
        if (val > maxVal) maxVal = val;
      }
      return maxVal;
    } else {
      // Amp ref: oU0 max intrinsic along main axis uses flex-proportional scaling.
      let nonFlexTotal = 0;
      let totalFlex = 0;
      let maxPerFlex = 0;

      for (const child of this.children) {
        const pd = child.parentData as FlexParentData;
        if (pd.flex > 0) {
          totalFlex += pd.flex;
          const childIntrinsic = child.getMaxIntrinsicHeight(width);
          const perFlex = childIntrinsic / pd.flex;
          if (perFlex > maxPerFlex) maxPerFlex = perFlex;
        } else {
          nonFlexTotal += child.getMaxIntrinsicHeight(width);
        }
      }
      return nonFlexTotal + maxPerFlex * totalFlex;
    }
  }

  // --- ParentData setup ---

  /**
   * Override to create FlexParentData for children.
   * Amp ref: oU0.setupParentData — creates S_ if not already present.
   */
  setupParentData(child: RenderObject): void {
    if (!(child.parentData instanceof FlexParentData)) {
      child.parentData = new FlexParentData();
    }
  }

  // --- Layout ---

  /**
   * The 6-step flex layout algorithm.
   * Amp ref: oU0.performLayout() in render-tree.md
   */
  performLayout(): void {
    const constraints = this.constraints!;
    const isHorizontal = this._direction === 'horizontal';

    // Determine constraint limits for main and cross axes
    const maxMain = isHorizontal ? constraints.maxWidth : constraints.maxHeight;
    const maxCross = isHorizontal ? constraints.maxHeight : constraints.maxWidth;
    const minCross = isHorizontal ? constraints.minHeight : constraints.minWidth;

    // ---------------------------------------------------------------
    // Step 1: Separate flex and non-flex children.
    // Negative flex values are clamped to 0 to prevent invalid layouts.
    // ---------------------------------------------------------------
    let totalFlex = 0;
    const flexChildren: RenderBox[] = [];
    const nonFlexChildren: RenderBox[] = [];

    for (const child of this.children) {
      const pd = child.parentData as FlexParentData;
      if (pd.flex < 0) {
        pd.flex = 0;
      }
      if (pd.flex > 0) {
        totalFlex += pd.flex;
        flexChildren.push(child);
      } else {
        nonFlexChildren.push(child);
      }
    }

    // ---------------------------------------------------------------
    // Step 2: Layout non-flex children with unbounded main axis
    // ---------------------------------------------------------------
    let allocatedSize = 0;
    let maxCrossSize = 0;

    for (const child of nonFlexChildren) {
      let innerConstraints: BoxConstraints;
      if (isHorizontal) {
        // Unbounded width, constrain height
        if (this._crossAxisAlignment === 'stretch') {
          innerConstraints = new BoxConstraints({
            minWidth: 0,
            maxWidth: Infinity,
            minHeight: maxCross,
            maxHeight: maxCross,
          });
        } else {
          innerConstraints = new BoxConstraints({
            minWidth: 0,
            maxWidth: Infinity,
            minHeight: 0,
            maxHeight: maxCross,
          });
        }
      } else {
        // Unbounded height, constrain width
        if (this._crossAxisAlignment === 'stretch') {
          innerConstraints = new BoxConstraints({
            minWidth: maxCross,
            maxWidth: maxCross,
            minHeight: 0,
            maxHeight: Infinity,
          });
        } else {
          innerConstraints = new BoxConstraints({
            minWidth: 0,
            maxWidth: maxCross,
            minHeight: 0,
            maxHeight: Infinity,
          });
        }
      }
      child.layout(innerConstraints);

      const childMainSize = isHorizontal ? child.size.width : child.size.height;
      const childCrossSize = isHorizontal ? child.size.height : child.size.width;

      allocatedSize += childMainSize;
      if (childCrossSize > maxCrossSize) {
        maxCrossSize = childCrossSize;
      }
    }

    // ---------------------------------------------------------------
    // Step 3: Distribute remaining space to flex children.
    // When the main axis is unbounded (Infinity), flex children cannot
    // expand — they receive 0 main-axis space instead of Infinity.
    // ---------------------------------------------------------------
    const canFlex = Number.isFinite(maxMain);
    const mainAxisLimit = maxMain;
    const freeSpace = canFlex ? Math.max(0, mainAxisLimit - allocatedSize) : 0;
    const spacePerFlex = totalFlex > 0 ? freeSpace / totalFlex : 0;

    for (const child of flexChildren) {
      const pd = child.parentData as FlexParentData;
      const childMainSize = Math.max(0, Math.floor(spacePerFlex * pd.flex));

      let innerConstraints: BoxConstraints;
      if (pd.fit === 'tight') {
        // Tight: exact size along main axis
        if (isHorizontal) {
          if (this._crossAxisAlignment === 'stretch') {
            innerConstraints = new BoxConstraints({
              minWidth: childMainSize,
              maxWidth: childMainSize,
              minHeight: maxCross,
              maxHeight: maxCross,
            });
          } else {
            innerConstraints = new BoxConstraints({
              minWidth: childMainSize,
              maxWidth: childMainSize,
              minHeight: 0,
              maxHeight: maxCross,
            });
          }
        } else {
          if (this._crossAxisAlignment === 'stretch') {
            innerConstraints = new BoxConstraints({
              minWidth: maxCross,
              maxWidth: maxCross,
              minHeight: childMainSize,
              maxHeight: childMainSize,
            });
          } else {
            innerConstraints = new BoxConstraints({
              minWidth: 0,
              maxWidth: maxCross,
              minHeight: childMainSize,
              maxHeight: childMainSize,
            });
          }
        }
      } else {
        // Loose: 0..childMainSize along main axis
        if (isHorizontal) {
          if (this._crossAxisAlignment === 'stretch') {
            innerConstraints = new BoxConstraints({
              minWidth: 0,
              maxWidth: childMainSize,
              minHeight: maxCross,
              maxHeight: maxCross,
            });
          } else {
            innerConstraints = new BoxConstraints({
              minWidth: 0,
              maxWidth: childMainSize,
              minHeight: 0,
              maxHeight: maxCross,
            });
          }
        } else {
          if (this._crossAxisAlignment === 'stretch') {
            innerConstraints = new BoxConstraints({
              minWidth: maxCross,
              maxWidth: maxCross,
              minHeight: 0,
              maxHeight: childMainSize,
            });
          } else {
            innerConstraints = new BoxConstraints({
              minWidth: 0,
              maxWidth: maxCross,
              minHeight: 0,
              maxHeight: childMainSize,
            });
          }
        }
      }

      child.layout(innerConstraints);

      const actualChildMain = isHorizontal ? child.size.width : child.size.height;
      const childCrossSize = isHorizontal ? child.size.height : child.size.width;

      allocatedSize += actualChildMain;
      if (childCrossSize > maxCrossSize) {
        maxCrossSize = childCrossSize;
      }
    }

    // ---------------------------------------------------------------
    // Step 4: Compute final self size
    // ---------------------------------------------------------------
    let mainSize: number;
    if (this._mainAxisSize === 'max') {
      // Take constraint max if bounded, else allocatedSize
      mainSize = Number.isFinite(maxMain) ? maxMain : allocatedSize;
    } else {
      // "min": take allocatedSize
      mainSize = allocatedSize;
    }

    // Cross axis: max of children cross sizes, clamped to constraints
    let crossSize = Math.max(maxCrossSize, minCross);
    if (Number.isFinite(maxCross)) {
      crossSize = Math.min(crossSize, maxCross);
    }

    if (isHorizontal) {
      this.size = constraints.constrain(new Size(mainSize, crossSize));
    } else {
      this.size = constraints.constrain(new Size(crossSize, mainSize));
    }

    // ---------------------------------------------------------------
    // Overflow detection: check if allocated children exceed the
    // resolved main axis size. If so, flag overflow and emit a
    // diagnostic warning to stderr via console.error.
    // ---------------------------------------------------------------
    const resolvedMainSize = isHorizontal ? this.size.width : this.size.height;
    this._hasOverflow = allocatedSize > resolvedMainSize;

    if (this._hasOverflow) {
      const overflowAmount = allocatedSize - resolvedMainSize;
      console.error(
        `A RenderFlex overflowed by ${overflowAmount}px on the ${this._direction === 'horizontal' ? 'right' : 'bottom'}.`,
      );
    }

    // ---------------------------------------------------------------
    // Step 5: Position children using mainAxisAlignment
    // ---------------------------------------------------------------
    const actualMainSize = isHorizontal ? this.size.width : this.size.height;
    const actualCrossSize = isHorizontal ? this.size.height : this.size.width;
    const remainingSpace = Math.max(0, actualMainSize - allocatedSize);
    const childCount = this.childCount;

    let leadingSpace = 0;
    let betweenSpace = 0;

    switch (this._mainAxisAlignment) {
      case 'start':
        leadingSpace = 0;
        betweenSpace = 0;
        break;
      case 'end':
        leadingSpace = remainingSpace;
        betweenSpace = 0;
        break;
      case 'center':
        leadingSpace = Math.floor(remainingSpace / 2);
        betweenSpace = 0;
        break;
      case 'spaceBetween':
        leadingSpace = 0;
        betweenSpace = childCount > 1 ? remainingSpace / (childCount - 1) : 0;
        break;
      case 'spaceAround':
        betweenSpace = childCount > 0 ? remainingSpace / childCount : 0;
        leadingSpace = betweenSpace / 2;
        break;
      case 'spaceEvenly':
        betweenSpace = childCount > 0 ? remainingSpace / (childCount + 1) : 0;
        leadingSpace = betweenSpace;
        break;
    }

    // ---------------------------------------------------------------
    // Step 6: Apply crossAxisAlignment offsets and set positions
    // ---------------------------------------------------------------
    let mainOffset = leadingSpace;

    for (const child of this.children) {
      const childMainSize = isHorizontal ? child.size.width : child.size.height;
      const childCrossSize = isHorizontal ? child.size.height : child.size.width;

      let crossOffset: number;
      switch (this._crossAxisAlignment) {
        case 'start':
          crossOffset = 0;
          break;
        case 'center':
          crossOffset = Math.floor((actualCrossSize - childCrossSize) / 2);
          break;
        case 'end':
          crossOffset = actualCrossSize - childCrossSize;
          break;
        case 'stretch':
          crossOffset = 0;
          break;
        case 'baseline':
          // TUI simplification: characters sit on the same baseline by default
          // in terminal cells, so baseline alignment positions children at 0
          crossOffset = 0;
          break;
      }

      // Round main offset to integer for positioning
      const roundedMainOffset = Math.round(mainOffset);

      if (isHorizontal) {
        child.offset = new Offset(roundedMainOffset, crossOffset);
      } else {
        child.offset = new Offset(crossOffset, roundedMainOffset);
      }

      mainOffset += childMainSize + betweenSpace;
    }
  }

  // --- Paint ---

  /**
   * Paint each child at its accumulated offset.
   */
  paint(context: PaintContext, offset: Offset): void {
    for (const child of this.children) {
      child.paint(context, offset.add(child.offset));
    }
  }
}
