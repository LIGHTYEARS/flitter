/**
 * @flitter/llm — OAuth Core Types
 *
 * Defines interfaces for OAuth credential management and provider implementations.
 * Supports Authorization Code + PKCE, Device Code, and custom flows.
 */
import type { ModelInfo } from "../types";

// ─── Credentials ─────────────────────────────────────────

/**
 * OAuth credentials stored per-provider.
 * The consumer (CLI) handles persistence; the SDK provides interfaces only.
 */
export interface OAuthCredentials {
  /** Refresh token */
  refresh: string;
  /** Access token (short-lived) */
  access: string;
  /** Expiration timestamp (ms since epoch) */
  expires: number;
  /** Provider-specific fields (projectId, enterpriseUrl, etc.) */
  [key: string]: unknown;
}

// ─── Login Callbacks ─────────────────────────────────────

/**
 * Callbacks provided by the consumer during OAuth login flow.
 * These bridge the SDK (headless) with the UI layer (CLI/TUI).
 */
export interface OAuthLoginCallbacks {
  /** Called when the user should open a URL to authorize */
  onAuth: (info: { url: string; instructions?: string }) => void;
  /** Called when the user should enter a value (e.g., enterprise domain) */
  onPrompt: (prompt: { message: string; placeholder?: string }) => Promise<string>;
  /** Called to display progress messages */
  onProgress?: (message: string) => void;
  /** Called to let user manually paste an authorization code */
  onManualCodeInput?: () => Promise<string>;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

// ─── Provider Interface ──────────────────────────────────

/**
 * OAuth provider implementation interface.
 * Each provider (Anthropic, OpenAI Codex, GitHub Copilot) implements this.
 */
export interface OAuthProviderInterface {
  /** Unique provider identifier (e.g., "anthropic", "openai-codex", "github-copilot") */
  readonly id: string;
  /** Human-readable display name */
  readonly name: string;
  /** Whether this provider uses a local callback server (AuthCode+PKCE flows) */
  usesCallbackServer?: boolean;

  /**
   * Run the full login flow.
   * Opens browser for auth, exchanges code for tokens, returns credentials.
   */
  login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials>;

  /**
   * Refresh an expired access token using the refresh token.
   * Returns updated credentials with new access + expires.
   */
  refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials>;

  /**
   * Extract the API key / auth token from credentials.
   * This is what gets passed to the LLM provider SDK.
   */
  getApiKey(credentials: OAuthCredentials): string;

  /**
   * Optionally modify model list based on credentials.
   * Used by GitHub Copilot to set dynamic baseUrl from token endpoint.
   */
  modifyModels?(models: ModelInfo[], credentials: OAuthCredentials): ModelInfo[];
}
