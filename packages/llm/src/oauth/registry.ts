/**
 * @flitter/llm — OAuth Provider Registry
 *
 * Central registry for OAuth provider implementations.
 * Provides lookup, registration, and token refresh utilities.
 *
 * @example
 * ```ts
 * import { registerOAuthProvider, getOAuthProvider, getOAuthApiKey } from "@flitter/llm";
 *
 * registerOAuthProvider(anthropicOAuth);
 * const provider = getOAuthProvider("anthropic");
 * const { apiKey, newCredentials } = await getOAuthApiKey("anthropic", savedCredentials);
 * ```
 */
import type { OAuthCredentials, OAuthProviderInterface } from "./types";

// ─── Registry storage ────────────────────────────────────

const _providers = new Map<string, OAuthProviderInterface>();

// ─── Public API ──────────────────────────────────────────

/**
 * Register an OAuth provider implementation.
 * Replaces any existing provider with the same id.
 */
export function registerOAuthProvider(provider: OAuthProviderInterface): void {
  _providers.set(provider.id, provider);
}

/**
 * Get an OAuth provider by id.
 * Returns undefined if not registered.
 */
export function getOAuthProvider(id: string): OAuthProviderInterface | undefined {
  return _providers.get(id);
}

/**
 * Get all registered OAuth providers.
 */
export function getOAuthProviders(): OAuthProviderInterface[] {
  return Array.from(_providers.values());
}

/**
 * Get an API key from stored credentials, refreshing if expired.
 *
 * Returns null if the provider is not registered or credentials are missing.
 * Returns the API key + potentially updated credentials (if refreshed).
 *
 * @param providerId - The OAuth provider id
 * @param credentials - Map of provider id → stored credentials
 */
export async function getOAuthApiKey(
  providerId: string,
  credentials: Record<string, OAuthCredentials>,
): Promise<{ newCredentials: OAuthCredentials; apiKey: string } | null> {
  const provider = _providers.get(providerId);
  if (!provider) return null;

  const creds = credentials[providerId];
  if (!creds) return null;

  // Check if access token is expired (with 60s buffer)
  const now = Date.now();
  const isExpired = creds.expires < now + 60_000;

  let activeCreds = creds;
  if (isExpired) {
    activeCreds = await provider.refreshToken(creds);
  }

  const apiKey = provider.getApiKey(activeCreds);
  return { newCredentials: activeCreds, apiKey };
}

/**
 * Clear all registered providers.
 * Primarily useful for testing.
 */
export function clearOAuthProviders(): void {
  _providers.clear();
}
