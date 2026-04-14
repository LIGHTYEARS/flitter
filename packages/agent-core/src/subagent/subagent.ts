/**
 * SubAgentManager: 子代理生命周期管理
 * 逆向: skills-agents-system.js ~2800-3200
 *
 * 职责:
 * 1. spawn() 创建子代理: 创建子线程 → ThreadWorker → 推理循环 → 返回结果
 * 2. cancel() / cancelAll() 取消子代理
 * 3. activeAgents$ 追踪运行中子代理状态
 * 4. dispose() 清理所有资源
 *
 * 核心设计 (KD-36):
 * - 子代理共享 ThreadStore 但拥有独立 ToolOrchestrator
 * - 权限上下文为 "subagent" (可能有更严格的限制)
 * - 深度限制 = 1 (createWorker 回调不注入 SubAgentManager, 子代理无法 spawn)
 * - 超时可取消
 */

import type { PermissionContext, ThreadSnapshot } from "@flitter/schemas";
import { BehaviorSubject } from "@flitter/util";
import type { ThreadWorker } from "../worker/thread-worker";

// ─── 子代理选项 ─────────────────────────────────────────

/**
 * 创建子代理的选项
 */
export interface SubAgentOptions {
  /** 父线程 ID */
  parentThreadId: string;
  /** 任务描述 (3-5 word summary) */
  description: string;
  /** 任务提示词 (详细指令) */
  prompt: string;
  /** 子代理类型 (决定可用工具集和能力范围) */
  type: string;
  /** 模型覆盖 (不指定时使用父线程配置) */
  model?: string;
  /** 最大推理轮次 (防止无限循环) */
  maxTurns?: number;
  /** 超时时间 (ms) */
  timeout?: number;
}

// ─── 子代理结果 ─────────────────────────────────────────

/**
 * 子代理执行结果
 */
export interface SubAgentResult {
  /** 子代理线程 ID */
  threadId: string;
  /** 最终响应文本 (从最后一条 assistant 消息提取) */
  response: string;
  /** 完成状态 */
  status: "completed" | "timeout" | "cancelled" | "error";
  /** 错误信息 (status 为 "error" 时) */
  error?: string;
}

// ─── 子代理状态信息 ─────────────────────────────────────

/**
 * 运行中子代理的状态信息
 * 用于 activeAgents$ 追踪
 */
export interface SubAgentInfo {
  /** 子代理线程 ID */
  threadId: string;
  /** 父线程 ID */
  parentThreadId: string;
  /** 任务描述 */
  description: string;
  /** 子代理类型 */
  type: string;
  /** 当前状态 */
  status: "running" | "completed" | "cancelled" | "timeout" | "error";
  /** 启动时间 (Date.now()) */
  startTime: number;
}

// ─── ThreadWorker 创建选项 ──────────────────────────────

/**
 * 创建子代理 ThreadWorker 的选项
 * 由 SubAgentManager 的 createWorker 回调使用
 */
export interface SubAgentWorkerOptions {
  /** 子代理线程 ID */
  threadId: string;
  /** 父线程 ID */
  parentThreadId: string;
  /** 子代理类型 */
  type: string;
  /** 模型覆盖 */
  model?: string;
  /** 权限上下文 (子代理固定为 "subagent") */
  permissionContext: PermissionContext;
}

// ─── SubAgentManager 选项 ───────────────────────────────

/**
 * SubAgentManager 依赖注入接口
 *
 * 使用回调方式注入依赖, 避免直接耦合具体服务类
 * (ThreadStore 没有 createChildThread/addMessage, 需要回调适配)
 */
export interface SubAgentManagerOptions {
  /** 创建子代理 ThreadWorker 的工厂回调 */
  createWorker: (opts: SubAgentWorkerOptions) => ThreadWorker;
  /** 创建子线程回调: 返回新线程 ID */
  createChildThread: (parentThreadId: string) => string;
  /** 添加消息到子线程回调 */
  addMessage: (
    threadId: string,
    message: { role: string; content: Array<{ type: string; text: string }> },
  ) => void;
  /** 获取线程快照回调 */
  getThreadSnapshot: (threadId: string) => ThreadSnapshot | undefined;
}

// ─── 默认值 ─────────────────────────────────────────────

const DEFAULT_MAX_TURNS = 20;
const DEFAULT_TIMEOUT = 300_000; // 5 分钟

// ─── SubAgentManager 类 ────────────────────────────────

/**
 * 子代理管理器: 管理子代理的生命周期
 * 逆向: skills-agents-system.js ~2800-3200
 *
 * Spawn 流程:
 * 1. 通过 createChildThread 回调创建子线程 (关联父线程)
 * 2. 通过 createWorker 回调创建 ThreadWorker
 *    - 独立 ToolOrchestrator
 *    - permissionContext: "subagent"
 * 3. 通过 addMessage 回调添加初始 user 消息 (prompt)
 * 4. 运行推理循环 (受 maxTurns 限制)
 * 5. 完成: 从最后一条 assistant 消息提取响应
 * 6. 超时: 取消推理, 返回 timeout 状态
 * 7. 返回 SubAgentResult
 */
export class SubAgentManager {
  /** 活跃子代理追踪 (BehaviorSubject) */
  readonly activeAgents$: BehaviorSubject<Map<string, SubAgentInfo>>;

  private readonly opts: SubAgentManagerOptions;
  private readonly runningWorkers: Map<string, { worker: ThreadWorker; abort: AbortController }> =
    new Map();
  private disposed = false;

  constructor(opts: SubAgentManagerOptions) {
    this.opts = opts;
    this.activeAgents$ = new BehaviorSubject<Map<string, SubAgentInfo>>(new Map());
  }

