/**
 * InputField -- 文本输入框 Widget。
 *
 * 集成 FocusNode + TextEditingController，处理键盘和粘贴输入。
 * Enter 键触发 onSubmit 回调，Shift+Enter 插入换行，
 * Backspace 删除字符，普通字符插入文本。
 *
 * 视觉保真度:
 * - Box-drawing 边框 (聚焦: primary #7aa2f7, 非聚焦: border #3b4261)
 * - 占位符 "Type a message..." (mutedText #565f89)
 * - 光标反色 (inverse video)
 * - 1 列内部左右 padding
 * - 动态高度: minLines=3, 随内容增长, 外层 ConstrainedBox 限制 max 40% viewport
 *
 * 逆向参考: TextField key handling (conversation-ui-logic.js)
 *
 * @example
 * ```ts
 * import { InputField } from "./input-field.js";
 *
 * const field = new InputField({
 *   onSubmit: (text) => console.log("Submitted:", text),
 *   placeholder: "Type a message...",
 * });
 * ```
 *
 * @module
 */

import type { BuildContext, Element, KeyEvent, PasteEvent, Widget } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxDecoration,
  Color,
  Column,
  Container,
  EdgeInsets,
  FocusManager,
  FocusNode,
  type KeyEventResult,
  MediaQuery,
  RichText,
  Row,
  SizedBox,
  State,
  StatefulWidget,
  TextEditingController,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
// 逆向: chunk-004.js:32086 — VTR() 剪贴板图片读取
// Direct import from tui package since clipboard-image is not exported from main entry
import { readClipboardImage } from "../../../tui/src/selection/clipboard-image.js";
import {
  detectShellCommand,
  getShellModeBorderColor,
  getShellPromptInfo,
  SHELL_PROMPT_SPACING,
} from "./command-detection.js";
import {
  detectDoubleAtTrigger,
  insertThreadMention as insertThreadMentionUtil,
} from "./file-autocomplete.js";

// ════════════════════════════════════════════════════
//  颜色常量
// ════════════════════════════════════════════════════

/**
 * 输入框边框色 — 逆向: k8R.build() → e.selectedMessage → colorScheme border fallback
 *
 * amp 的 golden capture 显示输入框边框使用终端默认前景色 (无 ESC 着色),
 * 不区分聚焦/非聚焦状态。
 */
const INPUT_BORDER_COLOR = Color.default();

/** mutedText 色 — 占位符
 * 逆向: T.mutedForeground → default + dim */
const MUTED_TEXT_COLOR = Color.default();

/** text 色 — 输入文本
 * 逆向: T.foreground → terminal default */
const TEXT_COLOR = Color.default();

/** background 色 — 光标反色前景
 * 逆向: L1T._paintSoftwareCursor (chunk-006.js:5108-5112) uses { reverse: !0 }
 * 逆向: L1T.paint (actions_intents.js:1675) passes backgroundColor ?? LT.black
 * Since TextStyle has no reverse property, we manually swap fg↔bg.
 * Cursor block: foreground = black (text on cursor), background = white (cursor block color) */
const CURSOR_FG_COLOR = Color.black();
const CURSOR_BG_COLOR = Color.white();

/** 默认边框宽度 (80 列终端 - 2 列边框字符) */
const DEFAULT_BORDER_INNER_WIDTH = 78;

/**
 * 最大图片附件数量。
 *
 * 逆向: chunk-005.js:15289 — pb = 4
 */
const MAX_IMAGE_ATTACHMENTS = 4;

// ════════════════════════════════════════════════════
//  ImageAttachment 类型
// ════════════════════════════════════════════════════

/**
 * 图片附件数据结构。
 *
 * 逆向: chunk-004.js:21263-21272 — vE0() 返回的对象结构
 */
export interface ImageAttachment {
  type: "image";
  source: {
    type: "base64";
    data: string;
    mediaType: string;
  };
  /** 附件来源文件路径 */
  sourcePath: string;
}

// ════════════════════════════════════════════════════
//  InputFieldConfig 接口
// ════════════════════════════════════════════════════

/**
 * InputField 配置。
 *
 * @property onSubmit - Enter 提交时的回调，接收输入文本
 * @property placeholder - 占位符文本（可选）
 */
export interface InputFieldConfig {
  /** 提交回调 — 携带文本和图片附件
   * 逆向: chunk-006.js:13389-13395 — _handleSubmitted 触发 onSubmitted */
  onSubmit: (text: string, imageAttachments?: ImageAttachment[]) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 历史记录导航 (optional) */
  promptHistory?: import("./prompt-history.js").PromptHistory;
  /** Override width for border rendering (default: derived from MediaQuery or 78) */
  width?: number;
  /**
   * 最小显示行数 (逆向: chunk-006.js:13474 — minLines: this.props.minLines ?? 3)
   * 输入框至少展示这么多行内容区，不足时用空白行补齐。
   * 默认为 3。
   */
  minLines?: number;
  /** Border overlay labels (逆向: YrT overlayTexts, text_rendering.js:2395) */
  topLeftLabel?: string;
  topRightLabel?: string;
  bottomLeftLabel?: string;
  bottomRightLabel?: string;
  /**
   * Enter 提交行为切换 (逆向: submitKey / actions_intents.js:1011-1031)
   *
   * - true (default): Enter 提交, Shift+Enter 插入换行
   * - false: Enter 插入换行, Ctrl+Enter 或 Meta+Enter 提交
   */
  enterSubmitsMessage?: boolean;
  /**
   * Ctrl+G: open current text in $EDITOR (逆向: actions_intents.js:1054-1058)
   *
   * Called with the current input text. The callback is responsible for
   * spawning the editor and writing the result back via setText().
   */
  onOpenInEditor?: (text: string) => void;
  /**
   * Ctrl+S: toggle agent mode (逆向: modules/2785_unknown_e0R.js lines 1053-1063)
   *
   * Called when the user presses Ctrl+S. The callback is responsible for
   * cycling through visible agent modes using round-robin logic.
   */
  onToggleAgentMode?: () => void;
  /**
   * `@@` thread-mention trigger (逆向: actions_intents.js:2326 — onDoubleAtTrigger)
   *
   * Fired when the user types a second `@` immediately after a word-boundary `@`
   * (i.e. the cursor is right after `@@`).  The app-level code is responsible
   * for displaying a thread picker; once a thread is selected it should call
   * `InputFieldState.insertThreadMention(threadId)` on the state instance.
   *
   * Amp reference:
   *   `if (e.query === "@" && this.props.onDoubleAtTrigger)`
   *   `  return this.props.onDoubleAtTrigger(this.props.controller), [];`
   *
   * Note: the `@@` sequence stays in the text while the picker is open so the
   * app can remove it via `insertThreadMention` (which calls `handleDoubleAtTrigger`
   * logic from jetbrains_wizard.js:3142-3201).
   */
  onThreadMentionTrigger?: () => void;
  /**
   * 最大可见行数 — 超过此行数时启用内部滚动 (viewport 裁剪)。
   *
   * 逆向: chunk-006.js:4185-4206 — RenderScrollable.performLayout()
   *   子节点用无限高约束布局，然后裁剪到 maxHeight。
   * 逆向: chunk-006.js:36929 — I = Math.max(Math.floor(a.size.height * 0.4), 12)
   *   maxLines 由调用方根据 viewport 高度计算后传入。
   *
   * 当 totalLines > maxLines 时，InputField 内部跟踪 _textScrollOffset
   * 并只渲染可见窗口内的行。光标移动自动滚动保持可见。
   * 默认 undefined (无限制，不裁剪)。
   */
  maxLines?: number;
  /**
   * `/` command palette trigger (逆向: jetbrains_wizard.js:3040 — textChangeListener)
   *
   * Fired when the user types `/` as the sole character in the input field.
   * The input is cleared after firing, and the app layer is responsible for
   * displaying the command palette overlay.
   *
   * Amp reference:
   *   `if (text === "/") { showCommandPalette(); controller.text = ""; }`
   */
  onSlashCommandTrigger?: () => void;
  /**
   * Fired when `?` is pressed on an empty input field.
   *
   * 逆向: chunk-006.js:36288-36308 — toggle isShowingShortcutsHelp when `?`
   * pressed, input empty, input focused, no overlay open.
   */
  onShortcutsToggle?: () => void;
  /**
   * Widget rendered inside the input box border, above the text input area.
   *
   * 逆向: k8R topWidget (chunk-006.js:37662-37664)
   *   `topWidget: this.isShowingShortcutsHelp ? new U8R({ submitOnEnter }) : void 0`
   *
   * In amp, the topWidget sits inside the TextField's BoxDecoration border,
   * above the text cursor, with a ─ horizontal separator between them.
   * Used for the shortcuts help panel (ShortcutsPopup / U8R).
   */
  topWidget?: import("@flitter/tui").Widget;
  /**
   * 图片插入回调 (逆向: chunk-006.js:13339-13343 — onInsertImage)
   *
   * 当粘贴文本中检测到图片文件路径时逐一触发。
   * 如果提供，由外部负责处理文件读取和附件添加。
   * 如果未提供，InputField 在内部处理图片文件 → base64 转换。
   */
  onInsertImage?: (imagePath: string) => void;
  /**
   * 外部传入的图片附件列表（受控模式）。
   *
   * 逆向: chunk-006.js:13399 — this.props.imageAttachments
   * 提供时 InputField 使用此列表渲染附件栏，不使用内部状态。
   */
  imageAttachments?: ImageAttachment[];
  /**
   * 图片附件变化回调（非受控模式下有效）。
   *
   * 逆向: jetbrains_wizard.js:3276 — setImageAttachments
   * 当内部附件列表发生变化时通知外部。
   */
  onImageAttachmentsChanged?: (attachments: ImageAttachment[]) => void;
}

