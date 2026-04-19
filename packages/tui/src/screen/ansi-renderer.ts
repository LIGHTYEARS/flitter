/**
 * ANSI 差分渲染器。
 *
 * 从 {@link Screen} 的脏标记系统读取变化区域，生成最小化的 ANSI 转义序列字符串。
 * 核心优化策略：
 * - 差分渲染只输出变化的 Cell，跳过未变化的行和列
 * - 相邻同样式 Cell 合并为一次 SGR 设置 + 连续文本输出
 * - 光标移动使用绝对定位 (CUP)
 * - 跟踪当前样式状态，使用 {@link TextStyle.diffSgr} 最小化 SGR 输出
 *
 * @example
 * ```ts
 * const screen = new Screen(80, 24);
 * const renderer = new AnsiRenderer();
 *
 * screen.writeChar(0, 0, "H", boldStyle);
 * const output = renderer.render(screen);
 * process.stdout.write(output);
 * screen.present();
 * ```
 *
 * @module
 */

import type { Screen } from "./screen.js";
import { TextStyle } from "./text-style.js";

/**
 * Color depth levels matching terminal capabilities.
 *
 * 逆向: QXR in modules/0080_unknown_QXR.js — returns 0/1/2/3 level
 * - '16': basic 16-color ANSI (level 1)
 * - '256': xterm 256-color palette (level 2)
 * - 'truecolor': 24-bit RGB (level 3)
 */
export type ColorDepth = "16" | "256" | "truecolor";

// ── ANSI 转义序列常量 ────────────────────────────────

/** Escape 字符 */
export const ESC = "\x1b";
/** Control Sequence Introducer */
export const CSI = ESC + "[";

/**
 * 光标绝对定位 (CUP)。
 *
 * 终端坐标为 1-based，内部坐标为 0-based。
 *
 * @param row - 行索引 (0-based)
 * @param col - 列索引 (0-based)
 * @returns CUP 序列
 */
export const CUP = (row: number, col: number): string => `${CSI}${row + 1};${col + 1}H`;

/** 光标右移 n 列 */
export const CUF = (n: number): string => `${CSI}${n}C`;
/** 光标左移 n 列 */
export const CUB = (n: number): string => `${CSI}${n}D`;
/** 光标上移 n 行 */
export const CUU = (n: number): string => `${CSI}${n}A`;
/** 光标下移 n 行 */
export const CUD = (n: number): string => `${CSI}${n}B`;

/** 隐藏光标 */
export const HIDE_CURSOR = `${CSI}?25l`;
/** 显示光标 */
export const SHOW_CURSOR = `${CSI}?25h`;

/** 清屏 (清除整个屏幕) */
export const CLEAR_SCREEN = `${CSI}2J`;
/** 清行 (清除整行) */
export const CLEAR_LINE = `${CSI}2K`;

/**
 * 生成 SGR (Select Graphic Rendition) 序列。
 *
 * @param params - SGR 参数
 * @returns SGR 序列字符串
 */
export const SGR = (...params: (string | number)[]): string => `${CSI}${params.join(";")}m`;

/** SGR 重置序列 */
export const SGR_RESET = `${CSI}0m`;

/** 启用备用屏幕缓冲区 */
export const ALT_SCREEN_ON = `${CSI}?1049h`;
/** 禁用备用屏幕缓冲区 */
export const ALT_SCREEN_OFF = `${CSI}?1049l`;

/** 启用鼠标追踪 (Button + Any + SGR 模式) */
export const MOUSE_ON = `${CSI}?1000h${CSI}?1003h${CSI}?1006h`;
/** 禁用鼠标追踪 */
export const MOUSE_OFF = `${CSI}?1000l${CSI}?1003l${CSI}?1006l`;

/** 启用 Bracketed Paste 模式 */
export const PASTE_ON = `${CSI}?2004h`;
/** 禁用 Bracketed Paste 模式 */
export const PASTE_OFF = `${CSI}?2004l`;

// ── AnsiRenderer ──────────────────────────────────────

/**
 * ANSI 差分渲染器。
 *
 * 将 {@link Screen} 的变化区域转换为最小化的 ANSI 转义序列输出字符串。
 * 渲染输出是纯字符串，不直接写入 stdout——由上层 TUI 主循环决定何时输出。
 *
 * Supports color depth branching:
 * - truecolor: \x1b[38;2;R;G;Bm (default, current behavior)
 * - 256-color: converts RGB to nearest xterm-256 palette index, \x1b[38;5;Nm
 * - 16-color: converts to nearest ANSI color, \x1b[3Nm
 *
 * 逆向: Color depth branching adapts rendering to terminal capabilities
 * detected by QXR in modules/0080_unknown_QXR.js.
 */
export class AnsiRenderer {
  /**
   * Color depth for rendering. Defaults to 'truecolor' (no downgrade).
   * Set via setColorDepth() based on TerminalCapabilities.colorDepth.
   */
  private colorDepth: ColorDepth = "truecolor";

  /**
   * Set the color depth for rendering.
   *
   * 逆向: amp adapts rendering based on detected color depth from QXR.
   *
   * @param depth - target color depth
   */
  setColorDepth(depth: ColorDepth): void {
    this.colorDepth = depth;
  }

