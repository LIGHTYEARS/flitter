// OAuth token storage for flitter-cli.
//
// Persists OAuth tokens (access, refresh, expiry) to disk
// for reuse across sessions. Tokens are stored per-provider
// in ~/.flitter-cli/auth/<provider-id>.json.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { log } from '../utils/logger';

/** Stored OAuth token set for a provider. */
export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
  /** When the token was stored. */
  storedAt: number;
}

const AUTH_DIR = join(homedir(), '.flitter-cli', 'auth');

/** Ensure the auth directory exists. */
function ensureDir(): void {
  if (!existsSync(AUTH_DIR)) {
    mkdirSync(AUTH_DIR, { recursive: true });
  }
}

/** Get the file path for a provider's stored token. */
function tokenPath(providerId: string): string {
  return join(AUTH_DIR, `${providerId}.json`);
}

/**
 * Load a stored token for a provider.
 * Returns null if not found or expired.
 */
export function loadToken(providerId: string): StoredToken | null {
  const path = tokenPath(providerId);
  if (!existsSync(path)) return null;

  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const token: StoredToken = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      accountId: data.accountId,
      storedAt: data.storedAt ?? 0,
    };

    // Check if token is expired (with 5-minute buffer)
    if (token.expiresAt && Date.now() > token.expiresAt - 5 * 60_000) {
      log.info(`Token for ${providerId} is expired`);
      // Still return it — the caller can try to refresh
      return token;
    }

    return token;
  } catch (err) {
    log.warn(`Failed to load token for ${providerId}: ${err}`);
    return null;
  }
}

/**
 * Save a token for a provider.
 */
export function saveToken(providerId: string, token: StoredToken): void {
  ensureDir();
  const path = tokenPath(providerId);
  writeFileSync(path, JSON.stringify(token, null, 2), 'utf-8');
  log.info(`Token saved for ${providerId}`);
}

/**
 * Check if a valid (non-expired) token exists for a provider.
 */
export function hasValidToken(providerId: string): boolean {
  const token = loadToken(providerId);
  if (!token) return false;
  if (token.expiresAt && Date.now() > token.expiresAt - 5 * 60_000) return false;
  return true;
}
