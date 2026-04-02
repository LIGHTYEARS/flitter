// RenderObject, RenderBox, ContainerRenderBox, ParentData, RenderObjectWidget
// Amp ref: n_ (RenderObject), j9 (RenderBox), PJ (ParentData),
//   yj (RenderObjectWidget), Qb (SingleChildRenderObjectWidget), An (MultiChildRenderObjectWidget)
// Source: amp-strings.txt:529716, 530350
// Reference: .reference/render-tree.md

import { Offset, Size } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import { Widget, type ElementLike } from './widget';
import { Key } from '../core/key';
import type { BoxHitTestResult } from '../input/hit-test';
import { debugFlags } from '../diagnostics/debug-flags';
import { logMutation } from '../diagnostics/pipeline-debug';
// ---------------------------------------------------------------------------
// PaintContext (minimal forward declaration — full implementation in Phase 5)
// ---------------------------------------------------------------------------

/**
 * PaintContext interface for terminal rendering.
 * Declares the subset of painting methods used by built-in widgets.
 * The concrete PaintContext class in scheduler/paint-context.ts implements all of these.
 */
export interface PaintContext {
  drawChar(
    x: number,
    y: number,
    char: string,
    style?: Record<string, unknown>,
    width?: number,
  ): void;
  fillRect?(
    x: number,
    y: number,
    w: number,
    h: number,
    char?: string,
    style?: Record<string, unknown>,
  ): void;
  withClip?(
    x: number,
    y: number,
    w: number,
    h: number,
  ): PaintContext;
}

// ---------------------------------------------------------------------------
// PipelineOwner (minimal forward declaration — full implementation in Plan 03-03)
// ---------------------------------------------------------------------------

/**
 * Minimal PipelineOwner interface.
 * Full implementation in Plan 03-03 (PipelineOwner, BuildOwner, FrameScheduler).
 *
 * Amp ref: UB0 class, xH() global accessor
 */
export interface PipelineOwner {
  requestLayout(): void;
  requestLayoutFor?(node: RenderObject): void;
  requestPaint(node?: RenderObject): void;
  addNodeNeedingLayout(node: RenderObject): void;
}

// ---------------------------------------------------------------------------
// ParentData (Amp: PJ)
// ---------------------------------------------------------------------------

/**
 * Base class for parent data attached to a RenderObject by its parent.
 * Subclasses add layout-specific data (e.g., FlexParentData adds flex, fit).
 *
 * Amp ref: class PJ, amp-strings.txt:530350
 */
export class ParentData {
  detach(): void {}
}

/**
 * BoxParentData base.
 * Note: In Amp, offset is stored on RenderBox itself, not here.
 * This class exists as a base for FlexParentData and other layout-specific data.
 *
 * Amp ref: No direct equivalent — offset is on j9._offset
 */
export class BoxParentData extends ParentData {
  // Intentionally empty — offset lives on RenderBox in Amp's TUI
}

// ---------------------------------------------------------------------------
// RenderObject (Amp: n_)
// ---------------------------------------------------------------------------

/**
 * Abstract base class for all render objects in the render tree.
 *
 * Key features:
 * - RelayoutBoundary: markNeedsLayout() stops at the nearest relayout boundary
 *   instead of propagating all the way to root. A node is its own relayout
 *   boundary when constraints are tight, sizedByParent is true, or
 *   parentUsesSize is false.
 * - RepaintBoundary: markNeedsPaint() stops at the nearest repaint boundary
 *   instead of propagating to the root. Without RepaintBoundary widgets,
 *   behavior is identical to Amp (propagates to root).
 * - Child management (adoptChild/dropChild) is on the base class
 *
 * Amp ref: class n_, amp-strings.txt:529716
 * Deviation: RelayoutBoundary added per .gap/11-relayout-boundary.md
 * Deviation: RepaintBoundary added per .gap/12-repaint-boundary.md
 */
export abstract class RenderObject {
  parent: RenderObject | null = null;
  parentData: ParentData | null = null;

