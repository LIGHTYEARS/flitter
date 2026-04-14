/**
 * @flitter/tui - Theme 系统。
 *
 * 主题数据定义和默认主题。
 * 运行时通过 ThemeController.of(context) 获取主题，
 * 无 Widget 上下文时 fallback 到 defaultTheme。
 *
 * Phase 12-14 迁移: 从全局变量模式迁移到 InheritedWidget 模式。
 * 不再维护全局 theme 变量，ThemeData 改为扁平化字符串色值接口，
 * 与 ThemeController (packages/cli/src/widgets/theme-controller.ts) 对齐。
 *
 * @example
 * ```ts
 * import { defaultTheme, getTheme } from "./theme.js";
 *
 * // 直接使用默认主题
 * const bg = defaultTheme.background;
 *
 * // 向后兼容的全局访问 (新代码请用 ThemeController.of(context))
 * const theme = getTheme();
 * ```
 *
 * @module
 */

// ════════════════════════════════════════════════════
//  ThemeData 接口
// ════════════════════════════════════════════════════

/**
 * 主题数据接口。
 *
 * 定义颜色主题的完整配色方案，包含 primary/secondary/surface 等基础色
 * 以及 error/success/warning 等语义色。所有颜色值为 CSS 十六进制字符串。
 *
 * 与 ThemeController (InheritedWidget) 使用的 ThemeData 接口一致。
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
//  默认主题
// ════════════════════════════════════════════════════

/**
 * 默认主题。
 *
 * 使用暗色终端配色方案，与 Catppuccin Mocha 风格对齐。
 * 此常量不可变，作为无 Widget 上下文时的 fallback 值。
 */
export const defaultTheme: ThemeData = {
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
//  向后兼容全局访问
// ════════════════════════════════════════════════════

/**
 * 获取主题 — 向后兼容的全局访问。
 *
 * 返回 defaultTheme 作为 fallback。
 * 优先从 InheritedWidget 获取 (需要 Widget context)，
 * 无 context 时返回 defaultTheme。
 *
 * @deprecated 新代码应使用 ThemeController.of(context)
 * @returns 默认主题数据
 */
export function getTheme(): ThemeData {
  return defaultTheme;
}
