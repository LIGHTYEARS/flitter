/**
 * 边框单边样式。
 *
 * {@link BorderSide} 描述一条边框的颜色、宽度和样式。
 * 用于 {@link Border} 的 top / right / bottom / left 属性。
 *
 * 逆向: e9 (2125_unknown_e9.js:1-8)
 *
 * @module
 */

import { Color } from "../screen/color.js";

// ════════════════════════════════════════════════════
//  BorderSide
// ════════════════════════════════════════════════════

/**
 * 边框单边样式。
 *
 * 逆向: e9 (2125_unknown_e9.js:1-8)
 *
 * amp 原始实现:
 * ```js
 * class e9 {
 *   color; width; style;
 *   constructor(T = LT.black, R = 1, a = "rounded") {
 *     this.color = T, this.width = R, this.style = a;
 *   }
 * }
 * ```
 */
export class BorderSide {
  /** 边框颜色（默认黑色） */
  readonly color: Color;

  /** 边框宽度（默认 1） */
  readonly width: number;

  /** 边框样式：rounded（圆角）或 solid（实线） */
  readonly style: "rounded" | "solid";

  /**
   * 创建 BorderSide 实例。
   *
   * 逆向: e9 constructor(T = LT.black, R = 1, a = "rounded")
   *
   * @param color - 边框颜色，默认 Color.black()
   * @param width - 边框宽度，默认 1
   * @param style - 边框样式，默认 "rounded"
   */
  constructor(
    color: Color = Color.black(),
    width: number = 1,
    style: "rounded" | "solid" = "rounded",
  ) {
    this.color = color;
    this.width = width;
    this.style = style;
  }
}
