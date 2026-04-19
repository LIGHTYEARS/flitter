/**
 * WelcomeScreen — 欢迎页面 StatelessWidget。
 *
 * 居中显示 ASCII art 光球 + 帮助信息。
 * 光球使用 `. : - = + *` 梯度密度字符绘制，
 * 右侧显示产品名称和快捷键提示。
 *
 * 逆向参考: chunk-006.js:15297-15313 — welcome screen widget
 *           chunk-006.js:14921-15001 — animated orb (此处使用静态 ASCII art)
 *           modules/1472_tui_components/misc_utils.js:2720-2868 — welcome screen build()
 *
 * @example
 * ```ts
 * import { WelcomeScreen } from "./welcome-screen.js";
 *
 * const welcome = new WelcomeScreen({ productName: "Flitter" });
 * ```
 *
 * @module
 */

import { StatelessWidget, Column, Row, RichText, TextSpan, SizedBox } from "@flitter/tui";
import { TextStyle } from "@flitter/tui";
import { Color } from "@flitter/tui";
import type { Widget } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  WelcomeScreenConfig 接口
// ════════════════════════════════════════════════════

/**
 * WelcomeScreen 配置。
 *
 * @property productName - 产品名称，默认 "Flitter"
 */
export interface WelcomeScreenConfig {
  /** 产品名称，默认 "Flitter" */
  productName?: string;
}

// ════════════════════════════════════════════════════
//  颜色常量 — Tokyo Night 调色板
// ════════════════════════════════════════════════════

/** mutedText 色 (#565f89) — 光球 ASCII art 字符色 */
const MUTED_TEXT_COLOR = Color.rgb(0x56, 0x5f, 0x89);

/** foreground 色 (#a9b1d6) — 欢迎标题文本色 */
const FOREGROUND_COLOR = Color.rgb(0xa9, 0xb1, 0xd6);

/** secondary 色 (#565f89) — 帮助文本色 */
const SECONDARY_COLOR = Color.rgb(0x56, 0x5f, 0x89);

/** keybind 色 (#7aa2f7) — 快捷键文本色 */
const KEYBIND_COLOR = Color.rgb(0x7a, 0xa2, 0xf7);

/** command 色 (#9ece6a) — 命令文本色 */
const COMMAND_COLOR = Color.rgb(0x9e, 0xce, 0x6a);

// ════════════════════════════════════════════════════
//  ASCII art 光球数据
// ════════════════════════════════════════════════════

/**
 * 逆向: tmux-capture/screens/amp/welcome/plain-63x244.golden
 *
 * 从 golden 文件中提取的静态 ASCII art 光球。
 * 使用 `. : - = + *` 梯度密度字符从外到内递增亮度。
 * 在非动画终端模式下，amp 回退到此静态 RichText。
 *
 * 逆向: chunk-006.js:15309-15313 — 非动画时用 RichText("Welcome to Amp")
 *       modules/1472_tui_components/misc_utils.js:2840-2860 — orb widget 或 SizedBox
 *       我们使用从 golden 截图提取的静态 ASCII art。
 */
const ORB_LINES: string[] = [
  "       .......",
  "  .....:::..........  ",
  "..::::::::::::::.......  ",
  "..:::-----------::::......  ",
  "..::--=========----::::......  ",
  "..::--===++++++===---::::......  ",
  "..:--==++++++++++==---:::.......  ",
  ".::--==++******+++==--::::.......  ",
  ".::--=+++*******++==---:::.......  ",
  "..:--==++*******+++==--:::.......  ",
  "..::--=+++******+++==--:::.......  ",
  " ..::-==+++****+++==---:::......  ",
  "  ..::-===+++++++===--:::......  ",
  "   ..::--====+=====---:::....  ",
  "    ...::----===----:::....  ",
  "       ..::::----::::....  ",
  "          ............  ",
];

/**
 * 帮助文本行在光球中的对齐位置。
 *
 * 逆向: golden 文件中帮助文本出现在 orb 的特定行旁边。
 * 格式: [orbLineIndex, text]
 * - 行 4 (0-indexed): "Welcome to {productName}"
 * - 行 7: "Ctrl+O for help"
 * - 行 10: "Use Tab/Shift+Tab to navigate to previous"
 * - 行 11: "messages to edit or restore to a previous state"
 */
const HELP_TEXT_LINES: Array<{ line: number; text: string; isTitle?: boolean }> = [
  { line: 4, text: "Welcome to {productName}", isTitle: true },
  { line: 7, text: "Ctrl+O for help" },
  { line: 10, text: "Use Tab/Shift+Tab to navigate to previous" },
  { line: 11, text: "messages to edit or restore to a previous state" },
];

