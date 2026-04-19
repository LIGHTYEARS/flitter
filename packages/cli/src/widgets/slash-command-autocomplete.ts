/**
 * SlashCommandAutocomplete — 斜杠命令自动补全覆盖层。
 *
 * 当用户在输入框中键入 "/" 时，触发自动补全，
 * 显示来自 {@link FlitterCommandPaletteProvider} 的命令列表。
 * 选中命令后执行对应动作并关闭覆盖层。
 *
 * 逆向参考:
 * - 命令面板触发: 输入 "/" 触发 commandPaletteMode (tui-thread-widgets.js:2748)
 * - 补全控制器: uZT 类 (micromark-parser.js:11486-11640) — "/" 触发器
 * - 命令执行: qZT.onDismiss -> commandPalette.disable (chunk-006.js:14783)
 * - 弹出层锚定: LayerLink 将覆盖层锚定到输入框位置 (micromark-parser.js:11454)
 *
 * @module slash-command-autocomplete
 *
 * @example
 * ```ts
 * const controller = new SlashCommandAutocomplete({
 *   textController: inputController,
 *   commandProvider: provider,
 *   overlayState: overlay,
 *   layerLink: link,
 * });
 * // 用户键入 "/" → 自动补全面板弹出
 * // 选择命令 → 执行 action, 关闭面板
 * controller.dispose();
 * ```
 */

import {
  AutocompleteController,
  type AutocompleteOption,
  type TextEditingController,
  type OverlayState,
  OverlayEntry,
  StatelessWidget,
  Column,
  RichText,
  TextSpan,
  Padding,
  EdgeInsets,
  Row,
  SizedBox,
} from "@flitter/tui";
import { TextStyle } from "@flitter/tui";
import { Color } from "@flitter/tui";
import type { Widget } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";
import type { LayerLink } from "@flitter/tui";
import type { FlitterCommandPaletteProvider } from "./command-palette-provider.js";

// ════════════════════════════════════════════════════
//  颜色常量 (Tokyo Night 调色板)
// ════════════════════════════════════════════════════

/** primary 色 (#7aa2f7) — 选中项 */
const PRIMARY_COLOR = Color.rgb(0x7a, 0xa2, 0xf7);

/** foreground 色 (#c0caf5) — 普通文本 */
const FG_COLOR = Color.rgb(0xc0, 0xca, 0xf5);

/** mutedText 色 (#565f89) — 分类/描述 */
const MUTED_COLOR = Color.rgb(0x56, 0x5f, 0x89);

/** surface 色 (#1a1b26) — 选中背景 */
const SURFACE_COLOR = Color.rgb(0x1a, 0x1b, 0x26);

// ════════════════════════════════════════════════════
//  SlashCommandAutocompleteConfig
// ════════════════════════════════════════════════════

/**
 * SlashCommandAutocomplete 配置。
 */
export interface SlashCommandAutocompleteConfig {
  /** 绑定的文本编辑控制器 */
  textController: TextEditingController;
  /** 命令面板提供者 */
  commandProvider: FlitterCommandPaletteProvider;
  /** 弹出层状态 (可选, 用于 OverlayEntry 管理) */
  overlayState?: OverlayState;
  /** 锚点链接 (可选, 用于定位) */
  layerLink?: LayerLink;
}

// ════════════════════════════════════════════════════
//  SlashCommandAutocomplete 控制器
// ════════════════════════════════════════════════════

/**
 * 斜杠命令自动补全控制器。
 *
 * 内部创建 {@link AutocompleteController}，以 "/" 作为触发字符。
 * 触发后从 {@link FlitterCommandPaletteProvider} 获取命令列表，
 * 按输入文本模糊过滤。选中后执行命令动作。
 *
 * 逆向: amp 的 commandPaletteMode (tui-thread-widgets.js:2748) 使用
 * 类似机制 — "/" 输入触发面板, 模糊搜索命令, 选中执行。
 */
export class SlashCommandAutocomplete {
  /** @internal 自动补全控制器 */
  private _autocomplete: AutocompleteController;

  /** @internal 命令面板提供者 */
  private _commandProvider: FlitterCommandPaletteProvider;

  /** @internal 弹出层条目 */
  private _overlayEntry: OverlayEntry | null = null;

  /** @internal 弹出层状态 */
  private _overlayState: OverlayState | null;

  /** @internal 锚点链接 */
  private _layerLink: LayerLink | null;

  /** @internal 是否已释放 */
  private _disposed: boolean = false;

  /**
   * 创建斜杠命令自动补全控制器。
   *
   * @param config - 配置选项
   */
  constructor(config: SlashCommandAutocompleteConfig) {
    this._commandProvider = config.commandProvider;
    this._overlayState = config.overlayState ?? null;
    this._layerLink = config.layerLink ?? null;
    this._autocomplete = new AutocompleteController();

    this._autocomplete.initialize({
      textController: config.textController,
      triggers: [{ char: "/", minLength: 0 }],
      optionsBuilder: (query) => this._buildOptions(query),
      onSelected: (option) => this._onCommandSelected(option),
      debounceMs: 50,
    });

    // 监听状态变化以管理覆盖层
    this._autocomplete.addListener((state) => {
      if (state.isActive && !this._overlayEntry && this._overlayState) {
        this._showOverlay();
      } else if (!state.isActive && this._overlayEntry) {
        this._hideOverlay();
      }
    });
  }

