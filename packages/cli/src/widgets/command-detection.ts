/**
 * CommandDetection — Shell 命令前缀检测。
 *
 * 检测输入文本是否以 "$" 或 "$$" 开头，表示 shell 模式:
 * - "$" 前缀: 普通 shell 模式 (可见的命令执行)
 * - "$$" 前缀: 隐藏 shell 模式 (incognito, 不记录到线程)
 * - 无前缀: 普通聊天模式
 *
 * 逆向参考:
 * - 前缀检测: YP 函数 (modules/2725_unknown_YP.js:5-15)
 *     if (T.startsWith("$$")) → { cmd, visibility: "hidden" }
 *     if (T.startsWith("$"))  → { cmd, visibility: "visible" }
 *     else → null
 * - 边框颜色: MN0 函数 (modules/2725_unknown_YP.js:1-4)
 *     hidden → shellModeHidden (mutedForeground)
 *     visible → shellMode (primary)
 * - 颜色映射 (chunk-004.js:29558): shellMode = T.primary (#7aa2f7)
 * - 颜色映射 (chunk-004.js:29559): shellModeHidden = T.mutedForeground (#565f89)
 * - 状态监听: k8R.textChangeListener (chunk-006.js:31465-31468)
 *     在每次文本变更时检测前缀, 如果 visibility 变化则 setState
 *
 * @module command-detection
 *
 * @example
 * ```ts
 * const result = detectShellCommand("$ ls -la");
 * // { cmd: "ls -la", visibility: "visible" }
 *
 * const hidden = detectShellCommand("$$ curl api.example.com");
 * // { cmd: "curl api.example.com", visibility: "hidden" }
 *
 * const none = detectShellCommand("hello world");
 * // null
 * ```
 */

import { Color, TextStyle } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Slash command parsing
// ════════════════════════════════════════════════════

/**
 * Parsed /slash command.
 * 逆向: ef class trigger in PZT (1472_tui_components/actions_intents.js)
 */
export interface CommandInput {
  command: string;
  args: string;
}

/**
 * Parse a slash command from user input.
 * Returns null if the input is not a command.
 *
 * 逆向: ZgT help table showing "/" triggers.
 */
export function parseCommandInput(text: string): CommandInput | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const withoutSlash = trimmed.slice(1);
  const spaceIndex = withoutSlash.indexOf(" ");

  if (spaceIndex === -1) {
    return { command: withoutSlash, args: "" };
  }

  return {
    command: withoutSlash.slice(0, spaceIndex),
    args: withoutSlash.slice(spaceIndex + 1).trim(),
  };
}

// ════════════════════════════════════════════════════
//  Shell 可见性常量
// ════════════════════════════════════════════════════

/**
 * Shell 命令可见性类型。
 *
 * 逆向: VrT = "visible", ex = "hidden" (chunk-004.js 上下文中的常量)
 */
export type ShellVisibility = "visible" | "hidden";

/**
 * Shell 命令检测结果。
 */
export interface ShellCommandResult {
  /** 提取的命令文本 (去掉前缀, trim 后) */
  cmd: string;
  /** 可见性: "visible" (单 $) 或 "hidden" (双 $$) */
  visibility: ShellVisibility;
}

// ════════════════════════════════════════════════════
//  颜色常量 (Tokyo Night 调色板)
// ════════════════════════════════════════════════════

/**
 * Shell 模式边框颜色 — primary (blue)。
 *
 * 逆向: shellMode = T.primary → LT.blue (indexed 4)
 */
export const SHELL_MODE_COLOR = Color.indexed(4);

/**
 * 隐藏 Shell 模式边框颜色 — mutedForeground。
 *
 * 逆向: shellModeHidden = T.mutedForeground → default (dim handled at usage site)
 */
export const SHELL_MODE_HIDDEN_COLOR = Color.default();

/**
 * Shell 模式前缀的自动空格间距。
 *
 * 逆向: YTR 函数 (modules/2726_unknown_YTR.js:21) — spacing: 1
 * 当输入以 $/$$ 开头时，视觉上自动在 $ 和命令之间添加一个空格。
 */
export const SHELL_PROMPT_SPACING = 1;

// ════════════════════════════════════════════════════
//  Shell Prompt 渲染辅助
// ════════════════════════════════════════════════════

/**
 * Shell Prompt 检测结果（用于渲染）。
 *
 * 逆向: YTR 函数返回的 prompt rule 结构 (modules/2726_unknown_YTR.js)。
 */
