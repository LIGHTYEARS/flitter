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

import { isAbsolute, resolve } from "node:path";
import type { BuildContext, Element, Widget } from "@flitter/tui";
import {
  Border,
  BorderSide,
  BoxDecoration,
  BrailleSpinner,
  Color,
  Column,
  Container,
  EdgeInsets,
  Expanded,
  GestureDetector,
  MarkdownParser,
  MarkdownRenderer,
  RenderChart,
  RichText,
  Row,
  Scrollable,
  Scrollbar,
  ScrollController,
  ScrollViewport,
  SizedBox,
  State,
  StatefulWidget,
  SyntaxHighlighter,
  supportsKittyGraphics,
  syntaxColorsToTheme,
  TextSpan,
  TextStyle,
} from "@flitter/tui";
import { openInPager } from "../util/pager.js";
import { type AppTheme, AppThemeController } from "./app-theme-controller.js";
import { buildDiffWidget } from "./diff-widget.js";
import {
  type ActivityAction,
  type ActivityGroupItem,
  type DisplayItem,
  deduplicateGuidanceFiles,
  type MessageItem,
  type ThinkingItem,
  type ToolItem,
} from "./display-items.js";
import { ExpandableToolHeader } from "./expandable-tool-header.js";
import { cwdRelativePath, guidanceFileDisplayName } from "./guidance-file-display.js";

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
 * @property selectedItemIndex - Index in items[] of the currently selected message (for browse mode highlight)
 */
export interface ConversationViewConfig {
  /** External scroll controller (owned by parent, e.g. ThreadStateWidget) */
  scrollController?: ScrollController;
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
  /**
   * Current working directory for workspace-relative path display.
   * Used to convert absolute file paths to short relative paths.
   * 逆向: ki() (2651_unknown_qD0.js) uses workspace root to shorten paths.
   */
  cwd?: string;
  /**
   * Index in items[] of the currently selected (browse-mode) message.
   *
   * When set, the corresponding user message widget is rendered with a full
   * 2-thick solid border using the `selectedMessage` AppTheme color instead of
   * the normal left-only border.
   *
   * 逆向: f8R._stateController.selectedUserMessageOrdinal → S$ widget isSelected prop
   *   → decoration: { border: new h9(new e9(r, 2, "solid"), ...) } full-border
   *   vs non-selected: only left border
   */
  selectedItemIndex?: number | null;
}

// ════════════════════════════════════════════════════
//  颜色常量 (来自 ThemeData / Tokyo Night 调色板)
// ════════════════════════════════════════════════════

/** primary 色 — 用户角色指示器
 * 逆向: yS.default() → LT.cyan = userMessage */
const PRIMARY_COLOR = Color.indexed(6);

/** accent 色 — 助手角色指示器
 * 逆向: yS.default() → LT.magenta */
const ACCENT_COLOR = Color.indexed(5);

/** secondary 色 — 系统角色指示器 / user message border
 * 逆向: yS.default() → LT.green = success */
const SECONDARY_COLOR = Color.indexed(2);

/** error 色 — 错误文本
 * 逆向: yS.default() → LT.red = toolError */
const ERROR_COLOR = Color.indexed(1);

/** mutedText 色 — 占位符、次要信息 (terminal default + dim)
 * 逆向: yS.default() → LT.default() + dim:true */
const MUTED_TEXT_COLOR = Color.default();

/** tool name 色 — 工具名称 (bold, terminal default)
 * 逆向: yS.default() → LT.default() = toolName */
const TOOL_NAME_COLOR = Color.default();

/** tool running 色 — 工具运行中 spinner/状态
 * 逆向: yS.default() → LT.blue = toolRunning */
const TOOL_RUNNING_COLOR = Color.indexed(4);

/** dim 色 — 工具参数等次要信息
 * 逆向: R.colors.mutedForeground → terminal default + dim */
const DIM_COLOR = Color.default();

/** success 色 — 工具完成
 * 逆向: $R.app.toolSuccess → LT.green */
const SUCCESS_COLOR = SECONDARY_COLOR;

/** error 色 — 工具错误 (same as ERROR_COLOR)
 * 逆向: $R.app.toolError → LT.red */
const ERROR_COLOR_LOCAL = ERROR_COLOR;

/** cancelled 色 — 工具取消/拒绝
 * 逆向: $R.app.toolCancelled → LT.yellow */
const CANCELLED_COLOR = Color.indexed(3);

/** command 色 — grep pattern, command arguments
 * 逆向: $R.app.command → LT.yellow */
const COMMAND_COLOR = Color.indexed(3);

/** warning 色 — interrupted user message border, read range indicator
 * 逆向: S$ widget — R.interrupted switches border from e.success (green)
 * to e.warning (amber). misc_utils.js:9037 `let l = R.interrupted ? e.warning : e.success;`
 * 逆向: B9R (misc_utils.js:7802-7806) — @start-end range in e.colors.warning */
const WARNING_COLOR = Color.indexed(3);

// ════════════════════════════════════════════════════
//  Path helpers
// ════════════════════════════════════════════════════

/**
 * Build a `file://` URI from a file path.
 *
 * 逆向: JM(h, T) (misc_utils.js:7793) — converts a file path to a file:// URI
 *   for use in OSC 8 hyperlinks. Resolves relative paths against `cwd`.
 *
 * @param filePath - Absolute or relative file path
 * @param cwd - Working directory for resolving relative paths
 * @returns `file://` URI string
 */
function toFileUri(filePath: string, cwd?: string): string {
  if (filePath.startsWith("file://")) return filePath;
  const abs = isAbsolute(filePath) ? filePath : resolve(cwd ?? process.cwd(), filePath);
  return `file://${abs}`;
}

// ════════════════════════════════════════════════════
//  角色配置映射
// ════════════════════════════════════════════════════

