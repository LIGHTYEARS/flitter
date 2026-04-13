/**
 * OpenAI Codex OAuth Provider — Authorization Code + PKCE
 *
 * Authenticates with ChatGPT Plus/Pro subscriptions for API access.
 *
 * Flow:
 * 1. Generate PKCE verifier + challenge
 * 2. Open browser to authorization URL
 * 3. Local callback server receives authorization code
 * 4. Exchange code for access + refresh tokens
 */
import type { OAuthCredentials, OAuthLoginCallbacks, OAuthProviderInterface } from "../types";
import { generatePKCE } from "../pkce";
import { startCallbackServer } from "../callback-server";

const AUTH_URL = "https://auth.openai.com/oauth/authorize";
const TOKEN_URL = "https://auth.openai.com/oauth/token";
const CALLBACK_PORT = 1455;
const CALLBACK_PATH = "/auth/callback";
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;
const CLIENT_ID = "app_scp_zbGLJVBPIHcryOMjO7Vbh8dI";
const AUDIENCE = "https://api.openai.com/v1";
const SCOPES = "openid profile email offline_access";

export class OpenAICodexOAuthProvider implements OAuthProviderInterface {
  readonly id = "openai-codex";
  readonly name = "OpenAI (ChatGPT Plus/Pro)";
  readonly usesCallbackServer = true;

  async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
    const { verifier, challenge } = await generatePKCE();

    // Start callback server
    const server = startCallbackServer({
      port: CALLBACK_PORT,
      path: CALLBACK_PATH,
      timeout: 120_000,
      signal: callbacks.signal,
    });

    const port = await server.port;
    const redirectUri = `http://localhost:${port}${CALLBACK_PATH}`;

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: SCOPES,
      audience: AUDIENCE,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    const authUrl = `${AUTH_URL}?${params}`;

    // Open browser
    callbacks.onAuth({
      url: authUrl,
      instructions: "Sign in with your OpenAI account to authorize CLI access.",
    });

    let code: string;
    try {
      const result = await server;
      code = result.code;
    } catch (err) {
      server.stop();
      if (callbacks.onManualCodeInput) {
        callbacks.onProgress?.("Could not receive callback automatically. Please paste the authorization code.");
        code = await callbacks.onManualCodeInput();
      } else {
        throw err;
      }
    }

    // Exchange code for tokens
    callbacks.onProgress?.("Exchanging authorization code for tokens...");
    return this._exchangeCode(code, verifier, redirectUri);
  }

  async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        refresh_token: credentials.refresh,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI token refresh failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as TokenResponse;
    return {
      refresh: data.refresh_token ?? credentials.refresh,
      access: data.access_token,
      expires: Date.now() + data.expires_in * 1000,
    };
  }

  getApiKey(credentials: OAuthCredentials): string {
    return credentials.access;
  }

  // ─── Private ───────────────────────────────────────────

  private async _exchangeCode(
    code: string,
    verifier: string,
    redirectUri: string,
  ): Promise<OAuthCredentials> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI token exchange failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as TokenResponse;
    return {
      refresh: data.refresh_token,
      access: data.access_token,
      expires: Date.now() + data.expires_in * 1000,
    };
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}
