/**
 * Container 便捷组合 Widget。
 *
 * {@link Container} 是 {@link StatelessWidget} 的子类，根据配置参数
 * 自动组合 {@link Padding} 和 {@link SizedBox} 等基础布局 Widget。
 *
 * @module
 */

import { StatelessWidget } from "../tree/stateless-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import type { Key } from "../tree/widget.js";
import { EdgeInsets } from "./edge-insets.js";
import { Padding } from "./padding.js";
import { SizedBox } from "./sized-box.js";

// ════════════════════════════════════════════════════
//  Container
// ════════════════════════════════════════════════════

/** Container 构造函数参数。 */
interface ContainerArgs {
  /** 可选标识键 */
  key?: Key;
  /** 可选内边距 */
  padding?: EdgeInsets;
  /** 可选固定宽度 */
  width?: number;
  /** 可选固定高度 */
  height?: number;
  /** 可选子 Widget */
  child?: WidgetInterface;
}

/**
 * Container 便捷组合 Widget。
 *
 * 根据配置参数自动组合 Padding、SizedBox 等基础布局 Widget：
 * 1. 从子 Widget 开始
 * 2. 如果指定了宽度或高度，用 SizedBox 包裹
 * 3. 如果指定了内边距，用 Padding 包裹
 * 4. 如果没有任何配置且无子 Widget，返回零尺寸的 SizedBox
 */
export class Container extends StatelessWidget {
  /** 可选内边距 */
  readonly padding: EdgeInsets | undefined;

  /** 可选固定宽度 */
  readonly width: number | undefined;

  /** 可选固定高度 */
  readonly height: number | undefined;

  /** 可选子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 创建 Container Widget。
   *
   * @param args - 配置参数
   */
  constructor(args?: ContainerArgs) {
    super({ key: args?.key });
    this.padding = args?.padding;
    this.width = args?.width;
    this.height = args?.height;
    this.child = args?.child;
  }

  /**
   * 构建子 Widget 树。
   *
   * 按照以下顺序组合（由内到外）：
   * 1. child（原始子 Widget）
   * 2. SizedBox（如果指定了 width 或 height）
   * 3. Padding（如果指定了 padding）
   *
   * 如果没有任何配置且无子 Widget，返回零尺寸的 SizedBox。
   *
   * @param context - 构建上下文
   * @returns 组合后的 Widget
   */
  build(context: BuildContext): WidgetInterface {
    let current: WidgetInterface | undefined = this.child;

    // 如果指定了宽度或高度，用 SizedBox 包裹
    if (this.width !== undefined || this.height !== undefined) {
      current = new SizedBox({
        width: this.width,
        height: this.height,
        child: current,
      }) as unknown as WidgetInterface;
    }

    // 如果指定了内边距，用 Padding 包裹
    if (this.padding !== undefined) {
      current = new Padding({
        padding: this.padding,
        child: current,
      }) as unknown as WidgetInterface;
    }

    // 如果没有任何配置且无子 Widget，返回零尺寸的 SizedBox
    if (current === undefined) {
      current = new SizedBox({
        width: 0,
        height: 0,
      }) as unknown as WidgetInterface;
    }

    return current;
  }
}
