/**
 * Task tool — spawn a subagent to perform a focused sub-task.
 *
 * 逆向: amp 2026_tail_anonymous.js:143055 (Dt = "Task" tool spec)
 * 逆向: amp 1354_unknown_wi.js (subagent inference runner)
 */

import type { SubAgentManager } from "../../subagent/subagent";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

/**
 * Create a Task ToolSpec bound to a SubAgentManager.
 *
 * The Task tool is a factory (not a static constant) because it needs
 * a reference to the SubAgentManager instance from the container.
 *
 * 逆向: amp's Task tool description instructs the LLM on when to use
 * subagents (multi-step tasks, large output, parallel independent work)
 * and when not to (single file ops, uncertain plans).
 */
export function createTaskTool(subAgentManager: SubAgentManager): ToolSpec {
  return {
    name: "Task",
    description: `Perform a task using a sub-agent that has access to file read/write, search, and shell tools.

When to use the Task tool:
- When you need to perform complex multi-step tasks
- When you need to run an operation that will produce a lot of output that is not needed after the sub-agent completes
- When making changes across many layers of an application, after you have planned the changes so they can be implemented independently
- When the user asks you to launch an "agent" or "subagent"

When NOT to use the Task tool:
- When performing a single logical task on a single file
- When reading a single file (use Read), searching (use Grep), or editing a single file (use Edit)
- When you're not sure what changes you want to make

How to use:
- Run multiple sub-agents concurrently if the tasks are independent
- You will not see the individual steps of the sub-agent's execution
- Include all necessary context, a detailed plan, and what the sub-agent should return
- Tell the sub-agent how to verify its work if possible
- The result returned by the agent is not visible to the user. Send a text summary back to the user.`,
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "The task for the agent to perform. Be specific about what needs to be done and include any relevant context.",
        },
        description: {
          type: "string",
          description:
            "A very short (3-5 word) description of the task that can be displayed to the user.",
        },
      },
      required: ["prompt", "description"],
    },
    source: "builtin",
    isReadOnly: false,
    executionProfile: {
      // Task tools do not conflict with each other (can run in parallel)
      // and do not conflict with other tools (subagent has its own context)
      resourceKeys: [],
    },

    async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      const prompt = args.prompt as string;
      const description = args.description as string;

      if (!prompt) {
        return { status: "error", error: "Missing required field: prompt" };
      }

      try {
        const result = await subAgentManager.spawn({
          parentThreadId: context.threadId,
          prompt,
          description: description ?? "Sub-task",
          type: "task",
        });

        switch (result.status) {
          case "completed":
            return {
              status: "done",
              content: result.response || "(no output)",
            };
          case "timeout":
            return {
              status: "error",
              error: `Sub-agent timeout. Partial response: ${result.response || "(none)"}`,
              content: result.response,
            };
          case "cancelled":
            return {
              status: "error",
              error: "Sub-agent was cancelled",
              content: result.response,
            };
          case "error":
            return {
              status: "error",
              error: result.error ?? "Sub-agent encountered an error",
              content: result.response,
            };
          default:
            return {
              status: "error",
              error: `Unknown sub-agent status: ${String((result as { status: string }).status)}`,
            };
        }
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
