/**
 * @flitter/llm — LLM Provider Core Layer
 *
 * 统一的 LLM Provider 接口，支持 Anthropic / OpenAI / Gemini / OpenAI-Compatible 四大模型厂商。
 * Provider 通过各自的官方 SDK 通信，OpenAI-Compatible 层支持任意 ChatCompletion 端点。
 */

// ─── 核心类型 ───────────────────────────────────────────
export type { LLMProvider, MessageTransformer, ToolTransformer } from "./provider";
export type {
  StreamParams,
  StreamDelta,
  ToolDefinition,
  ModelInfo,
  ProviderName,
  ReasoningEffort,
  SystemPromptBlock,
  BlockState,
  OpenAICompatConfig,
} from "./types";
export { ProviderError, MODEL_REGISTRY, TransformState } from "./types";

// ─── Provider 工厂与注册 ────────────────────────────────
export {
  createProvider,
  resolveModel,
  resolveProvider,
  getProviderForModel,
} from "./providers/registry";

// ─── 具体 Provider (供直接使用) ─────────────────────────
export { AnthropicProvider } from "./providers/anthropic/provider";
export { OpenAIProvider } from "./providers/openai/provider";
export { GeminiProvider } from "./providers/gemini/provider";
export { OpenAICompatProvider } from "./providers/openai-compat/provider";

// ─── Utilities ─────────────────────────────────────────
export { calculateCost } from "./utils/calculate-cost";
export { isContextOverflow } from "./utils/overflow";
export { sanitizeSurrogates } from "./utils/sanitize-unicode";

// ─── Transformer 基类 (供扩展使用) ─────────────────────
export { BaseMessageTransformer } from "./transformers/message-transformer";
export { BaseToolTransformer } from "./transformers/tool-transformer";

// ─── OAuth ────────────────────────────────────────────
export type {
  OAuthCredentials,
  OAuthLoginCallbacks,
  OAuthProviderInterface,
  CallbackServerOptions,
  CallbackServerResult,
} from "./oauth/index";
export {
  generatePKCE,
  startCallbackServer,
  registerOAuthProvider,
  getOAuthProvider,
  getOAuthProviders,
  getOAuthApiKey,
  clearOAuthProviders,
  AnthropicOAuthProvider,
  OpenAICodexOAuthProvider,
  GitHubCopilotOAuthProvider,
} from "./oauth/index";

// ─── MCP ─────────────────────────────────────────────
export * from "./mcp/index";
