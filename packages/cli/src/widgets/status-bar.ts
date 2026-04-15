/**
 * StatusBar -- 状态栏 StatelessWidget。
 *
 * 显示当前模型名称 (左对齐)、token 计数 (右对齐) 和线程 ID。
 * 单行高度，使用 mutedText 色 (#565f89) 渲染文本，
 * surface 色 (#1a1b26) 作为背景。
 *
 * 逆向参考: D-07 status bar layout
 *
 * @example
 * ```ts
 * import { StatusBar, type StatusBarConfig } from "./status-bar.js";
 *
 * const bar = new StatusBar({
 *   modelName: "claude-3.5-sonnet",
 *   tokenCount: 1234,
 *   threadId: "thread-abc",
 * });
 * ```
 *
 * @module
 */

import { StatelessWidget, Row, Expanded, SizedBox, Padding, EdgeInsets, RichText, TextSpan } from "@flitter/tui";
import { TextStyle } from "@flitter/tui";
import { Color } from "@flitter/tui";
import type { Widget } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  StatusBarConfig 接口
// ════════════════════════════════════════════════════

/**
 * StatusBar 配置。
 *
 * @property modelName - 当前使用的 LLM 模型名称
 * @property tokenCount - 当前对话的 token 消耗数
 * @property threadId - 当前线程标识
 */
export interface StatusBarConfig {
  /** 模型名称 */
  modelName: string;
  /** token 计数 */
  tokenCount: number;
  /** 线程 ID */
  threadId: string;
}

// ════════════════════════════════════════════════════
//  颜色常量
// ════════════════════════════════════════════════════

/** mutedText 色 (#565f89) */
const MUTED_TEXT_COLOR = Color.rgb(0x56, 0x5f, 0x89);

/** surface 色 (#1a1b26) -- 状态栏背景 */
const _SURFACE_COLOR = Color.rgb(0x1a, 0x1b, 0x26);

// ════════════════════════════════════════════════════
//  StatusBar Widget
// ════════════════════════════════════════════════════

/**
 * StatusBar -- 状态栏 StatelessWidget。
 *
 * 单行显示模型名称 (左) 和 token 计数 (右)。
 * 颜色: mutedText (#565f89) 文本, surface (#1a1b26) 背景。
 *
 * 逆向: D-07 状态栏布局
 */
export class StatusBar extends StatelessWidget {
  /** Widget 配置 */
  readonly config: StatusBarConfig;

  /**
   * 创建 StatusBar。
   *
   * @param config - 状态栏配置
   */
  constructor(config: StatusBarConfig) {
    super();
    this.config = config;
  }

  /**
   * 构建子 Widget 树。
   *
   * 返回 Padding > Row 结构:
   * - 左: model name (RichText, mutedText 色)
   * - 中: Expanded spacer
   * - 右: "{tokenCount} tokens" (RichText, mutedText 色)
   *
   * @param _context - 构建上下文
   * @returns Widget 树
   */
  build(_context: BuildContext): Widget {
    const mutedStyle = new TextStyle({
      foreground: MUTED_TEXT_COLOR,
    });

    return new Padding({
      padding: EdgeInsets.symmetric({ horizontal: 2 }),
      child: new Row({
        children: [
          // 左对齐: 模型名称
          new RichText({
            text: new TextSpan({
              text: this.config.modelName,
              style: mutedStyle,
            }),
          }),
          // 弹性间距
          new Expanded({
            child: new SizedBox({ width: 0, height: 1 }),
          }),
          // 右对齐: token 计数
          new RichText({
            text: new TextSpan({
              text: `${this.config.tokenCount} tokens`,
              style: mutedStyle,
            }),
          }),
        ],
      }),
    });
  }
}
