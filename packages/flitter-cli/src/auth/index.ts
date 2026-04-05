// auth/index.ts — barrel export for the authentication layer.

export { generateCodeVerifier, computeCodeChallenge, generateState } from './pkce';
export { waitForOAuthCallback } from './callback-server';
export { loadToken, saveToken, hasValidToken, type StoredToken } from './token-store';
export { authenticateChatGPT, refreshChatGPTToken, getChatGPTToken } from './chatgpt-oauth';
export { authenticateCopilot, getCopilotToken } from './copilot-oauth';
export {
  authenticateAntigravity,
  refreshAntigravityToken,
  getAntigravityToken,
  GEMINI_OPENAI_BASE_URL,
} from './antigravity-oauth';