/** 角色 -> {前缀, 颜色} 映射 */
const ROLE_CONFIG: Record<string, { prefix: string; color: Color }> = {
  user: { prefix: "You: ", color: PRIMARY_COLOR },
  // 逆向: amp has NO assistant role prefix — only user messages get ┃ border
  assistant: { prefix: "", color: ACCENT_COLOR },
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
   * Expansion state for activity groups, keyed by item index.
   * 逆向: stateController.denseViewItemStates Map
   */
  private _activityGroupExpanded: Map<number, boolean> = new Map();

  /**
   * Per activity-group progressive animation state.
   * 逆向: h9R (actions_intents.js:4397-4443) — visibleActionCount + _scheduleAppendStep(90ms)
   */
  private _activityGroupVisibleCount: Map<number, number> = new Map();
  private _activityGroupAppendTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();

  /**
   * Tracks which activity groups the user has manually toggled.
   * Auto-collapse skips "touched" groups to respect user preference.
   * 逆向: stateController.denseViewItemTouched Set (chunk-005.js:2677)
   */
  private _activityGroupTouched: Set<number> = new Set();

  /**
   * Previous hasInProgress state per group, for detecting done transitions.
   * 逆向: n8R._closeDenseActivityGroupsOnBoundary (chunk-005.js:2674-2693)
   */
  private _activityGroupWasInProgress: Map<number, boolean> = new Map();

  /**
   * ScrollController for conversation auto-scroll (followMode: true).
   * 逆向: amp f8R uses a single controller passed from the parent (jetbrains_wizard.js:5011)
   * When an external controller is provided via config, we use it directly.
   */
  private _scrollController!: ScrollController;
  private _ownsScrollController = false;

  /**
   * 初始化状态。
   *
   * 创建 MarkdownParser 和 MarkdownRenderer 实例。
   */
  initState(): void {
    super.initState();
    this._parser = new MarkdownParser();
    // 逆向: chunk-006.js:11773 — R.app.syntaxHighlight wired into markdown renderer
    // Read AppTheme to pass syntax highlight colors; fall back to default theme
    let syntaxTheme: ReturnType<typeof SyntaxHighlighter.defaultTheme>;
    try {
      const appTheme = AppThemeController.maybeOf(this.context as unknown as Element);
      syntaxTheme = appTheme
        ? syntaxColorsToTheme(appTheme.syntaxHighlight)
        : SyntaxHighlighter.defaultTheme();
    } catch {
      // No AppThemeController in ancestor tree — fall back to default theme
      syntaxTheme = SyntaxHighlighter.defaultTheme();
    }
    this._renderer = new MarkdownRenderer({ syntaxTheme });
    if (this.widget.config.scrollController) {
      this._scrollController = this.widget.config.scrollController;
      this._ownsScrollController = false;
    } else {
      this._scrollController = new ScrollController();
      this._ownsScrollController = true;
    }

    // 逆向: Y1T.initState() — if (this._isActive) this._startAnimation()
    if (this._hasInProgress()) {
      this._startAnimation();
    }

    // Initialize visible action counts for existing activity groups
    // 逆向: h9R.initState — this.visibleActionCount = this.widget.props.actions.length
    const initItems = this.widget.config.items;
    if (initItems) {
      for (let i = 0; i < initItems.length; i++) {
        const item = initItems[i];
        if (item.type === "activity-group") {
          this._activityGroupVisibleCount.set(i, item.actions.length);
          this._activityGroupWasInProgress.set(i, item.hasInProgress);
        }
      }
    }
  }

  /**
   * 清理资源。
   */
  dispose(): void {
    // 逆向: Y1T.dispose() — this._stopAnimation(), this._clearPendingAppendTimer(), ...
    this._stopAnimation();
    for (const timer of this._activityGroupAppendTimers.values()) {
      clearTimeout(timer);
    }
    this._activityGroupAppendTimers.clear();
    if (this._ownsScrollController) {
      this._scrollController.dispose();
    }
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
        (item.type === "tool" && item.status === "in-progress") ||
        (item.type === "thinking" && (item as ThinkingItem).isStreaming === true),
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
   * Progressively reveal action rows at 90ms intervals.
   * 逆向: h9R._scheduleAppendStep (actions_intents.js:4436-4443)
   */
  private _scheduleAppendStep(itemIndex: number, targetCount: number): void {
    if ((this._activityGroupVisibleCount.get(itemIndex) ?? 0) >= targetCount) return;
    if (this._activityGroupAppendTimers.has(itemIndex)) return;

    const timer = setTimeout(() => {
      this._activityGroupAppendTimers.delete(itemIndex);
      this.setState(() => {
        const current = this._activityGroupVisibleCount.get(itemIndex) ?? 0;
        this._activityGroupVisibleCount.set(itemIndex, Math.min(current + 1, targetCount));
      });
      this._scheduleAppendStep(itemIndex, targetCount);
    }, 90);
    this._activityGroupAppendTimers.set(itemIndex, timer);
  }

  /**
   * Clear a pending append timer for a specific activity group.
   * 逆向: h9R._clearPendingAppendTimer (actions_intents.js:4432-4435)
   */
  private _clearAppendTimer(itemIndex: number): void {
    const timer = this._activityGroupAppendTimers.get(itemIndex);
    if (timer) {
      clearTimeout(timer);
      this._activityGroupAppendTimers.delete(itemIndex);
    }
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

    // 逆向: _closeDenseActivityGroupsOnBoundary — auto-collapse completed groups
    // Respects user-touched state (逆向: stateController.denseViewItemTouched)
    // 逆向: h9R.didUpdateWidget — progressive animation state management
    const items = this.widget.config.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type !== "activity-group") continue;

        const wasInProgress = this._activityGroupWasInProgress.get(i) ?? false;
        const isNowInProgress = item.hasInProgress;

        // Update progressive animation state
        if (isNowInProgress) {
          const totalActions = item.actions.length;
          const visibleCount = this._activityGroupVisibleCount.get(i) ?? 0;
          if (visibleCount < totalActions) {
            this._scheduleAppendStep(i, totalActions);
          }
        } else {
          // Completed: show all, clean up timer
          this._clearAppendTimer(i);
          this._activityGroupVisibleCount.delete(i);
        }

        // Auto-collapse on in-progress → done transition
        if (wasInProgress && !isNowInProgress) {
          if (!this._activityGroupTouched.has(i)) {
            this._activityGroupExpanded.set(i, false);
          }
        }
        this._activityGroupWasInProgress.set(i, isNowInProgress);
      }
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

    // 逆向: $R.of(T).app — access AppTheme from context for semantic colors
    // Use try/catch because build() may receive a mock BuildContext in tests
    let appTheme: AppTheme | null = null;
    try {
      appTheme = AppThemeController.maybeOf(_context as unknown as Element);
    } catch {
      // No AppThemeController in ancestor tree — fall back to hardcoded colors
    }

    // Prefer items (new DisplayItem path) over legacy messages
    if (items && items.length > 0) {
      return this._buildFromItems(
        items,
        inferenceState,
        error,
        appTheme,
        this.widget.config.selectedItemIndex ?? null,
      );
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
   *
   * @param items - Display items
   * @param inferenceState - Current inference state
   * @param error - Latest error, if any
   * @param appTheme - Optional AppTheme for semantic colors
   * @param selectedItemIndex - Index in items[] of currently selected message (browse mode)
   */
  private _buildFromItems(
    items: DisplayItem[],
    _inferenceState?: "idle" | "running",
    error?: Error | null,
    appTheme?: AppTheme | null,
    selectedItemIndex?: number | null,
  ): Widget {
    const children: Widget[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      switch (item.type) {
        case "message":
          children.push(this._buildMessageItemWidget(item, appTheme, i === selectedItemIndex));
          break;
        case "tool":
          children.push(this._buildToolWidget(item, appTheme));
          break;
        case "activity-group":
          children.push(this._buildActivityGroupWidget(item, i, appTheme));
          break;
        case "thinking":
          children.push(this._buildThinkingWidget(item, i, appTheme));
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
            style: new TextStyle({ foreground: MUTED_TEXT_COLOR, dim: true }),
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
            position: "bottom",
            viewportBuilder: (_ctx, ctrl) =>
              new ScrollViewport({
                controller: ctrl,
                position: "bottom",
                child: contentColumn,
              }),
          }),
        }),
        new Scrollbar({
          controller,
          getScrollInfo: () => ({
            totalContentHeight: controller.maxScrollExtent + (controller.viewportDimension || 24),
            viewportHeight: controller.viewportDimension || 24,
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
   * When item.isStreaming is true, uses renderStreaming() to strip trailing empty
   * paragraphs and appends a block cursor character.
   *
   * 逆向: amp-cli-reversed/modules/1959_unknown_x8R.js — uses renderStreaming() for
   * streaming messages, renders trailing cursor block █ in accent color.
   * 逆向: chunk-005.js:2956 — a.app.userMessage for user role color
   * 逆向: chunk-006.js:11759 — R.app.assistantMessage for assistant markdown style
   *
   * @param item - MessageItem from DisplayItem[]
   * @param appTheme - Optional AppTheme for semantic message colors
   * @param isSelected - Whether this message is currently selected in browse mode
   * @returns Message Widget
   */
  private _buildMessageItemWidget(
    item: MessageItem,
    appTheme?: AppTheme | null,
    isSelected?: boolean,
  ): Widget {
    // 逆向: S$ widget — user messages get left border, not role prefix
    if (item.role === "user") {
      return this._buildUserMessageWidget(item, appTheme, isSelected);
    }

    // Assistant/system messages keep the role prefix + markdown
    // 逆向: chunk-005.js:2956 — a.app.userMessage; chunk-006.js:11759 — R.app.assistantMessage
    const roleConfig = ROLE_CONFIG[item.role] ?? {
      prefix: `${item.role}: `,
      color: MUTED_TEXT_COLOR,
    };

    // Use AppTheme colors when available
    const roleColor =
      item.role === "assistant"
        ? (appTheme?.assistantMessage ?? roleConfig.color)
        : item.role === "system"
          ? (appTheme?.systemMessage ?? roleConfig.color)
          : roleConfig.color;

    const roleSpan = new TextSpan({
      text: roleConfig.prefix,
      style: new TextStyle({
        bold: true,
        foreground: roleColor,
      }),
    });

    const ast = this._parser.parse(item.text);
    // 逆向: x8R — use renderStreaming() for streaming messages (strips trailing empty paragraphs)
    const contentSpans = item.isStreaming
      ? this._renderer.renderStreaming(ast)
      : this._renderer.render(ast);

    const children: TextSpan[] = [];

    // Only add role prefix if non-empty
    // 逆向: amp has NO assistant prefix — only user messages get ┃ border
    if (roleConfig.prefix) {
      children.push(roleSpan, new TextSpan({ text: "\n" }));
    }

    if (item.images && item.images > 0) {
      children.push(...this._buildImageLabels(item.images));
    }
    children.push(...contentSpans);

    // 逆向: x8R — append block cursor █ in accent color for streaming messages
    if (item.isStreaming) {
      children.push(
        new TextSpan({
          text: "\u2588", // █ block cursor
          style: new TextStyle({ foreground: ACCENT_COLOR }),
        }),
      );
    }

    const messageWidget = new RichText({
      text: new TextSpan({
        children,
      }),
      selectable: true,
    });

    // Token usage display (逆向: NJT feature flag)
    if (item.role === "assistant" && item.usage) {
      const usageText = `─ ${item.usage.inputTokens} input · ${item.usage.outputTokens} output`;
      const usageWidget = new RichText({
        text: new TextSpan({
          text: usageText,
          style: new TextStyle({ foreground: MUTED_TEXT_COLOR, dim: true }),
        }),
      });
      return new Column({ children: [messageWidget, usageWidget] });
    }

    return messageWidget;
  }

  /**
   * Build [image N] label spans for image content blocks.
   * 逆向: _8R (1953_unknown__8R.js:23-27) — underlined italic labels
   *
   * Shows contextual text based on terminal capabilities:
   * - Kitty-capable: "[image N]" (could render inline in future)
   * - Other terminals: "[image N — terminal does not support inline images]"
   */
  private _buildImageLabels(count: number): TextSpan[] {
    const spans: TextSpan[] = [];
    const hasKitty = supportsKittyGraphics();
    for (let i = 0; i < count; i++) {
      if (i > 0) spans.push(new TextSpan({ text: " " }));
      const label = hasKitty
        ? `[image ${i + 1}]`
        : `[image ${i + 1} — terminal does not support inline images]`;
      spans.push(
        new TextSpan({
          text: label,
          style: new TextStyle({
            underline: true,
            foreground: MUTED_TEXT_COLOR,
            italic: true,
            dim: true,
          }),
        }),
      );
    }
    spans.push(new TextSpan({ text: "\n" }));
    return spans;
  }

  /**
   * Build a user message with left border decoration.
   *
   * When `isSelected` is true (browse mode), renders a full 2-thick solid border
   * using the `selectedMessage` AppTheme color.
   * When not selected, renders only a left border (normal mode).
   *
   * 逆向: S$ widget (chunk-006.js:31134-31143) — non-selected:
   *   decoration: { border: new h9(void 0, void 0, void 0, new e9(r, 2, "solid")) }
   *   padding: TR.only({ left: 1 })
   *   Color: e.success for normal, e.warning for interrupted
   *
   * 逆向: S$ widget isSelected=true (chunk-006.js:31130-31133) — selected:
   *   decoration: { border: new h9(new e9(r, 2, "solid"), new e9(r, 2, "solid"), ...) } full border
   *   Color: e.selectedMessage (from AppTheme)
   *   padding: TR.only({ left: 1 })
   *
   * 逆向: chunk-005.js:2956 — a.app.userMessage for user message color
   *
   * @param item - User MessageItem
   * @param appTheme - Optional AppTheme for semantic message colors
   * @param isSelected - Whether this message is selected in browse/navigation mode
   */
  private _buildUserMessageWidget(
    item: MessageItem,
    _appTheme?: AppTheme | null,
    isSelected?: boolean,
  ): Widget {
    const ast = this._parser.parse(item.text);
    const contentSpans = this._renderer.render(ast);

    // Prepend image labels if images exist
    const allSpans: TextSpan[] = [];
    if (item.images && item.images > 0) {
      allSpans.push(...this._buildImageLabels(item.images));
    }
    allSpans.push(...contentSpans);

    if (item.interrupted) {
      allSpans.push(
        new TextSpan({
          text: " (interrupted)",
          style: new TextStyle({ foreground: WARNING_COLOR, italic: true }),
        }),
      );
    }

    const content = new RichText({
      text: new TextSpan({ children: allSpans }),
      selectable: true,
    });

    let borderWidget: Widget;

    if (isSelected) {
      // 逆向: S$ widget isSelected → full border using selectedMessage color
      // h9 = Border (top, right, bottom, left), e9 = BorderSide(color, width, style)
      // All four sides get a 2-wide solid border in selectedMessage color
      const selectedColor = _appTheme?.selectedMessage ?? Color.green();
      borderWidget = new Container({
        decoration: new BoxDecoration({
          border: new Border(
            new BorderSide(selectedColor, 2, "solid"), // top
            new BorderSide(selectedColor, 2, "solid"), // right
            new BorderSide(selectedColor, 2, "solid"), // bottom
            new BorderSide(selectedColor, 2, "solid"), // left
          ),
        }),
        padding: EdgeInsets.only({ left: 1 }),
        child: content,
      });
    } else {
      // Normal (non-selected): left border only
      const borderColor = item.interrupted ? WARNING_COLOR : SECONDARY_COLOR;
      borderWidget = new Container({
        decoration: new BoxDecoration({
          border: new Border(
            undefined, // top
            undefined, // right
            undefined, // bottom
            new BorderSide(borderColor, 2, "solid"), // left: warning amber when interrupted, success green otherwise
          ),
        }),
        padding: EdgeInsets.only({ left: 1 }),
        child: content,
      });
    }

    // 逆向: b8R — render discovered guidance files below user message
    if (item.discoveredGuidanceFiles && item.discoveredGuidanceFiles.length > 0) {
      const guidanceWidgets: Widget[] = item.discoveredGuidanceFiles.map((file) => {
        const basename = file.uri.split("/").pop() ?? file.uri;
        return new RichText({
          text: new TextSpan({
            text: `Loaded ${basename} (${file.lineCount} lines)`,
            style: new TextStyle({ foreground: SUCCESS_COLOR, dim: true }),
          }),
        });
      });
      return new Column({
        children: [borderWidget, ...guidanceWidgets],
      });
    }

    return borderWidget;
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
   * - in-progress → toolRunning (TOOL_RUNNING_COLOR)
   * - cancelled/rejected → toolCancelled (CANCELLED_COLOR)
   *
   * 逆向: oE0(T, R) (chunk-004.js:21143) — R.app.toolSuccess/toolError/toolCancelled/toolRunning
   * 逆向: chunk-006.js:6179 — R.app.toolRunning for spinner
   * 逆向: chunk-006.js:6184 — R.app.toolName for tool name
   *
   * @param tool - ToolItem from DisplayItem[]
   * @param appTheme - Optional AppTheme for semantic colors
   * @returns Tool row Widget
   */
  private _buildToolWidget(tool: ToolItem, appTheme?: AppTheme | null): Widget {
    const isInProgress = tool.status === "in-progress";
    const isBash = tool.kind === "bash";

    // Resolve semantic colors from AppTheme with fallbacks
    const toolRunningColor = appTheme?.toolRunning ?? TOOL_RUNNING_COLOR;
    const toolNameColor = appTheme?.toolName ?? TOOL_NAME_COLOR;
    const toolErrorColor = appTheme?.toolError ?? ERROR_COLOR_LOCAL;
    const toolSuccessColor = appTheme?.toolSuccess ?? SUCCESS_COLOR;

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
            style: new TextStyle({ foreground: toolRunningColor }),
          }),
        );
      } else {
        const hasNonZeroExit =
          tool.status === "done" && typeof tool.exitCode === "number" && tool.exitCode !== 0;
        const statusColor = hasNonZeroExit
          ? toolErrorColor
          : _getStatusColor(tool.status, appTheme);
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
      if (tool.status === "cancelled" || tool.status === "cancellation-requested") {
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

      // Q9R metadata: (in: <cwd>, exit code: N) — 逆向: modules/1948_unknown_Q9R.js
      if (tool.status !== "rejected-by-user") {
        const metaSpans: TextSpan[] = [];
        const italicStyle = new TextStyle({ italic: true });
        const italicDimStyle = new TextStyle({ italic: true, dim: true });

        if (tool.cwd) {
          const relPath = tool.cwd;
          metaSpans.push(new TextSpan({ text: " (", style: italicStyle }));
          metaSpans.push(new TextSpan({ text: "in: ", style: italicDimStyle }));
          metaSpans.push(new TextSpan({ text: relPath, style: italicDimStyle }));
        }

        if (tool.status === "done" && typeof tool.exitCode === "number" && tool.exitCode !== 0) {
          if (metaSpans.length > 0) {
            metaSpans.push(new TextSpan({ text: ", ", style: italicStyle }));
          } else {
            metaSpans.push(new TextSpan({ text: " (", style: italicStyle }));
          }
          metaSpans.push(new TextSpan({ text: "exit code: ", style: italicStyle }));
          metaSpans.push(
            new TextSpan({
              text: String(tool.exitCode),
              style: new TextStyle({ italic: true, foreground: toolErrorColor }),
            }),
          );
        }

        if (metaSpans.length > 0) {
          metaSpans.push(new TextSpan({ text: ")", style: italicStyle }));
          spans.push(...metaSpans);
        }
      }

      // Status suffix — 逆向: chunk-006.js:30045-30051
      if (tool.status === "rejected-by-user") {
        spans.push(
          new TextSpan({
            text: " (rejected)",
            style: new TextStyle({ dim: true, italic: true }),
          }),
        );
      } else if (tool.status === "cancelled" || tool.status === "cancellation-requested") {
        spans.push(
          new TextSpan({
            text: " (cancelled)",
            style: new TextStyle({ foreground: CANCELLED_COLOR, italic: true }),
          }),
        );
      }

      // Continuation lines — 逆向: chunk-006.js:30052-30055
      // After status suffix, push newline then render lines 2+ indented with "  " prefix
      if (cmdLines.length > 1) {
        spans.push(new TextSpan({ text: "\n" }));
        const continuationStyle =
          tool.status === "cancelled" || tool.status === "cancellation-requested"
            ? new TextStyle({ bold: true, strikethrough: true })
            : tool.status === "rejected-by-user"
              ? new TextStyle({ bold: true, dim: true })
              : cmdStyle;
        for (let i = 1; i < cmdLines.length; i++) {
          spans.push(
            new TextSpan({
              text: `  ${cmdLines[i]}\n`,
              style: continuationStyle,
            }),
          );
        }
      }
    } else if (tool.kind === "read") {
      // 逆向: B9R (misc_utils.js:7776-7823) → x3 (misc_utils.js:6312-6356)
      // Standalone Read tool row: status icon + "Read" bold + file path hyperlink + optional @range
      const fileRefColor = appTheme?.fileReference ?? Color.cyan();

      if (isInProgress) {
        spans.push(
          new TextSpan({
            text: `${this._spinner.toBraille()} `,
            style: new TextStyle({ foreground: toolRunningColor }),
          }),
        );
      } else {
        const icon = _getStatusIcon(tool.status);
        const iconColor = _getStatusColor(tool.status, appTheme);
        spans.push(
          new TextSpan({
            text: `${icon} `,
            style: new TextStyle({ foreground: iconColor }),
          }),
        );
      }

      // 逆向: x3/i9R — tool name in bold toolName color
      spans.push(
        new TextSpan({
          text: tool.toolName,
          style: new TextStyle({ bold: true, foreground: toolNameColor }),
        }),
      );

      // 逆向: B9R — H3 hyperlink with fileReference color, dim, underline
      if (tool.path) {
        const cwd = this.widget.config.cwd;
        const relPath = cwdRelativePath(tool.path, cwd);
        const fileUri = toFileUri(tool.path, cwd);
        spans.push(new TextSpan({ text: " " }));
        spans.push(
          new TextSpan({
            text: relPath,
            url: fileUri,
            style: new TextStyle({
              foreground: fileRefColor,
              dim: true,
              underline: true,
            }),
          }),
        );
      }

      // 逆向: B9R — ` @${c}-${s}` in warning color, dim
      if (tool.readRange) {
        const [start, end] = tool.readRange;
        const warningColor = appTheme?.warning ?? WARNING_COLOR;
        spans.push(
          new TextSpan({
            text: ` @${start}-${end}`,
            style: new TextStyle({ foreground: warningColor, dim: true }),
          }),
        );
      }
    } else if (tool.kind === "search") {
      // 逆向: W9R → x3 (misc_utils.js:8088-8126)
      // Grep/search: spinner/icon + "Grep" bold + pattern in command color + ` in <path>` dim
      const commandColor = appTheme?.command ?? COMMAND_COLOR;

      if (isInProgress) {
        spans.push(
          new TextSpan({
            text: `${this._spinner.toBraille()} `,
            style: new TextStyle({ foreground: toolRunningColor }),
          }),
        );
      } else {
        const icon = _getStatusIcon(tool.status);
        const iconColor = _getStatusColor(tool.status, appTheme);
        spans.push(
          new TextSpan({
            text: `${icon} `,
            style: new TextStyle({ foreground: iconColor }),
          }),
        );
      }

      spans.push(
        new TextSpan({
          text: tool.toolName,
          style: new TextStyle({ bold: true, foreground: toolNameColor }),
        }),
      );

      // 逆向: W9R — pattern text in app.command color (yellow)
      const pattern = tool.args && typeof tool.args.detail === "string" ? tool.args.detail : null;
      if (pattern) {
        spans.push(new TextSpan({ text: " " }));
        spans.push(
          new TextSpan({
            text: pattern,
            style: new TextStyle({ foreground: commandColor }),
          }),
        );
      }

      // 逆向: W9R — ` in <path>` in dim mutedForeground
      if (tool.path) {
        const cwd = this.widget.config.cwd;
        const relPath = cwdRelativePath(tool.path, cwd);
        spans.push(
          new TextSpan({
            text: ` in ${relPath}`,
            style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
          }),
        );
      }
    } else if (tool.kind === "edit" || tool.kind === "create-file") {
      // 逆向: j9R → x3 (misc_utils.js:7162) — Edit with hyperlinked file path
      const fileRefColor = appTheme?.fileReference ?? Color.cyan();

      if (isInProgress) {
        spans.push(
          new TextSpan({
            text: `${this._spinner.toBraille()} `,
            style: new TextStyle({ foreground: toolRunningColor }),
          }),
        );
      } else {
        const icon = _getStatusIcon(tool.status);
        const iconColor = _getStatusColor(tool.status, appTheme);
        spans.push(
          new TextSpan({
            text: `${icon} `,
            style: new TextStyle({ foreground: iconColor }),
          }),
        );
      }

      spans.push(
        new TextSpan({
          text: tool.toolName,
          style: new TextStyle({ bold: true, foreground: toolNameColor }),
        }),
      );

      // 逆向: j9R — H3 hyperlink with fileReference color, dim, underline
      if (tool.path) {
        const cwd = this.widget.config.cwd;
        const relPath = cwdRelativePath(tool.path, cwd);
        const fileUri = toFileUri(tool.path, cwd);
        spans.push(new TextSpan({ text: " " }));
        spans.push(
          new TextSpan({
            text: relPath,
            url: fileUri,
            style: new TextStyle({
              foreground: fileRefColor,
              dim: true,
              underline: true,
            }),
          }),
        );
      }
    } else {
      // Generic/other non-bash tools: status icon + tool name + detail (original behavior)
      if (isInProgress) {
        spans.push(
          new TextSpan({
            text: `${this._spinner.toBraille()} `,
            style: new TextStyle({ foreground: toolRunningColor }),
          }),
        );
      } else {
        const icon = _getStatusIcon(tool.status);
        const iconColor = _getStatusColor(tool.status, appTheme);
        spans.push(
          new TextSpan({
            text: `${icon} `,
            style: new TextStyle({ foreground: iconColor }),
          }),
        );
      }

      // Tool name (bold, tool color)
      // 逆向: chunk-006.js:6184 — R.app.toolName
      spans.push(
        new TextSpan({
          text: tool.toolName,
          style: new TextStyle({ bold: true, foreground: toolNameColor }),
        }),
      );

      // Contextual detail (dim) — varies by tool kind
      const detail = _getToolDetail(tool);
      if (detail) {
        spans.push(new TextSpan({ text: " " }));
        spans.push(
          new TextSpan({
            text: detail,
            style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
          }),
        );
      }
    }

    const mainRow = new RichText({
      text: new TextSpan({ children: spans }),
    });

    const columnChildren: Widget[] = [mainRow];

    // 逆向: Y9R (1947_unknown_Y9R.js) — guidance files rendered for ALL tool kinds (bash, read, etc.)
    // 逆向: Y9R is called unconditionally from both G9R and K9R build() methods
    // 逆向: ZA (modules/1831_unknown_ZA.js) — guidanceFileDisplayName for short display
    if (tool.guidanceFiles && tool.guidanceFiles.length > 0) {
      for (const gf of tool.guidanceFiles) {
        const gfName = guidanceFileDisplayName(gf.uri);
        columnChildren.push(
          new RichText({
            text: new TextSpan({
              text: `  Loaded ${gfName} (${gf.lineCount} lines)`,
              style: new TextStyle({ foreground: toolSuccessColor, dim: true }),
            }),
          }) as unknown as Widget,
        );
      }
    }

    // 逆向: chunk-004.js:21064-21067 — edit branch renders diff via cE0(T.diff, R)
    if ((tool.kind === "edit" || tool.kind === "create-file") && tool.diff) {
      columnChildren.push(buildDiffWidget(tool.diff, appTheme ?? undefined));
    }

    // 逆向: $9R (misc_utils.js:6962-7075) — apply_patch per-file diff rendering
    //   Renders summary header "N files M changes +A -D" then per-file rows with path +adds -dels
    //   Each file may have a diff block rendered below its path row.
    if (tool.kind === "edit" && tool.files?.length) {
      const totalAdditions = tool.files.reduce((sum, f) => sum + f.additions, 0);
      const totalDeletions = tool.files.reduce((sum, f) => sum + f.deletions, 0);
      const totalChanges = totalAdditions + totalDeletions;
      const fileCount = tool.files.length;

      // Summary header: "N file(s) M change(s) +A -D" (逆向: $9R lines 6985-6995)
      const summarySpans: TextSpan[] = [
        new TextSpan({
          text: `  ${fileCount} ${fileCount === 1 ? "file" : "files"} ${totalChanges} ${totalChanges === 1 ? "change" : "changes"}`,
          style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
        }),
      ];
      if (totalAdditions > 0) {
        summarySpans.push(
          new TextSpan({
            text: ` +${totalAdditions}`,
            style: new TextStyle({ foreground: toolSuccessColor }),
          }),
        );
      }
      if (totalDeletions > 0) {
        summarySpans.push(
          new TextSpan({
            text: ` -${totalDeletions}`,
            style: new TextStyle({ foreground: toolErrorColor }),
          }),
        );
      }
      columnChildren.push(new RichText({ text: new TextSpan({ children: summarySpans }) }));

      // Per-file rows (逆向: $9R lines 6999-7046 — path + +adds -dels + optional diff)
      for (const file of tool.files) {
        const fileSpans: TextSpan[] = [
          new TextSpan({
            text: `  ${file.path}`,
            style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
          }),
          new TextSpan({
            text: ` +${file.additions}`,
            style: new TextStyle({ foreground: toolSuccessColor }),
          }),
          new TextSpan({
            text: ` -${file.deletions}`,
            style: new TextStyle({ foreground: toolErrorColor }),
          }),
        ];
        columnChildren.push(new RichText({ text: new TextSpan({ children: fileSpans }) }));
        if (file.diff) {
          columnChildren.push(buildDiffWidget(file.diff, appTheme ?? undefined));
        }
      }
    }

    // B1: Bash output display — 逆向: 1946_unknown_on.js:on()
    //   on(T, R, a) renders output below command: CR strip, trimEnd, last 15 lines, truncation label above
    if (isBash && tool.output && tool.status !== "rejected-by-user") {
      const cleaned = tool.output.replace(/\r/g, "").trimEnd();
      const outputLines = cleaned.split("\n");
      const MAX_VISIBLE_LINES = 15;
      const truncated = outputLines.length > MAX_VISIBLE_LINES;
      const visibleLines = truncated ? outputLines.slice(-MAX_VISIBLE_LINES) : outputLines;

      // Truncation label ABOVE visible output (amp: `[... N lines truncated ...] `)
      if (truncated) {
        const truncatedCount = outputLines.length - MAX_VISIBLE_LINES;
        // \u9006\u5411: 1946_unknown_on.js:15-20 \u2014 truncation label + "View all" pager link (accent+underline, triggers yd0(fullText))
        const isComplete = tool.status === "done" || tool.status === "cancelled";
        const truncationChildren: TextSpan[] = [
          new TextSpan({
            text: `  [... ${truncatedCount} lines truncated ...] `,
            style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
          }),
        ];
        if (isComplete) {
          truncationChildren.push(
            new TextSpan({
              text: "View all",
              style: new TextStyle({ foreground: ACCENT_COLOR, underline: true }),
              onTap: () => openInPager(cleaned),
            }),
          );
        }
        columnChildren.push(
          new RichText({
            text: new TextSpan({ children: truncationChildren }),
          }),
        );
      }

      const outputText = visibleLines.join("\n") + "\n";
      columnChildren.push(
        new RichText({
          text: new TextSpan({
            text: `  ${outputText.split("\n").join("\n  ")}`,
            style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
          }),
        }),
      );
    }

    // Error message in red — 逆向: chunk-006.js:30056-30058
    // 逆向: R.app.toolError for error messages
    if (tool.error) {
      columnChildren.push(
        new RichText({
          text: new TextSpan({
            text: `  Error: ${tool.error}`,
            style: new TextStyle({ foreground: toolErrorColor }),
          }),
        }),
      );
    }

    // Chart rendering — 逆向: c8R/s8R (chunk-006.js:30792-30904)
    //   When chart tool result has parsed ChartData, render it using RenderChart.renderToLines().
    //   Width defaults to 80 columns; ideally should come from layout constraints.
    if (tool.chartData) {
      const CHART_WIDTH = Math.min(process.stdout.columns || 80, 120);
      const chartRenderer = new RenderChart(tool.chartData);
      const chartLines = chartRenderer.renderToLines(CHART_WIDTH);
      if (chartLines.length > 0) {
        columnChildren.push(
          new RichText({
            text: new TextSpan({
              text: chartLines.join("\n"),
            }),
          }),
        );
      }
    }

    return columnChildren.length === 1 ? mainRow : new Column({ children: columnChildren });
  }

  /**
   * Build an ActivityGroupItem widget — uses ExpandableToolHeader (flitter's Ds).
   *
   * 逆向: Y1T.build (actions_intents.js:1839-1872) —
   *   1. Build RichText titleWidget: [statusIcon + summary] in toolName color
   *   2. Build expanded child: Column of action rows via _buildActionRows
   *   3. Wrap in Ds (ExpandableToolHeader) with titleWidget, child, expanded, onChanged
   *
   * 逆向: actions_intents.js:4460-4484 — subagent variant also uses Ds with
   *   styled summary title + action rows. Includes guidance files (Jm) above actions.
   *
   * @param group - ActivityGroupItem from DisplayItem[]
   * @param itemIndex - Index in items array, used to key collapse state
   * @param appTheme - Optional AppTheme for semantic colors
   * @returns ExpandableToolHeader widget
   */
  private _buildActivityGroupWidget(
    group: ActivityGroupItem,
    itemIndex?: number,
    appTheme?: AppTheme | null,
  ): Widget {
    // Resolve semantic colors from AppTheme with fallbacks
    const toolRunningColor = appTheme?.toolRunning ?? TOOL_RUNNING_COLOR;
    const toolSuccessColor = appTheme?.toolSuccess ?? SUCCESS_COLOR;
    const toolNameColor = appTheme?.toolName ?? TOOL_NAME_COLOR;

    // 逆向: denseViewItemStates.get(id) ?? !completed — default expanded when in-progress
    const defaultExpanded = group.hasInProgress;
    const isExpanded =
      itemIndex !== undefined
        ? (this._activityGroupExpanded.get(itemIndex) ?? defaultExpanded)
        : defaultExpanded;

    // ── Build titleWidget (status icon + summary as RichText) ──
    // 逆向: Y1T.build (actions_intents.js:1845-1857) — builds spans then wraps in xT
    const headerSpans: TextSpan[] = [];

    // Status icon for the group
    // 逆向: actions_intents.js:1846-1850 — spinner (active) or ✓ (completed)
    if (group.hasInProgress) {
      headerSpans.push(
        new TextSpan({
          text: `${this._spinner.toBraille()} `,
          style: new TextStyle({ foreground: toolRunningColor }),
        }),
      );
    } else {
      headerSpans.push(
        new TextSpan({
          text: "\u2713 ",
          style: new TextStyle({ foreground: toolSuccessColor }),
        }),
      );
    }

    // Summary text
    // 逆向: actions_intents.js:1851-1853 — summary in R.app.toolName color
    headerSpans.push(
      new TextSpan({
        text: group.summary,
        style: new TextStyle({ foreground: toolNameColor }),
      }),
    );

    const titleWidget = new RichText({
      text: new TextSpan({ children: headerSpans }),
      selectable: true,
    }) as unknown as Widget;

    // ── Build expanded child: action rows ──
    // 逆向: actions_intents.js:1859-1862 — Column of action rows when expanded
    const actionChild = this._buildActionRows(group, itemIndex, appTheme);

    // ── Wrap in ExpandableToolHeader (Ds) ──
    // 逆向: actions_intents.js:1863-1872 — new Ds({ title, child, expanded, onChanged })
    return new ExpandableToolHeader({
      titleWidget,
      child: actionChild,
      isExpanded: isExpanded,
      onToggle:
        itemIndex !== undefined
          ? (newExpanded: boolean) => {
              this.setState(() => {
                this._activityGroupExpanded.set(itemIndex, newExpanded);
                this._activityGroupTouched.add(itemIndex);
              });
            }
          : undefined,
    }) as unknown as Widget;
  }

  /**
   * Build the expanded action rows for an activity group.
   *
   * 逆向: Y1T._buildActionRow (actions_intents.js:1874-1517) — per-action row:
   *   1. Og(T, a) — middle-dot bullet + title in mutedForeground, dim
   *   2. If no detail and no guidanceFiles → just padded Og
   *   3. If has detail or guidanceFiles → nested Ds (expandable) wrapping detail content
   *
   * 逆向: actions_intents.js:4486-4516 — subagent variant adds guidanceFiles
   *
   * @param group - ActivityGroupItem
   * @param groupItemIndex - Group's index in items array (for action expand key)
   * @param appTheme - Optional AppTheme
   * @returns Column widget with all action rows
   */
  private _buildActionRows(
    group: ActivityGroupItem,
    groupItemIndex?: number,
    appTheme?: AppTheme | null,
  ): Widget {
    const cwd = this.widget.config.cwd;
    const fileRefColor = appTheme?.fileReference ?? Color.cyan();
    const toolSuccessColor = appTheme?.toolSuccess ?? SUCCESS_COLOR;

    // Progressive animation: slice actions to visible count
    // 逆向: h9R.build — a.slice(0, this.visibleActionCount).map(...)
    let visibleCount: number;
    if (group.hasInProgress && groupItemIndex !== undefined) {
      visibleCount = this._activityGroupVisibleCount.get(groupItemIndex) ?? 0;
      if (visibleCount < group.actions.length) {
        this._scheduleAppendStep(groupItemIndex, group.actions.length);
      }
    } else {
      // Completed: show all immediately
      visibleCount = group.actions.length;
    }

    const visibleActions = group.actions.slice(0, visibleCount);

    const actionWidgets: Widget[] = [];
    for (let actionIdx = 0; actionIdx < visibleActions.length; actionIdx++) {
      const action = visibleActions[actionIdx]!;
      actionWidgets.push(this._buildSingleActionRow(action, cwd, fileRefColor, appTheme));
    }

    // 逆向: actions_intents.js:4475-4477 — deduplicated guidance files at top of expanded column
    // [...(i.length > 0 ? [Jm(i, R), new XT({ height: 1 })] : []), ...actionRows]
    const deduped = deduplicateGuidanceFiles(group.actions);
    const columnChildren: Widget[] = [];

    if (deduped.length > 0) {
      // 逆向: Jm (chunk-004.js:36821-36837) — "Loaded <ZA(uri)> (lineCount lines)" dim toolSuccess
      const guidanceText = deduped
        .map((gf) => `  Loaded ${guidanceFileDisplayName(gf.uri)} (${gf.lineCount} lines)`)
        .join("\n");
      columnChildren.push(
        new Container({
          padding: EdgeInsets.only({ left: 2 }),
          child: new RichText({
            text: new TextSpan({
              text: guidanceText,
              style: new TextStyle({ foreground: toolSuccessColor, dim: true }),
            }),
            selectable: true,
          }) as unknown as Widget,
        }) as unknown as Widget,
      );
      // 逆向: new XT({ height: 1 }) spacer after guidance block
      columnChildren.push(new SizedBox({ height: 1 }) as unknown as Widget);
    }

    columnChildren.push(...actionWidgets);

    if (columnChildren.length === 0) {
      return new SizedBox({ width: 0, height: 0 }) as unknown as Widget;
    }

    return new Column({
      crossAxisAlignment: "start",
      children: columnChildren,
    }) as unknown as Widget;
  }

  /**
   * Build a single action row within an activity group.
   *
   * 逆向: Y1T._buildActionRow (actions_intents.js:1874-1517):
   *   - Og(T, a) renders "· title" in mutedForeground, dim
   *   - If action has detail or guidanceFiles, wrap in nested Ds (expandable)
   *
   * 逆向: Og (2817_unknown_Og.js) — middle-dot bullet:
   *   `new xT({ text: new G("", void 0, [new G("·", t), new G(" ", t), new G(T.title, e)]) })`
   *
   * 逆向: B9R (misc_utils.js:7789-7823) — Read tool action row:
   *   - File path as H3 hyperlink (fileReference color, dim, underline)
   *   - @start-end range in warning color, dim
   *   - Guidance files as tail spans
   *
   * @param action - Single ActivityAction
   * @param cwd - Working directory for path shortening
   * @param fileRefColor - Color for file reference hyperlinks
   * @returns Widget for this action row
   */
  private _buildSingleActionRow(
    action: ActivityAction,
    cwd: string | undefined,
    fileRefColor: Color,
    appTheme?: AppTheme | null,
  ): Widget {
    // ── Build the Og-style title widget (middle-dot bullet) ──
    // 逆向: Og (2817_unknown_Og.js:1-15) — "· title" in mutedForeground, dim
    const mutedStyle = new TextStyle({ foreground: DIM_COLOR, dim: true });
    const bulletSpans: TextSpan[] = [
      new TextSpan({ text: "\u00B7", style: mutedStyle }), // · (middle dot)
      new TextSpan({ text: " ", style: mutedStyle }),
    ];

    // Build the action title content
    // 逆向: B9R (misc_utils.js:7789-7809) — Read tool: file path as hyperlink
    if (action.kind === "read" && action.path) {
      // File path as cyan, dim, underline hyperlink
      // 逆向: B9R — H3({ uri: JM(h,T), text: ki(h,T), style: { color: fileReference, dim, underline } })
      const relPath = cwdRelativePath(action.path, cwd);
      const fileUri = toFileUri(action.path, cwd);
      bulletSpans.push(
        new TextSpan({
          text: relPath,
          url: fileUri,
          style: new TextStyle({
            foreground: fileRefColor,
            dim: true,
            underline: true,
          }),
        }),
      );

      // Read range: @start-end in warning color
      // 逆向: B9R — if read_range: ` @${c}-${s}` in { color: e.colors.warning, dim }
      if (action.readRange) {
        const [start, end] = action.readRange;
        if (typeof start === "number" && typeof end === "number" && start >= 0 && end >= 0) {
          const warningColor = appTheme?.warning ?? WARNING_COLOR;
          bulletSpans.push(
            new TextSpan({
              text: ` @${start}-${end}`,
              style: new TextStyle({ foreground: warningColor, dim: true }),
            }),
          );
        }
      }
    } else {
      // Non-read actions: show path/detail/toolName in muted dim
      // 逆向: Og — T.title in mutedForeground, dim
      const displayText = action.path || action.detail || action.toolName;
      bulletSpans.push(new TextSpan({ text: displayText, style: mutedStyle }));
    }

    const bulletWidget = new RichText({
      text: new TextSpan({ children: bulletSpans }),
      selectable: true,
    }) as unknown as Widget;

    // ── Always render as simple padded bullet (guidance files now shown at group level) ──
    // 逆向: actions_intents.js:4475-4477 — guidance files deduplicated to group level via Jm()
    // 逆向: actions_intents.js:1876-1880 — padding left:1
    return new Container({
      padding: EdgeInsets.only({ left: 1 }),
      child: bulletWidget,
    }) as unknown as Widget;
  }

  /**
   * Build a ThinkingItem widget — renders a thinking block with expand/collapse.
   *
   * 逆向: Rd / fJT (chunk-006.js:16846-17009) — ThinkingBlock widget.
   * Three states:
   * - streaming: accent color + braille spinner prefix
   * - cancelled: warning color + "(interrupted)" suffix, no icon
   * - complete: success color + ✓ prefix
   *
   * @param item - ThinkingItem from DisplayItem[]
   * @param itemIndex - Index in the items array, used to track expand/collapse state
   * @returns Thinking block Widget
   */
  private _buildThinkingWidget(
    item: ThinkingItem,
    itemIndex: number,
    appTheme?: AppTheme | null,
  ): Widget {
    const isExpanded = this._expandedThinking.has(itemIndex);
    const spans: TextSpan[] = [];

    // 逆向: fJT.build() — isCancelled → warning, no icon; isStreaming → accent, spinner; else → success, ✓
    if (item.isCancelled) {
      // No icon prefix for cancelled
    } else if (item.isStreaming) {
      spans.push(
        new TextSpan({
          text: `${this._spinner.toBraille()} `,
          style: new TextStyle({ foreground: ACCENT_COLOR }),
        }),
      );
    } else {
      spans.push(
        new TextSpan({
          text: "\u2713 ",
          style: new TextStyle({ foreground: SUCCESS_COLOR }),
        }),
      );
    }

    const warningColor = appTheme?.warning ?? WARNING_COLOR;
    const labelColor = item.isCancelled ? warningColor : DIM_COLOR;
    spans.push(
      new TextSpan({
        text: "Thinking",
        style: new TextStyle({ foreground: labelColor, dim: !item.isCancelled }),
      }),
    );

    if (item.isCancelled) {
      spans.push(
        new TextSpan({
          text: " (interrupted)",
          style: new TextStyle({ foreground: warningColor, italic: true }),
        }),
      );
    }

    const hasContent = item.text.trim().length > 0;

    // Chevron shown when hasContent — streaming blocks are also collapsible.
    // Divergence from amp: amp always shows streaming content (fJT.build() line 16964),
    // but we default-collapse thinking blocks at all times for a cleaner UI.
    const isClickable = hasContent;
    if (isClickable) {
      spans.push(new TextSpan({ text: " " }));
      spans.push(
        new TextSpan({
          text: isExpanded ? "\u25BC" : "\u25B6",
          style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
        }),
      );
    }

    const headerRow = new RichText({
      text: new TextSpan({ children: spans }),
    });

    // 逆向: fJT.build() chunk-006.js:17009-17019 — wrap header in G0 (GestureDetector) only when `c`
    // (hasContent). Click toggles _localExpanded via _handleHeaderClick.
    // Divergence from amp: streaming blocks are also clickable for expand/collapse.
    const header = isClickable
      ? new GestureDetector({
          onTap: () => {
            this.setState(() => {
              if (this._expandedThinking.has(itemIndex)) {
                this._expandedThinking.delete(itemIndex);
              } else {
                this._expandedThinking.add(itemIndex);
              }
            });
          },
          child: headerRow,
        })
      : headerRow;

    // Divergence from amp: thinking blocks default-collapsed even during streaming.
    // Amp's fJT.build() always shows streaming content (line 16964-16965),
    // but we only show content when the user explicitly expands.
    const showContent = hasContent && isExpanded;
    if (showContent) {
      const indentedText = item.text
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
      return new Column({
        children: [
          header,
          new RichText({
            text: new TextSpan({
              text: indentedText,
              style: new TextStyle({ foreground: DIM_COLOR, italic: true, dim: true }),
            }),
          }),
        ],
      });
    }

    return header;
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
              style: new TextStyle({ foreground: MUTED_TEXT_COLOR, dim: true }),
            }),
          }),
        ],
      });
    }

    // 构建消息 Widget 列表
    const children: Widget[] = [];

    // 当 inferenceState === "running" 且最后一条消息是 assistant 时,
    // 显示流式指示器 "..."
    const lastMessage = messages[messages.length - 1];
    const showStreamingIndicator =
      inferenceState === "running" && lastMessage?.role === "assistant";

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLastAndStreaming = i === messages.length - 1 && showStreamingIndicator;
      children.push(this._buildMessageWidget(msg, isLastAndStreaming));

      // 消息间添加 1 行间距分隔
      if (i < messages.length - 1) {
        children.push(new SizedBox({ height: 1 }));
      }
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
   * @param isStreaming - 是否显示流式指示器 (inferenceState === "running")
   * @returns 消息 Widget
   */
  private _buildMessageWidget(message: Message, isStreaming = false): Widget {
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

    // 组合: 角色指示器 + 换行 + 内容 + 流式指示器 (如果需要)
    const children: TextSpan[] = [roleSpan, new TextSpan({ text: "\n" }), ...contentSpans];

    // 逆向: 当 inferenceState === "running" 时追加 "..." 流式指示器
    // 这与现代路径的 █ 不同 — 现代路径使用 item.isStreaming 与光标,
    // 而 legacy 路径使用 inferenceState 与 "..." 作为简单指示器。
    if (isStreaming) {
      children.push(
        new TextSpan({
          text: "...",
          style: new TextStyle({ foreground: ACCENT_COLOR }),
        }),
      );
    }

    return new RichText({
      text: new TextSpan({
        children,
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
      dim: true,
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
 * 逆向: xW() function (modules/2820_unknown_xW.js)
 * - done → "✓"
 * - error/cancelled/rejected → "✕"
 * - blocked-on-user → "?"
 * - in-progress/queued → "⋯"
 */
function _getStatusIcon(status: ToolItem["status"]): string {
  switch (status) {
    case "done":
      return "\u2713"; // ✓
    case "error":
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return "\u2715"; // ✕
    case "blocked-on-user":
      return "?";
    case "in-progress":
    case "queued":
      return "\u22EF"; // ⋯
  }
}

/**
 * Get status color for a tool status.
 *
 * 逆向: oE0(T, R) function (chunk-004.js:21143)
 * - done → R.app.toolSuccess
 * - error → R.app.toolError
 * - in-progress → R.app.toolRunning
 * - cancelled/rejected → R.app.toolCancelled
 * - queued/blocked-on-user → R.app.waiting (toolRunning fallback)
 *
 * @param status - Tool status
 * @param appTheme - Optional AppTheme for semantic colors
 */
function _getStatusColor(status: ToolItem["status"], appTheme?: AppTheme | null): Color {
  switch (status) {
    case "done":
      return appTheme?.toolSuccess ?? SUCCESS_COLOR;
    case "error":
      return appTheme?.toolError ?? ERROR_COLOR_LOCAL;
    case "in-progress":
      return appTheme?.toolRunning ?? TOOL_RUNNING_COLOR;
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return appTheme?.toolCancelled ?? CANCELLED_COLOR;
    case "blocked-on-user":
    case "queued":
      return appTheme?.waiting ?? TOOL_RUNNING_COLOR; // waiting color
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
      if (tool.args && typeof tool.args.detail === "string") {
        const detail = tool.args.detail;
        return detail.length > MAX_DETAIL_LENGTH
          ? detail.slice(0, MAX_DETAIL_LENGTH) + "..."
          : detail;
      }
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
 * 逆向: xW() function (modules/2820_unknown_xW.js) — same mapping as _getStatusIcon.
 * ActivityAction extends to include blocked-on-user, queued, and rejected-by-user.
 */
function _getActionStatusIcon(status: ActivityAction["status"]): string {
  switch (status) {
    case "done":
      return "\u2713"; // ✓
    case "error":
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return "\u2715"; // ✕
    case "blocked-on-user":
      return "?";
    case "in-progress":
    case "queued":
      return "\u22EF"; // ⋯
  }
}

/**
 * Get status color for an ActivityAction status.
 *
 * 逆向: oE0(T, R) function (chunk-004.js:21143) — same mapping as tool status
 *
 * @param status - Activity action status
 * @param appTheme - Optional AppTheme for semantic colors
 */
function _getActionStatusColor(
  status: ActivityAction["status"],
  appTheme?: AppTheme | null,
): Color {
  switch (status) {
    case "done":
      return appTheme?.toolSuccess ?? SUCCESS_COLOR;
    case "error":
      return appTheme?.toolError ?? ERROR_COLOR_LOCAL;
    case "in-progress":
      return appTheme?.toolRunning ?? TOOL_RUNNING_COLOR;
    case "cancelled":
    case "cancellation-requested":
    case "rejected-by-user":
      return appTheme?.toolCancelled ?? CANCELLED_COLOR;
    case "blocked-on-user":
    case "queued":
      return appTheme?.waiting ?? TOOL_RUNNING_COLOR; // waiting color
  }
}
