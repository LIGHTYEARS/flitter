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
import { resolveModelName } from "@flitter/schemas";
import type { Subscription } from "@flitter/util";
import { BehaviorSubject, Subject } from "@flitter/util";
import type { PermissionEngine } from "../permissions/engine";
import type { PluginService } from "../plugins/plugin-service";
import type { TitleGenerationProvider } from "../title/generate-title";
import { extractTextFromContent, generateThreadTitle } from "../title/generate-title";
import type { SkillLike } from "../tools/builtin/skill-tool";
import type { ToolOrchestrator, ToolUseItem } from "../tools/orchestrator";
import type { ToolRegistry } from "../tools/registry";
import type { AgentEvent, InferenceState } from "./events";
import { processAssistantMessage } from "./process-assistant-message";
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
  scope?: string;
  feedback?: string;
}

// ─── Handoff 状态 ──────────────────────────────────────────

/**
 * Handoff state: tracks an in-progress or completed handoff.
 *
 * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:119
 *   `handoffState = new f0(void 0)`
 * 逆向: ov.js:1287-1340 — executeHandoff sets goal, then result
 */
export interface HandoffState {
  goal: string;
  result?: {
    newThreadID?: string;
    error?: string;
  };
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

  /**
   * Optional plugin service for agent lifecycle hooks.
   * If provided, agentStart/agentEnd events are emitted to plugins.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:808 (agentStart)
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:574,682,1005 (agentEnd)
   */
  pluginService?: PluginService;

  /**
   * Optional config observable for reactive settings change detection.
   * If provided along with permissionEngine, blocked tools are
   * re-evaluated when permissions/dangerouslyAllowAll settings change.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:33-39
   *   configService.config.pipe(JR, E9, DnR(1), M$).subscribe(() => reevaluateBlockedTools())
   */
  configObservable?: BehaviorSubject<Config>;

  /**
   * Optional permission engine for blocked tool re-evaluation.
   * Must be provided alongside configObservable for re-evaluation to work.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:41-50
   */
  permissionEngine?: PermissionEngine;
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
    (response: { accepted: boolean; scope?: string; feedback?: string }) => void
  >();

  /**
   * Handoff state: tracks in-progress or completed handoff.
   * 逆向: ov.js:119 `handoffState = new f0(void 0)`
   */
  handoffState: HandoffState | undefined = undefined;

  /**
   * Tracked file URIs — files referenced in tool results, file mentions, etc.
   * 逆向: ov.js:111 `trackedFiles = new Ls()`
   */
  readonly trackedFiles: Set<string> = new Set();

  /**
   * Snapshot OIDs from `git stash create` for auto-snapshot feature.
   * 逆向: ov.js:19-22 `isAutoSnapshotEnabled`, ov.js:338,357,408 snapshot OIDs
   */
  snapshotOIDs: string[] = [];

  /**
   * Pending skills to be injected on next user message.
   * Set externally (e.g., by system prompt / skill detection).
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:118
   *   `_pendingSkills = new f0([])`
   * 逆向: ov.js:120-122
   *   `pendingSkills = this._pendingSkills.pipe(E9(), f3({ shouldCountRefs: !0 }))`
   */
  private readonly _pendingSkills = new BehaviorSubject<SkillLike[]>([]);

  /**
   * Skills awaiting invocation: set after injectPendingSkills,
   * checked after assistant inference turn completes.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:123
   *   `_awaitingSkillInvocation = new f0([])`
   */
  private readonly _awaitingSkillInvocation = new BehaviorSubject<SkillLike[]>([]);

  /**
   * Turn timing: when the current turn started.
   * 逆向: ov.js:102 `_turnStartTime = new f0(void 0)`
   */
  private _turnStartTime: number | undefined = undefined;

