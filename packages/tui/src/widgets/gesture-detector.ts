/**
 * GestureDetector — 便捷手势检测组件。
 *
 * 逆向: amp 中无独立 GestureDetector，Flitter 封装为便捷 Widget
 *
 * 高级手势（如 onTap）在 amp 中通过 MouseRegion 的回调直接实现。
 * GestureDetector 是 Flitter 提供的语法糖，内部委托给 {@link MouseRegion}。
 *
 * @module
 */

import type { Widget as WidgetInterface } from "../tree/element.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import { StatelessWidget } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { MouseRegion } from "./mouse-region.js";

// ════════════════════════════════════════════════════
//  GestureDetector
// ════════════════════════════════════════════════════

/** GestureDetector 构造函数参数。 */
interface GestureDetectorArgs {
  /** 可选标识键 */
  key?: Key;
  /** 点击回调 */
  onTap?: () => void;
  /** 可选子 Widget */
  child?: WidgetInterface;
}

/**
 * GestureDetector Widget。
 *
 * 逆向: amp 中无独立 GestureDetector，Flitter 封装为便捷 Widget
 *
 * 将 onTap 映射到 MouseRegion 的 onClick 回调。
 * 后续可扩展 onDoubleTap、onLongPress 等高级手势。
 */
export class GestureDetector extends StatelessWidget {
  /** 点击回调 */
  readonly onTap: (() => void) | undefined;
  /** 子 Widget */
  readonly child: WidgetInterface | undefined;

  /**
   * 创建 GestureDetector Widget。
   *
   * @param args - 配置参数
   */
  constructor(args?: GestureDetectorArgs) {
    super({ key: args?.key });
    this.onTap = args?.onTap;
    this.child = args?.child;
  }

  /**
   * 构建子 Widget 树。
   *
   * 将 onTap 映射为 MouseRegion 的 onClick。
   *
   * @param _context - 构建上下文（当前未使用）
   * @returns MouseRegion Widget 实例
   */
  build(_context: BuildContext): WidgetInterface {
    return new MouseRegion({
      onClick: this.onTap ? () => this.onTap!() : undefined,
      child: this.child,
    }) as unknown as WidgetInterface;
  }
}
