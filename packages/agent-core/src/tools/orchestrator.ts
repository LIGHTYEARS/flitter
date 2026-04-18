/**
 * @flitter/agent-core — 工具执行引擎: 资源冲突检测、依赖分批、ToolOrchestrator
 *
 * 逆向: FWT (ToolOrchestrator), wwR (batchToolsByDependency), MwR (hasResourceConflict)
 *
 * @example
 * ```ts
 * import { ToolOrchestrator, batchToolsByDependency } from '@flitter/agent-core';
 * const orch = new ToolOrchestrator(threadId, registry, callbacks);
 * await orch.executeToolsWithPlan(toolUses);
 * ```
 */

import type { Config } from "@flitter/schemas";
import type { Observable } from "@flitter/util";
import type { AgentEvent } from "../worker/events";
import type { ToolRegistry } from "./registry";
import type { ToolContext, ToolResult } from "./types";

// ─── ToolUse 类型 ──────────────────────────────────────────

/** 从 ToolUseBlock 中提取 orchestrator 需要的字段 */
export interface ToolUseItem {
  /** tool_use block 的 ID */
  id: string;
  /** 工具名 */
  name: string;
  /** 工具参数 */
  input: Record<string, unknown>;
}

// ─── 事件类型 ──────────────────────────────────────────────

export interface ToolThreadEvent {
  type: "tool:data";
  toolUseId: string;
  toolName: string;
  status: "in-progress" | "completed" | "error" | "cancelled";
  result?: ToolResult;
  error?: string;
}

export interface ToolDataEvent {
  type: "tool:data";
  toolUseId: string;
  data: ToolResult;
}

export interface HookResult {
  type: "pre" | "post";
  toolName: string;
  toolUseId: string;
  decision?: "allow" | "deny" | "ask";
  modifications?: Record<string, unknown>;
}

// ─── OrchestratorCallbacks ─────────────────────────────────

/**
 * ToolOrchestrator 回调接口
 * 由上层 (ThreadWorker) 实现, 传入 Orchestrator 用于通信
 */
export interface OrchestratorCallbacks {
  /** 获取当前运行时配置 */
  getConfig(): Promise<Config>;

  /** 更新线程状态 (向上层发送 tool:data 事件) */
  updateThread(event: ToolThreadEvent): Promise<void>;

  /** 获取工具运行环境 (创建 ToolContext) */
  getToolRunEnvironment(toolUseId: string, signal: AbortSignal): Promise<ToolContext>;

  /** 执行 pre-hook 并返回结果 */
  applyHookResult(hookResult: HookResult): Promise<{ abortOp: boolean }>;

  /** 执行 post-hook */
  applyPostHookResult(
    hookResult: HookResult,
    opts: { toolUseId: string; result: ToolResult },
  ): Promise<void>;

  /** 更新文件变更追踪 */
  updateFileChanges(): Promise<void>;

  /** 获取 disposed 信号 */
  getDisposed$(): Observable<boolean>;

  /**
   * Emit tool lifecycle events (tool:start, tool:complete) to the TUI layer.
   * 逆向: FWT uses callbacks.updateThread with status "in-progress"/"done".
   * Flitter adds explicit AgentEvent types for clearer TUI separation.
   */
  onToolEvent?: (event: AgentEvent) => void;

  /**
   * Check if a tool invocation is permitted by the permission engine.
   * 逆向: amp's toolService.invokeTool calls PLT() (permission check) before
   * executing. Returns { permitted, action, reason } where action is "ask"
   * (prompt user), "reject" (silently deny), or "delegate" (allow).
   */
  checkPermission?: (
    toolName: string,
    args: Record<string, unknown>,
  ) => {
    permitted: boolean;
    action?: "reject" | "ask" | "delegate";
    reason?: string;
  };

  /**
   * Request user approval for a tool invocation. Returns a Promise that
   * resolves when the user accepts or rejects.
   *
   * 逆向: amp's toolService stores a Promise resolver in a Map keyed by
   * toolUseId (`r.set(o.toolUseId, {resolve, reject})`), then pushes the
   * request onto pendingApprovals$ BehaviorSubject. The FWT.syncPendingApprovalsToThreadState
   * method forwards these to the thread state for TUI rendering.
   * resolveApproval() looks up the resolver and settles the Promise.
   *
   * Flitter simplifies: the orchestrator creates the Promise bridge via this
   * callback, and ThreadWorker._pendingApprovals stores the resolvers.
   */
  requestApproval?: (request: {
    toolUseId: string;
    toolName: string;
    args: Record<string, unknown>;
    reason: string;
  }) => Promise<{ accepted: boolean; feedback?: string }>;
}

// ─── 资源冲突检测 ──────────────────────────────────────────

