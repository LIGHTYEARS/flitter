/**
 * @flitter/llm — OAuth Module Re-exports
 */

export type { CallbackServerOptions, CallbackServerResult } from "./callback-server";
// Callback Server
export { startCallbackServer } from "./callback-server";
// Cross-process file locking
export type { AcquireLockResult, LockData } from "./lock";
export {
  acquireOAuthLock,
  getLockDir,
  getLockPath,
  isLockStale,
  LOCK_POLL_INTERVAL_MS,
  LOCK_WAIT_TIMEOUT_MS,
  readOAuthLock,
  releaseOAuthLock,
  resetLockDir,
  STALE_LOCK_TIMEOUT_MS,
  setLockDir,
} from "./lock";
// PKCE
export { generatePKCE } from "./pkce";
// Provider implementations
export { AnthropicOAuthProvider } from "./providers/anthropic";
export { GitHubCopilotOAuthProvider } from "./providers/github-copilot";
export { OpenAICodexOAuthProvider } from "./providers/openai-codex";
// Registry
export {
  clearOAuthProviders,
  getOAuthApiKey,
  getOAuthProvider,
  getOAuthProviders,
  registerOAuthProvider,
} from "./registry";
// Types
export type {
  OAuthCredentials,
  OAuthLoginCallbacks,
  OAuthProviderInterface,
} from "./types";
