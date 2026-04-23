/**
 * Agent Mode Definitions
 *
 * Defines the 4 agent modes (smart, fast, deep, auto) that control
 * model selection, reasoning effort, tool availability, and system prompt behavior.
 *
 * 逆向: chunk-005.js:67177-67333 — Ab object (mode definitions)
 *   Ab = {
 *     SMART: { key: "smart", displayName: "Smart", primaryModel: ya("CLAUDE_OPUS_4_6"), ... },
 *     RUSH:  { key: "rush",  displayName: "Rush",  primaryModel: ya("CLAUDE_HAIKU_4_5"), ... },
 *     DEEP:  { key: "deep",  displayName: "Deep",  primaryModel: ya("GPT_5_4"), reasoningEffort: "high", ... },
 *     ...
 *   }
 *
 * 逆向: chunk-001.js:6230-6234 — xi(T) finds mode spec, nk(T) returns model
 *   xi(T) → Object.values(Ab).find(R => R.key === T)
 *   nk(T) → xi(T)?.primaryModel ?? ya("CLAUDE_SONNET_4_5")
 *
 * 逆向: chunk-001.js:6169-6171 — qo(T) checks deep reasoning mode
 *   qo(T) → T === "deep" || T === C0T  (C0T is the "internal" mode key)
 *
 * 逆向: chunk-001.js:6251-6252 — O2(T) gets deep reasoning effort
 *   O2(T) → T["agent.deepReasoningEffort"] ?? "high"
 *
 * Flitter mapping:
 *   amp "rush" → flitter "fast"
 *   amp "deep" uses GPT-5.4 → flitter uses claude-opus-4-6 with high reasoning effort
 *   amp "auto" doesn't exist as a mode → flitter adds it with claude-sonnet-4-6 default
 */

// ─── Types ──────────────────────────────────────────────

/** Agent mode identifier */
export type AgentMode = "smart" | "fast" | "deep" | "auto" | "rush" | "large" | "free";

/** Agent mode specification */
export interface AgentModeSpec {
  /** Mode key (matches AgentMode type) */
  key: AgentMode;
  /** Human-readable display name */
  displayName: string;
  /** Description shown in mode picker / help */
  description: string;
  /**
   * Primary model for this mode.
   * 逆向: Ab.SMART.primaryModel = ya("CLAUDE_OPUS_4_6")
   */
  primaryModel: string;
  /**
   * Default reasoning effort for this mode.
   * Only set for deep-reasoning modes.
   * 逆向: Ab.DEEP.reasoningEffort = "high"
   */
  reasoningEffort?: "low" | "medium" | "high" | "max";
  /**
   * Tool name allowlist. Empty array = all tools available.
   * 逆向: Ab.SMART.includeTools = UW (full set)
   */
  includeTools: string[];
  /**
   * Tools loaded lazily via skill tool (not included in initial tool list).
   * 逆向: Ab.SMART.deferredTools = HW = ["code_tour","code_review","walkthrough","walkthrough_diagram"]
   */
  deferredTools: string[];
}

// ─── Tool Lists per Mode ────────────────────────────────

/**
 * Tool name constants for mode restriction.
 *
 * 逆向: chunk-005.js:67177
 *   UW (smart/large) — full set of ~27 tools
 *   $iT (rush/fast) — ~24 tools, no restore_snapshot/code_tour/repl
 *   SiT (deep) — ~17 tools, shell_command + apply_patch instead of Read/Edit/etc
 *   HW / viT — deferred tools (lazy-loaded via skill)
 *
 * Mapping amp tool names → flitter:
 *   create_file → Write, edit_file → Edit, glob → Glob
 *   task_list → todo_read/todo_write, undo_edit → (not yet), painter → (not yet)
 *   MCP tools (read_mcp_resource) pass through unconditionally regardless of includeTools.
 */
const SMART_TOOLS = [
  "Read",
  "finder",
  "Bash",
  "repl",
  "Write",
  "Edit",
  "web_search",
  "read_web_page",
  "todo_read",
  "todo_write",
  "read_thread",
  "find_thread",
  "skill",
  "oracle",
  "librarian",
  "Task",
  "Grep",
  "Glob",
  "mermaid",
  "chart",
  "look_at",
  "get_diagnostics",
  "handoff",
  "restore_snapshot",
  "delete_file",
  "FuzzyFind",
  "apply_patch",
  "shell_command",
  "thread_status",
  "send_message_to_thread",
];

