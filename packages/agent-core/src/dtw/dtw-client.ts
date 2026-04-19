/**
 * @flitter/agent-core — DTWClient: HTTP/WebSocket client to DTW service
 *
 * 逆向: chunk-005.js:4470-4534 (Fz0 create, Kz0 getDurableObjectId, Xz0 spawn)
 * 逆向: chunk-005.js:4569-4620 (dtw-curl command actions: create, add-message, get-transcript, dump)
 * 逆向: chunk-005.js:3244 (showEditHint: !this.options.isDTWMode)
 *
 * Client-side transport for communicating with the DTW (Durable Thread Worker) service.
 * Server-side is out of scope — this implements the client transport + protocol only.
 *
 * Responsibilities:
 * - Connect to remote DTW service URL
 * - Create threads on the DTW service
 * - Send user messages, receive assistant responses
 * - Reconnect on disconnect with exponential backoff
 * - Get thread transcripts and durable object IDs
 */

import { DTW_ENDPOINTS, isValidDurableObjectId, isValidThreadId } from "./dtw-protocol";
import type {
  DTWClientEvents,
  DTWClientState,
  DTWConnectionConfig,
  DTWCreateResponse,
  DTWResponseMessage,
  DTWSendMessage,
  DTWThreadSync,
} from "./dtw-types";

/**
 * DTWClient — HTTP client to the DTW service endpoint.
 *
 * 逆向: chunk-005.js:4470-4534 (HTTP API calls to DTW service)
 */
export class DTWClient {
  private readonly config: DTWConnectionConfig;
  private state: DTWClientState = "disconnected";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  /** Max reconnect attempts before entering error state */
  static readonly MAX_RECONNECT_ATTEMPTS = 10;
  /** Base delay for exponential backoff (ms) */
  static readonly BASE_RECONNECT_DELAY_MS = 1000;
  /** Maximum reconnect delay (ms) */
  static readonly MAX_RECONNECT_DELAY_MS = 30000;

  /** Event listeners */
  private listeners: Partial<{
    [K in keyof DTWClientEvents]: DTWClientEvents[K][];
  }> = {};

  constructor(config: DTWConnectionConfig) {
    this.config = { ...config };
  }

  // ─── Connection Management ─────────────────────────────

  /**
   * Get current client state.
   */
  getState(): DTWClientState {
    return this.state;
  }