  /**
   * Whether hit testing should be performed on children even when the
   * test position is outside this object's own bounds.
   *
   * Used by RenderStack to allow positioned children that overflow
   * the stack's bounds to still receive hit events.
   *
   * Amp ref: n_.allowHitTestOutsideBounds = !1
   */
  allowHitTestOutsideBounds: boolean = false;

  protected _needsLayout: boolean = true;
  protected _needsPaint: boolean = true;
  private _owner: PipelineOwner | null = null;
  private _attached: boolean = false;

  // RelayoutBoundary tracking.
  // Points to the nearest ancestor (or self) that is a relayout boundary.
  // When null, means not yet computed or not in tree.
  // Deviation from Amp: added per .gap/11-relayout-boundary.md
  protected _relayoutBoundary: RenderObject | null = null;

  // RepaintBoundary tracking.
  // Points to the nearest ancestor (or self) that is a repaint boundary.
  // Computed during attach(). Used by markNeedsPaint() to stop propagation.
  // Deviation from Amp: added per .gap/12-repaint-boundary.md
  protected _repaintBoundary: RenderObject | null = null;

  // Cached depth for depth-ordered processing in PipelineOwner.flushLayout()
  private _cachedDepth: number | undefined;

  get relayoutBoundary(): RenderObject | null {
    return this._relayoutBoundary;
  }

  /**
   * Whether this render object acts as a repaint boundary.
   * Subclasses override to return true.
   * When true, markNeedsPaint() propagation stops at this node.
   *
   * Default is false. RenderRepaintBoundary overrides to true.
   * Without any RepaintBoundary widgets, behavior is identical to Amp.
   *
   * Gap R02: RepaintBoundary enhancement
   */
  get isRepaintBoundary(): boolean {
    return false;
  }

  /**
   * The nearest repaint boundary ancestor (or self).
   * Gap R02: RepaintBoundary enhancement
   */
  get repaintBoundary(): RenderObject | null {
    return this._repaintBoundary;
  }

  get needsLayout(): boolean {
    return this._needsLayout;
  }

  get needsPaint(): boolean {
    return this._needsPaint;
  }

  get owner(): PipelineOwner | null {
    return this._owner;
  }

  get attached(): boolean {
    return this._attached;
  }

  /**
   * Depth of this node in the render tree. Cached for performance.
   * Used by PipelineOwner.flushLayout() for depth-ordered processing.
   */
  get depth(): number {
    if (this._cachedDepth !== undefined) return this._cachedDepth;
    let d = 0;
    let current = this.parent;
    while (current) {
      d++;
      current = current.parent;
    }
    this._cachedDepth = d;
    return d;
  }

  private _invalidateDepth(): void {
    this._cachedDepth = undefined;
    this.visitChildren((child) => {
      if (child instanceof RenderObject) {
        (child as RenderObject)._invalidateDepth();
      }
    });
  }

  // --- Tree management ---
  // Amp ref: n_.adoptChild(g) — sets parent, pushes to children, setupParentData, attach if attached, markNeedsLayout

  adoptChild(child: RenderObject): void {
    child.parent = this;
    this.setupParentData(child);
    if (this._attached) {
      child.attach(this._owner!);
    }
    child._invalidateDepth();
    this.markNeedsLayout();
  }

  // Amp ref: n_.dropChild(g) — detach if attached, splice from children, clear parent, markNeedsLayout
  dropChild(child: RenderObject): void {
    if (child._attached) {
      child.detach();
    }
    child._relayoutBoundary = null;
    child._repaintBoundary = null;
    child.parent = null;
    child._invalidateDepth();
    this.markNeedsLayout();
  }

  /**
   * Attaches this render object and all descendants to the given PipelineOwner.
   * After attach, markNeedsLayout/markNeedsPaint will register with the owner.
   */
  attach(owner: PipelineOwner): void {
    if (this._attached) return;
    this._owner = owner;
    this._attached = true;

    if (this.isRepaintBoundary) {
      this._repaintBoundary = this;
    } else if (this.parent) {
      this._repaintBoundary = this.parent._repaintBoundary;
    } else {
      this._repaintBoundary = this;
    }

    this.visitChildren((child) => child.attach(owner));
  }

