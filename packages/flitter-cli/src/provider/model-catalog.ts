// ModelCatalog — static catalog of ~40 well-known models.
//
// Derived from AMP's n8 model catalog object (34_providers_models_catalog.js).
// Each entry contains provider, display name, context window, max output tokens,
// capabilities list, optional reasoning effort levels, and pricing.
//
// Exports:
//   MODEL_CATALOG: ModelEntry[]    — full catalog array
//   findModel(id): ModelEntry      — lookup by model ID (exact or prefix match)

import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// ModelEntry interface
// ---------------------------------------------------------------------------

/** A single model entry in the catalog. */
export interface ModelEntry {
  /** Model ID as used in API calls (e.g. "claude-sonnet-4-20250514"). */
  id: string;
  /** Provider key (e.g. "anthropic", "openai", "xai"). */
  provider: string;
  /** Human-readable display name. */
  displayName: string;
  /** Maximum input context window in tokens. */
  contextWindow: number;
  /** Maximum output tokens per response. */
  maxOutputTokens: number;
  /** Capability tags (e.g. "reasoning", "vision", "tools"). */
  capabilities: string[];
  /** Optional supported reasoning effort levels. */
  reasoningEffort?: string[];
  /** Optional per-million-token pricing in USD. */
  pricing?: { input: number; output: number };
}

// ---------------------------------------------------------------------------
// MODEL_CATALOG — ~40 models from AMP n8 catalog
// ---------------------------------------------------------------------------

/**
 * Static model catalog with ~40 well-known models.
 * Sourced from AMP's n8 object in 34_providers_models_catalog.js.
 *
 * Organized by provider: Anthropic, OpenAI, xAI, Vertex/Gemini,
 * Cerebras, Fireworks, Baseten, Moonshot, OpenRouter.
 */
