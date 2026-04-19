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
export type AgentMode = "smart" | "fast" | "deep" | "auto" | "rush" | "large";

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
    includeTools: [], // all tools
    deferredTools: ["code_review", "code_tour"],
  },
  fast: {
    key: "fast",
    displayName: "Fast",
    description: "Faster and cheaper for small, well-defined tasks",
    primaryModel: "claude-haiku-4-5-20251001",
    includeTools: [], // all tools, smaller model
    deferredTools: [],
  },
  deep: {
    key: "deep",
    displayName: "Deep",
    description: "Extended reasoning for complex problems",
    primaryModel: "claude-opus-4-6",
    reasoningEffort: "high",
    includeTools: [],
    deferredTools: [],
  },
  auto: {
    key: "auto",
    displayName: "Auto",
    description: "Automatically selects mode based on task complexity",
    primaryModel: "claude-sonnet-4-6",
    includeTools: [],
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
    includeTools: [],
    deferredTools: [],
  },
  // 逆向: Ab.LARGE (chunk-005.js:67263-67284)
  // amp "large" = largest context window (Opus 4.6 1M tokens)
  large: {
    key: "large",
    displayName: "Large",
    description: "The biggest context window possible, for large tasks",
    primaryModel: "claude-opus-4-6",
    includeTools: [],
    deferredTools: ["code_review", "code_tour"],
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
    value === "large"
  );
}
