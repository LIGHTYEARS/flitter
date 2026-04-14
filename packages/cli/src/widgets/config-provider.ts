/**
 * ConfigProvider — 通过 InheritedWidget 注入配置服务。
 *
 * {@link ConfigProvider} 继承 {@link InheritedWidget}，持有 configService 引用，
 * 提供 {@link ConfigProvider.of} 静态方法让子 Widget 从上下文获取配置服务。
 *
 * 替代 interactive.ts 中的 stub ConfigProvider 类。
 *
 * 逆向参考: _70.configProvider (html-sanitizer-repl.js ~1342)
 *
 * @example
 * ```ts
 * // 在 Widget 树中包裹
 * const root = new ConfigProvider({ configService, child: appWidget });
 *
 * // 在子 Widget 的 build 方法中获取
 * const config = ConfigProvider.of(context);
 * ```
 *
 * @module
 */

import { InheritedWidget } from "@flitter/tui";
import type { Widget, Element } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  ConfigProvider InheritedWidget
// ════════════════════════════════════════════════════

/**
 * 通过 InheritedWidget 机制向子树注入配置服务。
 *
 * 消费侧通过 {@link ConfigProvider.of} 获取最近祖先的 configService，
 * 当 configService 引用变化时自动触发依赖方重建。
 *
 * configService 实际类型来自 @flitter/data 的 ConfigService，
 * 此处使用 unknown 避免循环依赖。
 */
export class ConfigProvider extends InheritedWidget {
  /** 配置服务引用 (实际类型为 @flitter/data ConfigService) */
  readonly configService: unknown;

  /**
   * 创建 ConfigProvider 实例。
   *
   * @param opts - 配置项
   * @param opts.configService - 配置服务引用
   * @param opts.child - 子 Widget
   */
  constructor(opts: { configService: unknown; child: Widget }) {
    super({ child: opts.child });
    this.configService = opts.configService;
  }

  /**
   * 判断配置服务是否变化。
   *
   * 使用引用比较: 当 configService 不是同一引用时返回 true，触发依赖方重建。
   *
   * @param oldWidget - 更新前的旧 ConfigProvider
   * @returns 引用不同时返回 true
   */
  updateShouldNotify(oldWidget: ConfigProvider): boolean {
    return this.configService !== oldWidget.configService;
  }

  /**
   * 从上下文获取最近祖先的 configService。
   *
   * 沿元素树向上查找 ConfigProvider 类型的 InheritedElement，
   * 返回其持有的 configService。若未找到则抛出 Error。
   *
   * @param context - 当前元素 (构建上下文)
   * @returns 最近祖先 ConfigProvider 的 configService 引用
   * @throws Error 当元素树中不存在 ConfigProvider 祖先时
   */
  static of(context: Element): unknown {
    const element = context.dependOnInheritedWidgetOfExactType(ConfigProvider);
    if (!element) {
      throw new Error("ConfigProvider not found in ancestor tree");
    }
    return (element.widget as ConfigProvider).configService;
  }
}
