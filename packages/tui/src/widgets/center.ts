/**
 * Center Widget — Align 的语法糖。
 *
 * Center 等价于不指定 widthFactor / heightFactor 的 {@link Align}，
 * 将子节点居中放置并撑满父约束。
 *
 * 逆向: amp 中 Center 是 Align 的语法糖
 *
 * @module
 */

import type { Widget as WidgetInterface } from "../tree/element.js";
import type { Key } from "../tree/widget.js";
import { Align } from "./align.js";

// ════════════════════════════════════════════════════
//  Center Widget
// ════════════════════════════════════════════════════

/** Center 构造函数参数。 */
interface CenterArgs {
  /** 可选标识键 */
  key?: Key;
  /** 可选子 Widget */
  child?: WidgetInterface;
}

/**
 * Center Widget。
 *
 * 将子 Widget 居中放置，等价于无 widthFactor / heightFactor 的 Align。
 *
 * 逆向: amp 中 Center 是 Align 的语法糖
 */
export class Center extends Align {
  /**
   * 创建 Center Widget。
   *
   * @param args - 配置参数
   */
  constructor(args?: CenterArgs) {
    super({ ...args });
  }
}
