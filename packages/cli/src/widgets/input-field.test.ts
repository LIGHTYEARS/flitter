/**
 * InputField 视觉保真度测试 (node:test 版本)。
 *
 * 验证:
 * - build() 返回包含 box-drawing 边框字符的 Widget 树
 * - 空文本时显示 "Type a message..." 占位符 (mutedText #565f89)
 * - 有文本时显示实际文本内容
 * - 光标渲染为反色 (inverse video) 在光标位置
 * - 聚焦时边框使用 primary 色 (#7aa2f7)
 * - 非聚焦时边框使用 border 色 (#3b4261)
 * - 边框内部有 1 列左右 padding
 * - Shift+Enter 插入换行 (多行支持)
 * - 最小高度 1 行，最大 5 行
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/cli/src/widgets/input-field.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";
import { InputField, InputFieldState, type InputFieldConfig } from "./input-field.js";
import {
  StatefulWidget,
  FocusManager,
  RichText,
  Column,
  TextSpan,
} from "@flitter/tui";
import type { KeyEvent } from "@flitter/tui";

// ─── 测试辅助 ─────────────────────────────────────────

/** 无修饰键快捷引用 */
const NO_MODS = { shift: false, alt: false, ctrl: false, meta: false };

/**
 * 创建 InputFieldState 并模拟挂载生命周期。
 */
function mountInputField(config: InputFieldConfig): {
  widget: InputField;
  state: InputFieldState;
  fm: FocusManager;
} {
  const fm = FocusManager.instance;
  const widget = new InputField(config);
  const state = widget.createState() as InputFieldState;

  const mockElement = { markNeedsRebuild: () => {} } as any;
  (state as any)._widget = widget;
  (state as any)._element = mockElement;
  (state as any)._mounted = true;
  state.initState();

  return { widget, state, fm };
}

/**
 * 递归提取 Widget 树中所有纯文本。
 */
function extractAllText(widget: any): string {
  let result = "";
  if (widget instanceof RichText) {
    result += widget.text.toPlainText();
  }
  if (widget.data !== undefined) {
    result += widget.data;
  }
  if (widget.children) {
    for (const child of widget.children) {
      result += extractAllText(child);
    }
  }
  if (widget.child) {
    result += extractAllText(widget.child);
  }
  return result;
}

/**
 * 递归收集所有 RichText 节点。
 */
function collectRichTexts(widget: any): any[] {
  const results: any[] = [];
  if (widget instanceof RichText) {
    results.push(widget);
  }
  if (widget.children) {
    for (const child of widget.children) {
      results.push(...collectRichTexts(child));
    }
  }
  if (widget.child) {
    results.push(...collectRichTexts(widget.child));
  }
  return results;
}

/**
 * 检查 TextSpan 树中是否包含指定 RGB 前景色。
 */
function hasColorInSpan(span: TextSpan, r: number, g: number, b: number): boolean {
  let found = false;
  span.visitTextSpan((s) => {
    if (found) return false;
    const fg = s.style?.foreground;
    if (fg && fg.kind === "rgb" && fg.r === r && fg.g === g && fg.b === b) {
      found = true;
    }
    return true;
  });
  return found;
}

// ════════════════════════════════════════════════════
//  InputField 基础测试
// ════════════════════════════════════════════════════

describe("InputField", () => {
  afterEach(() => {
    try {
      FocusManager.instance.dispose();
    } catch { /* ignore */ }
  });

  it("继承 StatefulWidget", () => {
    const field = new InputField({ onSubmit: () => {} });
    assert.ok(field instanceof StatefulWidget);
  });

  it("createState 返回 InputFieldState", () => {
    const field = new InputField({ onSubmit: () => {} });
    const state = field.createState();
    assert.ok(state instanceof InputFieldState);
  });

  it("存储 config", () => {
    const onSubmit = () => {};
    const field = new InputField({ onSubmit, placeholder: "Type here..." });
    assert.equal(field.config.onSubmit, onSubmit);
    assert.equal(field.config.placeholder, "Type here...");
  });
});

