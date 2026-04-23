/**
 * code_tour tool — Guided code walkthrough via sub-agent.
 *
 * 逆向: modules/2026_tail_anonymous.js:140405-140447 (I2R spec)
 *   - name: mlR = "code_tour"
 *   - inputSchema: { baseRevision (required, git hash pattern), focus? }
 *   - description: "Generate a guided code tour for working changes relative to a base commit."
 *   - meta: { disableTimeout: !0 }
 *   - source: "builtin"
 *   - executionProfile: { resourceKeys: () => [] }
 *
 * 逆向: modules/2026_tail_anonymous.js:14100-14140 (f2R execution fn)
 *   - validates baseRevision against A2R = /^[0-9a-f]{7,40}$/iu
 *   - spawns subagent with type "code-tour"
 *   - subagent system prompt: a2R (explain diffs in two batches using post_explanation tool)
 *
 * 逆向: chunk-005.js:67177 — HW = ["code_tour","code_review","walkthrough","walkthrough_diagram"]
 *   code_tour is a deferred tool for smart/large modes.
 *
 * 逆向: chunk-005.js:86636 — builtinTools: ["code_tour"]
 * 逆向: chunk-005.js:86806 — code_tour subagent key: "code-tour"
 */

import { createLogger } from "@flitter/util";
import type { SubAgentManager } from "../../subagent/subagent";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

const log = createLogger("tool:code_tour");

/**
 * Git commit hash validator.
 * 逆向: modules/2026_tail_anonymous.js:140408
 *   A2R = /^[0-9a-f]{7,40}$/iu
 */
const GIT_HASH_RE = /^[0-9a-f]{7,40}$/iu;

function validateBaseRevision(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!GIT_HASH_RE.test(value)) return undefined;
  return value;
}

/**
 * Factory: create a code_tour ToolSpec bound to a SubAgentManager.
 *
 * 逆向: I2R.fn = f2R (modules/2026_tail_anonymous.js:14100-14140)
 *   - validates baseRevision
 *   - spawns "code-tour" subagent with baseRevision + optional focus in prompt
 */
