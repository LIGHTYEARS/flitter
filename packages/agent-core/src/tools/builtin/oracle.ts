/**
 * oracle — Senior engineering advisor subagent tool
 *
 * Spawns a GPT-5.4 (configurable) subagent for code review, architecture decisions,
 * complex debugging, and planning. Read-only — oracle cannot edit files or run commands.
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:142702-142760 (DVR tool spec)
 *   - name: "oracle" (tt constant)
 *   - params: task (required), context (optional), files (optional array of paths)
 *   - meta: { disableTimeout: true }, resourceKeys: () => []
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:15832-15882 (MVR execution fn)
 *   - resolves file mentions via uwT
 *   - builds system prompt via hFT(workspaceRoot, gitRoot)
 *   - reads model from internal.model.oracle (default GPT_5_4) via tAR
 *   - reads reasoning effort from internal.oracleReasoningEffort (default "high") via dVR
 *   - launches subagent via `new wi().run($VR, { model, spec: qe.oracle })`
 *
 * 逆向: amp-cli-reversed/modules/0050_unknown_EVR.js:4-18 (EVR prompt builder)
 *   - combines task + context + file mentions + parentThreadID reference
 *
 * 逆向: amp-cli-reversed/modules/1617_unknown_tAR.js:35-45 (tAR model resolver)
 *   - reads internal.model.oracle, strips provider prefix (e.g., "openai:gpt-5.4" → "gpt-5.4")
 *   - falls back to n8.GPT_5_4.name
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:64997 (qe.oracle config)
 *   - Q2 = ["Read", "Grep", "glob", "web_search", "read_web_page", "read_thread", "find_thread"]
 *   - allowMcp: false, allowToolbox: false
 */

import type { SubAgentManager } from "../../subagent/subagent";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

/** Oracle tools — must match SUBAGENT_TYPE_REGISTRY.oracle.toolPatterns */
const ORACLE_TOOLS = [
  "Read",
  "Grep",
  "Glob",
  "web_search",
  "read_web_page",
  "read_thread",
  "find_thread",
];

/**
 * Build the oracle's user prompt from task + context + files.
 *
 * 逆向: EVR (modules/0050_unknown_EVR.js:4-18)
 */
export function buildOraclePrompt(opts: {
  task: string;
  context?: string;
  files?: string[];
  parentThreadId?: string;
}): string {
  let prompt = opts.task;

  if (opts.context) {
    prompt = `Context: ${opts.context}\n\nTask: ${opts.task}`;
  }

  if (opts.files && opts.files.length > 0) {
    prompt += `\n\nRelevant files:\n\n${opts.files.join("\n")}`;
  }

  if (opts.parentThreadId) {
    prompt += `\n\nParent thread: ${opts.parentThreadId}\nYou can use the read_thread tool with this ID to read the full conversation that invoked you if you need more context.`;
  }

  return prompt;
}

/**
 * Create an Oracle ToolSpec bound to a SubAgentManager.
 *
 * Like createTaskTool, oracle is a factory because it needs a SubAgentManager reference.
 */
export function createOracleTool(subAgentManager: SubAgentManager): ToolSpec {
  return {
    name: "oracle",
    source: "builtin",
    isReadOnly: true,

    description: `Consult the oracle - an AI advisor powered by OpenAI's GPT-5.4 reasoning model that can plan, review, and provide expert guidance.

The oracle has access to the following tools:
- ${ORACLE_TOOLS.join("\n- ")}.

You should consult the oracle for:
- Code reviews and architecture feedback
- Finding difficult bugs in codepaths that flow across many files
- Planning complex implementations or refactors
- Answering complex technical questions that require deep technical reasoning
- Providing an alternative point of view when you are struggling to solve a problem

You should NOT consult the oracle for:
- File reads or simple keyword searches (use Read or Grep directly)
- Codebase searches (use finder)
- Web browsing and searching (use read_web_page or web_search)
- Basic code modifications and when you need to execute code changes (do it yourself or use Task)

Usage guidelines:
- Be specific about what you want the oracle to review, plan, or debug
- Provide relevant context about what you're trying to achieve. If you know that 3 files are involved, list them and they will be attached.`,

    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description:
            "The task or question you want the oracle to help with. Be specific about what kind of guidance, review, or planning you need.",
        },
        context: {
          type: "string",
          description:
            "Optional context about the current situation, what you've tried, or background information that would help the oracle provide better guidance.",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional list of specific file paths (text files, images) that the oracle should examine as part of its analysis. These files will be attached to the oracle input.",
        },
      },
      required: ["task"],
    },

    executionProfile: {
      // Oracle does not conflict with other tools
      resourceKeys: [],
      // 逆向: amp uses `meta: { disableTimeout: !0 }` on oracle
      disableTimeout: true,
    },

    async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      const task = args.task as string | undefined;
      const contextStr = args.context as string | undefined;
      const files = args.files as string[] | undefined;

      if (!task) {
        return { status: "error", error: 'Missing required parameter "task"' };
      }

      // Build the prompt matching amp's EVR pattern
      const prompt = buildOraclePrompt({
        task,
        context: contextStr,
        files,
        parentThreadId: context.threadId,
      });

      // If files are specified, prepend file reading instructions
      const fullPrompt = files?.length
        ? `Please examine the following files as part of your analysis:\n${files.map((f) => `- ${f}`).join("\n")}\n\n${prompt}`
        : prompt;

      try {
        const result = await subAgentManager.spawn({
          parentThreadId: context.threadId,
          prompt: fullPrompt,
          description: `Oracle: ${task.substring(0, 50)}${task.length > 50 ? "..." : ""}`,
          type: "oracle",
        });

        switch (result.status) {
          case "completed":
            return {
              status: "done",
              content: result.response || "(oracle returned no response)",
            };
          case "timeout":
            return {
              status: "error",
              error: `Oracle consultation timed out. Partial: ${result.response || "(none)"}`,
              content: result.response,
            };
          case "cancelled":
            return {
              status: "error",
              error: "Oracle consultation was cancelled",
              content: result.response,
            };
          case "error":
            return {
              status: "error",
              error: result.error ?? "Oracle encountered an error",
              content: result.response,
            };
          default:
            return {
              status: "error",
              error: `Unknown oracle status: ${String((result as { status: string }).status)}`,
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
