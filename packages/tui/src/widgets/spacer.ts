/**
 * Spacer Widget — Flexible 的便捷封装。
 *
 * Spacer 在 Flex 布局（Row / Column）中占据剩余空间。
 * 内部实现为包裹一个 {@link SizedBox} 的 tight {@link Flexible}。
 *
 * 逆向: amp 中 Spacer 无独立类，是 Flexible 的便捷封装
 *
 * @module
 */

import type { Key, Widget } from "../tree/widget.js";
import { Flexible } from "./flexible.js";
import { SizedBox } from "./sized-box.js";

// ════════════════════════════════════════════════════
//  Spacer Widget
// ════════════════════════════════════════════════════

/** Spacer 构造函数参数。 */
interface SpacerArgs {
  /** 可选标识键 */
  key?: Key;
  /** 弹性因子，默认 1 */
  flex?: number;
}

/**
 * Spacer Widget。
 *
 * 在 Row / Column 中占据剩余空间。
 * 等价于 `Flexible({ child: SizedBox(), flex: N, fit: "tight" })`。
 *
 * 逆向: amp 中 Spacer 无独立类，是 Flexible 的便捷封装
 */
export class Spacer extends Flexible {
  /**
   * 创建 Spacer Widget。
   *
   * @param args - 可选配置参数
   */
  constructor(args?: SpacerArgs) {
    super({
      key: args?.key,
      child: new SizedBox() as unknown as Widget,
      flex: args?.flex ?? 1,
      fit: "tight",
    });
  }
}
