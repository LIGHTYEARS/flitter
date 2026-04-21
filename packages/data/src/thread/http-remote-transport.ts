/**
 * @flitter/data — HTTP Remote Transport
 *
 * Implements ThreadRemoteTransport using fetch() to communicate with
 * the self-hosted Flitter sync server (@flitter/server).
 *
 * 逆向: amp-cli-reversed/modules/1343_unknown_ezT.js — remote transport
 *   adapter that calls N3.uploadThread, N3.getThread, N3.listThreads,
 *   N3.deleteThread. Flitter uses a direct REST API instead of the
 *   N3 RPC proxy.
 */
import type { ThreadSnapshot } from "@flitter/schemas";
import { createLogger } from "@flitter/util";
import type { SearchThreadsResponse, ThreadMeta, ThreadRemoteTransport } from "./thread-upload";
import type { ThreadEntry } from "./types";

const log = createLogger("http-remote-transport");

export interface HttpRemoteTransportOptions {
  /** Base URL of the sync server (e.g. "http://localhost:7080") */
  baseUrl: string;
  /** API key for authentication (flitter_sk_...) */
  authToken: string;
  /** Custom fetch implementation (for testing) */
  fetch?: typeof globalThis.fetch;
}

/**
 * HttpRemoteTransport — talks to @flitter/server over HTTP.
 *
 * Implements ThreadRemoteTransport so it plugs directly into
 * ThreadUploadManager without any adapter layer.
 */
export class HttpRemoteTransport implements ThreadRemoteTransport {
  private readonly _baseUrl: string;
  private readonly _authToken: string;
  private readonly _fetch: typeof globalThis.fetch;

  constructor(opts: HttpRemoteTransportOptions) {
    this._baseUrl = opts.baseUrl.replace(/\/$/, "");
    this._authToken = opts.authToken;
    this._fetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Upload (upsert) a thread snapshot to the server.
   * 逆向: N3.uploadThread({ thread, createdOnServer: false })
   */
  async uploadThread(thread: ThreadSnapshot): Promise<void> {
    log.debug("Uploading thread", { id: thread.id, v: thread.v });

    const resp = await this._fetch(`${this._baseUrl}/api/threads`, {
      method: "POST",
      headers: this._headers(),
      body: JSON.stringify(thread),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`uploadThread failed: ${resp.status} ${text}`);
    }
  }

  /**
   * Get a full thread snapshot by ID.
   * Returns null if the thread does not exist on the server.
   * 逆向: N3.getThread({ thread: id }) → result.thread.data
   */
  async getThread(id: string): Promise<ThreadSnapshot | null> {
    log.debug("Getting thread", { id });

    const resp = await this._fetch(`${this._baseUrl}/api/threads/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: this._headers(),
    });

    if (resp.status === 404) return null;

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`getThread failed: ${resp.status} ${text}`);
    }

    return (await resp.json()) as ThreadSnapshot;
  }

  /**
   * List threads as lightweight entries.
   * 逆向: N3.listThreads({ limit }) → result.threads
   */
  async listThreads(opts?: { limit?: number | null }): Promise<ThreadEntry[]> {
    log.debug("Listing threads", { limit: opts?.limit });

    const params = new URLSearchParams();
    if (opts?.limit != null) params.set("limit", String(opts.limit));
    const query = params.toString();
    const url = `${this._baseUrl}/api/threads${query ? `?${query}` : ""}`;

    const resp = await this._fetch(url, {
      method: "GET",
      headers: this._headers(),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`listThreads failed: ${resp.status} ${text}`);
    }

    return (await resp.json()) as ThreadEntry[];
  }

  /**
   * Delete a thread by ID.
   * 逆向: N3.deleteThread({ thread: id })
   */
  async deleteThread(id: string): Promise<void> {
    log.debug("Deleting thread", { id });

    const resp = await this._fetch(`${this._baseUrl}/api/threads/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: this._headers(),
    });

    // 204 = deleted, 404 = already gone — both are success
    if (!resp.ok && resp.status !== 404) {
      const text = await resp.text().catch(() => "");
      throw new Error(`deleteThread failed: ${resp.status} ${text}`);
    }
  }

  /**
   * Full-text search for threads via the server's FTS5 endpoint.
   *
   * 逆向: amp fi(`/api/threads/find?q=...&limit=...`)
   * Flitter uses /api/threads/search (same functionality, different URL).
   */
  async searchThreads(opts: { q: string; limit?: number }): Promise<SearchThreadsResponse> {
    log.debug("Searching threads", { query: opts.q, limit: opts.limit });

    const params = new URLSearchParams();
    params.set("q", opts.q);
    if (opts.limit != null) params.set("limit", String(opts.limit));

    const url = `${this._baseUrl}/api/threads/search?${params.toString()}`;
    const resp = await this._fetch(url, {
      method: "GET",
      headers: this._headers(),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`searchThreads failed: ${resp.status} ${text}`);
    }

    return (await resp.json()) as SearchThreadsResponse;
  }

  /**
   * Update thread metadata on the server.
   * Uses PATCH /api/threads/:id which updates visibility/archived in both
   * the snapshot JSON and dedicated columns.
   *
   * 逆向: ezT.setThreadMeta(R, a) — modules/1343_unknown_ezT.js:55-64
   * Amp calls N3.setThreadMeta({ thread: R, meta: a }); we use PATCH directly.
   */
  async setThreadMeta(id: string, meta: ThreadMeta): Promise<void> {
    log.debug("Setting thread meta", { id, meta });

    const resp = await this._fetch(`${this._baseUrl}/api/threads/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: this._headers(),
      body: JSON.stringify(meta),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`setThreadMeta failed: ${resp.status} ${text}`);
    }
  }

  private _headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this._authToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
}
