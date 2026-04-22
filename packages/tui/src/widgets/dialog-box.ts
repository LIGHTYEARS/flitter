/**
 * DialogBox — bordered two-column dialog layout.
 *
 * 逆向: pRR (Widget) + _RR (RenderObject) in chunk-006.js:19492-19650
 *
 * Renders up to 3 children inside a box-border frame:
 * - Child 0: left column
 * - Child 1: right column upper
 * - Child 2: right column lower
 *
 * When multiple children exist, draws a center column divider at floor(width/2).
 * Supports rounded and square border styles, optional banner mode (top-left uses ├ instead of corner).
 *
 * @module
 */

import type { Color } from "../screen/color.js";
import type { Screen } from "../screen/screen.js";
import { BoxConstraints } from "../tree/constraints.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { MultiChildRenderObjectElement } from "./multi-child-render-object-element.js";

// ════════════════════════════════════════════════════
//  RenderDialogBox
// ════════════════════════════════════════════════════

/**
 * 逆向: _RR extends O9 (chunk-006.js:19521-19650)
 */
export class RenderDialogBox extends RenderBox {
  maxHeight: number | undefined;
  borderColor: Color;
  backgroundColor: Color;
  borderStyle: "rounded" | "square";
  hasBanner: boolean;
  userHeight: number | undefined;

  constructor(
    maxHeight: number | undefined,
    borderColor: Color,
    backgroundColor: Color,
    borderStyle: "rounded" | "square" = "rounded",
    hasBanner: boolean = false,
    userHeight?: number,
  ) {
    super();
    this.maxHeight = maxHeight;
    this.borderColor = borderColor;
    this.backgroundColor = backgroundColor;
    this.borderStyle = borderStyle;
    this.hasBanner = hasBanner;
    this.userHeight = userHeight;
  }