  /**
   * Get current color depth.
   */
  getColorDepth(): ColorDepth {
    return this.colorDepth;
  }
  /**
   * 从 Screen 生成差分 ANSI 输出。
   *
   * 如果 {@link Screen.needsFullRefresh} 为 true，则执行全屏刷新；
   * 否则仅输出脏区域中变化的 Cell。
   *
   * @param screen - 屏幕实例
   * @returns ANSI 转义序列字符串
   */
  render(screen: Screen): string {
    if (screen.needsFullRefresh) {
      return this.renderFull(screen);
    }
    return this.renderDiff(screen);
  }

  /**
   * 生成全屏刷新 ANSI 输出。
   *
   * 清屏后逐行逐列输出所有非 EMPTY 的 Cell，合并相邻同样式 Cell。
   *
   * @param screen - 屏幕实例
   * @returns ANSI 转义序列字符串
   */
  renderFull(screen: Screen): string {
    const parts: string[] = [];
    parts.push(HIDE_CURSOR);
    parts.push(CUP(0, 0));
    parts.push(CLEAR_SCREEN);

    let currentStyle = TextStyle.NORMAL;
    let needsReset = false;

    for (let y = 0; y < screen.height; y++) {
      let lineHasContent = false;
      let lastX = -1;

      for (let x = 0; x < screen.width; x++) {
        const cell = screen.back.getCell(x, y);

        // 跳过续位占位符 (width=0)
        if (cell.width === 0) continue;

        // 跳过 EMPTY Cell (空格 + 默认样式)
        if (cell.equals(emptyCell)) continue;

        // 移动光标到此位置
        if (!lineHasContent || x !== lastX) {
          parts.push(CUP(y, x));
        }

        // 样式处理 — color-depth-aware SGR
        const sgrDiff = cell.style.diffSgrAt(currentStyle, this.colorDepth);
        if (sgrDiff) {
          parts.push(`${CSI}${sgrDiff}m`);
          currentStyle = cell.style;
          needsReset = true;
        } else if (!currentStyle.equals(cell.style)) {
          // diffSgrAt 返回空但样式不同——只有 equals 返回 true 才会空，这里做安全检查
          const sgr = cell.style.toSgrAt(this.colorDepth);
          if (sgr) {
            parts.push(`${CSI}0;${sgr}m`);
          } else {
            parts.push(SGR_RESET);
          }
          currentStyle = cell.style;
          needsReset = true;
        }

        parts.push(cell.char);
        lineHasContent = true;
        lastX = x + (cell.width === 2 ? 2 : 1);
      }
    }

    // 重置样式
    if (needsReset) {
      parts.push(SGR_RESET);
    }

    // 渲染光标
    parts.push(this.renderCursor(screen));

    return parts.join("");
  }

  /**
   * 生成光标位置/可见性控制序列。
   *
   * @param screen - 屏幕实例
   * @returns ANSI 光标控制序列
   */
  renderCursor(screen: Screen): string {
    if (screen.cursorVisible && screen.cursorPosition) {
      return SHOW_CURSOR + CUP(screen.cursorPosition.y, screen.cursorPosition.x);
    }
    return HIDE_CURSOR;
  }

  /**
   * 生成差分 ANSI 输出——仅输出脏区域中变化的 Cell。
   *
   * @internal
   */
  private renderDiff(screen: Screen): string {
    const dirtyRegions = screen.getDirtyRegions();
    if (dirtyRegions.length === 0) {
      // 即使无脏区域，也可能需要更新光标
      return this.renderCursor(screen);
    }

    const parts: string[] = [];
    parts.push(HIDE_CURSOR);

    let currentStyle = TextStyle.NORMAL;
    let cursorRow = -1;
    let cursorCol = -1;
    let needsReset = false;

    for (const region of dirtyRegions) {
      const { y, cells } = region;

      for (let i = 0; i < cells.length; i++) {
        const { x, cell } = cells[i];

        // 跳过续位占位符 (width=0)
        if (cell.width === 0) continue;

        // 移动光标——如果不在预期位置则使用 CUP
        if (cursorRow !== y || cursorCol !== x) {
          parts.push(CUP(y, x));
          cursorRow = y;
          cursorCol = x;
        }

        // 样式处理 — color-depth-aware SGR
        const sgrDiff = cell.style.diffSgrAt(currentStyle, this.colorDepth);
        if (sgrDiff) {
          parts.push(`${CSI}${sgrDiff}m`);
          currentStyle = cell.style;
          needsReset = true;
        }

        // 输出字符
        parts.push(cell.char);
        cursorCol += cell.width === 2 ? 2 : 1;
      }
    }

    // 重置样式
    if (needsReset) {
      parts.push(SGR_RESET);
    }

    // 渲染光标
    parts.push(this.renderCursor(screen));

    return parts.join("");
  }
}

// 缓存 Cell.EMPTY 引用以避免循环导入问题
import { Cell } from "./cell.js";

const emptyCell = Cell.EMPTY;