// ════════════════════════════════════════════════════
//  InputField
// ════════════════════════════════════════════════════

/**
 * InputField -- 文本输入框 Widget。
 *
 * 集成 FocusNode + TextEditingController，处理键盘和粘贴输入。
 * Enter 键触发 onSubmit 回调，Shift+Enter 插入换行。
 *
 * 逆向: TextField (conversation-ui-logic.js)
 */
export class InputField extends StatefulWidget {
  /** Widget 配置 */
  readonly config: InputFieldConfig;

  /**
   * 创建 InputField。
   *
   * @param config - 输入框配置
   */
  constructor(config: InputFieldConfig) {
    super();
    this.config = config;
  }

  /**
   * 创建关联的 InputFieldState。
   *
   * @returns 新创建的 InputFieldState 实例
   */
  createState(): InputFieldState {
    return new InputFieldState();
  }
}

// ════════════════════════════════════════════════════
//  InputFieldState
// ════════════════════════════════════════════════════

/**
 * InputField 的状态管理。
 *
 * 管理 FocusNode 和 TextEditingController 的生命周期:
 * - initState: 创建 FocusNode (注册到 FocusManager) 和 TextEditingController
 * - dispose: 注销 FocusNode、销毁 TextEditingController
 * - 键盘事件: Shift+Enter -> 换行, Enter -> onSubmit, Backspace -> deleteText, 字符 -> insertText
 * - 粘贴事件: insertText
 * - build: 渲染 box-drawing 边框 + 占位符/文本 + 光标
 *
 * 逆向: wR 基类 (tui-widget-framework.js 1784-1813)
 */
export class InputFieldState extends State<InputField> {
  /** 焦点节点 */
  private _focusNode!: FocusNode;

  /** 文本编辑控制器 */
  private _controller!: TextEditingController;

  /** Focus change listener — triggers rebuild so cursor visibility updates.
   * 逆向: sP._focusChangeListener (actions_intents.js:819-821) */
  private _focusChangeListener!: (node: FocusNode) => void;

  /**
   * 内部图片附件列表（非受控模式使用）。
   *
   * 逆向: jetbrains_wizard.js:2434 — imageAttachments = []
   */
  private _imageAttachments: ImageAttachment[] = [];

  /**
   * 内部文本滚动偏移量 (行级别)。
   *
   * 当内容行数超过 maxLines 时，只渲染从 _textScrollOffset 开始的可见窗口。
   * 光标移动时自动调整以保持光标所在行可见。
   *
   * 逆向: chunk-006.js:4161-4175 — RenderScrollable._scrollOffset
   *   `_scrollOffset` 管理偏移，`updateChildOffset()` 应用 `-scrollOffset` 偏移显示。
   * 逆向: chunk-006.js:4185-4206 — performLayout()
   *   子节点用无限高约束布局后，scrollOffset 裁剪可见范围。
   */
  private _textScrollOffset = 0;

  /**
   * 初始化状态。
   *
   * 创建 TextEditingController 和 FocusNode，将 FocusNode 注册到 FocusManager
   * 并请求焦点。
   */
  initState(): void {
    super.initState();
    this._controller = new TextEditingController();
    this._focusNode = new FocusNode({
      debugLabel: "InputField",
      onKey: (event: KeyEvent) => this._handleKeyEvent(event),
      onPaste: (event: PasteEvent) => this._handlePasteEvent(event),
    });
    // 逆向: sP.initState — _focusChangeListener = T => { this.setState(() => {}) }
    // (actions_intents.js:819-821)
    // Focus change triggers rebuild so cursor visibility updates when focus
    // returns after overlay dismiss.
    this._focusChangeListener = (_node: FocusNode) => {
      if (this.mounted) this.setState();
    };
    this._focusNode.addListener(this._focusChangeListener);
    FocusManager.instance.registerNode(this._focusNode);
    this._focusNode.requestFocus();
  }

  /**
   * Widget 配置变化时调用。
   *
   * @param _oldWidget - 更新前的旧 Widget
   */
  didUpdateWidget(_oldWidget: InputField): void {
    // InputField 配置变化无需额外处理
  }

  /**
   * 清理资源。
   *
   * 注销 FocusNode、销毁 FocusNode 和 TextEditingController。
   */
  dispose(): void {
    this._focusNode.removeListener(this._focusChangeListener);
    FocusManager.instance.unregisterNode(this._focusNode);
    this._focusNode.dispose();
    this._controller.dispose();
    super.dispose();
  }

