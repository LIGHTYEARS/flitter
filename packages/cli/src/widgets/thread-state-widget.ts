/**
 * ThreadStateWidget -- 线程/对话状态管理 Widget。
 *
 * {@link ThreadStateWidget} 扩展 {@link StatefulWidget}，管理线程/对话状态，
 * 订阅 ThreadStore.observeThread() 和 ThreadWorker.events$ 变化并触发子树重建。
 *
 * build() 返回完整的 Column 布局:
 *   Expanded > Scrollable > ConversationView (消息列表)
 *   StatusBar (状态栏)
 *   InputField (输入框)
 *
 * 逆向参考: Z8R (html-sanitizer-repl.js ~1100)
 *
 * @example
 * ```ts
 * import { ThreadStateWidget } from "./thread-state-widget.js";
 *
 * const threadWidget = new ThreadStateWidget({
 *   threadStore: container.threadStore,
 *   threadWorker: worker,
 *   threadId: "abc-123",
 *   onSubmit: (text) => { ... },
 * });
 * ```
 *
 * @module
 */

import { resolveModel } from "@flitter/llm";
import type { BuildContext, Widget } from "@flitter/tui";
import {
  BoxDecoration,
  Center,
  Color,
  Column,
  Container,
  EdgeInsets,
  Expanded,
  FocusManager,
  FuzzyPicker,
  Padding,
  Positioned,
  Row,
  Scrollable,
  ScrollController,
  SelectionAreaWidget,
  SizedBox,
  Stack,
  State,
  StatefulWidget,
  Text,
  TextStyle,
  WidgetsBinding,
} from "@flitter/tui";
import type { Subscription } from "@flitter/util";

import type { ApprovalRequest } from "./approval-widget.js";
import { ApprovalWidget } from "./approval-widget.js";
import { BottomStatusLine } from "./bottom-status-line.js";
import { CommandPaletteOverlay } from "./command-palette-widget.js";
import { ConversationView } from "./conversation-view.js";
import type { DisplayItem } from "./display-items.js";
import { projectStreamingMessage, transformThreadToDisplayItems } from "./display-items.js";
import { InputField } from "./input-field.js";
import { PromptHistory } from "./prompt-history.js";
import { ShortcutsPopup } from "./shortcuts-popup.js";
import type { ToastManager } from "./toast-manager.js";
import { ToastOverlay } from "./toast-overlay.js";
import { WelcomeScreen } from "./welcome-screen.js";

// ════════════════════════════════════════════════════
//  ThreadStateWidgetConfig 接口
// ════════════════════════════════════════════════════

/**
 * ThreadStateWidget 配置。
 *
 * @property threadStore - 线程存储引用 (ThreadStore)
 * @property threadWorker - 线程工作器引用 (ThreadWorker)
 * @property threadId - 要观察的线程 ID
 * @property onSubmit - 用户提交消息的回调
 * @property modelName - 显示在状态栏的模型名 (可选)
 * @property tokenCount - 显示在状态栏的 token 计数 (可选)
 */
export interface ThreadStateWidgetConfig {
  /** 线程存储引用 */
  threadStore: {
    observeThread(
      id: string,
    ): { subscribe(observer: (value: unknown) => void): Subscription } | undefined;
  };
  /** 线程工作器引用 */
  threadWorker: {
    events$: { subscribe(observer: (value: unknown) => void): Subscription };
    userRespondToApproval?(
      toolUseId: string,
      response: { approved: boolean; scope?: string; feedback?: string },
    ): Promise<void>;
  };
  /** 要观察的线程 ID */
  threadId: string;
  /** 用户提交消息的回调 */
  onSubmit: (text: string) => void;
  /** 模型名称 (显示在状态栏) */
  modelName?: string;
  /** Token 计数 (显示在状态栏) */
  tokenCount?: number;
  /** Toast notification manager (optional, for overlay rendering) */
  toastManager?: ToastManager;
  /** Current working directory display string
   * 逆向: chunk-006.js:37949-37963 */
  cwdDisplay?: string;
  /** Git branch name
   * 逆向: chunk-006.js:36749-36759 */
  gitBranch?: string;
  /** Active agent mode name (e.g., "smart", "fast")
   * 逆向: chunk-006.js:37846 */
  modeName?: string;
  /** Number of available skills
   * 逆向: chunk-006.js:37867 */
  skillCount?: number;
  /** Ctrl+G: open current input in $EDITOR (逆向: actions_intents.js:1054-1058)
   * Called with the current input text. */
  onOpenInEditor?: (text: string) => void;
  /** Ctrl+S: toggle agent mode (逆向: chunk-006.js:35516-35524)
   * Called to cycle through visible agent modes (smart/deep/fast). */
  onToggleAgentMode?: () => void;
  /** Alt+D: toggle deep reasoning effort (逆向: chunk-006.js:35556)
   * Called to cycle deep reasoning effort (medium/high/xhigh). */
  onToggleDeepReasoning?: () => void;

  /**
   * `e` key: edit selected message.
   * Called with the selected message ordinal and the message's plain text.
   *
   * 逆向: interactive_widgets.js:2479-2487 — handleEditMessage
   *   `_selectEditingUserMessageByOrdinal(T)` → startEditing(ordinal, text)
   */
  onMessageEdit?: (messageOrdinal: number, currentText: string) => void;

  /**
   * `r` key: restore conversation to the selected message point.
   * Called with the selected message ordinal (must be > 0).
   *
   * 逆向: interactive_widgets.js:2489-2501 — handleRestoreMessage
   *   Checks ordinal !== null, index !== 0, then shows restore confirmation.
   */
  onMessageRestore?: (messageOrdinal: number) => void;

  /**
   * `f` key: fork is deprecated — shows deprecation modal.
   *
   * 逆向: interactive_widgets.js:2546-2548 — handleForkMessage
   *   "Stick a fork in it, it's done" deprecation modal.
   */
  onShowForkDeprecation?: () => void;

