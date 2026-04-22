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
  Column,
  EdgeInsets,
  Expanded,
  Padding,
  Positioned,
  Scrollable,
  ScrollController,
  Stack,
  State,
  StatefulWidget,
} from "@flitter/tui";
import type { Subscription } from "@flitter/util";

import type { ApprovalRequest } from "./approval-widget.js";
import { ApprovalWidget } from "./approval-widget.js";
import { BottomStatusLine } from "./bottom-status-line.js";
import { ConversationView } from "./conversation-view.js";
import type { DisplayItem } from "./display-items.js";
import { projectStreamingMessage, transformThreadToDisplayItems } from "./display-items.js";
import { InputField } from "./input-field.js";
import { PromptHistory } from "./prompt-history.js";
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

  /** 滚动控制器 */
  private _scrollController: ScrollController;

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
        : new Padding({
            padding: EdgeInsets.only({ left: 2, right: 2, bottom: 1 }),
            child: new Scrollable({
              controller: this._scrollController,
              viewportBuilder: () =>
                new ConversationView({
                  items: displayItems,
                  inferenceState:
                    this._inferenceState === "cancelled" ? "idle" : this._inferenceState,
                  error: this._error,
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

    return new Column({
      children: [
        mainContent,
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
  }
}
