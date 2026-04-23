/**
 * WelcomeScreen — 欢迎页面 StatelessWidget。
 *
 * 居中显示动画光球 + 帮助信息。
 * 光球使用 2D Open-Simplex Noise 驱动字符密度动画，
 * 右侧显示产品名称和快捷键提示。
 *
 * 逆向参考: chunk-006.js:15297-15313 — welcome screen widget
 *           chunk-005.js:164932-165212 — animated orb (uXT/yXT/SH)
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
  Center,
  Color,
  Column,
  RichText,
  Row,
  SizedBox,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { AnimatedOrb } from "./animated-orb.js";

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

/** foreground 色 (#a9b1d6) — 欢迎标题文本色 */
const FOREGROUND_COLOR = Color.rgb(0xa9, 0xb1, 0xd6);

/** secondary 色 (#565f89) — 帮助文本色 */
const SECONDARY_COLOR = Color.rgb(0x56, 0x5f, 0x89);

/** keybind 色 (#7aa2f7) — 快捷键文本色 */
const KEYBIND_COLOR = Color.rgb(0x7a, 0xa2, 0xf7);

/** command 色 (#9ece6a) — 命令文本色 */
const COMMAND_COLOR = Color.rgb(0x9e, 0xce, 0x6a);

// ════════════════════════════════════════════════════
//  光球尺寸 — 逆向: chunk-005.js:26479 X4=40, Y4=40
// ════════════════════════════════════════════════════

/** 光球宽度 (字符列数) */
const ORB_WIDTH = 40;
/** 光球高度 (字符行数) */
const ORB_HEIGHT = 40;

// ════════════════════════════════════════════════════
//  WelcomeScreen Widget
// ════════════════════════════════════════════════════

/**
 * WelcomeScreen — 欢迎页面 StatelessWidget。
 *
 * 居中显示动画光球和帮助提示文本。
 * 光球位于左侧，帮助文本位于右侧特定行。
 *
 * 逆向: modules/1472_tui_components/misc_utils.js:2861-2868
 * - amp: Center(Row([orb(40×40), SizedBox(w:2), SizedBox(w:50, textColumn)]))
 * - AnimatedOrb 自行管理 30fps 定时器
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
   *   Center
   *     └── Row(mainAxisSize: "min")
   *           ├── AnimatedOrb(40×40)
   *           ├── SizedBox(w:2)
   *           └── SizedBox(w:50)
   *                 └── Column(help texts)
   *
   * @param _context - 构建上下文
   * @returns Widget 树
   */
  build(_context: BuildContext): Widget {
    const productName = this.config.productName ?? "Flitter";

    // 逆向: misc_utils.js:2694-2710 — 文本样式
    const titleStyle = new TextStyle({ foreground: FOREGROUND_COLOR });
    const helpKeyStyle = new TextStyle({ foreground: KEYBIND_COLOR });
    const helpWordStyle = new TextStyle({ foreground: COMMAND_COLOR });
    const dimStyle = new TextStyle({ foreground: SECONDARY_COLOR });

    // ── Animated orb (40×40) — 逆向: misc_utils.js:2840-2860 ──
    const orb = new AnimatedOrb({
      width: ORB_WIDTH,
      height: ORB_HEIGHT,
    });

    // ── Help text column — 逆向: misc_utils.js:2720-2831 ──
    // SizedBox spacers skip rows where no help text appears
    // Help texts positioned to align with specific orb rows
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

    // 逆向: misc_utils.js:2832-2838 — text column in SizedBox(w:50)
    const textColumn = new SizedBox({
      width: 50,
      child: new Column({
        mainAxisSize: "min",
        crossAxisAlignment: "start",
        children: helpChildren,
      }),
    });

    // 逆向: misc_utils.js:2861-2868
    // Row([orb(40×40), SizedBox(w:2), textColumn(w:50)])
    const mainRow = new Row({
      mainAxisAlignment: "center",
      crossAxisAlignment: "center",
      mainAxisSize: "min",
      children: [orb, new SizedBox({ width: 2 }), textColumn],
    });

    // 逆向: misc_utils.js:2861 — N0.child(...) = Center wrapping the Row
    // Center (RenderPositionedBox) 填满父约束后居中子节点。
    return new Center({ child: mainRow });
  }
}
