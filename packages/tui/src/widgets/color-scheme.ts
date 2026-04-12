/**
 * 应用配色方案定义。
 *
 * {@link AppColorScheme} 封装了 TUI 应用所需的 15 种语义颜色，
 * 提供暗色默认预设、RGB 自定义构造、复制覆盖和值相等比较等能力。
 *
 * @example
 * ```ts
 * // 使用暗色默认方案
 * const scheme = AppColorScheme.default();
 *
 * // 自定义部分颜色
 * const custom = scheme.copyWith({ primary: Color.rgb(0, 120, 215) });
 * ```
 *
 * @module
 */

import { Color } from "../screen/color.js";

// ════════════════════════════════════════════════════
//  AppColorSchemeOptions 接口
// ════════════════════════════════════════════════════

/**
 * 配色方案选项接口。
 *
 * 包含 15 个语义颜色字段，用于构造 {@link AppColorScheme}。
 */
export interface AppColorSchemeOptions {
  /** 主前景色，用于普通文本 */
  foreground: Color;
  /** 弱化前景色，用于次要文本和提示 */
  mutedForeground: Color;
  /** 背景色 */
  background: Color;
  /** 光标颜色 */
  cursor: Color;
  /** 主要强调色，用于关键交互元素 */
  primary: Color;
  /** 次要强调色，用于辅助信息 */
  secondary: Color;
  /** 装饰强调色，用于特殊高亮 */
  accent: Color;
  /** 边框颜色 */
  border: Color;
  /** 成功状态色 */
  success: Color;
  /** 警告状态色 */
  warning: Color;
  /** 信息提示色 */
  info: Color;
  /** 危险/错误状态色 */
  destructive: Color;
  /** 选区高亮色 */
  selection: Color;
  /** 复制高亮色 */
  copyHighlight: Color;
  /** 表格边框色 */
  tableBorder: Color;
}

// ════════════════════════════════════════════════════
//  15 个颜色字段名
// ════════════════════════════════════════════════════

/** 所有配色方案字段名列表 */
const COLOR_FIELDS: ReadonlyArray<keyof AppColorSchemeOptions> = [
  "foreground",
  "mutedForeground",
  "background",
  "cursor",
  "primary",
  "secondary",
  "accent",
  "border",
  "success",
  "warning",
  "info",
  "destructive",
  "selection",
  "copyHighlight",
  "tableBorder",
] as const;

// ════════════════════════════════════════════════════
//  AppColorScheme 类
// ════════════════════════════════════════════════════

/**
 * 应用配色方案。
 *
 * 包含 15 个只读语义颜色属性，覆盖 TUI 应用的所有颜色需求。
 * 通过构造函数传入部分选项，未指定的字段使用 {@link Color.default}。
 */
export class AppColorScheme {
  /** 主前景色，用于普通文本 */
  readonly foreground: Color;
  /** 弱化前景色，用于次要文本和提示 */
  readonly mutedForeground: Color;
  /** 背景色 */
  readonly background: Color;
  /** 光标颜色 */
  readonly cursor: Color;
  /** 主要强调色，用于关键交互元素 */
  readonly primary: Color;
  /** 次要强调色，用于辅助信息 */
  readonly secondary: Color;
  /** 装饰强调色，用于特殊高亮 */
  readonly accent: Color;
  /** 边框颜色 */
  readonly border: Color;
  /** 成功状态色 */
  readonly success: Color;
  /** 警告状态色 */
  readonly warning: Color;
  /** 信息提示色 */
  readonly info: Color;
  /** 危险/错误状态色 */
  readonly destructive: Color;
  /** 选区高亮色 */
  readonly selection: Color;
  /** 复制高亮色 */
  readonly copyHighlight: Color;
  /** 表格边框色 */
  readonly tableBorder: Color;

  /**
   * 创建配色方案实例。
   *
   * 未在 options 中指定的字段将使用 {@link Color.default} 作为默认值。
   *
   * @param options - 部分配色选项，所有字段均可选
   */
  constructor(options: Partial<AppColorSchemeOptions>) {
    const d = Color.default();
    this.foreground = options.foreground ?? d;
    this.mutedForeground = options.mutedForeground ?? d;
    this.background = options.background ?? d;
    this.cursor = options.cursor ?? d;
    this.primary = options.primary ?? d;
    this.secondary = options.secondary ?? d;
    this.accent = options.accent ?? d;
    this.border = options.border ?? d;
    this.success = options.success ?? d;
    this.warning = options.warning ?? d;
    this.info = options.info ?? d;
    this.destructive = options.destructive ?? d;
    this.selection = options.selection ?? d;
    this.copyHighlight = options.copyHighlight ?? d;
    this.tableBorder = options.tableBorder ?? d;
  }

  /**
   * 创建暗色默认配色方案。
   *
   * 提供一套适合深色终端背景的预设颜色。
   *
   * @returns 暗色配色方案实例
   */
  static default(): AppColorScheme {
    return new AppColorScheme({
      foreground: Color.default(),
      mutedForeground: Color.brightBlack(),
      background: Color.default(),
      cursor: Color.white(),
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
    });
  }

  /**
   * 从 RGB 配置创建配色方案。
   *
   * 接收一个键值对映射，其中键为配色字段名，值为 RGB 分量对象。
   * 映射中存在的键使用 {@link Color.rgb} 创建颜色，
   * 未指定的字段使用暗色默认方案的值。
   *
   * @param config - RGB 颜色配置映射
   * @returns 新的配色方案实例
   */
  static fromRgb(
    config: Record<string, { r: number; g: number; b: number }>
  ): AppColorScheme {
    const defaults = AppColorScheme.default();
    const options: Partial<AppColorSchemeOptions> = {};
    for (const field of COLOR_FIELDS) {
      const rgb = config[field];
      if (rgb) {
        options[field] = Color.rgb(rgb.r, rgb.g, rgb.b);
      } else {
        options[field] = defaults[field];
      }
    }
    return new AppColorScheme(options);
  }

  /**
   * 创建当前方案的副本并覆盖指定字段。
   *
   * 未在 overrides 中指定的字段保留当前值。
   *
   * @param overrides - 需要覆盖的字段
   * @returns 新的配色方案实例
   */
  copyWith(overrides: Partial<AppColorSchemeOptions>): AppColorScheme {
    const options: Partial<AppColorSchemeOptions> = {};
    for (const field of COLOR_FIELDS) {
      options[field] = overrides[field] ?? this[field];
    }
    return new AppColorScheme(options);
  }

  /**
   * 值相等比较。
   *
   * 当且仅当所有 15 个颜色字段都相等时返回 true。
   *
   * @param other - 待比较的另一个配色方案
   * @returns 所有字段相等返回 true，否则返回 false
   */
  equals(other: AppColorScheme): boolean {
    for (const field of COLOR_FIELDS) {
      if (!this[field].equals(other[field])) {
        return false;
      }
    }
    return true;
  }
}
