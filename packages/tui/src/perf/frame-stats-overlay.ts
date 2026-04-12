/**
 * 性能指标叠加层渲染器。
 *
 * {@link FrameStatsOverlay} 在 Screen 上直接绘制 "Gotta Go Fast" 性能面板，
 * 不经过 Widget 树，不影响帧性能指标的准确性。
 *
 * 面板固定尺寸 34x14，显示 Key/Mouse/Build/Layout/Paint/Render/Frame/Repaint/Bytes
 * 的 Last/P95/P99 值，并根据帧预算进行颜色编码:
 * - 正常: foreground 色
 * - >= 70% 帧预算: warning 色 (黄色)
 * - >= 100% 帧预算: destructive 色 (红色)
 *
 * @example
 * ```ts
 * const overlay = new FrameStatsOverlay();
 * overlay.toggle(); // 显示
 * overlay.draw(screen, tracker);
 * ```
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import { Cell } from "../screen/cell.js";
import { TextStyle } from "../screen/text-style.js";
import { Color } from "../screen/color.js";
import type { PerformanceTracker } from "./performance-tracker.js";

/**
 * FrameStatsOverlay 选项。
 */
export interface FrameStatsOverlayOptions {
  /** 帧预算 (ms)，默认 16.67 (~60fps) */
  frameBudgetMs?: number;
}

/**
 * 性能指标叠加层。
 *
 * 直接在 Screen buffer 上绘制，不走 Widget 树，
 * 由 WidgetsBinding.drawFrame() 最后一步调用。
 */
export class FrameStatsOverlay {
  /** 是否可见 */
  private _visible: boolean = false;
  /** 帧预算 (ms) */
  private _frameBudgetMs: number;

  /** 面板宽度 (字符) */
  readonly WIDTH = 34;
  /** 面板高度 (行) */
  readonly HEIGHT = 14;

  // ── 颜色主题 (简化版，对应逆向 Gt.default().colorScheme) ──

  /** 边框色 (暗灰) */
  private readonly _borderColor: Color = Color.brightBlack();
  /** 前景色 (正常) */
  private readonly _foregroundColor: Color = Color.white();
  /** 警告色 (黄) */
  private readonly _warningColor: Color = Color.yellow();
  /** 危险色 (红) */
  private readonly _destructiveColor: Color = Color.red();

  constructor(options?: FrameStatsOverlayOptions) {
    this._frameBudgetMs = options?.frameBudgetMs ?? 16.67;
  }

  /** 面板是否可见 */
  get visible(): boolean {
    return this._visible;
  }

  /** 切换可见性 */
  toggle(): void {
    this._visible = !this._visible;
  }

  /** 显示面板 */
  show(): void {
    this._visible = true;
  }

  /** 隐藏面板 */
  hide(): void {
    this._visible = false;
  }

