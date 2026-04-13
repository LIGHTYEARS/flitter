/**
 * Anthropic OAuth Provider — Authorization Code + PKCE
 *
 * Authenticates with Claude Pro/Max subscriptions via console.anthropic.com.
 * OAuth tokens (sk-ant-oat-*) are used as authToken in the Anthropic SDK.
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

const AUTH_URL = "https://claude.ai/oauth/authorize";
const TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
const CALLBACK_PORT = 53692;
const CALLBACK_PATH = "/callback";
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;
const CLIENT_ID = "9d1c250b-e535-45c9-a2b1-5e26609dc77c";
const SCOPES = "org:create_api_key user:profile user:inference";

export class AnthropicOAuthProvider implements OAuthProviderInterface {
  readonly id = "anthropic";
  readonly name = "Anthropic (Claude Pro/Max)";
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
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    const authUrl = `${AUTH_URL}?${params}`;

    // Open browser
    callbacks.onAuth({
      url: authUrl,
      instructions: "Sign in with your Anthropic account to authorize CLI access.",
    });

    let code: string;
    try {
      const result = await server;
      code = result.code;
    } catch (err) {
      server.stop();
      // If callback server fails, try manual code input
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
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        refresh_token: credentials.refresh,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic token refresh failed (${res.status}): ${text}`);
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
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic token exchange failed (${res.status}): ${text}`);
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
