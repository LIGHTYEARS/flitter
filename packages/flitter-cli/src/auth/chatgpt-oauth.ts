// ChatGPT/Codex OAuth authentication for flitter-cli.
//
// Implements the OpenAI OAuth PKCE flow used by ChatGPT accounts.
// Based on the protocol reverse-engineered from opencode:
// - Authorization endpoint: https://auth.openai.com/authorize
// - Token endpoint: https://auth.openai.com/oauth/token
// - Client ID: app_EMoamEEZ73f0CkXaXp7hrann (opencode's registered app)
// - Redirect: http://localhost:1455/auth/callback
// - Scope: openid profile email offline_access
// - Audience: https://api.openai.com/v1
//
// The flow opens a browser for the user to log in, then captures the
// authorization code via a local callback server.

import { generateCodeVerifier, computeCodeChallenge, generateState } from './pkce';
import { waitForOAuthCallback } from './callback-server';
import { saveToken, loadToken, type StoredToken } from './token-store';
import { log } from '../utils/logger';

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const AUTH_ENDPOINT = 'https://auth.openai.com/authorize';
const TOKEN_ENDPOINT = 'https://auth.openai.com/oauth/token';
const REDIRECT_URI = 'http://localhost:1455/auth/callback';
const CALLBACK_PORT = 1455;
const SCOPE = 'openid profile email offline_access';
const AUDIENCE = 'https://api.openai.com/v1';
const PROVIDER_ID = 'chatgpt-codex';

/**
 * Run the ChatGPT/Codex OAuth flow.
 *
 * Opens a browser for the user to authenticate with their ChatGPT account.
 * Captures the authorization code via local callback server.
 * Exchanges the code for access and refresh tokens.
 * Saves tokens to disk for reuse.
 *
 * Returns the stored token on success.
 */
export async function authenticateChatGPT(): Promise<StoredToken> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = computeCodeChallenge(codeVerifier);
  const state = generateState();

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    audience: AUDIENCE,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`;

  // Open browser
  log.info('ChatGPT OAuth: opening browser for authentication');
  process.stderr.write(
    '\nOpening browser for ChatGPT authentication...\n' +
    `If the browser doesn't open, visit:\n${authUrl}\n\n`,
  );

  try {
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
    Bun.spawn([opener, authUrl], { stdout: 'ignore', stderr: 'ignore' });
  } catch {
    // Browser open failed — user will need to copy the URL
  }

  // Wait for callback
  const callback = await waitForOAuthCallback(CALLBACK_PORT);

  // Verify state
  if (callback.state && callback.state !== state) {
    throw new Error('OAuth state mismatch — possible CSRF attack');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code: callback.code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Token exchange failed (${tokenResponse.status}): ${body}`);
  }

  const tokenData = await tokenResponse.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string;
  };

  const token: StoredToken = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : undefined,
    storedAt: Date.now(),
  };

  saveToken(PROVIDER_ID, token);
  process.stderr.write('ChatGPT authentication successful!\n\n');
  return token;
}

/**
 * Refresh a ChatGPT/Codex access token using the refresh token.
 * Returns the new token, or null if refresh fails.
 */
export async function refreshChatGPTToken(refreshToken: string): Promise<StoredToken | null> {
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const token: StoredToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      storedAt: Date.now(),
    };

    saveToken(PROVIDER_ID, token);
    log.info('ChatGPT token refreshed successfully');
    return token;
  } catch (err) {
    log.warn(`ChatGPT token refresh failed: ${err}`);
    return null;
  }
}

/**
 * Get a valid ChatGPT token, refreshing if needed.
 * Returns null if no token exists and user needs to authenticate.
 */
export async function getChatGPTToken(): Promise<StoredToken | null> {
  const stored = loadToken(PROVIDER_ID);
  if (!stored) return null;

  // Check if expired
  if (stored.expiresAt && Date.now() > stored.expiresAt - 5 * 60_000) {
    if (stored.refreshToken) {
      return await refreshChatGPTToken(stored.refreshToken);
    }
    return null; // Expired and no refresh token
  }

  return stored;
}
