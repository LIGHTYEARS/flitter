/**
 * CommandPalette — 命令面板 Widget。
 *
 * 逆向: amp qZT/zZT (misc_utils.js:2529), UZT (misc_utils.js:2404),
 *       i0R/s0R (misc_utils.js:5298)
 *
 * 使用 {@link FuzzyPicker} 提供搜索输入 + 命令列表的交互体验。
 *
 * @module command-palette
 */

import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import type { Widget as WidgetInterface } from "../tree/element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Widget } from "../tree/widget.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { Center } from "../widgets/center.js";
import { Container } from "../widgets/container.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { Expanded } from "../widgets/flexible.js";
import { Row } from "../widgets/row.js";
import { SizedBox } from "../widgets/sized-box.js";
import { Text } from "../widgets/text.js";
import { FuzzyPicker, type ScoredItem } from "./fuzzy-picker.js";

// ════════════════════════════════════════════════════
//  Command interface
// ════════════════════════════════════════════════════

/**
 * 命令面板命令定义。
 */
export interface CommandPaletteCommand {
  /** 命令唯一标识 */
  id: string;
  /** 显示标签（动词文本） */
  label: string;
  /** 命令分类（名词文本，显示在左列） */
  category?: string;
  /** 命令描述 */
  description?: string;
  /** 快捷键提示 */
  shortcut?: string;
  /** 执行动作 */
  action: () => void | Promise<void>;
  /** 是否启用（默认 true） */
  enabled?: boolean;
  /** 排序优先级（越大越靠前） */
  priority?: number;
}

/**
 * CommandPalette 构造参数。
 */
export interface CommandPaletteProps {
  /** 命令列表 */
  commands: CommandPaletteCommand[];
  /** 关闭回调 */
  onDismiss: () => void;
}

// ════════════════════════════════════════════════════
//  CommandPalette Widget
// ════════════════════════════════════════════════════

/**
 * 命令面板 StatefulWidget。
 *
 * 逆向: amp qZT in misc_utils.js:2529
 */
export class CommandPalette extends StatefulWidget {
  readonly commands: CommandPaletteCommand[];
  readonly onDismiss: () => void;

  constructor(props: CommandPaletteProps) {
    super();
    this.commands = props.commands;
    this.onDismiss = props.onDismiss;
  }

  createState(): State<CommandPalette> {
    return new CommandPaletteState();
  }
}

// ════════════════════════════════════════════════════
//  CommandPaletteState
// ════════════════════════════════════════════════════

/**
 * CommandPalette 状态管理。
 *
 * 逆向: amp zZT (misc_utils.js:2535) + UZT.build (misc_utils.js:2404)
 */
class CommandPaletteState extends State<CommandPalette> {
  /**
   * 逆向: UZT.build — 计算命令分类列最大宽度 (misc_utils.js:2410 KE0)
   */
  private _maxCategoryWidth(): number {
    return Math.max(0, ...this.widget.commands.map((cmd) => (cmd.category ?? "").length));
  }

  /**
   * 命令排序比较器。
   *
   * 逆向: hH0 in modules/2786_unknown_hH0.js (简化版，无 follows/alias)
   *
   * 优先级: 精确匹配 > 模糊得分 > 显式优先级
   */
  private _sortCommands(
    a: ScoredItem<CommandPaletteCommand>,
    b: ScoredItem<CommandPaletteCommand>,
    normalizedQuery: string,
  ): number {
    // 1. Exact noun/verb match
    const aCat = a.item.category?.toLowerCase() ?? "";
    const bCat = b.item.category?.toLowerCase() ?? "";
    const aLabel = a.item.label.toLowerCase();
    const bLabel = b.item.label.toLowerCase();

    const aExact = aCat === normalizedQuery || aLabel === normalizedQuery;
    const bExact = bCat === normalizedQuery || bLabel === normalizedQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // 2. Fuzzy score
    if (b.score !== a.score) return b.score - a.score;

    // 3. Priority
    const aPri = a.item.priority ?? 0;
    const bPri = b.item.priority ?? 0;
    return bPri - aPri;
  }

  /**
   * 渲染单个命令项。
   *
   * 逆向: amp HZT / i0R.renderItem (misc_utils.js:5360-5420)
   */
  private _buildCommandItem(
    cmd: CommandPaletteCommand,
    isSelected: boolean,
    isDisabled: boolean,
    categoryWidth: number,
  ): WidgetInterface {
    const children: Widget[] = [];

    // Category/noun column (fixed width, muted when not selected)
    if (categoryWidth > 0) {
      children.push(
        new SizedBox({
          width: categoryWidth,
          child: new Text({
            data: cmd.category ?? "",
            style: new TextStyle({
              foreground: isSelected ? Color.white() : Color.rgb(120, 120, 120),
            }),
          }) as unknown as WidgetInterface,
        }) as unknown as Widget,
      );
      children.push(new SizedBox({ width: 1 }) as unknown as Widget);
    }

    // Label/verb column (expanded, bold)
    children.push(
      new Expanded({
        child: new Text({
          data: cmd.label,
          style: new TextStyle({
            bold: true,
            foreground: isDisabled ? Color.rgb(100, 100, 100) : Color.white(),
          }),
        }),
      }) as unknown as Widget,
    );

    // Shortcut column
    if (cmd.shortcut) {
      children.push(
        new Text({
          data: cmd.shortcut,
          style: new TextStyle({ foreground: Color.rgb(120, 120, 120) }),
        }) as unknown as Widget,
      );
    }

    return new Container({
      decoration: isSelected ? new BoxDecoration({ color: Color.rgb(50, 50, 80) }) : undefined,
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Row({ children }),
    }) as unknown as WidgetInterface;
  }

  /**
   * 构建面板 UI。
   *
   * 逆向: amp UZT.build (misc_utils.js:2404-2440)
   */
  build(_context: BuildContext): WidgetInterface {
    const categoryWidth = this._maxCategoryWidth();

    return new Center({
      child: new SizedBox({
        width: 80,
        height: 20,
        child: new FuzzyPicker<CommandPaletteCommand>({
          items: this.widget.commands,
          title: "Command Palette",
          getLabel: (cmd) => `${cmd.category ?? ""} ${cmd.label}`.trim().toLowerCase(),
          renderItem: (cmd, isSelected, isDisabled, _ctx) =>
            this._buildCommandItem(cmd, isSelected, isDisabled, categoryWidth),
          isItemDisabled: (cmd) => cmd.enabled === false,
          sortItems: (a, b, query) => this._sortCommands(a, b, query),
          onAccept: (cmd) => {
            const result = cmd.action();
            if (result instanceof Promise) {
              result.then(() => this.widget.onDismiss());
            } else {
              this.widget.onDismiss();
            }
          },
          onDismiss: () => this.widget.onDismiss(),
        }),
      }),
    }) as unknown as WidgetInterface;
  }
}
