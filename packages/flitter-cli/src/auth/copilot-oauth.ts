// GitHub Copilot authentication for flitter-cli.
//
// Uses the GitHub device flow to get a token, then exchanges it
// for a Copilot API token. Based on the opencode implementation:
// - Device flow client ID: Iv1.b507a08c87ecfe98 (VS Code's GitHub app)
// - Copilot token exchange: https://api.github.com/copilot_internal/v2/token
//
// The Copilot API is OpenAI-compatible:
// - Base URL: from token exchange response (e.g., https://copilot-proxy.githubusercontent.com)
// - Model: from token exchange response
// - Auth: Bearer token from exchange

import { saveToken, loadToken, type StoredToken } from './token-store';
import { log } from '../utils/logger';

const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const COPILOT_TOKEN_URL = 'https://api.github.com/copilot_internal/v2/token';
const PROVIDER_ID = 'copilot';

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

/**
 * Run the GitHub Copilot device flow authentication.
 *
 * 1. Request device code from GitHub
 * 2. User opens browser, enters code
 * 3. Poll for access token
 * 4. Exchange GitHub token for Copilot token
 * 5. Save token to disk
 */
export async function authenticateCopilot(): Promise<StoredToken> {
  // Step 1: Request device code
  const deviceCodeRes = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: 'read:user',
    }),
  });

  if (!deviceCodeRes.ok) {
    throw new Error(`GitHub device code request failed: ${deviceCodeRes.status}`);
  }

  const deviceCode = await deviceCodeRes.json() as DeviceCodeResponse;

  // Step 2: Show user the code
  process.stderr.write(
    `\nGitHub Copilot Authentication\n` +
    `────────────────────────────\n` +
    `Open: ${deviceCode.verification_uri}\n` +
    `Enter code: ${deviceCode.user_code}\n\n` +
    `Waiting for authentication...\n`,
  );

  try {
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
    Bun.spawn([opener, deviceCode.verification_uri], { stdout: 'ignore', stderr: 'ignore' });
  } catch { /* ignore */ }

  // Step 3: Poll for access token
  const githubToken = await pollForGitHubToken(
    deviceCode.device_code,
    deviceCode.interval,
    deviceCode.expires_in,
  );

  // Step 4: Exchange for Copilot token
  const copilotToken = await exchangeForCopilotToken(githubToken);

  process.stderr.write('GitHub Copilot authentication successful!\n\n');
  return copilotToken;
}

/**
 * Poll GitHub for the access token (device flow step 3).
 */
async function pollForGitHubToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
): Promise<string> {
  const deadline = Date.now() + expiresIn * 1000;
  const pollInterval = Math.max(interval, 5) * 1000;

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, pollInterval));

    const res = await fetch(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = await res.json() as any;

    if (data.access_token) {
      return data.access_token;
    }

    if (data.error === 'authorization_pending') {
      continue;
    }
    if (data.error === 'slow_down') {
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }
    if (data.error === 'expired_token') {
      throw new Error('Device code expired. Please try again.');
    }
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }
  }

  throw new Error('Authentication timed out. Please try again.');
}

/**
 * Exchange a GitHub token for a Copilot API token.
 * Returns the stored token with Copilot endpoint info.
 */
async function exchangeForCopilotToken(githubToken: string): Promise<StoredToken> {
  const res = await fetch(COPILOT_TOKEN_URL, {
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Copilot token exchange failed (${res.status}): ${body}\n` +
      'Make sure you have an active GitHub Copilot subscription.',
    );
  }

  const data = await res.json() as {
    token: string;
    expires_at: number;
    endpoints?: { api: string };
  };

  const token: StoredToken = {
    accessToken: data.token,
    expiresAt: data.expires_at * 1000,
    // Store the GitHub token for refresh
    refreshToken: githubToken,
    accountId: data.endpoints?.api,
    storedAt: Date.now(),
  };

  saveToken(PROVIDER_ID, token);
  log.info('Copilot token obtained successfully');
  return token;
}

/**
 * Get a valid Copilot token, refreshing from GitHub token if needed.
 * Returns null if no token exists.
 */
export async function getCopilotToken(): Promise<StoredToken | null> {
  const stored = loadToken(PROVIDER_ID);
  if (!stored) return null;

  // Check if Copilot token is expired
  if (stored.expiresAt && Date.now() > stored.expiresAt - 5 * 60_000) {
    // Try to re-exchange using the stored GitHub token
    if (stored.refreshToken) {
      try {
        return await exchangeForCopilotToken(stored.refreshToken);
      } catch {
        return null;
      }
    }
    return null;
  }

  return stored;
}
