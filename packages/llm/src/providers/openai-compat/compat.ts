/**
 * @flitter/llm — OpenAI-Compatible 预配置 & 自动检测
 *
 * 预配置已知的 OpenAI-compatible 端点，并支持从 baseURL 自动推断兼容配置。
 */
import type { OpenAICompatConfig } from "../../types";

// ─── Known Provider Configs ─────────────────────────────

/**
 * 预配置的已知 OpenAI-compatible provider
 *
 * 每个 provider 只需覆盖与默认值不同的字段。
 * 默认值参见 `mergeWithDefaults()`。
 */
export const KNOWN_COMPAT_CONFIGS: Record<string, Partial<OpenAICompatConfig>> = {
  xai: {
    baseURL: "https://api.x.ai/v1",
    supportsStore: false,
    supportsDeveloperRole: false,
    supportsReasoningEffort: false,
  },
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    supportsStore: false,
    supportsDeveloperRole: false,
  },
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    supportsStore: false,
    supportsDeveloperRole: false,
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    thinkingFormat: "openrouter",
    // 逆向: R7R/a7R (modules/1174_unknown_R7R.js, chunk-002.js:18107-18123)
    // Amp's OpenRouter body contains ONLY { model, messages, tools, stream: true }
    // — no store, no stream_options.include_usage, no prompt_cache_key
    supportsStore: false,
    supportsUsageInStreaming: false,
  },
  cerebras: {
    baseURL: "https://api.cerebras.ai/v1",
    supportsStore: false,
    supportsDeveloperRole: false,
  },
  // 逆向: amp-cli-reversed/modules/1085_unknown_Z4R.js
  fireworks: {
    baseURL: "https://api.fireworks.ai/inference/v1",
    supportsStore: false,
    supportsDeveloperRole: false,
    supportsReasoningEffort: false,
  },
  // 逆向: amp-cli-reversed/modules/1092_unknown_hLR.js, 1082_unknown_jUT.js
  baseten: {
    baseURL: "https://bridge.baseten.co/v1",
    supportsStore: false,
    supportsDeveloperRole: false,
    supportsReasoningEffort: false,
  },
  // 逆向: amp-cli-reversed/modules/1173_unknown_xWT.js
  moonshotai: {
    baseURL: "https://api.moonshot.cn/v1",
    supportsStore: false,
    supportsDeveloperRole: false,
    supportsReasoningEffort: false,
  },
};

// ─── Default Config ─────────────────────────────────────

const DEFAULTS: Required<Omit<OpenAICompatConfig, "headers">> = {
  baseURL: "https://api.openai.com/v1",
  supportsStore: true,
  supportsDeveloperRole: true,
  supportsReasoningEffort: true,
  supportsUsageInStreaming: true,
  maxTokensField: "max_completion_tokens",
  supportsStrictMode: true,
  thinkingFormat: "openai",
};

/**
 * 合并用户配置与默认值
 */
export function mergeWithDefaults(config: Partial<OpenAICompatConfig>): OpenAICompatConfig {
  return {
    ...DEFAULTS,
    ...config,
  };
}

// ─── Auto-detect from baseURL ───────────────────────────

const URL_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /api\.x\.ai/i, name: "xai" },
  { pattern: /api\.groq\.com/i, name: "groq" },
  { pattern: /api\.deepseek\.com/i, name: "deepseek" },
  { pattern: /openrouter\.ai/i, name: "openrouter" },
  { pattern: /api\.cerebras\.ai/i, name: "cerebras" },
  { pattern: /api\.fireworks\.ai/i, name: "fireworks" },
  { pattern: /baseten\.co/i, name: "baseten" },
  { pattern: /api\.moonshot\.cn/i, name: "moonshotai" },
];

/**
 * 从 baseURL 推断已知 provider 配置
 *
 * @returns 匹配的 known config 部分，或 undefined 如果无法识别
 */
export function detectCompatFromURL(baseURL: string): Partial<OpenAICompatConfig> | undefined {
  for (const { pattern, name } of URL_PATTERNS) {
    if (pattern.test(baseURL)) {
      return KNOWN_COMPAT_CONFIGS[name];
    }
  }
  return undefined;
}

/**
 * 获取已知 provider 的配置
 */
export function getKnownConfig(name: string): Partial<OpenAICompatConfig> | undefined {
  return KNOWN_COMPAT_CONFIGS[name];
}
