/**
 * ProgressBar — Unicode sub-character block progress bar widget.
 *
 * 逆向: chunk-006.js:23425 — progress bar using █ and ░ blocks
 *       E0R / Y0R at chunk-006.js:25880 — animated progress rendering
 *       chunk-006.js:23425-23429 — `[█████░░░░░░░░░░░░░░░] current/total` pattern
 *
 * Renders a horizontal progress bar using Unicode sub-character blocks
 * for smooth rendering: ▏▎▍▌▋▊▉█
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
import { SingleChildRenderObjectElement } from "./padding.js";

// ════════════════════════════════════════════════════
//  Unicode sub-character blocks
// ════════════════════════════════════════════════════

/**
 * Unicode block elements for smooth sub-character progress rendering.
 *
 * 逆向: chunk-006.js:23425 uses █ (full) and ░ (empty)
 * Extended with fractional blocks for smoother rendering: ▏▎▍▌▋▊▉█
 * Each character represents 1/8th increments of a cell width.
 */
const BLOCK_CHARS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];

// ════════════════════════════════════════════════════
//  ProgressBarRenderObject
// ════════════════════════════════════════════════════

/**
 * RenderObject for ProgressBar.
 *
 * 逆向: Q0R/Z0R pattern at chunk-006.js:25919-25934 — custom RenderObject with paint
 */
export class ProgressBarRenderObject extends RenderBox {
  private _value: number;
  private _barWidth: number;
  private _label: string | undefined;
  private _color: Color;
  private _backgroundColor: Color;

  constructor(
    value: number,
    barWidth: number,
    label: string | undefined,
    color: Color,
    backgroundColor: Color,
  ) {
    super();
    this._value = Math.max(0, Math.min(1, value));
    this._barWidth = barWidth;
    this._label = label;
    this._color = color;
    this._backgroundColor = backgroundColor;
  }

  update(
    value: number,
    barWidth: number,
    label: string | undefined,
    color: Color,
    backgroundColor: Color,
  ): void {
    this._value = Math.max(0, Math.min(1, value));
    this._barWidth = barWidth;
    this._label = label;
    this._color = color;
    this._backgroundColor = backgroundColor;
    this.markNeedsLayout();
    this.markNeedsPaint();
  }

  // ────────────────────────────────────────────────────
  //  Intrinsic sizes
  // ────────────────────────────────────────────────────

  override getMinIntrinsicWidth(_height: number): number {
    return this._computeTotalWidth();
  }

  override getMaxIntrinsicWidth(_height: number): number {
    return this._computeTotalWidth();
  }

  override getMinIntrinsicHeight(_width: number): number {
    return 1;
  }

  override getMaxIntrinsicHeight(_width: number): number {
    return 1;
  }

  private _computeTotalWidth(): number {
    const labelLen = this._label ? this._label.length + 1 : 0; // +1 for space
    return labelLen + this._barWidth;
  }

  // ────────────────────────────────────────────────────
  //  Layout
  // ────────────────────────────────────────────────────

  performLayout(): void {
    const constraints = this._lastConstraints!;
    const totalWidth = this._computeTotalWidth();
    const size = constraints.constrain(totalWidth, 1);
    this.setSize(size.width, size.height);
  }

  // ────────────────────────────────────────────────────
  //  Paint
  // ────────────────────────────────────────────────────

  /**
   * Paint the progress bar.
   *
   * 逆向: chunk-006.js:23425-23429
   *   P = Math.round(current / total * 20)
   *   k = 20 - P
   *   x = `[${"\u2588".repeat(P)}${"\u2591".repeat(k)}] ${current}/${total}`
   *
   * Extended with sub-character blocks for smooth rendering.
   */
  override performPaint(screen: Screen, offsetX: number, offsetY: number): void {
    const x = Math.floor(offsetX);
    const y = Math.floor(offsetY);
    let col = x;

    // Paint label if present
    if (this._label) {
      for (let i = 0; i < this._label.length; i++) {
        screen.setCell(col + i, y, {
          char: this._label[i],
          width: 1,
          style: { fg: this._color },
        });
      }
      col += this._label.length + 1; // +1 space
    }

    // Calculate filled width using sub-character blocks
    const filledExact = this._value * this._barWidth;
    const filledFull = Math.floor(filledExact);
    const fractional = filledExact - filledFull;
    const fractionalIndex = Math.round(fractional * 8);

    // Paint filled portion
    for (let i = 0; i < filledFull && i < this._barWidth; i++) {
      screen.setCell(col + i, y, {
        char: "█",
        width: 1,
        style: { fg: this._color },
      });
    }

    // Paint fractional block
    if (filledFull < this._barWidth && fractionalIndex > 0) {
      screen.setCell(col + filledFull, y, {
        char: BLOCK_CHARS[fractionalIndex],
        width: 1,
        style: { fg: this._color },
      });
    }

    // Paint empty portion
    const emptyStart = filledFull + (fractionalIndex > 0 ? 1 : 0);
    for (let i = emptyStart; i < this._barWidth; i++) {
      screen.setCell(col + i, y, {
        char: "░",
        width: 1,
        style: { fg: this._backgroundColor },
      });
    }
  }
}

// ════════════════════════════════════════════════════
//  ProgressBar Widget
// ════════════════════════════════════════════════════

/** ProgressBar constructor arguments. */
interface ProgressBarArgs {
  /** Optional key */
  key?: Key;
  /** Progress value, 0.0 to 1.0 */
  value: number;
  /** Width of the bar in characters, default 20 */
  width?: number;
  /** Optional label displayed before the bar */
  label?: string;
  /** Bar fill color */
  color?: Color;
  /** Bar background color */
  backgroundColor?: Color;
}

/**
 * ProgressBar Widget.
 *
 * Renders a horizontal progress bar with Unicode sub-character blocks.
 *
 * 逆向: chunk-006.js:23425-23429 — progress rendering with █ and ░
 *
 * @example
 * ```ts
 * new ProgressBar({ value: 0.75, width: 30, label: "Loading" });
 * ```
 */
export class ProgressBar extends Widget implements RenderObjectWidget {
  readonly value: number;
  readonly barWidth: number;
  readonly label: string | undefined;
  readonly color: Color;
  readonly backgroundColor: Color;

  constructor(args: ProgressBarArgs) {
    super({ key: args.key });
    this.value = args.value;
    this.barWidth = args.width ?? 20;
    this.label = args.label;
    this.color = args.color ?? ColorClass.green();
    this.backgroundColor = args.backgroundColor ?? ColorClass.rgb(80, 80, 80);
  }

  createElement(): Element {
    return new SingleChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  createRenderObject(): RenderObject {
    return new ProgressBarRenderObject(
      this.value,
      this.barWidth,
      this.label,
      this.color,
      this.backgroundColor,
    );
  }

  updateRenderObject(renderObject: RenderObject): void {
    if (renderObject instanceof ProgressBarRenderObject) {
      renderObject.update(
        this.value,
        this.barWidth,
        this.label,
        this.color,
        this.backgroundColor,
      );
    }
  }
}
