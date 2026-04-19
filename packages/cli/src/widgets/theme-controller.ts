/**
 * ThemeController — 通过 InheritedWidget 注入主题数据。
 *
 * {@link ThemeController} 继承 {@link InheritedWidget}，持有 {@link ThemeData}，
 * 提供 {@link ThemeController.of} 静态方法让子 Widget 从上下文获取主题。
 *
 * Now wired to {@link ThemeRegistry} for live theme switching. When a config
 * change on `terminal.theme` is detected, consumers can call
 * {@link ThemeController.fromRegistry} to build a ThemeData from a registered
 * ThemeSpec, and rebuild the widget tree with the new ThemeController.
 *
 * 逆向参考: _70.themeController (html-sanitizer-repl.js ~1340)
 * 逆向: modules/2652_unknown_yp.js — zD0 theme lookup, $R.of(T) theme access
 * 逆向: chunk-006.js:24325 — Z0.of(T).colorScheme for palette access
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

import { InheritedWidget, ThemeRegistry } from "@flitter/tui";
import type { Widget, Element, ThemeSpec, ColorPalette } from "@flitter/tui";

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
//  默认主题数据
// ════════════════════════════════════════════════════

/**
 * 默认主题数据常量。
 *
 * Catppuccin Mocha 风格的暗色方案，与 @flitter/tui theme.ts defaultTheme 一致。
 * 在无外部配置时作为 ThemeController 的默认值使用。
 */
export const defaultThemeData: ThemeData = {
  name: "default",
  primary: "#7C3AED",
  secondary: "#06B6D4",
  surface: "#1E1E2E",
  background: "#11111B",
  error: "#F38BA8",
  text: "#CDD6F4",
  mutedText: "#6C7086",
  border: "#45475A",
  accent: "#F5C2E7",
  success: "#A6E3A1",
  warning: "#F9E2AF",
};

// ════════════════════════════════════════════════════
//  ThemeController InheritedWidget
// ════════════════════════════════════════════════════

/**
 * 通过 InheritedWidget 机制向子树注入主题数据。
 *
 * 消费侧通过 {@link ThemeController.of} 获取最近祖先的 ThemeData，
 * 当 ThemeData 引用变化时自动触发依赖方重建。
 *
 * Now supports live theme switching via {@link ThemeRegistry}:
 * - {@link ThemeController.fromRegistry} converts a ThemeSpec name to ThemeData
 * - {@link ThemeController.maybeOf} returns null instead of throwing
 *
 * 逆向: $R.of(T) at chunk-006.js — returns app theme data from context
 * 逆向: zD0(name) at modules/2652_unknown_yp.js — theme lookup by name
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
   * Shared ThemeRegistry instance for all ThemeController lookups.
   * 逆向: drT + qJT at modules/1472_tail_anonymous.js:5660 — singleton registry
   */
  private static _registry: ThemeRegistry = new ThemeRegistry();

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

  /**
   * 从上下文获取最近祖先的 ThemeData，未找到时返回 null。
   *
   * 逆向: amp's nullable theme access pattern — some widgets fall back gracefully
   *
   * @param context - 当前元素 (构建上下文)
   * @returns ThemeData or null if not in tree
   */
  static maybeOf(context: Element): ThemeData | null {
    const element = context.dependOnInheritedWidgetOfExactType(ThemeController);
    if (!element) {
      return null;
    }
    return (element.widget as ThemeController).data;
  }

  /**
   * Access the shared ThemeRegistry.
   *
   * 逆向: zD0/KIT at modules/2652_unknown_yp.js — global registry access
   */
  static get registry(): ThemeRegistry {
    return ThemeController._registry;
  }

  /**
   * Replace the shared ThemeRegistry (for testing or custom setups).
   */
  static set registry(r: ThemeRegistry) {
    ThemeController._registry = r;
  }

  /**
   * Convert a ColorPalette to a ThemeData (flat hex-string interface).
   *
   * 逆向: The bridge between chunk-006.js palette objects (Color instances)
   * and ThemeController's string-based ThemeData. In amp, Z0.of(T).colorScheme
   * returns a palette while $R.of(T).app returns string colors. This method
   * bridges the two.
   *
   * @param name - theme name
   * @param palette - ColorPalette from ThemeSpec.buildPalette()
   * @returns ThemeData with hex string colors
   */
  static paletteToThemeData(name: string, palette: ColorPalette): ThemeData {
    return {
      name,
      primary: palette.primary.toHex(),
      secondary: palette.secondary.toHex(),
      surface: palette.background.toHex(),
      background: palette.background.toHex(),
      error: palette.destructive.toHex(),
      text: palette.foreground.toHex(),
      mutedText: palette.mutedForeground.toHex(),
      border: palette.border.toHex(),
      accent: palette.accent.toHex(),
      success: palette.success.toHex(),
      warning: palette.warning.toHex(),
    };
  }

  /**
   * Build a ThemeData from the registry by theme name.
   *
   * Lookup order matches amp's zD0:
   *   1. Custom themes (drT.get)
   *   2. Built-in themes (qJT.find)
   *   3. Fallback to terminal/default theme
   *
   * 逆向: zD0(T) at modules/2652_unknown_yp.js:1-4
   *
   * @param themeName - name of the theme to look up
   * @returns ThemeData built from the matching ThemeSpec's palette
   */
  static fromRegistry(themeName: string): ThemeData {
    const registry = ThemeController._registry;
    const spec: ThemeSpec | null = registry.get(themeName);
    if (spec) {
      const palette = spec.buildPalette();
      return ThemeController.paletteToThemeData(spec.name, palette);
    }
    // 逆向: fallback to default (WJT/terminal) when name not found
    const defaultSpec = registry.getDefault();
    const palette = defaultSpec.buildPalette();
    return ThemeController.paletteToThemeData(defaultSpec.name, palette);
  }
}
