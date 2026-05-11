/**
 * SubAgentRunner: 子代理推理循环 + progress 提取
 *
 * 逆向: modules/1354_unknown_wi.js — wi 类
 *   wi.run() 驱动内存推理循环, 维护 turns[] 数组
 *   每次工具完成时 emit {status: "in-progress", turns}
 *   结束时 emit {status: "done", turns, message}
 *
 * flitter 实现策略:
 *   复用现有 SubAgentManager.spawn() + ThreadWorker 基础设施,
 *   在完成后从子线程 snapshot 提取 turns (tool_use/tool_result 配对)
 *   等效于 amp wi.run() 的终态输出
 *
 * 为什么不直接实现 wi 的 while 循环?
 *   ThreadWorker 已封装了重试、权限、上下文压缩等逻辑;
 *   SubAgentRunner 的目标是「提取 progress 数据供渲染」, 不是替换 ThreadWorker
 */

import type { ThreadSnapshot } from "@flitter/schemas";
import type { SubAgentManager, SubAgentOptions, SubAgentResult } from "./subagent";

// ─── Types ────────────────────────────────────────────

/** 逆向: wi.#T 数组元素 — 一次完整的 assistant turn */
export interface SubAgentTurn {
  message?: string;
  reasoning?: string;
  activeTools: Map<string, SubAgentToolExecution>;
}

/** 逆向: wi activeTools.values() 中每个元素 */
export interface SubAgentToolExecution {
  id: string;
  tool_name: string;
  normalized_name?: string;
  input?: unknown;
  status: "queued" | "in-progress" | "done" | "error";
  result?: unknown;
  error?: { message: string };
}

/** 逆向: wi.run() Observable emit 的事件 */
export interface SubAgentRunnerEvent {
  status: "in-progress" | "done" | "error" | "cancelled";
  turns: SubAgentTurn[];
  message?: string;
}

/** SubAgentRunner 依赖注入 */
export interface SubAgentRunnerDeps {
  subAgentManager: SubAgentManager;
  getThreadSnapshot: (threadId: string) => ThreadSnapshot | undefined;
}

// ─── SubAgentRunner ───────────────────────────────────

export class SubAgentRunner {
  private readonly deps: SubAgentRunnerDeps;

  constructor(deps: SubAgentRunnerDeps) {
    this.deps = deps;
  }

  /**
   * 运行子代理并返回完整的 SubAgentRunnerEvent (含 turns/progress)。
   * 逆向: hXR() → wi.run() → iXR 映射
   *
   * @param opts - SubAgentManager.spawn() 参数 (may include onTurnComplete for live progress)
   */
  async run(opts: SubAgentOptions): Promise<SubAgentRunnerEvent> {
    const result = await this.deps.subAgentManager.spawn(opts);
    return this.buildEvent(result);
  }

  /**
   * 从 spawn 结果 + 子线程 snapshot 构建 SubAgentRunnerEvent。
   * 逆向: iXR — maps wi output to {status, turns, message}
   */
  private buildEvent(result: SubAgentResult): SubAgentRunnerEvent {
    const turns = this.extractTurns(result.threadId);

    switch (result.status) {
      case "completed":
        return { status: "done", turns, message: result.response };
      case "timeout":
        return { status: "error", turns, message: "Sub-agent timed out" };
      case "cancelled":
        return { status: "cancelled", turns };
      case "error":
        return { status: "error", turns, message: result.error };
    }
  }

  /**
   * 从子线程 snapshot 的 messages 提取 turns。
   *
   * 逆向: wi.#T — 每个 assistant 消息 = 一个 turn
   *   turn.message = text blocks 拼接
   *   turn.reasoning = thinking blocks 拼接
   *   turn.activeTools = 该 turn 中的 tool_use blocks + 对应 tool_result
   *
   * 子线程消息序列:
   *   user (prompt) → assistant (可能含 tool_use) → user (tool_result) → assistant → ...
   *
   * 我们扫描所有 assistant 消息, 每个生成一个 turn;
   * 然后用下一条 user 消息中的 tool_result 填充 tool 的执行状态
   */
  extractTurns(threadId: string): SubAgentTurn[] {
    const snapshot = this.deps.getThreadSnapshot(threadId);
    if (!snapshot) return [];

    const messages = snapshot.messages ?? [];
    const turns: SubAgentTurn[] = [];

    // 构建 toolUseId → tool_result 映射
    const toolResultMap = new Map<
      string,
      { status: string; result?: unknown; error?: { message: string } }
    >();
    for (const msg of messages) {
      if (msg.role !== "user") continue;
      const content = msg.content as Array<Record<string, unknown>>;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block.type !== "tool_result") continue;
        const toolUseId = (block.toolUseID ?? block.tool_use_id) as string | undefined;
        if (!toolUseId) continue;
        const run = block.run as Record<string, unknown> | undefined;
        if (run) {
          toolResultMap.set(toolUseId, {
            status: run.status as string,
            result: run.result,
            error: run.error as { message: string } | undefined,
          });
        }
      }
    }

    // 扫描 assistant 消息, 构建 turns
    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      const content = msg.content as Array<Record<string, unknown>>;
      if (!Array.isArray(content)) continue;

      const turn: SubAgentTurn = { activeTools: new Map() };
      const textParts: string[] = [];
      const thinkingParts: string[] = [];

      for (const block of content) {
        if (block.type === "text" && typeof block.text === "string") {
          textParts.push(block.text);
        } else if (block.type === "thinking" && typeof block.thinking === "string") {
          thinkingParts.push(block.thinking);
        } else if (block.type === "tool_use" && block.id && block.name) {
          const toolId = block.id as string;
          const toolName = block.name as string;
          const input = block.input as unknown;
          const toolResult = toolResultMap.get(toolId);

          let toolStatus: SubAgentToolExecution["status"] = "in-progress";
          let toolResultValue: unknown;
          let toolError: { message: string } | undefined;
          if (toolResult) {
            toolStatus = toolResult.status === "error" ? "error" : "done";
            toolResultValue = toolResult.result;
            toolError = toolResult.error;
          }

          const execution: SubAgentToolExecution = {
            id: toolId,
            tool_name: toolName,
            input,
            status: toolStatus,
            result: toolResultValue,
            error: toolError,
          };
          turn.activeTools.set(toolId, execution);
        }
      }

      turn.message = textParts.join("") || undefined;
      turn.reasoning = thinkingParts.join("") || undefined;
      turns.push(turn);
    }

    return turns;
  }
}
