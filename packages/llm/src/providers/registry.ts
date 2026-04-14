/**
 * @flitter/llm — Provider 工厂与模型路由注册表
 *
 * 提供 Provider 实例化、模型查找、模型→Provider 推断等功能
 *
 * @example
 * ```ts
 * import { createProvider, resolveProvider, getProviderForModel } from '@flitter/llm';
 *
 * const provider = createProvider('anthropic');
 * const name = resolveProvider('claude-sonnet-4-20250514'); // → "anthropic"
 * const auto = getProviderForModel('gpt-4o'); // → OpenAIProvider
 * ```
 */
import type { LLMProvider } from "../provider";
import type { ModelInfo, ProviderName } from "../types";
import { MODEL_REGISTRY } from "../types";
import { AnthropicProvider } from "./anthropic/provider";
import { GeminiProvider } from "./gemini/provider";
import { OpenAIProvider } from "./openai/provider";
import { OpenAICompatProvider } from "./openai-compat/provider";

// ─── Singleton cache ────────────────────────────────────

const _cache = new Map<ProviderName, LLMProvider>();

// ─── Prefix rules for fallback resolution ───────────────

const PREFIX_RULES: Array<{ match: (model: string) => boolean; provider: ProviderName }> = [
  { match: (m) => m.startsWith("claude-"), provider: "anthropic" },
  { match: (m) => m.startsWith("gpt-"), provider: "openai" },
  { match: (m) => /^o[34]/.test(m), provider: "openai" },
  { match: (m) => m.startsWith("codex-"), provider: "openai" },
  { match: (m) => m.startsWith("gemini-"), provider: "gemini" },
  { match: (m) => m.startsWith("grok-"), provider: "xai" },
];

const PROVIDER_ALIASES: Record<string, ProviderName> = {
  anthropic: "anthropic",
  openai: "openai",
  gemini: "gemini",
  vertexai: "gemini",
  xai: "xai",
};

// ─── Public API ─────────────────────────────────────────

/**
 * 创建 Provider 实例 (单例缓存)
 *
 * @throws ProviderError 如果 name 不是已知的 Provider
 */
export function createProvider(name: ProviderName): LLMProvider {
  const cached = _cache.get(name);
  if (cached) return cached;

  let provider: LLMProvider;
  switch (name) {
    case "anthropic":
      provider = new AnthropicProvider();
      break;
    case "openai":
      provider = new OpenAIProvider();
      break;
    case "gemini":
      provider = new GeminiProvider();
      break;
    case "xai":
      provider = new OpenAICompatProvider({ name: "xai" });
      break;
    case "openai-compat":
      provider = new OpenAICompatProvider();
      break;
    default:
      provider = new OpenAICompatProvider({ name });
      break;
  }

  _cache.set(name, provider);
  return provider;
}

/**
 * 从模型 ID 查找 ModelInfo
 *
 * 支持直接 ID (如 "gpt-4o") 和 "provider/model" 格式 (如 "anthropic/claude-sonnet-4-20250514")
 */
export function resolveModel(model: string): ModelInfo | undefined {
  // Direct lookup
  if (MODEL_REGISTRY[model]) {
    return MODEL_REGISTRY[model];
  }

  // "provider/model" format — extract model part
  const slashIdx = model.indexOf("/");
  if (slashIdx !== -1) {
    const modelPart = model.slice(slashIdx + 1);
    return MODEL_REGISTRY[modelPart];
  }

  return undefined;
}

/**
 * 从模型名推断 Provider
 *
 * 优先级:
 * 1. "provider/model" 格式 → 提取 provider 前缀
 * 2. MODEL_REGISTRY 精确查找 → 返回 provider
 * 3. 前缀匹配 fallback (claude-* → anthropic, gpt-* → openai, etc.)
 *
 * @throws ProviderError 如果无法推断
 */
export function resolveProvider(model: string): ProviderName {
  // 1. "provider/model" format
  const slashIdx = model.indexOf("/");
  if (slashIdx !== -1) {
    const prefix = model.slice(0, slashIdx);
    const providerName = PROVIDER_ALIASES[prefix];
    if (providerName) return providerName;
  }

  // 2. MODEL_REGISTRY lookup
  const info = MODEL_REGISTRY[model];
  if (info) return info.provider;

  // 3. Prefix fallback
  for (const rule of PREFIX_RULES) {
    if (rule.match(model)) return rule.provider;
  }

  // 4. Unknown model — default to anthropic (supports custom baseURL)
  return "anthropic";
}

/**
 * 一站式: 从模型名获取 Provider 实例
 *
 * @throws ProviderError 如果无法推断 Provider 或 Provider 未知
 */
export function getProviderForModel(model: string): LLMProvider {
  const name = resolveProvider(model);
  return createProvider(name);
}