  /**
   * Slash command list for the command palette overlay.
   * Each entry has an id (command name), label, optional category and description.
   *
   * 逆向: amp's commandPaletteMode populates from e0R command registry entries
   *   with { id, noun (category), verb (label), description }
   */
  slashCommands?: Array<{
    id: string;
    label: string;
    category?: string;
    description?: string;
  }>;

  /**
   * Slash command execution callback — fired when user selects a command from palette.
   *
   * 逆向: amp executes via e0R.execute(commandId) which calls registered handler.
   */
  onSlashCommand?: (command: string, args: string) => void;

  /**
   * Thread list for @@ mention picker.
   * 逆向: amp wQ thread picker uses R.threads for thread selection.
   */
  threadList?: Array<{ id: string; title: string | null; messageCount: number }>;
}

// ════════════════════════════════════════════════════
//  ThreadStateWidget
// ════════════════════════════════════════════════════

/**
 * 线程/对话状态管理 Widget。
 *
 * 订阅 ThreadStore 和 ThreadWorker 事件流，
 * 在数据变化时触发子树重建。
 *
 * 逆向: Z8R (html-sanitizer-repl.js ~1100)
 */
export class ThreadStateWidget extends StatefulWidget {
  /** Widget 配置 */
  readonly config: ThreadStateWidgetConfig;

  /**
   * 创建 ThreadStateWidget。
   *
   * @param config - 线程状态 Widget 配置
   */
  constructor(config: ThreadStateWidgetConfig) {
    super();
    this.config = config;
  }

  /**
   * 创建关联的 ThreadStateWidgetState。
   *
   * @returns 新创建的 ThreadStateWidgetState 实例
   */
  createState(): ThreadStateWidgetState {
    return new ThreadStateWidgetState();
  }
}

// ════════════════════════════════════════════════════
//  ThreadStateWidgetState
// ════════════════════════════════════════════════════

/**
 * ThreadStateWidget 的状态管理。
 *
 * 在 initState 中订阅:
 * 1. ThreadStore.observeThread(threadId) — 线程快照变化 (消息列表等)
 * 2. ThreadWorker.events$ — 推理事件流 (inference:start/error, turn:complete)
 *
 * dispose 时取消两个订阅，防止内存泄漏。
 *
 * build 方法返回完整的 Column 布局 (per UI-SPEC):
 *   Expanded > Scrollable > ConversationView
 *   分隔线
 *   StatusBar
 *   分隔线
 *   InputField
 *
 * 逆向: wR 基类 (tui-widget-framework.js 1784-1813)
 */
export class ThreadStateWidgetState extends State<ThreadStateWidget> {
  /** 线程快照订阅 */
  private _threadSub: Subscription | null = null;

  /** 事件流订阅 */
  private _eventSub: Subscription | null = null;

  /** Display items (transformed from ThreadStore snapshot via yx0 pipeline) */
  private _items: DisplayItem[] = [];

  /** 推理状态: idle, running, or cancelled */
  private _inferenceState: "idle" | "running" | "cancelled" = "idle";

  /** Whether the model has started streaming tokens */
  private _hasStartedStreaming = false;

  /** Accumulated streaming content blocks (逆向: deltaState.streamingBlocks) */
  private _streamingBlocks: Array<{
    type: string;
    text?: string;
    thinking?: string;
    [key: string]: unknown;
  }> = [];

  /** Active streaming message ID (逆向: deltaState.streamingMessageId) */
  private _streamingMessageId: string | null = null;

  /** Last thread snapshot for rebuilding items on streaming deltas */
  private _lastSnapshot: {
    messages?: Array<{ role: string; content: unknown; state?: unknown }>;
  } | null = null;

  /** 推理错误 */
  private _error: Error | null = null;

  /** Running tool count for status bar (逆向: yB tool tracking) */
  private _runningToolCount = 0;

  /** Total input tokens consumed in this session */
  private _totalInputTokens = 0;

  /** Total output tokens consumed in this session */
  private _totalOutputTokens = 0;

  /** Whether waiting for user approval on a tool */
  private _waitingForApproval = false;

  /** The pending approval request to display, if any */
  private _pendingApproval: ApprovalRequest | null = null;

  /** Prompt history for up/down arrow navigation */
  private _promptHistory = new PromptHistory();

  /**
   * Whether the user is currently in message-selection (browse) mode.
   *
   * 逆向: f8R._stateController.selectedUserMessageOrdinal !== null (chunk-006.js:31810)
   *   In amp, selection mode is active whenever selectedUserMessageOrdinal is set.
   *   We model the same with a boolean + nullable ordinal.
   */
  private _isInMessageSelectionMode = false;

  /**
   * Ordinal into the navigable-messages list of the currently selected message.
   * null means nothing is selected.
   *
   * 逆向: f8R._stateController.selectedUserMessageOrdinal (chunk-006.js:31810)
   */
  private _selectedMessageOrdinal: number | null = null;