  /**
   * 构建子 Widget 树。
   *
   * 渲染 box-drawing 边框 + 内部内容:
   * - 空文本: 占位符 "Type a message..." (mutedText 色)
   * - 有文本: 实际文本 + 光标 (反色)
   * - 边框颜色: 聚焦 primary (#7aa2f7), 非聚焦 border (#3b4261)
   * - 高度: 动态调整 (minLines=3, 随内容增长, 外层 ConstrainedBox 限制 maxHeight)
   *
   * @param _context - 构建上下文
   * @returns Widget 树
   */
  build(_context: BuildContext): Widget {
    const text = this._controller.text;
    const isEmpty = !text;

    // 逆向: amp uses I9.sizeOf(T).width for dynamic border sizing
    // MediaQuery.sizeOf requires Element, BuildContext is Element at runtime
    let terminalWidth = DEFAULT_BORDER_INNER_WIDTH + 2; // fallback: 80
    try {
      terminalWidth = MediaQuery.sizeOf(_context as unknown as Element).width;
    } catch {
      // MediaQuery not in ancestor tree (e.g., unit tests) — use default
    }

    // 边框颜色: shell 模式使用 shellMode/shellModeHidden 色, 否则使用默认边框色
    // 逆向: k8R.build() (chunk-006.js:31497) — currentShellModeStatus ? MN0(R, status) : e.selectedMessage
    const shellResult = detectShellCommand(text);
    let borderColor: Color;
    if (shellResult) {
      borderColor = getShellModeBorderColor(shellResult.visibility);
    } else {
      borderColor = INPUT_BORDER_COLOR;
    }
    const borderStyle = new TextStyle({ foreground: borderColor });

    // 内容 Widget
    let contentWidget: Widget;
    const hasFocus = this._focusNode.hasFocus;
    if (isEmpty) {
      // 逆向: L1T.paint — cursor is painted at cursorPosition when focused, even when text is empty
      // (actions_intents.js:1675-1696). The cursor is a reverse-video space at position 0.
      // Placeholder text renders after the cursor when focused.
      const placeholder = this.widget.config.placeholder ?? "Type a message...";
      if (hasFocus) {
        const cursorStyle = new TextStyle({
          foreground: CURSOR_FG_COLOR,
          background: CURSOR_BG_COLOR,
        });
        contentWidget = new RichText({
          text: new TextSpan({
            children: [
              new TextSpan({ text: " ", style: cursorStyle }),
              new TextSpan({
                text: placeholder,
                style: new TextStyle({ foreground: MUTED_TEXT_COLOR, dim: true }),
              }),
            ],
          }),
        });
      } else {
        contentWidget = new RichText({
          text: new TextSpan({
            text: placeholder,
            style: new TextStyle({ foreground: MUTED_TEXT_COLOR, dim: true }),
          }),
        });
      }
    } else if (hasFocus) {
      // 实际文本 + 光标 (反色) — only when focused
      const textStyle = new TextStyle({ foreground: TEXT_COLOR });
      const cursorStyle = new TextStyle({
        foreground: CURSOR_FG_COLOR,
        background: CURSOR_BG_COLOR,
      });

      // 检测 shell prompt — 渲染时着色 + 自动空格
      // 逆向: YTR (modules/2726_unknown_YTR.js) — prompt rules 定义了 $/$$ 的显示规则
      const shellPromptInfo = getShellPromptInfo(text);

      if (shellPromptInfo) {
        // ════════════════════════════════════════════════
        // Shell 模式: prefix (着色) + 自动空格 + command
        // ════════════════════════════════════════════════
        const { prefix, prefixLength, prefixStyle, command } = shellPromptInfo;
        const cursorPos = this._controller.cursorPosition;

        // 光标在命令中的位置: cursorPos - prefixLength (clamp to >= 0)
        const cursorPosInCmd = Math.max(0, cursorPos - prefixLength);

        // 分割命令文本
        const cmdBeforeCursor = command.slice(0, cursorPosInCmd);
        const cursorChar = command[cursorPosInCmd] || " ";
        const cmdAfterCursor = command.slice(cursorPosInCmd + 1);

        // 构建 TextSpan:
        // prefix (shell 色) + " " (自动空格) + cmdBefore + cursor + cmdAfter
        const children: TextSpan[] = [
          new TextSpan({ text: prefix, style: prefixStyle }),
          new TextSpan({ text: " ".repeat(SHELL_PROMPT_SPACING), style: textStyle }),
          new TextSpan({ text: cmdBeforeCursor, style: textStyle }),
          new TextSpan({ text: cursorChar, style: cursorStyle }),
        ];
        if (cmdAfterCursor) {
          children.push(new TextSpan({ text: cmdAfterCursor, style: textStyle }));
        }

        contentWidget = new RichText({
          text: new TextSpan({ children }),
        });
      } else {
        // ════════════════════════════════════════════════
        // 普通模式
        // ════════════════════════════════════════════════
        const cursorPos = this._controller.cursorPosition;
        const before = text.slice(0, cursorPos);
        const cursorChar = text[cursorPos] || " ";
        const after = text.slice(cursorPos + 1);

        contentWidget = new RichText({
          text: new TextSpan({
            children: [
              new TextSpan({ text: before, style: textStyle }),
              new TextSpan({ text: cursorChar, style: cursorStyle }),
              ...(after ? [new TextSpan({ text: after, style: textStyle })] : []),
            ],
          }),
        });
      }
    } else {
      // Text without cursor — unfocused
      const textStyle = new TextStyle({ foreground: TEXT_COLOR });
      contentWidget = new RichText({
        text: new TextSpan({ text, style: textStyle }),
      });
    }

    // 逆向: chunk-006.js:13474-13476 — dynamic height (minLines=3, maxLines=null, expands=true)
    const borderInnerWidth = this.widget.config.width ?? terminalWidth - 4;

    // Top border with overlay labels
    // 逆向: Rt._buildOverlayWidgets (jetbrains_wizard.js:32-175)
    // amp uses dim style for label text, plain border style for ─ chars
    const topLeft = this.widget.config.topLeftLabel ?? "";
    const topRight = this.widget.config.topRightLabel ?? "";
    const topLeftStr = topLeft ? `${topLeft}\u2500` : "";
    const topRightStr = topRight ? `\u2500${topRight}` : "";
    const topFillLen = Math.max(0, borderInnerWidth - topLeftStr.length - topRightStr.length);
    // 逆向: jetbrains_wizard.js:6074-6096 — label text uses { color: foreground, dim: true }
    const labelStyle = new TextStyle({ foreground: borderColor, dim: true });

    // Bottom border with overlay labels
    // 逆向: k8R.build() (chunk-006.js:31497) — currentShellModeStatus → "shell mode" / "shell mode (incognito)"
    const bottomLeft = shellResult
      ? shellResult.visibility === "hidden"
        ? "shell mode (incognito)"
        : "shell mode"
      : (this.widget.config.bottomLeftLabel ?? "");
    const bottomRight = this.widget.config.bottomRightLabel ?? "";
    const bottomLeftStr = bottomLeft ? `${bottomLeft}\u2500` : "";
    const bottomRightStr = bottomRight ? `\u2500${bottomRight}` : "";
    const bottomFillLen = Math.max(
      0,
      borderInnerWidth - bottomLeftStr.length - bottomRightStr.length,
    );
    const bottomBorder = `\u2570\u2500${bottomLeftStr}${"\u2500".repeat(bottomFillLen)}${bottomRightStr}\u2500\u256F`;

    return new Column({
      mainAxisSize: "min",
      children: [
        // 顶部边框: ╭─{label}─...─{label}─╮
        // 逆向: jetbrains_wizard.js:6074-6096 — labels use dim, border chars use borderStyle
        new RichText({
          text: new TextSpan({
            style: borderStyle,
            children: [
              new TextSpan({ text: `\u256D\u2500` }),
              ...(topLeft
                ? [
                    new TextSpan({ text: topLeft, style: labelStyle }),
                    new TextSpan({ text: "\u2500" }),
                  ]
                : []),
              new TextSpan({ text: "\u2500".repeat(topFillLen) }),
              ...(topRight
                ? [
                    new TextSpan({ text: "\u2500" }),
                    new TextSpan({ text: topRight, style: labelStyle }),
                  ]
                : []),
              new TextSpan({ text: `\u2500\u256E` }),
            ],
          }),
        }),
        // topWidget inside border (e.g. ShortcutsPopup)
        // 逆向: k8R topWidget (chunk-006.js:37662-37664) — rendered inside
        // the TextField's BoxDecoration border, above the text input area.
        // We use a Container with left+right borders only (no top/bottom)
        // so that │ side borders are painted on every row of the topWidget.
        ...(this.widget.config.topWidget
          ? [
              new Container({
                width: borderInnerWidth + 4,
                padding: EdgeInsets.symmetric({ horizontal: 1 }),
                decoration: new BoxDecoration({
                  border: new Border(
                    undefined, // no top
                    new BorderSide(borderColor, 1, "rounded"),
                    undefined, // no bottom
                    new BorderSide(borderColor, 1, "rounded"),
                  ),
                }),
                child: this.widget.config.topWidget,
              }),
              // Separator between topWidget and input area
              // 逆向: U8R returns xR { children: [...shortcuts, separator] }
              // where separator is a horizontal rule connecting the side borders
              new RichText({
                text: new TextSpan({
                  text: `├${"─".repeat(borderInnerWidth + 2)}┤`,
                  style: borderStyle,
                }),
              }),
            ]
          : []),
        // 内容区: │ content │ (3 行, 左右各 │ 边框)
        // 逆向: amp SR._paintGridBorders 自动绘制 │ 侧边框
        // 附件栏 (逆向: chunk-006.js:13426-13458 — images bar above text area)
        ...this._buildAttachmentBar(borderInnerWidth, borderStyle),
        ...this._buildContentRows(contentWidget, borderInnerWidth, borderStyle),
        // 底部边框: ╰──...──╯
        new RichText({
          text: new TextSpan({ text: bottomBorder, style: borderStyle }),
        }),
      ],
    });
  }