export const MODEL_CATALOG: ModelEntry[] = [
  // ===================== Anthropic =====================
  {
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    displayName: 'Claude Sonnet 4',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    reasoningEffort: ['medium', 'high', 'xhigh'],
    pricing: { input: 3, output: 15 },
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    displayName: 'Claude Sonnet 4.5',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    reasoningEffort: ['medium', 'high', 'xhigh'],
    pricing: { input: 3, output: 15 },
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    displayName: 'Claude Sonnet 4.6',
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    reasoningEffort: ['medium', 'high', 'xhigh'],
    pricing: { input: 3, output: 15 },
  },
  {
    id: 'claude-opus-4-20250514',
    provider: 'anthropic',
    displayName: 'Claude Opus 4',
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    reasoningEffort: ['medium', 'high', 'xhigh'],
    pricing: { input: 15, output: 75 },
  },
  {
    id: 'claude-opus-4-1-20250805',
    provider: 'anthropic',
    displayName: 'Claude Opus 4.1',
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    reasoningEffort: ['medium', 'high', 'xhigh'],
    pricing: { input: 15, output: 75 },
  },
  {
    id: 'claude-opus-4-5-20251101',
    provider: 'anthropic',
    displayName: 'Claude Opus 4.5',
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    reasoningEffort: ['medium', 'high', 'xhigh'],
    pricing: { input: 5, output: 25 },
  },
  {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    displayName: 'Claude Opus 4.6',
    contextWindow: 332_000,
    maxOutputTokens: 32_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    reasoningEffort: ['medium', 'high', 'xhigh'],
    pricing: { input: 5, output: 25 },
  },
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    displayName: 'Claude Haiku 4.5',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    pricing: { input: 1, output: 5 },
  },

  // ===================== OpenAI =====================
  {
    id: 'gpt-5',
    provider: 'openai',
    displayName: 'GPT-5',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    pricing: { input: 1.25, output: 10 },
  },
  {
    id: 'gpt-5.1',
    provider: 'openai',
    displayName: 'GPT-5.1',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    pricing: { input: 1.25, output: 10 },
  },
  {
    id: 'gpt-5.2',
    provider: 'openai',
    displayName: 'GPT-5.2',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    pricing: { input: 1.75, output: 14 },
  },
  {
    id: 'gpt-5.4',
    provider: 'openai',
    displayName: 'GPT-5.4',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    reasoningEffort: ['medium', 'high', 'xhigh'],
    pricing: { input: 2.5, output: 15 },
  },
  {
    id: 'gpt-5-codex',
    provider: 'openai',
    displayName: 'GPT-5 Codex',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    capabilities: ['reasoning', 'tools'],
    pricing: { input: 1.25, output: 10 },
  },
  {
    id: 'gpt-5.1-codex',
    provider: 'openai',
    displayName: 'GPT-5.1 Codex',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    capabilities: ['reasoning', 'tools'],
    pricing: { input: 1.25, output: 10 },
  },
  {
    id: 'gpt-5.2-codex',
    provider: 'openai',
    displayName: 'GPT-5.2 Codex',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    capabilities: ['reasoning', 'tools', 'vision'],
    pricing: { input: 1.75, output: 14 },
  },
  {
    id: 'gpt-5.3-codex',
    provider: 'openai',
    displayName: 'GPT-5.3 Codex',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    capabilities: ['reasoning', 'tools', 'vision'],
    pricing: { input: 1.75, output: 14 },
  },
  {
    id: 'gpt-5-mini',
    provider: 'openai',
    displayName: 'GPT-5 Mini',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    pricing: { input: 0.25, output: 2 },
  },
  {
    id: 'gpt-5-nano',
    provider: 'openai',
    displayName: 'GPT-5 Nano',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    capabilities: ['reasoning', 'vision', 'tools'],
    pricing: { input: 0.05, output: 0.4 },
  },
  {
    id: 'o3',
    provider: 'openai',
    displayName: 'o3',
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    capabilities: ['reasoning', 'tools'],
    pricing: { input: 2, output: 8 },
  },
  {
    id: 'o3-mini',
    provider: 'openai',
    displayName: 'o3-mini',
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    capabilities: ['reasoning', 'tools'],
    pricing: { input: 1.1, output: 4.4 },
  },
  {
    id: 'openai/gpt-oss-120b',
    provider: 'openai',
    displayName: 'GPT OSS 120B',
    contextWindow: 128_000,
    maxOutputTokens: 32_000,
    capabilities: ['reasoning', 'tools'],
  },
  {
    id: 'gpt-4.1-mini',
    provider: 'openai',
    displayName: 'GPT-4.1 Mini',
    contextWindow: 1_047_576,
    maxOutputTokens: 32_768,
    capabilities: ['reasoning', 'vision', 'tools'],
    pricing: { input: 0.4, output: 1.6 },
  },

  // ===================== xAI =====================
  {
    id: 'grok-code-fast-1',
    provider: 'xai',
    displayName: 'Grok Code Fast 1',
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    capabilities: ['reasoning', 'tools'],
  },

  // ===================== Vertex / Gemini =====================
  {
    id: 'gemini-3-pro-preview',
    provider: 'vertexai',
    displayName: 'Gemini 3 Pro Preview',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    capabilities: ['tools', 'reasoning', 'vision'],
  },
  {
    id: 'gemini-3.1-pro-preview',
    provider: 'vertexai',
    displayName: 'Gemini 3.1 Pro Preview',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    capabilities: ['tools', 'reasoning', 'vision'],
  },
  {
    id: 'gemini-3-flash-preview',
    provider: 'vertexai',
    displayName: 'Gemini 3 Flash Preview',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    capabilities: ['tools', 'reasoning', 'vision'],
  },
  {
    id: 'gemini-3-pro-image-preview',
    provider: 'vertexai',
    displayName: 'Gemini 3 Pro Image',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    capabilities: ['vision', 'imageGeneration'],
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'vertexai',
    displayName: 'Gemini 2.5 Flash',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    capabilities: ['tools', 'reasoning', 'vision'],
    pricing: { input: 0.15, output: 0.6 },
  },

  // ===================== Cerebras =====================
  {
    id: 'zai-glm-4.7',
    provider: 'cerebras',
    displayName: 'Z.ai GLM 4.7',
    contextWindow: 131_000,
    maxOutputTokens: 40_000,
    capabilities: ['tools'],
  },

  // ===================== Fireworks =====================
  {
    id: 'accounts/fireworks/models/qwen3-coder-480b-a35b-instruct',
    provider: 'fireworks',
    displayName: 'Qwen3 Coder 480B',
    contextWindow: 230_144,
    maxOutputTokens: 32_000,
    capabilities: ['tools'],
  },
  {
    id: 'accounts/fireworks/models/kimi-k2-instruct-0905',
    provider: 'fireworks',
    displayName: 'Kimi K2 Instruct',
    contextWindow: 230_144,
    maxOutputTokens: 32_000,
    capabilities: ['tools'],
  },
  {
    id: 'accounts/fireworks/models/qwen3-235b-a22b-instruct-2507',
    provider: 'fireworks',
    displayName: 'Qwen3 235B',
    contextWindow: 230_144,
    maxOutputTokens: 32_000,
    capabilities: ['tools'],
  },
  {
    id: 'accounts/fireworks/models/glm-4p6',
    provider: 'fireworks',
    displayName: 'GLM 4P6',
    contextWindow: 162_752,
    maxOutputTokens: 40_000,
    capabilities: ['tools', 'reasoning'],
  },
  {
    id: 'accounts/fireworks/models/glm-5',
    provider: 'fireworks',
    displayName: 'GLM 5',
    contextWindow: 202_800,
    maxOutputTokens: 40_000,
    capabilities: ['tools'],
    pricing: { input: 1, output: 3.2 },
  },
  {
    id: 'accounts/fireworks/models/minimax-m2p5',
    provider: 'fireworks',
    displayName: 'MiniMax M2.5',
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    capabilities: ['tools'],
    pricing: { input: 0.3, output: 1.2 },
  },

  // ===================== Baseten =====================
  {
    id: 'moonshotai/Kimi-K2.5',
    provider: 'baseten',
    displayName: 'Kimi K2.5',
    contextWindow: 262_144,
    maxOutputTokens: 32_000,
    capabilities: ['tools', 'vision'],
    pricing: { input: 0.6, output: 3 },
  },

  // ===================== Moonshot =====================
  {
    id: 'kimi-k2-instruct-0905',
    provider: 'moonshotai',
    displayName: 'Kimi K2 Instruct',
    contextWindow: 1_000_000,
    maxOutputTokens: 32_000,
    capabilities: ['tools'],
  },

  // ===================== OpenRouter =====================
  {
    id: 'sonoma-sky-alpha',
    provider: 'openrouter',
    displayName: 'Sonoma Sky Alpha',
    contextWindow: 256_000,
    maxOutputTokens: 32_000,
    capabilities: ['tools'],
  },
  {
    id: 'z-ai/glm-4.6',
    provider: 'openrouter',
    displayName: 'OpenRouter GLM 4.6',
    contextWindow: 131_000,
    maxOutputTokens: 40_000,
    capabilities: ['tools'],
  },
  {
    id: 'moonshotai/kimi-k2-0905',
    provider: 'openrouter',
    displayName: 'Kimi K2 0905 (OpenRouter)',
    contextWindow: 262_144,
    maxOutputTokens: 32_000,
    capabilities: ['tools'],
  },
  {
    id: 'qwen/qwen3-coder',
    provider: 'openrouter',
    displayName: 'Qwen3 Coder 480B (OpenRouter)',
    contextWindow: 230_144,
    maxOutputTokens: 32_000,
    capabilities: ['tools'],
  },
];

