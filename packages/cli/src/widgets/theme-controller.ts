/**
 * ThemeController — 通过 InheritedWidget 注入主题数据。
 *
 * {@link ThemeController} 继承 {@link InheritedWidget}，持有 {@link ThemeData}，
 * 提供 {@link ThemeController.of} 静态方法让子 Widget 从上下文获取主题。
 *
 * 替代 interactive.ts 中的 stub ThemeController 类。
 *
 * 逆向参考: _70.themeController (html-sanitizer-repl.js ~1340)
 *
 * @example
 * ```ts
 * // 在 Widget 树中包裹
 * const root = new ThemeController({ data: themeData, child: appWidget });
 *
 * // 在子 Widget 的 build 方法中获取
 * const theme = ThemeController.of(context);
 * console.log(theme.primary); // "#ff0000"
 * ```
 *
 * @module
 */

import { InheritedWidget } from "@flitter/tui";
import type { Widget, Element } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  ThemeData 接口
// ════════════════════════════════════════════════════

/**
 * 主题数据。
 *
 * 定义颜色主题的完整配色方案，包含 primary/secondary/surface 等基础色
 * 以及 error/success/warning 等语义色。
 *
 * 与现有 widgets/theme.ts 的全局 theme 对象结构兼容。
 */
export interface ThemeData {
  /** 主题名称标识 */
  name: string;
  /** 主色调 */
  primary: string;
  /** 辅助色 */
  secondary: string;
  /** 表面色 (卡片/面板背景) */
  surface: string;
  /** 全局背景色 */
  background: string;
  /** 错误色 */
  error: string;
  /** 正文文本色 */
  text: string;
  /** 次要/弱化文本色 */
  mutedText: string;
  /** 边框色 */
  border: string;
  /** 强调色 */
  accent: string;
  /** 成功色 */
  success: string;
  /** 警告色 */
  warning: string;
}

// ════════════════════════════════════════════════════
//  ThemeController InheritedWidget
// ════════════════════════════════════════════════════

/**
 * 通过 InheritedWidget 机制向子树注入主题数据。
 *
 * 消费侧通过 {@link ThemeController.of} 获取最近祖先的 ThemeData，
 * 当 ThemeData 引用变化时自动触发依赖方重建。
 *
 * @example
 * ```ts
 * // 获取主题
 * const theme = ThemeController.of(context);
 * new Text({ text: "hello", style: new TextStyle({ color: theme.primary }) });
 * ```
 */
export class ThemeController extends InheritedWidget {
  /** 当前持有的主题数据 */
  readonly data: ThemeData;

  /**
   * 创建 ThemeController 实例。
   *
   * @param opts - 配置项
   * @param opts.data - 主题数据
   * @param opts.child - 子 Widget
   */
  constructor(opts: { data: ThemeData; child: Widget }) {
    super({ child: opts.child });
    this.data = opts.data;
  }

  /**
   * 判断主题数据是否变化。
   *
   * 使用引用比较: 当 data 对象不是同一引用时返回 true，触发依赖方重建。
   *
   * @param oldWidget - 更新前的旧 ThemeController
   * @returns 数据引用不同时返回 true
   */
  updateShouldNotify(oldWidget: ThemeController): boolean {
    return this.data !== oldWidget.data;
  }

  /**
   * 从上下文获取最近祖先的 ThemeData。
   *
   * 沿元素树向上查找 ThemeController 类型的 InheritedElement，
   * 返回其持有的 ThemeData。若未找到则抛出 Error。
   *
   * @param context - 当前元素 (构建上下文)
   * @returns 最近祖先 ThemeController 的 ThemeData
   * @throws Error 当元素树中不存在 ThemeController 祖先时
   */
  static of(context: Element): ThemeData {
    const element = context.dependOnInheritedWidgetOfExactType(ThemeController);
    if (!element) {
      throw new Error("ThemeController not found in ancestor tree");
    }
    return (element.widget as ThemeController).data;
  }
}
