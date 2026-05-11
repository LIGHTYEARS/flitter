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
 * - 快捷键颜色: keys 使用 app.keybind (blue), description 使用 colorScheme.foreground (default)
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

import type { BuildContext, Element, Widget } from "@flitter/tui";
import {
  Column,
  RichText,
  StatelessWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { AppThemeController } from "./app-theme-controller.js";

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
 * 左列宽度统一为最长条目的宽度，右列紧跟其后，保证对齐。
 *
 * 逆向: amp 中快捷键帮助通过 "?" 触发，显示在输入框上方
 */
export class ShortcutsPopup extends StatelessWidget {
  build(_context: BuildContext): Widget {
    // 逆向: E0R.build() (interactive_widgets.js:1537-1560)
    //   h = new cT({ color: a.app.keybind })   — keys in keybind color (blue)
    //   c = new cT({ color: R.foreground })     — descriptions in normal foreground
    const appTheme = AppThemeController.of(_context as unknown as Element);
    const keyStyle = new TextStyle({ foreground: appTheme.keybind });
    const descStyle = new TextStyle();

    const leftTexts = SHORTCUT_ROWS.map((r) => `${r.left.keys} ${r.left.description}`);
    const maxLeftWidth = Math.max(...leftTexts.map((t) => t.length));
    const gap = 4;

    const rows: Widget[] = SHORTCUT_ROWS.map((row, i) => {
      const leftText = leftTexts[i]!;
      const padding = " ".repeat(maxLeftWidth - leftText.length + gap);

      return new RichText({
        text: new TextSpan({
          children: [
            new TextSpan({ text: row.left.keys, style: keyStyle }),
            new TextSpan({ text: ` ${row.left.description}${padding}`, style: descStyle }),
            new TextSpan({ text: row.right.keys, style: keyStyle }),
            new TextSpan({ text: ` ${row.right.description}`, style: descStyle }),
          ],
        }),
      });
    });

    // 逆向: U8R (misc_utils.js:9882-9887) — Column 末尾追加 ─ 分隔线
    const separatorStyle = new TextStyle({ foreground: appTheme.keybind, dim: true });
    const separator = new RichText({
      text: new TextSpan({ text: "─".repeat(maxLeftWidth + gap + 20), style: separatorStyle }),
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