  /**
   * Detaches this render object and all descendants from the PipelineOwner.
   */
  detach(): void {
    if (!this._attached) return;
    this._owner = null;
    this._attached = false;
    this._relayoutBoundary = null;
    this._repaintBoundary = null;

    this.visitChildren((child) => child.detach());
  }

  // --- Layout ---
  // markNeedsLayout() stops at the relayout boundary instead of propagating
  // all the way to the root. The boundary node is added to PipelineOwner's
  // _nodesNeedingLayout list for depth-ordered processing.
  // Deviation from Amp: RelayoutBoundary per .gap/11-relayout-boundary.md

  markNeedsLayout(): void {
    if (this._needsLayout) return; // already dirty, stop
    if (!this._attached) {
      // Not in tree -- just mark dirty without propagation
      this._needsLayout = true;
      return;
    }
    this._needsLayout = true;

    // Determine who the relayout boundary is.
    // Before the first layout() call, _relayoutBoundary is null.
    // In that case, if we have no parent we ARE the root (implicit boundary).
    // If we do have a parent, propagate upward until we find a boundary.
    const boundary = this._relayoutBoundary;

    if (boundary === this) {
      // We are a relayout boundary -- register with PipelineOwner.
      this._owner?.addNodeNeedingLayout(this);
    } else if (boundary !== null) {
      // Propagate to parent until we reach the boundary.
      this.parent?.markNeedsLayout();
    } else if (!this.parent) {
      // Root node before first layout -- treat self as boundary.
      this._owner?.addNodeNeedingLayout(this);
    } else {
      // Not yet laid out, boundary unknown -- propagate to parent.
      this.parent.markNeedsLayout();
    }
  }

  // --- Paint ---
  // markNeedsPaint() stops at the nearest repaint boundary instead of
  // propagating all the way to the root. Without any RepaintBoundary
  // widgets in the tree, behavior is identical to Amp (propagates to root).
  // Deviation from Amp: RepaintBoundary per .gap/12-repaint-boundary.md

  markNeedsPaint(): void {
    if (this._needsPaint) return;
    if (!this._attached) {
      this._needsPaint = true;
      return;
    }
    this._needsPaint = true;

    if (this.isRepaintBoundary) {
      // This node IS a repaint boundary -- stop propagation.
      // Register with PipelineOwner for paint scheduling.
      this._owner?.requestPaint(this);
    } else if (this.parent) {
      // Propagate upward to find a boundary.
      this.parent.markNeedsPaint();
    } else {
      // Root node (always acts as implicit boundary).
      this._owner?.requestPaint(this);
    }
  }

  abstract performLayout(): void;
  abstract paint(context: PaintContext, offset: Offset): void;

  /**
   * Clear the needsPaint flag. Used by PipelineOwner.flushPaint()
   * to reset paint state without directly accessing the protected field.
   */
  clearNeedsPaint(): void {
    this._needsPaint = false;
  }

  // --- Visitor ---
  // Amp ref: n_.visitChildren(g) — iterates _children
  visitChildren(_visitor: (child: RenderObject) => void): void {
    // Base class has no children; subclasses override
  }

  // --- ParentData ---
  // Amp ref: n_.setupParentData(g) — overridden by subclasses
  setupParentData(child: RenderObject): void {
    if (!(child.parentData instanceof ParentData)) {
      child.parentData = new ParentData();
    }
  }
}

// ---------------------------------------------------------------------------
// RenderBox (Amp: j9 extends n_)
// ---------------------------------------------------------------------------

/**
 * A render object that uses box constraints and has a 2D size.
 *
 * Key features:
 * - Offset is stored directly on RenderBox (not in BoxParentData)
 * - layout() accepts optional parentUsesSize parameter (Gap R05)
 * - sizedByParent / performResize() two-phase layout optimization (Gap R04)
 * - layout() skips if constraints unchanged AND not dirty
 * - _needsLayout is cleared BEFORE performLayout() is called
 * - hitTest() is a method on RenderBox (not a free function)
 *
 * Amp ref: class j9 extends n_, amp-strings.txt:529716
 * Deviation: sizedByParent and parentUsesSize added per .gap/14 and .gap/15
 */
