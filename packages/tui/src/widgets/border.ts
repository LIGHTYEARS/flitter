/**
 * 四边边框。
 *
 * {@link Border} 描述一个矩形的四条边框，每条边由 {@link BorderSide} 定义。
 * 提供 `all` 和 `symmetric` 静态工厂方法，与 {@link EdgeInsets} 的 API 风格一致。
 *
 * 逆向: h9 (2124_unknown_h9.js:1-15)
 *
 * @module
 */

import type { BorderSide } from "./border-side.js";

// ════════════════════════════════════════════════════
//  Border
// ════════════════════════════════════════════════════

/**
 * 四边边框。
 *
 * 逆向: h9 (2124_unknown_h9.js:1-15)
 *
 * amp 原始实现:
 * ```js
 * class h9 {
 *   top; right; bottom; left;
 *   constructor(T, R, a, e) { this.top = T, this.right = R, this.bottom = a, this.left = e; }
 *   static all(T) { return new h9(T, T, T, T); }
 *   static symmetric(T, R) { return new h9(R, T, R, T); }
 * }
 * ```
 */
export class Border {
  /** 上边框 */
  readonly top: BorderSide | undefined;

  /** 右边框 */
  readonly right: BorderSide | undefined;

  /** 下边框 */
  readonly bottom: BorderSide | undefined;

  /** 左边框 */
  readonly left: BorderSide | undefined;

  /**
   * 创建 Border 实例。
   *
   * 逆向: h9 constructor(T, R, a, e) — top, right, bottom, left
   *
   * @param top - 上边框
   * @param right - 右边框
   * @param bottom - 下边框
   * @param left - 左边框
   */
  constructor(top?: BorderSide, right?: BorderSide, bottom?: BorderSide, left?: BorderSide) {
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
  }

  /**
   * 四边使用相同的 BorderSide。
   *
   * 逆向: h9.all(T) → new h9(T, T, T, T)
   *
   * @param side - 四边统一的边框样式
   * @returns 新的 Border 实例
   */
  static all(side: BorderSide): Border {
    return new Border(side, side, side, side);
  }

  /**
   * 对称边框：水平方向（左、右）和垂直方向（上、下）分别使用相同的 BorderSide。
   *
   * 逆向: h9.symmetric(T, R) → new h9(R, T, R, T)
   * T = horizontal（左、右），R = vertical（上、下）
   *
   * @param opts - horizontal 为左右边框，vertical 为上下边框
   * @returns 新的 Border 实例
   */
  static symmetric({
    horizontal,
    vertical,
  }: {
    horizontal?: BorderSide;
    vertical?: BorderSide;
  }): Border {
    return new Border(vertical, horizontal, vertical, horizontal);
  }
}