  /**
   * Compute the list of indices in `_items` that are navigable.
   * Navigable = user messages + chart tool results.
   *
   * 逆向: AhT.navigableItemIndices (chunk-006.js:31616-31630)
   *   - items[R].type === "message" && (role === "user" || ok(a.message) [info])  → push R
   *   - items[R].type === "toolResult" && toolUse.name === "chart"                → push R
   *
   * @returns Array of indices into `_items`
   */
  private get _navigableItemIndices(): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      if (!item) continue;
      if (item.type === "message" && item.role === "user") {
        indices.push(i);
      } else if (item.type === "tool" && item.toolName === "chart") {
        indices.push(i);
      }
    }
    return indices;
  }

  /**
   * Resolve the current selected item's index in `_items` from the ordinal.
   * Returns null if not in selection mode or ordinal is out of range.
   *
   * 逆向: f8R.getUserMessageIndexFromOrdinal (chunk-006.js:31844)
   *   `return this.widget.navigableItemIndices[T] ?? null`
   */
  private get _selectedItemIndex(): number | null {
    if (this._selectedMessageOrdinal === null) return null;
    const nav = this._navigableItemIndices;
    return nav[this._selectedMessageOrdinal] ?? null;
  }

  /**
   * Enter message-selection mode, selecting the last user message.
   *
   * 逆向: f8R.didUpdateWidget — !T.isInSelectionMode && this.widget.isInSelectionMode →
   *   widget.focusNode?.requestFocus(); a = getLatestUserMessageOrdinal(); _selectUserMessageByOrdinal(a)
   * 逆向: f8R.getLatestUserMessageOrdinal (chunk-006.js:31852)
   *   `T.length > 0 ? T.length - 1 : null`
   */
  private _enterSelectionMode(): void {
    const nav = this._navigableItemIndices;
    if (nav.length === 0) return;
    const lastOrdinal = nav.length - 1;
    this._isInMessageSelectionMode = true;
    this._selectedMessageOrdinal = lastOrdinal;
    this._scrollToSelectedMessage();
  }

  /**
   * Exit message-selection mode and scroll back to bottom.
   *
   * 逆向: f8R.navigateToUserMessage "down" at bottom → animateToBottom + clearSelectedUserMessage + dismiss
   * 逆向: f8R.handleEscape → clearSelectedUserMessage + dismiss + animateToBottom
   */
  private _exitSelectionMode(): void {
    this._isInMessageSelectionMode = false;
    this._selectedMessageOrdinal = null;
    this._scrollController.followMode = true;
    this._scrollController.scrollToBottom();
  }

  /**
   * Navigate up (to older/higher user message) in selection mode.
   *
   * 逆向: f8R._navigateUp (chunk-006.js:31780-31784)
   *   if (R <= 0) return null;
   *   if (T === null) return R - 1;   // enter at bottom
   *   if (T <= 0) return 0;           // already at top — clamp
   *   return T - 1;
   *
   * 逆向: f8R.navigateToUserMessage("up") → _selectUserMessageByOrdinal(e) if not null
   */
  private _navigateUp(): void {
    const count = this._navigableItemIndices.length;
    if (count === 0) return;
    let next: number;
    if (this._selectedMessageOrdinal === null) {
      next = count - 1;
    } else if (this._selectedMessageOrdinal <= 0) {
      next = 0;
    } else {
      next = this._selectedMessageOrdinal - 1;
    }
    this._selectedMessageOrdinal = next;
    this._scrollToSelectedMessage();
  }

  /**
   * Navigate down (to newer/lower user message) in selection mode.
   * If already at the last message, exit selection mode.
   *
   * 逆向: f8R._navigateDown (chunk-006.js:31786-31792)
   *   if (R <= 0) return null;
   *   if (T === null) return null;
   *   if (T >= R - 1) return null;    // at end → exit selection mode
   *   return T + 1;
   *
   * 逆向: f8R.navigateToUserMessage("down") → if e === null exit mode; else _selectUserMessageByOrdinal(e)
   */
  private _navigateDown(): void {
    const count = this._navigableItemIndices.length;
    if (count === 0) {
      this._exitSelectionMode();
      return;
    }
    if (this._selectedMessageOrdinal === null || this._selectedMessageOrdinal >= count - 1) {
      // At the end → exit selection mode (scroll to bottom)
      this._exitSelectionMode();
      return;
    }
    this._selectedMessageOrdinal = this._selectedMessageOrdinal + 1;
    this._scrollToSelectedMessage();
  }

  /**
   * Scroll the viewport so the currently selected message is approximately
   * 25% from the top.
   *
   * 逆向: f8R.scrollToMessage (chunk-006.js:32243)
   *   offsetPercent: 0.25 — message lands 25% from the top of the viewport
   *   Uses per-item render offset via localToGlobal coordinate transform.
   *
   * Flitter approximation: we estimate the message's position from its
   * ordinal fraction of total content, then bias by -25% of viewport height.
   * This is imprecise but gives a reasonable visual result without full
   * layout measurement infrastructure.
   */
  private _scrollToSelectedMessage(): void {
    if (this._selectedMessageOrdinal === null) return;
    const nav = this._navigableItemIndices;
    if (nav.length === 0) return;
    // Disable follow-mode so manual scroll position is preserved
    this._scrollController.followMode = false;
    const fraction = nav.length > 1 ? this._selectedMessageOrdinal / (nav.length - 1) : 0;
    const maxExtent = this._scrollController.maxScrollExtent;
    // Bias upward by 25% of a nominal 24-row viewport (approx 6 rows)
    const target = Math.max(0, Math.round(maxExtent * fraction) - 6);
    this._scrollController.jumpTo(target);
  }

  /**
   * Extract the plain text content of the user message at the given navigable ordinal.
   *
   * Looks up the DisplayItem at the ordinal's index in the navigable items list,
   * then returns its text field (which was already extracted from content blocks
   * by the display-items pipeline).
   *
   * 逆向: interactive_widgets.js:2420-2422 — Tz0(r.message)
   *   `Tz0` calls `kr(T.content)` which maps text blocks → joins with "\n\n".
   *   In flitter, `transformThreadToDisplayItems` already extracts text into
   *   `MessageItem.text`, so we read directly from the DisplayItem.
   *
   * 逆向: modules/1602_unknown_pm.js:1-4 — kr(T)
   *   `T.map(R => R.type === "text" ? R.text : null).filter(R => R !== null).join("\n\n")`
   *
   * @param ordinal - Ordinal index into the navigable items list
   * @returns Plain text string, or "" if the ordinal is invalid or the item has no text
   */
  _getMessageTextAtOrdinal(ordinal: number): string {
    const nav = this._navigableItemIndices;
    const itemIndex = nav[ordinal];
    if (itemIndex === undefined) return "";
    const item = this._items[itemIndex];
    if (!item) return "";
    if (item.type === "message" && item.text) return item.text;
    return "";
  }

  /**
   * Whether to show thinking blocks in the message display.
   *
   * When false, content blocks with type "thinking" are filtered out
   * from rendered messages. Toggled by /toggle-thinking-blocks or Alt+T.
   *
   * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:824-834
   *   `{ id: "toggle-thinking-blocks", verb: "toggle thinking blocks",
   *    execute: async R => { Ut.instance.toggleAll(); ... } }`
   * 逆向: amp-cli-reversed/modules/1959_unknown_x8R.js:230
   *   `let t = this.options.showThinkingBlocks ? R.content.map(...).filter(type === "thinking") : []`
   * 逆向: amp-cli-reversed/modules/1472_tui_components/interactive_widgets.js:2288
   *   `showThinkingBlocks: !this._isDenseViewEnabled`
   */
  private _showThinkingBlocks = true;

  /**
   * Whether the shortcuts help panel (ShortcutsPopup / U8R) is currently shown.
   *
   * Toggled by pressing `?` when the input field is empty.
   * Dismissed by any subsequent key press (except Escape, which also dismisses).
   *
   * 逆向: chunk-006.js:34295 — `isShowingShortcutsHelp = false`
   * 逆向: chunk-006.js:36288-36308 — toggle on `?` when empty, dismiss on any key
   * 逆向: chunk-006.js:37662-37664 — `topWidget: isShowingShortcutsHelp ? new U8R(...) : void 0`
   */
  private _isShowingShortcutsHelp = false;

  /**
   * Whether the command palette overlay is currently shown.
   *
   * Toggled by pressing `/` when the input field is empty.
   * Dismissed by Escape, or when a command is selected.
   *
   * 逆向: amp's commandPaletteMode (tui-thread-widgets.js:2748)
   *   Triggered by textChangeListener when text === "/", opens modal command list.
   */
  private _isShowingCommandPalette = false;
  private _isShowingHistoryPicker = false;
  private _isShowingThreadPicker = false;

  /** 滚动控制器 */
  private _scrollController: ScrollController;

  /**
   * Unsubscribe function for the j/k scroll key interceptor.
   *
   * 逆向: amp-cli-reversed/modules/1472_tui_components/interactive_widgets.js:2755-2756
   *   `x0.key("j")` → XQ (scrollDown), `x0.key("k")` → YQ (scrollUp)
   *   In amp these are Shortcuts on the conversation widget that fire only in browse mode
   *   (selectedUserMessageOrdinal !== null). In flitter we use a key interceptor that
   *   fires only when the InputField is NOT focused.
   */
  private _scrollKeyInterceptorUnsub: (() => void) | null = null;

  constructor() {
    super();
    this._scrollController = new ScrollController();
  }

  /**
   * Whether thinking blocks are currently shown.
   *
   * 逆向: amp e0R:834 — `getPromptText: R => Ut.instance.allExpanded ? "collapse" : "expand"`
   */
  get showThinkingBlocks(): boolean {
    return this._showThinkingBlocks;
  }

  /**
   * Toggle visibility of thinking blocks.
   *
   * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:829-831
   *   `execute: async R => { Ut.instance.toggleAll(); ... k8.instance.requestFrame(); }`
   *   Ut is the thinking block expansion tracker. toggleAll() flips all blocks.
   *   k8.instance.requestFrame() triggers a re-render.
   */
  toggleThinkingBlocks(): void {
    this.setState(() => {
      this._showThinkingBlocks = !this._showThinkingBlocks;
    });
  }

  /**
   * 初始化状态。
   *
   * 订阅 ThreadStore 和 ThreadWorker 事件流:
   * - threadStore.observeThread(threadId): 快照变化 -> 更新消息列表
   * - threadWorker.events$: 推理事件 -> 更新推理状态和错误
   */
  initState(): void {
    super.initState();
    const { threadStore, threadWorker, threadId } = this.widget.config;

    // Register key interceptor for:
    //   - j/k scroll (browse mode, InputField not focused)
    //   - Tab: enter/navigate selection mode
    //   - Shift+Tab: navigate down / exit selection mode
    //   - Escape: exit selection mode
    //
    // 逆向: amp interactive_widgets.js:2471-2477, 2755-2756
    //   handleScrollDown: this._controller?.scrollDown(1)
    //   handleScrollUp:   this._controller?.scrollUp(1)
    //   x0.key("j") → scrollDown, x0.key("k") → scrollUp
    //   In amp, these only fire when selectedUserMessageOrdinal !== null (browse mode).
    //   In flitter, we check that the InputField is NOT focused (equivalent to browse mode).
    //
    // 逆向: amp f8R.build() — Tab → RD() (navigateUserMessageUp), Shift+Tab → aD() (navigateUserMessageDown)
    //   x0.key("Tab") → new RD(), x0.shift("Tab") → new aD()
    //   x0.key("Escape") → VQ() → handleEscape
    //   Tab from InputField enters selection mode; Tab in selection mode → navigate up;
    //   Shift+Tab in selection mode → navigate down (exit if at end);
    //   Escape in selection mode → exit.
    this._scrollKeyInterceptorUnsub = WidgetsBinding.instance.addKeyInterceptor((event) => {
      // ── Command palette / overlay active — let FuzzyPicker handle all keys ─────
      // 逆向: jetbrains_wizard.js:5642 — QP.enabled = false when palette open
      //   All normal app widgets (input, scrolling) are disabled.
      //   FuzzyPicker handles its own keyboard via Shortcuts/Actions.
      if (this._isShowingCommandPalette) {
        return false; // let FuzzyPicker handle it
      }

      // ── Alt+T — toggle thinking blocks ──────────────────────────────────
      // 逆向: chunk-006.js:37137-37139 — x0.alt("t") → Ut.instance.toggleAll()
      if (event.key === "t" && event.modifiers.alt) {
        this.toggleThinkingBlocks();
        return true;
      }

      // ── Alt+D — toggle deep reasoning effort ────────────────────────────
      // 逆向: chunk-006.js:37156-37158 — x0.alt("d") → toggleDeepReasoningEffort()
      if (event.key === "d" && event.modifiers.alt) {
        this.widget.config.onToggleDeepReasoning?.();
        return true;
      }

      // ── Ctrl+R — prompt history picker ──────────────────────────────────
      // 逆向: chunk-006.js:37141-37145 — x0.ctrl("r") → isShowingPromptHistoryPicker = true
      if (event.key === "r" && event.modifiers.ctrl) {
        if (this._promptHistory.entries.length > 0) {
          this.setState(() => {
            this._isShowingHistoryPicker = true;
          });
          return true;
        }
        return false;
      }

      // Non-intercepted modifier keys pass through to InputField's own handler
      if (event.modifiers.ctrl || event.modifiers.meta) return false;

      const primaryFocus = FocusManager.instance.primaryFocus;
      const inputFocused = primaryFocus?.debugLabel === "InputField";

      // ── Tab key ──────────────────────────────────────────────────────────
      // 逆向: amp — Tab from InputField → enter selection mode (select last message)
      //            Tab in selection mode → navigate up
      if (event.key === "Tab" && !event.modifiers.shift) {
        if (inputFocused) {
          // Tab from input field: enter message selection mode
          const nav = this._navigableItemIndices;
          if (nav.length === 0) return false; // no navigable messages — let Tab through
          this.setState(() => {
            this._enterSelectionMode();
          });
          return true;
        }
        if (this._isInMessageSelectionMode) {
          // Tab in selection mode: navigate up (to older message)
          this.setState(() => {
            this._navigateUp();
          });
          return true;
        }
        return false;
      }

      // ── Shift+Tab key ────────────────────────────────────────────────────
      // 逆向: amp — Shift+Tab in selection mode → navigate down; exit if at last message
      if (event.key === "Tab" && event.modifiers.shift) {
        if (this._isInMessageSelectionMode) {
          this.setState(() => {
            this._navigateDown();
          });
          return true;
        }
        return false;
      }

      // ── Escape key ───────────────────────────────────────────────────────
      // 逆向: amp handleEscape → if selectedUserMessageOrdinal !== null → clearSelected + dismiss
      if (event.key === "Escape" && this._isInMessageSelectionMode) {
        this.setState(() => {
          this._exitSelectionMode();
        });
        return true;
      }

      // ── e key — edit selected message ────────────────────────────────
      // 逆向: interactive_widgets.js:2479-2487 — handleEditMessage
      //   if selectedUserMessageOrdinal !== null → extract text via Tz0(message),
      //   call _selectEditingUserMessageByOrdinal(ordinal) which sets up editing mode.
      //   In flitter, we call the onMessageEdit callback and exit selection mode.
      // 逆向: interactive_widgets.js:2756 — x0.key("e") → QQ → handleEditMessage
      if (
        event.key === "e" &&
        this._isInMessageSelectionMode &&
        this._selectedMessageOrdinal !== null
      ) {
        const text = this._getMessageTextAtOrdinal(this._selectedMessageOrdinal);
        const ordinal = this._selectedMessageOrdinal;
        this.setState(() => {
          this._exitSelectionMode();
        });
        this.widget.config.onMessageEdit?.(ordinal, text);
        return true;
      }

      // ── f key — fork (deprecated) ────────────────────────────────────
      // 逆向: interactive_widgets.js:2546-2548 — handleForkMessage
      //   if selectedUserMessageOrdinal !== null && onShowForkDeprecation →
      //   call onShowForkDeprecation(), clearSelectedUserMessage(), dismiss().
      // 逆向: interactive_widgets.js:2756 — x0.key("f") → JQ → handleForkMessage
      if (
        event.key === "f" &&
        this._isInMessageSelectionMode &&
        this._selectedMessageOrdinal !== null
      ) {
        this.setState(() => {
          this._exitSelectionMode();
        });
        this.widget.config.onShowForkDeprecation?.();
        return true;
      }

      // ── r key — restore to selected message ─────────────────────────
      // 逆向: interactive_widgets.js:2489-2501 — handleRestoreMessage
      //   if selectedUserMessageOrdinal !== null → get index; if index === 0 → ignore;
      //   if role === "user" or info → showRestoreConfirmation(message, index).
      // 逆向: interactive_widgets.js:2757 — x0.key("r") → ZQ → handleRestoreMessage
      //   Only bound when onMessageRestoreSubmit is set.
      if (
        event.key === "r" &&
        this._isInMessageSelectionMode &&
        this._selectedMessageOrdinal !== null
      ) {
        // Can't restore to the first message (index 0)
        const itemIndex = this._selectedItemIndex;
        if (itemIndex === null || itemIndex === 0) return true; // consume but ignore
        const ordinal = this._selectedMessageOrdinal;
        this.setState(() => {
          this._exitSelectionMode();
        });
        this.widget.config.onMessageRestore?.(ordinal);
        return true;
      }

      // ── ? key — shortcuts help panel ────────────────────────────────────
      // 逆向: chunk-006.js:36288-36308
      //   When `?` pressed and input is empty and input is focused and no other
      //   overlay is open → toggle isShowingShortcutsHelp.
      //   When isShowingShortcutsHelp is true and any key fires → dismiss.
      //   Escape while showing help → dismiss and consume the event.
      if (event.key === "?") {
        if (inputFocused) {
          this.setState(() => {
            this._isShowingShortcutsHelp = !this._isShowingShortcutsHelp;
          });
          return true;
        }
      }
      if (this._isShowingShortcutsHelp) {
        this.setState(() => {
          this._isShowingShortcutsHelp = false;
        });
        // Escape consumed; other keys pass through so they take effect
        if (event.key === "Escape") return true;
        return false;
      }

      // ── j/k scroll ───────────────────────────────────────────────────────
      if (event.key !== "j" && event.key !== "k") return false;
      // Only scroll when InputField is not focused (browse mode)
      if (inputFocused) return false;
      if (event.key === "j") {
        this._scrollController.scrollDown(1);
      } else {
        this._scrollController.scrollUp(1);
      }
      return true;
    });

    // 订阅线程快照变化 (per D-10)
    const thread$ = threadStore.observeThread(threadId);
    if (thread$) {
      this._threadSub = thread$.subscribe((snapshot: unknown) => {
        const snap = snapshot as {
          messages?: Array<{ role: string; content: unknown; state?: unknown }>;
        };
        this._lastSnapshot = snap;
        this.setState(() => {
          // 逆向: yx0() pipeline — transform raw thread messages into DisplayItems
          this._items = transformThreadToDisplayItems(
            (snap.messages ?? []) as Parameters<typeof transformThreadToDisplayItems>[0],
          );
          // 逆向: ttT.emitThread() — append projected streaming message
          if (this._streamingBlocks.length > 0 && this._streamingMessageId) {
            const projected = projectStreamingMessage(
              this._streamingBlocks as Parameters<typeof projectStreamingMessage>[0],
              this._streamingMessageId,
            );
            if (projected) {
              const projectedItems = transformThreadToDisplayItems([projected] as Parameters<
                typeof transformThreadToDisplayItems
              >[0]);
              this._items = [...this._items, ...projectedItems];
            }
          }
        });
        // 自动滚动到底部 (新消息到达时)
        if (this._scrollController.followMode) {
          this._scrollController.scrollToBottom();
        }
      });
    }

    // 订阅工作器事件流 (per D-11)
    // 逆向: AB (2613_unknown_AB.js) — threadViewState derivation from events
    this._eventSub = threadWorker.events$.subscribe((event: unknown) => {
      const ev = event as {
        type: string;
        error?: Error;
        usage?: { inputTokens: number; outputTokens: number };
        toolUseId?: string;
        toolName?: string;
        args?: Record<string, unknown>;
        reason?: string;
      };
      switch (ev.type) {
        case "inference:start":
          this.setState(() => {
            this._inferenceState = "running";
            this._hasStartedStreaming = false;
          });
          break;
        case "inference:delta": {
          const delta = ev as {
            type: string;
            blockType?: string;
            text?: string;
            thinking?: string;
            messageId?: string;
            blockIndex?: number;
          };
          // 逆向: qp0(R, this.deltaState) in ttT — accumulate streaming blocks
          if (delta.messageId && !this._streamingMessageId) {
            this._streamingMessageId = delta.messageId;
          }
          if (delta.blockType === "text" || (!delta.blockType && delta.text)) {
            const lastBlock = this._streamingBlocks[this._streamingBlocks.length - 1];
            if (lastBlock?.type === "text") {
              lastBlock.text = (lastBlock.text ?? "") + (delta.text ?? "");
            } else {
              this._streamingBlocks.push({ type: "text", text: delta.text ?? "" });
            }
          } else if (delta.blockType === "thinking") {
            const lastBlock = this._streamingBlocks[this._streamingBlocks.length - 1];
            if (lastBlock?.type === "thinking") {
              lastBlock.thinking = (lastBlock.thinking ?? "") + (delta.thinking ?? "");
            } else {
              this._streamingBlocks.push({ type: "thinking", thinking: delta.thinking ?? "" });
            }
          }
          this.setState(() => {
            this._hasStartedStreaming = true;
            // Rebuild items with streaming projection appended
            this._rebuildItems();
          });
          break;
        }
        case "inference:complete": {
          this.setState(() => {
            this._inferenceState = "idle";
            if (ev.usage) {
              this._totalInputTokens += ev.usage.inputTokens;
              this._totalOutputTokens += ev.usage.outputTokens;
            }
            // Clear streaming accumulation — completed messages come via thread snapshot
            this._streamingBlocks = [];
            this._streamingMessageId = null;
          });
          break;
        }
        case "inference:error":
          this.setState(() => {
            this._error = ev.error ?? new Error("Unknown inference error");
            this._inferenceState = "idle";
          });
          break;
        case "turn:complete":
          this.setState(() => {
            this._inferenceState = "idle";
            this._error = null;
            // Clear streaming accumulation
            this._streamingBlocks = [];
            this._streamingMessageId = null;
          });
          break;
        case "tool:start":
          this.setState(() => {
            this._runningToolCount++;
          });
          break;
        case "tool:complete":
          this.setState(() => {
            this._runningToolCount = Math.max(0, this._runningToolCount - 1);
            // Clear pending approval if this tool completed
            // 逆向: jetbrains_wizard.js — pendingApprovals filtered on tool completion
            if (this._pendingApproval && ev.toolUseId === this._pendingApproval.toolUseId) {
              this._pendingApproval = null;
              this._waitingForApproval = false;
            }
          });
          break;
        case "approval:request":
          this.setState(() => {
            this._waitingForApproval = true;
            // 逆向: jetbrains_wizard.js — pendingApprovals$ pushes full request
            this._pendingApproval = {
              toolUseId: ev.toolUseId ?? "",
              toolName: ev.toolName ?? "",
              args: ev.args ?? {},
              reason: ev.reason ?? "",
            };
          });
          break;
        case "approval:response":
          this.setState(() => {
            this._waitingForApproval = false;
            this._pendingApproval = null;
          });
          break;
      }
    });
  }

  /**
   * Rebuild display items from the last thread snapshot, appending any active
   * streaming projection. Called from the inference:delta handler so the UI
   * updates on every token arrival.
   *
   * 逆向: ttT.emitThread() — calls Wp0() and appends the synthetic streaming
   * message to the messages array before emitting to subscribers.
   */
  private _rebuildItems(): void {
    if (!this._lastSnapshot) return;
    this._items = transformThreadToDisplayItems(
      (this._lastSnapshot.messages ?? []) as Parameters<typeof transformThreadToDisplayItems>[0],
    );
    if (this._streamingBlocks.length > 0 && this._streamingMessageId) {
      const projected = projectStreamingMessage(
        this._streamingBlocks as Parameters<typeof projectStreamingMessage>[0],
        this._streamingMessageId,
      );
      if (projected) {
        const projectedItems = transformThreadToDisplayItems([projected] as Parameters<
          typeof transformThreadToDisplayItems
        >[0]);
        this._items = [...this._items, ...projectedItems];
      }
    }
  }

  /**
   * 清理资源。
   *
   * 取消 ThreadStore 和 ThreadWorker 订阅，
   * 销毁 ScrollController。
   */
  dispose(): void {
    this._scrollKeyInterceptorUnsub?.();
    this._scrollKeyInterceptorUnsub = null;
    this._threadSub?.unsubscribe();
    this._threadSub = null;
    this._eventSub?.unsubscribe();
    this._eventSub = null;
    this._scrollController.dispose();
    super.dispose();
  }

  /**
   * Build top-left border label: "{percent}% of {max}".
   * 逆向: chunk-004.js:24704-24708 (XM token formatting)
   */
  private _buildTopLeftLabel(): string {
    const maxTokens = resolveModel(this.widget.config.modelName ?? "")?.contextWindow ?? 200000;
    const totalUsed = this._totalInputTokens + this._totalOutputTokens;
    // 逆向: jetbrains_wizard.js:6072 — guard: !l.isThreadEmpty()
    if (totalUsed === 0) return "";
    if (maxTokens <= 0) return "";
    const pct = Math.round((totalUsed / maxTokens) * 100);
    const maxStr = maxTokens >= 1000 ? `${Math.round(maxTokens / 1000)}k` : `${maxTokens}`;
    return `${pct}% of ${maxStr}`;
  }

  /**
   * Build top-right border label: "{mode}──!─{skills}─skills".
   * 逆向: chunk-006.js:37846-37867
   *   `${_T ? "! " : ""}${OT} ${o9(OT, "skill")}` where OT is the skill count.
   *   The mode name (e.g. "smart") prefixes the skills count separated by ──!─.
   */
  private _buildTopRightLabel(): string {
    const mode = this.widget.config.modeName ?? "smart";
    const skills = this.widget.config.skillCount;
    if (skills != null && skills >= 0) {
      return `${mode}\u2500\u2500!\u2500${skills}\u2500${skills === 1 ? "skill" : "skills"}`;
    }
    return mode;
  }

  /**
   * Build bottom-right border label: "{cwd} ({branch})".
   * 逆向: chunk-006.js:37949-37963
   *   `this.buildDisplayText(F, this.currentGitBranch || void 0, E, O)`
   *   where F = toHomeRelative(shorten(cwd)) and currentGitBranch comes from git.
   */
  private _buildBottomRightLabel(): string {
    const cwd = this.widget.config.cwdDisplay;
    const branch = this.widget.config.gitBranch;
    if (cwd && branch) return `${cwd} (${branch})`;
    if (cwd) return cwd;
    if (branch) return `(${branch})`;
    return "";
  }

  /**
   * 构建子 Widget 树。
   *
   * 返回完整的 Column 布局 (per UI-SPEC):
   *   Expanded > Scrollable > ConversationView (消息滚动区)
   *   StatusBar (状态栏)
   *   InputField (输入框)
   *
   * 逆向: amp has no separator lines — the input box border itself
   * serves as the visual separator between conversation and input areas.
   *
   * @param _context - 构建上下文
   * @returns Column 根节点
   */
  build(_context: BuildContext): Widget {
    const { onSubmit, toastManager } = this.widget.config;
    const { threadWorker } = this.widget.config;

    // Filter thinking items when showThinkingBlocks is disabled.
    // 逆向: amp-cli-reversed/modules/1959_unknown_x8R.js:230
    //   `let t = this.options.showThinkingBlocks ? R.content.map(...).filter(type === "thinking") : []`
    //   When showThinkingBlocks is false, thinking blocks are filtered from display.
    const displayItems = this._showThinkingBlocks
      ? this._items
      : this._items.filter((item) => item.type !== "thinking");

    // 逆向: jetbrains_wizard.js:4961-5006
    //   isTranscriptEmpty() ? brT (welcome screen) : G8R (conversation view)
    // 逆向: f8R.build() (interactive_widgets.js:2721) — uR padding: left:2, right:2, bottom:1
    const conversationArea =
      displayItems.length === 0
        ? new WelcomeScreen({ productName: "Flitter" })
        : new SelectionAreaWidget({
            child: new Padding({
              padding: EdgeInsets.only({ left: 2, right: 2, bottom: 1 }),
              child: new Scrollable({
                controller: this._scrollController,
                viewportBuilder: () =>
                  new ConversationView({
                    items: displayItems,
                    inferenceState:
                      this._inferenceState === "cancelled" ? "idle" : this._inferenceState,
                    error: this._error,
                    selectedItemIndex: this._selectedItemIndex,
                  }),
              }),
            }),
          });

    // 逆向: NQT (chunk-006.js:11009-11020) — Stack([child, Positioned(top:0, left:0, right:0, child: toastColumn)])
    // When toastManager is provided, wrap conversation in a Stack with ToastOverlay positioned on top.
    const mainContent = toastManager
      ? new Expanded({
          child: new Stack({
            children: [
              conversationArea,
              new Positioned({
                top: 0,
                left: 0,
                right: 0,
                child: new ToastOverlay({ manager: toastManager }),
              }),
            ],
          }),
        })
      : new Expanded({ child: conversationArea });

    const normalLayout = new Column({
      children: [
        mainContent,
        // Shortcuts help panel — shown above the input field when `?` was pressed.
        // 逆向: chunk-006.js:37662-37664
        //   `topWidget: this.isShowingShortcutsHelp ? new U8R({ submitOnEnter }) : void 0`
        //   U8R is the shortcuts help table, rendered above the input area.
        //   In flitter, ShortcutsPopup is the equivalent of amp's U8R.
        ...(this._isShowingShortcutsHelp ? [new ShortcutsPopup()] : []),
        // 输入框 or 审批对话框
        // 逆向: jetbrains_wizard.js — buildBottomWidget() conditionally shows
        // A0R (confirmation widget) instead of input when approval is pending
        this._pendingApproval
          ? new ApprovalWidget({
              request: this._pendingApproval,
              onRespond: (toolUseId, response) => {
                threadWorker.userRespondToApproval?.(toolUseId, response);
                this.setState(() => {
                  this._pendingApproval = null;
                  this._waitingForApproval = false;
                });
              },
            })
          : new InputField({
              onSubmit,
              promptHistory: this._promptHistory,
              topLeftLabel: this._buildTopLeftLabel(),
              topRightLabel: this._buildTopRightLabel(),
              bottomRightLabel: this._buildBottomRightLabel(),
              // 逆向: chunk-006.js:34746-34751
              //   When input is empty and shortcuts help is not shown → show "? for shortcuts" hint.
              //   The hint uses keybind color for "?" and dim foreground for " for shortcuts".
              //   In flitter, placeholder is a plain string — the InputField shows it when empty.
              placeholder: this._isShowingShortcutsHelp ? "" : "? for shortcuts",
              // 逆向: jetbrains_wizard.js:3040 — textChangeListener
              onSlashCommandTrigger: () => {
                this.setState(() => {
                  this._isShowingCommandPalette = true;
                });
              },
              // Gap fix: wire Ctrl+G and Ctrl+S through to interactive.ts
              onOpenInEditor: this.widget.config.onOpenInEditor,
              onToggleAgentMode: this.widget.config.onToggleAgentMode,
              // Gap fix: wire @@ thread mention trigger
              onThreadMentionTrigger: () => {
                this.setState(() => {
                  this._isShowingThreadPicker = true;
                });
              },
            }),
        // 1-row status line with wave spinner (逆向: IZT, jetbrains_wizard.js:681-708)
        new BottomStatusLine({
          inferenceState: this._inferenceState === "cancelled" ? "idle" : this._inferenceState,
          hasStartedStreaming: this._hasStartedStreaming,
          runningToolCount: this._runningToolCount,
          waitingForApproval: this._waitingForApproval,
        }),
      ],
    });

    // 逆向: jetbrains_wizard.js:5611 — N0 (Center overlay) pushed onto Ta (Stack)
    //   when isShowingPalette is true. The normal app UI is disabled via QP.enabled=false.
    //   In flitter, we always use a Stack as root. When the command palette is active,
    //   the overlay is added as a Positioned child on top of the normal layout.
    const showPalette =
      this._isShowingCommandPalette && (this.widget.config.slashCommands?.length ?? 0) > 0;
    const stackChildren: Widget[] = [normalLayout];

    if (showPalette) {
      stackChildren.push(
        new Positioned({
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          child: new CommandPaletteOverlay({
            commands: this.widget.config.slashCommands!,
            onSelect: (commandId) => {
              this.setState(() => {
                this._isShowingCommandPalette = false;
              });
              this.widget.config.onSlashCommand?.(commandId, "");
            },
            onDismiss: () => {
              this.setState(() => {
                this._isShowingCommandPalette = false;
              });
            },
          }) as unknown as Widget,
        }),
      );
    }

    // ── Prompt History Picker overlay (Ctrl+R) ─────────────────────────
    // 逆向: chunk-006.js:32904-33027 — L8R class (Prompt History picker)
    //   Title: "Prompt History", fuzzy filter, most-recent-first
    if (this._isShowingHistoryPicker && this._promptHistory.entries.length > 0) {
      const historyEntries = [...this._promptHistory.entries].reverse();
      const items = historyEntries.map((text, i) => ({
        id: `history-${i}`,
        label: text.length > 100 ? `${text.slice(0, 97)}...` : text,
        text,
      }));

      stackChildren.push(
        new Positioned({
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          child: new Center({
            child: new SizedBox({
              width: 80,
              height: 20,
              child: new FuzzyPicker({
                title: "Prompt History",
                items,
                getLabel: (item) => item.label,
                onAccept: (item) => {
                  this.setState(() => {
                    this._isShowingHistoryPicker = false;
                  });
                  // Navigate history to the selected entry
                  const history = this._promptHistory;
                  if (!history.isNavigating) {
                    history.startNavigation("");
                  }
                  const idx = history.entries.indexOf(item.text);
                  if (idx >= 0) {
                    history.startNavigation("");
                    while (history.canGoBack()) {
                      const entry = history.goBack();
                      if (entry === item.text) break;
                    }
                  }
                  this.setState(() => {});
                },
                onDismiss: () => {
                  this.setState(() => {
                    this._isShowingHistoryPicker = false;
                  });
                },
                renderItem: (entry, isSelected) => {
                  return new Container({
                    decoration: new BoxDecoration({
                      color: isSelected ? Color.rgb(50, 50, 80) : Color.default(),
                    }),
                    child: new Padding({
                      padding: EdgeInsets.symmetric({ horizontal: 1 }),
                      child: new Text({
                        data: entry.label,
                        style: new TextStyle({
                          foreground: isSelected ? Color.indexed(4) : Color.default(),
                        }),
                      }),
                    }),
                  }) as Widget;
                },
              }),
            }),
          }),
        }),
      );
    }

    // ── Thread Picker overlay (@@) ─────────────────────────────────────
    // 逆向: chunk-004.js:34900-34954 — wQ thread picker
    if (
      this._isShowingThreadPicker &&
      this.widget.config.threadList &&
      this.widget.config.threadList.length > 0
    ) {
      const threads = this.widget.config.threadList;
      const items = threads.map((t) => ({
        id: t.id,
        label: t.title ?? t.id.slice(0, 8),
        description: `${t.messageCount} msgs`,
      }));

      stackChildren.push(
        new Positioned({
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          child: new Center({
            child: new SizedBox({
              width: 80,
              height: 20,
              child: new FuzzyPicker({
                title: "Select a thread to mention",
                items,
                getLabel: (item) => item.label,
                onAccept: (_item) => {
                  this.setState(() => {
                    this._isShowingThreadPicker = false;
                  });
                  // TODO: insert @<threadId> into input field
                  // For now, just close the picker
                },
                onDismiss: () => {
                  this.setState(() => {
                    this._isShowingThreadPicker = false;
                  });
                },
                renderItem: (entry, isSelected) => {
                  return new Container({
                    decoration: new BoxDecoration({
                      color: isSelected ? Color.rgb(50, 50, 80) : Color.default(),
                    }),
                    child: new Padding({
                      padding: EdgeInsets.symmetric({ horizontal: 1 }),
                      child: new Row({
                        children: [
                          new Text({
                            data: entry.label,
                            style: new TextStyle({
                              foreground: isSelected ? Color.indexed(4) : Color.default(),
                            }),
                          }),
                          new SizedBox({ width: 2 }),
                          new Text({
                            data: entry.description ?? "",
                            style: new TextStyle({
                              foreground: Color.default(),
                              dim: true,
                            }),
                          }),
                        ],
                      }),
                    }),
                  }) as Widget;
                },
              }),
            }),
          }),
        }),
      );
    }

    return new Stack({ children: stackChildren });
  }
}