export abstract class RenderBox extends RenderObject {
  // Amp ref: j9._size = { width: 0, height: 0 }
  private _size: Size = Size.zero;

  // Amp ref: j9._offset = { x: 0, y: 0 } — offset ON the RenderBox itself
  private _offset: Offset = Offset.zero;

  // Amp ref: j9._lastConstraints
  private _lastConstraints: BoxConstraints | null = null;

  // Tracks whether the parent declared dependency on this node's size.
  // Default true (Amp-compatible: assumes parent depends on child size).
  // Set during layout() by the parent's call.
  // Deviation from Amp: added per .gap/15-parent-uses-size.md
  private _parentUsesSize: boolean = true;

  get size(): Size {
    return this._size;
  }

  set size(value: Size) {
    this._size = value;
  }

  get offset(): Offset {
    return this._offset;
  }

  set offset(value: Offset) {
    this._offset = value;
  }

  get constraints(): BoxConstraints | null {
    return this._lastConstraints;
  }

  get hasSize(): boolean {
    return this._size.width > 0 || this._size.height > 0;
  }

  /**
   * Whether the parent depends on this render box's size.
   * Set during layout() by the parent's call.
   *
   * When false, this node is a relayout boundary candidate.
   * When true (default), layout invalidation propagates through this node.
   *
   * Deviation from Amp: added per .gap/15-parent-uses-size.md
   */
  get parentUsesSize(): boolean {
    return this._parentUsesSize;
  }

  /**
   * Whether this render box determines its size solely from the incoming
   * constraints, independent of its children's sizes.
   *
   * When true:
   * - performResize() is called before performLayout() when constraints change.
   * - This node is always a relayout boundary.
   * - performResize() MUST set this.size based only on this.constraints.
   * - performLayout() MUST NOT change this.size.
   *
   * Default is false. Subclasses override to return true when appropriate.
   *
   * Deviation from Amp: added per .gap/14-sized-by-parent.md
   */
  get sizedByParent(): boolean {
    return false;
  }

  /**
   * Called when sizedByParent is true and constraints have changed.
   * Must set this.size based solely on this.constraints.
   * Must NOT read or depend on any child sizes.
   *
   * Default implementation sizes to constraints.smallest (the minimum
   * allowed size). Subclasses that declare sizedByParent = true SHOULD
   * override this to compute their actual size.
   *
   * This method is only called when sizedByParent is true.
   *
   * Deviation from Amp: added per .gap/14-sized-by-parent.md
   */
  performResize(): void {
    this.size = this.constraints!.smallest;
  }

  /**
   * Layout this box with the given constraints.
   *
   * @param constraints - The box constraints from the parent.
   * @param opts.parentUsesSize - Whether the parent reads this child's
   *   resulting size. Default `true` (Amp-compatible). Pass `false` when
   *   the parent does not depend on the child's size, enabling this child
   *   to become a relayout boundary.
   *
   * From Amp: layout(g) {
   *   let t = !this._lastConstraints || !g.equals(this._lastConstraints);
   *   if (!this._needsLayout && !t) return;
   *   this._lastConstraints = g;
   *   this._needsLayout = false;
   *   this.performLayout();
   * }
   *
   * Amp ref: j9.layout(g), amp-strings.txt:529716
   * Deviation: parentUsesSize parameter and sizedByParent two-phase protocol
   *   added per .gap/14 and .gap/15
   */
  layout(
    constraints: BoxConstraints,
    { parentUsesSize = true }: { parentUsesSize?: boolean } = {},
  ): void {
    this._parentUsesSize = parentUsesSize;

    // Determine if this node is a relayout boundary.
    // A node is its own boundary if:
    //   1. No parent (root)
    //   2. sizedByParent is true
    //   3. constraints are tight (minWidth==maxWidth && minHeight==maxHeight)
    //   4. parentUsesSize is false
    // Gap R01: RelayoutBoundary per .gap/11-relayout-boundary.md
    const isRelayoutBoundary =
      !this.parent ||
      this.sizedByParent ||
      constraints.isTight ||
      !parentUsesSize;

    const newBoundary = isRelayoutBoundary ? this : (this.parent as RenderBox)?._relayoutBoundary ?? null;

    const constraintsChanged =
      !this._lastConstraints ||
      !constraints.equals(this._lastConstraints);
    const boundaryChanged = this._relayoutBoundary !== newBoundary;

    if (!this._needsLayout && !constraintsChanged && !boundaryChanged) return;

    this._lastConstraints = constraints;
    this._relayoutBoundary = newBoundary;

    // Two-phase protocol: if sizedByParent, compute size first
    if (this.sizedByParent) {
      if (constraintsChanged) {
        this.performResize();
      }
    }

    this._needsLayout = false;
    this.performLayout();
  }

