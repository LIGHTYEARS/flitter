/**
 * ThreadWorker: Agent 核心状态机
 * 逆向: ov (tool-execution-engine.js 2450-2876)
 *
 * 职责:
 * 1. 管理推理状态 (idle/running/cancelled)
 * 2. 驱动推理循环: 构建提示词 → LLM stream → 工具执行 → 递归推理
 * 3. 发出 AgentEvent 供 TUI 层消费
 * 4. 处理取消/重试/用户输入/审批
 */
import type { LLMProvider, StreamDelta, StreamParams, SystemPromptBlock } from "@flitter/llm";
import { ProviderError } from "@flitter/llm";
import type { AssistantContentBlock, Config, Message, ThreadSnapshot } from "@flitter/schemas";
import type { Subscription } from "@flitter/util";
import { BehaviorSubject, Subject } from "@flitter/util";
import type { ToolOrchestrator, ToolUseItem } from "../tools/orchestrator";
import type { ToolRegistry } from "../tools/registry";
import type { AgentEvent, InferenceState } from "./events";
import { isContextLimitError, isRetryableError, RetryScheduler } from "./retry-scheduler";

// ─── 工具审批响应 ────────────────────────────────────────

/**
 * 用户对工具审批请求的响应
 */
export interface ToolApprovalResponse {
  approved: boolean;
  remember?: boolean;
}

// ─── ThreadWorker 选项 ───────────────────────────────────

/**
 * ThreadWorker 依赖注入接口
 *
 * 使用回调方式注入依赖, 避免直接耦合具体服务类
 * (与 10-08 context-blocks.ts 的设计保持一致)
 */
export interface ThreadWorkerOptions {
  /** 获取当前线程快照 */
  getThreadSnapshot: () => ThreadSnapshot;
  /** 更新线程快照 (含新的 assistant 消息) */
  updateThreadSnapshot: (snapshot: ThreadSnapshot) => void;
  /** 将消息历史转为 LLM Message 格式 */
  getMessages: () => Message[];
  /** LLM 提供者 (流式推理) */
  provider: LLMProvider;
  /** 工具执行引擎 */
  toolOrchestrator: ToolOrchestrator;
  /** 系统提示词构建回调 (异步, 每次推理前调用) */
  buildSystemPrompt: () => Promise<SystemPromptBlock[]>;
  /** 上下文压缩回调: 接收 snapshot, 返回压缩后的 snapshot (null 表示无需压缩) */
  checkAndCompact: (thread: ThreadSnapshot) => Promise<ThreadSnapshot | null>;
  /** 获取运行时配置 */
  getConfig: () => Config;
  /** 工具注册表 */
  toolRegistry: ToolRegistry;
}

// ─── ThreadWorker 类 ────────────────────────────────────

/**
 * ThreadWorker: Agent 核心状态机
 *
 * 状态机流:
 * ┌─────────────────────────────────────────────────┐
 * │  idle ──runInference()──→ running               │
 * │   ↑                         │                   │
 * │   │                    ┌────┴────┐              │
 * │   │                    ↓         ↓              │
 * │   │              (no tools)  (has tools)        │
 * │   │                    │         │              │
 * │   │              turn:complete   │              │
 * │   │                    │    ToolOrchestrator    │
 * │   │                    │         │              │
 * │   │                    │    recursive           │
 * │   │                    │    runInference()      │
 * │   │                    ↓         │              │
 * │   ├────────────────── idle ←─────┘              │
 * │   │                                             │
 * │   │  cancelInference()                          │
 * │   │     running → cancelled                     │
 * │   │                                             │
 * │   │  retry()                                    │
 * │   ├──── cancelled → idle → runInference()       │
 * │   │                                             │
 * │   │  error                                      │
 * │   ├──── running → idle + inference:error        │
 * └─────────────────────────────────────────────────┘
 */
export class ThreadWorker {
  // ─── Observable 状态 ──────────────────────────────