  /**
   * 在 Screen 上直接绘制性能面板。
   *
   * 不走 Widget 树，由 WidgetsBinding.drawFrame() 最后一步调用。
   *
   * @param screen - 屏幕缓冲区
   * @param tracker - 性能数据采样器
   */
  draw(screen: Screen, tracker: PerformanceTracker): void {
    if (!this._visible) return;

    const w = screen.width;
    const h = screen.height;
    const panelX = w - this.WIDTH - 2;
    const panelY = 1;

    // 屏幕太小不绘制
    if (panelX < 0 || panelY + this.HEIGHT >= h) return;

    const borderColor = this._borderColor;
    const fgColor = this._foregroundColor;
    const warningColor = this._warningColor;

    // ── 绘制边框 ──

    // 顶行
    this._drawChar(screen, panelX, panelY, "╭", fgColor);
    for (let i = 1; i < this.WIDTH - 1; i++) {
      this._drawChar(screen, panelX + i, panelY, "─", fgColor);
    }
    this._drawChar(screen, panelX + this.WIDTH - 1, panelY, "╮", fgColor);

    // 标题 " Gotta Go Fast " 嵌入顶行
    const title = " Gotta Go Fast ";
    const titleOffset = Math.floor((this.WIDTH - title.length) / 2);
    for (let i = 0; i < title.length; i++) {
      this._drawChar(screen, panelX + titleOffset + i, panelY, title[i]!, warningColor);
    }

    // 中间行: 左右边框 + 空白填充
    for (let row = 1; row < this.HEIGHT - 1; row++) {
      this._drawChar(screen, panelX, panelY + row, "│", fgColor);
      this._drawChar(screen, panelX + this.WIDTH - 1, panelY + row, "│", fgColor);
      for (let col = 1; col < this.WIDTH - 1; col++) {
        this._drawChar(screen, panelX + col, panelY + row, " ", fgColor);
      }
    }

    // 底行
    this._drawChar(screen, panelX, panelY + this.HEIGHT - 1, "╰", fgColor);
    for (let i = 1; i < this.WIDTH - 1; i++) {
      this._drawChar(screen, panelX + i, panelY + this.HEIGHT - 1, "─", fgColor);
    }
    this._drawChar(screen, panelX + this.WIDTH - 1, panelY + this.HEIGHT - 1, "╯", fgColor);

    // ── 绘制数据行 ──

    const contentX = panelX + 1;
    let rowY = panelY + 1;

    // 列标题
    this._drawText(screen, contentX, rowY++, "          Last    P95    P99", borderColor);

    // Key 行
    this._drawDataRow(screen, contentX, rowY++, "Key", tracker, {
      last: tracker.getKeyEventLast(),
      p95: tracker.getKeyEventP95(),
      p99: tracker.getKeyEventP99(),
      type: "ms",
      labelColor: borderColor,
    });

    // Mouse 行
    this._drawDataRow(screen, contentX, rowY++, "Mouse", tracker, {
      last: tracker.getMouseEventLast(),
      p95: tracker.getMouseEventP95(),
      p99: tracker.getMouseEventP99(),
      type: "ms",
      labelColor: borderColor,
    });

    // 空行
    rowY++;

    // Build/Layout/Paint/Render 行
    for (const phase of ["build", "layout", "paint", "render"] as const) {
      const label = phase.charAt(0).toUpperCase() + phase.slice(1);
      this._drawDataRow(screen, contentX, rowY++, label, tracker, {
        last: tracker.getPhaseLast(phase),
        p95: tracker.getPhaseP95(phase),
        p99: tracker.getPhaseP99(phase),
        type: "ms",
        labelColor: borderColor,
      });
    }

    // 空行
    rowY++;

    // Frame 行
    this._drawDataRow(screen, contentX, rowY++, "Frame", tracker, {
      last: tracker.getFrameLast(),
      p95: tracker.getFrameP95(),
      p99: tracker.getFrameP99(),
      type: "ms",
      labelColor: fgColor,
    });

    // Repaint 行
    this._drawDataRow(screen, contentX, rowY++, "Repaint", tracker, {
      last: tracker.getRepaintLast(),
      p95: tracker.getRepaintP95(),
      p99: tracker.getRepaintP99(),
      type: "percent",
      labelColor: fgColor,
    });

    // Bytes 行
    this._drawDataRow(screen, contentX, rowY, "Bytes", tracker, {
      last: tracker.getBytesLast(),
      p95: tracker.getBytesP95(),
      p99: tracker.getBytesP99(),
      type: "bytes",
      labelColor: fgColor,
    });
  }

  /**
   * 根据时间值返回颜色 (对应逆向 getTimingColor)。
   *
   * - >= frameBudgetMs: destructive (红)
   * - >= 70% frameBudgetMs: warning (黄)
   * - 其他: foreground (白)
   */
  getTimingColor(value: number): Color {
    if (value >= this._frameBudgetMs) return this._destructiveColor;
    if (value >= this._frameBudgetMs * 0.7) return this._warningColor;
    return this._foregroundColor;
  }