  // --- Hit Testing ---
  // Amp ref: j9.hitTest(g, t, b = 0, s = 0)
  //   g = BoxHitTestResult, t = position, b = parentOffsetX, s = parentOffsetY

  /**
   * Determine whether the given screen position hits this render object.
   *
   * Computes this node's screen-space bounds from parentOffsetX/Y + own offset,
   * tests containment, and if hit, adds self to the result and recurses into children.
   *
   * Subclasses override this to customize hit-test behavior (e.g., clipping).
   *
   * Amp ref: j9.hitTest(g, t, b = 0, s = 0)
   *   g = BoxHitTestResult, t = position, b = parentOffsetX, s = parentOffsetY
   *
   * @param result         Accumulator for hit entries
   * @param position       The test position in screen coordinates { col, row }
   * @param parentOffsetX  Accumulated X offset from ancestors (default: 0)
   * @param parentOffsetY  Accumulated Y offset from ancestors (default: 0)
   * @returns true if this object or a descendant was hit
   */
  hitTest(
    result: BoxHitTestResult,
    position: Offset,
    parentOffsetX: number = 0,
    parentOffsetY: number = 0,
  ): boolean {
    const globalX = parentOffsetX + this.offset.col;
    const globalY = parentOffsetY + this.offset.row;

    const withinBounds = this.hitTestSelf(
      position.col - globalX,
      position.row - globalY,
    );

    if (withinBounds) {
      // Self is hit -- add to result and test children
      // Amp ref: g.addWithPaintOffset(this, { x: a, y: r }, t)
      result.addWithPaintOffset(this, new Offset(globalX, globalY), position);
      this.hitTestChildren(result, position, globalX, globalY);
      return true;
    }

    if (this.allowHitTestOutsideBounds) {
      // Even though self is not hit, children may extend beyond our bounds
      // Amp ref: if (this.allowHitTestOutsideBounds) { ... }
      this.hitTestChildren(result, position, globalX, globalY);
    }

    return false;
  }

  /**
   * Test whether the given local-space point falls within this object's bounds.
   * Subclasses can override to implement non-rectangular hit regions.
   *
   * The default implementation checks against the rectangular bounds
   * defined by this.size.
   *
   * @param localX X in this object's local coordinate space
   * @param localY Y in this object's local coordinate space
   * @returns true if the point is within bounds
   */
  hitTestSelf(localX: number, localY: number): boolean {
    return localX >= 0 && localX < this._size.width
        && localY >= 0 && localY < this._size.height;
  }

  /**
   * Hit-test this object's children in reverse paint order (front to back).
   * Subclasses override this to customize child traversal.
   *
   * The base RenderBox implementation is a no-op (leaf node has no children).
   *
   * @param result         Accumulator for hit entries
   * @param position       Screen-space test position
   * @param parentOffsetX  This object's accumulated X offset
   * @param parentOffsetY  This object's accumulated Y offset
   */
  hitTestChildren(
    _result: BoxHitTestResult,
    _position: Offset,
    _parentOffsetX: number,
    _parentOffsetY: number,
  ): void {
    // Default: no children to test (leaf node)
  }

  // --- Intrinsic Size ---

  /**
   * Returns the minimum width that this box could be without failing to
   * correctly paint its contents within itself, at the given height.
   * Base implementation returns 0. Subclasses override.
   *
   * Amp ref: j9.getMinIntrinsicWidth(height)
   */
  getMinIntrinsicWidth(_height: number): number {
    return 0;
  }