/**
 * 检测两个工具调用是否存在资源冲突
 * 逆向: MwR
 *
 * 冲突条件 (任一满足即冲突):
 * 1. 任一工具的 executionProfile.serial === true
 * 2. 两工具共享资源键 (key 相同) 且至少一方 mode === "write"
 *
 * @returns true 表示有冲突, 不能并行
 */
export function hasResourceConflict(
  a: ToolUseItem,
  b: ToolUseItem,
  registry: ToolRegistry,
): boolean {
  const specA = registry.get(a.name);
  const specB = registry.get(b.name);

  // 任一工具 serial → 冲突
  if (specA?.executionProfile?.serial || specB?.executionProfile?.serial) {
    return true;
  }

  // 获取资源键
  const keysA = specA?.executionProfile?.resourceKeys;
  const keysB = specB?.executionProfile?.resourceKeys;

  // 无资源键 → 无冲突
  if (!keysA || !keysB || keysA.length === 0 || keysB.length === 0) {
    return false;
  }

  // 检查共享资源键
  for (const ka of keysA) {
    for (const kb of keysB) {
      if (ka.key === kb.key) {
        // 同 key, 至少一方 write → 冲突
        if (ka.mode === "write" || kb.mode === "write") {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * 将 tool_use 列表按依赖关系分组为批次
 * 逆向: wwR
 *
 * 算法: 贪心
 * - 遍历每个 toolUse
 * - 尝试加入最后一个批次
 * - 如果与该批次中任一工具冲突, 则创建新批次
 *
 * @returns ToolUseItem[][] — 批次数组, 每个批次是可并行的工具数组
 */
export function batchToolsByDependency(
  toolUses: ToolUseItem[],
  registry: ToolRegistry,
): ToolUseItem[][] {
  if (toolUses.length === 0) return [];

  const batches: ToolUseItem[][] = [[]];

  for (const toolUse of toolUses) {
    const lastBatch = batches[batches.length - 1];
    let conflict = false;

    for (const existing of lastBatch) {
      if (hasResourceConflict(toolUse, existing, registry)) {
        conflict = true;
        break;
      }
    }

    if (conflict) {
      batches.push([toolUse]);
    } else {
      lastBatch.push(toolUse);
    }
  }

  return batches;
}

// ─── 超时常量 ──────────────────────────────────────────────

/**
 * 默认工具执行超时: 2 分钟
 * 逆向: amp uses network.timeout setting (chunk-001.js:4145) and
 * MCP protocol timeout (chunk-001.js:10478). Flitter default matches amp's
 * default 120s MCP request timeout.
 */
const DEFAULT_TOOL_TIMEOUT_MS = 120_000;

// ─── ToolOrchestrator ──────────────────────────────────────

/**
 * ToolOrchestrator: 工具批处理执行引擎
 * 逆向: FWT
 *
 * 职责:
 * 1. 将一组 tool_use 分批 (batchToolsByDependency)
 * 2. 顺序执行每个批次
 * 3. 批内使用 Promise.allSettled 并行执行
 * 4. 管理运行中工具的 AbortController
 * 5. 支持单个工具取消和全部取消
 * 6. 每个工具执行有超时 (executionProfile.timeoutMs 或 DEFAULT_TOOL_TIMEOUT_MS)
 */
export class ToolOrchestrator {
  /** 活跃工具追踪: toolUseId → { abort: AbortController } */
  readonly runningTools: Map<string, { abort: AbortController }> = new Map();

  /** 已取消的工具 ID 集合 */
  readonly cancelledToolUses: Set<string> = new Set();

  private disposed = false;

  constructor(
    readonly _threadId: string,
    private readonly toolRegistry: ToolRegistry,
    private readonly callbacks: OrchestratorCallbacks,
  ) {}

  /**
   * 主入口: 执行一组 tool_use
   * 1. batchToolsByDependency 分批
   * 2. for 循环顺序执行每个批次
   * 3. 每个批次: Promise.allSettled(batch.map(t => invokeToolAndWait(t)))
   */
  async executeToolsWithPlan(toolUses: ToolUseItem[]): Promise<void> {
    if (toolUses.length === 0) return;

    const batches = batchToolsByDependency(toolUses, this.toolRegistry);

    for (const batch of batches) {
      if (this.disposed) break;
      await Promise.allSettled(batch.map((toolUse) => this.invokeToolAndWait(toolUse)));
    }
  }

  /**
   * 执行单个工具并等待完成
   */
  private async invokeToolAndWait(toolUse: ToolUseItem): Promise<void> {
    await this.invokeTool(toolUse);
  }

  /**
   * 核心工具执行流程
   * 逆向: FWT 中的工具执行循环
   *
   * 流程:
   * 1. 检查是否已取消 → 如果是, 直接返回
   * 2. applyHookResult (pre-hook) → 如果 abortOp, 中止
   * 3. 创建 AbortController, 注册到 runningTools
   * 4. callbacks.updateThread({ status: "in-progress" })
   * 5. registry.get(toolName) → 获取 ToolSpec
   * 6. callbacks.getToolRunEnvironment(toolUseId, signal) → 获取 ToolContext
   * 7. spec.execute(args, context) → 获取 ToolResult
   * 8. applyPostHookResult (post-hook)
   * 9. callbacks.updateThread({ status: "completed", result })
   * 10. callbacks.updateFileChanges()
   * 11. 从 runningTools 移除
   */
  private async invokeTool(toolUse: ToolUseItem): Promise<void> {
    // 1. 检查是否已取消
    if (this.cancelledToolUses.has(toolUse.id)) {
      await this.callbacks.updateThread({
        type: "tool:data",
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        status: "cancelled",
      });
      return;
    }

    // 2. Pre-hook
    const preHook: HookResult = {
      type: "pre",
      toolName: toolUse.name,
      toolUseId: toolUse.id,
    };
    const { abortOp } = await this.callbacks.applyHookResult(preHook);
    if (abortOp) {
      await this.callbacks.updateThread({
        type: "tool:data",
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        status: "cancelled",
      });
      return;
    }

    // 3. 创建 AbortController + 注册
    const abortController = new AbortController();
    this.runningTools.set(toolUse.id, { abort: abortController });

    // Per-tool timeout tracking (populated after spec is fetched)
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    // Store the timeout error so we can detect it in the catch block
    let timeoutError: Error | undefined;

    // 逆向: FWT emits updateThread({ status: "in-progress" }) here.
    // Flitter additionally emits a separate tool:start AgentEvent for the TUI layer.
    this.callbacks.onToolEvent?.({
      type: "tool:start",
      toolUseId: toolUse.id,
      toolName: toolUse.name,
    });

    // ─── Permission check ───────────────────────────────
    // 逆向: amp's toolService.invokeTool calls PLT() (permission check) before
    // execution. If not permitted and action === "ask", it calls requestApproval()
    // which creates a Promise that blocks until the user responds. If the user
    // rejects, the tool emits "rejected-by-user" status. If action === "reject",
    // the tool is silently denied.
    if (this.callbacks.checkPermission) {
      const permResult = this.callbacks.checkPermission(toolUse.name, toolUse.input);
      if (!permResult.permitted) {
        if (permResult.action === "ask" && this.callbacks.requestApproval) {
          const response = await this.callbacks.requestApproval({
            toolUseId: toolUse.id,
            toolName: toolUse.name,
            args: toolUse.input,
            reason: permResult.reason ?? "Requires user approval",
          });
          if (!response.accepted) {
            // 逆向: amp emits "rejected-by-user" or "error" (if feedback) then resolves
            // the tool completion. Flitter signals rejection via updateThread + tool:complete.
            await this.callbacks.updateThread({
              type: "tool:data",
              toolUseId: toolUse.id,
              toolName: toolUse.name,
              status: "cancelled",
            });
            this.runningTools.delete(toolUse.id);
            this.callbacks.onToolEvent?.({
              type: "tool:complete",
              toolUseId: toolUse.id,
            });
            return;
          }
          // User approved — fall through to execute the tool
        } else if (permResult.action === "reject") {
          await this.callbacks.updateThread({
            type: "tool:data",
            toolUseId: toolUse.id,
            toolName: toolUse.name,
            status: "cancelled",
          });
          this.runningTools.delete(toolUse.id);
          this.callbacks.onToolEvent?.({
            type: "tool:complete",
            toolUseId: toolUse.id,
          });
          return;
        }
        // action === "delegate" or undefined — treat as permitted, fall through
      }
    }

    try {
      // 4. 通知 in-progress
      await this.callbacks.updateThread({
        type: "tool:data",
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        status: "in-progress",
      });

      // 5. 获取 ToolSpec
      const spec = this.toolRegistry.get(toolUse.name);
      if (!spec) {
        const errorResult: ToolResult = {
          status: "error",
          error: `Tool "${toolUse.name}" not found`,
        };
        await this.callbacks.updateThread({
          type: "tool:data",
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          status: "error",
          error: errorResult.error,
          result: errorResult,
        });
        return;
      }

      // Set up per-tool timeout.
      // 逆向: amp uses AbortController pattern (chunk-001.js:4370) and
      // MCP protocol _setupTimeout/_clearTimeout (chunk-001.js:10478-10499).
      // Flitter adds orchestrator-level enforcement: if the tool doesn't finish
      // within timeoutMs, we abort the AbortController and let the catch block
      // emit an error result.
      const timeoutMs = spec.executionProfile?.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
      timeoutError = new Error(`Tool "${toolUse.name}" execution timeout after ${timeoutMs}ms`);
      timeoutId = setTimeout(() => {
        abortController.abort(timeoutError);
      }, timeoutMs);

      // 6. 获取 ToolContext
      const context = await this.callbacks.getToolRunEnvironment(
        toolUse.id,
        abortController.signal,
      );

      // 7. 执行工具 — race tool execution against the per-tool AbortController.
      // When the timeout fires (or cancelTool/cancelAll is called), the
      // abortController.abort() triggers the race to reject early.
      //
      // 逆向: amp passes AbortSignal to tools (chunk-001.js:4370); tools that
      // honour the signal will self-cancel. Flitter adds a hard outer race so
      // that tools which ignore the signal are still terminated.
      let result: ToolResult;
      const abortPromise = new Promise<never>((_, reject) => {
        const signal = abortController.signal;
        if (signal.aborted) {
          reject(signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason)));
          return;
        }
        const handler = () => {
          reject(signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason)));
        };
        signal.addEventListener("abort", handler, { once: true });
      });
      const execResult = spec.execute(toolUse.input, context);

      if (isObservable(execResult)) {
        // Observable → race against abort
        result = await Promise.race([observableToPromise(execResult), abortPromise]);
      } else {
        result = await Promise.race([execResult, abortPromise]);
      }

      // 如果已被取消, 标记取消
      if (this.cancelledToolUses.has(toolUse.id)) {
        await this.callbacks.updateThread({
          type: "tool:data",
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          status: "cancelled",
        });
        return;
      }

      // 8. Post-hook
      const postHook: HookResult = {
        type: "post",
        toolName: toolUse.name,
        toolUseId: toolUse.id,
      };
      await this.callbacks.applyPostHookResult(postHook, {
        toolUseId: toolUse.id,
        result,
      });

      // 9. 通知 completed
      await this.callbacks.updateThread({
        type: "tool:data",
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        status: "completed",
        result,
      });

      // 10. 更新文件变更
      await this.callbacks.updateFileChanges();
    } catch (err) {
      // 错误处理: 包装为 ToolResult
      // If aborted due to timeout, use the timeout error message.
      // 逆向: amp's MCP timeout throws a RequestTimeout error with a structured message
      // (chunk-001.js:10491). Flitter uses a plain error string for simplicity.
      const isTimeout =
        abortController.signal.aborted &&
        timeoutError !== undefined &&
        (abortController.signal.reason === timeoutError || err === timeoutError);
      const errorMessage = isTimeout
        ? timeoutError!.message
        : err instanceof Error
          ? err.message
          : String(err);
      const errorResult: ToolResult = {
        status: "error",
        error: errorMessage,
      };
      await this.callbacks.updateThread({
        type: "tool:data",
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        status: "error",
        error: errorMessage,
        result: errorResult,
      });
    } finally {
      // Clear the per-tool timeout to avoid dangling timers.
      // 逆向: amp's MCP _cleanupTimeout clears and deletes from _timeoutInfo map
      // (chunk-001.js:10498-10499). Flitter uses a simple clearTimeout.
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      // 11. 清理 runningTools
      this.runningTools.delete(toolUse.id);

      // Emit tool:complete regardless of success or error (try/finally guarantees this).
      // 逆向: FWT resolves the toolCompletionResolvers in the terminal-status handler.
      // Flitter emits a separate tool:complete AgentEvent for the TUI layer.
      this.callbacks.onToolEvent?.({
        type: "tool:complete",
        toolUseId: toolUse.id,
      });
    }
  }

  /** 取消所有运行中的工具 */
  cancelAll(): void {
    for (const [id, { abort }] of this.runningTools) {
      abort.abort();
      this.cancelledToolUses.add(id);
    }
  }

  /** 取消特定工具 */
  cancelTool(toolUseId: string): void {
    const entry = this.runningTools.get(toolUseId);
    if (entry) {
      entry.abort.abort();
      this.cancelledToolUses.add(toolUseId);
    }
  }

  /** 是否有工具正在运行 */
  hasRunningTools(): boolean {
    return this.runningTools.size > 0;
  }

  /** 销毁: 取消所有 + 清理 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelAll();
    this.runningTools.clear();
    this.cancelledToolUses.clear();
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────

/** 检测值是否为 Observable */
function isObservable(value: unknown): value is Observable<unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    "subscribe" in value &&
    typeof (value as Record<string, unknown>).subscribe === "function"
  );
}

/** 将 Observable 转为 Promise，取最后一个 next 值 */
function observableToPromise<T>(obs: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let lastValue: T | undefined;
    let hasValue = false;
    obs.subscribe({
      next(value) {
        lastValue = value;
        hasValue = true;
      },
      error(err) {
        reject(err);
      },
      complete() {
        if (hasValue) {
          resolve(lastValue!);
        } else {
          reject(new Error("Observable completed without emitting a value"));
        }
      },
    });
  });
}