  // 逆向: _RR.performLayout (chunk-006.js:19532-19578)
  performLayout(): void {
    const constraints = this._lastConstraints;
    if (!constraints) return;

    const children = this._children;

    if (children.length === 0) {
      this.setSize(constraints.minWidth, 2);
      return;
    }

    const first = children[0] as RenderBox | undefined;
    if (!first) {
      this.setSize(constraints.minWidth, 2);
      return;
    }

    const second = children.length > 1 ? (children[1] as RenderBox) : undefined;
    const third = children.length > 2 ? (children[2] as RenderBox) : undefined;

    const totalWidth = constraints.maxWidth;
    const halfWidth = Math.floor(totalWidth / 2);

    let height: number;
    if (this.userHeight !== undefined) {
      height = Math.max(4, this.userHeight);
    } else {
      height = this.getMinIntrinsicHeight(totalWidth);
    }

    let finalHeight = Math.min(height, constraints.maxHeight);
    if (this.maxHeight) {
      finalHeight = Math.min(finalHeight, this.maxHeight);
    }

    this.setSize(totalWidth, finalHeight);

    const innerHeight = finalHeight - 2;
    const leftWidth = second || third ? halfWidth - 2 : totalWidth - 2;
    const leftConstraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: leftWidth,
      minHeight: 0,
      maxHeight: Math.max(0, innerHeight),
    });

    first.layout(leftConstraints);
    first.setOffset(1, 1);

    if (second || third) {
      const rightWidth = totalWidth - halfWidth - 2;
      const totalInnerHeight = Math.max(0, Math.floor(innerHeight));

      const makeConstraints = (h: number) =>
        new BoxConstraints({
          minWidth: 0,
          maxWidth: rightWidth,
          minHeight: 0,
          maxHeight: Math.max(0, Math.floor(h)),
        });

      let remaining = totalInnerHeight;
      let secondHeight = 0;

      if (second) {
        const intrinsicH = second.getMaxIntrinsicHeight(rightWidth);
        const cappedH = Math.min(intrinsicH, remaining);
        second.layout(makeConstraints(cappedH));
        secondHeight = second.size.height;
        second.setOffset(halfWidth + 1, 1);
        remaining = Math.max(0, remaining - secondHeight);
      }

      // 逆向: line 19568 — separator between second and third
      if (second && third && secondHeight > 0) {
        remaining = Math.max(0, remaining - 1);
      }

      if (third) {
        const intrinsicH = third.getMaxIntrinsicHeight(rightWidth);
        const cappedH = Math.min(intrinsicH, remaining);
        third.layout(makeConstraints(cappedH));
        const thirdY = secondHeight > 0 ? secondHeight + 2 : 1;
        third.setOffset(halfWidth + 1, thirdY);
      }
    }
  }

  // 逆向: _RR.getMinIntrinsicHeight (chunk-006.js:19579-19598)
  override getMinIntrinsicHeight(width: number): number {
    if (this.userHeight !== undefined) return Math.max(4, this.userHeight);

    const children = this._children;
    if (children.length === 0) return 2;

    const first = children[0] as RenderBox | undefined;
    if (!first) return 2;

    const second = children.length > 1 ? (children[1] as RenderBox) : undefined;
    const third = children.length > 2 ? (children[2] as RenderBox) : undefined;

    const halfWidth = Math.floor(width / 2);
    const leftWidth = second || third ? halfWidth : width;
    const leftIntrinsic = first.getMinIntrinsicHeight(leftWidth - 2);
    const leftCapped = Math.min(leftIntrinsic, 50);

    let rightHeight = 0;
    if (second || third) {
      const rightWidth = width - halfWidth - 2;
      const secondH = second ? second.getMaxIntrinsicHeight(rightWidth) : 0;
      const thirdH = third ? third.getMaxIntrinsicHeight(rightWidth) : 0;
      rightHeight = secondH + thirdH + (secondH > 0 && thirdH > 0 ? 1 : 0);
    }

    return Math.max(leftCapped, rightHeight) + 2;
  }

  // 逆向: _RR.getMaxIntrinsicHeight (chunk-006.js:19600-19602)
  override getMaxIntrinsicHeight(width: number): number {
    return this.getMinIntrinsicHeight(width);
  }

  // 逆向: _RR.paint (chunk-006.js:19603-19609)
  // NOTE: Flitter paint offset convention differs from amp — offsetX/offsetY
  // is the node's absolute position (parent pre-computed), whereas amp passes
  // parent absolute and the node adds its own offset.
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    const x = Math.floor(offsetX);
    const y = Math.floor(offsetY);

    screen.fill(x, y, this._size.width, this._size.height, " ", {
      bg: this.backgroundColor,
    });

    // Paint children first (via super), then borders on top
    super.paint(screen, offsetX, offsetY);

    this._paintGridBorders(screen, x, y);
  }

  // 逆向: _RR._paintGridBorders (chunk-006.js:19610-19649)
  private _paintGridBorders(screen: Screen, x: number, y: number): void {
    const w = this._size.width;
    const h = this._size.height;
    const children = this._children;
    const hasMultiple = children.length > 1;
    const second = children.length > 1 ? (children[1] as RenderBox) : undefined;
    const third = children.length > 2 ? (children[2] as RenderBox) : undefined;

    const style = { fg: this.borderColor, bg: this.backgroundColor };
    const halfWidth = Math.floor(w / 2);

    const corners =
      this.borderStyle === "rounded"
        ? { tl: "\u256D", tr: "\u256E", bl: "\u2570", br: "\u256F" }
        : { tl: "\u250C", tr: "\u2510", bl: "\u2514", br: "\u2518" };

    // 逆向: lines 19635-19636 — horizontal borders (top and bottom)
    for (let col = 0; col < w; col++) {
      screen.mergeBorderChar(x + col, y, "\u2500", style);
    }
    for (let col = 0; col < w; col++) {
      screen.mergeBorderChar(x + col, y + h - 1, "\u2500", style);
    }

    // 逆向: lines 19637-19638 — vertical borders (left and right)
    for (let row = 0; row < h; row++) {
      screen.mergeBorderChar(x, y + row, "\u2502", style);
    }
    for (let row = 0; row < h; row++) {
      screen.mergeBorderChar(x + w - 1, y + row, "\u2502", style);
    }

    // 逆向: line 19639 — corners, with banner mode affecting top-left
    if (this.hasBanner) {
      screen.mergeBorderChar(x, y, "\u251C", style);
      screen.mergeBorderChar(x + w - 1, y, "\u2524", style);
    } else {
      screen.mergeBorderChar(x, y, corners.tl, style);
      screen.mergeBorderChar(x + w - 1, y, corners.tr, style);
    }

    screen.mergeBorderChar(x, y + h - 1, corners.bl, style);
    screen.mergeBorderChar(x + w - 1, y + h - 1, corners.br, style);

    // 逆向: lines 19640-19643 — center column divider
    if (hasMultiple) {
      for (let row = 1; row < h - 1; row++) {
        screen.mergeBorderChar(x + halfWidth, y + row, "\u2502", style);
      }
      screen.mergeBorderChar(x + halfWidth, y, "\u252C", style);
      screen.mergeBorderChar(x + halfWidth, y + h - 1, "\u2534", style);
    }

    // 逆向: lines 19644-19648 — horizontal separator between second and third
    if (second && third && second.size.height > 0) {
      const sepY = second.offset.y + second.size.height;
      for (let col = halfWidth + 1; col < w - 1; col++) {
        screen.mergeBorderChar(x + col, y + sepY, "\u2500", style);
      }
      screen.mergeBorderChar(x + halfWidth, y + sepY, "\u251C", style);
      screen.mergeBorderChar(x + w - 1, y + sepY, "\u2524", style);
    }
  }
}

