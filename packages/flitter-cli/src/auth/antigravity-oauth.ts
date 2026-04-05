// Antigravity (Google Gemini) OAuth authentication for flitter-cli.
//
// Implements Google OAuth2 PKCE flow used by Antigravity clients.
// Based on the protocol reverse-engineered from opencode:
// - Authorization endpoint: https://accounts.google.com/o/oauth2/v2/auth
// - Token endpoint: https://oauth2.googleapis.com/token
// - Client ID: 1071006060591-ct2qv0nmkb0tf9bdt7sflqm87228dp0c.apps.googleusercontent.com
// - Redirect: http://localhost:36742/auth/callback
// - Scope: openid https://www.googleapis.com/auth/cloud-platform
//
// The Gemini API (via Antigravity) uses the Google AI Studio endpoint:
// - Base URL: https://generativelanguage.googleapis.com/v1beta/openai
// - Model: gemini-2.0-flash (or other Gemini models)
// - The endpoint is OpenAI-compatible

import { generateCodeVerifier, computeCodeChallenge, generateState } from './pkce';
import { waitForOAuthCallback } from './callback-server';
import { saveToken, loadToken, type StoredToken } from './token-store';
import { log } from '../utils/logger';

const CLIENT_ID = '1071006060591-ct2qv0nmkb0tf9bdt7sflqm87228dp0c.apps.googleusercontent.com';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REDIRECT_URI = 'http://localhost:36742/auth/callback';
const CALLBACK_PORT = 36742;
const SCOPE = 'openid https://www.googleapis.com/auth/cloud-platform';
const PROVIDER_ID = 'antigravity';

/** The base URL for the Gemini OpenAI-compatible API. */
export const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

/**
 * Run the Antigravity (Google Gemini) OAuth flow.
 *
 * Opens a browser for Google account authentication.
 * Captures the authorization code via local callback server.
 * Exchanges the code for access and refresh tokens.
 * Saves tokens to disk.
 */
export async function authenticateAntigravity(): Promise<StoredToken> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = computeCodeChallenge(codeVerifier);
  const state = generateState();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`;

  log.info('Antigravity OAuth: opening browser for Google authentication');
  process.stderr.write(
    '\nOpening browser for Google/Antigravity authentication...\n' +
    `If the browser doesn't open, visit:\n${authUrl}\n\n`,
  );

  try {
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
    Bun.spawn([opener, authUrl], { stdout: 'ignore', stderr: 'ignore' });
  } catch { /* ignore */ }

  // Wait for callback
  const callback = await waitForOAuthCallback(CALLBACK_PORT);

  if (callback.state && callback.state !== state) {
    throw new Error('OAuth state mismatch — possible CSRF attack');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code: callback.code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(`Google token exchange failed (${tokenResponse.status}): ${body}`);
  }

  const tokenData = await tokenResponse.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string;
    token_type: string;
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
  process.stderr.write('Google/Antigravity authentication successful!\n\n');
  return token;
}

/**
 * Refresh an Antigravity access token using the refresh token.
 */
export async function refreshAntigravityToken(refreshToken: string): Promise<StoredToken | null> {
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
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
    log.info('Antigravity token refreshed successfully');
    return token;
  } catch (err) {
    log.warn(`Antigravity token refresh failed: ${err}`);
    return null;
  }
}

/**
 * Get a valid Antigravity token, refreshing if needed.
 */
export async function getAntigravityToken(): Promise<StoredToken | null> {
  const stored = loadToken(PROVIDER_ID);
  if (!stored) return null;

  if (stored.expiresAt && Date.now() > stored.expiresAt - 5 * 60_000) {
    if (stored.refreshToken) {
      return await refreshAntigravityToken(stored.refreshToken);
    }
    return null;
  }

  return stored;
}