  /**
   * Returns the smallest width beyond which increasing the width never
   * decreases the preferred height. Base implementation returns 0.
   *
   * Amp ref: j9.getMaxIntrinsicWidth(height)
   */
  getMaxIntrinsicWidth(_height: number): number {
    return 0;
  }

  /**
   * Returns the minimum height that this box could be without failing to
   * correctly paint its contents within itself, at the given width.
   * Base implementation returns 0. Subclasses override.
   *
   * Amp ref: j9.getMinIntrinsicHeight(width)
   */
  getMinIntrinsicHeight(_width: number): number {
    return 0;
  }

  /**
   * Returns the smallest height beyond which increasing the height never
   * decreases the preferred width. Base implementation returns 0.
   *
   * Amp ref: j9.getMaxIntrinsicHeight(width)
   */
  getMaxIntrinsicHeight(_width: number): number {
    return 0;
  }

  /**
   * Subclasses override this to compute size and layout children.
   * Must set this.size = ...
   */
  abstract performLayout(): void;

  /**
   * Override to paint this render object.
   * offset is the accumulated offset from the root.
   */
  abstract paint(context: PaintContext, offset: Offset): void;
}

// ---------------------------------------------------------------------------
// ContainerRenderBox (Amp: built into n_, used by fE, oU0)
// ---------------------------------------------------------------------------

/**
 * Base class for RenderBoxes that manage a list of child RenderBoxes.
 * In Amp this is built into the base n_ class; we separate it for clarity.
 *
 * Uses an array (not linked list) matching Amp's _children = [].
 *
 * Amp ref: n_._children, n_.adoptChild, n_.dropChild, n_.removeAllChildren
 */
export abstract class ContainerRenderBox extends RenderBox {
  private _children: RenderBox[] = [];

  get children(): ReadonlyArray<RenderBox> {
    return this._children;
  }

  get childCount(): number {
    return this._children.length;
  }

  get firstChild(): RenderBox | null {
    return this._children[0] ?? null;
  }

  get lastChild(): RenderBox | null {
    return this._children[this._children.length - 1] ?? null;
  }

  /**
   * Hit-test children in reverse order (last painted = topmost = tested first).
   *
   * Amp ref: for (let l = this.children.length - 1; l >= 0; l--)
   *            this.children[l].hitTest(g, t, a, r);
   */
  override hitTestChildren(
    result: BoxHitTestResult,
    position: Offset,
    parentOffsetX: number,
    parentOffsetY: number,
  ): void {
    const children = this._children;
    for (let i = children.length - 1; i >= 0; i--) {
      children[i]!.hitTest(result, position, parentOffsetX, parentOffsetY);
    }
  }

  // Amp ref: adoptChild pushes to _children array
  insert(child: RenderBox, after?: RenderBox): void {
    if (debugFlags.debugPrintBuilds) logMutation('insert', child, this);
    this.setupParentData(child);
    this.adoptChild(child);
    if (after) {
      const idx = this._children.indexOf(after);
      if (idx >= 0) {
        this._children.splice(idx + 1, 0, child);
      } else {
        this._children.push(child);
      }
    } else {
      this._children.push(child);
    }
  }

  remove(child: RenderBox): void {
    if (debugFlags.debugPrintBuilds) logMutation('remove', child, this);
    const idx = this._children.indexOf(child);
    if (idx >= 0) {
      this._children.splice(idx, 1);
      this.dropChild(child);
    }
  }

  removeAll(): void {
    for (const child of [...this._children]) {
      this.dropChild(child);
    }
    this._children = [];
  }

  move(child: RenderBox, after?: RenderBox): void {
    if (debugFlags.debugPrintBuilds) logMutation('move', child, this);
    const idx = this._children.indexOf(child);
    if (idx >= 0) this._children.splice(idx, 1);
    if (after) {
      const afterIdx = this._children.indexOf(after);
      this._children.splice(afterIdx + 1, 0, child);
    } else {
      this._children.unshift(child);
    }
  }

