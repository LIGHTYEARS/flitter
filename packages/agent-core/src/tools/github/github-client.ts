/**
 * @flitter/agent-core — GitHubClient
 *
 * HTTP client for GitHub REST API.
 * Token resolution: GITHUB_TOKEN env → `gh auth token` CLI fallback.
 * Rate limit handling: 403/429 → helpful error message.
 *
 * 逆向: amp-cli-reversed/modules/0010_unknown_Nm.js (fetcher factory)
 * 逆向: amp-cli-reversed/modules/0009_unknown_DGR.js (fetchJSON implementation)
 *
 * Amp uses an internal proxy (`/api/internal/github-proxy/...`) for GitHub API
 * calls. Flitter calls the GitHub REST API directly with bearer token auth.
 */

import { execSync } from "node:child_process";

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Result from a GitHub API call, matching amp's DGR return shape.
 */
export interface GitHubApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  statusText?: string;
}

/**
 * Options for a single API request.
 */
export interface GitHubFetchOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  method?: string;
  body?: unknown;
}

/**
 * Resolve a GitHub token from environment or `gh` CLI.
 *
 * Priority:
 *  1. GITHUB_TOKEN environment variable
 *  2. `gh auth token` CLI output (if `gh` is installed)
 *
 * Returns undefined if no token is available.
 */
export function resolveGitHubToken(): string | undefined {
  // 1. Env var
  const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (envToken) return envToken;

  // 2. `gh auth token` CLI
  try {
    const result = execSync("gh auth token", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const token = result.trim();
    if (token) return token;
  } catch {
    // gh not installed or not authenticated — fall through
  }

  return undefined;
}

/**
 * GitHubClient: thin wrapper around fetch() for the GitHub REST API.
 *
 * Mirrors amp's Nm fetcher factory pattern: each tool receives a fetcher
 * with a `fetchJSON(path, opts)` method.
 */
export class GitHubClient {
  private token: string | undefined;

  constructor(token?: string) {
    this.token = token;
  }

  /**
   * Lazily resolve and cache the GitHub token.
   */
  private getToken(): string | undefined {
    if (this.token === undefined) {
      this.token = resolveGitHubToken() ?? "";
    }
    return this.token || undefined;
  }

  /**
   * Make a JSON API call to GitHub REST API.
   *
   * 逆向: amp-cli-reversed/modules/0009_unknown_DGR.js
   * - Constructs URL from path
   * - Adds Authorization header
   * - Returns { ok, status, data, statusText }
   * - 403/429 → rate limit error handling
   */
  async fetchJSON<T = unknown>(
    path: string,
    options: GitHubFetchOptions = {},
  ): Promise<GitHubApiResult<T>> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "flitter-cli",
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = `${GITHUB_API_BASE}/${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { ok: false, status: 0, statusText: "Request aborted" };
      }
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, status: 0, statusText: `Network error: ${message}` };
    }

    // Rate limit handling (matching amp's error patterns)
    if (response.status === 403 || response.status === 429) {
      const resetHeader = response.headers.get("x-ratelimit-reset");
      let resetMsg = "";
      if (resetHeader) {
        const resetTime = new Date(parseInt(resetHeader, 10) * 1000);
        resetMsg = ` Rate limit resets at ${resetTime.toISOString()}.`;
      }
      return {
        ok: false,
        status: response.status,
        statusText: `GitHub API rate limit exceeded.${resetMsg} Consider setting GITHUB_TOKEN for higher limits.`,
      };
    }

    if (response.status === 304) {
      return { ok: true, status: 304 };
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
      };
    }

    const data = (await response.json()) as T;
    return {
      ok: true,
      status: response.status,
      data,
    };
  }
}

/**
 * Create a GitHubClient with automatic token resolution.
 */
export function createGitHubClient(token?: string): GitHubClient {
  return new GitHubClient(token);
}
