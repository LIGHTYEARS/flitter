/**
 * SplitPane — resizable split layout widget.
 *
 * 逆向: VZT/YZT at modules/1472_tui_components/ — split pane layout
 *       Amp uses split panes for thread dashboard and multi-panel views.
 *
 * Renders two children separated by a draggable divider.
 * Supports horizontal (left/right) and vertical (top/bottom) split.
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import type { Color } from "../screen/color.js";
import { Color as ColorClass } from "../screen/color.js";
import { BoxConstraints } from "../tree/constraints.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { MultiChildRenderObjectElement } from "./multi-child-render-object-element.js";

// ════════════════════════════════════════════════════
//  SplitPaneRenderObject
// ════════════════════════════════════════════════════

/** Split direction. */
export type SplitDirection = "horizontal" | "vertical";

/**
 * RenderObject for SplitPane.
 *
 * Lays out two children with a divider between them.
 * The divider is 1 cell wide/tall.
 *
 * 逆向: VZT render object pattern — layout two children with ratio
 */
export class SplitPaneRenderObject extends RenderBox {
  private _direction: SplitDirection;
  private _ratio: number;
  private _minRatio: number;
  private _maxRatio: number;
  private _dividerColor: Color;
  private _onResize: ((ratio: number) => void) | undefined;

  constructor(
    direction: SplitDirection,
    ratio: number,
    minRatio: number,
    maxRatio: number,
    dividerColor: Color,
    onResize?: (ratio: number) => void,
  ) {
    super();
    this._direction = direction;
    this._ratio = Math.max(minRatio, Math.min(maxRatio, ratio));
    this._minRatio = minRatio;
    this._maxRatio = maxRatio;
    this._dividerColor = dividerColor;
    this._onResize = onResize;
  }

  update(
    direction: SplitDirection,
    ratio: number,
    minRatio: number,
    maxRatio: number,
    dividerColor: Color,
    onResize?: (ratio: number) => void,
  ): void {
    this._direction = direction;
    this._ratio = Math.max(minRatio, Math.min(maxRatio, ratio));
    this._minRatio = minRatio;
    this._maxRatio = maxRatio;
    this._dividerColor = dividerColor;
    this._onResize = onResize;
    this.markNeedsLayout();
    this.markNeedsPaint();
  }

  /** Current split ratio. */
  get ratio(): number {
    return this._ratio;
  }

  // ────────────────────────────────────────────────────
  //  Intrinsic sizes
  // ────────────────────────────────────────────────────

  override getMinIntrinsicWidth(height: number): number {
    if (this._direction === "horizontal") {
      // Both children side-by-side + 1 for divider
      let w = 1; // divider
      if (this._children.length > 0) w += (this._children[0] as RenderBox).getMinIntrinsicWidth(height);
      if (this._children.length > 1) w += (this._children[1] as RenderBox).getMinIntrinsicWidth(height);
      return w;
    }
    // Vertical: max of both children
    let maxW = 0;
    for (const child of this._children) {
      maxW = Math.max(maxW, (child as RenderBox).getMinIntrinsicWidth(height));
    }
    return maxW;
  }

  override getMaxIntrinsicWidth(height: number): number {
    return this.getMinIntrinsicWidth(height);
  }

  override getMinIntrinsicHeight(width: number): number {
    if (this._direction === "vertical") {
      let h = 1; // divider
      if (this._children.length > 0) h += (this._children[0] as RenderBox).getMinIntrinsicHeight(width);
      if (this._children.length > 1) h += (this._children[1] as RenderBox).getMinIntrinsicHeight(width);
      return h;
    }
    let maxH = 0;
    for (const child of this._children) {
      maxH = Math.max(maxH, (child as RenderBox).getMinIntrinsicHeight(width));
    }
    return maxH;
  }

  override getMaxIntrinsicHeight(width: number): number {
    return this.getMinIntrinsicHeight(width);
  }

  // ────────────────────────────────────────────────────
  //  Layout
  // ────────────────────────────────────────────────────