const FAST_TOOLS = [
  "Read",
  "Grep",
  "Glob",
  "finder",
  "Bash",
  "Write",
  "Edit",
  "get_diagnostics",
  "web_search",
  "read_web_page",
  "mermaid",
  "chart",
  "read_thread",
  "find_thread",
  "skill",
  "oracle",
  "handoff",
  "librarian",
  "Task",
  "todo_read",
  "todo_write",
  "look_at",
  "delete_file",
  "FuzzyFind",
  "apply_patch",
  "shell_command",
];

const DEEP_TOOLS = [
  "shell_command",
  "apply_patch",
  "web_search",
  "read_web_page",
  "mermaid",
  "chart",
  "skill",
  "read_thread",
  "find_thread",
  "librarian",
  "oracle",
  "finder",
  "handoff",
  "todo_read",
  "todo_write",
  "thread_status",
  "send_message_to_thread",
];

// 逆向: chunk-005.js:67177 — HW = ["code_tour","code_review","walkthrough","walkthrough_diagram"]
// code_tour is deferred (loaded via skill tool) in smart and large modes.
const SMART_DEFERRED = ["code_review", "code_tour"];
const DEEP_DEFERRED = ["code_review"];

/**
 * Free tier tool list.
 *
 * 逆向: giT (2026_tail_anonymous.js:61010)
 *   16 tools — reduced set without undo_edit, oracle, handoff, librarian,
 *   Task (subagent), code_tour, painter, look_at, restore_snapshot.
 *
 * Mapping amp → flitter: create_file→Write, edit_file→Edit, glob→Glob,
 *   task_list→todo_read/todo_write
 */
const FREE_TOOLS = [
  "Read",
  "Grep",
  "Glob",
  "finder",
  "Bash",
  "Write",
  "Edit",
  "get_diagnostics",
  "web_search",
  "read_web_page",
  "todo_read",
  "todo_write",
  "read_thread",
  "find_thread",
  "mermaid",
  "chart",
  "skill",
];

// ─── Mode Definitions ───────────────────────────────────

/**
 * All agent mode specifications.
 *
 * 逆向: chunk-005.js:67177 — Ab object
 *
 * Notes on model mapping:
 * - smart: claude-opus-4-6 (amp: CLAUDE_OPUS_4_6)
 * - fast:  claude-haiku-4-5-20251001 (amp "rush": CLAUDE_HAIKU_4_5)
 * - deep:  claude-opus-4-6 with high effort (amp: GPT_5_4 — Flitter uses Anthropic)
 * - auto:  claude-sonnet-4-6 (Flitter extension — no direct amp equivalent)
 */
export const AGENT_MODES: Record<AgentMode, AgentModeSpec> = {
  smart: {
    key: "smart",
    displayName: "Smart",
    description: "The most capable model and set of tools",
    primaryModel: "claude-opus-4-6",
    includeTools: SMART_TOOLS,
    deferredTools: SMART_DEFERRED,
  },
  fast: {
    key: "fast",
    displayName: "Fast",
    description: "Faster and cheaper for small, well-defined tasks",
    primaryModel: "claude-haiku-4-5-20251001",
    includeTools: FAST_TOOLS,
    deferredTools: [],
  },
  deep: {
    key: "deep",
    displayName: "Deep",
    description: "Extended reasoning for complex problems",
    primaryModel: "claude-opus-4-6",
    reasoningEffort: "high",
    includeTools: DEEP_TOOLS,
    deferredTools: DEEP_DEFERRED,
  },
  auto: {
    key: "auto",
    displayName: "Auto",
    description: "Automatically selects mode based on task complexity",
    primaryModel: "claude-sonnet-4-6",
    includeTools: [], // empty = all tools allowed
    deferredTools: [],
  },
  // 逆向: Ab.RUSH (chunk-005.js:67221-67242)
  // amp "rush" = fast model (Haiku) with animation hints
  // Flitter maps this as alias for "fast" with same model
  rush: {
    key: "rush",
    displayName: "Rush",
    description: "Faster and cheaper for small, well-defined tasks (alias for fast)",
    primaryModel: "claude-haiku-4-5-20251001",
    includeTools: FAST_TOOLS,
    deferredTools: [],
  },
  // 逆向: Ab.LARGE (chunk-005.js:67263-67284)
  // amp "large" = largest context window (Opus 4.6 1M tokens)
  large: {
    key: "large",
    displayName: "Large",
    description: "The biggest context window possible, for large tasks",
    primaryModel: "claude-opus-4-6",
    includeTools: SMART_TOOLS,
    deferredTools: SMART_DEFERRED,
  },
  // 逆向: Ab.FREE (2026_tail_anonymous.js:61034-61052)
  // Free tier mode — limited model (Haiku) and reduced tool set.
  // 逆向: qt(T) → T === "free" || T.startsWith("free-") (chunk-001.js:6241)
  free: {
    key: "free",
    displayName: "Free",
    description: "Flitter Free — limited model and tools for free-tier users",
    primaryModel: "claude-haiku-4-5-20251001",
    includeTools: FREE_TOOLS,
    deferredTools: [],
  },
};

