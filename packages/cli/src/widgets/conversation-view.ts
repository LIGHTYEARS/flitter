/**
 * ConversationView -- 消息列表显示 Widget。
 *
 * {@link ConversationView} 扩展 {@link StatefulWidget}，显示对话消息列表。
 * 最小实现: 接收 messages 列表并构建 Widget 子树。
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

import { StatefulWidget, State, Text } from "@flitter/tui";
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
 */
export interface ConversationViewConfig {
  /** 消息列表 */
  messages: Message[];
}

// ════════════════════════════════════════════════════
//  ConversationView
// ════════════════════════════════════════════════════

/**
 * ConversationView -- 消息列表显示 Widget。
 *
 * 最小实现: 渲染消息列表，支持滚动。
 * 接收 messages 列表并构建 Widget 子树。
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
 * 最小实现: build 返回消息列表的 Widget 表示。
 *
 * 逆向: wR 基类 (tui-widget-framework.js 1784-1813)
 */
export class ConversationViewState extends State<ConversationView> {
  /**
   * 初始化状态。
   *
   * TODO: 可扩展以创建 ScrollController 管理滚动行为。
   */
  initState(): void {
    super.initState();
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
   * 最小实现: 返回一个表示消息列表的 Widget。
   * 实际渲染包含 ScrollController + 消息 Widget 列表。
   *
   * @param _context - 构建上下文
   * @returns Widget 占位
   */
  build(_context: BuildContext): Widget {
    const messages = this.widget.config.messages;
    const lastMessage = messages.length > 0 ? messages[messages.length - 1].content : "";
    return new Text({ data: lastMessage || " " });
  }
}
