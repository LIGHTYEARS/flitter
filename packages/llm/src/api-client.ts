/**
 * @flitter/llm — Internal API Client
 *
 * HTTP client for Flitter/amp internal API endpoints:
 * thread labels, sharing, news feed, usage reporting.
 *
 * 逆向: amp-cli-reversed/chunk-005.js:5567 — `internalAPIClient: N3`
 *        amp-cli-reversed/chunk-004.js:34571 — `R.internalAPIClient.getThreadLabels({...})`
 *        amp-cli-reversed/chunk-004.js:34541 — `N3.shareThreadWithOperator({...})`
 *        amp-cli-reversed/chunk-006.js:34517 — `newsFeedReader.stream()` for RSS-based news
 *        amp-cli-reversed/chunk-006.js:35479 — `internalAPIClient.threadDisplayCostInfo({...})`
 *
 * @module
 */

// ─── Types ──────────────────────────────────────────────

/** A single news feed item. */
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  url?: string;
}

/** Usage report payload. */
export interface UsageReport {
  threadId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  durationMs: number;
}

/** Configuration for InternalApiClient. */
export interface InternalApiClientConfig {
  /** Base URL for the internal API */
  baseUrl: string;
  /** Authentication token (optional) */
  authToken?: string;
  /** Installation ID (optional, for telemetry) */
  installationId?: string;
}

// ─── Error ──────────────────────────────────────────────

/**
 * Thrown when the internal API base URL is not configured.
 */
export class ApiNotConfiguredError extends Error {
  constructor() {
    super("Internal API base URL is not configured");
    this.name = "ApiNotConfiguredError";
    Object.setPrototypeOf(this, ApiNotConfiguredError.prototype);
  }
}

// ─── InternalApiClient ──────────────────────────────────

/**
 * HTTP client for Flitter internal API endpoints.
 *
 * All methods return Promises and will retry on 5xx server errors up to
 * {@link MAX_RETRIES} times with exponential backoff.
 *
 * 逆向: amp N3 object — used throughout chunk-004/005/006 for thread operations,
 *        news feed, user info, label management, task management.
 *
 * @example
 * ```ts
 * const client = new InternalApiClient({
 *   baseUrl: "https://api.example.com",
 *   authToken: "sk-...",
 * });
 * await client.setThreadLabels("thread-123", ["bug", "urgent"]);
 * const news = await client.getNewsFeed();
 * ```
 */
export class InternalApiClient {
  private readonly _baseUrl: string;
  private readonly _authToken?: string;
  private readonly _installationId?: string;
  private readonly _fetchFn: typeof fetch;

  /** Maximum retry attempts for 5xx errors */
  static readonly MAX_RETRIES = 3;
  /** Initial backoff delay in ms */
  static readonly INITIAL_BACKOFF_MS = 500;

  constructor(config: InternalApiClientConfig, fetchFn?: typeof fetch) {
    this._baseUrl = config.baseUrl;
    this._authToken = config.authToken;
    this._installationId = config.installationId;
    this._fetchFn = fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  // ─── Public API ─────────────────────────────────────

  /**
   * Set labels on a thread.
   *
   * 逆向: amp-cli-reversed/chunk-004.js:34571
   *   `R.internalAPIClient.getThreadLabels({ threadID })`
   *   (amp also has setThreadLabels as a write counterpart)
   */
  async setThreadLabels(threadId: string, labels: string[]): Promise<void> {
    this._ensureConfigured();
    await this._request("PUT", `/threads/${threadId}/labels`, { labels });
  }

  /**
   * Share a thread with support, returning a public share URL.
   *
   * 逆向: amp-cli-reversed/chunk-001.js:8354
   *   `N3.shareThreadWithOperator({ threadID, ... })`
   * 逆向: amp-cli-reversed/chunk-004.js:34541
   *   `s = await N3.shareThreadWithOperator({...})`
   */
  async shareThreadWithSupport(threadId: string): Promise<{ shareUrl: string }> {
    this._ensureConfigured();
    const data = await this._request<{ shareUrl: string }>(
      "POST",
      `/threads/${threadId}/share`,
      {},
    );
    return data;
  }

  /**
   * Set thread visibility (public / private / unlisted).
   *
   * 逆向: amp e0R commands include "visibility" at line 142 (modules/2785_unknown_e0R.js:142)
   */
  async setThreadVisibility(threadId: string, visibility: string): Promise<void> {
    this._ensureConfigured();
    await this._request("PUT", `/threads/${threadId}/visibility`, { visibility });
  }

  /**
   * Get the news feed.
   *
   * 逆向: amp-cli-reversed/chunk-006.js:34517-34520
   *   `this.newsFeedReader = new UTR(R, T, "/news.rss")`
   *   `this.newsFeedReader.stream().subscribe({ ... })`
   *   In amp this is RSS-based; we simplify to a JSON endpoint.
   */
  async getNewsFeed(): Promise<NewsItem[]> {
    this._ensureConfigured();
    const data = await this._request<{ items: NewsItem[] }>("GET", "/news");
    return data.items ?? [];
  }

  /**
   * Report token usage for a thread turn.
   *
   * 逆向: amp-cli-reversed/chunk-006.js:35479
   *   `this.widget.dependencies.internalAPIClient.threadDisplayCostInfo({...})`
   */
  async reportUsage(data: UsageReport): Promise<void> {
    this._ensureConfigured();
    await this._request("POST", "/usage", data);
  }

  // ─── Private ────────────────────────────────────────

  private _ensureConfigured(): void {
    if (!this._baseUrl) {
      throw new ApiNotConfiguredError();
    }
  }

  private _buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this._authToken) {
      headers["Authorization"] = `Bearer ${this._authToken}`;
    }
    if (this._installationId) {
      headers["X-Installation-Id"] = this._installationId;
    }
    return headers;
  }

  /**
   * Make an HTTP request with retry on 5xx.
   *
   * 逆向: amp-cli-reversed/chunk-002.js:14116-14121 — _4R() exponential backoff
   *   `R = m4R * y4R ** T` (base * factor^attempt), `min(R, max)`, with jitter.
   */
  private async _request<T = void>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this._baseUrl}${path}`;
    const headers = this._buildHeaders();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= InternalApiClient.MAX_RETRIES; attempt++) {
      try {
        const response = await this._fetchFn(url, {
          method,
          headers,
          body: body !== undefined && method !== "GET" ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const status = response.status;
          // Retry on 5xx
          if (status >= 500 && attempt < InternalApiClient.MAX_RETRIES) {
            lastError = new Error(`HTTP ${status} from ${method} ${path}`);
            await this._sleep(InternalApiClient.INITIAL_BACKOFF_MS * 2 ** attempt);
            continue;
          }
          throw new Error(`HTTP ${status} from ${method} ${path}`);
        }

        // For void returns (204 or methods that don't return JSON)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return undefined as T;
        }

        return (await response.json()) as T;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Only retry on network/5xx errors
        if (attempt < InternalApiClient.MAX_RETRIES && this._isRetryable(err)) {
          await this._sleep(InternalApiClient.INITIAL_BACKOFF_MS * 2 ** attempt);
          continue;
        }
        throw err;
      }
    }

    throw lastError ?? new Error("Request failed after all retries");
  }

  private _isRetryable(err: unknown): boolean {
    if (err instanceof Error) {
      const msg = err.message;
      // 5xx errors
      if (/HTTP 5\d\d/.test(msg)) return true;
      // Network errors
      if (
        msg.includes("fetch failed") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT")
      ) {
        return true;
      }
    }
    return false;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
