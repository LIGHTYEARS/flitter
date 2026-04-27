/**
 * ShortcutsPopup — 键盘快捷键帮助弹出层 Widget。
 *
 * 显示两列快捷键表格，匹配 amp 的 shortcuts-popup 布局。
 * 可通过 OverlayEntry 作为弹出层展示，或直接作为 Widget 嵌入布局。
 *
 * 逆向参考:
 * - 快捷键数据: ZgT 数组 (modules/1472_tui_components/data_structures.js:143-197)
 *   每行包含 left { keys, description } 和 right { keys, description }
 * - 弹出层布局: tmux-capture/screens/amp/shortcuts-popup/plain-63x244.golden
 *   显示在输入框边框上方，6 行双列布局:
 *     Ctrl+O command palette    Ctrl+R prompt history
 *     $ or $$ shell commands    Ctrl+V paste images
 *     Shift+Enter newline       Ctrl+S switch modes
 *     Alt+D toggle deep...      Alt+T toggle thinking/dense view
 *     Ctrl+G edit in $EDITOR    Tab/Shift+Tab navigate messages
 *     @ / @@ mention files...   ? toggle this help
 * - 快捷键颜色: keys 使用 foreground (#c0caf5), description 使用 muted (#565f89)
 *
 * @module shortcuts-popup
 *
 * @example
 * ```ts
 * const popup = new ShortcutsPopup();
 * // 或作为 OverlayEntry 使用:
 * const entry = new OverlayEntry({
 *   builder: () => new ShortcutsPopup(),
 * });
 * overlayState.insert(entry);
 * ```
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
//  颜色常量 (terminal-indexed, matching amp)
// ════════════════════════════════════════════════════

/** foreground 色 — 快捷键文字
 * 逆向: T.foreground → terminal default */
const FG_COLOR = Color.default();

/** mutedText 色 — 描述文字
 * 逆向: T.mutedForeground → terminal default + dim */
const MUTED_COLOR = Color.default();

// ════════════════════════════════════════════════════
//  快捷键数据
// ════════════════════════════════════════════════════

/**
 * 快捷键行数据。
 *
 * 逆向: ZgT 数组中的每个元素 (data_structures.js:143)
 */
interface ShortcutRow {
  left: { keys: string; description: string };
  right: { keys: string; description: string };
}

/**
 * 快捷键列表 — 匹配 amp 的 ZgT 数组。
 *
 * 逆向: data_structures.js:143-197
 */
const SHORTCUT_ROWS: ShortcutRow[] = [
  {
    left: { keys: "Ctrl+O", description: "command palette" },
    right: { keys: "Ctrl+R", description: "prompt history" },
  },
  {
    left: { keys: "$ or $$", description: "shell commands" },
    right: { keys: "Ctrl+V", description: "paste images" },
  },
  {
    left: { keys: "Shift+Enter", description: "newline" },
    right: { keys: "Ctrl+S", description: "switch modes" },
  },
  {
    left: { keys: "Alt+D", description: "toggle deep reasoning" },
    right: { keys: "Alt+T", description: "toggle thinking/dense view" },
  },
  {
    left: { keys: "Ctrl+G", description: "edit in $EDITOR" },
    right: { keys: "Tab/Shift+Tab", description: "navigate messages" },
  },
  {
    left: { keys: "@ / @@", description: "mention files/threads" },
    right: { keys: "?", description: "toggle this help" },
  },
];

// ════════════════════════════════════════════════════
//  ShortcutsPopup Widget
// ════════════════════════════════════════════════════

/**
 * 键盘快捷键帮助弹出层 Widget。
 *
 * 渲染为两列表格：左列和右列各包含 keys (高亮) + description (暗色) 对。
 * 匹配 amp 的 shortcuts-popup 视觉布局。
 *
 * 逆向: amp 中快捷键帮助通过 "?" 触发，显示在输入框上方
 */
export class ShortcutsPopup extends StatelessWidget {
  /**
   * 构建快捷键帮助表格 Widget 树。
   *
   * 布局结构:
   *   Column [
   *     Row [ left-pair, SizedBox(gap), right-pair ]  // 每行
   *     ...
   *   ]
   *
   * @param _context - 构建上下文
   * @returns Widget 树
   */
  build(_context: BuildContext): Widget {
    const keyStyle = new TextStyle({ foreground: FG_COLOR });
    const descStyle = new TextStyle({ foreground: MUTED_COLOR, dim: true });

    const rows: Widget[] = SHORTCUT_ROWS.map((row) => {
      return new Row({
        children: [
          // 左列
          new RichText({
            text: new TextSpan({
              children: [
                new TextSpan({ text: row.left.keys, style: keyStyle }),
                new TextSpan({ text: " ", style: descStyle }),
                new TextSpan({ text: row.left.description, style: descStyle }),
              ],
            }),
          }),
          // 中间间隔
          new SizedBox({ width: 4 }),
          // 右列
          new RichText({
            text: new TextSpan({
              children: [
                new TextSpan({ text: row.right.keys, style: keyStyle }),
                new TextSpan({ text: " ", style: descStyle }),
                new TextSpan({ text: row.right.description, style: descStyle }),
              ],
            }),
          }),
        ],
      });
    });

    // ─ separator at bottom (逆向: U8R returns xR { children: [...h, i] }
    // where i is Row(Expanded(B8R(color))) — a full-width ─ horizontal rule)
    // The separator sits between the shortcuts and the text input area.
    // We render it as a RichText of ─ characters; the actual width is
    // constrained by the parent (InputField's Container wrapper).
    const separatorStyle = new TextStyle({ foreground: FG_COLOR, dim: true });
    const separator = new RichText({
      text: new TextSpan({
        text: "\u2500".repeat(200), // oversized; clipped by parent constraint
        style: separatorStyle,
      }),
      maxLines: 1,
    });

    return new Column({
      mainAxisSize: "min",
      children: [...rows, separator],
    });
  }
}

/**
 * 快捷键行数据的公开导出，供测试和扩展使用。
 */
export { SHORTCUT_ROWS, type ShortcutRow };