  /**
   * Connect to the DTW service (validates connectivity).
   * Transitions to 'connected' state on success.
   */
  async connect(): Promise<void> {
    if (this.disposed) throw new Error("DTWClient is disposed");
    if (this.state === "connected") return;

    this.setState("connecting");
    try {
      // Validate connectivity by attempting to reach the service
      const url = new URL(DTW_ENDPOINTS.create, this.config.serviceUrl);
      const response = await fetch(url, {
        method: "OPTIONS",
        headers: this.buildHeaders(),
      });
      // Even a 405 (method not allowed) means the service is reachable
      if (response.status >= 500) {
        throw new Error(`DTW service unavailable: HTTP ${response.status}`);
      }
      this.reconnectAttempt = 0;
      this.setState("connected");
    } catch (err) {
      this.setState("error");
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  /**
   * Disconnect and clean up resources.
   */
  async disconnect(): Promise<void> {
    this.clearReconnectTimer();
    this.setState("disconnected");
  }

  /**
   * Dispose the client. No further operations are possible.
   */
  dispose(): void {
    this.disposed = true;
    this.clearReconnectTimer();
    this.setState("disconnected");
    this.listeners = {};
  }

  // ─── Thread Operations ──────────────────────────────────

  /**
   * Create a new DTW thread on the remote service.
   *
   * 逆向: Fz0 in chunk-005.js:4470-4493
   *   POST /api/durable-thread-workers
   *   Body: { agentMode?, repositoryURL? }
   *   Response: { threadId: string }
   *
   * @returns Created thread ID
   */
  async createThread(): Promise<string> {
    this.ensureNotDisposed();

    const body: Record<string, string> = {};
    if (this.config.agentMode) body.agentMode = this.config.agentMode;
    if (this.config.repositoryUrl) body.repositoryURL = this.config.repositoryUrl;

    const url = new URL(DTW_ENDPOINTS.create, this.config.serviceUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.buildHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Create request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as DTWCreateResponse;
    // 逆向: chunk-005.js:4492 — validate threadId
    if (!data.threadId || !isValidThreadId(data.threadId)) {
      throw new Error("Create response did not include a valid thread ID");
    }

    return data.threadId;
  }

  /**
   * Send a user message to a DTW thread.
   *
   * 逆向: chunk-005.js:4682 (add-message action in dtw-curl)
   *
   * @param threadId - Target thread ID
   * @param message - Message to send
   */
  async sendMessage(threadId: string, message: DTWSendMessage): Promise<void> {
    this.ensureNotDisposed();

    const url = new URL(
      DTW_ENDPOINTS.addMessage(threadId),
      this.config.serviceUrl,
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.buildHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message.content,
        ...(message.agentMode ? { agentMode: message.agentMode } : {}),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Send message failed (${response.status}): ${text}`);
    }
  }

  /**
   * Get the full transcript of a DTW thread.
   *
   * 逆向: chunk-005.js:4585 (get-transcript action)
   *
   * @param threadId - Thread ID to get transcript for
   * @returns Thread sync data with all messages
   */
  async getTranscript(threadId: string): Promise<DTWThreadSync> {
    this.ensureNotDisposed();

    const url = new URL(
      DTW_ENDPOINTS.getTranscript(threadId),
      this.config.serviceUrl,
    );
    const response = await fetch(url, {
      method: "GET",
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Get transcript failed (${response.status}): ${text}`);
    }

    return (await response.json()) as DTWThreadSync;
  }

  /**
   * Get the durable object ID for a thread.
   *
   * 逆向: Kz0 in chunk-005.js:4498-4511
   *
   * @param threadId - Thread ID
   * @returns Durable object ID string
   */
  async getDurableObjectId(threadId: string): Promise<string> {
    this.ensureNotDisposed();

    const url = new URL(
      DTW_ENDPOINTS.durableObjectId(threadId),
      this.config.serviceUrl,
    );
    const response = await fetch(url, {
      method: "GET",
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Durable object ID request failed (${response.status}): ${text}`);
    }

    const data = await response.json();
    // 逆向: chunk-005.js:4510 — validate durableObjectId
    if (!isValidDurableObjectId(data)) {
      throw new Error("Durable object ID response did not include a durableObjectId");
    }

    return (data as { durableObjectId: string }).durableObjectId;
  }

  // ─── Reconnection ──────────────────────────────────────

  /**
   * Schedule a reconnection attempt with exponential backoff.
   *
   * Backoff formula: min(BASE * 2^attempt, MAX) + jitter
   */
  scheduleReconnect(): void {
    if (this.disposed) return;
    if (this.reconnectAttempt >= DTWClient.MAX_RECONNECT_ATTEMPTS) {
      this.setState("error");
      this.emit("error", new Error("Max reconnect attempts exceeded"));
      return;
    }

    this.setState("reconnecting");
    const delay = this.getReconnectDelay();
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempt++;
      try {
        await this.connect();
      } catch {
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Calculate reconnect delay with exponential backoff + jitter.
   */
  getReconnectDelay(): number {
    const base = DTWClient.BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempt);
    const capped = Math.min(base, DTWClient.MAX_RECONNECT_DELAY_MS);
    // Add 0-25% jitter
    const jitter = capped * Math.random() * 0.25;
    return capped + jitter;
  }

  // ─── Event Emitter ─────────────────────────────────────

  /**
   * Register an event listener.
   */
  on<K extends keyof DTWClientEvents>(event: K, listener: DTWClientEvents[K]): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    (this.listeners[event] as DTWClientEvents[K][]).push(listener);
  }

  /**
   * Remove an event listener.
   */
  off<K extends keyof DTWClientEvents>(event: K, listener: DTWClientEvents[K]): void {
    const list = this.listeners[event] as DTWClientEvents[K][] | undefined;
    if (!list) return;
    const idx = list.indexOf(listener);
    if (idx !== -1) list.splice(idx, 1);
  }

  private emit<K extends keyof DTWClientEvents>(event: K, ...args: Parameters<DTWClientEvents[K]>): void {
    const list = this.listeners[event] as ((...a: Parameters<DTWClientEvents[K]>) => void)[] | undefined;
    if (!list) return;
    for (const fn of list) {
      try {
        fn(...args);
      } catch {
        // Listener errors should not break the client
      }
    }
  }

  // ─── Private Helpers ───────────────────────────────────

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  private setState(newState: DTWClientState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.emit("stateChange", newState);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private ensureNotDisposed(): void {
    if (this.disposed) throw new Error("DTWClient is disposed");
  }
}
