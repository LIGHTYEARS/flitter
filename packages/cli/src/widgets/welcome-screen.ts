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

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  Column,
  RichText,
  Row,
  SizedBox,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

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

    // ── Orb column: all orb lines left-aligned in their own Column ──
    // This ensures the orb is a coherent block — no per-line centering jitter
    const orbWidgets: Widget[] = ORB_LINES.map(
      (line) =>
        new RichText({
          text: new TextSpan({ text: line, style: orbStyle }),
        }),
    );
    const orbColumn = new Column({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: orbWidgets,
    });

    // ── Help text column: positioned to align with specific orb lines ──
    // SizedBox spacers skip rows where no help text appears
    // Help texts at orb lines 4, 7, 10, 11
    const helpChildren: Widget[] = [];

    // Lines 0-3: empty (4 rows of spacing)
    helpChildren.push(new SizedBox({ height: 4 }));

    // Line 4: "Welcome to {productName}"
    helpChildren.push(
      new RichText({
        text: new TextSpan({
          text: `Welcome to ${productName}`,
          style: titleStyle,
        }),
      }),
    );

    // Lines 5-6: empty (2 rows)
    helpChildren.push(new SizedBox({ height: 2 }));

    // Line 7: "Ctrl+O for help"
    helpChildren.push(
      new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({ text: "Ctrl+O", style: helpKeyStyle }),
            new TextSpan({ text: " for ", style: dimStyle }),
            new TextSpan({ text: "help", style: helpWordStyle }),
          ],
        }),
      }),
    );

    // Lines 8-9: empty (2 rows)
    helpChildren.push(new SizedBox({ height: 2 }));

    // Line 10: "Use Tab/Shift+Tab to navigate to previous"
    helpChildren.push(
      new RichText({
        text: new TextSpan({
          text: "Use Tab/Shift+Tab to navigate to previous",
          style: dimStyle,
        }),
      }),
    );

    // Line 11: "messages to edit or restore to a previous state"
    helpChildren.push(
      new RichText({
        text: new TextSpan({
          text: "messages to edit or restore to a previous state",
          style: dimStyle,
        }),
      }),
    );

    const textColumn = new Column({
      mainAxisSize: "min",
      crossAxisAlignment: "start",
      children: helpChildren,
    });

    // 逆向: misc_utils.js:2861-2868
    // Row([orb, SizedBox(w:6), textColumn]) centered as a single unit
    const mainRow = new Row({
      mainAxisAlignment: "center",
      crossAxisAlignment: "start",
      mainAxisSize: "min",
      children: [orbColumn, new SizedBox({ width: 6 }), textColumn],
    });

    // 逆向: misc_utils.js:2861 — outer Column with vertical centering
    return new Column({
      mainAxisAlignment: "center",
      crossAxisAlignment: "center",
      children: [mainRow],
    });
  }
}