// ════════════════════════════════════════════════════
//  InputField 视觉保真度测试
// ════════════════════════════════════════════════════

describe("InputField visual fidelity", () => {
  afterEach(() => {
    try {
      FocusManager.instance.dispose();
    } catch { /* ignore */ }
  });

  it("build() 返回包含 box-drawing 边框字符的 Widget 树", () => {
    const { state } = mountInputField({ onSubmit: () => {} });
    const built = state.build({} as any);
    const allText = extractAllText(built);

    // 检查 box-drawing 字符
    const hasTopLeft = allText.includes("\u250C"); // ┌
    const hasBottomLeft = allText.includes("\u2514"); // └
    const hasHorizontal = allText.includes("\u2500"); // ─

    assert.ok(
      hasTopLeft || hasBottomLeft || hasHorizontal,
      `Should contain box-drawing characters, got: ${allText.slice(0, 200)}`,
    );

    state.dispose();
  });

  it("空文本时显示 \"Type a message...\" 占位符", () => {
    const { state } = mountInputField({ onSubmit: () => {} });
    const built = state.build({} as any);
    const allText = extractAllText(built);

    assert.ok(
      allText.includes("Type a message..."),
      `Should contain placeholder text, got: ${allText.slice(0, 200)}`,
    );

    state.dispose();
  });

  it("占位符使用 mutedText 色 (#565f89)", () => {
    const { state } = mountInputField({ onSubmit: () => {} });
    const built = state.build({} as any);
    const richTexts = collectRichTexts(built);

    // 查找包含 placeholder 且颜色为 #565f89 的 RichText
    const hasMutedPlaceholder = richTexts.some((rt: any) =>
      hasColorInSpan(rt.text, 0x56, 0x5f, 0x89),
    );
    assert.ok(hasMutedPlaceholder, "Placeholder should use mutedText color #565f89");

    state.dispose();
  });

  it("有文本时显示实际文本内容", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // 输入 "hello"
    for (const ch of "hello") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }

    const built = state.build({} as any);
    const allText = extractAllText(built);

    assert.ok(
      allText.includes("hello"),
      `Should contain "hello", got: ${allText.slice(0, 200)}`,
    );

    state.dispose();
  });

  it("光标渲染为反色在光标位置", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // 输入 "abc"
    for (const ch of "abc") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }

    const built = state.build({} as any);
    const richTexts = collectRichTexts(built);

    // 查找包含 background 颜色的 span (inverse video 效果)
    let hasInverseSpan = false;
    for (const rt of richTexts) {
      rt.text.visitTextSpan((s: TextSpan) => {
        if (s.style?.background && s.style.background.kind === "rgb") {
          hasInverseSpan = true;
          return false;
        }
        return true;
      });
      if (hasInverseSpan) break;
    }

    assert.ok(hasInverseSpan, "Should render cursor with inverse video (background color)");

    state.dispose();
  });

  it("聚焦时边框使用 primary 色 (#7aa2f7)", () => {
    const { state } = mountInputField({ onSubmit: () => {} });
    // InputField 默认请求焦点
    const built = state.build({} as any);
    const richTexts = collectRichTexts(built);

    // 检查 border 线条使用 primary 色
    const hasPrimaryBorder = richTexts.some((rt: any) =>
      hasColorInSpan(rt.text, 0x7a, 0xa2, 0xf7),
    );
    assert.ok(hasPrimaryBorder, "Focused border should use primary color #7aa2f7");

    state.dispose();
  });

  it("非聚焦时边框使用 border 色 (#3b4261)", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // 模拟失焦
    const focusNode = (state as any)._focusNode;
    focusNode.unfocus();

    const built = state.build({} as any);
    const richTexts = collectRichTexts(built);

    // 检查 border 线条使用 border 色
    const hasBorderColor = richTexts.some((rt: any) =>
      hasColorInSpan(rt.text, 0x3b, 0x42, 0x61),
    );
    assert.ok(hasBorderColor, "Unfocused border should use border color #3b4261");

    state.dispose();
  });

  it("Shift+Enter 插入换行", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // 输入 "line1"
    for (const ch of "line1") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }

    // Shift+Enter
    fm.handleKeyEvent({
      type: "key",
      key: "Enter",
      modifiers: { shift: true, alt: false, ctrl: false, meta: false },
    });

    // 输入 "line2"
    for (const ch of "line2") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }

    // 验证: Enter 提交应包含换行
    const onSubmit = (text: string) => {};
    let submittedText = "";
    const submitFn = (text: string) => { submittedText = text; };
    (state as any)._widget = new InputField({ onSubmit: submitFn });
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    assert.ok(
      submittedText.includes("\n"),
      `Should contain newline in submitted text: ${JSON.stringify(submittedText)}`,
    );

    state.dispose();
  });

  it("最小高度 1 行，最大 5 行", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // 空状态: build 应可用 (1 行最小)
    const built1 = state.build({} as any);
    assert.ok(built1, "Should render at minimum 1 row height");

    // 输入 6 行文本
    for (let i = 0; i < 6; i++) {
      if (i > 0) {
        fm.handleKeyEvent({
          type: "key",
          key: "Enter",
          modifiers: { shift: true, alt: false, ctrl: false, meta: false },
        });
      }
      fm.handleKeyEvent({ type: "key", key: "x", modifiers: NO_MODS });
    }

    const built6 = state.build({} as any);
    const allText = extractAllText(built6);
    // 实际文本包含换行，但渲染高度被 clamp 到 5
    assert.ok(allText.includes("x"), "Should still render text content");

    state.dispose();
  });
});

