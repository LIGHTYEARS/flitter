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

import type { Config, ThreadSnapshot, ToolRunInternalStatus } from "@flitter/schemas";
import type { Observable } from "@flitter/util";
import { Subject } from "@flitter/util";
import type {
  PluginAction,
  PluginToolCallEvent,
  PluginToolResultEvent,
  PluginToolResultOverride,
} from "../plugins/types";
import type { AgentEvent } from "../worker/events";
import { Mutex } from "./mutex";
import type { ToolRegistry } from "./registry";
import type { ToolContext, ToolMessage, ToolResult } from "./types";

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
  status: "in-progress" | "completed" | "error" | "cancelled" | "rejected-by-user";
  result?: ToolResult;
  error?: string;
  /** Reason for rejection (only set when status is "rejected-by-user") */
  reason?: string;
  /** Commands/paths that would need to be allowed (only set when status is "rejected-by-user") */
  toAllow?: string[];
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
  toolInput?: Record<string, unknown>;
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
    toAllow?: string[];
  }) => Promise<{ accepted: boolean; scope?: string; feedback?: string }>;

  /**
   * Clear all pending approvals for this thread, resolving each with accepted: false.
   *
   * 逆向: amp's $mR.clearApprovalsForThread(threadId) — iterates the
   * pendingApprovals BehaviorSubject, resolves all matching Promises with
   * { accepted: false }, then pushes the filtered list. This ensures that
   * tools waiting for approval get auto-rejected when a new user message arrives.
   *
   * Called from onNewUserMessage() before cancelling in-progress tools.
   */
  clearPendingApprovals?: () => void;

  /**
   * Plugin pre-execution interception (tool.call).
   * 逆向: amp's ThreadWorker wires requestPluginToolCall to pluginService.event.toolCall()
   * Returns a PluginAction that can allow, block, synthesize, or modify the call.
   */
  requestPluginToolCall?: (event: PluginToolCallEvent) => Promise<PluginAction>;

  /**
   * Plugin post-execution interception (tool.result).
   * 逆向: amp's ThreadWorker wires requestPluginToolResult to pluginService.event.toolResult()
   * Returns an optional override for the tool result.
   */
  requestPluginToolResult?: (
    event: PluginToolResultEvent,
  ) => Promise<PluginToolResultOverride | undefined>;

  /**
   * Notify that a skill tool completed successfully.
   *
   * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:180
   *   `onSkillToolComplete: T => this.onSkillToolComplete(T)`
   * 逆向: amp-cli-reversed/modules/1234_unknown_FWT.js:384
   *   `if (u.status === "done" && T.name.toLowerCase() === oc.toLowerCase()) this.callbacks.onSkillToolComplete(T)`
   *
   * Called after a tool named "skill" completes with status "done".
   * The callback receives the ToolUseItem so it can extract name/arguments.
   */
  onSkillToolComplete?: (toolUse: ToolUseItem) => void;
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

/**
 * The canonical skill tool name, used to detect skill tool completion.
 * 逆向: oc = "skill" (modules/2026_tail_anonymous.js:7062)
 */
