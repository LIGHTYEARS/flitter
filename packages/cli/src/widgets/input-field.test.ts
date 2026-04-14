/**
 * InputField + ConversationView 测试。
 *
 * 验证:
 * - InputField.createState 返回 InputFieldState
 * - initState: 创建 FocusNode 和 TextEditingController
 * - initState: FocusNode 注册到 FocusManager
 * - _handleKeyEvent: 普通字符 -> insertText
 * - _handleKeyEvent: Backspace -> deleteText
 * - _handleKeyEvent: Enter -> onSubmit 回调
 * - _handleKeyEvent: Enter + 空文本 -> 不触发 onSubmit
 * - _handlePasteEvent: 调用 insertText
 * - dispose: 注销 FocusNode 和销毁 TextEditingController
 * - ConversationView.createState 返回 ConversationViewState
 *
 * @module
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { InputField, InputFieldState, type InputFieldConfig } from "./input-field.js";
import {
  ConversationView,
  ConversationViewState,
  type ConversationViewConfig,
  type Message,
} from "./conversation-view.js";
import { StatefulWidget, State, FocusManager, FocusNode } from "@flitter/tui";
import type { KeyEvent, PasteEvent } from "@flitter/tui";

// ─── 测试辅助 ─────────────────────────────────────────

/** MODIFIERS_NONE 快捷引用 */
const NO_MODS = { shift: false, alt: false, ctrl: false, meta: false };

/**
 * 创建 InputFieldState 并模拟挂载生命周期。
 *
 * 模拟 StatefulElement.mount 的行为:
 * 1. 创建 State
 * 2. 设置 _widget 和 _element
 * 3. 设置 _mounted = true
 * 4. 调用 initState()
 */
function mountInputField(config: InputFieldConfig): {
  widget: InputField;
  state: InputFieldState;
  fm: FocusManager;
} {
  const fm = FocusManager.instance;
  const widget = new InputField(config);
  const state = widget.createState() as InputFieldState;

  // 模拟 StatefulElement 挂载: _mount() + initState()
  const mockElement = { markNeedsRebuild: mock(() => {}) } as any;
  (state as any)._widget = widget;
  (state as any)._element = mockElement;
  (state as any)._mounted = true;
  state.initState();

  return { widget, state, fm };
}

// ════════════════════════════════════════════════════
//  InputField 测试
// ════════════════════════════════════════════════════

describe("InputField", () => {
  afterEach(() => {
    // 每个测试后重置 FocusManager 单例
    try {
      FocusManager.instance.dispose();
    } catch {
      /* ignore */
    }
  });

  it("extends StatefulWidget", () => {
    const field = new InputField({ onSubmit: () => {} });
    expect(field).toBeInstanceOf(StatefulWidget);
  });

  it("createState returns InputFieldState", () => {
    const field = new InputField({ onSubmit: () => {} });
    const state = field.createState();
    expect(state).toBeInstanceOf(InputFieldState);
  });

  it("stores config", () => {
    const onSubmit = mock(() => {});
    const field = new InputField({ onSubmit, placeholder: "Type here..." });
    expect(field.config.onSubmit).toBe(onSubmit);
    expect(field.config.placeholder).toBe("Type here...");
  });
});

// ════════════════════════════════════════════════════
//  InputFieldState 测试
// ════════════════════════════════════════════════════

