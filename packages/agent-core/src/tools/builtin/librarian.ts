/**
 * librarian — Codebase understanding subagent for remote repositories
 *
 * Spawns a CLAUDE_SONNET_4_6 subagent with GitHub-specific tools to answer
 * questions about large, complex codebases across repositories. Read-only —
 * librarian cannot edit files or run commands.
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:141818-141842 (IKR tool spec)
 *   - name: "librarian" (uc constant)
 *   - params: query (required), context (optional)
 *   - meta: { disableTimeout: !0 }
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:15506-15522 (mKR execution fn)
 *   - builds prompt as "Context: ...\n\nQuery: ..." when context provided
 *   - logs query[:100] and hasContext
 *   - resolves provider (bitbucket-enterprise or github)
 *   - launches subagent with spec qe.librarian
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:15524-15555 (fKR description)
 *   - full description text for librarian tool
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:15558-15597 (gKR system prompt)
 *   - "You are the Librarian, a specialized codebase understanding agent..."
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:65014-65020 (qe.librarian config)
 *   - Y2 = ["read_github", "search_github", "commit_search", "diff",
 *           "list_directory_github", "list_repositories", "glob_github"]
 *   - model: CLAUDE_SONNET_4_6
 *   - allowMcp: false, allowToolbox: false
 */

import type { SubAgentManager } from "../../subagent/subagent";
import type { ToolContext, ToolResult, ToolSpec } from "../types";

/** Librarian tools — must match SUBAGENT_TYPE_REGISTRY.librarian.toolPatterns */
const LIBRARIAN_TOOLS = [
  "read_github",
  "search_github",
  "commit_search",
  "diff",
  "list_directory_github",
  "list_repositories",
  "glob_github",
];

/**
 * Build the librarian's user prompt from query + context.
 *
 * 逆向: mKR (modules/2026_tail_anonymous.js:15506-15512)
 *   - if context: "Context: ${context}\n\nQuery: ${query}"
 *   - else: just query
 */
export function buildLibrarianPrompt(opts: { query: string; context?: string }): string {
  if (opts.context) {
    return `Context: ${opts.context}\n\nQuery: ${opts.query}`;
  }
  return opts.query;
}

/**
 * Create a Librarian ToolSpec bound to a SubAgentManager.
 *
 * 逆向: IKR (modules/2026_tail_anonymous.js:141818-141842)
 */
export function createLibrarianTool(subAgentManager: SubAgentManager): ToolSpec {
  return {
    name: "librarian",
    source: "builtin",
    isReadOnly: true,

    // 逆向: fKR (modules/2026_tail_anonymous.js:15524-15555)
    description: `The Librarian is a codebase-understanding subagent for
repositories outside the local workspace.

It can read public GitHub repositories, connected private GitHub repositories, and connected
Bitbucket Enterprise repositories.

Use this when you need deep understanding of existing code across one or more repositories:
- explaining architecture, flows, or subsystem design
- finding where a feature is implemented in an external codebase
- comparing patterns across repositories
- understanding how code evolved through commit history
- reading or diffing files in a remote repository

Do not use this for:
- local workspace reads or searches
- code modifications or implementations
- simple local lookups when a direct local tool is enough
- questions unrelated to understanding existing repositories

Guidance:
- name the repository or project when you know it
- ask a specific question or describe the feature or codepath you want understood
- include context about what you are trying to achieve
- expect a thorough answer suitable for sharing
- return the answer in full rather than summarizing it

Available tools: ${LIBRARIAN_TOOLS.join(", ")}

Examples:
- "How does authentication work in the Kubernetes codebase?"
- "Explain the architecture of the React rendering system"
- "Compare how different web frameworks handle routing"
- "What changed in commit abc123 in my private repository?"
- "Read the README from the main API repo on our Bitbucket Enterprise instance"`,

    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Your question about the codebase. Be specific about what you want to understand or explore.",
        },
        context: {
          type: "string",
          description:
            "Optional context about what you're trying to achieve or background information.",
        },
      },
      required: ["query"],
    },

    executionProfile: {
      // Librarian does not conflict with other tools
      resourceKeys: [],
      // 逆向: amp uses `meta: { disableTimeout: !0 }` on librarian
      disableTimeout: true,
    },

    async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      const query = args.query as string | undefined;
      const contextStr = args.context as string | undefined;

      if (!query) {
        return { status: "error", error: 'Missing required parameter "query"' };
      }

      // Build the prompt matching amp's mKR pattern
      const prompt = buildLibrarianPrompt({
        query,
        context: contextStr,
      });

      try {
        const result = await subAgentManager.spawn({
          parentThreadId: context.threadId,
          prompt,
          description: `Librarian: ${query.substring(0, 50)}${query.length > 50 ? "..." : ""}`,
          type: "librarian",
        });

        switch (result.status) {
          case "completed":
            return {
              status: "done",
              content: result.response || "(librarian returned no response)",
            };
          case "timeout":
            return {
              status: "error",
              error: `Librarian consultation timed out. Partial: ${result.response || "(none)"}`,
              content: result.response,
            };
          case "cancelled":
            return {
              status: "error",
              error: "Librarian consultation was cancelled",
              content: result.response,
            };
          case "error":
            return {
              status: "error",
              error: result.error ?? "Librarian encountered an error",
              content: result.response,
            };
          default:
            return {
              status: "error",
              error: `Unknown librarian status: ${String((result as { status: string }).status)}`,
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
