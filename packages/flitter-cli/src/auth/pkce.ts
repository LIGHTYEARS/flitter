// OAuth PKCE utilities for flitter-cli.
//
// Implements PKCE (Proof Key for Code Exchange) used by
// ChatGPT/Codex and Antigravity OAuth flows.

import { createHash, randomBytes } from 'node:crypto';

/**
 * Generate a random code verifier for PKCE.
 * Returns a base64url-encoded random string (43-128 chars).
 */
export function generateCodeVerifier(): string {
  return randomBytes(32)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9\-._~]/g, '')
    .slice(0, 64);
}

/**
 * Compute the S256 code challenge from a verifier.
 * SHA-256 hash, base64url-encoded (no padding).
 */
export function computeCodeChallenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

/**
 * Generate a random state parameter for OAuth flows.
 * Used to prevent CSRF attacks.
 */
export function generateState(): string {
  return randomBytes(16).toString('hex');
}