// ════════════════════════════════════════════════════
//  DialogBox Widget
// ════════════════════════════════════════════════════

interface DialogBoxArgs {
  key?: Key;
  children: WidgetInterface[];
  maxHeight?: number;
  borderColor: Color;
  backgroundColor: Color;
  borderStyle?: "rounded" | "square";
  hasBanner?: boolean;
  userHeight?: number;
}

/**
 * 逆向: pRR extends Dn (chunk-006.js:19492-19520)
 */
export class DialogBox extends Widget implements RenderObjectWidget {
  readonly dialogChildren: WidgetInterface[];
  readonly maxHeight: number | undefined;
  readonly borderColor: Color;
  readonly backgroundColor: Color;
  readonly borderStyle: "rounded" | "square";
  readonly hasBanner: boolean;
  readonly userHeight: number | undefined;

  constructor(args: DialogBoxArgs) {
    super({ key: args.key });
    this.dialogChildren = args.children;
    this.maxHeight = args.maxHeight;
    this.borderColor = args.borderColor;
    this.backgroundColor = args.backgroundColor;
    this.borderStyle = args.borderStyle ?? "rounded";
    this.hasBanner = args.hasBanner ?? false;
    this.userHeight = args.userHeight;
  }

  get children(): WidgetInterface[] {
    return this.dialogChildren;
  }

  createElement(): Element {
    return new MultiChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  createRenderObject(): RenderObject {
    return new RenderDialogBox(
      this.maxHeight,
      this.borderColor,
      this.backgroundColor,
      this.borderStyle,
      this.hasBanner,
      this.userHeight,
    );
  }

  updateRenderObject(renderObject: RenderObject): void {
    if (renderObject instanceof RenderDialogBox) {
      const heightChanged = renderObject.userHeight !== this.userHeight;
      renderObject.maxHeight = this.maxHeight;
      renderObject.borderColor = this.borderColor;
      renderObject.backgroundColor = this.backgroundColor;
      renderObject.borderStyle = this.borderStyle;
      renderObject.hasBanner = this.hasBanner;
      renderObject.userHeight = this.userHeight;
      if (heightChanged) {
        renderObject.markNeedsLayout();
        renderObject.markNeedsPaint();
      }
    }
  }
}