export interface ShellPromptInfo {
  /** 前缀文本: "$" 或 "$$" */
  prefix: string;
  /** 前缀长度 (1 或 2) */
  prefixLength: number;
  /** 可见性 */
  visibility: ShellVisibility;
  /** 前缀的文本样式（带颜色） */
  prefixStyle: TextStyle;
  /** 命令文本（去掉前缀后的部分） */
  command: string;
}

/**
 * 获取 shell prompt 信息，用于渲染时着色和自动空格。
 *
 * 逆向: YTR 函数 (modules/2726_unknown_YTR.js) — 定义了 shell prompt 的显示规则:
 * - match: e.startsWith("$") / e.startsWith("$$")
 * - display: "$" / "$$"
 * - style: color = shellMode / shellModeHidden
 * - spacing: 1 (自动添加一个空格)
 * - concealPrefix: true
 *
 * @param text - 输入文本
 * @returns ShellPromptInfo 或 null（非 shell 模式）
 */
export function getShellPromptInfo(text: string): ShellPromptInfo | null {
  if (text.startsWith("$$")) {
    return {
      prefix: "$$",
      prefixLength: 2,
      visibility: "hidden",
      prefixStyle: new TextStyle({ foreground: SHELL_MODE_HIDDEN_COLOR, dim: true }),
      command: text.slice(2),
    };
  }
  if (text.startsWith("$")) {
    return {
      prefix: "$",
      prefixLength: 1,
      visibility: "visible",
      prefixStyle: new TextStyle({ foreground: SHELL_MODE_COLOR }),
      command: text.slice(1),
    };
  }
  return null;
}

/**
 * 计算视觉光标位置（考虑 shell prompt 的自动空格）。
 *
 * 当输入以 $/$$ 开头时，amp 在渲染时会在 prefix 后自动添加一个 spacing 空格，
 * 但实际文本中没有这个空格。所以光标位置需要映射：
 * - 光标在 prefix 内: 视觉位置 = 实际位置
 * - 光标在 prefix 后: 视觉位置 = 实际位置 + SHELL_PROMPT_SPACING
 *
 * 逆向: L1T._paintSingleLineText 中的 A += o.spacing ?? 0 (chunk-006.js:5156)
 *
 * @param cursorPos - 实际光标位置
 * @param promptInfo - shell prompt 信息
 * @returns 视觉光标位置
 */
export function getVisualCursorPosition(
  cursorPos: number,
  promptInfo: ShellPromptInfo | null,
): number {
  if (!promptInfo) return cursorPos;
  // 光标严格在 prefix 内时: 视觉位置 = 实际位置
  // 光标在 prefix 末尾或之后时: 视觉位置 = 实际位置 + spacing
  if (cursorPos < promptInfo.prefixLength) return cursorPos;
  return cursorPos + SHELL_PROMPT_SPACING;
}

// ════════════════════════════════════════════════════
//  检测函数
// ════════════════════════════════════════════════════

/**
 * 检测文本是否为 shell 命令。
 *
 * 匹配 amp 的 YP 函数行为:
 * 1. "$$" 前缀 → hidden visibility + cmd = 去掉 "$$" 后 trim
 * 2. "$" 前缀 → visible + cmd = 去掉 "$" 后 trim
 * 3. 其他 → null
 *
 * 注意: "$$" 必须在 "$" 之前检查, 因为 "$$" 也 startsWith "$"。
 *
 * @param text - 输入文本
 * @returns 检测结果, 或 null 表示非 shell 命令
 */
export function detectShellCommand(text: string): ShellCommandResult | null {
  if (text.startsWith("$$")) {
    return {
      cmd: text.slice(2).trim(),
      visibility: "hidden",
    };
  }
  if (text.startsWith("$")) {
    return {
      cmd: text.slice(1).trim(),
      visibility: "visible",
    };
  }
  return null;
}

/**
 * 获取 shell 模式对应的边框颜色。
 *
 * 逆向: MN0 函数 (modules/2725_unknown_YP.js:1-4)
 *   hidden → shellModeHidden
 *   visible → shellMode
 *
 * @param visibility - shell 可见性
 * @returns 对应的 Color
 */
export function getShellModeBorderColor(visibility: ShellVisibility): Color {
  return visibility === "hidden" ? SHELL_MODE_HIDDEN_COLOR : SHELL_MODE_COLOR;
}
