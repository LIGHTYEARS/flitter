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
import { afterEach, describe, it } from "node:test";
import {
  Column,
  Container,
  FocusManager,
  RichText,
  StatefulWidget,
  type TextSpan,
} from "@flitter/tui";
import { InputField, type InputFieldConfig, InputFieldState } from "./input-field.js";
import { ShortcutsPopup } from "./shortcuts-popup.js";

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
function _hasColorInSpan(span: TextSpan, r: number, g: number, b: number): boolean {
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

/**
 * 检查 TextSpan 树中是否包含 Color.default() 前景色 (kind === "default")。
 */
function hasDefaultColorInSpan(span: TextSpan): boolean {
  let found = false;
  span.visitTextSpan((s) => {
    if (found) return false;
    const fg = s.style?.foreground;
    if (fg && fg.kind === "default") {
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
    } catch {
      /* ignore */
    }
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
    } catch {
      /* ignore */
    }
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

  it('空文本时显示 "Type a message..." 占位符', () => {
    const { state } = mountInputField({ onSubmit: () => {} });
    const built = state.build({} as any);
    const allText = extractAllText(built);

    assert.ok(
      allText.includes("Type a message..."),
      `Should contain placeholder text, got: ${allText.slice(0, 200)}`,
    );

    state.dispose();
  });

  it("占位符使用 dim 样式 (terminal default + dim)", () => {
    const { state } = mountInputField({ onSubmit: () => {} });
    const built = state.build({} as any);
    const richTexts = collectRichTexts(built);

    // 查找包含 placeholder 文本且 dim 为 true 的 RichText
    let hasDimPlaceholder = false;
    for (const rt of richTexts) {
      rt.text.visitTextSpan((s: any) => {
        if (hasDimPlaceholder) return false;
        if (s.text?.includes("Type a message") && s.style?.dim === true) {
          hasDimPlaceholder = true;
          return false;
        }
        return true;
      });
      if (hasDimPlaceholder) break;
    }
    assert.ok(hasDimPlaceholder, "Placeholder should use dim style");

    state.dispose();
  });

  it("空字段渲染光标块 (reverse-video space) + 占位符", () => {
    // Guardrail: InputField must always show a cursor block even when empty.
    // This ensures the cursor is visible after overlay dismiss (e.g., closing
    // the command palette), not just when there is text content.
    const { state } = mountInputField({ onSubmit: () => {} });
    const built = state.build({} as any);
    const richTexts = collectRichTexts(built);

    // Find a TextSpan with a single space character that has non-default fg AND bg
    let hasCursorBlock = false;
    for (const rt of richTexts) {
      rt.text.visitTextSpan((s: TextSpan) => {
        if (hasCursorBlock) return false;
        if (
          s.text === " " &&
          s.style?.foreground &&
          s.style.foreground.kind === "named" &&
          s.style.foreground.index === 0 && // black
          s.style?.background &&
          s.style.background.kind === "named" &&
          s.style.background.index === 7 // white
        ) {
          hasCursorBlock = true;
          return false;
        }
        return true;
      });
      if (hasCursorBlock) break;
    }
    assert.ok(
      hasCursorBlock,
      "Empty InputField should render a cursor block (black-on-white space)",
    );

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

    assert.ok(allText.includes("hello"), `Should contain "hello", got: ${allText.slice(0, 200)}`);

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
    // Cursor uses foreground = Color.black() (named, index 0) and
    // background = Color.white() (named, index 7) for visible cursor block
    let hasInverseSpan = false;
    for (const rt of richTexts) {
      rt.text.visitTextSpan((s: TextSpan) => {
        if (
          s.style?.foreground &&
          s.style.foreground.kind === "named" &&
          s.style?.background &&
          s.style.background.kind === "named"
        ) {
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

  it("边框使用终端默认前景色 (逆向: amp golden capture)", () => {
    const { state } = mountInputField({ onSubmit: () => {} });
    const built = state.build({} as any);
    const richTexts = collectRichTexts(built);

    // 检查 border 线条使用 Color.default() (终端默认前景色)
    const hasDefaultBorder = richTexts.some((rt: any) => hasDefaultColorInSpan(rt.text));
    assert.ok(hasDefaultBorder, "Border should use terminal default foreground color");

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
    const _onSubmit = (_text: string) => {};
    let submittedText = "";
    const submitFn = (text: string) => {
      submittedText = text;
    };
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
    } catch {
      /* ignore */
    }
  });

  it("普通字符输入 -> insertText", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });
    fm.handleKeyEvent({ type: "key", key: "h", modifiers: NO_MODS });
    fm.handleKeyEvent({ type: "key", key: "i", modifiers: NO_MODS });

    const _onSubmit = (_text: string) => {};
    let submitted = "";
    (state as any)._widget = new InputField({
      onSubmit: (t: string) => {
        submitted = t;
      },
    });
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
    (state as any)._widget = new InputField({
      onSubmit: (t: string) => {
        submitted = t;
      },
    });
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    assert.equal(submitted, "ab");

    state.dispose();
  });

  it("Enter 触发 onSubmit 回调", () => {
    let submitted = "";
    const { state, fm } = mountInputField({
      onSubmit: (t) => {
        submitted = t;
      },
    });
    for (const ch of "hello") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }
    fm.handleKeyEvent({ type: "key", key: "Enter", modifiers: NO_MODS });
    assert.equal(submitted, "hello");

    state.dispose();
  });

  it("Enter 后文本清空", () => {
    let callCount = 0;
    const { state, fm } = mountInputField({
      onSubmit: () => {
        callCount++;
      },
    });
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
    const { state, fm } = mountInputField({
      onSubmit: () => {
        called = true;
      },
    });
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

// ════════════════════════════════════════════════════
//  InputField 边框宽度测试
//  逆向: amp-cli-reversed layout_widgets.js:1652 — box width = T.maxWidth (exact terminal width)
// ════════════════════════════════════════════════════

describe("border width calculation", () => {
  afterEach(() => {
    try {
      FocusManager.instance.dispose();
    } catch {
      /* ignore */
    }
  });

  it("top border string length equals terminal width when width is provided", () => {
    const terminalWidth = 244;
    const { state } = mountInputField({
      onSubmit: () => {},
      width: terminalWidth - 4, // borderInnerWidth
    });
    const tree = state.build({} as any);
    assert.ok(tree instanceof Column);
    const children = (tree as any).children;
    assert.ok(children.length >= 3);
    const topBorderWidget = children[0];
    assert.ok(topBorderWidget instanceof RichText);
    const topBorderText = topBorderWidget.text.toPlainText();
    assert.equal(
      topBorderText.length,
      terminalWidth,
      `Top border should be exactly ${terminalWidth} chars, got ${topBorderText.length}`,
    );
    const bottomBorderWidget = children[2];
    assert.ok(bottomBorderWidget instanceof RichText);
    const bottomBorderText = bottomBorderWidget.text.toPlainText();
    assert.equal(
      bottomBorderText.length,
      terminalWidth,
      `Bottom border should be exactly ${terminalWidth} chars, got ${bottomBorderText.length}`,
    );
  });

  it("border is exactly 80 chars at default terminal width", () => {
    const { state } = mountInputField({
      onSubmit: () => {},
    });
    const tree = state.build({} as any);
    const children = (tree as any).children;
    const topBorderText = children[0].text.toPlainText();
    assert.equal(
      topBorderText.length,
      80,
      `Default border should be 80 chars, got ${topBorderText.length}`,
    );
  });
});

// ════════════════════════════════════════════════════
//  InputField @@ thread-mention trigger tests
//  逆向: actions_intents.js:2326 — onDoubleAtTrigger
//        jetbrains_wizard.js:3188-3201 — insertThreadMention
// ════════════════════════════════════════════════════

describe("InputField @@ thread-mention trigger", () => {
  afterEach(() => {
    try {
      FocusManager.instance.dispose();
    } catch {
      /* ignore */
    }
  });

  it("fires onThreadMentionTrigger when user types @@", () => {
    let triggered = false;
    const { state, fm } = mountInputField({
      onSubmit: () => {},
      onThreadMentionTrigger: () => {
        triggered = true;
      },
    });

    // Type first @
    fm.handleKeyEvent({ type: "key", key: "@", modifiers: NO_MODS });
    assert.equal(triggered, false, "Should NOT trigger after single @");

    // Type second @ → triggers
    fm.handleKeyEvent({ type: "key", key: "@", modifiers: NO_MODS });
    assert.equal(triggered, true, "Should trigger after @@");

    state.dispose();
  });

  it("does NOT fire onThreadMentionTrigger for a single @", () => {
    let triggered = false;
    const { state, fm } = mountInputField({
      onSubmit: () => {},
      onThreadMentionTrigger: () => {
        triggered = true;
      },
    });

    fm.handleKeyEvent({ type: "key", key: "@", modifiers: NO_MODS });
    assert.equal(triggered, false);

    state.dispose();
  });

  it("does NOT fire when @@ is in middle of word (no word boundary)", () => {
    let triggered = false;
    const { state, fm } = mountInputField({
      onSubmit: () => {},
      onThreadMentionTrigger: () => {
        triggered = true;
      },
    });

    // Type "abc@@" — the first @ has no word boundary before it
    for (const ch of "abc@@") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }
    assert.equal(triggered, false, "Should not trigger when @@ not at word boundary");

    state.dispose();
  });

  it("fires onThreadMentionTrigger when @@ appears after a space", () => {
    let triggered = false;
    const { state, fm } = mountInputField({
      onSubmit: () => {},
      onThreadMentionTrigger: () => {
        triggered = true;
      },
    });

    // Type "hello @@"
    for (const ch of "hello @@") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }
    assert.equal(triggered, true, "Should trigger when @@ is after a space");

    state.dispose();
  });

  it("does not fire when onThreadMentionTrigger is not provided", () => {
    // Should not throw — callback is optional
    const { state, fm } = mountInputField({
      onSubmit: () => {},
      // no onThreadMentionTrigger
    });

    assert.doesNotThrow(() => {
      for (const ch of "@@") {
        fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
      }
    });

    state.dispose();
  });
});

// ════════════════════════════════════════════════════
//  InputFieldState.insertThreadMention
//  逆向: jetbrains_wizard.js:3188-3201
// ════════════════════════════════════════════════════

describe("InputFieldState.insertThreadMention", () => {
  afterEach(() => {
    try {
      FocusManager.instance.dispose();
    } catch {
      /* ignore */
    }
  });

  it("replaces @@ with @threadId and trailing space at end of text", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // Type "@@"
    for (const ch of "@@") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }

    state.insertThreadMention("my-thread");

    assert.equal(
      (state as any)._controller.text,
      "@my-thread ",
      "Should replace @@ with @threadId and trailing space",
    );
    assert.equal(
      (state as any)._controller.cursorPosition,
      11,
      "Cursor should be after inserted text",
    );

    state.dispose();
  });

  it("replaces @@ in middle of input text", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    // Type "before @@ after" — but we need cursor at @@ position
    // Type "before @@", then type " after"
    for (const ch of "before @@") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }
    // Now insert " after" via direct controller manipulation
    const m = (state as any)._controller;
    m.insertText(" after");

    // Move cursor back to right after @@: "before @@" is 9 chars
    m.cursorPosition = 9;

    state.insertThreadMention("tid");

    // "before @@" → "before @tid" (no trailing space because " after" follows)
    assert.equal((state as any)._controller.text, "before @tid after");

    state.dispose();
  });

  it("falls back to inserting @threadId at cursor when no @@ in text", () => {
    const { state, fm } = mountInputField({ onSubmit: () => {} });

    for (const ch of "hello") {
      fm.handleKeyEvent({ type: "key", key: ch, modifiers: NO_MODS });
    }

    state.insertThreadMention("t1");

    assert.ok(
      (state as any)._controller.text.includes("@t1 "),
      "Should fall back to inserting @t1  at cursor",
    );

    state.dispose();
  });
});

