/**
 * 滚动物理特性接口。
 *
 * 定义滚动偏移量的约束策略，不同实现可提供不同的滚动行为
 * （如钳位、弹性回弹等）。
 *
 * 逆向: amp k1T (2137_unknown_k1T.js)
 *
 * @example
 * ```ts
 * const physics: ScrollPhysics = new ClampingScrollPhysics();
 * const clamped = physics.clampOffset(150, 0, 100); // 100
 * ```
 */
export interface ScrollPhysics {
  /**
   * 是否接受用户滚动输入。
   *
   * 逆向: amp k1T.shouldAcceptUserOffset (2137_unknown_k1T.js:2-3)
   *
   * @returns 如果接受用户输入返回 true，否则返回 false
   */
  shouldAcceptUserOffset(): boolean;

  /**
   * 将给定的偏移量约束到 [minExtent, maxExtent] 范围内。
   *
   * 逆向: amp x1T.applyBoundaryConditions (1472_tui_components/misc_utils.js:765-767)
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
 * 逆向: amp x1T (1472_tui_components/misc_utils.js:764-768)
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
   * 是否接受用户滚动输入。
   *
   * 逆向: amp k1T.shouldAcceptUserOffset — 默认返回 true。
   *
   * @returns 始终返回 true
   */
  shouldAcceptUserOffset(): boolean {
    return true;
  }

  /**
   * 将偏移量钳位到 [minExtent, maxExtent] 范围。
   *
   * 逆向: amp x1T.applyBoundaryConditions — Math.max(min, Math.min(max, offset))
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
