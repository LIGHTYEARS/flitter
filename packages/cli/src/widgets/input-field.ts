/**
 * InputField -- 文本输入框 Widget。
 *
 * 集成 FocusNode + TextEditingController，处理键盘和粘贴输入。
 * Enter 键触发 onSubmit 回调，Backspace 删除字符，普通字符插入文本。
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

import { StatefulWidget, State } from "@flitter/tui";
import type { Widget } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";
import { TextEditingController } from "@flitter/tui";
import { FocusNode, type KeyEventResult } from "@flitter/tui";
import { FocusManager } from "@flitter/tui";
import type { KeyEvent, PasteEvent } from "@flitter/tui";
import { Text } from "@flitter/tui";

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
}

// ════════════════════════════════════════════════════
//  InputField
// ════════════════════════════════════════════════════

/**
 * InputField -- 文本输入框 Widget。
 *
 * 集成 FocusNode + TextEditingController，处理键盘和粘贴输入。
 * Enter 键触发 onSubmit 回调。
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
 * - 键盘事件: 普通字符 -> insertText, Backspace -> deleteText, Enter -> onSubmit
 * - 粘贴事件: insertText
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
   * 最小实现: 返回一个表示输入框的 Widget。
   * 实际渲染由 TUI 框架的 RenderObject 处理。
   *
   * @param _context - 构建上下文
   * @returns Widget 占位
   */
  build(_context: BuildContext): Widget {
    return new Text({ data: this._controller.text || " " });
  }

  // ──────────────────────────────────────────────
  // 内部事件处理
  // ──────────────────────────────────────────────

  /**
   * 处理键盘事件。
   *
   * - Enter (无 Shift): 触发 onSubmit 回调 (文本非空时)
   * - Backspace: 向前删除一个字符
   * - 普通字符 (非 Ctrl/Meta): 插入文本
   *
   * @param event - 键盘事件
   * @returns 处理结果
   */
  private _handleKeyEvent(event: KeyEvent): KeyEventResult {
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