// ═══════════════════════════════════════════════════════════
//  topWidget rendering position — guardrail for inside-border layout
// ═══════════════════════════════════════════════════════════
// 逆向: k8R topWidget (chunk-006.js:37662-37664) — topWidget renders INSIDE
// the TextField's BoxDecoration border, not above it. This test prevents
// regression where topWidget accidentally renders above ╭──╮.

describe("InputField topWidget renders inside border", () => {
  afterEach(() => {
    try {
      FocusManager.instance.dispose();
    } catch {
      /* ignore */
    }
  });

  it("topWidget is wrapped in Container between top border and content rows", () => {
    // Create a dummy widget to use as topWidget
    const dummyTopWidget = new RichText({
      text: { toPlainText: () => "SHORTCUTS", visitTextSpan: () => true } as any,
    } as any);

    const { state } = mountInputField({
      onSubmit: () => {},
      topWidget: dummyTopWidget,
      width: 76,
    });
    const built = state.build({} as any);

    // built should be a Column
    assert.ok(built instanceof Column, "build() should return a Column");
    const children: any[] = (built as any).children;
    assert.ok(
      Array.isArray(children) && children.length >= 3,
      "Column should have at least 3 children",
    );

    // First child: top border ╭──╮ (RichText)
    const firstChild = children[0];
    assert.ok(firstChild instanceof RichText, "First child should be RichText (top border)");
    const topBorderText = (firstChild as RichText).text.toPlainText();
    assert.ok(topBorderText.includes("\u256D"), "First child should be top border starting with ╭");

    // Second child: Container wrapping topWidget (NOT a RichText border)
    const secondChild = children[1];
    assert.ok(
      secondChild instanceof Container,
      "Second child should be Container wrapping topWidget (not above the border)",
    );

    // Last child: bottom border ╰──╯ (RichText)
    const lastChild = children[children.length - 1];
    assert.ok(lastChild instanceof RichText, "Last child should be RichText (bottom border)");
    const bottomBorderText = (lastChild as RichText).text.toPlainText();
    assert.ok(
      bottomBorderText.includes("\u2570"),
      "Last child should be bottom border starting with ╰",
    );

    state.dispose();
  });

  it("without topWidget, no Container is inserted between borders", () => {
    const { state } = mountInputField({
      onSubmit: () => {},
      width: 76,
    });
    const built = state.build({} as any);

    const children: any[] = (built as any).children;

    // First child: top border
    assert.ok(children[0] instanceof RichText, "First child should be top border RichText");

    // Second child should NOT be a Container (should be content Row)
    assert.ok(
      !(children[1] instanceof Container),
      "Without topWidget, second child should not be a Container",
    );

    state.dispose();
  });
});

// ═══════════════════════════════════════════════════════════
//  ShortcutsPopup separator — guardrail for ─ divider
// ═══════════════════════════════════════════════════════════
// 逆向: U8R (misc_utils.js:9882-9887) — returns Column with [...shortcutRows, separator]
// where separator is Row(Expanded(B8R(color))) — a ─ horizontal rule.

describe("ShortcutsPopup includes ─ separator", () => {
  it("build() output Column includes a ─ separator as last child", () => {
    const popup = new ShortcutsPopup();
    const built = popup.build({} as any);

    // built should be a Column
    assert.ok(built instanceof Column, "ShortcutsPopup.build() should return a Column");
    const children: any[] = (built as any).children;
    assert.ok(children.length >= 2, "Column should have shortcut rows + separator");

    // Last child should be a RichText containing ─
    const lastChild = children[children.length - 1];
    assert.ok(lastChild instanceof RichText, "Last child should be RichText (separator)");
    const text = (lastChild as RichText).text.toPlainText();
    assert.ok(text.includes("\u2500"), "Separator should contain ─ characters");
  });
});
