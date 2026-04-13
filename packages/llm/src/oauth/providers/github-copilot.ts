/**
 * GitHub Copilot OAuth Provider — Device Code Flow
 *
 * Authenticates with GitHub Copilot subscription for API access.
 * Uses Device Code flow (no local callback server needed).
 *
 * Flow:
 * 1. Request device code from GitHub
 * 2. User visits verification URL and enters the user code
 * 3. Poll for access token
 * 4. Exchange GitHub token for Copilot token
 *
 * Supports GitHub Enterprise domains.
 */
import type { OAuthCredentials, OAuthLoginCallbacks, OAuthProviderInterface } from "../types";
import type { ModelInfo } from "../../types";

const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98";
const DEFAULT_GITHUB_HOST = "https://github.com";

// Endpoints (relative to GitHub host)
const DEVICE_CODE_PATH = "/login/device/code";
const TOKEN_PATH = "/login/oauth/access_token";

// Copilot-specific
const COPILOT_TOKEN_URL = "https://api.githubcopilot.com/copilot_internal/v2/token";

export class GitHubCopilotOAuthProvider implements OAuthProviderInterface {
  readonly id = "github-copilot";
  readonly name = "GitHub Copilot";
  readonly usesCallbackServer = false;
  /** Minimum poll interval in ms. Override in tests for speed. */
  _minPollIntervalMs = 5000;

  async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
    // Ask for enterprise domain (optional)
    let githubHost = DEFAULT_GITHUB_HOST;
    const enterprise = await callbacks.onPrompt({
      message: "GitHub Enterprise domain (leave empty for github.com):",
      placeholder: "github.mycompany.com",
    });
    if (enterprise.trim()) {
      githubHost = `https://${enterprise.trim().replace(/^https?:\/\//, "")}`;
    }

    // Step 1: Request device code
    callbacks.onProgress?.("Requesting device code...");
    const deviceCode = await this._requestDeviceCode(githubHost);

    // Step 2: Show verification URL + user code
    callbacks.onAuth({
      url: deviceCode.verification_uri,
      instructions: `Enter code: ${deviceCode.user_code}`,
    });

    // Step 3: Poll for token
    callbacks.onProgress?.("Waiting for authorization...");
    const githubToken = await this._pollForToken(
      githubHost,
      deviceCode.device_code,
      deviceCode.interval,
      callbacks.signal,
    );

    // Step 4: Exchange for Copilot token
    callbacks.onProgress?.("Obtaining Copilot access token...");
    const copilotToken = await this._getCopilotToken(githubToken);

    return {
      refresh: githubToken,
      access: copilotToken.token,
      expires: copilotToken.expires_at * 1000, // convert to ms
      githubHost,
      endpoints: copilotToken.endpoints,
    };
  }

  async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
    // GitHub Copilot tokens are refreshed by re-fetching the Copilot token
    // using the GitHub access token (which doesn't expire easily)
    const copilotToken = await this._getCopilotToken(credentials.refresh);
    return {
      ...credentials,
      access: copilotToken.token,
      expires: copilotToken.expires_at * 1000,
      endpoints: copilotToken.endpoints,
    };
  }

  getApiKey(credentials: OAuthCredentials): string {
    return credentials.access;
  }

  modifyModels(models: ModelInfo[], credentials: OAuthCredentials): ModelInfo[] {
    // Extract the API endpoint from copilot token endpoints
    const endpoints = credentials.endpoints as CopilotEndpoint[] | undefined;
    if (!endpoints?.length) return models;

    const chatEndpoint = endpoints.find((e) => e.api === "openai-chat");
    if (!chatEndpoint) return models;

    // Set baseUrl on all models to use the Copilot proxy
    return models.map((m) => ({
      ...m,
      baseUrl: chatEndpoint.base_url,
    }));
  }

  // ─── Private ───────────────────────────────────────────

  private async _requestDeviceCode(githubHost: string): Promise<DeviceCodeResponse> {
    const res = await fetch(`${githubHost}${DEVICE_CODE_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        scope: "read:user",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub device code request failed (${res.status}): ${text}`);
    }

    return (await res.json()) as DeviceCodeResponse;
  }

  private async _pollForToken(
    githubHost: string,
    deviceCode: string,
    interval: number,
    signal?: AbortSignal,
  ): Promise<string> {
    const pollInterval = Math.max(interval * 1000, this._minPollIntervalMs);

    while (true) {
      if (signal?.aborted) {
        throw new Error("GitHub authorization cancelled");
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const res = await fetch(`${githubHost}${TOKEN_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub token poll failed (${res.status}): ${text}`);
      }

      const data = (await res.json()) as TokenPollResponse;

      if (data.access_token) {
        return data.access_token;
      }

      switch (data.error) {
        case "authorization_pending":
          continue;
        case "slow_down":
          // Back off by 5 seconds
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        case "expired_token":
          throw new Error("GitHub device code expired. Please try again.");
        case "access_denied":
          throw new Error("GitHub authorization was denied.");
        default:
          throw new Error(`GitHub authorization error: ${data.error_description ?? data.error ?? "unknown"}`);
      }
    }
  }

  private async _getCopilotToken(githubToken: string): Promise<CopilotTokenResponse> {
    const res = await fetch(COPILOT_TOKEN_URL, {
      method: "GET",
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Copilot token request failed (${res.status}): ${text}`);
    }

    return (await res.json()) as CopilotTokenResponse;
  }
}

// ─── Types ────────────────────────────────────────────

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenPollResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface CopilotTokenResponse {
  token: string;
  expires_at: number;
  endpoints?: CopilotEndpoint[];
}

interface CopilotEndpoint {
  api: string;
  base_url: string;
}
