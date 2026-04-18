/**
 * ThreadStateWidget -- 线程/对话状态管理 Widget。
 *
 * {@link ThreadStateWidget} 扩展 {@link StatefulWidget}，管理线程/对话状态，
 * 订阅 ThreadStore.observeThread() 和 ThreadWorker.events$ 变化并触发子树重建。
 *
 * build() 返回完整的 Column 布局:
 *   Expanded > Scrollable > ConversationView (消息列表)
 *   SizedBox (分隔线)
 *   StatusBar (状态栏)
 *   SizedBox (分隔线)
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

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Column,
  Expanded,
  Positioned,
  Scrollable,
  ScrollController,
  SizedBox,
  Stack,
  State,
  StatefulWidget,
  Text,
} from "@flitter/tui";
import type { Subscription } from "@flitter/util";

import { ConversationView } from "./conversation-view.js";
import type { DisplayItem } from "./display-items.js";
import { transformThreadToDisplayItems } from "./display-items.js";
import { InputField } from "./input-field.js";
import { PromptHistory } from "./prompt-history.js";
import { StatusBar, type StatusBarState } from "./status-bar.js";
import type { ToastManager } from "./toast-manager.js";
import { ToastOverlay } from "./toast-overlay.js";

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

  /** 推理错误 */
  private _error: Error | null = null;

  /** Running tool count for status bar (逆向: yB tool tracking) */
  private _runningToolCount = 0;

  /** Total input tokens consumed in this session */
  private _totalInputTokens = 0;

  /** Total output tokens consumed in this session */
  private _totalOutputTokens = 0;

  /** Compaction state for status bar */
  private _compactionState: "idle" | "compacting" = "idle";

  /** Whether waiting for user approval on a tool */
  private _waitingForApproval = false;

  /** Prompt history for up/down arrow navigation */
  private _promptHistory = new PromptHistory();

  /** 滚动控制器 */
  private _scrollController: ScrollController;

  constructor() {
    super();
    this._scrollController = new ScrollController();
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
        this.setState(() => {
          // 逆向: yx0() pipeline — transform raw thread messages into DisplayItems
          this._items = transformThreadToDisplayItems(
            (snap.messages ?? []) as Parameters<typeof transformThreadToDisplayItems>[0],
          );
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
      };
      switch (ev.type) {
        case "inference:start":
          this.setState(() => {
            this._inferenceState = "running";
            this._hasStartedStreaming = false;
          });
          break;
        case "inference:delta":
          // First token arrived — switch from "Waiting for response" to "Streaming"
          if (!this._hasStartedStreaming) {
            this.setState(() => {
              this._hasStartedStreaming = true;
            });
          }
          break;
        case "inference:complete": {
          this.setState(() => {
            this._inferenceState = "idle";
            if (ev.usage) {
              this._totalInputTokens += ev.usage.inputTokens;
              this._totalOutputTokens += ev.usage.outputTokens;
            }
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
          });
          break;
        case "compaction:start":
          this.setState(() => {
            this._compactionState = "compacting";
          });
          break;
        case "compaction:complete":
          this.setState(() => {
            this._compactionState = "idle";
          });
          break;
        case "approval:request":
          this.setState(() => {
            this._waitingForApproval = true;
          });
          break;
        case "approval:response":
          this.setState(() => {
            this._waitingForApproval = false;
          });
          break;
      }
    });
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
   * 构建子 Widget 树。
   *
   * 返回完整的 Column 布局 (per UI-SPEC):
   *   Expanded > Scrollable > ConversationView (消息滚动区)
   *   SizedBox(1) > Text (分隔线)
   *   StatusBar (状态栏)
   *   SizedBox(1) > Text (分隔线)
   *   InputField (输入框)
   *
   * @param _context - 构建上下文
   * @returns Column 根节点
   */
  build(_context: BuildContext): Widget {
    const { onSubmit, modelName, toastManager } = this.widget.config;

    // 消息区域 (占据全部剩余空间)
    // 逆向: Scrollable wrapping ConversationView
    const conversationScrollable = new Scrollable({
      controller: this._scrollController,
      child: new ConversationView({
        items: this._items,
        inferenceState: this._inferenceState,
        error: this._error,
      }),
    });

    // 逆向: NQT (chunk-006.js:11009-11020) — Stack([child, Positioned(top:0, left:0, right:0, child: toastColumn)])
    // When toastManager is provided, wrap conversation in a Stack with ToastOverlay positioned on top.
    const mainContent = toastManager
      ? new Expanded({
          child: new Stack({
            children: [
              conversationScrollable,
              new Positioned({
                top: 0,
                left: 0,
                right: 0,
                child: new ToastOverlay({ manager: toastManager }),
              }),
            ],
          }),
        })
      : new Expanded({ child: conversationScrollable });

    return new Column({
      children: [
        mainContent,
        // 分隔线
        new SizedBox({
          height: 1,
          child: new Text({ data: "\u2500".repeat(80) }),
        }),
        // 状态栏 — derive live StatusBarState from tracked fields
        // 逆向: yB() state machine (2731_unknown_yB.js)
        new StatusBar({
          state: {
            modelName: modelName ?? "unknown",
            inferenceState: this._inferenceState,
            hasStartedStreaming: this._hasStartedStreaming,
            tokenUsage: {
              inputTokens: this._totalInputTokens,
              outputTokens: this._totalOutputTokens,
              maxInputTokens: 200000, // TODO: derive from model config
            },
            compactionState: this._compactionState,
            runningToolCount: this._runningToolCount,
            waitingForApproval: this._waitingForApproval,
          },
        }),
        // 分隔线
        new SizedBox({
          height: 1,
          child: new Text({ data: "\u2500".repeat(80) }),
        }),
        // 输入框
        new InputField({ onSubmit, promptHistory: this._promptHistory }),
      ],
    });
  }
}