  /**
   * Turn timing: elapsed milliseconds for the last completed turn.
   * 逆向: ov.js:103 `_turnElapsedMs = new f0(void 0)`
   */
  private _turnElapsedMs: number | undefined = undefined;

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
   * After truncation + file tracking, calls `toolOrchestrator.onResume()` to
   * handle in-progress tools from the previous session (re-invoke safe tools,
   * cancel dangerous ones, restore approval queue for blocked tools).
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
   * 逆向: ov.js:268-269
   *   ```
   *   if (this.trackFilesFromHistory(), this.triggerTitleGeneration(),
   *       !this.shouldResumeFromLastMessage(T)) return;
   *   await this.toolOrchestrator.onResume(), ...
   *   ```
   */
  async resume(): Promise<void> {
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

    // 逆向: ov.js:3-15 — trackFilesFromHistory is called on resume
    // to restore the tracked files set from the persisted thread history
    this.trackFilesFromHistory();

    // 逆向: ov.js:268-269 — shouldResumeFromLastMessage guard, then onResume
    // Check if we should resume tool execution based on last message state
    if (!this.shouldResumeFromLastMessage(lastMsg)) {
      this.inferenceState$.next("cancelled");
      return;
    }

    // Resume in-progress tools from the previous session
    // 逆向: ov.js:269 `await this.toolOrchestrator.onResume()`
    const currentSnapshot = this.opts.getThreadSnapshot();
    await this.opts.toolOrchestrator.onResume(currentSnapshot);

    // 逆向: ov.js:269 — setupSettingsChangeHandlers() called after onResume()
    this.setupPermissionsChangeHandler();
  }

  /**
   * Subscribe to config changes and re-evaluate blocked tools when
   * permissions or dangerouslyAllowAll settings change.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:33-39
   *   ```
   *   setupPermissionsChangeHandler() {
   *     this.deps.configService.config.pipe(
   *       JR(T => ({ permissions: I0T(T.settings?.permissions), dangerouslyAllowAll: ... })),
   *       E9((T, R) => T.dangerouslyAllowAll === R.dangerouslyAllowAll && T.permissions === R.permissions),
   *       DnR(1),
   *       M$(this.disposed$)
   *     ).subscribe(() => this.reevaluateBlockedTools())
   *   }
   *   ```
   */
  private setupPermissionsChangeHandler(): void {
    if (!this.opts.configObservable || !this.opts.permissionEngine) return;

    let lastKey: string | undefined;

    const sub = this.opts.configObservable.subscribe((config) => {
      if (this.disposed) return;

      const settings = config.settings as Record<string, unknown>;
      // Build a cheap change-detection key (amp uses I0T = JSON.stringify)
      const key =
        JSON.stringify(settings.permissions) + String(settings.dangerouslyAllowAll ?? false);

      // Skip first emission — DnR(1) equivalent
      if (lastKey === undefined) {
        lastKey = key;
        return;
      }
      // distinctUntilChanged — E9 equivalent
      if (key === lastKey) return;
      lastKey = key;

      // Re-evaluate blocked tools with current thread state
      const snapshot = this.opts.getThreadSnapshot();
      this.opts.permissionEngine!.reevaluateBlockedTools(snapshot, (toolUseID: string) => {
        // 逆向: ov.js:51-84 checkAndApproveBlockedTool — resolve the pending approval
        const resolve = this._pendingApprovals.get(toolUseID);
        if (resolve) {
          resolve({ accepted: true });
          this._pendingApprovals.delete(toolUseID);
        }
      });
    });

    this.subscriptions.push(sub);
  }