// ════════════════════════════════════════════════════
//  WelcomeScreen Widget
// ════════════════════════════════════════════════════

/**
 * WelcomeScreen — 欢迎页面 StatelessWidget。
 *
 * 居中显示 ASCII art 光球和帮助提示文本。
 * 光球位于左侧，帮助文本位于右侧特定行。
 *
 * 逆向: modules/1472_tui_components/misc_utils.js:2861-2868
 * - amp 使用 Row(mainAxisAlignment: "center", children: [orb, SizedBox(w:2), textColumn])
 * - 我们使用静态 ASCII art 替代动画 orb
 */
export class WelcomeScreen extends StatelessWidget {
  /** Widget 配置 */
  readonly config: WelcomeScreenConfig;

  /**
   * 创建 WelcomeScreen。
   *
   * @param config - 欢迎屏幕配置
   */
  constructor(config?: WelcomeScreenConfig) {
    super();
    this.config = config ?? {};
  }

  /**
   * 构建子 Widget 树。
   *
   * 逆向: modules/1472_tui_components/misc_utils.js:2861-2868
   * ```js
   * return N0.child(new T0({
   *   mainAxisAlignment: "center",
   *   crossAxisAlignment: "center",
   *   mainAxisSize: "min",
   *   children: [g, new XT({ width: 2 }), v]
   * }));
   * ```
   *
   * 布局:
   *   Column(mainAxisAlignment: "center")
   *     └── for each ORB_LINES row:
   *           Row(children: [orbChars, gap, helpText?])
   *
   * @param _context - 构建上下文
   * @returns Widget 树
   */
  build(_context: BuildContext): Widget {
    const productName = this.config.productName ?? "Flitter";

    // 逆向: misc_utils.js:2694-2710 — 文本样式
    const orbStyle = new TextStyle({ foreground: MUTED_TEXT_COLOR });
    const titleStyle = new TextStyle({ foreground: FOREGROUND_COLOR });
    const helpKeyStyle = new TextStyle({ foreground: KEYBIND_COLOR });
    const helpWordStyle = new TextStyle({ foreground: COMMAND_COLOR });
    const dimStyle = new TextStyle({ foreground: SECONDARY_COLOR });

    // 构建帮助文本映射: orbLineIndex -> Widget
    const helpWidgetMap = new Map<number, Widget>();
    for (const item of HELP_TEXT_LINES) {
      const text = item.text.replace("{productName}", productName);
      if (item.isTitle) {
        // 逆向: chunk-006.js:15310 — "Welcome to Amp" 使用 foreground 色
        helpWidgetMap.set(item.line, new RichText({
          text: new TextSpan({ text, style: titleStyle }),
        }));
      } else if (text.startsWith("Ctrl+O")) {
        // 逆向: misc_utils.js:2812-2818 — "Ctrl+O" 用 keybind 色, "for" 用 dim, "help" 用 command 色
        helpWidgetMap.set(item.line, new RichText({
          text: new TextSpan({
            children: [
              new TextSpan({ text: "Ctrl+O", style: helpKeyStyle }),
              new TextSpan({ text: " for ", style: dimStyle }),
              new TextSpan({ text: "help", style: helpWordStyle }),
            ],
          }),
        }));
      } else {
        // 帮助文本使用 secondary 色
        helpWidgetMap.set(item.line, new RichText({
          text: new TextSpan({ text, style: dimStyle }),
        }));
      }
    }

    // 逆向: misc_utils.js:2861-2868 — Row([orb, SizedBox(w:2), textColumn])
    // 我们用逐行 Row 来对齐 orb 行和帮助文本行
    const rows: Widget[] = [];
    for (let i = 0; i < ORB_LINES.length; i++) {
      const orbText = ORB_LINES[i];
      const helpWidget = helpWidgetMap.get(i);

      const rowChildren: Widget[] = [
        // ASCII art 光球行
        new RichText({
          text: new TextSpan({ text: orbText, style: orbStyle }),
        }),
      ];

      if (helpWidget) {
        // 逆向: misc_utils.js:2865 — SizedBox(width: 2) 间距
        rowChildren.push(new SizedBox({ width: 6 }));
        rowChildren.push(helpWidget);
      }

      rows.push(new Row({
        mainAxisSize: "min",
        crossAxisAlignment: "center",
        children: rowChildren,
      }));
    }

    // 逆向: misc_utils.js:2861 — 外层 Row with center alignment
    // 整体用 Column 垂直居中
    return new Column({
      mainAxisAlignment: "center",
      crossAxisAlignment: "center",
      children: rows,
    });
  }
}