  /**
   * 构建图片附件栏 — 显示在输入文本上方、边框内部。
   *
   * 逆向: chunk-006.js:13426-13458 — Images: [Image 1] [Image 2] ...
   * 仅在有图片附件时显示，格式为 "│ Images: [Image 1] [Image 2] │"
   *
   * @param innerWidth - 内容区宽度
   * @param borderStyle - 边框文本样式
   * @returns Widget 列表（0 或 1 个 Row）
   */
  private _buildAttachmentBar(innerWidth: number, borderStyle: TextStyle): Widget[] {
    const attachments = this._getEffectiveAttachments();
    if (attachments.length === 0) return [];

    const SIDE = "\u2502"; // │

    // 逆向: chunk-006.js:13428-13429 — "Images: " 前缀 (dim)
    const labelStyle = new TextStyle({ foreground: MUTED_TEXT_COLOR, dim: true });
    const imageStyle = new TextStyle({ foreground: Color.green(), underline: true });

    // Build text: "Images: [Image 1] [Image 2] ..."
    const children: TextSpan[] = [new TextSpan({ text: "Images: ", style: labelStyle })];
    for (let i = 0; i < attachments.length; i++) {
      // 逆向: chunk-006.js:13441 — `[Image ${s + 1}]`
      children.push(new TextSpan({ text: `[Image ${i + 1}]`, style: imageStyle }));
      if (i < attachments.length - 1) {
        children.push(new TextSpan({ text: " " }));
      }
    }

    const attachmentWidget = new RichText({
      text: new TextSpan({ children }),
    });

    return [
      new Row({
        mainAxisSize: "min",
        children: [
          new RichText({ text: new TextSpan({ text: `${SIDE} `, style: borderStyle }) }),
          new SizedBox({ width: innerWidth, child: attachmentWidget }),
          new RichText({ text: new TextSpan({ text: ` ${SIDE}`, style: borderStyle }) }),
        ],
      }),
    ];
  }

  /**
   * 构建带 │ 侧边框的内容行。
   *
   * 动态高度: 根据文本行数生成内容行，最少 minLines 行 (默认 3)。
   * 当文本行数超过 minLines 时，行数随内容增长。
   * 外层 ConstrainedBox (在 ThreadStateWidget 中) 提供 maxHeight 约束，
   * 超出时由 Container 裁剪实现滚动效果。
   *
   * 逆向: chunk-006.js:13474-13476 — textFieldProps: { minLines: 3, maxLines: null, expands: true }
   * 逆向: chunk-006.js:36929 — I = Math.max(Math.floor(a.size.height * 0.4), 12)
   * 逆向: chunk-006.js:36992-36994 — SR({ constraints: new o0(0, width, 0, I), child: L })
   * 逆向: amp SR._paintGridBorders 自动在 BoxDecoration border 区域绘制 │
   */
  private _buildContentRows(
    contentWidget: Widget,
    innerWidth: number,
    borderStyle: TextStyle,
  ): Widget[] {
    const SIDE = "\u2502"; // │
    const rows: Widget[] = [];

    // 逆向: chunk-006.js:13474 — minLines: this.props.minLines ?? 3
    const minLines = this.widget.config.minLines ?? 3;

    // 计算文本实际需要的行数 (考虑换行 + 宽度自动折行)
    const text = this._controller.text;
    const textLineCount = this._computeTextLineCount(text, innerWidth);

    // 动态行数: max(minLines, textLineCount)
    // 逆向: chunk-006.js:13475-13476 — maxLines: null, expands: true
    // TextField expands to fill available space, minimum minLines
    const totalLines = Math.max(minLines, textLineCount);

    // ── Internal scroll viewport ──────────────────────────────────────────
    // 逆向: chunk-006.js:4185-4206 — RenderScrollable.performLayout()
    //   子节点用无限高约束布局 (new o0(minW, maxW, 0, POSITIVE_INFINITY))，
    //   然后 updateChildOffset() 设置 setOffset(0, -scrollOffset) 裁剪显示。
    // 逆向: chunk-006.js:4201-4205 — scrollController.updateMaxScrollExtent(t)
    //   followMode 时 jumpTo 底部，否则 clamp offset。
    //
    // maxLines: 外层传入的最大可见行数。减去附件栏等占用后的纯文本区域高度。
    // 当 totalLines > maxLines 时启用滚动裁剪。
    const maxLines = this.widget.config.maxLines;
    let visibleLines = totalLines;
    let scrollOffset = 0;

    if (maxLines !== undefined && totalLines > maxLines) {
      visibleLines = maxLines;

      // 计算光标所在行，自动滚动保持光标可见
      // 逆向: RenderEditable 的 _showCaret 方法确保光标不会滚出视口
      const cursorLine = this._computeCursorLine(text, this._controller.cursorPosition, innerWidth);

      // 调整 scrollOffset 保持光标可见
      if (cursorLine < this._textScrollOffset) {
        // 光标在视口上方 → 上滚
        this._textScrollOffset = cursorLine;
      } else if (cursorLine >= this._textScrollOffset + visibleLines) {
        // 光标在视口下方 → 下滚
        this._textScrollOffset = cursorLine - visibleLines + 1;
      }

      // Clamp
      const maxOffset = totalLines - visibleLines;
      this._textScrollOffset = Math.max(0, Math.min(this._textScrollOffset, maxOffset));
      scrollOffset = this._textScrollOffset;
    } else {
      // 不需要滚动时重置偏移
      this._textScrollOffset = 0;
    }

    // Row 1: │ {content} │ — content widget contains cursor and text rendering
    // 只在 scrollOffset === 0 时显示内容 widget (第一行)
    if (scrollOffset === 0) {
      rows.push(
        new Row({
          mainAxisSize: "min",
          children: [
            new RichText({ text: new TextSpan({ text: `${SIDE} `, style: borderStyle }) }),
            new SizedBox({ width: innerWidth, child: contentWidget }),
            new RichText({ text: new TextSpan({ text: ` ${SIDE}`, style: borderStyle }) }),
          ],
        }),
      );
    } else {
      // 当滚动后第一行也是空白行 — content widget 被滚出视口
      const blankFill = " ".repeat(innerWidth);
      rows.push(
        new RichText({
          text: new TextSpan({ text: `${SIDE} ${blankFill} ${SIDE}`, style: borderStyle }),
        }),
      );
    }

    // Remaining visible rows: │ {blank} │
    const blankFill = " ".repeat(innerWidth);
    for (let i = 1; i < visibleLines; i++) {
      rows.push(
        new RichText({
          text: new TextSpan({ text: `${SIDE} ${blankFill} ${SIDE}`, style: borderStyle }),
        }),
      );
    }

    return rows;
  }