  /** 推理状态 (BehaviorSubject, 初始 "idle") */
  readonly inferenceState$: BehaviorSubject<InferenceState>;

  /** Agent 事件流 */
  readonly events$: Subject<AgentEvent>;

  // ─── 内部状态 ──────────────────────────────────────

  private readonly opts: ThreadWorkerOptions;
  private abortController: AbortController | null = null;
  private subscriptions: Subscription[] = [];
  private disposed = false;

  /**
   * Retry scheduler for exponential backoff on 429/overloaded errors.
   * 逆向: ov.ephemeralErrorRetryAttempt, ov.retryCountdownSeconds, ov.retryTimer, ov.retrySession
   * (amp-cli-reversed/modules/1244_ThreadWorker_ov.js:1124-1165)
   */
  private readonly retryScheduler = new RetryScheduler();

  /**
   * Pending approval resolvers: toolUseId → resolve function.
   *
   * 逆向: amp's toolService stores resolvers in a Map (`r = new Map()`) keyed
   * by toolUseId. requestApproval() creates a Promise and stores its resolver.
   * resolveApproval() looks up the resolver and settles the Promise.
   *
   * Flitter puts this Map on ThreadWorker (not a separate toolService) because
   * the orchestrator's requestApproval callback creates the Promise, and the
   * worker's userRespondToApproval method resolves it.
   */
  readonly _pendingApprovals = new Map<
    string,
    (response: { accepted: boolean; feedback?: string }) => void
  >();

  constructor(opts: ThreadWorkerOptions) {
    this.opts = opts;
    this.inferenceState$ = new BehaviorSubject<InferenceState>("idle");
    this.events$ = new Subject<AgentEvent>();
  }

  // ─── 公共方法 ──────────────────────────────────────

