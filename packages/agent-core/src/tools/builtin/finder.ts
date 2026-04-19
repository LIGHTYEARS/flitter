/**
 * finder tool — Multi-step intelligent codebase search via sub-agent.
 *
 * 逆向: chunk-005.js:71164-71172 (qe.finder subagent config)
 *   - key: "finder"
 *   - displayName: "Finder"
 *   - model: CLAUDE_HAIKU_4_5
 *   - includeTools: KsT = ["Grep", "glob", "Read"]
 *   - allowMcp: false, allowToolbox: false
 *
 * 逆向: chunk-005.js:67167-67177 (aCT/eCT — finder constants)
 *   - aCT = new Set(["finder"]) — tools that ARE subagents
 *   - finder is a subagent tool, spawned via SubAgentManager
 *
 * Factory-created tool (needs SubAgentManager).
 */

import { createLogger } from "@flitter/util";
import type { SubAgentManager } from "../../subagent/subagent";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

const log = createLogger("tool:finder");

/**
 * Factory: create a finder ToolSpec bound to a SubAgentManager.
 *
 * 逆向: The finder tool spawns a sub-agent with a search-focused prompt
 * and access to Grep, glob, Read tools. The sub-agent performs multi-step
 * codebase exploration to answer the user's semantic query.
 */
export function createFinderTool(subAgentManager: SubAgentManager): ToolSpec {
  return {
    name: "finder",
    description: `Search the codebase for code, patterns, or concepts using intelligent multi-step search.

The finder tool performs semantic/conceptual searches across the codebase by using Grep, glob, and Read tools iteratively. Use it when:

- You need to find code related to a concept (not just a literal string)
- You need to understand how a feature is implemented across multiple files
- A simple grep/glob isn't sufficient to locate what you need
- You want to find all places where a particular pattern or architecture is used

The finder will:
1. Break down the search objective into sub-queries
2. Use Grep and glob to locate relevant files
3. Read files to verify relevance
4. Return a summary of findings with file paths and relevant code snippets

# Complementary to Grep
- Use Grep for literal string or regex searches
- Use finder for semantic/conceptual searches
- Use finder first to locate relevant code concepts`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "A natural-language description of what you're searching for in the codebase. Be specific about the concept, pattern, or functionality you need.",
        },
      },
      required: ["query"],
    },
    source: "builtin",
    isReadOnly: true,
    executionProfile: {
      // Finder subagents don't conflict with each other (can run in parallel)
      resourceKeys: [],
    },

    async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      const query = args.query as string;

      if (!query || typeof query !== "string") {
        return { status: "error", error: "Missing required field: query" };
      }

      log.debug("finder called", { query });

      try {
        // 逆向: amp spawns a subagent of type "finder" with a search-focused prompt
        // The subagent gets access to Grep, glob, Read tools only (KsT)
        const result = await subAgentManager.spawn({
          parentThreadId: context.threadId,
          prompt: `You are a code search assistant. Your task is to search the codebase to find information relevant to the following query:

"${query}"

Search strategy:
1. Start by using glob to understand the directory structure
2. Use Grep to search for relevant keywords, function names, and patterns
3. Use Read to examine promising files in detail
4. Follow import chains and references to build a complete picture

Return a clear summary of:
- Which files are relevant and why
- Key code snippets that answer the query
- Any patterns or conventions you noticed

Be thorough but concise. Focus on the most relevant findings.`,
          description: `Search: ${query.slice(0, 50)}`,
          type: "finder",
        });

        switch (result.status) {
          case "completed":
            return {
              status: "done",
              content: result.response || "(no results found)",
            };
          case "timeout":
            return {
              status: "error",
              error: `Finder search timed out. Partial results: ${result.response || "(none)"}`,
              content: result.response,
            };
          case "cancelled":
            return {
              status: "cancelled",
              error: "Finder search was cancelled",
              content: result.response,
            };
          case "error":
            return {
              status: "error",
              error: result.error ?? "Finder encountered an error",
              content: result.response,
            };
          default:
            return {
              status: "error",
              error: `Unknown finder status: ${String((result as { status: string }).status)}`,
            };
        }
      } catch (err) {
        log.debug("finder error", { error: err });
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
