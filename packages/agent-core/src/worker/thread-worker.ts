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
import type {
  LLMProvider,
  StreamParams,
  StreamDelta,
  SystemPromptBlock,
  ToolDefinition,
} from "@flitter/llm";
import type { Config, Settings, Message, ThreadSnapshot } from "@flitter/schemas";
import { BehaviorSubject, Subject } from "@flitter/util";
import type { Subscription } from "@flitter/util";
import type { ToolOrchestrator, ToolUseItem } from "../tools/orchestrator";
import type { ToolRegistry } from "../tools/registry";
import type { AgentEvent, InferenceState } from "./events";

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
              inputTokens: (lastDelta.usage as Record<string, number>).inputTokens ?? 0,
              outputTokens: (lastDelta.usage as Record<string, number>).outputTokens ?? 0,
            }
          : undefined,
      });

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
      this.inferenceState$.next("idle");
      this.events$.next({
        type: "inference:error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
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
   * 逆向: ov.retry (~2690-2710)
   */
  async retry(): Promise<void> {
    const currentState = this.inferenceState$.getValue();
    if (currentState === "cancelled") {
      this.inferenceState$.next("idle");
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
   */
  async userRespondToApproval(
    toolUseId: string,
    response: ToolApprovalResponse,
  ): Promise<void> {
    void toolUseId;
    void response;
    // Placeholder — requires PermissionEngine approval flow integration
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
      (last as any).content = content;
    } else {
      // 追加新 assistant 消息
      messages.push({
        role: "assistant",
        content: content as any,
        messageId: snapshot.nextMessageId ?? messages.length,
        state: { type: "streaming" },
      } as any);
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
