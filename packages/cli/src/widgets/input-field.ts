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
 * - 高度 1-5 行动态调整
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
  Color,
  Column,
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
import { detectShellCommand, getShellModeBorderColor } from "./command-detection.js";

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
 * 逆向: cursor uses inverse video. We use indexed 0 (black) for the
 * cursor character foreground so it contrasts against the default bg.
 * This is the closest terminal-native approach without an 'inverse' SGR attr. */
const BG_COLOR = Color.indexed(0);

/** 默认边框宽度 (80 列终端 - 2 列边框字符) */
const DEFAULT_BORDER_INNER_WIDTH = 78;

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
  /** 提交回调 */
  onSubmit: (text: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 历史记录导航 (optional) */
  promptHistory?: import("./prompt-history.js").PromptHistory;
  /** Override width for border rendering (default: derived from MediaQuery or 78) */
  width?: number;
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
   * - 高度: 1-5 行动态调整
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
    if (isEmpty) {
      // 占位符文本
      const placeholder = this.widget.config.placeholder ?? "Type a message...";
      contentWidget = new RichText({
        text: new TextSpan({
          text: placeholder,
          style: new TextStyle({ foreground: MUTED_TEXT_COLOR, dim: true }),
        }),
      });
    } else {
      // 实际文本 + 光标 (反色)
      const cursorPos = this._controller.cursorPosition;
      const before = text.slice(0, cursorPos);
      const cursorChar = text[cursorPos] || " ";
      const after = text.slice(cursorPos + 1);

      const textStyle = new TextStyle({ foreground: TEXT_COLOR });
      const cursorStyle = new TextStyle({
        foreground: BG_COLOR,
        background: TEXT_COLOR,
      });

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

    // Fixed 3-row height (逆向: YrT maxHeight, text_rendering.js:2395)
    const borderInnerWidth = this.widget.config.width ?? terminalWidth - 4;

    // Top border with overlay labels
    // 逆向: Rt._buildOverlayWidgets (jetbrains_wizard.js:32-175)
    const topLeft = this.widget.config.topLeftLabel ?? "";
    const topRight = this.widget.config.topRightLabel ?? "";
    const topLeftStr = topLeft ? `${topLeft}\u2500` : "";
    const topRightStr = topRight ? `\u2500${topRight}` : "";
    const topFillLen = Math.max(0, borderInnerWidth - topLeftStr.length - topRightStr.length);
    const topBorder = `\u256D\u2500${topLeftStr}${"\u2500".repeat(topFillLen)}${topRightStr}\u2500\u256E`;

    // Bottom border with overlay labels
    const bottomLeft = this.widget.config.bottomLeftLabel ?? "";
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
        // 顶部边框: ╭──...──╮
        new RichText({
          text: new TextSpan({ text: topBorder, style: borderStyle }),
        }),
        // 内容区: │ content │ (3 行, 左右各 │ 边框)
        // 逆向: amp SR._paintGridBorders 自动绘制 │ 侧边框
        ...this._buildContentRows(contentWidget, borderInnerWidth, borderStyle),
        // 底部边框: ╰──...──╯
        new RichText({
          text: new TextSpan({ text: bottomBorder, style: borderStyle }),
        }),
      ],
    });
  }

  /**
   * 构建带 │ 侧边框的内容行。
   *
   * 生成 3 行 (固定高度):
   *   │ {content padded to innerWidth} │
   *   │ {空白 padded to innerWidth}    │
   *   │ {空白 padded to innerWidth}    │
   *
   * 逆向: amp SR._paintGridBorders 自动在 BoxDecoration border 区域绘制 │
   */
  private _buildContentRows(
    contentWidget: Widget,
    innerWidth: number,
    borderStyle: TextStyle,
  ): Widget[] {
    const SIDE = "\u2502"; // │
    const rows: Widget[] = [];

    // Row 1: │ {content} │
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

    // Rows 2-3: │ {blank} │
    const blankFill = " ".repeat(innerWidth);
    for (let i = 0; i < 2; i++) {
      rows.push(
        new RichText({
          text: new TextSpan({ text: `${SIDE} ${blankFill} ${SIDE}`, style: borderStyle }),
        }),
      );
    }

    return rows;
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
    if (event.key === "Backspace") {
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
        // Ctrl+N: move down (with amp edge-case logic)
        // 逆向: actions_intents.js:1065-1078
        const line = m.cursorLine;
        const lineCount = m.lineCount;
        if (line === lineCount - 1) {
          // On last line: if not at end, move to line end; else ignored
          const gs = m.graphemes;
          // Find end of current line (count graphemes until newline or end)
          let lineEnd = m.cursorPosition;
          while (lineEnd < gs.length && gs[lineEnd] !== "\n") lineEnd++;
          if (m.cursorPosition === lineEnd) {
            return "ignored";
          } else {
            m.moveCursorToLineEnd({ extend: shift });
            this._markDirty();
            return "handled";
          }
        } else {
          const oldPos = m.cursorPosition;
          m.moveCursorDown({ extend: shift });
          if (m.cursorPosition === oldPos) return "ignored";
          this._markDirty();
          return "handled";
        }
      } else if (event.key === "p") {
        // Ctrl+P: move up (with amp edge-case logic)
        // 逆向: actions_intents.js:1079-1089
        const line = m.cursorLine;
        if (line === 0) {
          const oldPos = m.cursorPosition;
          m.moveCursorToLineStart({ extend: shift });
          if (m.cursorPosition === oldPos) return "ignored";
          this._markDirty();
          return "handled";
        } else {
          const oldPos = m.cursorPosition;
          m.moveCursorUp({ extend: shift });
          if (m.cursorPosition === oldPos) return "ignored";
          this._markDirty();
          return "handled";
        }
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

      // Alt+D: delete word right (逆向: actions_intents.js:1123-1127)
      if (event.key.toLowerCase() === "d") {
        const lenBefore = m.text.length;
        m.deleteWordRight();
        if (m.text.length < lenBefore) {
          this._markDirty();
          return "handled";
        }
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
        if (m.cursorPosition === oldPos) return "ignored";
        this._markDirty();
        return "handled";
      } else if (event.key === "ArrowDown") {
        const oldPos = m.cursorPosition;
        m.moveCursorDown({ extend: shift });
        if (m.cursorPosition === oldPos) return "ignored";
        this._markDirty();
        return "handled";
      }
    }

    // ── 普通可打印字符 (单字符，无 ctrl/meta 修饰) ──
    if (event.key.length === 1 && !event.modifiers.ctrl && !event.modifiers.meta) {
      m.insertText(event.key);
      this._markDirty();
      return "handled";
    }

    return "ignored";
  }

  /**
   * 提交文本内容。
   *
   * 清空输入框并触发 onSubmit 回调（仅在文本非空时）。
   *
   * @returns 处理结果
   */
  private _submitText(): KeyEventResult {
    const text = this._controller.text;
    if (text.trim()) {
      this._controller.text = "";
      this.widget.config.onSubmit(text);
    }
    return "handled";
  }

  /**
   * 处理粘贴事件。
   *
   * @param event - 粘贴事件
   * @returns 处理结果
   */
  private _handlePasteEvent(event: PasteEvent): KeyEventResult {
    this._controller.insertText(event.text);
    this._markDirty();
    return "handled";
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
