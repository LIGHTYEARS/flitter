/**
 * ConversationView -- 消息列表显示 Widget。
 *
 * {@link ConversationView} 扩展 {@link StatefulWidget}，显示对话消息列表。
 * 支持 Markdown 渲染 (micromark pipeline)、角色指示器 (bold + 色彩)、
 * 错误内联显示 (红色高亮 + 重试提示)、流式推理指示器 ("...")。
 *
 * 逆向参考: ConversationView (conversation-ui-logic.js)
 *
 * @example
 * ```ts
 * import { ConversationView, type Message } from "./conversation-view.js";
 *
 * const messages: Message[] = [
 *   { role: "user", content: "Hello" },
 *   { role: "assistant", content: "Hi there!" },
 * ];
 * const view = new ConversationView({ messages });
 * ```
 *
 * @module
 */

import { StatefulWidget, State, Column, SizedBox, RichText, TextSpan } from "@flitter/tui";
import { MarkdownParser, MarkdownRenderer } from "@flitter/tui";
import { TextStyle } from "@flitter/tui";
import { Color } from "@flitter/tui";
import type { Widget } from "@flitter/tui";
import type { BuildContext } from "@flitter/tui";

// ════════════════════════════════════════════════════
//  Message 接口
// ════════════════════════════════════════════════════

/**
 * 消息类型。
 *
 * @property role - 消息角色: "user" | "assistant" | "system"
 * @property content - 消息文本内容
 */
export interface Message {
  /** 消息角色 */
  role: "user" | "assistant" | "system";
  /** 消息文本内容 */
  content: string;
}

// ════════════════════════════════════════════════════
//  ConversationViewConfig 接口
// ════════════════════════════════════════════════════

/**
 * ConversationView 配置。
 *
 * @property messages - 消息列表 (从 ThreadStore 读取)
 * @property inferenceState - 推理状态: "idle" (空闲) | "running" (推理中)
 * @property error - 最近一次推理错误 (null 表示无错误)
 * @property streamingDelta - 流式增量文本 (null 表示无增量)
 */
export interface ConversationViewConfig {
  /** 消息列表 */
  messages: Message[];
  /** 推理状态 */
  inferenceState?: "idle" | "running";
  /** 最近一次推理错误 */
  error?: Error | null;
  /** 流式增量文本 */
  streamingDelta?: string | null;
}

// ════════════════════════════════════════════════════
//  颜色常量 (来自 ThemeData / Tokyo Night 调色板)
// ════════════════════════════════════════════════════

/** primary 色 (#7aa2f7) -- 用户角色指示器 */
const PRIMARY_COLOR = Color.rgb(0x7a, 0xa2, 0xf7);

/** accent 色 (#bb9af7) -- 助手角色指示器 */
const ACCENT_COLOR = Color.rgb(0xbb, 0x9a, 0xf7);

/** secondary 色 (#9ece6a) -- 系统角色指示器 */
const SECONDARY_COLOR = Color.rgb(0x9e, 0xce, 0x6a);

/** error 色 (#f7768e) -- 错误文本 */
const ERROR_COLOR = Color.rgb(0xf7, 0x76, 0x8e);

/** mutedText 色 (#565f89) -- 占位符、次要信息 */
const MUTED_TEXT_COLOR = Color.rgb(0x56, 0x5f, 0x89);

// ════════════════════════════════════════════════════
//  角色配置映射
// ════════════════════════════════════════════════════

/** 角色 -> {前缀, 颜色} 映射 */
const ROLE_CONFIG: Record<string, { prefix: string; color: Color }> = {
  user: { prefix: "You: ", color: PRIMARY_COLOR },
  assistant: { prefix: "Assistant: ", color: ACCENT_COLOR },
  system: { prefix: "System: ", color: SECONDARY_COLOR },
};

// ════════════════════════════════════════════════════
//  ConversationView
// ════════════════════════════════════════════════════

/**
 * ConversationView -- 消息列表显示 Widget。
 *
 * 渲染消息列表，支持:
 * - Markdown 内容渲染 (MarkdownParser + MarkdownRenderer)
 * - 角色指示器 (bold + 色彩编码)
 * - 空状态提示
 * - 错误内联显示 (红色 + 重试提示)
 * - 流式推理指示器 ("...")
 *
 * 逆向: ConversationView (conversation-ui-logic.js)
 */
export class ConversationView extends StatefulWidget {
  /** Widget 配置 */
  readonly config: ConversationViewConfig;

  /**
   * 创建 ConversationView。
   *
   * @param config - 对话视图配置
   */
  constructor(config: ConversationViewConfig) {
    super();
    this.config = config;
  }

  /**
   * 创建关联的 ConversationViewState。
   *
   * @returns 新创建的 ConversationViewState 实例
   */
  createState(): ConversationViewState {
    return new ConversationViewState();
  }
}