  /**
   * Check whether the last message state warrants resuming tool execution.
   *
   * Returns false (don't resume) if:
   * - Last assistant message was cancelled
   * - Last user message contains a cancelled tool_result
   * - Last user message contains a rejected-by-user tool_result
   * - Last message is an info/system message
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:272-275
   *   ```
   *   shouldResumeFromLastMessage(T) {
   *     if (NlR(T) || HlR(T) && !this.shouldContinueAfterRejection || NET(T))
   *       return this._inferenceState.next("cancelled"), !1;
   *     return !0;
   *   }
   *   ```
   * 逆向: NlR (1600_unknown_NlR.js:5-9) — isCancelledMessage
   * 逆向: HlR (1601_unknown_O0T.js:5-8) — isRejectedMessage
   * 逆向: NET (1601_unknown_O0T.js:10-13) — isInfoMessage
   */
  private shouldResumeFromLastMessage(msg: unknown): boolean {
    if (!msg) return true; // empty thread — nothing to resume, but not cancelled
    const m = msg as Record<string, unknown>;

    // NlR: isCancelledMessage
    if (m.role === "assistant") {
      const state = m.state as Record<string, unknown> | undefined;
      if (state?.type === "cancelled") return false;
    }
    if (m.role === "user") {
      const content = m.content as Array<Record<string, unknown>> | undefined;
      if (
        content?.some(
          (b) =>
            b.type === "tool_result" && (b.run as Record<string, unknown>)?.status === "cancelled",
        )
      ) {
        return false;
      }
    }

    // HlR: isRejectedMessage (no shouldContinueAfterRejection override — defaults to false)
    if (m.role === "user") {
      const content = m.content as Array<Record<string, unknown>> | undefined;
      if (
        content?.some(
          (b) =>
            b.type === "tool_result" &&
            (b.run as Record<string, unknown>)?.status === "rejected-by-user",
        )
      ) {
        return false;
      }
    }

    // NET: isInfoMessage
    if (m.role === "info") return false;

    return true;
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

    // Drain pending skills on user message
    // 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:348-351
    //   `e = this._pendingSkills.getValue(), e.length > 0 → _pendingSkills.next([])`
    //   Then at line 366: `if (e.length > 0) await this.injectPendingSkills(e, R)`
    const pendingSkills = this._pendingSkills.getValue();
    if (pendingSkills.length > 0) {
      this._pendingSkills.next([]);
    }

    if (toolsRunning) {
      // Buffer the message — will be dequeued on turn:complete
      this.messageQueue.push(message);
    } else {
      // New user message arriving: clear pending approvals + cancel in-progress tools.
      // 逆向: amp's doRunInferenceSetup → toolOrchestrator.onNewUserMessage()
      //   (modules/1244_ThreadWorker_ov.js:839)
      // Fire-and-forget since enqueueMessage is synchronous.
      void this.opts.toolOrchestrator.onNewUserMessage();
      // Process immediately: append to snapshot
      this.appendMessageToSnapshot(message);

      // Inject pending skills after the user message is appended
      // 逆向: ov.js:366 `if (e.length > 0) await this.injectPendingSkills(e, R)`
      if (pendingSkills.length > 0) {
        this.injectPendingSkills(pendingSkills);
      }
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

      // ─── Turn timing: record start time ────────────
      // 逆向: ov.js:406 `this._turnStartTime.next(Date.now())`
      this._turnStartTime = Date.now();
      this._turnElapsedMs = undefined;

      // ─── Plugin: agentStart ────────────────────────
      // 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:802-826
      //   `if (T?.agentStart) { ... await this.deps.pluginService.event.agentStart(...) }`
      // Fires once per user turn, before inference begins. If a plugin returns
      // message content, it is appended to the user message.
      if (this.opts.pluginService) {
        const snapshot = this.opts.getThreadSnapshot();
        const lastUserMsg = this._findLastUserMessage(snapshot);
        if (lastUserMsg) {
          try {
            const result = await this.opts.pluginService.onAgentStart({
              message: extractTextFromContent(
                lastUserMsg.content as Array<{ type: string; text?: string }>,
              ),
              id: ((lastUserMsg as Record<string, unknown>).messageId as number) ?? 0,
              thread: { id: snapshot.id },
            });
            // If plugin returned content to inject, append to user message
            if (result.message?.content) {
              this._appendContentToLastUserMessage(result.message.content);
            }
          } catch {
            // Swallow errors from plugin hooks — matches amp behavior
          }
        }
      }

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
      const resolvedModel = resolveModelName(config.settings);
      const streamParams: StreamParams = {
        model: resolvedModel,
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
        // ─── Plugin: agentEnd (interrupted) ───────
        // 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:574-579
        this._emitAgentEnd("interrupted");
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

      // ─── Step 6b: Post-process assistant message ───
      // 逆向: IbT (modules/1087) — trim + filter empty text/thinking blocks
      this.postProcessAssistantContent();

      // ─── Step 6c: Check awaited skill invocation (CORE-08) ───
      // 逆向: ov.js:630 `this.checkAndAppendAwaitedSkills()`
      // Called after inference completes, before checking tool_use.
      // If the model didn't call required skills, this injects synthetic
      // tool_use blocks and flips stopReason to force execution.
      this.checkAndAppendAwaitedSkills();

      // ─── Step 7: 检查 tool_use ─────────────────
      const toolUses = this.extractToolUses();

      if (toolUses.length > 0) {
        // 有 tool_use: 交给 ToolOrchestrator 执行
        await this.opts.toolOrchestrator.executeToolsWithPlan(toolUses);

        // 递归推理 (多轮)
        await this.runInference();
      } else {
        // ─── Turn timing: record elapsed ──────────
        // 逆向: ov.js:652-658
        //   `let i = this._turnStartTime.getValue();
        //    if (i !== void 0) { let c = Date.now() - i; this._turnElapsedMs.next(c); }`
        if (this._turnStartTime !== undefined) {
          this._turnElapsedMs = Date.now() - this._turnStartTime;
        }
        this._turnStartTime = undefined;

        // 无 tool_use: turn 完成
        this.events$.next({
          type: "turn:complete",
          turnElapsedMs: this._turnElapsedMs,
        } as AgentEvent);

        // ─── Plugin: agentEnd (done) ──────────────
        // 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:682-689
        //   `this.deps.pluginService.event.agentEnd({ ... status: "done" ... })`
        this._emitAgentEnd("done");

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
      // ─── Plugin: agentEnd (error) ─────────────
      // 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:1005-1013
      this._emitAgentEnd("error");
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
    // cancelAll() is now async (acquires processingMutex). Fire-and-forget here
    // because the AbortController abort above does the immediate interrupt work;
    // the mutex-guarded cleanup runs asynchronously afterward.
    void this.opts.toolOrchestrator.cancelAll("user:cancelled");
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
      resolve(
        response.approved
          ? { accepted: true, scope: response.scope }
          : { accepted: false, feedback: response.feedback },
      );
      this._pendingApprovals.delete(toolUseId);
    }
  }

  // ─── File Tracking (Gap #37) ──────────────────────────

  /**
   * Add file URIs to the tracked set.
   *
   * 逆向: ov.js:111 — `trackedFiles = new Ls()`
   *   ov.js callback: `trackFiles: T => this.trackFiles(T)`
   *   ov.js:4-15 trackFilesFromHistory scans messages
   */
  trackFiles(uris: string[]): void {
    for (const uri of uris) {
      if (uri) this.trackedFiles.add(uri);
    }
  }

  /**
   * Scan thread history for file paths in tool results and file mentions.
   *
   * 逆向: ov.js:3-15 trackFilesFromHistory()
   *   ```
   *   for (let T of this.thread.messages) {
   *     if (T.role === "user" && T.fileMentions?.files)
   *       this.trackFiles(T.fileMentions.files.map(R => R.uri).filter(R => R !== void 0));
   *     if (T.role === "user") {
   *       for (let R of T.content)
   *         if (R.type === "tool_result" && R.run?.status === "done")
   *           this.trackFiles(R.run.trackFiles ?? []);
   *     }
   *   }
   *   ```
   */
  trackFilesFromHistory(): void {
    const snapshot = this.opts.getThreadSnapshot();
    for (const msg of snapshot.messages) {
      const m = msg as Record<string, unknown>;
      if (m.role !== "user") continue;

      // File mentions
      const fileMentions = m.fileMentions as { files?: Array<{ uri?: string }> } | undefined;
      if (fileMentions?.files) {
        this.trackFiles(
          fileMentions.files.map((f) => f.uri).filter((u): u is string => u !== undefined),
        );
      }

      // Tool result trackFiles
      const content = m.content as Array<Record<string, unknown>> | undefined;
      if (content && Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "tool_result") {
            const run = block.run as Record<string, unknown> | undefined;
            if (run?.status === "done") {
              const trackFilesList = run.trackFiles as string[] | undefined;
              if (trackFilesList) this.trackFiles(trackFilesList);
            }
          }

          // Also extract file_path / path from tool_use input blocks
          // This covers the common pattern of Read/Write/Edit tool results
          if (block.type === "tool_result") {
            // Look for file_path in corresponding tool_use blocks
            const toolUseId = block.tool_use_id as string;
            if (toolUseId) {
              const toolUse = this.findToolUseInMessages(snapshot.messages, toolUseId);
              if (toolUse) {
                const input = toolUse.input as Record<string, unknown> | undefined;
                if (input) {
                  const filePath = (input.file_path ?? input.path) as string | undefined;
                  if (filePath) this.trackedFiles.add(filePath);
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Find a tool_use block by ID in messages. Helper for trackFilesFromHistory.
   */
  private findToolUseInMessages(
    messages: readonly Record<string, unknown>[],
    toolUseId: string,
  ): Record<string, unknown> | undefined {
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      const content = msg.content as Array<Record<string, unknown>> | undefined;
      if (!content || !Array.isArray(content)) continue;
      for (const block of content) {
        if (block.type === "tool_use" && block.id === toolUseId) return block;
      }
    }
    return undefined;
  }

  // ─── Auto-Snapshot / Git Stash (Gap #24) ──────────────

  /**
   * Create a git stash snapshot (git stash create) before tool execution.
   *
   * Returns the snapshot OID (empty string if stash had nothing to save).
   * Only runs if config.experimental?.autoSnapshot is truthy.
   *
   * 逆向: ov.js:19-22 `isAutoSnapshotEnabled()`
   * 逆向: ov.js:338,357,408 — snapshot creation and storage
   */
  async createAutoSnapshot(): Promise<string | null> {
    const config = this.opts.getConfig();
    const settings = config.settings as Record<string, unknown>;
    const autoSnapshot = settings["experimental.autoSnapshot"];
    if (!autoSnapshot) return null;

    try {
      const { execSync } = await import("node:child_process");
      const oid = execSync("git stash create", {
        encoding: "utf-8",
        timeout: 5000,
      }).trim();

      if (oid) {
        this.snapshotOIDs.push(oid);
        return oid;
      }
      return null;
    } catch {
      // git stash create can fail if not in a git repo — ignore
      return null;
    }
  }

  /**
   * Restore to a snapshot OID using git stash apply.
   *
   * 逆向: ov.js:22 `async restoreToSnapshot(T) {}`
   */
  async restoreToSnapshot(oid: string): Promise<boolean> {
    try {
      const { execSync } = await import("node:child_process");
      execSync(`git stash apply ${oid}`, {
        encoding: "utf-8",
        timeout: 10000,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Handoff (Gap #14) ────────────────────────────────

  /**
   * Execute a handoff: create a new thread with context from the current thread.
   *
   * 逆向: ov.js:1287-1340
   *   ```
   *   async executeHandoff(T) {
   *     this.handoffState.next({ goal: T });
   *     try {
   *       let { threadWorkerService: R } = await ...;
   *       let { threadID: e } = await R.handoff(this.deps, {
   *         threadID: this.threadID, goal: T, ... });
   *       this.handoffState.next({ goal: T, result: { newThreadID: e } });
   *     } catch (R) {
   *       this.handoffState.next({ goal: T, result: { error: ... } });
   *     }
   *   }
   *   ```
   *
   * Note: In Flitter, the actual ThreadWorkerService.handoff logic (which builds
   * a context summary and creates a new thread) is deferred — the caller must
   * provide a handoff executor. This method sets up the state and delegates.
   */
  async executeHandoff(
    goal: string,
    executor?: (goal: string, threadSnapshot: ThreadSnapshot) => Promise<string>,
  ): Promise<void> {
    this.handoffState = { goal };
    this.events$.next({ type: "turn:complete" });

    try {
      if (!executor) {
        // No executor provided — handoff is just a state marker
        this.handoffState = { goal, result: { error: "No handoff executor configured" } };
        return;
      }

      const snapshot = this.opts.getThreadSnapshot();
      const newThreadID = await executor(goal, snapshot);
      this.handoffState = { goal, result: { newThreadID } };
    } catch (err) {
      this.handoffState = {
        goal,
        result: { error: err instanceof Error ? err.message : String(err) },
      };
    }
  }

  // ─── Turn Timing (Gap #40) ────────────────────────────

  /**
   * Get the turn start time (ms since epoch).
   * 逆向: ov.js:1344 `getTurnStartTime()`
   */
  getTurnStartTime(): number | undefined {
    return this._turnStartTime;
  }

  /**
   * Get the elapsed time of the last completed turn.
   * 逆向: ov.js:103 `_turnElapsedMs`
   */
  getTurnElapsedMs(): number | undefined {
    return this._turnElapsedMs;
  }

  // ─── Skill Enforcement (CORE-08) ──────────────────────

  /**
   * Set pending skills to be injected on next user message.
   * Called externally when system prompt detects required skills.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:118
   *   `_pendingSkills = new f0([])`
   *   External code calls `_pendingSkills.next([...skills])` to queue.
   */
  setPendingSkills(skills: SkillLike[]): void {
    this._pendingSkills.next(skills);
  }

  /**
   * Get current pending skills (for observable/testing).
   */
  get pendingSkills(): readonly SkillLike[] {
    return this._pendingSkills.getValue();
  }

  // ─── Plugin Lifecycle Helpers ──────────────────────────

  /**
   * Record a successful skill tool activation into the thread's activatedSkills.
   * Deduplicates by skill name — each skill is recorded only once per thread.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:211-219
   *   ```
   *   onSkillToolComplete(T) {
   *     let R = T.input;
   *     this.thread = Lt(this.thread, a => {
   *       if (!a.activatedSkills) a.activatedSkills = [];
   *       if (!a.activatedSkills.some(e => e.name === R.name))
   *         a.activatedSkills.push({ name: R.name, arguments: R.arguments });
   *     });
   *   }
   *   ```
   *
   * Called from orchestrator's onSkillToolComplete callback when a tool named
   * "skill" completes with status "done".
   */
  onSkillToolComplete(toolUse: { input: Record<string, unknown> }): void {
    const skillName = toolUse.input.name as string;
    const skillArgs = toolUse.input.arguments as string | undefined;
    if (!skillName) return;

    const snapshot = this.opts.getThreadSnapshot();
    const existing = (snapshot as Record<string, unknown>).activatedSkills as
      | Array<{ name: string; arguments?: string }>
      | undefined;

    // Dedup: skip if already recorded
    if (existing?.some((s) => s.name === skillName)) return;

    const activated = [
      ...(existing ?? []),
      { name: skillName, ...(skillArgs !== undefined ? { arguments: skillArgs } : {}) },
    ];
    this.opts.updateThreadSnapshot({
      ...snapshot,
      activatedSkills: activated,
    } as ThreadSnapshot);
  }

  /**
   * Find the last user message in the thread snapshot.
   *
   * 逆向: amp uses `dt(R, "user")` — find last message with role "user"
   */
  private _findLastUserMessage(snapshot: ThreadSnapshot): Record<string, unknown> | undefined {
    const messages = snapshot.messages;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === "user") return messages[i] as Record<string, unknown>;
    }
    return undefined;
  }

  /**
   * Append text content to the last user message in the snapshot.
   * Used by agentStart plugin hook to inject plugin-provided content.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:814-821
   *   `this.updateThread({ type: "user:message:append-content", messageId: R, content: [{ type: "text", text: e.message.content }] })`
   */
  private _appendContentToLastUserMessage(text: string): void {
    const snapshot = this.opts.getThreadSnapshot();
    const messages = [...snapshot.messages];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === "user") {
        const msg = messages[i]!;
        const content = Array.isArray(msg.content) ? [...msg.content] : [];
        content.push({ type: "text", text } as never);
        messages[i] = { ...msg, content } as typeof msg;
        this.opts.updateThreadSnapshot({ ...snapshot, messages });
        return;
      }
    }
  }

  /**
   * Emit agentEnd event to the plugin service (fire-and-forget).
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:574-579, 682-689, 1005-1013
   *   Fire-and-forget `.then(l => this.handleAgentEndResult(l)).catch(...)`
   */
  private _emitAgentEnd(status: "done" | "interrupted" | "error"): void {
    if (!this.opts.pluginService) return;

    const snapshot = this.opts.getThreadSnapshot();
    const lastUserMsg = this._findLastUserMessage(snapshot);
    if (!lastUserMsg) return;

    const msgText = extractTextFromContent(
      lastUserMsg.content as Array<{ type: string; text?: string }>,
    );
    const msgId = (lastUserMsg.messageId as number) ?? 0;

    // Fire-and-forget — matches amp's `.then(...).catch(...)` pattern
    this.opts.pluginService
      .onAgentEnd({
        message: msgText,
        id: msgId,
        status,
        thread: { id: snapshot.id },
      })
      .then((result) => {
        // Handle "continue" action from plugin
        // 逆向: ov.js:734-748 handleAgentEndResult
        if (result.action === "continue" && result.userMessage) {
          this.enqueueMessage({
            role: "user",
            content: [{ type: "text", text: result.userMessage }],
          } as Message);
        }
      })
      .catch(() => {
        // Swallow errors — matches amp behavior
      });
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

  /**
   * Post-process the latest assistant message: trim + filter empty blocks.
   *
   * 逆向: IbT (modules/1087_ProcessAssistantMessage_IbT.js)
   *   Called after streaming completes, before checking tool_use blocks.
   */
  private postProcessAssistantContent(): void {
    const snapshot = this.opts.getThreadSnapshot();
    const messages = [...snapshot.messages];
    const last = messages[messages.length - 1];

    if (last && last.role === "assistant") {
      const content = (last as Message & { role: "assistant" }).content as AssistantContentBlock[];
      const processed = processAssistantMessage(content);
      (last as Message & { role: "assistant" }).content = processed;
      this.opts.updateThreadSnapshot({ ...snapshot, messages });
    }
  }

  // ─── Skill Enforcement Internals (CORE-08) ────────────

  /**
   * Drain pending skills and inject an info message telling the model
   * to call the skill tool. Sets `_awaitingSkillInvocation` so that
   * `checkAndAppendAwaitedSkills` can verify after inference.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:1249-1264
   *   ```
   *   async injectPendingSkills(T, R) {
   *     let a = T.map(e => e.name);
   *     this._awaitingSkillInvocation.next(T), this.thread = Lt(this.thread, e => {
   *       let t = e.nextMessageId ?? 0;
   *       e.nextMessageId = t + 1, e.messages.push({
   *         role: "info", messageId: t,
   *         content: [{ type: "text",
   *           text: `You MUST call the ${oc} tool to load: ${a.join(", ")}. Do this immediately before responding.`
   *         }]
   *       }), e.v++;
   *     });
   *   }
   *   ```
   */
  private injectPendingSkills(skills: SkillLike[]): void {
    if (skills.length === 0) return;

    const names = skills.map((s) => s.name);
    this._awaitingSkillInvocation.next(skills);

    const snapshot = this.opts.getThreadSnapshot();
    const nextId =
      ((snapshot as Record<string, unknown>).nextMessageId as number) ?? snapshot.messages.length;
    const infoMessage: Message = {
      role: "info",
      messageId: nextId,
      content: [
        {
          type: "text",
          text: `You MUST call the skill tool to load: ${names.join(", ")}. Do this immediately before responding.`,
        },
      ],
    } as Message;

    this.opts.updateThreadSnapshot({
      ...snapshot,
      messages: [...snapshot.messages, infoMessage] as ThreadSnapshot["messages"],
      nextMessageId: nextId + 1,
    } as ThreadSnapshot);
  }

  /**
   * After assistant inference completes, check whether the model actually
   * called the required skill tools. If not, inject synthetic `tool_use`
   * blocks and flip `stopReason` to `"tool_use"` to force execution.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:1266-1285
   *   ```
   *   checkAndAppendAwaitedSkills() {
   *     let T = this._awaitingSkillInvocation.getValue();
   *     if (T.length === 0) return;
   *     this._awaitingSkillInvocation.next([]);
   *     let { updatedThread, uninvoked } = YwR(this.thread, {
   *       toolName: oc,
   *       items: T,
   *       wasInvoked: (e, t) => e.some(r => r.name === oc && r.input.name === t.name),
   *       toToolInput: e => ({ name: e.name, arguments: e.arguments })
   *     });
   *     if (uninvoked.length > 0) this.thread = updatedThread;
   *   }
   *   ```
   *
   * 逆向: amp-cli-reversed/modules/1243_unknown_YwR.js — the synthetic injection function
   *   Finds the last assistant message, checks which items weren't invoked by the model,
   *   and for each: pushes a synthetic tool_use block + flips stopReason to "tool_use".
   */
  private checkAndAppendAwaitedSkills(): void {
    const awaited = this._awaitingSkillInvocation.getValue();
    if (awaited.length === 0) return;

    // Clear the awaited list
    this._awaitingSkillInvocation.next([]);

    const snapshot = this.opts.getThreadSnapshot();
    const messages = [...snapshot.messages];

    // Find last assistant message
    let lastAssistantIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === "assistant") {
        lastAssistantIdx = i;
        break;
      }
    }
    if (lastAssistantIdx === -1) return;

    const assistantMsg = messages[lastAssistantIdx]! as Record<string, unknown>;
    const content = (assistantMsg.content as Array<Record<string, unknown>>) ?? [];

    // Check which skills were invoked: filter tool_use blocks where name === "skill"
    const toolUseBlocks = content.filter((b) => b.type === "tool_use");
    const uninvoked = awaited.filter(
      (skill) =>
        !toolUseBlocks.some(
          (tu) =>
            (tu.name as string)?.toLowerCase() === "skill" &&
            (tu.input as Record<string, unknown>)?.name === skill.name,
        ),
    );

    if (uninvoked.length === 0) return;

    // Inject synthetic tool_use blocks for uninvoked skills
    // 逆向: YwR — push synthetic tool_use blocks, flip stopReason
    const updatedContent = [...content];
    for (const skill of uninvoked) {
      const syntheticId = `toolu_${crypto.randomUUID()}`;
      updatedContent.push({
        type: "tool_use",
        complete: true,
        id: syntheticId,
        name: "skill",
        input: {
          name: skill.name,
          ...(skill.body ? {} : {}),
        },
      });
    }

    // Flip stopReason from "end_turn" to "tool_use" to force the inference loop
    // to continue executing the synthetic tool_use blocks
    const state = assistantMsg.state as Record<string, unknown> | undefined;
    let updatedState = state;
    if (state?.type === "complete" && state.stopReason === "end_turn") {
      updatedState = { ...state, stopReason: "tool_use" };
    }

    // Update the assistant message in-place
    messages[lastAssistantIdx] = {
      ...assistantMsg,
      content: updatedContent,
      ...(updatedState !== state ? { state: updatedState } : {}),
    } as (typeof messages)[number];

    this.opts.updateThreadSnapshot({
      ...snapshot,
      messages: messages as ThreadSnapshot["messages"],
    });
  }
}
