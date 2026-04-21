/**
 * IntrinsicHeight Widget — forces child height to its intrinsic height.
 *
 * Wraps a single child and constrains its height to equal its max
 * intrinsic height. Used when a parent provides loose height constraints
 * but you want the child to size exactly to its natural content height.
 *
 * 逆向: BtT (chunk-006.js:3019-3029) — widget class
 * 逆向: n1T (chunk-006.js:3030-3065) — render object class
 *
 * @module
 */

import { BoxConstraints } from "../tree/constraints.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "./padding.js";

// ════════════════════════════════════════════════════
//  RenderIntrinsicHeight
// ════════════════════════════════════════════════════

/**
 * IntrinsicHeight render object.
 *
 * Layout algorithm (matching amp n1T):
 * 1. No child → size = (minWidth, minHeight)
 * 2. If constraints are already tight in height → pass through as-is
 * 3. Otherwise → measure child's maxIntrinsicHeight at maxWidth,
 *    create tight height constraints, layout child
 * 4. Size = child's size, offset = (0, 0)
 *
 * 逆向: n1T extends O9 (chunk-006.js:3030-3065)
 */
export class RenderIntrinsicHeight extends RenderBox {
  /**
   * Layout: constrain child height to its intrinsic height.
   *
   * 逆向: n1T.performLayout (chunk-006.js:3031-3045)
   */
  performLayout(): void {
    const constraints = this._lastConstraints;
    if (!constraints) {
      throw new Error("performLayout called without constraints");
    }

    // 逆向: n1T line 3033-3035 — no child → min size
    if (this._children.length === 0) {
      this.setSize(constraints.minWidth, constraints.minHeight);
      return;
    }

    const child = this._children[0] as RenderBox;

    // 逆向: n1T line 3038-3043 — tight height → pass through, else measure intrinsic
    const isTight = constraints.minHeight === constraints.maxHeight;
    let childConstraints: BoxConstraints;

    if (isTight) {
      childConstraints = constraints;
    } else {
      const intrinsicHeight = child.getMaxIntrinsicHeight(constraints.maxWidth);
      childConstraints = new BoxConstraints({
        minWidth: constraints.minWidth,
        maxWidth: constraints.maxWidth,
        minHeight: intrinsicHeight,
        maxHeight: intrinsicHeight,
      });
    }

    // 逆向: n1T line 3044 — layout child, set offset/size
    child.layout(childConstraints);
    child.offset = { x: 0, y: 0 };
    this.size = child.size;
  }

  // ── Intrinsic measurement delegation ────────────────

  /**
   * Min intrinsic height = max intrinsic height (the whole point of this widget).
   *
   * 逆向: n1T.getMinIntrinsicHeight (chunk-006.js:3046-3048)
   */
  override getMinIntrinsicHeight(width: number): number {
    return this.getMaxIntrinsicHeight(width);
  }

  /**
   * Max intrinsic height delegates to child.
   *
   * 逆向: n1T.getMaxIntrinsicHeight (chunk-006.js:3049-3052)
   */
  override getMaxIntrinsicHeight(width: number): number {
    if (this._children.length === 0) return 0;
    return (this._children[0] as RenderBox).getMaxIntrinsicHeight(width);
  }

  /**
   * Min intrinsic width: if height is infinite, resolve via intrinsic height first.
   *
   * 逆向: n1T.getMinIntrinsicWidth (chunk-006.js:3053-3058)
   */
  override getMinIntrinsicWidth(height: number): number {
    if (this._children.length === 0) return 0;
    const child = this._children[0] as RenderBox;
    let resolvedHeight = height;
    if (!Number.isFinite(resolvedHeight)) {
      resolvedHeight = child.getMaxIntrinsicHeight(Number.POSITIVE_INFINITY);
    }
    return child.getMinIntrinsicWidth(resolvedHeight);
  }

  /**
   * Max intrinsic width: if height is infinite, resolve via intrinsic height first.
   *
   * 逆向: n1T.getMaxIntrinsicWidth (chunk-006.js:3059-3064)
   */
  override getMaxIntrinsicWidth(height: number): number {
    if (this._children.length === 0) return 0;
    const child = this._children[0] as RenderBox;
    let resolvedHeight = height;
    if (!Number.isFinite(resolvedHeight)) {
      resolvedHeight = child.getMaxIntrinsicHeight(Number.POSITIVE_INFINITY);
    }
    return child.getMaxIntrinsicWidth(resolvedHeight);
  }
}

// ════════════════════════════════════════════════════
//  IntrinsicHeight Widget
// ════════════════════════════════════════════════════

/** IntrinsicHeight constructor args. */
interface IntrinsicHeightArgs {
  /** Optional key */
  key?: Key;
  /** Child widget whose height will be constrained to its intrinsic height */
  child?: WidgetInterface;
}

/**
 * IntrinsicHeight Widget.
 *
 * Forces its child to have a height equal to the child's max intrinsic
 * height. This is useful when the child is in a context with loose height
 * constraints but needs to be sized to its natural content height.
 *
 * Note: like Flutter's IntrinsicHeight, this widget is relatively expensive
 * because it requires a speculative layout pass (intrinsic measurement)
 * before the real layout pass. Use sparingly.
 *
 * 逆向: BtT extends _t (chunk-006.js:3019-3029)
 */
export class IntrinsicHeight extends Widget implements RenderObjectWidget {
  /** Child widget */
  readonly child: WidgetInterface | undefined;

  constructor(args?: IntrinsicHeightArgs) {
    super({ key: args?.key });
    this.child = args?.child;
  }

  /**
   * 逆向: BtT uses single-child element (_t base)
   */
  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 逆向: BtT.createRenderObject → new n1T()
   */
  createRenderObject(): RenderObject {
    return new RenderIntrinsicHeight();
  }

  /**
   * 逆向: BtT.updateRenderObject — no-op (no mutable properties)
   */
  updateRenderObject(_renderObject: RenderObject): void {
    // no mutable properties
  }
}