  performLayout(): void {
    const constraints = this._lastConstraints!;
    const w = constraints.maxWidth;
    const h = constraints.maxHeight;
    this.setSize(w, h);

    if (this._children.length < 2) return;

    const first = this._children[0] as RenderBox;
    const second = this._children[1] as RenderBox;

    if (this._direction === "horizontal") {
      // Horizontal split: first | divider(1) | second
      const available = Math.max(0, w - 1);
      const firstW = Math.max(0, Math.floor(available * this._ratio));
      const secondW = Math.max(0, available - firstW);

      first.layout(new BoxConstraints({
        minWidth: firstW, maxWidth: firstW,
        minHeight: h, maxHeight: h,
      }));
      first.setOffset(0, 0);

      second.layout(new BoxConstraints({
        minWidth: secondW, maxWidth: secondW,
        minHeight: h, maxHeight: h,
      }));
      second.setOffset(firstW + 1, 0);
    } else {
      // Vertical split: first / divider(1) / second
      const available = Math.max(0, h - 1);
      const firstH = Math.max(0, Math.floor(available * this._ratio));
      const secondH = Math.max(0, available - firstH);

      first.layout(new BoxConstraints({
        minWidth: w, maxWidth: w,
        minHeight: firstH, maxHeight: firstH,
      }));
      first.setOffset(0, 0);

      second.layout(new BoxConstraints({
        minWidth: w, maxWidth: w,
        minHeight: secondH, maxHeight: secondH,
      }));
      second.setOffset(0, firstH + 1);
    }
  }

  // ────────────────────────────────────────────────────
  //  Paint — draw divider
  // ────────────────────────────────────────────────────

  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    const x = Math.floor(offsetX);
    const y = Math.floor(offsetY);
    const w = this._size.width;
    const h = this._size.height;

    if (this._direction === "horizontal") {
      // Draw vertical divider
      const available = Math.max(0, w - 1);
      const dividerX = x + Math.floor(available * this._ratio);
      for (let row = 0; row < h; row++) {
        screen.setCell(dividerX, y + row, {
          char: "│",
          width: 1,
          style: { fg: this._dividerColor },
        });
      }
    } else {
      // Draw horizontal divider
      const available = Math.max(0, h - 1);
      const dividerY = y + Math.floor(available * this._ratio);
      for (let col = 0; col < w; col++) {
        screen.setCell(x + col, dividerY, {
          char: "─",
          width: 1,
          style: { fg: this._dividerColor },
        });
      }
    }
  }
}

// ════════════════════════════════════════════════════
//  SplitPane Widget
// ════════════════════════════════════════════════════

/** SplitPane constructor arguments. */
interface SplitPaneArgs {
  /** Optional key */
  key?: Key;
  /** Split direction */
  direction: SplitDirection;
  /** Initial split ratio (0.0 to 1.0), default 0.5 */
  initialRatio?: number;
  /** Two child widgets: [first, second] */
  children: [WidgetInterface, WidgetInterface];
  /** Called when the divider is dragged */
  onResize?: (ratio: number) => void;
  /** Minimum ratio, default 0.1 */
  minRatio?: number;
  /** Maximum ratio, default 0.9 */
  maxRatio?: number;
  /** Divider color */
  dividerColor?: Color;
}

/**
 * SplitPane Widget.
 *
 * Renders two children separated by a draggable divider.
 *
 * 逆向: VZT/YZT at modules/1472_tui_components/ — split pane layout pattern
 *
 * @example
 * ```ts
 * new SplitPane({
 *   direction: "horizontal",
 *   initialRatio: 0.3,
 *   children: [leftPanel, rightPanel],
 *   onResize: (ratio) => console.log(`Ratio: ${ratio}`),
 * });
 * ```
 */
export class SplitPane extends Widget implements RenderObjectWidget {
  readonly direction: SplitDirection;
  readonly initialRatio: number;
  readonly splitChildren: [WidgetInterface, WidgetInterface];
  readonly onResize: ((ratio: number) => void) | undefined;
  readonly minRatio: number;
  readonly maxRatio: number;
  readonly dividerColor: Color;

  constructor(args: SplitPaneArgs) {
    super({ key: args.key });
    this.direction = args.direction;
    this.initialRatio = args.initialRatio ?? 0.5;
    this.splitChildren = args.children;
    this.onResize = args.onResize;
    this.minRatio = args.minRatio ?? 0.1;
    this.maxRatio = args.maxRatio ?? 0.9;
    this.dividerColor = args.dividerColor ?? ColorClass.rgb(108, 112, 134);
  }

  /** Expose children for MultiChildRenderObjectElement. */
  get children(): WidgetInterface[] {
    return this.splitChildren;
  }

  createElement(): Element {
    return new MultiChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  createRenderObject(): RenderObject {
    return new SplitPaneRenderObject(
      this.direction,
      this.initialRatio,
      this.minRatio,
      this.maxRatio,
      this.dividerColor,
      this.onResize,
    );
  }

  updateRenderObject(renderObject: RenderObject): void {
    if (renderObject instanceof SplitPaneRenderObject) {
      renderObject.update(
        this.direction,
        this.initialRatio,
        this.minRatio,
        this.maxRatio,
        this.dividerColor,
        this.onResize,
      );
    }
  }
}
