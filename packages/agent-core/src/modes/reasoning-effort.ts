/**
 * Reasoning Effort Resolver
 *
 * Per-provider resolution of reasoning effort / thinking level,
 * with fallback chain from settings → mode spec → provider default.
 *
 * 逆向: chunk-002.js:18124-18137 — t7R(T, R, a)
 *   ```
 *   function t7R(T, R, a) {
 *     let [e, t] = T.includes("/") ? T.split("/", 2) : ["", T],
 *       r = a ? xi(a)?.reasoningEffort : void 0,
 *       h = R["agent.deepReasoningEffort"] !== void 0;
 *     switch (e) {
 *       case "anthropic":
 *         return R["anthropic.effort"] ?? r ?? "high";
 *       case "openai":
 *         return (t?.includes("codex") && h ? O2(R) : void 0) ?? r ?? "medium";
 *       case "vertexai":
 *         return R["gemini.thinkingLevel"] ?? r ?? "medium";
 *       default:
 *         return r ?? "medium";
 *     }
 *   }
 *   ```
 *
 * 逆向: chunk-001.js:6251-6252 — O2(T)
 *   O2(T) → T["agent.deepReasoningEffort"] ?? "high"
 */
import type { ReasoningEffort } from "@flitter/llm";
import type { Settings } from "@flitter/schemas";
import type { AgentMode } from "./agent-modes";
import { AGENT_MODES } from "./agent-modes";

// Re-export from @flitter/llm for convenience
export type { ReasoningEffort };

/**
 * Infer the provider name from a model ID string.
 *
 * Supports two formats:
 * - "provider/model" format: extracts "provider"
 * - bare model name: infers from prefix (claude -> anthropic, gpt/o3/o4/codex -> openai, gemini -> gemini)
 *
 * 逆向: t7R splits on "/" for the provider prefix, falls to default otherwise
 */
export function inferProviderFromModel(modelId: string): string {
  // "provider/model" format
  if (modelId.includes("/")) {
    return modelId.split("/", 2)[0];
  }

  // Prefix-based inference
  if (modelId.startsWith("claude-")) return "anthropic";
  if (modelId.startsWith("gpt-") || /^o[34]/.test(modelId) || modelId.startsWith("codex-"))
    return "openai";
  if (modelId.startsWith("gemini-")) return "gemini";

  // Unknown — return empty string (matches amp's default case)
  return "";
}

/**
 * Resolve the reasoning effort for a given model + settings + optional agent mode.
 *
 * Resolution chain (per provider):
 *
 * **Anthropic**: settings["anthropic.effort"] → mode.reasoningEffort → "high"
 * **OpenAI**:    (codex models with deepReasoningEffort set → O2(settings)) → mode.reasoningEffort → "medium"
 * **Gemini**:    settings["gemini.thinkingLevel"] → mode.reasoningEffort → "medium"
 * **Default**:   mode.reasoningEffort → "medium"
 *
 * 逆向: chunk-002.js:18124-18137 — t7R(T, R, a)
 *
 * @param modelId - Model identifier (e.g., "claude-opus-4-6", "openai/codex-mini")
 * @param settings - Current settings object
 * @param agentMode - Optional agent mode key
 * @returns Resolved reasoning effort, or undefined if no effort should be applied
 */
export function resolveReasoningEffort(
  modelId: string,
  settings: Settings,
  agentMode?: AgentMode,
): ReasoningEffort | undefined {
  const provider = inferProviderFromModel(modelId);
  const modeSpec = agentMode ? AGENT_MODES[agentMode] : undefined;
  const modeEffort = modeSpec?.reasoningEffort as ReasoningEffort | undefined;

  // Extract the bare model name (after provider/ prefix if present)
  const bareModel = modelId.includes("/") ? modelId.split("/", 2)[1] : modelId;

  switch (provider) {
    case "anthropic":
      // 逆向: return R["anthropic.effort"] ?? r ?? "high"
      return (settings["anthropic.effort"] as ReasoningEffort | undefined) ?? modeEffort ?? undefined;

    case "openai": {
      // 逆向: return (t?.includes("codex") && h ? O2(R) : void 0) ?? r ?? "medium"
      // O2(R) = R["agent.deepReasoningEffort"] ?? "high"
      const hasDeepEffortSetting = settings["agent.deepReasoningEffort"] !== undefined;
      const codexEffort =
        bareModel?.includes("codex") && hasDeepEffortSetting
          ? ((settings["agent.deepReasoningEffort"] as ReasoningEffort) ?? "high")
          : undefined;
      return codexEffort ?? modeEffort ?? "medium";
    }

    case "vertexai":
    case "gemini":
      // 逆向: return R["gemini.thinkingLevel"] ?? r ?? "medium"
      return (settings["gemini.thinkingLevel"] as ReasoningEffort | undefined) ?? modeEffort ?? "medium";

    default:
      // 逆向: return r ?? "medium"
      return modeEffort ?? "medium";
  }
}
