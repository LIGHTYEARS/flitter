/**
 * 盒装饰。
 *
 * {@link BoxDecoration} 描述一个矩形盒子的视觉装饰，包括背景色和边框。
 * 用于 {@link Container} 等组件的 decoration 属性。
 *
 * 逆向: amp 中 decoration 是内联对象 { color, border }
 *
 * @module
 */

import type { Color } from "../screen/color.js";
import type { Border } from "./border.js";

// ════════════════════════════════════════════════════
//  BoxDecoration
// ════════════════════════════════════════════════════

/**
 * 盒装饰。
 *
 * 逆向: amp 中 decoration 是内联对象 { color, border }
 */
export class BoxDecoration {
  /** 背景色 */
  readonly color?: Color;

  /** 边框 */
  readonly border?: Border;

  /**
   * 创建 BoxDecoration 实例。
   *
   * @param opts - 可选的 color（背景色）和 border（边框）
   */
  constructor(opts?: { color?: Color; border?: Border }) {
    this.color = opts?.color;
    this.border = opts?.border;
  }
}
