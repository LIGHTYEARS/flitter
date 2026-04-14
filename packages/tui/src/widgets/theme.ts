/**
 * 主题系统定义。
 *
 * {@link Theme} 是一个 {@link StatelessWidget}，用于向子树注入主题数据。
 * Phase 5 简化实现中使用模块级全局变量存储当前主题，
 * 后续阶段将改为基于 InheritedWidget 的上下文查找。
 *
 * @example
 * ```ts
 * // 使用暗色默认主题包裹子 Widget
 * const app = Theme.withDefault({ child: myWidget });
 *
 * // 在 build 方法中获取当前主题
 * const theme = Theme.of(context);
 * const fg = theme.colorScheme.foreground;
 * ```
 *
 * @module
 */

import { Color } from "../screen/color.js";
import { type BuildContext, StatelessWidget } from "../tree/stateless-widget.js";
import type { Key, Widget } from "../tree/widget.js";
import { AppColorScheme } from "./color-scheme.js";

// ════════════════════════════════════════════════════
//  ThemeData 接口
// ════════════════════════════════════════════════════

/**
 * 主题数据接口。
 *
 * 包含应用的完整配色方案，未来可扩展排版、间距等属性。
 */
export interface ThemeData {
  /** 配色方案 */
  readonly colorScheme: AppColorScheme;
}

// ════════════════════════════════════════════════════
//  全局主题状态
// ════════════════════════════════════════════════════

/**
 * 模块级全局主题数据。
 *
 * Phase 5 简化实现：所有 Theme.of() 调用返回此全局值。
 * 后续阶段将替换为 InheritedWidget 机制。
 */
let _globalTheme: ThemeData = { colorScheme: AppColorScheme.default() };

/**
 * 设置全局主题数据（仅供测试使用）。
 *
 * @param data - 新的主题数据
 */
export function setGlobalTheme(data: ThemeData): void {
  _globalTheme = data;
}

/**
 * 获取当前全局主题数据（仅供测试使用）。
 *
 * @returns 当前全局主题数据
 */
export function getGlobalTheme(): ThemeData {
  return _globalTheme;
}

// ════════════════════════════════════════════════════
//  Theme Widget
// ════════════════════════════════════════════════════

/**
 * 主题 Widget。
 *
 * 将 {@link ThemeData} 注入到子树中。在 {@link build} 时
 * 将自身的 data 设置为全局主题，后续子 Widget 可通过
 * {@link Theme.of} 获取主题数据。
 */
export class Theme extends StatelessWidget {
  /** 主题数据 */
  readonly data: ThemeData;
  /** 子 Widget */
  readonly child: Widget;

  /**
   * 创建 Theme 实例。
   *
   * @param options - 配置项
   * @param options.data - 主题数据
   * @param options.child - 子 Widget
   * @param options.key - 可选标识键
   */
  constructor({ data, child, key }: { data: ThemeData; child: Widget; key?: Key }) {
    super({ key });
    this.data = data;
    this.child = child;
  }

  /**
   * 从构建上下文获取当前主题数据。
   *
   * Phase 5 简化实现：忽略 context 参数，直接返回全局主题。
   * 后续阶段将通过 InheritedWidget 机制从上下文中查找。
   *
   * @param _context - 构建上下文（Phase 5 中未使用）
   * @returns 当前主题数据
   */
  static of(_context: BuildContext): ThemeData {
    return _globalTheme;
  }

  /**
   * 创建暗色默认主题数据。
   *
   * @returns 使用 {@link AppColorScheme.default} 的暗色主题数据
   */
  static dark(): ThemeData {
    return { colorScheme: AppColorScheme.default() };
  }

  /**
   * 创建亮色主题数据。
   *
   * 适合浅色终端背景的预设颜色。
   *
   * @returns 亮色主题数据
   */
  static light(): ThemeData {
    return {
      colorScheme: new AppColorScheme({
        foreground: Color.black(),
        mutedForeground: Color.brightBlack(),
        background: Color.white(),
        cursor: Color.black(),
        primary: Color.blue(),
        secondary: Color.cyan(),
        accent: Color.magenta(),
        border: Color.brightBlack(),
        success: Color.green(),
        warning: Color.yellow(),
        info: Color.cyan(),
        destructive: Color.red(),
        selection: Color.blue(),
        copyHighlight: Color.yellow(),
        tableBorder: Color.brightBlack(),
      }),
    };
  }

  /**
   * 使用暗色默认主题包裹子 Widget 的便捷工厂方法。
   *
   * @param options - 配置项
   * @param options.child - 子 Widget
   * @returns 使用暗色主题的 Theme 实例
   */
  static withDefault({ child }: { child: Widget }): Theme {
    return new Theme({ data: Theme.dark(), child });
  }

  /**
   * 构建子 Widget。
   *
   * 将自身的主题数据设置为全局主题，然后返回子 Widget。
   *
   * @param context - 构建上下文
   * @returns 子 Widget
   */
  build(_context: BuildContext): Widget {
    _globalTheme = this.data;
    return this.child;
  }
}
