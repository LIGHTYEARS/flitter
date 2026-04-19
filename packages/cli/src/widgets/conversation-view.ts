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
  BrailleSpinner,
  Color,
  Column,
  Expanded,
  MarkdownParser,
  MarkdownRenderer,
  RichText,
  Row,
  Scrollable,
  Scrollbar,
  ScrollController,
  ScrollViewport,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { buildDiffWidget } from "./diff-widget.js";
import type {
  ActivityAction,
  ActivityGroupItem,
  DisplayItem,
  MessageItem,
  ThinkingItem,
  ToolItem,
} from "./display-items.js";

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
   * Braille spinner for in-progress tool indicators.
   * 逆向: Y1T._spinner = new xa() (chunk-006.js:6121)
   */
  private _spinner = new BrailleSpinner();

  /**
   * Animation timer for stepping the braille spinner at 200ms intervals.
   * 逆向: Y1T._animationTimer (chunk-006.js:6122, 6147-6158)
   */
  private _animationTimer: ReturnType<typeof setInterval> | undefined;

  /**
   * Set of item indices for expanded thinking blocks.
   * 逆向: fJT._localExpanded + _thinkingBlockStates Map (chunk-006.js:16872, 28475)
   */
  private _expandedThinking: Set<number> = new Set();

  /**
   * ScrollController for conversation auto-scroll (followMode: true).
   * 逆向: amp conversation auto-scrolls to bottom
   */
  private _scrollController!: ScrollController;

  /**
   * 初始化状态。
   *
   * 创建 MarkdownParser 和 MarkdownRenderer 实例。
   */
  initState(): void {
    super.initState();
    this._parser = new MarkdownParser();
    this._renderer = new MarkdownRenderer();
    this._scrollController = new ScrollController();
    // followMode is true by default, which ensures new messages auto-scroll to bottom

    // 逆向: Y1T.initState() — if (this._isActive) this._startAnimation()
    if (this._hasInProgress()) {
      this._startAnimation();
    }
  }

  /**
   * 清理资源。
   */
  dispose(): void {
    // 逆向: Y1T.dispose() — this._stopAnimation(), ...
    this._stopAnimation();
    this._scrollController.dispose();
    super.dispose();
  }

  /**
   * Check whether any current items are in-progress.
   * Used to decide whether the spinner animation should run.
   */
  private _hasInProgress(): boolean {
    const items = this.widget.config.items;
    if (!items) return false;
    return items.some(
      (item) =>
        (item.type === "activity-group" && item.hasInProgress) ||
        (item.type === "tool" && item.status === "in-progress"),
    );
  }

  /**
   * Start the spinner animation (200ms interval).
   * 逆向: Y1T._startAnimation() (chunk-006.js:6147-6153)
   */
  private _startAnimation(): void {
    if (this._animationTimer) return;
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }

  /**
   * Stop the spinner animation.
   * 逆向: Y1T._stopAnimation() (chunk-006.js:6155-6158)
   */
  private _stopAnimation(): void {
    if (!this._animationTimer) return;
    clearInterval(this._animationTimer);
    this._animationTimer = undefined;
  }

  /**
   * React to widget config changes — start/stop animation as needed.
   * 逆向: Y1T.didUpdateWidget(T) (chunk-006.js:6129-6142)
   */
  didUpdateWidget(_oldWidget: ConversationView): void {
    super.didUpdateWidget(_oldWidget);

    const wasActive = this._animationTimer !== undefined;
    const isActive = this._hasInProgress();

    if (!wasActive && isActive) {
      this._startAnimation();
    } else if (wasActive && !isActive) {
      this._stopAnimation();
    }
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
        case "thinking":
          children.push(this._buildThinkingWidget(item, i));
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

    // B5: Wrap conversation Column in Scrollable + Scrollbar
    // 逆向: amp conversation auto-scrolls to bottom and has scroll indicator on right side
    const contentColumn = new Column({ children });
    const controller = this._scrollController;

    return new Row({
      children: [
        new Expanded({
          child: new Scrollable({
            controller,
            viewportBuilder: (_ctx, ctrl) =>
              new ScrollViewport({
                controller: ctrl,
                child: contentColumn,
              }),
          }),
        }),
        new Scrollbar({
          controller,
          getScrollInfo: () => ({
            totalContentHeight: controller.maxScrollExtent + 24,
            viewportHeight: 24,
            scrollOffset: controller.offset,
          }),
        }),
      ],
    });
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
   * - in-progress: spinner.toBraille() (animated braille spinner)
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
    const isInProgress = tool.status === "in-progress";
    const isBash = tool.kind === "bash";

    // 逆向: G9R.build() (chunk-006.js:30002-30064) — F9R/G9R buildShellCommandTool
    const spans: TextSpan[] = [];

    if (isBash) {
      // B1: Bash tools use "$ " prefix (bold) when complete, spinner when in-progress
      // 逆向: chunk-006.js:30029-30040
      //   if (c === "in-progress") { spinner + toolRunning }
      //   else { "$ " in bold + status color }
      if (isInProgress) {
        spans.push(
          new TextSpan({
            text: `${this._spinner.toBraille()} `,
            style: new TextStyle({ foreground: TOOL_COLOR }),
          }),
        );
      } else {
        const hasNonZeroExit =
          tool.status === "done" &&
          typeof tool.exitCode === "number" &&
          tool.exitCode !== 0;
        const statusColor = hasNonZeroExit ? ERROR_COLOR_LOCAL : _getStatusColor(tool.status);
        spans.push(
          new TextSpan({
            text: "$ ",
            style: new TextStyle({ bold: true, foreground: statusColor }),
          }),
        );
      }

      // Command text (bold foreground) — 逆向: chunk-006.js:30041 m.push(new G(p, o))
      const command = tool.command ?? "";
      const cmdLines = command.split("\n");
      const firstLine = cmdLines[0] || "";
      const cmdStyle = new TextStyle({ bold: true });
      if (tool.status === "cancelled") {
        spans.push(
          new TextSpan({
            text: firstLine,
            style: new TextStyle({ bold: true, strikethrough: true }),
          }),
        );
      } else if (tool.status === "rejected-by-user") {
        spans.push(
          new TextSpan({
            text: firstLine,
            style: new TextStyle({ bold: true, dim: true }),
          }),
        );
      } else {
        spans.push(new TextSpan({ text: firstLine, style: cmdStyle }));
      }

      // Status suffix — 逆向: chunk-006.js:30045-30051
      if (tool.status === "rejected-by-user") {
        spans.push(
          new TextSpan({
            text: " (rejected)",
            style: new TextStyle({ dim: true, italic: true }),
          }),
        );
      } else if (tool.status === "cancelled") {
        spans.push(
          new TextSpan({
            text: " (cancelled)",
            style: new TextStyle({ foreground: CANCELLED_COLOR, italic: true }),
          }),
        );
      }
    } else {
      // Non-bash tools: status icon + tool name + detail (original behavior)
      if (isInProgress) {
        spans.push(
          new TextSpan({
            text: `${this._spinner.toBraille()} `,
            style: new TextStyle({ foreground: TOOL_COLOR }),
          }),
        );
      } else {
        const icon = _getStatusIcon(tool.status);
        const iconColor = _getStatusColor(tool.status);
        spans.push(
          new TextSpan({
            text: `${icon} `,
            style: new TextStyle({ foreground: iconColor }),
          }),
        );
      }

      // Tool name (bold, tool color)
      spans.push(
        new TextSpan({
          text: tool.toolName,
          style: new TextStyle({ bold: true, foreground: TOOL_COLOR }),
        }),
      );

      // Contextual detail (dim) — varies by tool kind
      const detail = _getToolDetail(tool);
      if (detail) {
        spans.push(new TextSpan({ text: " " }));
        spans.push(
          new TextSpan({
            text: detail,
            style: new TextStyle({ foreground: DIM_COLOR }),
          }),
        );
      }
    }

    const mainRow = new RichText({
      text: new TextSpan({ children: spans }),
    });

    const columnChildren: Widget[] = [mainRow];

    // 逆向: chunk-004.js:21064-21067 — edit branch renders diff via cE0(T.diff, R)
    if ((tool.kind === "edit" || tool.kind === "create-file") && tool.diff) {
      columnChildren.push(buildDiffWidget(tool.diff));
    }

    // B1: Bash output display — 逆向: chunk-006.js:30059
    //   on(a.result.output, isComplete, colors) renders output below command
    if (isBash && tool.output && tool.status !== "rejected-by-user") {
      const outputLines = tool.output.split("\n");
      const MAX_VISIBLE_LINES = 5;
      const truncated = outputLines.length > MAX_VISIBLE_LINES;
      const visibleLines = truncated
        ? outputLines.slice(0, MAX_VISIBLE_LINES)
        : outputLines;

      const outputText = visibleLines.join("\n");
      columnChildren.push(
        new RichText({
          text: new TextSpan({
            text: `  ${outputText.split("\n").join("\n  ")}`,
            style: new TextStyle({ foreground: DIM_COLOR }),
          }),
        }),
      );

      if (truncated) {
        columnChildren.push(
          new RichText({
            text: new TextSpan({
              text: `  \u25BC Show more (${outputLines.length - MAX_VISIBLE_LINES} more lines)`,
              style: new TextStyle({ foreground: MUTED_TEXT_COLOR }),
            }),
          }),
        );
      }
    }

    // Error message in red — 逆向: chunk-006.js:30056-30058
    if (tool.error) {
      columnChildren.push(
        new RichText({
          text: new TextSpan({
            text: `  Error: ${tool.error}`,
            style: new TextStyle({ foreground: ERROR_COLOR_LOCAL }),
          }),
        }),
      );
    }

    return columnChildren.length === 1 ? mainRow : new Column({ children: columnChildren });
  }

  /**
   * Build an ActivityGroupItem widget — renders activity group with optional tree lines.
   *
   * Matches amp's Y1T pattern (actions_intents.js 1839-1872) for simple groups:
   *   {spinner|✓} {summary(toolName color)}
   *
   * B3: When actions are present, renders each action with tree-line box-drawing:
   *   ├── {statusIcon} {toolName} {detail}
   *   ╰── {statusIcon} {toolName} {detail}
   *
   * When isSubagent, shows "Subagent {label}" header.
   *
   * 逆向: Y1T build() line 1846-1853 (summary row),
   *        chunk-006.js:28457-28786 (subagent nested rendering via uR padding),
   *        tree decorators ├── and ╰──
   *
   * @param group - ActivityGroupItem from DisplayItem[]
   * @returns Activity group Widget
   */
  private _buildActivityGroupWidget(group: ActivityGroupItem): Widget {
    // Header line: spinner/checkmark + label
    const headerSpans: TextSpan[] = [];

    if (group.hasInProgress) {
      headerSpans.push(
        new TextSpan({
          text: `${this._spinner.toBraille()} `,
          style: new TextStyle({ foreground: TOOL_COLOR }),
        }),
      );
    } else {
      headerSpans.push(
        new TextSpan({
          text: "\u2713 ",
          style: new TextStyle({ foreground: SUCCESS_COLOR }),
        }),
      );
    }

    // B3: Subagent header — 逆向: chunk-006.js:28457 qv class
    if (group.isSubagent) {
      const label = group.subagentLabel ?? "Subagent";
      const expandIndicator = group.actions && group.actions.length > 0 ? " \u25BC" : " \u25B6";
      headerSpans.push(
        new TextSpan({
          text: `Subagent ${label}`,
          style: new TextStyle({ foreground: TOOL_COLOR }),
        }),
      );
      headerSpans.push(
        new TextSpan({
          text: expandIndicator,
          style: new TextStyle({ foreground: DIM_COLOR }),
        }),
      );
    } else {
      // Summary text
      headerSpans.push(
        new TextSpan({
          text: group.summary,
          style: new TextStyle({ foreground: DIM_COLOR }),
        }),
      );
    }

    const headerRow = new RichText({
      text: new TextSpan({ children: headerSpans }),
    });

    // B3: If actions exist, render tree lines — 逆向: chunk-006.js:28586-28606
    //   uR padding left:2, nested Jb (Column) with tool widgets
    //   Tree decorators: ├── for non-last, ╰── for last
    if (!group.actions || group.actions.length === 0) {
      return headerRow;
    }

    const INDENT = "    "; // 4 spaces indent for nested actions
    const actionWidgets: Widget[] = [];

    for (let i = 0; i < group.actions.length; i++) {
      const action = group.actions[i];
      const isLast = i === group.actions.length - 1;
      const treeChar = isLast ? "\u2570\u2500\u2500" : "\u251C\u2500\u2500"; // ╰── or ├──

      const actionSpans: TextSpan[] = [];

      // Tree connector
      actionSpans.push(
        new TextSpan({
          text: `${INDENT}${treeChar} `,
          style: new TextStyle({ foreground: DIM_COLOR }),
        }),
      );

      // Status icon for action
      if (action.status === "in-progress") {
        actionSpans.push(
          new TextSpan({
            text: `${this._spinner.toBraille()} `,
            style: new TextStyle({ foreground: TOOL_COLOR }),
          }),
        );
      } else {
        const icon = _getActionStatusIcon(action.status);
        const color = _getActionStatusColor(action.status);
        actionSpans.push(
          new TextSpan({
            text: `${icon} `,
            style: new TextStyle({ foreground: color }),
          }),
        );
      }

      // Tool name
      actionSpans.push(
        new TextSpan({
          text: action.toolName,
          style: new TextStyle({ foreground: TOOL_COLOR }),
        }),
      );

      actionWidgets.push(
        new RichText({
          text: new TextSpan({ children: actionSpans }),
        }),
      );
    }

    return new Column({
      children: [headerRow, ...actionWidgets],
    });
  }

  /**
   * Build a ThinkingItem widget — renders a thinking block with expand/collapse.
   *
   * 逆向: Rd / fJT (chunk-006.js:16846-17009) — ThinkingBlock widget.
   * Collapsed: "✓ Thinking ▶" (SUCCESS_COLOR for ✓, DIM for text, ▶ indicator)
   * Expanded: "✓ Thinking ▼" followed by thinking text in DIM_COLOR with 2-space indent
   *
   * @param item - ThinkingItem from DisplayItem[]
   * @param itemIndex - Index in the items array, used to track expand/collapse state
   * @returns Thinking block Widget
   */
  private _buildThinkingWidget(item: ThinkingItem, itemIndex: number): Widget {
    const isExpanded = this._expandedThinking.has(itemIndex);

    const spans: TextSpan[] = [];

    // 逆向: fJT.build() line 16905 — "✓ " in success color for complete thinking
    spans.push(
      new TextSpan({
        text: "\u2713 ",
        style: new TextStyle({ foreground: SUCCESS_COLOR }),
      }),
    );

    // "Thinking" label — 逆向: chunk-006.js:16921 new G(h.header ?? "Thinking", ...)
    spans.push(
      new TextSpan({
        text: "Thinking",
        style: new TextStyle({ foreground: DIM_COLOR }),
      }),
    );

    // Expand/collapse indicator — 逆向: chunk-006.js:16911
    // expanded: ▼, collapsed: ▶
    const hasContent = item.text.trim().length > 0;
    if (hasContent) {
      spans.push(
        new TextSpan({
          text: " ",
        }),
      );
      spans.push(
        new TextSpan({
          text: isExpanded ? "\u25BC" : "\u25B6",
          style: new TextStyle({ foreground: DIM_COLOR }),
        }),
      );
    }

    const headerRow = new RichText({
      text: new TextSpan({ children: spans }),
    });

    // If expanded, show thinking text below with 2-space indent
    // 逆向: fJT.build() line 16996-17005 — uR padding left:2, Z3 markdown content
    if (isExpanded && hasContent) {
      // Indent each line by 2 spaces
      const indentedText = item.text
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");

      return new Column({
        children: [
          headerRow,
          new RichText({
            text: new TextSpan({
              text: indentedText,
              style: new TextStyle({ foreground: DIM_COLOR, italic: true }),
            }),
          }),
        ],
      });
    }

    return headerRow;
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
 * - in-progress → "⟳" (fallback; callers use BrailleSpinner.toBraille() for live animation)
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
      // B1: Bash command is now rendered inline as "$ {command}" — no separate detail needed
      return null;
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

/**
 * Get status icon for an ActivityAction status.
 *
 * Uses same icon set as tool status but with the reduced status set
 * (ActivityAction only has done/error/cancelled/in-progress).
 */
function _getActionStatusIcon(status: ActivityAction["status"]): string {
  switch (status) {
    case "done":
      return "\u2713"; // ✓
    case "error":
      return "\u2715"; // ✕
    case "in-progress":
      return "\u27F3"; // ⟳
    case "cancelled":
      return "\u2298"; // ⊘
  }
}

/**
 * Get status color for an ActivityAction status.
 */
function _getActionStatusColor(status: ActivityAction["status"]): Color {
  switch (status) {
    case "done":
      return SUCCESS_COLOR;
    case "error":
      return ERROR_COLOR_LOCAL;
    case "in-progress":
      return TOOL_COLOR;
    case "cancelled":
      return CANCELLED_COLOR;
  }
}