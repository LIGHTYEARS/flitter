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

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  Column,
  MarkdownParser,
  MarkdownRenderer,
  RichText,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import type { ActivityGroupItem, DisplayItem, MessageItem, ToolItem } from "./display-items.js";

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
 * @property items - Display items (replaces old messages array)
 * @property messages - Legacy: flat messages (for backward compatibility during migration)
 * @property inferenceState - 推理状态: "idle" (空闲) | "running" (推理中)
 * @property error - 最近一次推理错误 (null 表示无错误)
 * @property streamingDelta - 流式增量文本 (null 表示无增量)
 */
export interface ConversationViewConfig {
  /** Display items (replaces old messages array) */
  items?: DisplayItem[];
  /** Legacy: flat messages (for backward compatibility during migration) */
  messages?: Message[];
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

/** tool 色 (#e0af68) -- 工具名称/工具运行指示器
 * 逆向: $R.app.toolRunning / toolName (Tokyo Night warning color) */
const TOOL_COLOR = Color.rgb(0xe0, 0xaf, 0x68);

/** dim 色 -- 工具参数等次要信息 (same as MUTED_TEXT_COLOR)
 * 逆向: R.colors.mutedForeground */
const DIM_COLOR = MUTED_TEXT_COLOR;

/** success 色 (#9ece6a) -- 工具完成 (same as SECONDARY_COLOR)
 * 逆向: $R.app.toolSuccess */
const SUCCESS_COLOR = SECONDARY_COLOR;

/** error 色 (#f7768e) -- 工具错误 (same as ERROR_COLOR)
 * 逆向: $R.app.toolError */
const ERROR_COLOR_LOCAL = ERROR_COLOR;

/** cancelled 色 -- 工具取消/拒绝 (same as MUTED_TEXT_COLOR)
 * 逆向: $R.app.toolCancelled */
const CANCELLED_COLOR = MUTED_TEXT_COLOR;

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
 * build() dispatches to the appropriate renderer based on item type:
 * - "message" → _buildMessageItemWidget (new DisplayItem path)
 * - "tool" → _buildToolWidget (tool use row)
 * - "activity-group" → _buildActivityGroupWidget (collapsed activity group)
 *
 * Falls back to legacy messages array when items is not provided.
 *
 * 逆向: wR 基类 (tui-widget-framework.js 1784-1813),
 *        x3/i9R (misc_utils.js 6280-6357) — tool row widget,
 *        Y1T (actions_intents.js 1784-1912) — activity group widget,
 *        xW (2820_unknown_xW.js) — status icon mapping,
 *        qr (2821_unknown_qr.js) — status color mapping
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
   * If config.items is provided and non-empty, iterates items and dispatches
   * to the appropriate renderer based on item.type.
   * Otherwise, falls back to legacy config.messages for backward compatibility.
   *
   * @param _context - 构建上下文
   * @returns Widget 树 (Column 包含消息 Widget 列表)
   */
  build(_context: BuildContext): Widget {
    const { items, messages, inferenceState, error } = this.widget.config;

    // Prefer items (new DisplayItem path) over legacy messages
    if (items && items.length > 0) {
      return this._buildFromItems(items, inferenceState, error);
    }

    // Legacy path: iterate messages array
    return this._buildFromLegacyMessages(messages ?? [], inferenceState, error);
  }

  // ════════════════════════════════════════════════════
  //  Items-based rendering (new path)
  // ════════════════════════════════════════════════════

