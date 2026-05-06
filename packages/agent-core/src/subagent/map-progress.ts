/**
 * mapProgress: SubAgentRunnerEvent → ToolResult.progress 映射
 *
 * 逆向: modules/0064_unknown_iXR.js — iXR() function
 *   将 wi.run() emit 的 {status, turns} 映射为
 *   { progress: turns.map(t => ({ message, tool_uses: [...activeTools.values()] })) }
 *
 * 这是渲染管线 (buildSubagentContentByParentID Path 2) 消费的数据格式
 */

import type { ToolResult } from "../tools/types";
import type { SubAgentRunnerEvent } from "./subagent-runner";

/**
 * 将 SubAgentRunnerEvent.turns 映射为 ToolResult.progress 格式。
 * 逆向: iXR() — progress: T.turns.map(R => ({ message: R.message, tool_uses: [...R.activeTools.values()] }))
 */
export function mapSubAgentEventToProgress(
  event: SubAgentRunnerEvent,
): NonNullable<ToolResult["progress"]> {
  return event.turns.map((turn) => ({
    message: turn.message,
    reasoning: turn.reasoning,
    tool_uses: [...turn.activeTools.values()].map((t) => ({
      id: t.id,
      tool_name: t.tool_name,
      normalized_name: t.normalized_name,
      input: t.input,
      status: t.status,
      result: t.result,
      error: t.error,
    })),
  }));
}

/**
 * 将 SubAgentRunnerEvent 转为最终 ToolResult。
 * 逆向: hXR → iXR → subscriber.next(result)
 */
export function mapSubAgentEventToToolResult(event: SubAgentRunnerEvent): ToolResult {
  const progress = mapSubAgentEventToProgress(event);

  switch (event.status) {
    case "done":
      return {
        status: "done",
        content: event.message ?? "(no output)",
        progress,
      };
    case "error":
      return {
        status: "error",
        error: event.message ?? "Subagent execution failed",
        progress,
      };
    case "cancelled":
      return {
        status: "error",
        error: "Subagent was cancelled",
        progress,
      };
    case "in-progress":
      return {
        status: "done",
        content: event.message ?? "(in progress)",
        progress,
      };
  }
}