  /**
   * 执行完整推理循环
   * 逆向: ov.runInference (~2520-2650)
   *
   * 流程:
   * 1. inferenceState → "running"
   * 2. 检查上下文压缩
   * 3. 构建系统提示词
   * 4. 获取工具定义
   * 5. provider.stream() → 迭代 StreamDelta
   * 6. 流式完成后检查 tool_use → 递归或 turn:complete
   * 7. inferenceState → "idle"
   */
  async runInference(): Promise<void> {
    if (this.disposed) return;

    try {
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      this.inferenceState$.next("running");
      this.events$.next({ type: "inference:start" });

      // ─── Step 1: 检查上下文压缩 ───────────────
      await this.checkCompaction();

      // ─── Step 2: 构建系统提示词 ───────────────
      const systemPrompt = await this.opts.buildSystemPrompt();

      // ─── Step 3: 获取工具定义 ──────────────────
      const config = this.opts.getConfig();
      const toolDefs = this.opts.toolRegistry.getToolDefinitions(config.settings);

      // ─── Step 4: 构建 StreamParams ─────────────
      const messages = this.opts.getMessages();
      const streamParams: StreamParams = {
        model: config.settings.model ?? "default",
        messages,
        systemPrompt,
        tools: toolDefs,
        config,
        signal,
      };

      // ─── Step 5: 流式推理 ──────────────────────
      let lastDelta: StreamDelta | null = null;
      const stream = this.opts.provider.stream(streamParams);

      for await (const delta of stream) {
        if (signal.aborted) break;

        lastDelta = delta;

        // 更新 ThreadStore 中的 assistant 消息
        this.updateAssistantContent(delta.content);

        // 发出 delta 事件
        this.events$.next({ type: "inference:delta", delta });
      }

      if (signal.aborted) {
        this.inferenceState$.next("cancelled");
        return;
      }

      // ─── Step 6: 流式完成 ──────────────────────
      this.events$.next({
        type: "inference:complete",
        usage: lastDelta?.usage
          ? {
              inputTokens: (lastDelta.usage as unknown as Record<string, number>).inputTokens ?? 0,
              outputTokens:
                (lastDelta.usage as unknown as Record<string, number>).outputTokens ?? 0,
            }
          : undefined,
      });

      // 逆向: ov.resetRetryAttempts on inference:completed
      this.retryScheduler.resetAttempts();

      // ─── Step 7: 检查 tool_use ─────────────────
      const toolUses = this.extractToolUses();

      if (toolUses.length > 0) {
        // 有 tool_use: 交给 ToolOrchestrator 执行
        await this.opts.toolOrchestrator.executeToolsWithPlan(toolUses);

        // 递归推理 (多轮)
        await this.runInference();
      } else {
        // 无 tool_use: turn 完成
        this.events$.next({ type: "turn:complete" });
        this.inferenceState$.next("idle");
      }
    } catch (error) {
      // 逆向: amp 1244_ThreadWorker_ov.js:977-1003
      // 1. Check abort/cancelled (not an error to surface)
      if (error instanceof Error && error.name === "AbortError") {
        this.inferenceState$.next("cancelled");
        return;
      }

      const err = error instanceof Error ? error : new Error(String(error));

      // 2. Context-limit error — attempt compaction, then surface error
      // 逆向: dO() check before vUT() — context limit is not retryable
      if (isContextLimitError(err)) {
        const snapshot = this.opts.getThreadSnapshot();
        const compacted = await this.opts.checkAndCompact(snapshot);
        if (compacted) {
          this.events$.next({ type: "compaction:start" });
          this.opts.updateThreadSnapshot(compacted);
          this.events$.next({ type: "compaction:complete" });
          // Re-try after compaction (once only — don't loop)
          this.inferenceState$.next("idle");
          return;
        }
        // Compaction didn't help — surface the error
        this.inferenceState$.next("idle");
        this.events$.next({ type: "inference:error", error: err });
        return;
      }

      // 3. Retryable error — start countdown
      // 逆向: vUT() check → getRetryDelaySeconds() → startRetryCountdown()
      if (isRetryableError(err)) {
        const computedDelay = this.retryScheduler.getRetryDelaySeconds();
        if (computedDelay !== undefined) {
          // 逆向: prefer provider's retry-after if available
          const providerDelayMs = err instanceof ProviderError ? err.retryAfterMs : undefined;
          const delay =
            providerDelayMs !== undefined ? Math.ceil(providerDelayMs / 1000) : computedDelay;

          this.events$.next({
            type: "retry:start",
            error: err,
            delaySeconds: delay,
            attempt: this.retryScheduler.currentAttempt,
          });
          this.retryScheduler.startCountdown(
            delay,
            (remaining) => {
              if (remaining === undefined) {
                this.events$.next({ type: "retry:cleared" });
              } else {
                this.events$.next({ type: "retry:countdown", remainingSeconds: remaining });
              }
            },
            () => this.retry(),
          );
          this.inferenceState$.next("idle");
          return;
        }
        // Max retries exceeded — fall through to error
      }

      // 4. Non-retryable or max-retries-exceeded — surface error
      this.inferenceState$.next("idle");
      this.events$.next({ type: "inference:error", error: err });
    }
  }

  /**
   * 取消当前推理
   * 逆向: ov.cancelInference (~2660-2680)
   */
  cancelInference(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.opts.toolOrchestrator.cancelAll();
    this.inferenceState$.next("cancelled");
  }

  /**
   * 重试上次失败/取消的推理
   * 逆向: ov.retry (~1132-1140)
   *
   * Flow:
   * 1. Clear retry countdown
   * 2. Increment retry attempt counter
   * 3. Abort any active inference
   * 4. Truncate incomplete assistant message
   * 5. Set state to idle, then runInference
   */
  async retry(): Promise<void> {
    // 逆向: ov.retry — clearRetryCountdown, increment attempt, clear error
    this.retryScheduler.clearCountdown();
    this.retryScheduler.incrementAttempt();
    this.events$.next({ type: "retry:cleared" });

    const currentState = this.inferenceState$.getValue();
    if (currentState === "cancelled") {
      this.inferenceState$.next("idle");
    }

    // 逆向: ov.retry truncates incomplete assistant message
    const snapshot = this.opts.getThreadSnapshot();
    const lastMsg = snapshot.messages[snapshot.messages.length - 1];
    if (
      lastMsg?.role === "assistant" &&
      ((lastMsg as Record<string, unknown>).state as Record<string, unknown>)?.type !== "complete"
    ) {
      // Truncate the incomplete assistant message
      this.opts.updateThreadSnapshot({
        ...snapshot,
        messages: snapshot.messages.slice(0, -1),
      });
    }

    await this.runInference();
  }