  /**
   * Build widget tree from DisplayItem[] array.
   *
   * Dispatches each item to its type-specific renderer.
   * 逆向: yx0 main loop produces items, then the conversation view iterates them.
   */
  private _buildFromItems(
    items: DisplayItem[],
    inferenceState?: "idle" | "running",
    error?: Error | null,
  ): Widget {
    const children: Widget[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      switch (item.type) {
        case "message":
          children.push(this._buildMessageItemWidget(item));
          break;
        case "tool":
          children.push(this._buildToolWidget(item));
          break;
        case "activity-group":
          children.push(this._buildActivityGroupWidget(item));
          break;
      }

      // 项目间添加 1 行间距分隔
      if (i < items.length - 1) {
        children.push(new SizedBox({ height: 1 }));
      }
    }

    // 空列表: 显示空状态文本
    if (children.length === 0) {
      children.push(
        new RichText({
          text: new TextSpan({
            text: "No messages yet. Type below to begin.",
            style: new TextStyle({ foreground: MUTED_TEXT_COLOR }),
          }),
        }),
      );
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
   * Build a MessageItem widget (DisplayItem path).
   *
   * Same as legacy _buildMessageWidget but reads `text` instead of `content`.
   *
   * @param item - MessageItem from DisplayItem[]
   * @returns Message Widget
   */
  private _buildMessageItemWidget(item: MessageItem): Widget {
    const roleConfig = ROLE_CONFIG[item.role] ?? {
      prefix: `${item.role}: `,
      color: MUTED_TEXT_COLOR,
    };

    const roleSpan = new TextSpan({
      text: roleConfig.prefix,
      style: new TextStyle({
        bold: true,
        foreground: roleConfig.color,
      }),
    });

    const ast = this._parser.parse(item.text);
    const contentSpans = this._renderer.render(ast);

    return new RichText({
      text: new TextSpan({
        children: [roleSpan, new TextSpan({ text: "\n" }), ...contentSpans],
      }),
    });
  }

  /**
   * Build a ToolItem widget — renders a single tool use row.
   *
   * Matches amp's x3/i9R pattern (misc_utils.js 6312-6356):
   *   {statusIcon} {toolName(bold)} {detail(dim)}
   *   [error message in red if error]
   *
   * Status icons match amp's xW() function (2820_unknown_xW.js):
   * - done: ✓  (逆向: "\u2713")
   * - error: ✕  (逆向: "\u2715")
   * - in-progress: ⟳  (amp uses braille spinner; static fallback)
   * - cancelled/rejected: ⊘
   *
   * Status colors match amp's qr() function (2821_unknown_qr.js):
   * - done → toolSuccess (SUCCESS_COLOR)
   * - error → toolError (ERROR_COLOR_LOCAL)
   * - in-progress → toolRunning (TOOL_COLOR)
   * - cancelled/rejected → toolCancelled (CANCELLED_COLOR)
   *
   * @param tool - ToolItem from DisplayItem[]
   * @returns Tool row Widget
   */
  private _buildToolWidget(tool: ToolItem): Widget {
    const icon = _getStatusIcon(tool.status);
    const iconColor = _getStatusColor(tool.status);

    // 逆向: x3 build() — icon + space + toolName(bold) + children(dim)
    const spans: TextSpan[] = [];

    // Status icon
    spans.push(
      new TextSpan({
        text: `${icon} `,
        style: new TextStyle({ foreground: iconColor }),
      }),
    );

    // Tool name (bold, tool color)
    // 逆向: new G(R, new cT({ color: h.app.toolName, bold: !0 }))
    spans.push(
      new TextSpan({
        text: tool.toolName,
        style: new TextStyle({ bold: true, foreground: TOOL_COLOR }),
      }),
    );

    // Contextual detail (dim) — varies by tool kind
    // 逆向: x3 children array rendered inline after tool name
    const detail = _getToolDetail(tool);
    if (detail) {
      spans.push(
        new TextSpan({
          text: " ",
        }),
      );
      spans.push(
        new TextSpan({
          text: detail,
          style: new TextStyle({ foreground: DIM_COLOR }),
        }),
      );
    }

    const mainRow = new RichText({
      text: new TextSpan({ children: spans }),
    });

    // If there's an error message, append it below in red
    // 逆向: x3 tail array — error text in toolError color
    if (tool.error) {
      return new Column({
        children: [
          mainRow,
          new RichText({
            text: new TextSpan({
              text: `  ${tool.error}`,
              style: new TextStyle({ foreground: ERROR_COLOR_LOCAL }),
            }),
          }),
        ],
      });
    }

    return mainRow;
  }

  /**
   * Build an ActivityGroupItem widget — renders a collapsed activity group.
   *
   * Matches amp's Y1T pattern (actions_intents.js 1839-1872):
   *   {spinner|✓} {summary(toolName color)}
   *
   * - hasInProgress → ⟳ icon in TOOL_COLOR (amp uses braille spinner)
   * - completed → ✓ icon in SUCCESS_COLOR
   *
   * 逆向: Y1T build() line 1846-1853
   *
   * @param group - ActivityGroupItem from DisplayItem[]
   * @returns Activity group Widget
   */
  private _buildActivityGroupWidget(group: ActivityGroupItem): Widget {
    const spans: TextSpan[] = [];

    if (group.hasInProgress) {
      // 逆向: this._spinner.toBraille() + toolRunning color
      // Static fallback: ⟳
      spans.push(
        new TextSpan({
          text: "⟳ ",
          style: new TextStyle({ foreground: TOOL_COLOR }),
        }),
      );
    } else {
      // 逆向: "\u2713 " + toolSuccess color
      spans.push(
        new TextSpan({
          text: "✓ ",
          style: new TextStyle({ foreground: SUCCESS_COLOR }),
        }),
      );
    }

    // Summary text (逆向: new G(e, new cT({ color: R.app.toolName })))
    spans.push(
      new TextSpan({
        text: group.summary,
        style: new TextStyle({ foreground: DIM_COLOR }),
      }),
    );

    return new RichText({
      text: new TextSpan({ children: spans }),
    });
  }

  // ════════════════════════════════════════════════════
  //  Legacy messages-based rendering
  // ════════════════════════════════════════════════════

  /**
   * Build widget tree from legacy Message[] array.
   *
   * Backward-compatible path for callers that still pass `messages`.
   */
  private _buildFromLegacyMessages(
    messages: Message[],
    inferenceState?: "idle" | "running",
    error?: Error | null,
  ): Widget {
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
   * 构建单条消息 Widget (legacy path).
   *
   * 包含:
   * 1. 角色指示器行 (bold + 角色颜色)
   * 2. Markdown 渲染后的内容
   *
   * @param message - 消息数据 (legacy Message interface)
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
        children: [roleSpan, new TextSpan({ text: "\n" }), ...contentSpans],
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

// ════════════════════════════════════════════════════
//  Helper functions (module-level)
// ════════════════════════════════════════════════════

/**
 * Get status icon for a tool status.
 *
 * 逆向: xW() function (2820_unknown_xW.js)
 * - done → "✓" (\u2713)
 * - error → "✕" (\u2715)
 * - in-progress → "⟳" (amp uses braille spinner; static fallback)
 * - cancelled/rejected → "⊘"
 */
function _getStatusIcon(status: ToolItem["status"]): string {
  switch (status) {
    case "done":
      return "\u2713"; // ✓
    case "error":
      return "\u2715"; // ✕
    case "in-progress":
      return "\u27F3"; // ⟳
    case "cancelled":
    case "rejected-by-user":
      return "\u2298"; // ⊘
  }
}

/**
 * Get status color for a tool status.
 *
 * 逆向: qr() function (2821_unknown_qr.js)
 * - done → toolSuccess (SUCCESS_COLOR)
 * - error → toolError (ERROR_COLOR_LOCAL)
 * - in-progress → toolRunning (TOOL_COLOR)
 * - cancelled/rejected → toolCancelled (CANCELLED_COLOR)
 */
function _getStatusColor(status: ToolItem["status"]): Color {
  switch (status) {
    case "done":
      return SUCCESS_COLOR;
    case "error":
      return ERROR_COLOR_LOCAL;
    case "in-progress":
      return TOOL_COLOR;
    case "cancelled":
    case "rejected-by-user":
      return CANCELLED_COLOR;
  }
}

/**
 * Get contextual detail string for a tool item.
 *
 * 逆向: x3 children — varies by tool kind:
 * - bash: command text (逆向: yx0 Bash branch puts command in title)
 * - edit/create-file: file path
 * - generic: JSON summary of args
 *
 * Truncates long strings to keep the row compact.
 */
function _getToolDetail(tool: ToolItem): string | null {
  const MAX_DETAIL_LENGTH = 80;

  switch (tool.kind) {
    case "bash": {
      if (!tool.command) return null;
      const cmd =
        tool.command.length > MAX_DETAIL_LENGTH
          ? tool.command.slice(0, MAX_DETAIL_LENGTH) + "..."
          : tool.command;
      return cmd;
    }
    case "edit":
    case "create-file": {
      return tool.path ?? null;
    }
    case "read":
    case "search":
    case "generic": {
      if (!tool.args || Object.keys(tool.args).length === 0) return null;
      const summary = JSON.stringify(tool.args);
      return summary.length > MAX_DETAIL_LENGTH
        ? summary.slice(0, MAX_DETAIL_LENGTH) + "..."
        : summary;
    }
  }
}
