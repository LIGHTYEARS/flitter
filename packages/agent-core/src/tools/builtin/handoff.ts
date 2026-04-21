/**
 * Handoff tool — LLM-callable tool for handing off work to a new thread
 *
 * Amp registers `handoff` as a named ToolSpec so the LLM can trigger
 * handoffs via tool_use. The tool delegates to ThreadWorker.executeHandoff()
 * which manages the handoff state and optional thread creation.
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:111178-111223
 *   - sqT.spec: name j0T (= "handoff"), inputSchema {goal, follow, mode}
 *   - sqT.fn: qBR — delegates to handoff controller
 *
 * 逆向: j0T = "handoff" (chunk-005.js:13231)
 *
 * @module
 */

import type { ToolResult, ToolSpec } from "../types.js";

// ─── Description ───────────────────────────────────────────
// 逆向: sqT.description from modules/2026_tail_anonymous.js:111182-111196

const HANDOFF_DESCRIPTION = `Hand off work to a new thread that runs in the background. Use this tool when you need to continue work in a fresh context because:
- The current thread is getting too long and context is degrading
- You want to start a new focused task while preserving context from the current thread
- The current thread's context window is near capacity

When you call this tool:
1. A new thread will be created with relevant context from this thread
2. The new thread will start running in the background
3. The current thread continues to run - you can finish up any remaining work

When the user message tells you to continue the work or to handoff to only one new thread, you should follow to the new thread by setting follow to true.

The goal parameter should describe what work should continue in the new thread. Keep it short—a single sentence or at most one paragraph. Focus on what needs to be done next, not what was already completed.

Use the mode parameter when the user explicitly requests a different agent mode (e.g., "deep", "smart", "rush") for the new thread.`;

// ─── Types ──────────────────────────────────────────────────

export interface HandoffToolCallbacks {
  /**
   * Execute the handoff. Called when the LLM invokes the tool.
   * Should call ThreadWorker.executeHandoff() or equivalent.
   *
   * @returns The new thread ID if created, undefined otherwise
   */
  executeHandoff: (
    goal: string,
    options?: { follow?: boolean; mode?: string },
  ) => Promise<string | undefined>;
}

// ─── Tool ──────────────────────────────────────────────────

/**
 * Create the handoff tool spec.
 *
 * 逆向: sqT = { spec: {...}, fn: qBR } at modules/2026_tail_anonymous.js:111179-111223
 *
 * @param callbacks - Handoff execution callbacks (provided by container wiring)
 */
export function createHandoffTool(callbacks: HandoffToolCallbacks): ToolSpec {
  return {
    name: "handoff",
    description: HANDOFF_DESCRIPTION,
    source: "builtin",
    executionProfile: {
      resourceKeys: [],
    },
    inputSchema: {
      type: "object",
      properties: {
        goal: {
          type: "string",
          description:
            "A short description of the next task to accomplish in the new thread. Should be a single sentence or at most one paragraph. Focus on what needs to be done next, not what was already completed.",
        },
        follow: {
          type: "boolean",
          default: false,
          description:
            "If true, navigate to the new thread after creation. Use this when the current thread is stopping and work should continue in the new thread.",
        },
        mode: {
          type: "string",
          description:
            "The agent mode for the new thread. Defaults to the current thread's agent mode if not specified.",
        },
      },
      required: ["goal", "follow"],
    },

    /**
     * Execute the handoff tool: delegate to ThreadWorker.executeHandoff().
     *
     * 逆向: sqT.fn (qBR) at modules/2026_tail_anonymous.js:111222
     */
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const goal = args.goal as string;
      if (!goal) {
        return {
          status: "error",
          content: "Missing required parameter: goal",
        };
      }

      const follow = (args.follow as boolean) ?? false;
      const mode = args.mode as string | undefined;

      try {
        const newThreadId = await callbacks.executeHandoff(goal, {
          follow,
          mode,
        });

        if (newThreadId) {
          return {
            status: "done",
            content: `Handoff created successfully. New thread: ${newThreadId}${follow ? " (following)" : ""}`,
            data: {
              success: true,
              newThreadId,
              follow,
            },
          };
        }

        return {
          status: "done",
          content: "Handoff initiated. Context will be transferred to a new thread.",
          data: { success: true, follow },
        };
      } catch (err) {
        return {
          status: "error",
          content: `Handoff failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };
}