// ─── Helpers ────────────────────────────────────────────

/**
 * Get the mode spec for a given mode key.
 *
 * 逆向: chunk-001.js:6230 — xi(T) → Object.values(Ab).find(R => R.key === T)
 */
export function getModeSpec(mode: AgentMode): AgentModeSpec {
  return AGENT_MODES[mode];
}

/**
 * Get the primary model for a given mode.
 *
 * 逆向: chunk-001.js:6233-6234
 *   nk(T) → xi(T)?.primaryModel ?? ya("CLAUDE_SONNET_4_5")
 *
 * @param mode - Agent mode key
 * @returns Model identifier string
 */
export function getModelForMode(mode: AgentMode): string {
  return AGENT_MODES[mode]?.primaryModel ?? "claude-sonnet-4-20250514";
}

/**
 * Check if a mode uses deep reasoning (extended thinking / high effort).
 *
 * 逆向: chunk-001.js:6169
 *   qo(T) → T === "deep" || T === C0T
 *
 * Flitter simplifies: only "deep" mode triggers deep reasoning.
 * (amp's C0T/"internal" mode is not exposed in Flitter)
 */
export function isDeepReasoningMode(mode: AgentMode): boolean {
  return mode === "deep";
}

/**
 * Validate that a string is a valid AgentMode.
 *
 * @param value - Candidate string
 * @returns true if value is a valid AgentMode
 */
export function isValidAgentMode(value: string): value is AgentMode {
  return (
    value === "smart" ||
    value === "fast" ||
    value === "deep" ||
    value === "auto" ||
    value === "rush" ||
    value === "large" ||
    value === "free"
  );
}

/**
 * Check if a mode is the free tier.
 *
 * 逆向: chunk-001.js:6241 — qt(T)
 *   qt(T) → T === "free" || T.startsWith("free-")
 *
 * Used to select the abbreviated free-mode system prompt and
 * enforce usage limits.
 *
 * @param mode - Agent mode key
 * @returns true if the mode is a free-tier variant
 */
export function isFreeMode(mode: AgentMode | string): boolean {
  return mode === "free" || mode.startsWith("free-");
}

/**
 * Check if a tool is allowed in a given agent mode.
 *
 * 逆向: modules/1614_unknown_IiT.js:23-36 — IiT(toolName, modeKey)
 *   ```
 *   function IiT(T, R) {
 *     let a = xi(R);              // get mode spec
 *     if (!a) return false;
 *     if (a.includeTools) {        // if mode restricts tools:
 *       if (a.deferredTools?.includes(T)) return true; // deferred always OK
 *       return a.includeTools.includes(T);             // must be in include list
 *     }
 *     return true;                 // no restriction → allow all
 *   }
 *   ```
 *
 * MCP tools (prefixed with "mcp__") are always allowed regardless of mode,
 * matching amp's behavior where source === "mcp" bypasses IiT.
 *
 * @param toolName - Tool name to check
 * @param mode - Agent mode key
 * @returns true if the tool is allowed in the given mode
 */
export function isToolAllowedInMode(toolName: string, mode: AgentMode): boolean {
  const spec = AGENT_MODES[mode];
  if (!spec) return false;

  // MCP tools always pass through (逆向: chunk-005.js L420-427 source check)
  if (toolName.startsWith("mcp__")) return true;

  // Empty includeTools = all tools allowed (auto mode, or future extension)
  if (spec.includeTools.length === 0) return true;

  // Deferred tools are always allowed (loaded lazily via skill)
  if (spec.deferredTools.includes(toolName)) return true;

  // Must be in the include list
  return spec.includeTools.includes(toolName);
}
