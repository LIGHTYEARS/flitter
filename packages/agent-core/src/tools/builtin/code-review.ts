/**
 * code_review tool — Structured code review via sub-agent.
 *
 * 逆向: chunk-005.js:146498-146567 (OzT spec + fn)
 *   - name: _L = "code_review"
 *   - inputSchema: { diff_description (required), files, instructions,
 *     checkScope, checkFilter, checksOnly, thoroughness }
 *   - description: Review code changes/diffs/outstanding work
 *   - Spawns a sub-agent with review-focused system prompt
 *   - disableTimeout: true
 *
 * 逆向: chunk-005.js:71197-71203 (qe["code-review"] subagent config)
 *   - model: GEMINI_3_1_PRO_PREVIEW
 *   - includeTools: XsT = ["Read", "Grep", "glob", "web_search", "read_web_page", "Bash"]
 *   - allowMcp: false, allowToolbox: false
 *
 * 逆向: chunk-005.js:86648 — builtinTools: ["code_review"]
 * 逆向: chunk-005.js:86807 — code_review subagent key: "code-review"
 *
 * Factory-created tool (needs SubAgentManager).
 */

import { createLogger } from "@flitter/util";
import type { SubAgentManager } from "../../subagent/subagent";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

const log = createLogger("tool:code_review");

/**
 * Factory: create a code_review ToolSpec bound to a SubAgentManager.
 *
 * 逆向: OzT.fn calls dFR which orchestrates the review sub-agent.
 */
export function createCodeReviewTool(subAgentManager: SubAgentManager): ToolSpec {
  return {
    name: "code_review",
    description: `Review code changes, diffs, outstanding changes, or modified files. Use when asked to review changes, check code quality, analyze uncommitted work, or perform a code review.

It takes in a description of the diff or code change that can be used to generate the full diff, which is then reviewed. When using this tool, do not invoke \`git diff\` or any other tool to generate the diff but just pass a natural language description of how to compute the diff in the diff_description argument.

Pass "thoroughness": "quick" for a quick review with less reasoning depth. Defaults to "methodical" for a thorough review.`,
    inputSchema: {
      type: "object",
      properties: {
        diff_description: {
          type: "string",
          description:
            "A description of the diff or code change that can be used to generate the full diff. This can include a git or bash command to generate the diff or a description of the diff which can then be used to generate the git or bash command to generate the full diff.",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description:
            "Specific files to focus the review on. If empty, all changed files covered by the diff description are reviewed.",
        },
        instructions: {
          type: "string",
          description: "Additional instructions to guide the review agent.",
        },
        checkScope: {
          type: "string",
          description:
            "A directory to search for checks. If empty, includes all checks.",
        },
        checkFilter: {
          type: "array",
          items: { type: "string" },
          description:
            "A list of specific check names to run. If empty, includes all checks in scope.",
        },
        checksOnly: {
          type: "boolean",
          description:
            "If true, skips the main review agent and only runs checks.",
        },
        thoroughness: {
          type: "string",
          enum: ["methodical", "quick"],
          description:
            'Controls review depth. "methodical" (default) performs a thorough review with high reasoning. "quick" performs a faster review with less reasoning depth.',
        },
      },
      required: ["diff_description"],
    },
    source: "builtin",
    isReadOnly: true,
    executionProfile: {
      // Code review subagents don't conflict with each other
      resourceKeys: [],
    },

    async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      const diffDescription = args.diff_description as string;
      const files = args.files as string[] | undefined;
      const instructions = args.instructions as string | undefined;
      const thoroughness = (args.thoroughness as string) ?? "methodical";

      if (!diffDescription || typeof diffDescription !== "string") {
        return {
          status: "error",
          error: "Missing required field: diff_description",
        };
      }

      log.debug("code_review called", { diffDescription, files, thoroughness });

      try {
        // Build the review prompt
        // 逆向: amp builds a detailed prompt including diff generation instructions,
        // comment types (bug, suggested_edit, compliment, non_actionable),
        // severity levels, and structured output format
        const promptParts: string[] = [
          `You are a thorough code reviewer. Review the following code changes with ${thoroughness} depth.`,
          "",
          `## Diff Description`,
          diffDescription,
        ];

        if (files?.length) {
          promptParts.push("", "## Files to Focus On", ...files.map((f) => `- ${f}`));
        }

        if (instructions) {
          promptParts.push("", "## Additional Instructions", instructions);
        }

        promptParts.push(
          "",
          "## Review Instructions",
          "",
          "1. First, generate the actual diff using the description above (use Bash to run git diff or similar)",
          "2. Read the relevant files to understand context",
          "3. Review the changes for:",
          "   - Bugs and logical errors",
          "   - Security issues",
          "   - Performance concerns",
          "   - Code style and best practices",
          "   - Missing error handling",
          "   - Test coverage gaps",
          "",
          "4. For each finding, provide:",
          "   - File and line number",
          "   - Category: bug, suggested_edit, compliment, or non_actionable",
          "   - Severity: critical, high, medium, or low",
          "   - What the issue is and why it matters",
          "   - Suggested fix (if applicable)",
          "",
          "5. Return a structured review summary.",
        );

        const result = await subAgentManager.spawn({
          parentThreadId: context.threadId,
          prompt: promptParts.join("\n"),
          description: `Code review: ${diffDescription.slice(0, 50)}`,
          type: "code-review",
        });

        switch (result.status) {
          case "completed":
            return {
              status: "done",
              content: result.response || "(no review output)",
            };
          case "timeout":
            return {
              status: "error",
              error: `Code review timed out. Partial review: ${result.response || "(none)"}`,
              content: result.response,
            };
          case "cancelled":
            return {
              status: "cancelled",
              error: "Code review was cancelled",
              content: result.response,
            };
          case "error":
            return {
              status: "error",
              error: result.error ?? "Code review encountered an error",
              content: result.response,
            };
          default:
            return {
              status: "error",
              error: `Unknown review status: ${String((result as { status: string }).status)}`,
            };
        }
      } catch (err) {
        log.debug("code_review error", { error: err });
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
