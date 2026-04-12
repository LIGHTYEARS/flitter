/**
 * 滚动物理特性接口与实现。
 *
 * {@link ScrollPhysics} 定义了滚动偏移量的约束策略接口，
 * {@link ClampingScrollPhysics} 提供标准的钳位（clamping）实现，
 * 将偏移量限制在 [minExtent, maxExtent] 范围内。
 *
 * @module
 */

// ════════════════════════════════════════════════════
//  ScrollPhysics 接口
// ════════════════════════════════════════════════════

/**
 * 滚动物理特性接口。
 *
 * 定义滚动偏移量的约束策略，不同实现可提供不同的滚动行为
 * （如钳位、弹性回弹等）。
 *
 * @example
 * ```ts
 * const physics: ScrollPhysics = new ClampingScrollPhysics();
 * const clamped = physics.clampOffset(150, 0, 100); // 100
 * ```
 */
export interface ScrollPhysics {
  /**
   * 将给定的偏移量约束到 [minExtent, maxExtent] 范围内。
   *
   * @param offset - 原始偏移量
   * @param minExtent - 最小允许偏移量
   * @param maxExtent - 最大允许偏移量
   * @returns 约束后的偏移量
   */
  clampOffset(offset: number, minExtent: number, maxExtent: number): number;
}

// ════════════════════════════════════════════════════
//  ClampingScrollPhysics 实现
// ════════════════════════════════════════════════════

/**
 * 钳位滚动物理特性。
 *
 * 使用 Math.max/Math.min 将偏移量严格限制在 [minExtent, maxExtent] 范围内，
 * 不允许超出边界。这是终端 TUI 中最常用的滚动物理模型。
 *
 * @example
 * ```ts
 * const physics = new ClampingScrollPhysics();
 * physics.clampOffset(-10, 0, 100); // 0
 * physics.clampOffset(50, 0, 100);  // 50
 * physics.clampOffset(200, 0, 100); // 100
 * ```
 */
export class ClampingScrollPhysics implements ScrollPhysics {
  /**
   * 将偏移量钳位到 [minExtent, maxExtent] 范围。
   *
   * @param offset - 原始偏移量
   * @param minExtent - 最小允许偏移量
   * @param maxExtent - 最大允许偏移量
   * @returns 钳位后的偏移量
   */
  clampOffset(offset: number, minExtent: number, maxExtent: number): number {
    return Math.max(minExtent, Math.min(maxExtent, offset));
  }
}
