/**
 * CommandPaletteWidget -- 斜杠命令面板浮动覆盖层。
 *
 * 当用户在输入框键入 "/" 时，显示一个居中的模糊搜索命令面板。
 * 面板包含:
 * - 标题 "Command Palette"
 * - 搜索输入框 (> prompt)
 * - 可滚动的命令列表 (支持模糊匹配)
 * - 键盘导航 (Up/Down/Tab/Shift+Tab/Enter/Escape)
 * - 鼠标点击和滚轮支持
 *
 * 逆向参考:
 * - 触发: jetbrains_wizard.js:3040 — textChangeListener
 *   `if (text === "/") { showCommandPalette(); controller.text = ""; }`
 * - 覆盖层结构: jetbrains_wizard.js:5611 — N0 (Center) > SR (constrained) > c0R > i0R
 * - FuzzyPicker: chunk-006.js:14344 (NZT) — 搜索+滚动+键盘导航
 * - 命令面板 UI: misc_utils.js:5482-5585 — noun | gap | verb | shortcut
 * - 约束: o0.loose(80, 20) — 最大 80 列宽, 20 行高
 *
 * @module command-palette-widget
 */

import type { BuildContext, Widget, Widget as WidgetInterface } from "@flitter/tui";
import {
  BoxDecoration,
  Center,
  Color,
  Container,
  EdgeInsets,
  FuzzyPicker,
  Row,
  type ScoredItem,
  SizedBox,
  StatelessWidget,
  Text,
  TextStyle,
} from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Command entry type
// ════════════════════════════════════════════════════

/**
 * Command palette entry.
 */
export interface CommandPaletteEntry {
  id: string;
  label: string;
  category?: string;
  description?: string;
}

// ════════════════════════════════════════════════════
//  CommandPaletteOverlay
// ════════════════════════════════════════════════════

/**
 * CommandPaletteOverlay config.
 */
export interface CommandPaletteOverlayConfig {
  /** Available commands to display */
  commands: CommandPaletteEntry[];
  /** Called when a command is selected */
  onSelect: (commandId: string) => void;
  /** Called when the palette is dismissed (Escape or click outside) */
  onDismiss: () => void;
}

/**
 * CommandPaletteOverlay — centered floating command palette.
 *
 * Uses FuzzyPicker from @flitter/tui for full fuzzy search, keyboard
 * navigation, scroll-into-view, and mouse support.
 *
 * 逆向: jetbrains_wizard.js:5611
 *   N0 (Center overlay) > SR (constraints: max 80 wide, 20 tall) > c0R > i0R (CommandPalette)
 *   i0R uses we (FuzzyPicker) with custom renderItem showing noun | verb | shortcut columns.
 */
export class CommandPaletteOverlay extends StatelessWidget {
  readonly config: CommandPaletteOverlayConfig;

  constructor(config: CommandPaletteOverlayConfig) {
    super();
    this.config = config;
  }

  build(_context: BuildContext): WidgetInterface {
    const { commands, onSelect, onDismiss } = this.config;

    // 逆向: misc_utils.js:5298-5588 — sortCommands comparator
    const sortCommands = (
      a: ScoredItem<CommandPaletteEntry>,
      b: ScoredItem<CommandPaletteEntry>,
      query: string,
    ): number => {
      const normalizedQuery = query.toLowerCase();
      const aCat = a.item.category?.toLowerCase() ?? "";
      const bCat = b.item.category?.toLowerCase() ?? "";
      const aLabel = a.item.id.toLowerCase();
      const bLabel = b.item.id.toLowerCase();

      // 1. Exact noun/verb match first
      const aExact = aCat === normalizedQuery || aLabel === normalizedQuery;
      const bExact = bCat === normalizedQuery || bLabel === normalizedQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // 2. Fuzzy score
      if (b.score !== a.score) return b.score - a.score;

      return 0;
    };

    // 逆向: misc_utils.js:5482-5585 — renderItem: noun | gap | verb
    const renderItem = (
      item: CommandPaletteEntry,
      isSelected: boolean,
      _isDisabled: boolean,
      _ctx: BuildContext,
    ): WidgetInterface => {
      // 逆向: amp P = isSelected ? R.app.selectionBackground : void 0
      const bgColor = isSelected ? Color.rgb(50, 50, 80) : Color.default();
      const textStyle = new TextStyle({
        foreground: isSelected ? Color.indexed(4) : Color.default(),
      });
      const mutedStyle = new TextStyle({
        foreground: Color.default(),
        dim: true,
      });

      // 逆向: misc_utils.js:5482 — p = max noun length across all commands
      // Simplified: fixed 12-char noun column
      const nounCol = new SizedBox({
        width: 12,
        child: new Text({
          data: item.category ?? "",
          style: isSelected ? textStyle : mutedStyle,
        }) as unknown as WidgetInterface,
      });

      const verbText = new Text({
        data: item.id,
        style: textStyle,
      });

      const children: Widget[] = [
        nounCol as unknown as Widget,
        new SizedBox({ width: 2 }) as unknown as Widget,
        verbText as unknown as Widget,
      ];

      // Optional description on the right
      if (item.description) {
        children.push(
          new SizedBox({ width: 2 }) as unknown as Widget,
          new Text({
            data: item.description,
            style: mutedStyle,
          }) as unknown as Widget,
        );
      }

      return new Container({
        decoration: new BoxDecoration({ color: bgColor }),
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Row({
          children,
        }) as unknown as WidgetInterface,
      }) as unknown as WidgetInterface;
    };

    // 逆向: jetbrains_wizard.js:5611 — N0 { child: c0R { ... } }
    // N0 = Center overlay, SR = size constraints (max 80x20)
    const picker = new FuzzyPicker<CommandPaletteEntry>({
      items: commands,
      getLabel: (item) => `${item.category ?? ""} ${item.id} ${item.description ?? ""}`,
      renderItem,
      sortItems: sortCommands,
      onAccept: (item) => {
        onSelect(item.id);
      },
      onDismiss,
      title: "Command Palette",
      maxRenderItems: 40,
    });

    // 逆向: N0 (Center) > SR (constraints: max 80 wide, max 20 tall)
    return new Center({
      child: new SizedBox({
        width: 80,
        height: 20,
        child: picker as unknown as Widget,
      }),
    }) as unknown as WidgetInterface;
  }
}