export function createCodeTourTool(subAgentManager: SubAgentManager): ToolSpec {
  return {
    name: "code_tour",
    // 逆向: I2R.spec.description (modules/2026_tail_anonymous.js:140410-140420)
    description: `Generate a guided code tour for working changes relative to a base commit.

Use this tool for:
- Walking through uncommitted changes before review
- Explaining a complex patch in plain language
- Understanding change intent and cross-file impact

The main agent must not repeat or summarize this tool's output. Do not comment on it,
summarize it, quote it, or use it in the final response.
`,
    // 逆向: I2R.spec.inputSchema (modules/2026_tail_anonymous.js:140422-140443)
    inputSchema: {
      type: "object",
      properties: {
        baseRevision: {
          type: "string",
          pattern: "^[0-9a-fA-F]{7,40}$",
          description:
            "Git commit hash used as the base revision for generating the raw diff against current working changes.",
        },
        focus: {
          type: "string",
          description:
            "Optional focus area for the tour, such as architecture impact, risky changes, API behavior, or specific subsystems.",
        },
      },
      required: ["baseRevision"],
      additionalProperties: false,
    },
    source: "builtin",
    isReadOnly: true,
    executionProfile: {
      // 逆向: I2R.spec.executionProfile: { resourceKeys: () => [] }
      // code_tour subagents don't conflict with each other or other tools
      resourceKeys: [],
      // 逆向: I2R.spec.meta: { disableTimeout: !0 }
      // code tours can take minutes — never timeout
      disableTimeout: true,
    },

    async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      // 逆向: f2R validates baseRevision with A2R = /^[0-9a-f]{7,40}$/iu
      const baseRevision = validateBaseRevision(args.baseRevision);
      if (!baseRevision) {
        return {
          status: "error",
          error: "code_tour requires baseRevision to be a valid git commit hash",
        };
      }

      const focus = typeof args.focus === "string" ? args.focus : undefined;

      log.debug("Code tour subagent starting", {
        baseRevision,
        hasFocus: typeof args.focus === "string",
      });

      // 逆向: f2R builds prompt via R2R({ baseRevision, focus })
      // and spawns subagent via P2R with "code-tour" type
      // Subagent system prompt (a2R) instructs the agent to:
      //   1. Call eval_git_diff first to capture the raw diff
      //   2. Emit explanations in two batches via post_explanation tool
      //   3. Overview first (end-user behavior change + files to read first)
      //   4. Then per-hunk walkthrough in reading order
      const promptParts: string[] = [
        `You are a specialized subagent that explains diffs.`,
        ``,
        `Your job is to produce a clear walkthrough of what changed and why it matters.`,
        ``,
        `Use the post_explanation tool to emit every section of your explanation. Do not use your final`,
        `assistant message to explain (it should just read "I am done").`,
        ``,
        `Optimistically emit explanations in two batches:`,
        `1. Early overview: after light inspection (without over-analyzing), once you understand the`,
        `   broad shape of the diff, post an explanation with the following:`,
        `   a. What the end-user behavior was before and what it was after.`,
        `   b. Identify which file(s) should be reviewed first, with a five word summary of what that file contains. Prioritize foundational files with key data structures, data sources, or schema changes.`,
        `2. Hunk walkthrough batch: post explanations for each non-trivial hunk, grouped and ordered by the sequence a user should read for understanding. Start with the most foundational hunks and try to tie together adjacent explanations into a coherent narrative.`,
        ``,
        `Guidelines:`,
        `- Always call eval_git_diff first to capture the raw diff for this tour.`,
        `- Focus on high-level behavior and intent; avoid describing the obvious or line-level code mechanics.`,
        `- When relevant, contrast the old behavior with the new behavior.`,
        `- Do not use Markdown titles.`,
        `- Preface the overview explanation with "**Overview:**".`,
        `- Prefer short markdown bullet lists. Each explanation should usually be a short sentence followed by 0-3 concise bullets.`,
        `- Avoid sentence fragments. Use complete sentences, but keep them concise and pithy.`,
        `- Highlight important interactions between files when applicable.`,
        `- Mention notable risks or follow-up checks when they materially matter.`,
        `- When an explanation references multiple non-contiguous line ranges, pass all ranges in post_explanation.lineRanges.`,
        `- When an explanation references a code location, include a clickable markdown link using this exact`,
        `  pattern: [<path>#L<start>-L<end>](<path>#L<start>-L<end>) (end is optional).`,
        `- Include the relevant unified diff hunk in the diff parameter when explaining a specific change.`,
        `  The diff should be a valid unified diff snippet with --- and +++ headers and @@ hunk headers.`,
        `  Keep diff hunks focused on the specific change being discussed, not the entire file diff.`,
        `- If your understanding changes, add a later post_explanation call that corrects earlier claims.`,
        ``,
        `Keep each explanation concise, concrete, easy to scan, and grounded in the actual diff.`,
        ``,
        `## Tour Parameters`,
        ``,
        `Base revision: ${baseRevision}`,
      ];

      if (focus) {
        promptParts.push(``, `Focus area: ${focus}`);
      }

      promptParts.push(
        ``,
        `Start by calling eval_git_diff to get the diff relative to ${baseRevision}.`,
      );

      try {
        const result = await subAgentManager.spawn({
          parentThreadId: context.threadId,
          prompt: promptParts.join("\n"),
          description: `Code tour from ${baseRevision.slice(0, 8)}${focus ? `: ${focus}` : ""}`,
          type: "code-tour",
        });

        switch (result.status) {
          case "completed":
            return {
              status: "done",
              content: result.response || "(no tour output)",
            };
          case "timeout":
            return {
              status: "error",
              error: `Code tour timed out. Partial tour: ${result.response || "(none)"}`,
              content: result.response,
            };
          case "cancelled":
            return {
              status: "cancelled",
              error: "Code tour was cancelled",
              content: result.response,
            };
          case "error":
            return {
              status: "error",
              error: result.error ?? "Code tour encountered an error",
              content: result.response,
            };
          default:
            return {
              status: "error",
              error: `Unknown tour status: ${String((result as { status: string }).status)}`,
            };
        }
      } catch (err) {
        log.debug("code_tour error", { error: err });
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
