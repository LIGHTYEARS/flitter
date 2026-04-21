/**
 * Subagent Type Registry — maps subagent types to their tool access patterns.
 *
 * 逆向: amp-cli-reversed/chunk-005.js (2026_tail_anonymous.js) ~line 64997
 *   qe object defines subagent configs: { toolPatterns, model, allowMcp, allowToolbox }
 *
 * Tool pattern arrays used in amp:
 *   KsT = ["Grep", "glob", "Read"]                          (finder)
 *   Q2  = ["Read", "Grep", "glob", "web_search", "read_web_page", "read_thread", "find_thread"]  (oracle)
 *   XsT = ["Read", "Grep", "glob", "web_search", "read_web_page", "Bash"]                        (code-review)
 *   VsT = ["Grep", "glob", "Read", "Bash", "edit_file", "create_file", ...]                      (task-subagent)
 *   YsT = ["Read", "Grep", "glob", "web_search", "read_web_page", "Bash", ...]                   (code-tour)
 *   QsT = ["Read", "Grep", "glob", "Bash"]                  (codereview-check)
 *   _9T = ["Read", "Grep", "glob", "finder"]                (walkthrough/planner)
 *
 * 逆向: _5R (modules/1362_unknown__5R.js) — creates filtered tool service wrapper
 *   Uses izT (modules/1361_unknown_izT.js) for glob pattern matching against tool names
 *   invokeTool returns error if tool not in patterns
 *   registerTool throws — subagents cannot register new tools
 */

/**
 * Subagent type configuration
 */
export interface SubAgentTypeConfig {
  /** Glob patterns for allowed tool names. ["*"] means all tools. */
  toolPatterns: string[];
  /** Whether to allow MCP tools (default: false) */
  allowMcp?: boolean;
  /** Whether to allow toolbox tools (default: false) */
  allowToolbox?: boolean;
}

/**
 * Registry mapping subagent type → tool configuration.
 *
 * 逆向: amp's qe object (2026_tail_anonymous.js:64997)
 *
 * Notes:
 * - "finder" is the most restrictive: read-only exploration tools
 * - "task-subagent" is the most permissive: can edit files, run commands, use MCP
 * - Default for unknown types: ["*"] (all tools)
 * - Model overrides per type are handled separately (in the spawn caller)
 */
export const SUBAGENT_TYPE_REGISTRY: Record<string, SubAgentTypeConfig> = {
  // 逆向: KsT = ["Grep", "glob", "Read"]
  finder: {
    toolPatterns: ["Grep", "Glob", "Read"],
    allowMcp: false,
    allowToolbox: false,
  },

  // 逆向: Q2 = ["Read", "Grep", "glob", "web_search", "read_web_page", "read_thread", "find_thread"]
  oracle: {
    toolPatterns: [
      "Read",
      "Grep",
      "Glob",
      "web_search",
      "read_web_page",
      "read_thread",
      "find_thread",
    ],
    allowMcp: false,
    allowToolbox: false,
  },

  // 逆向: XsT = ["Read", "Grep", "glob", "web_search", "read_web_page", "Bash"]
  "code-review": {
    toolPatterns: ["Read", "Grep", "Glob", "web_search", "read_web_page", "Bash"],
    allowMcp: false,
    allowToolbox: false,
  },

  // 逆向: YsT = ["Read", "Grep", "glob", "web_search", "read_web_page", "Bash", "eval_git_diff", "post_explanation"]
  "code-tour": {
    toolPatterns: [
      "Read",
      "Grep",
      "Glob",
      "web_search",
      "read_web_page",
      "Bash",
      "eval_git_diff",
      "post_explanation",
    ],
    allowMcp: false,
    allowToolbox: false,
  },

  // 逆向: QsT = ["Read", "Grep", "glob", "Bash"]
  "codereview-check": {
    toolPatterns: ["Read", "Grep", "Glob", "Bash"],
    allowMcp: false,
    allowToolbox: false,
  },

  // 逆向: _9T = ["Read", "Grep", "glob", "finder"]
  walkthrough: {
    toolPatterns: ["Read", "Grep", "Glob", "finder"],
    allowMcp: false,
    allowToolbox: false,
  },

  // 逆向: VsT (most permissive subagent — edit/create/bash/diagnostics/etc.)
  "task-subagent": {
    toolPatterns: [
      "Grep",
      "Glob",
      "Read",
      "Bash",
      "Edit",
      "Write",
      "ApplyPatch",
      "read_web_page",
      "web_search",
      "finder",
      "skill",
      "task_list",
      "look_at",
    ],
    allowMcp: true,
    allowToolbox: true,
  },

  // 逆向: Y2 (librarian — GitHub-specific tools)
  librarian: {
    toolPatterns: [
      "read_github",
      "search_github",
      "commit_search",
      "diff",
      "list_directory_github",
      "list_repositories",
      "glob_github",
    ],
    allowMcp: false,
    allowToolbox: false,
  },
};

/**
 * Get tool patterns for a subagent type.
 * Returns ["*"] for unknown types (allow all tools).
 *
 * 逆向: g5R (modules/1367_unknown_g5R.js) —
 *   `agentConfig.toolPatterns || ["*"]` (defaults to all tools if missing)
 */
export function getSubAgentToolPatterns(type: string): string[] {
  return SUBAGENT_TYPE_REGISTRY[type]?.toolPatterns ?? ["*"];
}

/**
 * Get the full config for a subagent type.
 */
export function getSubAgentTypeConfig(type: string): SubAgentTypeConfig | undefined {
  return SUBAGENT_TYPE_REGISTRY[type];
}