// ════════════════════════════════════════════════════
//  ConversationViewState
// ════════════════════════════════════════════════════

/**
 * ConversationView 的状态管理。
 *
 * build() 根据消息列表构建完整的 Widget 树:
 * - 空列表: 显示空状态提示文本
 * - 有消息: 每条消息渲染为 角色指示器 + Markdown 内容
 * - 推理中: 追加 "..." 流式指示器
 * - 有错误: 追加红色错误块 + 重试提示
 *
 * 逆向: wR 基类 (tui-widget-framework.js 1784-1813)
 */
export class ConversationViewState extends State<ConversationView> {
  /** Markdown 解析器 (复用实例) */
  private _parser!: MarkdownParser;

  /** Markdown 渲染器 (复用实例) */
  private _renderer!: MarkdownRenderer;

  /**
   * 初始化状态。
   *
   * 创建 MarkdownParser 和 MarkdownRenderer 实例。
   */
  initState(): void {
    super.initState();
    this._parser = new MarkdownParser();
    this._renderer = new MarkdownRenderer();
  }

  /**
   * 清理资源。
   */
  dispose(): void {
    super.dispose();
  }

  /**
   * 构建子 Widget 树。
   *
   * @param _context - 构建上下文
   * @returns Widget 树 (Column 包含消息 Widget 列表)
   */
  build(_context: BuildContext): Widget {
    const { messages, inferenceState, error } = this.widget.config;

    // 空消息列表: 显示空状态文本
    if (messages.length === 0) {
      return new Column({
        children: [
          new RichText({
            text: new TextSpan({
              text: "No messages yet. Type below to begin.",
              style: new TextStyle({ foreground: MUTED_TEXT_COLOR }),
            }),
          }),
        ],
      });
    }

    // 构建消息 Widget 列表
    const children: Widget[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      children.push(this._buildMessageWidget(msg));

      // 消息间添加 1 行间距分隔
      if (i < messages.length - 1) {
        children.push(new SizedBox({ height: 1 }));
      }
    }

    // 流式推理指示器
    if (inferenceState === "running") {
      children.push(
        new RichText({
          text: new TextSpan({
            text: "...",
            style: new TextStyle({ foreground: MUTED_TEXT_COLOR }),
          }),
        }),
      );
    }

    // 错误显示
    if (error) {
      children.push(new SizedBox({ height: 1 }));
      children.push(this._buildErrorWidget(error));
    }

    return new Column({ children });
  }

  /**
   * 构建单条消息 Widget。
   *
   * 包含:
   * 1. 角色指示器行 (bold + 角色颜色)
   * 2. Markdown 渲染后的内容
   *
   * @param message - 消息数据
   * @returns 消息 Widget
   */
  private _buildMessageWidget(message: Message): Widget {
    const roleConfig = ROLE_CONFIG[message.role] ?? {
      prefix: `${message.role}: `,
      color: MUTED_TEXT_COLOR,
    };

    // 角色指示器: bold + 角色颜色
    const roleSpan = new TextSpan({
      text: roleConfig.prefix,
      style: new TextStyle({
        bold: true,
        foreground: roleConfig.color,
      }),
    });

    // 消息内容: 通过 MarkdownParser + MarkdownRenderer 管线渲染
    const ast = this._parser.parse(message.content);
    const contentSpans = this._renderer.render(ast);

    // 组合: 角色指示器 + 换行 + 内容
    return new RichText({
      text: new TextSpan({
        children: [
          roleSpan,
          new TextSpan({ text: "\n" }),
          ...contentSpans,
        ],
      }),
    });
  }

  /**
   * 构建错误显示 Widget。
   *
   * 包含:
   * 1. "Error:" 前缀 (bold + error 色)
   * 2. 错误消息 (error 色)
   * 3. 重试提示 (mutedText 色)
   *
   * @param error - 错误对象
   * @returns 错误 Widget
   */
  private _buildErrorWidget(error: Error): Widget {
    const errorBoldStyle = new TextStyle({
      bold: true,
      foreground: ERROR_COLOR,
    });
    const errorNormalStyle = new TextStyle({
      foreground: ERROR_COLOR,
    });
    const mutedStyle = new TextStyle({
      foreground: MUTED_TEXT_COLOR,
    });

    return new RichText({
      text: new TextSpan({
        children: [
          new TextSpan({ text: "Error:", style: errorBoldStyle }),
          new TextSpan({ text: " " }),
          new TextSpan({ text: error.message, style: errorNormalStyle }),
          new TextSpan({ text: "\n" }),
          new TextSpan({
            text: "Press Enter to retry or Ctrl+C to exit.",
            style: mutedStyle,
          }),
        ],
      }),
    });
  }
}
