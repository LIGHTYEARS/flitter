/**
 * @flitter/llm — OAuth Module Re-exports
 */

// Types
export type {
  OAuthCredentials,
  OAuthLoginCallbacks,
  OAuthProviderInterface,
} from "./types";

// PKCE
export { generatePKCE } from "./pkce";

// Callback Server
export { startCallbackServer } from "./callback-server";
export type { CallbackServerOptions, CallbackServerResult } from "./callback-server";

// Registry
export {
  registerOAuthProvider,
  getOAuthProvider,
  getOAuthProviders,
  getOAuthApiKey,
  clearOAuthProviders,
} from "./registry";

// Provider implementations
export { AnthropicOAuthProvider } from "./providers/anthropic";
export { OpenAICodexOAuthProvider } from "./providers/openai-codex";
export { GitHubCopilotOAuthProvider } from "./providers/github-copilot";
