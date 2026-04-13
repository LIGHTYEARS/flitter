/**
 * @flitter/llm — PKCE Utilities
 *
 * Generates Proof Key for Code Exchange (PKCE) verifier + challenge pairs
 * for OAuth 2.0 Authorization Code flows.
 *
 * Uses Web Crypto API (crypto.subtle) for cross-platform compatibility.
 *
 * @example
 * ```ts
 * const { verifier, challenge } = await generatePKCE();
 * // verifier → 43-128 char random string
 * // challenge → base64url(SHA-256(verifier))
 * ```
 */

/**
 * Generate a PKCE verifier + challenge pair.
 *
 * - Verifier: 64 random bytes → base64url (86 chars)
 * - Challenge: SHA-256(verifier) → base64url
 */
export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  // Generate 64 random bytes for verifier
  const randomBytes = new Uint8Array(64);
  crypto.getRandomValues(randomBytes);
  const verifier = base64UrlEncode(randomBytes);

  // SHA-256 hash the verifier for the challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const challenge = base64UrlEncode(new Uint8Array(hashBuffer));

  return { verifier, challenge };
}

/**
 * Base64url encode a Uint8Array (RFC 7636 Appendix A).
 * No padding, URL-safe alphabet.
 */
function base64UrlEncode(bytes: Uint8Array): string {
  // Convert to regular base64
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  // Convert to base64url: replace +/= with -/_/""
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