const SKILL_TOOL_NAME = "skill";

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

  /**
   * Tool message channels: toolUseId → Subject<ToolMessage>
   *
   * 逆向: amp-cli-reversed/modules/1234_unknown_FWT.js:8
   *   `toolMessages = new Map()`
   *
   * Each tool invocation gets a Subject created in invokeTool().
   * The Subject is stored here so that cancelToolOnly(), cancelAll(),
   * and dispose() can send "stop-command" messages to running tools.
   * The Subject is completed and removed on normal tool completion.
   */
  private readonly toolMessages: Map<string, Subject<ToolMessage>> = new Map();

  /**
   * Processing mutex: serializes onResume, onAssistantMessageComplete,
   * cancelAll, and userProvideInput to prevent race conditions.
   *
   * 逆向: amp's FWT.processingMutex = new Cm() (modules/1234_unknown_FWT.js:5)
   * Uses FIFO queuing — every caller eventually acquires the lock.
   */
  private readonly processingMutex = new Mutex();

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
  private async invokeTool(toolUseArg: ToolUseItem): Promise<void> {
    let toolUse = toolUseArg;
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
      toolInput: toolUse.input,
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
            // 逆向: amp emits different statuses based on whether feedback was provided:
            // - With feedback → status "error" with message "rejected by user with feedback: ..."
            //   (so the LLM sees the feedback and can adjust behavior)
            // - Without feedback → status "rejected-by-user" with reason and toAllow
            //   (generic rejection, LLM should not retry the same tool)
            // See $mR.invokeTool lines 225-234 and 230-234
            if (response.feedback) {
              // Feedback-denial: send feedback as error so LLM reads it
              // 逆向: $mR line 225-230
              await this.callbacks.updateThread({
                type: "tool:data",
                toolUseId: toolUse.id,
                toolName: toolUse.name,
                status: "error",
                error: `This tool call was rejected by the user with feedback: ${response.feedback}`,
                result: {
                  status: "error",
                  error: `This tool call was rejected by the user with feedback: ${response.feedback}`,
                },
              });
            } else {
              // Plain denial: emit rejected-by-user with reason/toAllow
              // 逆向: $mR line 230-234
              const toAllow = this._computeToAllow(toolUse);
              await this.callbacks.updateThread({
                type: "tool:data",
                toolUseId: toolUse.id,
                toolName: toolUse.name,
                status: "rejected-by-user",
                reason: permResult.reason ?? "Tool execution rejected by user",
                toAllow,
              });
            }
            this.runningTools.delete(toolUse.id);
            this.callbacks.onToolEvent?.({
              type: "tool:complete",
              toolUseId: toolUse.id,
            });
            return;
          }
          // User approved — fall through to execute the tool
        } else if (permResult.action === "reject") {
          // 逆向: $mR line 251-254 — auto-reject from static permissions rule
          await this.callbacks.updateThread({
            type: "tool:data",
            toolUseId: toolUse.id,
            toolName: toolUse.name,
            status: "rejected-by-user",
            reason: permResult.reason ?? "Tool execution denied by permissions",
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

    // 3b. Plugin pre-execution interception (tool.call)
    // 逆向: amp's ThreadWorker calls pluginService.event.toolCall() before execution
    // Returns PluginAction: allow | error | reject-and-continue | synthesize | modify
    if (this.callbacks.requestPluginToolCall) {
      const pluginAction = await this.callbacks.requestPluginToolCall({
        tool: toolUse.name,
        input: toolUse.input,
      });
      if (pluginAction.action === "error") {
        await this.callbacks.updateThread({
          type: "tool:data",
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          status: "error",
          error: pluginAction.message,
          result: { status: "error", error: pluginAction.message },
        });
        this.runningTools.delete(toolUse.id);
        this.callbacks.onToolEvent?.({ type: "tool:complete", toolUseId: toolUse.id });
        return;
      }
      if (pluginAction.action === "reject-and-continue") {
        await this.callbacks.updateThread({
          type: "tool:data",
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          status: "error",
          error: pluginAction.message,
          result: { status: "error", error: pluginAction.message },
        });
        this.runningTools.delete(toolUse.id);
        this.callbacks.onToolEvent?.({ type: "tool:complete", toolUseId: toolUse.id });
        return;
      }
      if (pluginAction.action === "synthesize") {
        await this.callbacks.updateThread({
          type: "tool:data",
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          status: "completed",
          result: { status: "done", content: pluginAction.result.output },
        });
        this.runningTools.delete(toolUse.id);
        this.callbacks.onToolEvent?.({ type: "tool:complete", toolUseId: toolUse.id });
        return;
      }
      if (pluginAction.action === "modify") {
        toolUse = { ...toolUse, input: pluginAction.input };
      }
      // action === "allow" → continue
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
      // amp also uses `meta: { disableTimeout: !0 }` on long-running tools
      // (Bash, Task, code_review, finder, etc.) to skip the timeout entirely.
      // Flitter adds orchestrator-level enforcement: if the tool doesn't finish
      // within timeoutMs, we abort the AbortController and let the catch block
      // emit an error result.
      if (!spec.executionProfile?.disableTimeout) {
        const timeoutMs = spec.executionProfile?.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;
        timeoutError = new Error(`Tool "${toolUse.name}" execution timeout after ${timeoutMs}ms`);
        timeoutId = setTimeout(() => {
          abortController.abort(timeoutError);
        }, timeoutMs);
      }

      // 6. 获取 ToolContext
      const context = await this.callbacks.getToolRunEnvironment(
        toolUse.id,
        abortController.signal,
      );

      // 6b. Create a toolMessages Subject and inject into context
      // 逆向: FWT invokeTool (modules/1234_unknown_FWT.js:347-352)
      //   `s = new AR(u => { this.toolMessages.set(T.id, u) })`
      //   `A = { ...c, toolMessages: s }`
      const toolMessageSubject = new Subject<ToolMessage>();
      this.toolMessages.set(toolUse.id, toolMessageSubject);
      const contextWithMessages: ToolContext = {
        ...context,
        toolMessages: toolMessageSubject,
      };

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
      const execResult = spec.execute(
        spec.preprocessArgs ? spec.preprocessArgs(toolUse.input) : toolUse.input,
        contextWithMessages,
      );

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
        toolInput: toolUse.input,
      };
      await this.callbacks.applyPostHookResult(postHook, {
        toolUseId: toolUse.id,
        result,
      });

      // 8b. Plugin post-execution interception (tool.result)
      // 逆向: amp's ThreadWorker calls pluginService.event.toolResult() after execution
      if (this.callbacks.requestPluginToolResult) {
        const override = await this.callbacks.requestPluginToolResult({
          tool: toolUse.name,
          input: toolUse.input,
          output: result.content ?? result.error ?? "",
          status:
            result.status === "done" ? "done" : result.status === "error" ? "error" : "cancelled",
        });
        if (override) {
          result = {
            status: override.status === "error" ? "error" : "done",
            ...(override.result ? { output: override.result } : {}),
            ...(override.error ? { error: override.error } : {}),
          };
        }
      }

      // 9. 通知 completed
      await this.callbacks.updateThread({
        type: "tool:data",
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        status: "completed",
        result,
      });

      // 9b. Skill tool completion detection
      // 逆向: FWT invokeTool (modules/1234_unknown_FWT.js:384)
      //   `if (u.status === "done" && T.name.toLowerCase() === oc.toLowerCase()) this.callbacks.onSkillToolComplete(T);`
      // oc = "skill" (modules/2026_tail_anonymous.js:7062)
      if (
        result.status === "done" &&
        toolUse.name.toLowerCase() === SKILL_TOOL_NAME &&
        this.callbacks.onSkillToolComplete
      ) {
        this.callbacks.onSkillToolComplete(toolUse);
      }

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

      // Clean up tool message Subject on completion (normal or error)
      // 逆向: FWT invokeTool finalize (modules/1234_unknown_FWT.js:369)
      //   `this.runningTools.delete(T.id), this.toolMessages.get(T.id)?.complete(), this.toolMessages.delete(T.id)`
      const msgSubject = this.toolMessages.get(toolUse.id);
      if (msgSubject) {
        msgSubject.complete();
        this.toolMessages.delete(toolUse.id);
      }

      // Emit tool:complete regardless of success or error (try/finally guarantees this).
      // 逆向: FWT resolves the toolCompletionResolvers in the terminal-status handler.
      // Flitter emits a separate tool:complete AgentEvent for the TUI layer.
      this.callbacks.onToolEvent?.({
        type: "tool:complete",
        toolUseId: toolUse.id,
      });
    }
  }

  /**
   * Compute the toAllow array for a tool rejection.
   * 逆向: amp's $mR passes [cmd, command].filter(Boolean) for Bash/shell tools,
   * and file paths for guarded-file rejections. Flitter extracts from known
   * parameter names.
   */
  private _computeToAllow(toolUse: ToolUseItem): string[] | undefined {
    const args = toolUse.input;
    // For Bash/shell tools: extract the command string
    const cmd = args.command ?? args.cmd;
    if (typeof cmd === "string" && cmd.length > 0) {
      return [cmd];
    }
    // For file tools: extract the path
    const path = args.file_path ?? args.path;
    if (typeof path === "string" && path.length > 0) {
      return [path];
    }
    return undefined;
  }

  /**
   * Cancel all running tools with a reason string.
   *
   * 逆向: FWT.cancelAll(T) (modules/1234_unknown_FWT.js:122-129)
   *   - Acquires processingMutex
   *   - markAllActiveToolsCancelled()
   *   - clearApprovalsForThread(threadId)
   *   - cancelUnstartedTools(T)
   *   - cancelInProgressTools(T)
   *   - Releases processingMutex
   */
  async cancelAll(reason?: string): Promise<void> {
    await this.processingMutex.acquire();
    try {
      // Mark all active tool uses as cancelled
      for (const [id, { abort }] of this.runningTools) {
        abort.abort(reason);
        this.cancelledToolUses.add(id);
      }
      // Send stop-command to all tool message channels
      // 逆向: FWT.abortAllTools (modules/1234_unknown_FWT.js:194-204)
      //   `for (let [T, R] of this.toolMessages) try { R.next({ type: "stop-command" }), R.complete(); }`
      for (const [id, subject] of this.toolMessages) {
        try {
          subject.next({ type: "stop-command" });
          subject.complete();
        } catch {
          // Ignore errors during cleanup
        }
        this.toolMessages.delete(id);
      }
      // Clear pending approvals
      this.callbacks.clearPendingApprovals?.();
    } finally {
      this.processingMutex.release();
    }
  }

  /**
   * Called when a new user message arrives, before starting new inference.
   *
   * 逆向: FWT.onNewUserMessage() (modules/1234_unknown_FWT.js:119-121)
   *   - markAllActiveToolsCancelled() [outside mutex — pre-emptive]
   *   - clearApprovalsForThread(threadId) [outside mutex — pre-emptive]
   *   - await cancelAll("user:interrupted")
   *
   * Clearing approvals outside the mutex first ensures they're drained even
   * if the mutex is currently held by an executing tool. The idempotent
   * clearPendingApprovals call inside cancelAll is harmless.
   */
  async onNewUserMessage(): Promise<void> {
    // Pre-emptive mark + clear outside the mutex (matches amp's FWT.onNewUserMessage)
    for (const [id] of this.runningTools) {
      this.cancelledToolUses.add(id);
    }
    this.callbacks.clearPendingApprovals?.();
    // Then full cancelAll with mutex
    await this.cancelAll("user:interrupted");
  }

  /** 取消特定工具 (hard cancel — aborts the AbortController) */
  cancelTool(toolUseId: string): void {
    const entry = this.runningTools.get(toolUseId);
    if (entry) {
      entry.abort.abort();
      this.cancelledToolUses.add(toolUseId);
    }
    // Also send stop-command and clean up the tool message channel
    const subject = this.toolMessages.get(toolUseId);
    if (subject) {
      try {
        subject.next({ type: "stop-command" });
        subject.complete();
      } catch {
        // Ignore errors during cleanup
      }
      this.toolMessages.delete(toolUseId);
    }
  }

  /**
   * Cancel a single tool cooperatively — sends a stop-command but does NOT
   * abort the AbortController. The tool's execution continues but should
   * honor the stop-command and terminate gracefully.
   *
   * 逆向: FWT.cancelToolOnly (modules/1234_unknown_FWT.js:135-158)
   *   ```
   *   async cancelToolOnly(T, R) {
   *     let a = this.callbacks.getThread();
   *     if (!Tn(a, T)) return;
   *     let e = this.getCancelDataForToolRun(T, "user:cancelled"),
   *       t = this.toolMessages.get(T);
   *     if (t) {
   *       t.next({ type: "stop-command" }), t.complete(), this.toolMessages.delete(T);
   *     }
   *     await this.callbacks.handle({ type: "tool:data", toolUse: T, data: e });
   *   }
   *   ```
   *
   * Key difference from cancelTool: no AbortController abort, no sibling impact.
   * This is a cooperative signal — the tool decides when to actually stop.
   */
  async cancelToolOnly(toolUseId: string): Promise<void> {
    // Send stop-command via toolMessages channel
    const subject = this.toolMessages.get(toolUseId);
    if (subject) {
      try {
        subject.next({ type: "stop-command" });
        subject.complete();
      } catch {
        // Ignore errors during cleanup
      }
      this.toolMessages.delete(toolUseId);
    }

    // Mark as cancelled and emit cancelled status
    this.cancelledToolUses.add(toolUseId);
    await this.callbacks.updateThread({
      type: "tool:data",
      toolUseId,
      toolName: this._getToolName(toolUseId) ?? "unknown",
      status: "cancelled",
    });
  }

  /**
   * Send an arbitrary message to a running tool's message channel.
   *
   * 逆向: FWT.sendToolMessage (modules/1234_unknown_FWT.js:174-178)
   *   `let a = this.toolMessages.get(T); if (a) return a.next(R), !0; return !1;`
   */
  sendToolMessage(toolUseId: string, message: ToolMessage): boolean {
    const subject = this.toolMessages.get(toolUseId);
    if (subject) {
      subject.next(message);
      return true;
    }
    return false;
  }

  /**
   * Get the tool name for a running tool by its ID.
   * Used internally by cancelToolOnly to emit proper tool:data events.
   */
  private _getToolName(_toolUseId: string): string | undefined {
    // Look through runningTools — we don't store names there, so scan the
    // last known tool_use from the thread snapshot if available
    // For simplicity, return undefined if not found; the caller uses "unknown"
    return undefined;
  }

  /**
   * Resume in-progress tools after crash/restart/reconnect.
   *
   * 逆向: FWT.onResume() (modules/1234_unknown_FWT.js:37-93)
   *
   * Scans the latest user message for non-terminal tool_results and:
   * 1. blocked-on-user → restore to approval queue (emit approval event)
   * 2. isDangerousToResume → cancel with reason "system:safety"
   * 3. otherwise → re-invoke the tool
   *
   * @param thread Current thread snapshot
   */
  async onResume(thread: ThreadSnapshot): Promise<void> {
    // 逆向: FWT.onResume acquires processingMutex (modules/1234_unknown_FWT.js:37-93)
    await this.processingMutex.acquire();
    try {
      await this._onResumeInner(thread);
    } finally {
      this.processingMutex.release();
    }
    // File change tracking runs outside the mutex (matches amp)
    await this.callbacks.updateFileChanges();
  }

  /**
   * Inner resume logic, called under the processing mutex.
   */
  private async _onResumeInner(thread: ThreadSnapshot): Promise<void> {
    // Find the latest user message (scan from end)
    // 逆向: dt(T, "user") — find last message with role "user"
    const messages = thread.messages ?? [];
    let latestUserMsg: (typeof messages)[number] | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === "user") {
        latestUserMsg = messages[i];
        break;
      }
    }
    if (!latestUserMsg) return;

    // Iterate tool_result blocks in the latest user message
    for (const block of latestUserMsg.content) {
      if (typeof block !== "object" || block === null) continue;
      if (!("type" in block) || block.type !== "tool_result") continue;

      const toolResult = block as {
        type: "tool_result";
        toolUseID?: string;
        tool_use_id?: string;
        run?: { status?: string; reason?: string; toAllow?: string[]; progress?: unknown };
        content?: unknown;
      };

      const toolUseId = toolResult.toolUseID ?? toolResult.tool_use_id;
      if (!toolUseId) continue;

      const runStatus = (toolResult.run?.status ?? "") as ToolRunInternalStatus | "";

      // CASE 1: blocked-on-user → restore to approval queue
      // 逆向: FWT.onResume lines 42-54
      if (runStatus === "blocked-on-user") {
        // Find the corresponding tool_use block to get tool name and args
        const toolUseBlock = this._findToolUseById(thread, toolUseId);
        if (!toolUseBlock) continue;

        if (this.callbacks.requestApproval) {
          // Re-emit approval request — this will block the tool's execution until
          // the user responds, which is the desired behavior for resume.
          this.callbacks
            .requestApproval({
              toolUseId,
              toolName: toolUseBlock.name,
              args: (toolUseBlock.input ?? {}) as Record<string, unknown>,
              reason: toolResult.run?.reason ?? "Requires user approval",
            })
            .then((response) => {
              if (response.accepted) {
                // Re-invoke the tool after approval
                this.invokeTool({
                  id: toolUseId,
                  name: toolUseBlock.name,
                  input: (toolUseBlock.input ?? {}) as Record<string, unknown>,
                });
              }
            })
            .catch(() => {
              // Approval rejected or errored — already handled by requestApproval
            });
        }
        continue;
      }

      // Skip terminal statuses
      // 逆向: wt() (chunk-001.js:5722) — done | error | rejected-by-user | cancelled
      if (isTerminalStatus(runStatus)) continue;

      // Skip already running tools
      if (this.runningTools.has(toolUseId)) continue;

      // Find the tool_use block
      const toolUseBlock = this._findToolUseById(thread, toolUseId);
      if (!toolUseBlock) continue;

      // CASE 2: dangerous tool → cancel with system:safety
      // 逆向: FWT.onResume lines 65-77
      if (isDangerousToResume(toolUseBlock.name)) {
        await this.callbacks.updateThread({
          type: "tool:data",
          toolUseId,
          toolName: toolUseBlock.name,
          status: "cancelled",
          error: "Cancelled on resume: tool is dangerous to re-execute (system:safety)",
        });
        continue;
      }

      // CASE 3: safe tool → re-invoke
      // 逆向: FWT.onResume lines 79-82
      void this.invokeTool({
        id: toolUseId,
        name: toolUseBlock.name,
        input: (toolUseBlock.input ?? {}) as Record<string, unknown>,
      });
    }
  }

  /**
   * Find a tool_use block by ID across all assistant messages in the thread.
   * 逆向: FWT.findToolUseById
   */
  private _findToolUseById(
    thread: ThreadSnapshot,
    toolUseId: string,
  ): { name: string; input: unknown } | undefined {
    const messages = thread.messages ?? [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]!;
      if (msg.role !== "assistant") continue;
      for (const block of msg.content) {
        if (
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "tool_use" &&
          "id" in block &&
          block.id === toolUseId
        ) {
          return block as { name: string; input: unknown };
        }
      }
    }
    return undefined;
  }

  /** 是否有工具正在运行 */
  hasRunningTools(): boolean {
    return this.runningTools.size > 0;
  }

  /** 销毁: 取消所有 + 清理 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    // Synchronous cancel — bypass the mutex for disposal (matches amp:
    // FWT.dispose uses cancelAll("system:disposed") but also does direct abort)
    for (const [id, { abort }] of this.runningTools) {
      abort.abort("system:disposed");
      this.cancelledToolUses.add(id);
    }
    // Send stop-command to all tool message channels before clearing
    // 逆向: FWT.dispose (modules/1234_unknown_FWT.js:194-204)
    //   `for (let [T, R] of this.toolMessages) try { R.next({ type: "stop-command" }), R.complete(); }`
    for (const [_id, subject] of this.toolMessages) {
      try {
        subject.next({ type: "stop-command" });
        subject.complete();
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.toolMessages.clear();
    this.callbacks.clearPendingApprovals?.();
    this.runningTools.clear();
    this.cancelledToolUses.clear();
  }
}

// ─── Resume safety utilities ─────────────────────────────

/**
 * Tools that are dangerous to re-execute on resume (crash/restart).
 *
 * 逆向: FWT.isDangerousToResume (modules/1234_unknown_FWT.js:545-547)
 * Constants: U8="Bash", S2="run_terminal_command", Eb="shell_command",
 *            Dt="Task", j0T="handoff"
 *
 * Notable: file mutation tools (write_file, edit_file, apply_patch) are NOT
 * in this list — they are considered idempotent enough to replay.
 */
const DANGEROUS_TO_RESUME: ReadonlySet<string> = new Set([
  "Bash",
  "run_terminal_command",
  "shell_command",
  "Task",
  "handoff",
]);

/**
 * Check if a tool is dangerous to re-invoke on resume.
 * 逆向: FWT.isDangerousToResume (modules/1234_unknown_FWT.js:545-547)
 */
export function isDangerousToResume(toolName: string): boolean {
  return DANGEROUS_TO_RESUME.has(toolName);
}

/**
 * Check if a tool run status is terminal (no further action needed).
 * 逆向: wt (chunk-001.js:5722)
 */
export function isTerminalStatus(status: string): boolean {
  return (
    status === "done" ||
    status === "error" ||
    status === "rejected-by-user" ||
    status === "cancelled"
  );
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