  /**
   * 计算文本在给定宽度下占用的行数。
   *
   * 考虑换行符分割的逻辑行，以及每行超过 innerWidth 时的自动折行。
   * 空文本返回 1 (光标/占位符占一行)。
   *
   * 逆向: amp TextField 的 RenderEditable 自动处理 wrap:true 的折行计算，
   * 这里用简化公式近似: 每个逻辑行 ceil(charCount / innerWidth) 行。
   *
   * 注意: Shell 模式下第一行需要加上自动 spacing (YTR spacing: 1)。
   *
   * @param text - 输入文本
   * @param innerWidth - 可用内容宽度 (字符数)
   * @returns 文本需要的显示行数
   */
  private _computeTextLineCount(text: string, innerWidth: number): number {
    if (!text) return 1;
    const lines = text.split("\n");
    const w = Math.max(1, innerWidth);

    // 检测 shell prompt — 只有第一行需要加 spacing
    const shellInfo = getShellPromptInfo(text);
    const firstLineExtra = shellInfo ? SHELL_PROMPT_SPACING : 0;

    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 第一行: 实际长度 + spacing (如果是 shell 模式)
      // 其他行: 实际长度
      const effectiveLength = i === 0 ? line.length + firstLineExtra : line.length;
      count += Math.max(1, Math.ceil(effectiveLength / w));
    }
    return count;
  }

  /**
   * 计算光标所在的显示行号 (0-indexed)。
   *
   * 逆向: amp RenderEditable 内部通过 TextPainter.getOffsetForCaret() 计算光标的
   * 像素位置，然后转换为 scrollOffset。在终端 TUI 中，我们用字符宽度模拟。
   *
   * 注意: Shell 模式下需要考虑:
   * 1. 第一行行宽计算需要加 spacing
   * 2. 光标在 prefix 后时，视觉位置 = 实际位置 + spacing
   *
   * @param text - 输入文本
   * @param cursorPos - 光标字符位置
   * @param innerWidth - 可用内容宽度
   * @returns 光标所在的显示行 (0-indexed)
   */
  private _computeCursorLine(text: string, cursorPos: number, innerWidth: number): number {
    if (!text) return 0;
    const w = Math.max(1, innerWidth);
    const lines = text.split("\n");

    // 检测 shell prompt
    const shellInfo = getShellPromptInfo(text);
    const firstLineExtra = shellInfo ? SHELL_PROMPT_SPACING : 0;

    let displayLine = 0;
    let charsSoFar = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineEnd = charsSoFar + line.length;

      if (cursorPos <= lineEnd) {
        // 光标在当前逻辑行内
        let posInLine = cursorPos - charsSoFar;

        if (i === 0 && shellInfo) {
          // 第一行且是 shell 模式:
          // 1. 如果光标在 prefix 后，视觉位置 = posInLine + spacing
          // 2. 行宽计算需要加 spacing
          const { prefixLength } = shellInfo;
          if (posInLine >= prefixLength) {
            posInLine += SHELL_PROMPT_SPACING;
          }
          const effectiveWidth = w;
          displayLine += Math.floor(posInLine / effectiveWidth);
        } else {
          displayLine += Math.floor(posInLine / w);
        }
        return displayLine;
      }

      // 计算这一行占用的显示行数
      const effectiveLength = i === 0 ? line.length + firstLineExtra : line.length;
      const lineDisplayRows = Math.max(1, Math.ceil(effectiveLength / w));
      displayLine += lineDisplayRows;
      charsSoFar = lineEnd + 1; // +1 for the \n separator
    }

    return displayLine;
  }

  /**
   * 重置文本滚动偏移量。
   *
   * 逆向: chunk-006.js:37074 — this.textController.resetScrollOffset()
   * 在 Escape 清空输入时调用。
   */
  resetScrollOffset(): void {
    this._textScrollOffset = 0;
  }

  // ──────────────────────────────────────────────
  // 内部事件处理
  // ──────────────────────────────────────────────

  /**
   * 处理键盘事件。
   *
   * 逆向: actions_intents.js:1008-1150 — TextField key handler
   *
   * Enter/Submit 行为由 enterSubmitsMessage 配置控制:
   * - enterSubmitsMessage=true (default): Enter 提交, Shift+Enter 插入换行
   * - enterSubmitsMessage=false: Enter 插入换行, Ctrl+Enter / Meta+Enter 提交
   *
   * Emacs-style Ctrl keybindings (逆向: actions_intents.js:1054-1091):
   * - Ctrl+A/E: 行首/行尾  Ctrl+U/K: 删除到行首/行尾
   * - Ctrl+F/B: 右移/左移  Ctrl+D/H: 向后删除/向前删除
   * - Ctrl+W: 删词左  Ctrl+Y: yank  Ctrl+N/P: 下/上移  Ctrl+J: 换行
   *
   * Alt/Meta word-level navigation (逆向: actions_intents.js:1092-1127):
   * - Alt+Left/Alt+B: 词左移  Alt+Right/Alt+F: 词右移
   * - Alt+D: 删词右  Alt+Backspace: 删词左
   * - Meta+Left: 行首  Meta+Right: 行尾
   *
   * @param event - 键盘事件
   * @returns 处理结果
   */
  private _handleKeyEvent(event: KeyEvent): KeyEventResult {
    const m = this._controller;
    const enterSubmits = this.widget.config.enterSubmitsMessage ?? true;

    // ── Enter / Submit handling ──
    // 逆向: actions_intents.js:1011-1039
    if (event.key === "Enter") {
      if (enterSubmits) {
        // Ctrl+Enter or Meta+Enter also submit in this mode
        if (event.modifiers.ctrl || event.modifiers.meta) {
          return this._submitText();
        }
        // Shift+Enter: insert newline
        if (event.modifiers.shift) {
          m.insertText("\n");
          this._markDirty();
          return "handled";
        }
        // Bare Enter: submit
        return this._submitText();
      } else {
        // enterSubmitsMessage=false: Ctrl+Enter or Meta+Enter submits
        if (event.modifiers.ctrl || event.modifiers.meta) {
          return this._submitText();
        }
        // Shift+Enter or bare Enter: insert newline
        m.insertText("\n");
        this._markDirty();
        return "handled";
      }
    }

    // ── Backspace ──
    // 逆向: actions_intents.js:1040-1049
    // 逆向: chunk-006.js:13384-13388 — _handleBackspaceAtStart: pop image when text empty
    if (event.key === "Backspace") {
      // When cursor is at start (text empty or cursor == 0), try removing last attachment
      if (m.text === "" || (m.cursorPosition === 0 && !m.hasSelection)) {
        if (this._handleBackspaceAtStart()) {
          return "handled";
        }
      }
      if (event.modifiers.alt) {
        m.deleteWordLeft();
      } else {
        m.deleteSelectedOrText(1);
      }
      this._markDirty();
      return "handled";
    }

    // ── Delete ──
    // 逆向: actions_intents.js:1050-1052
    if (event.key === "Delete") {
      if (m.hasSelection) {
        m.deleteSelectedText();
      } else {
        m.deleteForward(1);
      }
      this._markDirty();
      return "handled";
    }

    // ── Tab / Escape: pass through ──
    if (event.key === "Tab" || event.key === "Escape") {
      return "ignored";
    }

    // ── Ctrl keybindings ──
    // 逆向: actions_intents.js:1054-1091
    if (event.modifiers.ctrl) {
      // Ctrl+Z: undo / Ctrl+Shift+Z: redo (no amp reference — new feature)
      if (event.key === "z") {
        if (event.modifiers.shift) {
          m.redo();
        } else {
          m.undo();
        }
        this._markDirty();
        return "handled";
      }
      // Ctrl+G: open in editor (逆向: actions_intents.js:1054-1058)
      if (event.key === "g") {
        if (this.widget.config.onOpenInEditor) {
          this.widget.config.onOpenInEditor(m.text);
        }
        return "handled";
      }
      // Ctrl+S: toggle agent mode (逆向: modules/2785_unknown_e0R.js lines 1053-1063)
      // Cycle logic: (findIndex + 1) % visibleModes.length — 2708_unknown_HTR.js:76
      if (event.key === "s") {
        if (this.widget.config.onToggleAgentMode) {
          this.widget.config.onToggleAgentMode();
        }
        return "handled";
      }
      const shift = event.modifiers.shift;
      if (event.key === "a") {
        // Ctrl+A: multiline → line start, single line → document start
        // InputField always supports multiline text (\n), so use moveCursorToLineStart
        m.moveCursorToLineStart({ extend: shift });
        this._markDirty();
        return "handled";
      } else if (event.key === "e") {
        // Ctrl+E: multiline → line end, single line → document end
        m.moveCursorToLineEnd({ extend: shift });
        this._markDirty();
        return "handled";
      } else if (event.key === "u") {
        m.deleteToLineStart();
        this._markDirty();
        return "handled";
      } else if (event.key === "k") {
        m.deleteToLineEnd();
        this._markDirty();
        return "handled";
      } else if (event.key === "f") {
        m.moveCursorRight({ extend: shift });
        this._markDirty();
        return "handled";
      } else if (event.key === "b") {
        m.moveCursorLeft({ extend: shift });
        this._markDirty();
        return "handled";
      } else if (event.key === "n") {
        // Ctrl+N: history next (逆向: chunk-006.js:37243 — DM("next"))
        // Per amp reference, Ctrl+N is history navigation, not cursor movement.
        const history = this.widget.config.promptHistory;
        if (history?.isNavigating) {
          m.text = history.goForward();
          m.moveCursorToEnd({});
          this._markDirty();
          return "handled";
        }
        return "ignored";
      } else if (event.key === "p") {
        // Ctrl+P: history previous (逆向: chunk-006.js:37242 — DM("previous"))
        // Per amp reference, Ctrl+P is history navigation, not cursor movement.
        const history = this.widget.config.promptHistory;
        if (history && history.entries.length > 0) {
          if (!history.isNavigating) {
            history.startNavigation(m.text);
          }
          if (history.canGoBack()) {
            m.text = history.goBack();
            m.moveCursorToStart({});
            this._markDirty();
          }
          return "handled";
        }
        return "ignored";
      } else if (event.key === "d") {
        m.deleteForward(1);
        this._markDirty();
        return "handled";
      } else if (event.key === "h") {
        m.deleteText(1);
        this._markDirty();
        return "handled";
      } else if (event.key === "ArrowLeft") {
        // Ctrl+ArrowLeft: word boundary left (逆向: actions_intents.js:1090)
        m.moveCursorWordBoundary("left", { extend: shift });
        this._markDirty();
        return "handled";
      } else if (event.key === "ArrowRight") {
        // Ctrl+ArrowRight: word boundary right (逆向: actions_intents.js:1090)
        m.moveCursorWordBoundary("right", { extend: shift });
        this._markDirty();
        return "handled";
      } else if (event.key === "w") {
        m.deleteWordLeft();
        this._markDirty();
        return "handled";
      } else if (event.key === "y") {
        m.yankText();
        this._markDirty();
        return "handled";
      } else if (event.key === "j") {
        // Ctrl+J: insert newline (multiline only)
        m.insertText("\n");
        this._markDirty();
        return "handled";
      }
      // Unrecognized Ctrl combo — fall through to "ignored"
    } else if (event.modifiers.alt || event.modifiers.meta) {
      // ── Alt/Meta keybindings ──
      // 逆向: actions_intents.js:1092-1127
      const shift = event.modifiers.shift;

      // Meta+Arrow: line start/end (逆向: actions_intents.js:1093-1098)
      if (event.modifiers.meta && event.key === "ArrowLeft") {
        m.moveCursorToLineStart({ extend: shift });
        this._markDirty();
        return "handled";
      } else if (event.modifiers.meta && event.key === "ArrowRight") {
        m.moveCursorToLineEnd({ extend: shift });
        this._markDirty();
        return "handled";
      }

      // Alt+Arrow or Alt+B/F: word boundary movement (逆向: actions_intents.js:1120-1122)
      const isWordLeft = event.key === "ArrowLeft" || event.key.toLowerCase() === "b";
      const isWordRight = event.key === "ArrowRight" || event.key.toLowerCase() === "f";
      if (isWordLeft || isWordRight) {
        m.moveCursorWordBoundary(isWordLeft ? "left" : "right", { extend: shift });
        this._markDirty();
        return "handled";
      }

      // Alt+D: pass through to key interceptor (toggle deep reasoning)
      // 逆向: amp maps Alt+D to toggleDeepReasoningEffort, NOT deleteWordRight.
      //   Use Alt+Delete for word-delete-right if needed.
      if (event.key.toLowerCase() === "d") {
        return "ignored";
      }

      // Alt+Backspace: delete word left (逆向: actions_intents.js:1045)
      if (event.key === "Backspace") {
        m.deleteWordLeft();
        this._markDirty();
        return "handled";
      }
    } else {
      // ── Arrow keys (no modifiers or shift only) ──
      // 逆向: actions_intents.js:1128-1150
      const shift = event.modifiers.shift;
      if (event.key === "ArrowLeft") {
        m.moveCursorLeft({ extend: shift });
        this._markDirty();
        return "handled";
      } else if (event.key === "ArrowRight") {
        m.moveCursorRight({ extend: shift });
        this._markDirty();
        return "handled";
      } else if (event.key === "ArrowUp") {
        const oldPos = m.cursorPosition;
        m.moveCursorUp({ extend: shift });
        if (m.cursorPosition === oldPos) {
          // At top of text — navigate history
          // 逆向: chunk-006.js:34950-34962 — navigateHistoryPrevious
          const history = this.widget.config.promptHistory;
          if (history && history.entries.length > 0) {
            if (!history.isNavigating) {
              history.startNavigation(m.text);
            }
            if (history.canGoBack()) {
              m.text = history.goBack();
              m.moveCursorToStart({});
              this._markDirty();
              return "handled";
            }
          }
          return "ignored";
        }
        this._markDirty();
        return "handled";
      } else if (event.key === "ArrowDown") {
        const oldPos = m.cursorPosition;
        m.moveCursorDown({ extend: shift });
        if (m.cursorPosition === oldPos) {
          // At bottom of text — navigate history forward
          // 逆向: chunk-006.js:34950-34962 — navigateHistoryNext
          const history = this.widget.config.promptHistory;
          if (history?.isNavigating) {
            m.text = history.goForward();
            m.moveCursorToEnd({});
            this._markDirty();
            return "handled";
          }
          return "ignored";
        }
        this._markDirty();
        return "handled";
      }
    }

    // ── 普通可打印字符 (单字符，无 ctrl/meta 修饰) ──
    // 优先使用 event.text（Kitty Keyboard Protocol 提供的 associated text），
    // 否则回退到 event.key。这确保 Shift+数字键等组合插入正确字符。
    // 逆向: amp 在 InputField 处理中使用 text 字段而非 raw key
    const charToInsert = event.text ?? event.key;
    if (charToInsert.length === 1 && !event.modifiers.ctrl && !event.modifiers.meta) {
      m.insertText(charToInsert);
      this._markDirty();

      // ── @@ thread-mention trigger ──
      // 逆向: actions_intents.js:2326
      //   `if (e.query === "@" && this.props.onDoubleAtTrigger)`
      //   `  return this.props.onDoubleAtTrigger(this.props.controller), [];`
      //
      // After inserting the character, check whether the cursor is now right
      // after a `@@` sequence at a word boundary.  If so, fire the trigger
      // callback — the app layer can then show a thread picker and later call
      // insertThreadMention() on this state to commit the selection.
      if (charToInsert === "@" && this.widget.config.onThreadMentionTrigger) {
        const triggered = detectDoubleAtTrigger(m.text, m.cursorPosition);
        if (triggered !== -1) {
          this.widget.config.onThreadMentionTrigger();
        }
      }

      // ── "/" command palette trigger ──
      // 逆向: jetbrains_wizard.js:3040 — textChangeListener
      //   `if (text === "/") { showCommandPalette(); controller.text = ""; }`
      //
      // When the user types "/" and the input becomes exactly "/",
      // fire the trigger callback to open the command palette, then clear input.
      if (charToInsert === "/" && m.text === "/" && this.widget.config.onSlashCommandTrigger) {
        this.widget.config.onSlashCommandTrigger();
        m.text = "";
        this._markDirty();
      }

      // ── "?" shortcuts toggle trigger ──
      // 逆向: chunk-006.js:36288-36308 — toggle shortcuts when `?` pressed on empty input
      if (charToInsert === "?" && m.text === "?" && this.widget.config.onShortcutsToggle) {
        this.widget.config.onShortcutsToggle();
        m.text = "";
        this._markDirty();
      }

      return "handled";
    }

    return "ignored";
  }

  /**
   * 提交文本内容。
   *
   * 清空输入框并触发 onSubmit 回调（仅在文本非空或有图片附件时）。
   * 逆向: jetbrains_wizard.js:4097 — if (!T.trim() && imageAttachments.length === 0) return
   *
   * @returns 处理结果
   */
  private _submitText(): KeyEventResult {
    const text = this._controller.text;
    const attachments = this._getEffectiveAttachments();
    // 逆向: jetbrains_wizard.js:4097 — 文本空且无附件时不提交
    if (!text.trim() && attachments.length === 0) {
      return "handled";
    }
    // Push to prompt history before clearing
    // 逆向: chunk-006.js:34930 — this.widget.dependencies.history.add(text)
    const history = this.widget.config.promptHistory;
    if (history && text.trim()) history.push(text);
    this._controller.text = "";
    // 逆向: jetbrains_wizard.js:4157 — this.imageAttachments = []
    const submittedAttachments = attachments.length > 0 ? [...attachments] : undefined;
    this._imageAttachments = [];
    this.widget.config.onImageAttachmentsChanged?.(this._imageAttachments);
    this.widget.config.onSubmit(text, submittedAttachments);
    this._markDirty();
    return "handled";
  }

  /**
   * Insert a thread mention into the input, replacing the `@@` trigger.
   *
   * Finds the last `@@` before the cursor and replaces it with `@<threadId>`,
   * appending a trailing space when the cursor is at the end of text.
   * If no `@@` is found, falls back to inserting `@<threadId> ` at cursor.
   *
   * 逆向: jetbrains_wizard.js:3188-3201 — insertThreadMention
   *
   * @param threadId - Thread identifier to insert
   */
  insertThreadMention(threadId: string): void {
    const m = this._controller;
    const result = insertThreadMentionUtil(m.text, m.cursorPosition, threadId);
    m.text = result.text;
    m.cursorPosition = result.cursorPosition;
    this._markDirty();
  }

  /**
   * 处理粘贴事件。
   *
   * 逆向: chunk-006.js:13335-13344 — controller.onInsertText 拦截粘贴
   * 粘贴优先级:
   * 1. 文本长度 > 3 时检测图片文件路径 (gE0)
   * 2. 如果粘贴文本为空/很短，尝试从系统剪贴板读取二进制图片
   * 3. 否则正常插入文本
   *
   * @param event - 粘贴事件
   * @returns 处理结果
   */
  private _handlePasteEvent(event: PasteEvent): KeyEventResult {
    const text = event.text;

    // 逆向: chunk-006.js:13336 — if (T.length <= 3) return !0 (太短不检测路径)
    if (text.length > 3) {
      // 逆向: chunk-006.js:13337 — let a = gE0(T)
      const imagePaths = extractImagePaths(text);
      if (imagePaths.length > 0) {
        // 逆向: chunk-006.js:13339-13342 — onInsertImage 回调
        if (this.widget.config.onInsertImage) {
          for (const path of imagePaths) {
            this.widget.config.onInsertImage(path);
          }
        } else {
          // 非受控模式：内部处理图片路径 → 附件
          this._handleImagePaths(imagePaths);
        }
        this._markDirty();
        return "handled";
      }
    }

    // 如果粘贴文本为空或只有空白（可能是二进制图片粘贴场景），
    // 尝试从系统剪贴板读取图片
    // 逆向: chunk-004.js:32086 — VTR() 剪贴板图片读取
    if (!text.trim()) {
      this._tryReadClipboardImage();
      return "handled";
    }

    // 普通文本粘贴
    this._controller.insertText(text);
    this._markDirty();
    return "handled";
  }

  /**
   * 异步尝试从系统剪贴板读取二进制图片。
   *
   * 逆向: chunk-004.js:32086 — VTR() clipboard image read
   * 读取成功则添加到附件列表。
   */
  private async _tryReadClipboardImage(): Promise<void> {
    try {
      const result = await readClipboardImage();
      if (result) {
        const { readFile } = await import("node:fs/promises");
        const data = await readFile(result.path);
        const attachment: ImageAttachment = {
          type: "image",
          source: {
            type: "base64",
            data: data.toString("base64"),
            mediaType: result.mimeType,
          },
          sourcePath: result.path,
        };
        this.addImageAttachment(attachment);
      }
    } catch {
      // 剪贴板读取失败 — 静默忽略
    }
  }

  /**
   * 处理退格键在文本开头的行为 — 移除最后一个图片附件。
   *
   * 逆向: chunk-006.js:13384-13388 — _handleBackspaceAtStart
   *   if (this.props.imageAttachments.length > 0 && this.props.popImage)
   *     return this.props.popImage(), !0
   *
   * @returns true if an attachment was removed
   */
  private _handleBackspaceAtStart(): boolean {
    const attachments = this._getEffectiveAttachments();
    if (attachments.length > 0) {
      // 逆向: jetbrains_wizard.js:3704-3705 — imageAttachments.slice(0, -1)
      this._imageAttachments = this._imageAttachments.slice(0, -1);
      this.widget.config.onImageAttachmentsChanged?.(this._imageAttachments);
      this._markDirty();
      return true;
    }
    return false;
  }

  /**
   * 获取有效的图片附件列表（受控模式用 props，非受控模式用内部状态）。
   *
   * 逆向: chunk-006.js:13399 — this.props.imageAttachments
   */
  private _getEffectiveAttachments(): ImageAttachment[] {
    return this.widget.config.imageAttachments ?? this._imageAttachments;
  }

  /**
   * 添加图片附件（内部使用，非受控模式）。
   *
   * 逆向: jetbrains_wizard.js:3694-3698 — if >= pb return; push to array
   *
   * @param attachment - 要添加的图片附件
   * @returns true if added successfully
   */
  addImageAttachment(attachment: ImageAttachment): boolean {
    if (this._getEffectiveAttachments().length >= MAX_IMAGE_ATTACHMENTS) {
      return false;
    }
    this._imageAttachments = [...this._imageAttachments, attachment];
    this.widget.config.onImageAttachmentsChanged?.(this._imageAttachments);
    this._markDirty();
    return true;
  }

  /**
   * 内部处理图片文件路径列表 — 读取文件并转为 base64 附件。
   *
   * 逆向: chunk-004.js:21229-21255 — GH(T) async image handling
   */
  private _handleImagePaths(paths: string[]): void {
    for (const imagePath of paths) {
      if (this._getEffectiveAttachments().length >= MAX_IMAGE_ATTACHMENTS) break;
      // 异步读取文件 — fire-and-forget, 读取完成后更新状态
      this._readImageFile(imagePath);
    }
  }

  /**
   * 异步读取图片文件并添加到附件列表。
   *
   * 逆向: chunk-004.js:21229-21255 — GH() reads file, validates, converts to base64
   */
  private async _readImageFile(imagePath: string): Promise<void> {
    try {
      const { readFile } = await import("node:fs/promises");
      const { extname } = await import("node:path");
      const data = await readFile(imagePath);
      const ext = extname(imagePath).toLowerCase().replace(".", "");
      const mediaType = extToMimeType(ext);
      const attachment: ImageAttachment = {
        type: "image",
        source: {
          type: "base64",
          data: data.toString("base64"),
          mediaType,
        },
        sourcePath: imagePath,
      };
      this.addImageAttachment(attachment);
    } catch {
      // 逆向: chunk-004.js:21235 — Failed to read image file, log and ignore
    }
  }

  /**
   * 标记需要重建 (仅在已挂载时)。
   *
   * 在 _element 可用时安全调用 setState。
   */
  private _markDirty(): void {
    if (this._mounted && this._element) {
      this._element.markNeedsRebuild();
    }
  }
}