// ---------------------------------------------------------------------------
// Lookup index (built lazily)
// ---------------------------------------------------------------------------

/** Lazy-initialized index for O(1) lookups by exact model ID. */
let _indexById: Map<string, ModelEntry> | null = null;

/**
 * Build or return the cached lookup index.
 * Called once on first findModel() invocation.
 */
function getIndex(): Map<string, ModelEntry> {
  if (!_indexById) {
    _indexById = new Map<string, ModelEntry>();
    for (const entry of MODEL_CATALOG) {
      _indexById.set(entry.id, entry);
    }
  }
  return _indexById;
}

// ---------------------------------------------------------------------------
// findModel
// ---------------------------------------------------------------------------

/**
 * Find a model entry by ID.
 *
 * Tries exact match first, then falls back to prefix match
 * (e.g. "claude-sonnet-4" matches "claude-sonnet-4-20250514").
 *
 * @param id - Model ID to search for
 * @returns The matching ModelEntry, or undefined if not found
 */
export function findModel(id: string): ModelEntry | undefined {
  const index = getIndex();

  // Exact match
  const exact = index.get(id);
  if (exact) {
    log.debug(`[model-catalog] findModel: exact match for '${id}'`);
    return exact;
  }

  // Prefix match: find the first entry whose ID starts with the query
  for (const entry of MODEL_CATALOG) {
    if (entry.id.startsWith(id)) {
      log.debug(`[model-catalog] findModel: prefix match '${id}' -> '${entry.id}'`);
      return entry;
    }
  }

  log.debug(`[model-catalog] findModel: no match for '${id}'`);
  return undefined;
}
