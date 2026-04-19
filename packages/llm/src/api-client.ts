/**
 * @flitter/llm — Internal API Client
 *
 * Client for thread management API operations: thread label management,
 * thread sharing/visibility, and thread listing.
 *
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:80229-80236
 *   visibility types: "private" | "public_unlisted" | "public_discoverable" | "thread_workspace_shared"
 *   amp stores threads locally and syncs to the API.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:242-276 — shouldRetry() / retryRequest()
 *   The API client uses the same retry pattern as the LLM providers:
 *   retry on 408/409/429/500+ with exponential backoff.
 *
 * Note: This is a local-first client. In amp, threads are primarily stored on disk
 * and optionally synced to an API. The "InternalApiClient" name reflects amp's
 * internal architecture where threads can be synced to Anthropic's API.
 */

import { calculateBackoffMs, shouldRetryStatus } from "./model-fallback";

// ─── Types ───────────────────────────────────────────────

/**
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:80229
 */
export type ThreadVisibility =
  | "private"
  | "public_unlisted"
  | "public_discoverable"
  | "thread_workspace_shared";

export interface ThreadLabel {
  id: string;
  name: string;
  color?: string;
}

export interface ThreadSummary {
  id: string;
  title?: string;
  visibility: ThreadVisibility;
  labels: ThreadLabel[];
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ShareResult {
  shareUrl: string;
  visibility: ThreadVisibility;
}

export interface ApiClientConfig {
  /** Base URL for the API */
  baseUrl: string;
  /** Authentication token */
  authToken: string;
  /** Maximum retries for failed requests */
  maxRetries?: number;
  /** Custom fetch implementation (for testing) */
  fetch?: typeof globalThis.fetch;
  /** Delay function (for testing) */
  delay?: (ms: number) => Promise<void>;
}

// ─── InternalApiClient ───────────────────────────────────

/**
 * InternalApiClient — manages thread operations against the sync API.
 *
 * 逆向: amp-cli-reversed/modules/0948_unknown_b7.js — HTTP client with retry,
 *   amp-cli-reversed/modules/2026_tail_anonymous.js — thread visibility schemas
 *
 * Provides:
 * - Thread label CRUD
 * - Thread visibility / sharing
 * - Thread listing
 */
export class InternalApiClient {
  private readonly _baseUrl: string;
  private readonly _authToken: string;
  private readonly _maxRetries: number;
  private readonly _fetch: typeof globalThis.fetch;
  private readonly _delay: (ms: number) => Promise<void>;

  constructor(config: ApiClientConfig) {
    this._baseUrl = config.baseUrl.replace(/\/$/, "");
    this._authToken = config.authToken;
    this._maxRetries = config.maxRetries ?? 2;
    this._fetch = config.fetch ?? globalThis.fetch.bind(globalThis);
    this._delay = config.delay ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  // ─── Thread Label Management ──────────────────────────

  /** List all labels for a thread */
  async getThreadLabels(threadId: string, signal?: AbortSignal): Promise<ThreadLabel[]> {
    const resp = await this._request("GET", `/threads/${threadId}/labels`, undefined, signal);
    return (resp as { labels: ThreadLabel[] }).labels ?? [];
  }

  /** Add a label to a thread */
  async addThreadLabel(
    threadId: string,
    label: { name: string; color?: string },
    signal?: AbortSignal,
  ): Promise<ThreadLabel> {
    return (await this._request(
      "POST",
      `/threads/${threadId}/labels`,
      label,
      signal,
    )) as ThreadLabel;
  }

  /** Remove a label from a thread */
  async removeThreadLabel(
    threadId: string,
    labelId: string,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._request("DELETE", `/threads/${threadId}/labels/${labelId}`, undefined, signal);
  }

  // ─── Thread Sharing / Visibility ──────────────────────

  /**
   * Change thread visibility.
   *
   * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:80229-80236
   *   visibility can be: private, public_unlisted, public_discoverable, thread_workspace_shared
   */
  async setThreadVisibility(
    threadId: string,
    visibility: ThreadVisibility,
    signal?: AbortSignal,
  ): Promise<void> {
    await this._request("PATCH", `/threads/${threadId}`, { visibility }, signal);
  }

  /** Share a thread and get the share URL */
  async shareThread(
    threadId: string,
    visibility: ThreadVisibility = "public_unlisted",
    signal?: AbortSignal,
  ): Promise<ShareResult> {
    return (await this._request(
      "POST",
      `/threads/${threadId}/share`,
      { visibility },
      signal,
    )) as ShareResult;
  }

  // ─── Thread Listing ───────────────────────────────────

  /** List threads with optional filtering */
  async listThreads(
    opts?: {
      limit?: number;
      offset?: number;
      labelId?: string;
    },
    signal?: AbortSignal,
  ): Promise<{ threads: ThreadSummary[]; total: number }> {
    const params = new URLSearchParams();
    if (opts?.limit !== undefined) params.set("limit", String(opts.limit));
    if (opts?.offset !== undefined) params.set("offset", String(opts.offset));
    if (opts?.labelId) params.set("label_id", opts.labelId);

    const query = params.toString();
    const path = `/threads${query ? `?${query}` : ""}`;

    return (await this._request("GET", path, undefined, signal)) as {
      threads: ThreadSummary[];
      total: number;
    };
  }

  /** Get thread details */
  async getThread(threadId: string, signal?: AbortSignal): Promise<ThreadSummary> {
    return (await this._request("GET", `/threads/${threadId}`, undefined, signal)) as ThreadSummary;
  }

  // ─── Internal Request Logic ───────────────────────────

  /**
   * 逆向: amp-cli-reversed/modules/0948_unknown_b7.js — makeRequest() + shouldRetry()
   * HTTP request with retry logic matching amp's pattern.
   */
  private async _request(
    method: string,
    path: string,
    body?: unknown,
    signal?: AbortSignal,
    retriesLeft?: number,
  ): Promise<unknown> {
    if (retriesLeft === undefined) retriesLeft = this._maxRetries;

    const url = `${this._baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this._authToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const resp = await this._fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    if (resp.ok) {
      if (resp.status === 204) return {};
      const text = await resp.text();
      return text ? JSON.parse(text) : {};
    }

    // Check retryability
    const retryHeader = resp.headers.get("x-should-retry");
    const canRetry = shouldRetryStatus(resp.status, retryHeader);

    if (canRetry && retriesLeft > 0) {
      const backoff = calculateBackoffMs(retriesLeft, this._maxRetries);
      await this._delay(backoff);
      return this._request(method, path, body, signal, retriesLeft - 1);
    }

    // Non-retryable or retries exhausted
    const errorText = await resp.text().catch(() => "Unknown error");
    throw new ApiClientError(resp.status, method, path, errorText);
  }
}

// ─── Error ───────────────────────────────────────────────

export class ApiClientError extends Error {
  readonly status: number;
  readonly method: string;
  readonly path: string;

  constructor(status: number, method: string, path: string, body: string) {
    super(`API ${method} ${path} failed with status ${status}: ${body}`);
    this.name = "ApiClientError";
    this.status = status;
    this.method = method;
    this.path = path;
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}