// ════════════════════════════════════════════════════
//  图片路径检测工具函数
// ════════════════════════════════════════════════════

/**
 * 从粘贴文本中提取图片文件路径。
 *
 * 逆向: chunk-004.js:21216-21222 — gE0(T)
 * 1. trim + 去除首尾引号
 * 2. 按换行分割得到多行；如果只有一行，尝试按图片扩展名 + 空格 + 引号/路径 分割
 * 3. 逐项调用 extractSingleImagePath 验证是否为有效图片绝对路径
 *
 * @param text - 粘贴的原始文本
 * @returns 有效的绝对图片文件路径列表
 */
export function extractImagePaths(text: string): string[] {
  // 逆向: chunk-004.js:21217 — T.trim().replace(/^["']|["']$/g, "")
  const trimmed = text.trim().replace(/^["']|["']$/g, "");
  // 逆向: chunk-004.js:21218-21219 — split by newline, filter empty
  let lines = trimmed.split("\n").filter(Boolean);
  // 逆向: chunk-004.js:21220 — if single line, try split by image ext boundary
  if (lines.length === 1) {
    lines = trimmed.split(/(?<=\.(?:png|jpe?g|gif|webp))\s+(?=["']?\/)/i);
  }
  // 逆向: chunk-004.js:21221 — map through IE0, filter nulls
  return lines.map((line) => extractSingleImagePath(line)).filter((p): p is string => p !== null);
}

/**
 * 验证单个文本片段是否为有效图片文件绝对路径。
 *
 * 逆向: modules/2469_unknown_IE0.js:4-12 — IE0(T)
 * 1. trim + 去除首尾引号
 * 2. 反转义 (\\. → .)
 * 3. 转换 unicode 转义 u{XXXX}
 * 4. 检查扩展名 .png/.jpg/.jpeg/.gif/.webp
 * 5. 必须是绝对路径
 *
 * @param text - 单个路径文本
 * @returns 有效的绝对路径或 null
 */
export function extractSingleImagePath(text: string): string | null {
  // 逆向: IE0 line 5 — trim + strip quotes
  let cleaned = text.trim().replace(/^["']|["']$/g, "");
  // 逆向: IE0 line 6 — unescape backslash sequences
  cleaned = cleaned.replace(/\\(.)/g, "$1");
  // 逆向: IE0 line 6 — convert u{XXXX} unicode escapes
  cleaned = cleaned.replace(/u\{([0-9a-fA-F]+)\}/g, (_match, hex) =>
    String.fromCodePoint(parseInt(hex, 16)),
  );
  // 逆向: IE0 line 6 — must end with image extension
  if (!/\.(png|jpe?g|gif|webp)$/i.test(cleaned)) return null;
  // 逆向: IE0 line 7 — must be absolute path
  if (!isAbsolutePath(cleaned)) return null;
  return cleaned;
}

/**
 * 检测路径是否为绝对路径 (跨平台)。
 *
 * 逆向: IE0 使用 rB.isAbsolute(R)
 */
function isAbsolutePath(p: string): boolean {
  // Unix absolute: starts with /
  if (p.startsWith("/")) return true;
  // Windows absolute: C:\ or C:/
  if (/^[a-zA-Z]:[/\\]/.test(p)) return true;
  return false;
}

/**
 * 文件扩展名转 MIME 类型。
 *
 * 逆向: chunk-004.js:21239-21241 — eG(r) extension to mediaType
 */
function extToMimeType(ext: string): string {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}
