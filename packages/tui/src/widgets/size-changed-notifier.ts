/**
 * SizeChangedNotifier Widget — notifies when the child's size changes after layout.
 *
 * A transparent pass-through wrapper that lays out its child with the parent
 * constraints and fires an `onSizeChange` callback whenever the resulting size
 * differs from the last reported size. The callback is deferred to a post-frame
 * callback (via WidgetsBinding.instance.frameScheduler.addPostFrameCallback) to
 * avoid re-entrant layout mutations, with a deduplication guard so that rapid
 * size changes within a single frame only produce one callback invocation.
 *
 * 逆向: NM (misc_utils.js:781-800)  — widget class
 * 逆向: N1T (misc_utils.js:801-843) — render object
 *
 * @module
 */

import { WidgetsBinding } from "../binding/widgets-binding.js";
import type { Screen } from "../screen/screen.js";
import type { Size } from "../tree/constraints.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { SingleChildRenderObjectElement } from "./padding.js";

// ════════════════════════════════════════════════════
//  RenderSizeChangedNotifier
// ════════════════════════════════════════════════════

/**
 * Render object that detects size changes and fires a callback.
 *
 * Layout is transparent: lays out the single child with parent constraints,
 * constrains own size to child size, and sets child offset to (0,0).
 *
 * After layout, if the size differs from the last reported size, schedules a
 * post-frame callback to deliver the new size. Uses a `_reportScheduled` flag
 * to deduplicate multiple layout passes within the same frame.
 *
 * 逆向: N1T extends O9 (misc_utils.js:801-843)
 */
export class RenderSizeChangedNotifier extends RenderBox {
  /** Callback to fire when size changes. */
  private _onSizeChange: (size: Size) => void;

  /** Last size that was actually reported to the callback. */
  private _lastReportedSize: Size | null = null;

  /** Pending size to report in the next post-frame callback. */
  private _pendingReportedSize: Size | null = null;

  /** Whether a post-frame callback has been scheduled. */
  private _reportScheduled: boolean = false;

  /**
   * 逆向: N1T constructor(T) — stores onSizeChange callback
   */
  constructor(onSizeChange: (size: Size) => void) {
    super();
    this._onSizeChange = onSizeChange;
  }

  /**
   * Update the callback reference (called during widget rebuild).
   *
   * 逆向: N1T.updateCallback(T) (misc_utils.js:810-812)
   */
  updateCallback(onSizeChange: (size: Size) => void): void {
    this._onSizeChange = onSizeChange;
  }

  // ── Layout ───────────────────────────────────────

  /**
   * Transparent pass-through layout.
   *
   * Lays out child with parent constraints, sets child offset to (0,0),
   * sizes self to constrained child size, then schedules a size report
   * if the size changed.
   *
   * 逆向: N1T.performLayout (misc_utils.js:813-825)
   */
  override performLayout(): void {
    const constraints = this._lastConstraints;
    if (!constraints) return;

    const child = this._children[0] as RenderBox | undefined;

    if (!child) {
      // 逆向: N1T — no child: constrain(0,0), setSize
      // Note: amp calls super.performLayout() but flitter's RenderBox.performLayout is abstract,
      // so we omit the super call. The base performLayout in amp is a no-op.
      const size = constraints.constrain(0, 0);
      this.setSize(size.width, size.height);
      return;
    }

    // 逆向: N1T — layout child, set offset, constrain to child size
    child.layout(constraints);
    child.setOffset(0, 0);
    const size = constraints.constrain(child.size.width, child.size.height);
    this.setSize(size.width, size.height);
    this._scheduleSizeReport(size);
  }

  // ── Paint ────────────────────────────────────────

  /**
   * Transparent paint — delegates to super (which paints children).
   *
   * 逆向: N1T.paint(T, R, a) { super.paint(T, R, a); } (misc_utils.js:826-828)
   */
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    super.paint(screen, offsetX, offsetY);
  }

  // ── Size change scheduling ──────────────────────

  /**
   * Schedule a size change report if the size actually changed.
   *
   * Uses deduplication: if a report is already scheduled, just updates
   * `_pendingReportedSize`. The post-frame callback will pick up the
   * latest value.
   *
   * 逆向: N1T._scheduleSizeReport(T) (misc_utils.js:829-838)
   */
  private _scheduleSizeReport(size: Size): void {
    if (this._sizesEqual(this._lastReportedSize, size)) return;

    this._pendingReportedSize = size;
    if (this._reportScheduled) return;

    this._reportScheduled = true;

    // 逆向: k8.instance.addPostFrameCallback(..., "MeasureSize.size-change")
    // Flitter equivalent: WidgetsBinding.instance.frameScheduler.addPostFrameCallback
    WidgetsBinding.instance.frameScheduler.addPostFrameCallback(() => {
      this._reportScheduled = false;

      // 逆向: guard — not attached or no pending size → bail
      if (!this.attached || !this._pendingReportedSize) return;

      const pendingSize = this._pendingReportedSize;
      this._pendingReportedSize = null;

      // 逆向: double-check that size actually changed
      if (this._sizesEqual(this._lastReportedSize, pendingSize)) return;

      this._lastReportedSize = pendingSize;
      this._onSizeChange(pendingSize);
    });
  }

  /**
   * Compare two sizes for equality, handling null.
   *
   * 逆向: N1T._sizesEqual(T, R) (misc_utils.js:839-842)
   */
  private _sizesEqual(a: Size | null, b: Size | null): boolean {
    if (a === null || b === null) return a === b;
    return a.width === b.width && a.height === b.height;
  }
}

// ════════════════════════════════════════════════════
//  SizeChangedNotifier Widget
// ════════════════════════════════════════════════════

/** SizeChangedNotifier constructor args. */
export interface SizeChangedNotifierArgs {
  /** Optional key. */
  key?: Key;
  /** Child widget. */
  child?: WidgetInterface;
  /** Callback fired when the laid-out size changes. Receives `{ width, height }`. */
  onSizeChange: (size: Size) => void;
}

/**
 * SizeChangedNotifier Widget.
 *
 * Wraps a single child and invokes `onSizeChange` whenever the resulting
 * layout size changes. The callback is delivered post-frame (not during layout)
 * to avoid re-entrant layout mutations.
 *
 * 逆向: NM extends _t (misc_utils.js:781-800)
 */
export class SizeChangedNotifier extends Widget implements RenderObjectWidget {
  /** Callback fired when size changes. */
  readonly onSizeChange: (size: Size) => void;

  /** Child widget. */
  readonly child: WidgetInterface | undefined;

  /**
   * 逆向: NM constructor({ key, child, onSizeChange })
   */
  constructor(args: SizeChangedNotifierArgs) {
    super({ key: args.key });
    this.onSizeChange = args.onSizeChange;
    this.child = args.child;
  }

  /**
   * 逆向: NM uses single-child element (_t base → SingleChildRenderObjectElement)
   */
  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  /**
   * 逆向: NM.createRenderObject() → new N1T(this.onSizeChange)
   */
  createRenderObject(): RenderObject {
    return new RenderSizeChangedNotifier(this.onSizeChange);
  }

  /**
   * 逆向: NM.updateRenderObject(T) { T.updateCallback(this.onSizeChange); }
   */
  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderSizeChangedNotifier).updateCallback(this.onSizeChange);
  }
}
