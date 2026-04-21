/**
 * CommandPalette — 命令面板 Widget。
 *
 * 基于 {@link AutocompleteController} 实现的命令搜索面板。
 * 内部创建 TextEditingController 用于搜索输入，
 * 通过模糊匹配过滤命令列表。
 *
 * 还原自逆向工程代码中的命令面板模式
 * (tui-thread-widgets.js:2748 commandPaletteMode)。
 *
 * @module command-palette
 *
 * @example
 * ```ts
 * const palette = new CommandPalette({
 *   commands: [
 *     { id: "new", label: "New Thread", action: () => createThread() },
 *     { id: "quit", label: "Quit", shortcut: "Ctrl+C", action: () => quit() },
 *   ],
 *   onDismiss: () => closePalette(),
 * });
 * ```
 */

import { TextEditingController } from "../editing/text-editing-controller.js";
import { TextField } from "../editing/text-field.js";
import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import type { Widget as WidgetInterface } from "../tree/element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Widget } from "../tree/widget.js";
import { Border } from "../widgets/border.js";
import { BorderSide } from "../widgets/border-side.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { Column } from "../widgets/column.js";
import { Container } from "../widgets/container.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { Expanded } from "../widgets/flexible.js";
import { Row } from "../widgets/row.js";
import { SizedBox } from "../widgets/sized-box.js";
import { Text } from "../widgets/text.js";
import { AutocompleteController, type AutocompleteOption } from "./autocomplete-controller.js";

/**
 * 命令面板命令定义。
 *
 * 逆向: amp 命令面板使用 noun/verb 作为分类与标签 (e0R 类, chunk-004.js:34746+)。
 * 这里使用 category/label 映射 amp 的 noun/verb 语义。
 */
export interface CommandPaletteCommand {
  /** 命令唯一标识 */
  id: string;
  /** 显示标签 (对应 amp 的 verb, 如 "help", "use smart", "toggle") */
  label: string;
  /** 命令分类 (对应 amp 的 noun, 如 "amp", "mode", "thread", "prompt", "context") */
  category?: string;
  /** 命令描述 */
  description?: string;
  /** 快捷键提示 */
  shortcut?: string;
  /** 执行动作 */
  action: () => void;
  /** 是否启用，默认 true */
  enabled?: boolean;
  /** 排序优先级 (高值优先)，默认 0 */
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

/**
 * 命令面板 StatefulWidget。
 *
 * 提供搜索输入框 + 命令列表的交互体验。
 * 内部使用 {@link TextEditingController} 管理搜索文本，
 * 使用 {@link AutocompleteController} 管理匹配和选择。
 */
export class CommandPalette extends StatefulWidget {
  /** 命令列表 */
  readonly commands: CommandPaletteCommand[];
  /** 关闭回调 */
  readonly onDismiss: () => void;

  /**
   * 创建命令面板。
   *
   * @param props - 命令列表和关闭回调
   */
  constructor(props: CommandPaletteProps) {
    super();
    this.commands = props.commands;
    this.onDismiss = props.onDismiss;
  }

  /**
   * 创建关联的 State。
   *
   * @returns CommandPaletteState 实例
   */
  createState(): State<CommandPalette> {
    return new CommandPaletteState();
  }
}

/**
 * CommandPalette 状态管理。
 *
 * 管理搜索控制器和自动补全控制器的生命周期。
 */
class CommandPaletteState extends State<CommandPalette> {
  /** 搜索输入控制器 */
  private _searchController!: TextEditingController;
  /** 自动补全控制器 */
  private _autocompleteController!: AutocompleteController;
  /** 匹配的命令列表 */
  private _matchedCommands: CommandPaletteCommand[] = [];