describe("InputFieldState", () => {
  afterEach(() => {
    try {
      FocusManager.instance.dispose();
    } catch {
      /* ignore */
    }
  });

  it("initState creates FocusNode and registers with FocusManager", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });
    // FocusNode 应已注册并持有焦点
    expect(fm.primaryFocus).not.toBeNull();
    expect(fm.primaryFocus!.debugLabel).toBe("InputField");

    // 清理
    state.dispose();
  });

  it("initState creates TextEditingController", () => {
    const { state } = mountInputField({ onSubmit: () => {} });
    // 通过发送字符验证 controller 存在
    const keyEvent: KeyEvent = {
      type: "key",
      key: "a",
      modifiers: NO_MODS,
    };
    // FocusManager 将事件路由到 InputField 的 FocusNode
    const fm = FocusManager.instance;
    const handled = fm.handleKeyEvent(keyEvent);
    expect(handled).toBe(true);

    state.dispose();
  });

  it("handles character key input -> insertText", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // 发送字符 'h', 'i'
    fm.handleKeyEvent({ type: "key", key: "h", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "i", modifiers: NO_MODS });

    // 通过 Enter 提交来验证文本内容
    const onSubmit = mock(() => {});
    (state as any)._widget = new InputField({ onSubmit });
    // 更新 widget 引用使 onSubmit 生效
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    expect(onSubmit).toHaveBeenCalledWith("hi");

    state.dispose();
  });

  it("handles Backspace -> deleteText", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // 输入 'abc' 然后 Backspace
    fm.handleKeyEvent({ type: "key", key: "a", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "b", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "c", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "Backspace", modifiers: NO_MODS });

    // 验证: 通过 Enter 提交确认文本为 "ab"
    const onSubmit = mock(() => {});
    (state as any)._widget = new InputField({ onSubmit });
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    expect(onSubmit).toHaveBeenCalledWith("ab");

    state.dispose();
  });

  it("handles Enter -> onSubmit callback with text", () => {
    const onSubmit = mock(() => {});
    const { state, fm } = mountInputField({ onSubmit });

    // 输入 "hello"
    for (const ch of "hello") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }

    // Enter 触发 onSubmit
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("hello");

    state.dispose();
  });

  it("clears text after Enter submit", () => {
    const onSubmit = mock(() => {});
    const { state, fm } = mountInputField({ onSubmit });

    // 输入 "hello" 并 Enter
    for (const ch of "hello") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });

    // 再次 Enter，不应触发 (文本已清空)
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    expect(onSubmit).toHaveBeenCalledTimes(1);

    state.dispose();
  });

  it("Enter with empty text does NOT trigger onSubmit", () => {
    const onSubmit = mock(() => {});
    const { state, fm } = mountInputField({ onSubmit });

    // 不输入任何文本就 Enter
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    expect(onSubmit).not.toHaveBeenCalled();

    state.dispose();
  });

  it("Enter with whitespace-only text does NOT trigger onSubmit", () => {
    const onSubmit = mock(() => {});
    const { state, fm } = mountInputField({ onSubmit });

    // 输入空格
    fm.handleKeyEvent({ type: "key", key: " ", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: " ", modifiers: NO_MODS });

    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    expect(onSubmit).not.toHaveBeenCalled();

    state.dispose();
  });

  it("handles paste event -> insertText", () => {
    const onSubmit = mock(() => {});
    const { state, fm } = mountInputField({ onSubmit });

    // 粘贴文本
    const pasteEvent: PasteEvent = { type: "paste", text: "pasted content" };
    const handled = fm.handlePasteEvent(pasteEvent);
    expect(handled).toBe(true);

    // 验证: Enter 提交应包含粘贴的文本
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    expect(onSubmit).toHaveBeenCalledWith("pasted content");

    state.dispose();
  });

  it("ignores ctrl/meta key combinations", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // Ctrl+C 应该被 ignored
    const result = fm.handleKeyEvent({
      type: "key",
      key: "c",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false },
    });
    // "ignored" 意味着事件冒泡到根也没处理，handleKeyEvent 返回 false
    expect(result).toBe(false);

    state.dispose();
  });

  it("dispose unregisters FocusNode and disposes TextEditingController", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // 确认初始状态有焦点
    expect(fm.primaryFocus).not.toBeNull();

    // dispose
    state.dispose();

    // FocusNode 应已从 FocusManager 注销
    // primaryFocus 应为 null 或其他节点
    const focusableNodes = fm.findAllFocusableNodes();
    const hasInputNode = focusableNodes.some(
      (n) => n.debugLabel === "InputField",
    );
    expect(hasInputNode).toBe(false);
  });
});

// ════════════════════════════════════════════════════
//  ConversationView 测试
// ════════════════════════════════════════════════════

describe("ConversationView", () => {
  it("extends StatefulWidget", () => {
    const view = new ConversationView({ messages: [] });
    expect(view).toBeInstanceOf(StatefulWidget);
  });

  it("createState returns ConversationViewState", () => {
    const view = new ConversationView({ messages: [] });
    const state = view.createState();
    expect(state).toBeInstanceOf(ConversationViewState);
  });

  it("stores messages config", () => {
    const messages: Message[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
      { role: "system", content: "System prompt" },
    ];
    const view = new ConversationView({ messages });
    expect(view.config.messages).toBe(messages);
    expect(view.config.messages).toHaveLength(3);
  });

  it("ConversationViewState.build returns a Widget", () => {
    const messages: Message[] = [
      { role: "user", content: "Hello" },
    ];
    const view = new ConversationView({ messages });
    const state = view.createState() as ConversationViewState;

    // 模拟挂载
    const mockElement = { markNeedsRebuild: mock(() => {}) } as any;
    (state as any)._widget = view;
    (state as any)._element = mockElement;
    (state as any)._mounted = true;
    state.initState();

    const built = state.build({} as any);
    expect(built).toBeDefined();
    expect(built).not.toBeNull();
  });
});
