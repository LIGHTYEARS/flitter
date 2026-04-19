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

import { StatefulWidget, State, Column, SizedBox, Padding, EdgeInsets, RichText, TextSpan, MediaQuery } from "@flitter/tui";
import { TextStyle } from "@flitter/tui";
import { Color } from "@flitter/tui";
import type { Widget, Element } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";
import { TextEditingController } from "@flitter/tui";
import { FocusNode, type KeyEventResult } from "@flitter/tui";
import { FocusManager } from "@flitter/tui";
import type { KeyEvent, PasteEvent } from "@flitter/tui";
import { detectShellCommand, getShellModeBorderColor } from "./command-detection.js";

// ════════════════════════════════════════════════════
//  颜色常量
// ════════════════════════════════════════════════════

/** primary 色 (#7aa2f7) -- 聚焦边框 */
const PRIMARY_COLOR = Color.rgb(0x7a, 0xa2, 0xf7);

/** border 色 (#3b4261) -- 非聚焦边框 */
const BORDER_COLOR = Color.rgb(0x3b, 0x42, 0x61);

/** mutedText 色 (#565f89) -- 占位符 */
const MUTED_TEXT_COLOR = Color.rgb(0x56, 0x5f, 0x89);

/** text 色 (#a9b1d6) -- 输入文本 */
const TEXT_COLOR = Color.rgb(0xa9, 0xb1, 0xd6);

/** background 色 (#16161e) -- 光标反色前景 */
const BG_COLOR = Color.rgb(0x16, 0x16, 0x1e);

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
    const isFocused = this._focusNode.hasFocus;

    // 逆向: amp uses I9.sizeOf(T).width for dynamic border sizing
    // MediaQuery.sizeOf requires Element, BuildContext is Element at runtime
    let terminalWidth = DEFAULT_BORDER_INNER_WIDTH + 2; // fallback: 80
    try {
      terminalWidth = MediaQuery.sizeOf(_context as unknown as Element).width;
    } catch {
      // MediaQuery not in ancestor tree (e.g., unit tests) — use default
    }

    // 边框颜色: shell 模式使用 shellMode/shellModeHidden 色, 否则 primary/border
    // 逆向: k8R.build() (chunk-006.js:31497) — currentShellModeStatus ? MN0(R, status) : e.selectedMessage
    const shellResult = detectShellCommand(text);
    let borderColor: Color;
    if (shellResult) {
      borderColor = getShellModeBorderColor(shellResult.visibility);
    } else {
      borderColor = isFocused ? PRIMARY_COLOR : BORDER_COLOR;
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
          style: new TextStyle({ foreground: MUTED_TEXT_COLOR }),
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

    // 计算行数: clamp 到 1-5
    const lineCount = Math.min(5, Math.max(1, (text.match(/\n/g) || []).length + 1));

    // 边框字符 — 逆向: amp uses MediaQuery width for dynamic sizing
    const borderInnerWidth = this.widget.config.width ?? (terminalWidth - 2);
    const horizontalLine = "\u2500".repeat(borderInnerWidth);
    const topBorder = `\u250C${horizontalLine}\u2510`;
    const bottomBorder = `\u2514${horizontalLine}\u2518`;

    return new Column({
      mainAxisSize: "min",
      children: [
        // 顶部边框: ┌──...──┐
        new RichText({
          text: new TextSpan({ text: topBorder, style: borderStyle }),
        }),
        // 内容区 (带 1 列左右 padding)
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new SizedBox({
            height: lineCount,
            child: contentWidget,
          }),
        }),
        // 底部边框: └──...──┘
        new RichText({
          text: new TextSpan({ text: bottomBorder, style: borderStyle }),
        }),
      ],
    });
  }

  // ──────────────────────────────────────────────
  // 内部事件处理
  // ──────────────────────────────────────────────

  /**
   * 处理键盘事件。
   *
   * - Shift+Enter: 插入换行 (多行模式)
   * - Enter (无 Shift): 触发 onSubmit 回调 (文本非空时)
   * - Backspace: 向前删除一个字符
   * - 普通字符 (非 Ctrl/Meta): 插入文本
   *
   * @param event - 键盘事件
   * @returns 处理结果
   */
  private _handleKeyEvent(event: KeyEvent): KeyEventResult {
    // Shift+Enter: 插入换行
    if (event.key === "Enter" && event.modifiers.shift) {
      this._controller.insertText("\n");
      this._markDirty();
      return "handled";
    }

    // Enter (无 Shift): 提交
    if (event.key === "Enter" && !event.modifiers.shift) {
      const text = this._controller.text;
      if (text.trim()) {
        this._controller.text = "";
        this.widget.config.onSubmit(text);
      }
      return "handled";
    }

    if (event.key === "Backspace") {
      this._controller.deleteText();
      this._markDirty();
      return "handled";
    }

    // 普通可打印字符 (单字符，无 ctrl/meta 修饰)
    if (
      event.key.length === 1 &&
      !event.modifiers.ctrl &&
      !event.modifiers.meta
    ) {
      this._controller.insertText(event.key);
      this._markDirty();
      return "handled";
    }

    return "ignored";
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
