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
import type { TitleGenerationProvider } from "../title/generate-title";
import { extractTextFromContent, generateThreadTitle } from "../title/generate-title";
import type { ToolOrchestrator, ToolUseItem } from "../tools/orchestrator";
import type { ToolRegistry } from "../tools/registry";
import type { AgentEvent, InferenceState } from "./events";
import { isContextLimitError, isRetryableError, RetryScheduler } from "./retry-scheduler";

// ─── 不完整 tool_use 检测 ────────────────────────────────

/**
 * Detects tool_use blocks that are marked complete but have empty or missing input.
 * This indicates the stream ended prematurely — the LLM finished the block but
 * no input was actually received.
 *
 * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:949-951
 *   `l.content.some(v => v.type === "tool_use" && v.complete && Object.keys(v.input ?? {}).length === 0)`
 */
export function hasIncompleteToolUse(content: AssistantContentBlock[]): boolean {
  return content.some(
    (v) =>
      v.type === "tool_use" &&
      (v as Record<string, unknown>).complete === true &&
      Object.keys(((v as Record<string, unknown>).input as Record<string, unknown>) ?? {})
        .length === 0,
  );
}

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
  /**
   * Optional provider for title generation (non-streaming createMessage).
   * If not provided, title generation is silently skipped.
   * 逆向: amp injects generateThreadTitle via deps (1244:770)
   */
  titleProvider?: TitleGenerationProvider;
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
   * Whether resume() has already been called. Guards idempotency.
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:271
   *   `resumed = !1;` (field declaration), set to `!0` inside resume()
   */
  private resumed = false;

  /**
   * Message queue: buffers user messages sent while tools are running.
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:528-561 (enqueue),
   *        amp-cli-reversed/modules/1244_ThreadWorker_ov.js:431-437 (dequeue),
   *        amp-cli-reversed/modules/1244_ThreadWorker_ov.js:661-662 (dequeue on turn complete)
   */
  private readonly messageQueue: Message[] = [];

  /**
   * Retry scheduler for exponential backoff on 429/overloaded errors.
   * 逆向: ov.ephemeralErrorRetryAttempt, ov.retryCountdownSeconds, ov.retryTimer, ov.retrySession
   * (amp-cli-reversed/modules/1244_ThreadWorker_ov.js:1124-1165)
   */
  private readonly retryScheduler = new RetryScheduler();

  /**
   * AbortController for in-flight title generation.
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:752
   *   `this.ops.titleGeneration?.abort(), this.ops.titleGeneration = new AbortController()`
   */
  private titleGenerationAbort: AbortController | null = null;

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
   * Resume a thread after reconnect/restart.
   *
   * If the last message is an assistant message in "streaming" state, it means
   * the previous session was interrupted mid-stream. We truncate that incomplete
   * message so the next inference starts clean.
   *
   * Idempotent: second call is a no-op.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:259-270
   *   ```
   *   if (this.resumed) return;
   *   if (this.resumed = !0, ...)
   *   let T = this.thread.messages.at(-1);
   *   if (T?.role === "assistant" && T.state.type === "streaming")
   *     this.updateThread({ type: "thread:truncate", fromIndex: this.thread.messages.length - 1 });
   *   ```
   */
  resume(): void {
    if (this.resumed) return;
    this.resumed = true;

    const snapshot = this.opts.getThreadSnapshot();
    const lastMsg = snapshot.messages.at(-1);

    if (
      lastMsg?.role === "assistant" &&
      ((lastMsg as Record<string, unknown>).state as Record<string, unknown>)?.type === "streaming"
    ) {
      // Truncate the incomplete streaming message
      // 逆向: amp uses thread:truncate fromIndex which removes from that index onward
      this.opts.updateThreadSnapshot({
        ...snapshot,
        messages: snapshot.messages.slice(0, snapshot.messages.length - 1),
      });
    }
  }

  /**
   * Number of messages waiting in the queue.
   * 逆向: amp uses thread.queuedMessages.length
   */
  get queuedMessageCount(): number {
    return this.messageQueue.length;
  }

  /**
   * Enqueue a user message. If tools are running during inference, the message
   * is buffered and will be dequeued after the current turn completes.
   * Otherwise, it is processed immediately (appended to the snapshot).
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:528-561
   *   ```
   *   case "user:message-queue:enqueue":
   *     let a = this._inferenceState.getValue();
   *     if (IUT(this.thread, a) !== "tool-running") {
   *       if (a === "cancelled") { this.handle({ type: "user:message-queue:dequeue" }); break; }
   *       else if (a === "idle") { ... dequeue ... }
   *     }
   *   ```
   */
  enqueueMessage(message: Message): void {
    const state = this.inferenceState$.getValue();
    const toolsRunning = state === "running" && this.opts.toolOrchestrator.hasRunningTools();

    if (toolsRunning) {
      // Buffer the message — will be dequeued on turn:complete
      this.messageQueue.push(message);
    } else {
      // Process immediately: append to snapshot
      this.appendMessageToSnapshot(message);
    }
  }

  /**
   * Dequeue the first buffered message and append it to the thread snapshot.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:431-437
   *   ```
   *   case "user:message-queue:dequeue":
   *     let a = this.thread.messages.at(-1);
   *     if (!a) break;
   *     if (a.role !== "user") break;
   *     this._turnStartTime.next(Date.now()), ...
   *     this.runInferenceAndUpdateThread({ agentStart: { ... } });
   *   ```
   */
  dequeueMessage(): void {
    if (this.messageQueue.length === 0) return;

    const message = this.messageQueue.shift()!;
    this.appendMessageToSnapshot(message);
  }

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

      // 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:878
      //   `this.triggerTitleGeneration();` (called at start of inference loop)
      this.triggerTitleGeneration();

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
      // 逆向: chunk-002.js:2213-2219 — carry model + all 4 token fields
      const rawUsage = lastDelta?.usage as unknown as
        | Record<string, number | undefined>
        | undefined;
      this.events$.next({
        type: "inference:complete",
        usage: rawUsage
          ? {
              inputTokens: rawUsage.inputTokens ?? 0,
              outputTokens: rawUsage.outputTokens ?? 0,
              // Only include optional cache fields when they carry actual values
              // 逆向: chunk-002.js:2217-2218 — cache fields only present when non-null
              ...(rawUsage.cacheCreationInputTokens !== undefined && {
                cacheCreationInputTokens: rawUsage.cacheCreationInputTokens,
              }),
              ...(rawUsage.cacheReadInputTokens !== undefined && {
                cacheReadInputTokens: rawUsage.cacheReadInputTokens,
              }),
            }
          : undefined,
        model: streamParams.model,
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

        // 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:661-662
        //   `if (this.thread.queuedMessages && this.thread.queuedMessages.length > 0)
        //      this.handle({ type: "user:message-queue:dequeue" });`
        if (this.messageQueue.length > 0) {
          this.dequeueMessage();
        }

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

    // 取消 title generation
    // 逆向: amp aborts ops.titleGeneration in dispose
    if (this.titleGenerationAbort) {
      this.titleGenerationAbort.abort();
      this.titleGenerationAbort = null;
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
   * Trigger title generation in the background (fire-and-forget).
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:750-793
   *   ```
   *   triggerTitleGeneration() {
   *     if (this.thread.mainThreadID !== void 0 || this.thread.title) return;
   *     this.ops.titleGeneration?.abort(), this.ops.titleGeneration = new AbortController();
   *     let T = this.ops.titleGeneration.signal;
   *     ...find first user message with text...
   *     this.deps.generateThreadTitle(t, ...)
   *       .then(({ title, usage }) => { if (!aborted && !disposed && title) updateThread(...) })
   *       .catch(...)
   *   }
   *   ```
   *
   * Called at the start of inference (line 878 in amp).
   */
  private triggerTitleGeneration(): void {
    const snapshot = this.opts.getThreadSnapshot();

    // Skip if thread already has title
    // 逆向: `if (this.thread.mainThreadID !== void 0 || this.thread.title) return;`
    if (snapshot.title) return;

    // Skip if child thread (has mainThreadID)
    if ((snapshot as Record<string, unknown>).mainThreadID !== undefined) return;

    // Skip if no titleProvider configured
    if (!this.opts.titleProvider) return;

    // Cancel any in-flight title generation
    // 逆向: `this.ops.titleGeneration?.abort(), this.ops.titleGeneration = new AbortController()`
    this.titleGenerationAbort?.abort();
    this.titleGenerationAbort = new AbortController();
    const signal = this.titleGenerationAbort.signal;

    // Find the first user message that has text content
    // 逆向: `this.thread.messages.find(r => r.role !== "user" ? !1 : kr(r.content) ? !0 : ...)`
    const firstUserMsg = snapshot.messages.find((msg) => {
      if (msg.role !== "user") return false;
      const text = extractTextFromContent(
        msg.content as ReadonlyArray<{ type: string; text?: string }>,
      );
      return !!text;
    });

    if (!firstUserMsg) return;

    // Fire-and-forget: generate title
    const provider = this.opts.titleProvider;
    const threadId = snapshot.id;
    const content = firstUserMsg.content as ReadonlyArray<{ type: string; text?: string }>;

    generateThreadTitle({
      content,
      threadId,
      provider,
      signal,
    })
      .then(({ title }) => {
        if (signal.aborted || this.disposed) return;

        // 逆向: `if (r !== void 0 && this.thread.title !== r) this.updateThread({ type: "title", ... })`
        if (title !== undefined) {
          const currentSnapshot = this.opts.getThreadSnapshot();
          if (currentSnapshot.title !== title) {
            this.opts.updateThreadSnapshot({ ...currentSnapshot, title });
          }
        }
      })
      .catch((_err) => {
        // 逆向: amp logs abort vs error separately; we silently swallow both
        // since this is fire-and-forget and errors should not break inference
      });
  }

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

  /**
   * Append a message to the thread snapshot.
   * Used by enqueueMessage (immediate processing) and dequeueMessage.
   */
  private appendMessageToSnapshot(message: Message): void {
    const snapshot = this.opts.getThreadSnapshot();
    this.opts.updateThreadSnapshot({
      ...snapshot,
      messages: [...snapshot.messages, message] as ThreadSnapshot["messages"],
    });
  }
}