  // ─── 公共方法 ──────────────────────────────────────

  /**
   * 创建并运行子代理
   *
   * @param spawnOpts - 子代理选项
   * @returns SubAgentResult
   */
  async spawn(spawnOpts: SubAgentOptions): Promise<SubAgentResult> {
    if (this.disposed) {
      return {
        threadId: "",
        response: "",
        status: "error",
        error: "SubAgentManager is disposed",
      };
    }

    // ─── Step 1: 创建子线程 ───────────────────────
    const threadId = this.opts.createChildThread(spawnOpts.parentThreadId);

    // ─── Step 2: 注册到 activeAgents$ ─────────────
    const info: SubAgentInfo = {
      threadId,
      parentThreadId: spawnOpts.parentThreadId,
      description: spawnOpts.description,
      type: spawnOpts.type,
      status: "running",
      startTime: Date.now(),
    };
    this.updateActiveAgent(threadId, info);

    // ─── Step 3: 创建 ThreadWorker ────────────────
    const worker = this.opts.createWorker({
      threadId,
      parentThreadId: spawnOpts.parentThreadId,
      type: spawnOpts.type,
      model: spawnOpts.model,
      permissionContext: "subagent",
    });

    const abortController = new AbortController();
    this.runningWorkers.set(threadId, { worker, abort: abortController });

    // ─── Step 4: 添加初始 user 消息 ──────────────
    this.opts.addMessage(threadId, {
      role: "user",
      content: [{ type: "text", text: spawnOpts.prompt }],
    });

    // ─── Step 5: 设置超时 ─────────────────────────
    const timeout = spawnOpts.timeout ?? DEFAULT_TIMEOUT;
    const maxTurns = spawnOpts.maxTurns ?? DEFAULT_MAX_TURNS;

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;

    const timeoutPromise = new Promise<void>((resolve) => {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        worker.cancelInference();
        resolve();
      }, timeout);
    });

    // ─── Step 6: 运行推理循环 ─────────────────────
    try {
      let turn = 0;

      // 推理循环: 运行直到完成、超时、或达到 maxTurns
      const inferenceLoop = async (): Promise<void> => {
        while (turn < maxTurns && !timedOut && !abortController.signal.aborted) {
          turn++;
          await worker.runInference();

          // ThreadWorker.runInference 已经处理了递归推理
          // 这里只需要检查推理状态
          const state = worker.inferenceState$.getValue();
          if (state === "idle" || state === "cancelled") {
            break;
          }
        }
      };

      // 竞争: 推理循环 vs 超时
      await Promise.race([inferenceLoop(), timeoutPromise]);

      if (timeoutHandle) clearTimeout(timeoutHandle);

      // ─── Step 7: 确定结果 ─────────────────────
      if (timedOut) {
        this.updateActiveAgent(threadId, { ...info, status: "timeout" });
        this.cleanup(threadId);
        return {
          threadId,
          response: "",
          status: "timeout",
        };
      }

      if (abortController.signal.aborted) {
        this.updateActiveAgent(threadId, { ...info, status: "cancelled" });
        this.cleanup(threadId);
        return {
          threadId,
          response: "",
          status: "cancelled",
        };
      }

      // 提取最终响应
      const response = this.extractResponse(threadId);
      this.updateActiveAgent(threadId, { ...info, status: "completed" });
      this.cleanup(threadId);

      return {
        threadId,
        response,
        status: "completed",
      };
    } catch (error) {
      if (timeoutHandle) clearTimeout(timeoutHandle);

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateActiveAgent(threadId, { ...info, status: "error" });
      this.cleanup(threadId);

      return {
        threadId,
        response: "",
        status: "error",
        error: errorMessage,
      };
    }
  }

  /**
   * 取消指定子代理
   */
  cancel(threadId: string): void {
    const entry = this.runningWorkers.get(threadId);
    if (!entry) return;

    entry.abort.abort();
    entry.worker.cancelInference();

    const agents = this.activeAgents$.getValue();
    const agentInfo = agents.get(threadId);
    if (agentInfo) {
      this.updateActiveAgent(threadId, { ...agentInfo, status: "cancelled" });
    }

    this.cleanup(threadId);
  }

  /**
   * 取消所有运行中的子代理
   */
  cancelAll(): void {
    for (const threadId of [...this.runningWorkers.keys()]) {
      this.cancel(threadId);
    }
  }

  /**
   * 销毁管理器, 释放所有资源
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelAll();
  }

  // ─── 内部方法 ──────────────────────────────────────

  /**
   * 从子线程的最后一条 assistant 消息提取响应文本
   */
  private extractResponse(threadId: string): string {
    const snapshot = this.opts.getThreadSnapshot(threadId);
    if (!snapshot) return "";

    const messages = snapshot.messages;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        // 提取所有 text 块的内容
        const textParts: string[] = [];
        const content = msg.content as Array<Record<string, unknown>>;
        for (const block of content) {
          if (block.type === "text") {
            textParts.push(block.text as string);
          }
        }
        return textParts.join("");
      }
    }

    return "";
  }

  /**
   * 更新 activeAgents$ 中的子代理信息
   */
  private updateActiveAgent(threadId: string, info: SubAgentInfo): void {
    const current = this.activeAgents$.getValue();
    const updated = new Map(current);
    updated.set(threadId, info);
    this.activeAgents$.next(updated);
  }

  /**
   * 清理完成/取消的子代理
   */
  private cleanup(threadId: string): void {
    const entry = this.runningWorkers.get(threadId);
    if (entry) {
      entry.worker.dispose();
      this.runningWorkers.delete(threadId);
    }
  }
}