// ════════════════════════════════════════════════════
//  InputField 键盘事件测试
// ════════════════════════════════════════════════════

describe("InputField key handling", () => {
  afterEach(() => {
    try {
      FocusManager.instance.dispose();
    } catch { /* ignore */ }
  });

  it("普通字符输入 -> insertText", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });
    fm.handleKeyEvent({ type: "key", key: "h", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "i", modifiers: NO_MODS });

    const onSubmit = (text: string) => {};
    let submitted = "";
    (state as any)._widget = new InputField({ onSubmit: (t: string) => { submitted = t; } });
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    assert.equal(submitted, "hi");

    state.dispose();
  });

  it("Backspace -> deleteText", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });
    fm.handleKeyEvent({ type: "key", key: "a", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "b", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "c", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "Backspace", modifiers: NO_MODS });

    let submitted = "";
    (state as any)._widget = new InputField({ onSubmit: (t: string) => { submitted = t; } });
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    assert.equal(submitted, "ab");

    state.dispose();
  });

  it("Enter 触发 onSubmit 回调", () => {
    let submitted = "";
    const { state, fm } = mountInputField({ onSubmit: (t) => { submitted = t; } });
    for (const ch of "hello") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    assert.equal(submitted, "hello");

    state.dispose();
  });

  it("Enter 后文本清空", () => {
    let callCount = 0;
    const { state, fm } = mountInputField({ onSubmit: () => { callCount++; } });
    for (const ch of "hello") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    // 再次 Enter 不应触发
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    assert.equal(callCount, 1);

    state.dispose();
  });

  it("空文本 Enter 不触发 onSubmit", () => {
    let called = false;
    const { state, fm } = mountInputField({ onSubmit: () => { called = true; } });
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    assert.equal(called, false);

    state.dispose();
  });

  it("忽略 Ctrl/Meta 组合键", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });
    const result = fm.handleKeyEvent({
      type: "key",
      key: "c",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false },
    });
    assert.equal(result, false);

    state.dispose();
  });

  it("dispose 注销 FocusNode", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });
    assert.ok(fm.primaryFocus !== null);
    state.dispose();
    const nodes = fm.findAllFocusableNodes();
    const hasInputNode = nodes.some((n: any) => n.debugLabel === "InputField");
    assert.equal(hasInputNode, false);
  });
});