  /**
   * 初始化状态。
   *
   * 创建搜索和自动补全控制器，绑定到命令列表。
   */
  override initState(): void {
    super.initState();
    this._searchController = new TextEditingController();
    this._autocompleteController = new AutocompleteController();

    // 初始化匹配: 总是激活 (空触发字符, minLength=0)
    this._matchedCommands = [...this.widget.commands];

    this._autocompleteController.initialize({
      textController: this._searchController,
      triggers: [{ char: "", minLength: 0 }],
      optionsBuilder: (query) => this._filterCommands(query),
      onSelected: (option) => this._executeCommand(option),
      debounceMs: 50,
    });

    this._autocompleteController.addListener(() => {
      this.setState();
    });
  }

  /**
   * 释放资源。
   */
  override dispose(): void {
    this._autocompleteController.dispose();
    super.dispose();
  }

  /**
   * 构建面板 UI。
   *
   * 当前返回简化的 placeholder Widget（完整 UI 渲染依赖 TextField/ListView 等组件协调）。
   *
   * @param context - 构建上下文
   * @returns 子 Widget
   */
  build(_context: BuildContext): Widget {
    const matchCount = this._matchedCommands.length;

    // 逆向: amp command palette always wraps content in
    // SR({ decoration: { color: a.background } }) where a = $R.of(T).colors
    // Using Color.default() = terminal default background (amp's LT.none())
    const border = Border.all(new BorderSide(Color.white()));

    // Prompt row: "> " + search text
    const promptRow = new Row({
      children: [
        new Container({
          child: new Text({
            data: "> ",
            style: new TextStyle({}),
          }) as unknown as WidgetInterface,
        }) as unknown as Widget,
        new Expanded({
          child: new TextField({
            controller: this._searchController,
            autofocus: true,
            maxLines: 1,
          }) as unknown as Widget,
        }) as unknown as Widget,
      ],
    });

    // Item list — each item gets explicit background for flat buffer model
    const itemWidgets: Widget[] = this._matchedCommands.map((cmd, index) => {
      const isSelected = index === this._autocompleteController.currentState.selectedIndex;
      const bgColor = isSelected ? Color.rgb(50, 50, 80) : Color.default();

      return new Container({
        decoration: new BoxDecoration({ color: bgColor }),
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Text({
          data: cmd.shortcut ? `${cmd.label}  ${cmd.shortcut}` : cmd.label,
          style: new TextStyle({
            dim: cmd.enabled === false,
          }),
        }) as unknown as WidgetInterface,
      }) as unknown as Widget;
    });

    const columnChildren: Widget[] = [];
    columnChildren.push(promptRow as unknown as Widget);
    columnChildren.push(new SizedBox({ height: 1 }) as unknown as Widget);
    columnChildren.push(
      new Column({
        crossAxisAlignment: "stretch",
        children: itemWidgets,
      }) as unknown as Widget,
    );

    // Status bar showing match count
    if (matchCount !== this.widget.commands.length) {
      columnChildren.push(new SizedBox({ height: 1 }) as unknown as Widget);
      columnChildren.push(
        new Text({
          data: `${matchCount}/${this.widget.commands.length} commands`,
          style: new TextStyle({ dim: true }),
        }) as unknown as Widget,
      );
    }

    // 逆向: NZT line 2934-2941 — outer container with border + background
    return new Container({
      decoration: new BoxDecoration({
        border,
        color: Color.default(),
      }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Column({ children: columnChildren }) as unknown as WidgetInterface,
    }) as unknown as Widget;
  }

  /**
   * @internal 按 label 模糊匹配命令。
   */
  private _filterCommands(query: string): AutocompleteOption[] {
    const q = query.toLowerCase();
    const matches = this.widget.commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        (cmd.description?.toLowerCase().includes(q) ?? false),
    );
    this._matchedCommands = matches;
    return matches.map((cmd) => ({
      label: cmd.label,
      value: cmd.id,
      description: cmd.description,
    }));
  }

  /**
   * @internal 执行选中的命令。
   */
  private _executeCommand(option: AutocompleteOption): void {
    const cmd = this.widget.commands.find((c) => c.id === option.value);
    if (cmd) {
      cmd.action();
    }
    this.widget.onDismiss();
  }
}