  /**
   * 根据百分比值返回颜色 (对应逆向 getPercentColor)。
   *
   * - >= 50%: destructive (红)
   * - >= 20%: warning (黄)
   * - 其他: foreground (白)
   */
  getPercentColor(value: number): Color {
    if (value >= 50) return this._destructiveColor;
    if (value >= 20) return this._warningColor;
    return this._foregroundColor;
  }

  /**
   * 格式化数值为固定宽度字符串。
   *
   * - ms: 保留 2 位小数, 右对齐 5 字符, 如 " 1.23"
   * - percent: 保留 1 位小数 + %, 右对齐 5 字符, 如 " 5.3%"
   * - bytes: k 后缀, 右对齐 5 字符, 如 " 1.2k" 或 "  15k"
   *
   * @param value - 数值
   * @param type - 格式类型
   * @returns 固定宽度字符串
   */
  formatValue(value: number, type: "ms" | "percent" | "bytes"): string {
    switch (type) {
      case "ms":
        return value.toFixed(2).padStart(5, " ");
      case "percent":
        return `${value.toFixed(1)}%`.padStart(5, " ");
      case "bytes":
        return this._formatBytes(value).padStart(5, " ");
    }
  }

  // ── 私有方法 ──────────────────────────────────────

  /**
   * 格式化字节数 (对应逆向 formatBytes)。
   *
   * - >= 10000: 整数 k, 如 "15k"
   * - >= 1000: 1 位小数 k, 如 "1.5k"
   * - 其他: 整数, 如 "500"
   */
  private _formatBytes(value: number): string {
    if (value >= 10000) return `${Math.round(value / 1000)}k`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return `${Math.round(value)}`;
  }

  /**
   * 绘制一行 Last/P95/P99 数据。
   */
  private _drawDataRow(
    screen: Screen,
    x: number,
    y: number,
    label: string,
    _tracker: PerformanceTracker,
    data: {
      last: number;
      p95: number;
      p99: number;
      type: "ms" | "percent" | "bytes";
      labelColor: Color;
    }
  ): void {
    const paddedLabel = ` ${label.padStart(7, " ")} `;
    let col = x;

    // 标签
    this._drawText(screen, col, y, paddedLabel, data.labelColor);
    col += paddedLabel.length;

    // Last
    const lastStr = this.formatValue(data.last, data.type);
    const lastColor = data.type === "bytes" ? this._foregroundColor
      : data.type === "percent" ? this.getPercentColor(data.last)
      : this.getTimingColor(data.last);
    this._drawText(screen, col, y, lastStr, lastColor);
    col += lastStr.length;

    // 间距
    this._drawText(screen, col, y, "   ", data.labelColor);
    col += 3;

    // P95
    const p95Str = this.formatValue(data.p95, data.type);
    const p95Color = data.type === "bytes" ? this._foregroundColor
      : data.type === "percent" ? this.getPercentColor(data.p95)
      : this.getTimingColor(data.p95);
    this._drawText(screen, col, y, p95Str, p95Color);
    col += p95Str.length;

    // 间距
    this._drawText(screen, col, y, "   ", data.labelColor);
    col += 3;

    // P99
    const p99Str = this.formatValue(data.p99, data.type);
    const p99Color = data.type === "bytes" ? this._foregroundColor
      : data.type === "percent" ? this.getPercentColor(data.p99)
      : this.getTimingColor(data.p99);
    this._drawText(screen, col, y, p99Str, p99Color);
  }

  /**
   * 在 screen 上写入一个字符串。
   */
  private _drawText(screen: Screen, x: number, y: number, text: string, color: Color): void {
    const style = new TextStyle({ foreground: color });
    for (let i = 0; i < text.length; i++) {
      const cell = new Cell(text[i] || " ", style);
      screen.setCell(x + i, y, cell);
    }
  }

  /**
   * 在 screen 上写入单个字符。
   */
  private _drawChar(screen: Screen, x: number, y: number, char: string, color: Color): void {
    const style = new TextStyle({ foreground: color });
    const cell = new Cell(char, style);
    screen.setCell(x, y, cell);
  }
}
