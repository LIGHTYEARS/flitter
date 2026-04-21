/**
 * Offstage Widget — hides child from layout and paint while keeping it alive.
 *
 * When offstage=true, the widget sizes itself to 0x0 and skips paint and
 * hit-testing, but still lays out the child (so it retains its internal state
 * and can be measured). When offstage=false, it behaves like a transparent
 * pass-through wrapper that sizes itself to its child.
 *
 * 逆向: sQ (layout_widgets.js:1587-1640) — render object
 * 逆向: cQ (misc_utils.js:2300-2318)    — widget class
 *
 * @module
 */

import type { HitTestResult } from "../gestures/hit-test.js";
import type { Screen } from "../screen/screen.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "./padding.js";

// ════════════════════════════════════════════════════
//  RenderOffstage
// ════════════════════════════════════════════════════

/**
 * Offstage render object.
 *
 * When `_offstage` is true:
 *  - All intrinsic measurements return 0.
 *  - `performLayout` sizes itself to 0x0, but still lays out the child so it
 *    retains state.
 *  - `paint` is a no-op (child is invisible).
 *  - `hitTest` returns false (child is untouchable).
 *
 * When `_offstage` is false:
 *  - Behaves like a transparent pass-through: delegates intrinsics, sizes to
 *    child, paints child, and delegates hit-testing.
 *
 * 逆向: sQ extends O9 (layout_widgets.js:1587-1640)
 */
export class RenderOffstage extends RenderBox {
  /** Whether the child is currently hidden from layout output and paint. */
  private _offstage: boolean;

  /**
   * Create a RenderOffstage render object.
   *
   * @param offstage - Initial offstage state (default: true)
   */
  constructor(offstage: boolean = true) {
    super();
    this._offstage = offstage;
  }

  // ── Getter / setter ──────────────────────────────

  /** Whether the child is offstage. */
  get offstage(): boolean {
    return this._offstage;
  }

  /**
   * Set the offstage state.
   *
   * Calls `markNeedsLayout()` when the value changes.
   *
   * 逆向: sQ.set offstage (layout_widgets.js:1599-1602)
   */
  set offstage(value: boolean) {
    if (value === this._offstage) return;
    this._offstage = value;
    this.markNeedsLayout();
  }

  // ── Intrinsic measurements ───────────────────────

  /**
   * 逆向: sQ.getMinIntrinsicWidth (layout_widgets.js:1603-1606)
   */
  override getMinIntrinsicWidth(height: number): number {
    if (this._offstage) return 0;
    return (this._children[0] as RenderBox | undefined)?.getMinIntrinsicWidth(height) ?? 0;
  }

  /**
   * 逆向: sQ.getMaxIntrinsicWidth (layout_widgets.js:1607-1610)
   */
  override getMaxIntrinsicWidth(height: number): number {
    if (this._offstage) return 0;
    return (this._children[0] as RenderBox | undefined)?.getMaxIntrinsicWidth(height) ?? 0;
  }

  /**
   * 逆向: sQ.getMinIntrinsicHeight (layout_widgets.js:1611-1614)
   */
  override getMinIntrinsicHeight(width: number): number {
    if (this._offstage) return 0;
    return (this._children[0] as RenderBox | undefined)?.getMinIntrinsicHeight(width) ?? 0;
  }

  /**
   * 逆向: sQ.getMaxIntrinsicHeight (layout_widgets.js:1615-1618)
   */
  override getMaxIntrinsicHeight(width: number): number {
    if (this._offstage) return 0;
    return (this._children[0] as RenderBox | undefined)?.getMaxIntrinsicHeight(width) ?? 0;
  }

  // ── Layout ───────────────────────────────────────

  /**
   * Perform layout.
   *
   * When offstage: sizes itself to 0x0. Still lays out the child (if any) so
   * the child retains its internal state and can be measured later.
   *
   * When not offstage: sizes itself to the child's constrained size.
   *
   * 逆向: sQ.performLayout (layout_widgets.js:1619-1636)
   */
  override performLayout(): void {
    const constraints = this._lastConstraints;
    if (!constraints) {
      throw new Error("performLayout called without constraints");
    }

    const child = this._children[0] as RenderBox | undefined;

    if (this._offstage) {
      // 逆向: sQ.performLayout offstage branch — setSize(0,0), still layout child
      this.setSize(0, 0);
      if (child) {
        child.layout(constraints);
        child.offset = { x: 0, y: 0 };
      }
    } else if (child) {
      // 逆向: sQ.performLayout !offstage + child — layout child, constrain size
      child.layout(constraints);
      const size = constraints.constrain(child.size.width, child.size.height);
      this.setSize(size.width, size.height);
      child.offset = { x: 0, y: 0 };
    } else {
      // 逆向: sQ.performLayout !offstage, no child — constrain(0, 0)
      const size = constraints.constrain(0, 0);
      this.setSize(size.width, size.height);
    }
  }

  // ── Paint ────────────────────────────────────────

  /**
   * Skip paint entirely when offstage; delegate to super when visible.
   *
   * 逆向: sQ.paint(T, R, a) (layout_widgets.js:1637-1640)
   */
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    if (this._offstage) return;
    super.paint(screen, offsetX, offsetY);
  }

  // ── Hit testing ──────────────────────────────────

  /**
   * Return false (no hit) when offstage; delegate to super when visible.
   *
   * 逆向: sQ.hitTest(T, R, a, e) (layout_widgets.js:1641-1645)
   */
  override hitTest(
    result: HitTestResult,
    position: { x: number; y: number },
    offsetX?: number,
    offsetY?: number,
  ): boolean {
    if (this._offstage) return false;
    return super.hitTest(result, position, offsetX, offsetY);
  }
}

// ════════════════════════════════════════════════════
//  Offstage Widget
// ════════════════════════════════════════════════════

/** Offstage constructor args. */
interface OffstageArgs {
  /** Optional key */
  key?: Key;
  /**
   * Whether the child is offstage (hidden).
   *
   * Defaults to `true` — matching amp's `cQ` default.
   */
  offstage?: boolean;
  /** Child widget */
  child?: WidgetInterface;
}

/**
 * Offstage Widget.
 *
 * Wraps a single child and controls its visibility at the render-tree level.
 * When `offstage=true` (the default) the child is invisible and takes up no
 * space, but is still laid out so it can maintain state and be measured.
 * When `offstage=false` the widget becomes a transparent pass-through.
 *
 * 逆向: cQ extends _t (misc_utils.js:2300-2318)
 */
export class Offstage extends Widget implements RenderObjectWidget {
  /** Whether the child is currently offstage. */
  readonly offstage: boolean;

  /** Child widget */
  readonly child: WidgetInterface | undefined;

  constructor(args?: OffstageArgs) {
    super({ key: args?.key });
    // 逆向: cQ constructor — offstage defaults to true
    this.offstage = args?.offstage ?? true;
    this.child = args?.child;
  }

  /**
   * 逆向: cQ uses single-child element (_t base)
   */
  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 逆向: cQ.createRenderObject → new sQ(this.offstage)
   */
  createRenderObject(): RenderObject {
    return new RenderOffstage(this.offstage);
  }

  /**
   * 逆向: cQ.updateRenderObject(T) { T.offstage = this.offstage; }
   */
  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderOffstage).offstage = this.offstage;
  }
}