  // Amp ref: n_.visitChildren(g) { for (let t of this._children) g(t); }
  visitChildren(visitor: (child: RenderObject) => void): void {
    for (const child of this._children) {
      visitor(child);
    }
  }
}

// ---------------------------------------------------------------------------
// Render Object Child Protocol Interfaces
// Used by element.ts to access child-management methods without `as any`.
// ---------------------------------------------------------------------------

/** Render objects that have a single child settable via `.child` */
export interface SingleChildRenderObjectProtocol {
  child: RenderObject | null;
}

/** Render objects that manage a list of children via `.insert()` */
export interface ContainerRenderObjectProtocol {
  readonly children?: ReadonlyArray<RenderObject>;
  insert(child: RenderObject, after?: RenderObject): void;
  remove?(child: RenderObject): void;
  removeAllChildren?(): void;
}

/** Type guard: does this render object have a `.child` setter? */
export function isSingleChildRenderObject(
  obj: RenderObject,
): obj is RenderObject & SingleChildRenderObjectProtocol {
  return 'child' in obj;
}

/** Type guard: does this render object have an `.insert()` method? */
export function isContainerRenderObject(
  obj: RenderObject,
): obj is RenderObject & ContainerRenderObjectProtocol {
  return typeof (obj as unknown as Record<string, unknown>).insert === 'function';
}

// ---------------------------------------------------------------------------
// RenderObjectWidget (Amp: yj extends Sf)
// ---------------------------------------------------------------------------

/**
 * Abstract base class for widgets that have an associated RenderObject.
 * Subclasses must implement createRenderObject().
 *
 * Amp ref: class yj extends Sf, amp-strings.txt:529716
 */
export abstract class RenderObjectWidget extends Widget {
  constructor(opts?: { key?: Key }) {
    super(opts);
  }

  abstract createRenderObject(): RenderObject;

  // Amp ref: yj.updateRenderObject(g) {} — default no-op
  updateRenderObject(_renderObject: RenderObject): void {}
}

// ---------------------------------------------------------------------------
// SingleChildRenderObjectWidget (Amp: Qb extends yj)
// ---------------------------------------------------------------------------

/**
 * A RenderObjectWidget with a single optional child.
 *
 * Amp ref: class Qb extends yj, amp-strings.txt:529716
 */
export abstract class SingleChildRenderObjectWidget extends RenderObjectWidget {
  readonly child?: Widget;

  constructor(opts?: { key?: Key; child?: Widget }) {
    super(opts?.key !== undefined ? { key: opts.key } : undefined);
    this.child = opts?.child;
  }

  // Amp ref: Qb.createElement() -> new uv(this)
  createElement(): ElementLike {
    const { SingleChildRenderObjectElement } = require('./element');
    return new SingleChildRenderObjectElement(this);
  }
}

// ---------------------------------------------------------------------------
// MultiChildRenderObjectWidget (Amp: An extends yj)
// ---------------------------------------------------------------------------

/**
 * A RenderObjectWidget with multiple children.
 *
 * Amp ref: class An extends yj, amp-strings.txt:529716
 */
export abstract class MultiChildRenderObjectWidget extends RenderObjectWidget {
  readonly children: Widget[];

  constructor(opts?: { key?: Key; children?: Widget[] }) {
    super(opts?.key !== undefined ? { key: opts.key } : undefined);
    this.children = opts?.children ? [...opts.children] : [];
  }

  // Amp ref: An.createElement() -> new rJ(this)
  createElement(): ElementLike {
    const { MultiChildRenderObjectElement } = require('./element');
    return new MultiChildRenderObjectElement(this);
  }
}

// ---------------------------------------------------------------------------
// LeafRenderObjectWidget
// ---------------------------------------------------------------------------

/**
 * A RenderObjectWidget with no children.
 * Used for terminal leaf nodes like Text render objects.
 */
export abstract class LeafRenderObjectWidget extends RenderObjectWidget {
  constructor(opts?: { key?: Key }) {
    super(opts);
  }

  // Amp ref: ef.createElement() -> new O$(this)
  createElement(): ElementLike {
    const { LeafRenderObjectElement } = require('./element');
    return new LeafRenderObjectElement(this);
  }
}