  /**
   * 获取自动补全控制器 (供外部读取状态或注册监听器)。
   */
  get autocompleteController(): AutocompleteController {
    return this._autocomplete;
  }

  /**
   * 选中下一个选项。
   */
  selectNext(): void {
    this._autocomplete.selectNext();
  }

  /**
   * 选中上一个选项。
   */
  selectPrevious(): void {
    this._autocomplete.selectPrevious();
  }

  /**
   * 确认选中。
   */
  acceptSelected(): void {
    this._autocomplete.acceptSelected();
  }

  /**
   * 关闭补全面板。
   */
  dismiss(): void {
    this._autocomplete.dismiss();
    this._hideOverlay();
  }

  /**
   * 当前是否处于激活状态。
   */
  get isActive(): boolean {
    return this._autocomplete.isActive;
  }

  /**
   * 释放资源。
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._hideOverlay();
    this._autocomplete.dispose();
  }

  // ════════════════════════════════════════════════════
  //  内部方法
  // ════════════════════════════════════════════════════

  /**
   * @internal 根据查询文本构建命令选项列表。
   *
   * 模糊匹配 label、category 和 description。
   */
  private _buildOptions(query: string): AutocompleteOption[] {
    const commands = this._commandProvider.getCommands();
    const q = query.toLowerCase();
    const matches = commands.filter((cmd) => {
      if (!q) return true;
      return (
        cmd.label.toLowerCase().includes(q) ||
        (cmd.category?.toLowerCase().includes(q) ?? false) ||
        (cmd.description?.toLowerCase().includes(q) ?? false)
      );
    });

    return matches.map((cmd) => ({
      label: cmd.category ? `${cmd.category}: ${cmd.label}` : cmd.label,
      value: cmd.id,
      description: cmd.description,
    }));
  }

  /**
   * @internal 命令选中回调。
   */
  private _onCommandSelected(option: AutocompleteOption): void {
    this._commandProvider.executeCommand(option.value);
  }

  /**
   * @internal 显示覆盖层。
   */
  private _showOverlay(): void {
    if (!this._overlayState || this._overlayEntry) return;
    this._overlayEntry = new OverlayEntry({
      builder: () => new SlashCommandOverlayWidget({
        autocomplete: this._autocomplete,
      }),
    });
    this._overlayState.insert(this._overlayEntry);
  }

  /**
   * @internal 隐藏覆盖层。
   */
  private _hideOverlay(): void {
    if (this._overlayEntry) {
      this._overlayEntry.remove();
      this._overlayEntry = null;
    }
  }
}

// ════════════════════════════════════════════════════
//  SlashCommandOverlayWidget (内部)
// ════════════════════════════════════════════════════

/**
 * SlashCommandOverlayWidget 配置。
 */
interface SlashCommandOverlayWidgetProps {
  autocomplete: AutocompleteController;
}

/**
 * 斜杠命令覆盖层 Widget — 渲染命令选项列表。
 *
 * 逆向: amp 的 qZT/zZT 命令面板 Widget (chunk-006.js:14771-14800)
 * 显示格式: 左侧 category (右对齐), 右侧 verb, 最右 shortcut
 */
class SlashCommandOverlayWidget extends StatelessWidget {
  readonly props: SlashCommandOverlayWidgetProps;

  constructor(props: SlashCommandOverlayWidgetProps) {
    super();
    this.props = props;
  }

  build(_context: BuildContext): Widget {
    const state = this.props.autocomplete.currentState;
    const options = state.options;
    const selectedIdx = state.selectedIndex;

    const normalStyle = new TextStyle({ foreground: FG_COLOR });
    const selectedStyle = new TextStyle({ foreground: PRIMARY_COLOR });
    const categoryStyle = new TextStyle({ foreground: MUTED_COLOR });

    if (options.length === 0) {
      return new RichText({
        text: new TextSpan({
          text: "No matching commands",
          style: categoryStyle,
        }),
      });
    }

    const items: Widget[] = options.map((opt, idx) => {
      const isSelected = idx === selectedIdx;
      const textStyle = isSelected ? selectedStyle : normalStyle;

      // 分离 "category: label" 格式
      const colonIdx = opt.label.indexOf(": ");
      let categoryText = "";
      let labelText = opt.label;
      if (colonIdx !== -1) {
        categoryText = opt.label.slice(0, colonIdx);
        labelText = opt.label.slice(colonIdx + 2);
      }

      return new Row({
        children: [
          // Category (右对齐 padding)
          new SizedBox({
            width: 12,
            child: new RichText({
              text: new TextSpan({
                text: categoryText,
                style: categoryStyle,
              }),
            }),
          }),
          // Separator
          new RichText({
            text: new TextSpan({
              text: "  ",
              style: normalStyle,
            }),
          }),
          // Label
          new RichText({
            text: new TextSpan({
              text: labelText,
              style: textStyle,
            }),
          }),
        ],
      });
    });

    return new Padding({
      padding: EdgeInsets.all(1),
      child: new Column({
        children: items,
      }),
    });
  }
}
