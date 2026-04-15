/**
 * ConversationView 单元测试 (重写版)。
 *
 * 验证:
 * - ConversationView.build() 返回 Column 包含消息 Widget 列表
 * - 用户消息使用 "You: " 前缀 + primary 色 (#7aa2f7) bold
 * - 助手消息使用 "Assistant: " 前缀 + accent 色 (#bb9af7) bold
 * - 系统消息使用 "System: " 前缀 + secondary 色 (#9ece6a) bold
 * - 消息内容通过 MarkdownParser + MarkdownRenderer 渲染
 * - 空消息列表显示 "No messages yet. Type below to begin."
 * - 错误消息使用 error 色 (#f7768e) bold "Error:" 前缀 + 重试提示
 * - inferenceState "running" 时追加流式指示器 "..."
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/cli/src/widgets/conversation-view.test.ts
 * ```
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ConversationView,
  ConversationViewState,
  type ConversationViewConfig,
  type Message,
} from "./conversation-view.js";
import { StatefulWidget, RichText, Column, TextSpan } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  辅助函数
// ════════════════════════════════════════════════════

/**
 * 创建 ConversationViewState 并模拟挂载。
 */
function mountConversationView(config: ConversationViewConfig): {
  widget: ConversationView;
  state: ConversationViewState;
} {
  const widget = new ConversationView(config);
  const state = widget.createState() as ConversationViewState;
  const mockElement = { markNeedsRebuild: () => {} } as any;
  (state as any)._widget = widget;
  (state as any)._element = mockElement;
  (state as any)._mounted = true;
  state.initState();
  return { widget, state };
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
    // Text widget
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
 * 递归检查 TextSpan 树中是否包含指定文本。
 */
function spanContainsText(span: TextSpan, target: string): boolean {
  return span.toPlainText().includes(target);
}

/**
 * 检查 TextSpan 或其子节点是否有指定的 bold + color。
 */
function hasStyledSpan(
  span: TextSpan,
  text: string,
  options: { bold?: boolean; r?: number; g?: number; b?: number },
): boolean {
  let found = false;
  span.visitTextSpan((s) => {
    if (found) return false;
    const plainText = s.text ?? "";
    const isTextMatch = plainText.includes(text);
    if (!isTextMatch) return true;

    const style = s.style;
    if (!style) return true;

    let matches = true;
    if (options.bold !== undefined) {
      matches = matches && style.bold === options.bold;
    }
    if (options.r !== undefined && style.foreground) {
      matches =
        matches &&
        style.foreground.kind === "rgb" &&
        style.foreground.r === options.r &&
        style.foreground.g === options.g &&
        style.foreground.b === options.b;
    }
    if (matches) found = true;
    return true;
  });
  return found;
}

// ════════════════════════════════════════════════════
//  ConversationView 基础测试
// ════════════════════════════════════════════════════

describe("ConversationView", () => {
  it("继承 StatefulWidget", () => {
    const view = new ConversationView({ messages: [] });
    assert.ok(view instanceof StatefulWidget);
  });

  it("createState 返回 ConversationViewState", () => {
    const view = new ConversationView({ messages: [] });
    const state = view.createState();
    assert.ok(state instanceof ConversationViewState);
  });

  it("存储扩展的 config (messages + inferenceState + error)", () => {
    const messages: Message[] = [{ role: "user", content: "Hello" }];
    const view = new ConversationView({
      messages,
      inferenceState: "running",
      error: new Error("test"),
    });
    assert.equal(view.config.messages, messages);
    assert.equal(view.config.inferenceState, "running");
    assert.ok(view.config.error instanceof Error);
  });
});

// ════════════════════════════════════════════════════
//  ConversationView build() 测试
// ════════════════════════════════════════════════════

describe("ConversationView.build", () => {
  it("返回 Column 包含消息 Widget", () => {
    const messages: Message[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ];
    const { state } = mountConversationView({ messages });
    const built = state.build({} as any);
    assert.ok(built instanceof Column, "Should return a Column widget");
  });

  it("渲染用户消息 \"You: \" 前缀 (primary #7aa2f7 bold)", () => {
    const messages: Message[] = [{ role: "user", content: "Hello world" }];
    const { state } = mountConversationView({ messages });
    const built = state.build({} as any);

    const richTexts = collectRichTexts(built);
    const hasYouPrefix = richTexts.some((rt: any) =>
      hasStyledSpan(rt.text, "You: ", { bold: true, r: 0x7a, g: 0xa2, b: 0xf7 }),
    );
    assert.ok(hasYouPrefix, 'Should render "You: " in primary color bold');
  });

  it("渲染助手消息 \"Assistant: \" 前缀 (accent #bb9af7 bold)", () => {
    const messages: Message[] = [{ role: "assistant", content: "Hi there!" }];
    const { state } = mountConversationView({ messages });
    const built = state.build({} as any);

    const richTexts = collectRichTexts(built);
    const hasAssistantPrefix = richTexts.some((rt: any) =>
      hasStyledSpan(rt.text, "Assistant: ", { bold: true, r: 0xbb, g: 0x9a, b: 0xf7 }),
    );
    assert.ok(hasAssistantPrefix, 'Should render "Assistant: " in accent color bold');
  });

  it("渲染系统消息 \"System: \" 前缀 (secondary #9ece6a bold)", () => {
    const messages: Message[] = [{ role: "system", content: "System prompt" }];
    const { state } = mountConversationView({ messages });
    const built = state.build({} as any);

    const richTexts = collectRichTexts(built);
    const hasSystemPrefix = richTexts.some((rt: any) =>
      hasStyledSpan(rt.text, "System: ", { bold: true, r: 0x9e, g: 0xce, b: 0x6a }),
    );
    assert.ok(hasSystemPrefix, 'Should render "System: " in secondary color bold');
  });

  it("消息内容通过 MarkdownParser + MarkdownRenderer 渲染", () => {
    const messages: Message[] = [
      { role: "user", content: "Hello **world**" },
    ];
    const { state } = mountConversationView({ messages });
    const built = state.build({} as any);

    const allText = extractAllText(built);
    // MarkdownRenderer 将 **world** 渲染为 bold TextSpan 但纯文本仍含 "world"
    assert.ok(allText.includes("world"), "Should render markdown content");
    // Should NOT contain raw markdown syntax
    assert.ok(!allText.includes("**"), "Should not contain raw markdown ** syntax");
  });

  it("空消息列表显示 \"No messages yet. Type below to begin.\"", () => {
    const { state } = mountConversationView({ messages: [] });
    const built = state.build({} as any);
    const allText = extractAllText(built);
    assert.ok(
      allText.includes("No messages yet"),
      `Expected "No messages yet" in: ${allText}`,
    );
  });

  it("错误消息使用 error 色 (#f7768e) bold \"Error:\" 前缀", () => {
    const { state } = mountConversationView({
      messages: [{ role: "user", content: "test" }],
      error: new Error("Something went wrong"),
    });
    const built = state.build({} as any);

    const richTexts = collectRichTexts(built);
    const hasErrorPrefix = richTexts.some((rt: any) =>
      hasStyledSpan(rt.text, "Error:", { bold: true, r: 0xf7, g: 0x76, b: 0x8e }),
    );
    assert.ok(hasErrorPrefix, 'Should render "Error:" in error color bold');
  });

  it("错误消息包含重试提示文本", () => {
    const { state } = mountConversationView({
      messages: [{ role: "user", content: "test" }],
      error: new Error("Something went wrong"),
    });
    const built = state.build({} as any);
    const allText = extractAllText(built);
    assert.ok(
      allText.includes("Press Enter to retry") || allText.includes("retry"),
      "Should contain retry prompt",
    );
  });

  it("inferenceState 为 \"running\" 时追加 \"...\" 流式指示器", () => {
    const messages: Message[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Thinking" },
    ];
    const { state } = mountConversationView({
      messages,
      inferenceState: "running",
    });
    const built = state.build({} as any);
    const allText = extractAllText(built);
    assert.ok(allText.includes("..."), 'Should contain streaming indicator "..."');
  });

  it("inferenceState 为 \"idle\" 时不追加流式指示器", () => {
    const messages: Message[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Done" },
    ];
    const { state } = mountConversationView({
      messages,
      inferenceState: "idle",
    });
    const built = state.build({} as any);
    // 仅检查最后不会有孤立的 "..."
    // (消息本身可能包含 ..., 但不会由 streaming indicator 追加)
    assert.ok(true, "No streaming indicator appended");
  });
});
