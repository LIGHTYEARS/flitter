/**
 * @flitter/llm — LLM Provider Core Layer
 *
 * 统一的 LLM Provider 接口，支持 Anthropic / OpenAI / Gemini / OpenAI-Compatible 四大模型厂商。
 * Provider 通过各自的官方 SDK 通信，OpenAI-Compatible 层支持任意 ChatCompletion 端点。
 */

// ─── MCP ─────────────────────────────────────────────
export * from "./mcp/index";
// ─── OAuth ────────────────────────────────────────────
export type {
  CallbackServerOptions,
  CallbackServerResult,
  OAuthCredentials,
  OAuthLoginCallbacks,
  OAuthProviderInterface,
} from "./oauth/index";
export {
  AnthropicOAuthProvider,
  clearOAuthProviders,
  GitHubCopilotOAuthProvider,
  generatePKCE,
  getOAuthApiKey,
  getOAuthProvider,
  getOAuthProviders,
  OpenAICodexOAuthProvider,
  registerOAuthProvider,
  startCallbackServer,
} from "./oauth/index";
// ─── 核心类型 ───────────────────────────────────────────
export type { LLMProvider, MessageTransformer, ToolTransformer } from "./provider";

// ─── 具体 Provider (供直接使用) ─────────────────────────
export type { CreateMessageResponse } from "./providers/anthropic/provider";
export { AnthropicProvider } from "./providers/anthropic/provider";
export { BedrockProvider } from "./providers/bedrock/provider";
export { GeminiProvider } from "./providers/gemini/provider";
export { OpenAIProvider } from "./providers/openai/provider";
export { OpenAICompatProvider } from "./providers/openai-compat/provider";
// ─── Provider 工厂与注册 ────────────────────────────────
export {
  createProvider,
  getProviderForModel,
  resolveModel,
  resolveProvider,
} from "./providers/registry";
// ─── Transformer 基类 (供扩展使用) ─────────────────────
export { BaseMessageTransformer } from "./transformers/message-transformer";
export { BaseToolTransformer } from "./transformers/tool-transformer";
export type {
  BlockState,
  ModelInfo,
  OpenAICompatConfig,
  ProviderName,
  ReasoningEffort,
  StreamDelta,
  StreamParams,
  SystemPromptBlock,
  ToolDefinition,
} from "./types";
export { MODEL_REGISTRY, ProviderError, registerModel, TransformState } from "./types";
// ─── Utilities ─────────────────────────────────────────
export { calculateCost } from "./utils/calculate-cost";
export { isContextOverflow } from "./utils/overflow";
export { sanitizeSurrogates } from "./utils/sanitize-unicode";

// ─── Model Fallback Chain (Gap #26) ────────────────────
export {
  ModelFallbackChain,
  isOverloadedError,
  type FallbackChainConfig,
  type FallbackResolution,
  type ModelFallbackConfig,
} from "./model-fallback";

// ─── Internal API Client (Gap #18) ─────────────────────
export {
  ApiNotConfiguredError,
  InternalApiClient,
  type InternalApiClientConfig,
  type NewsItem,
  type UsageReport,
} from "./api-client";

// ─── Prompt Cache Tracker (Gap #29) ────────────────────
export {
  PromptCacheTracker,
  type CacheControlConfig,
  type CacheStats,
  type CacheUsageFields,
} from "./cache/prompt-cache";

// ─── Google GenAI Live Provider (Gap #27) ───────────────
export {
  GoogleGenAILiveProvider,
  type LiveConnectionState,
  type LiveProviderConfig,
  type LiveServerMessage,
} from "./providers/gemini/live-provider";

// ─── Vertex AI Auth (Gap #28) ──────────────────────────
export {
  resolveVertexAIConfig,
  type VertexAIConfig,
} from "./providers/gemini/provider";