  /**
   * 用户为被阻塞的工具提供输入
   */
  async userProvideInput(toolUseId: string, input: string): Promise<void> {
    void toolUseId;
    void input;
    // Placeholder — requires ToolOrchestrator blocked-tool input channel
  }

  /**
   * 用户响应工具审批请求
   *
   * 逆向: amp's toolService.resolveApproval(toolUseId, accepted, feedback)
   * looks up the resolver in Map `r`, calls resolve({accepted, feedback}),
   * removes from the map, and updates pendingApprovals$ BehaviorSubject.
   *
   * Flitter: looks up the resolver in _pendingApprovals and settles the Promise
   * that the orchestrator's requestApproval callback is awaiting.
   */
  async userRespondToApproval(toolUseId: string, response: ToolApprovalResponse): Promise<void> {
    const resolve = this._pendingApprovals.get(toolUseId);
    if (resolve) {
      resolve(response.approved ? { accepted: true } : { accepted: false });
      this._pendingApprovals.delete(toolUseId);
    }
  }

  /**
   * 销毁 ThreadWorker, 释放所有资源
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // 取消推理
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // 清理重试调度器
    this.retryScheduler.dispose();

    // 销毁 ToolOrchestrator
    this.opts.toolOrchestrator.dispose();

    // 取消所有订阅
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
    this.subscriptions = [];
  }

  // ─── 内部方法 ──────────────────────────────────────

  /**
   * 检查并执行上下文压缩
   */
  private async checkCompaction(): Promise<void> {
    const snapshot = this.opts.getThreadSnapshot();
    const compacted = await this.opts.checkAndCompact(snapshot);

    if (compacted) {
      this.events$.next({ type: "compaction:start" });
      this.opts.updateThreadSnapshot(compacted);
      this.events$.next({ type: "compaction:complete" });
    }
  }

  /**
   * 更新 assistant 消息内容 (累积模式)
   */
  private updateAssistantContent(content: unknown[]): void {
    const snapshot = this.opts.getThreadSnapshot();
    const messages = [...snapshot.messages];
    const last = messages[messages.length - 1];

    if (last && last.role === "assistant") {
      // 更新已有 assistant 消息
      (last as Message & { role: "assistant" }).content = content as AssistantContentBlock[];
    } else {
      // 追加新 assistant 消息
      (messages as unknown[]).push({
        role: "assistant",
        content: content as AssistantContentBlock[],
        messageId: snapshot.nextMessageId ?? messages.length,
        state: { type: "streaming" },
      });
    }

    this.opts.updateThreadSnapshot({ ...snapshot, messages });
  }

  /**
   * 从最新 assistant 消息中提取 tool_use 块
   * 逆向: ov ~2600-2610 中的 tool_use 检查
   */
  private extractToolUses(): ToolUseItem[] {
    const snapshot = this.opts.getThreadSnapshot();
    const messages = snapshot.messages;

    if (messages.length === 0) return [];

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return [];

    const toolUses: ToolUseItem[] = [];
    const content = lastMessage.content as Array<Record<string, unknown>>;

    for (const block of content) {
      if (block.type === "tool_use") {
        toolUses.push({
          id: block.id as string,
          name: block.name as string,
          input: (block.input as Record<string, unknown>) ?? {},
        });
      }
    }

    return toolUses;
  }
}
