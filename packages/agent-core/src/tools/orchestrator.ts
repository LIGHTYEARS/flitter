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
import type { ToolSpec, ToolResult, ToolContext } from "./types";
import type { ToolRegistry } from "./registry";
import type { Config, Settings } from "@flitter/schemas";
import type { Observable } from "@flitter/util";

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
 */
export class ToolOrchestrator {
  /** 活跃工具追踪: toolUseId → { abort: AbortController } */
  readonly runningTools: Map<string, { abort: AbortController }> = new Map();

  /** 已取消的工具 ID 集合 */
  readonly cancelledToolUses: Set<string> = new Set();

  private disposed = false;

  constructor(
    private readonly threadId: string,
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
      await Promise.allSettled(
        batch.map((toolUse) => this.invokeToolAndWait(toolUse)),
      );
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

      // 6. 获取 ToolContext
      const context = await this.callbacks.getToolRunEnvironment(
        toolUse.id,
        abortController.signal,
      );

      // 7. 执行工具
      let result: ToolResult;
      const execResult = spec.execute(toolUse.input, context);

      if (isObservable(execResult)) {
        // Observable → 收集最终结果
        result = await observableToPromise(execResult);
      } else {
        result = await execResult;
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
      const errorMessage = err instanceof Error ? err.message : String(err);
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
      // 11. 清理 runningTools
      this.runningTools.delete(toolUse.id);
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
