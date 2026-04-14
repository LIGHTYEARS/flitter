/**
 * @flitter/llm -- MCP SSE Transport (Legacy)
 *
 * Server-Sent Events transport for MCP. This is the legacy transport
 * that establishes a long-lived SSE connection via GET, discovers a
 * POST endpoint, and communicates via JSON-RPC.
 *
 * Protocol flow:
 *   1. GET url (Accept: text/event-stream) -> SSE stream
 *   2. Receive `event: endpoint` with POST URL
 *   3. Validate endpoint origin matches connection origin
 *   4. Send JSON-RPC via POST to endpoint
 *   5. Receive JSON-RPC via SSE `message` events
 *
 * Direct translation from reversed JD class (oauth-auth-provider.js:1367-1505).
 * Zero external MCP SDK dependency (KD-24).
 */

import { parseMessage } from "../protocol";
import type { JSONRPCMessage, MCPTransport, ProtocolVersion } from "../types";

// ---- Minimal inline SSE parser ----
// Plan 08-03 may provide SSEEventParser; we inline a minimal one here
// for self-containment. Parses an SSE byte stream into events.

export interface SSEEvent {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

/**
 * Minimal SSE line parser. Accumulates lines from a text stream and
 * emits SSEEvent objects according to the SSE spec.
 */
export class SSELineParser {
  private _eventType = "";
  private _data: string[] = [];
  private _lastEventId = "";
  private _buffer = "";

  /**
   * Feed a chunk of text into the parser. Returns any complete events.
   */
  feed(chunk: string): SSEEvent[] {
    this._buffer += chunk;
    const events: SSEEvent[] = [];

    // Process complete lines
    let idx: number;
    while ((idx = this._buffer.indexOf("\n")) !== -1) {
      let line = this._buffer.slice(0, idx);
      this._buffer = this._buffer.slice(idx + 1);

      // Strip optional \r
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      if (line === "") {
        // Empty line: dispatch event if we have data
        if (this._data.length > 0) {
          events.push({
            event: this._eventType || "message",
            data: this._data.join("\n"),
            id: this._lastEventId || undefined,
          });
          this._data = [];
          this._eventType = "";
        }
        continue;
      }

      // Parse field
      const colonIdx = line.indexOf(":");
      let field: string;
      let value: string;

      if (colonIdx === 0) {
        // Comment line (starts with :), skip
        continue;
      } else if (colonIdx === -1) {
        field = line;
        value = "";
      } else {
        field = line.slice(0, colonIdx);
        value = line.slice(colonIdx + 1);
        // Strip single leading space from value
        if (value.startsWith(" ")) {
          value = value.slice(1);
        }
      }

      switch (field) {
        case "event":
          this._eventType = value;
          break;
        case "data":
          this._data.push(value);
          break;
        case "id":
          if (!value.includes("\0")) {
            this._lastEventId = value;
          }
          break;
        case "retry": {
          const n = parseInt(value, 10);
          if (!Number.isNaN(n)) {
            // Could store retry, but not needed for our use case
          }
          break;
        }
        // Unknown fields are ignored per spec
      }
    }

    return events;
  }

  /** Reset parser state */
  reset(): void {
    this._eventType = "";
    this._data = [];
    this._buffer = "";
  }
}

// ---- Auth provider interface (minimal) ----

export interface SSEAuthProvider {
  tokens(): Promise<{ access_token: string } | null>;
}

// ---- SSE Transport Options ----

export interface SSETransportOptions {
  /** The SSE endpoint URL to connect to */
  url: string | URL;
  /** Additional headers to include on all requests */
  headers?: Record<string, string>;
  /** Auth provider for Bearer token */
  authProvider?: SSEAuthProvider;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
}

// ---- SSE Transport ----

/**
 * MCP transport over Server-Sent Events (legacy).
 *
 * Establishes a GET connection to the server that returns an SSE stream.
 * Waits for an `endpoint` event that provides the URL for POSTing
 * JSON-RPC messages. Messages from the server arrive as SSE `message` events.
 */
export class SSETransport implements MCPTransport {
  private _url: URL;
  private _headers: Record<string, string>;
  private _authProvider?: SSEAuthProvider;
  private _fetch: typeof globalThis.fetch;
  private _abortController?: AbortController;
  private _endpoint?: URL;
  private _protocolVersion?: string;
  private _started = false;

  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  constructor(options: SSETransportOptions) {
    this._url = typeof options.url === "string" ? new URL(options.url) : options.url;
    this._headers = options.headers ?? {};
    this._authProvider = options.authProvider;
    this._fetch = options.fetch ?? globalThis.fetch;
  }

  /**
   * Build common headers for requests (auth + protocol version + custom).
   */
  private async _buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { ...this._headers };

    if (this._authProvider) {
      const tokens = await this._authProvider.tokens();
      if (tokens) {
        headers.Authorization = `Bearer ${tokens.access_token}`;
      }
    }

    if (this._protocolVersion) {
      headers["mcp-protocol-version"] = this._protocolVersion;
    }

    return headers;
  }

  /**
   * Start the SSE connection.
   *
   * Sends a GET request with Accept: text/event-stream, then waits for
   * the `endpoint` event before resolving. Message events are forwarded
   * to onmessage.
   */
  async start(): Promise<void> {
    if (this._started) {
      throw new Error(
        "SSETransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    }
    this._started = true;

    this._abortController = new AbortController();

    const headers = await this._buildHeaders();
    headers.Accept = "text/event-stream";

    let response: Response;
    try {
      response = await this._fetch(this._url.href, {
        method: "GET",
        headers,
        signal: this._abortController.signal,
      });
    } catch (err) {
      this._started = false;
      const error = err instanceof Error ? err : new Error(String(err));
      this.onerror?.(error);
      throw error;
    }

    if (!response.ok) {
      this._started = false;
      const error = new Error(`SSE connection failed (HTTP ${response.status})`);
      this.onerror?.(error);
      throw error;
    }

    if (!response.body) {
      this._started = false;
      const error = new Error("SSE response has no body");
      this.onerror?.(error);
      throw error;
    }

    // Set up SSE reading from the response body
    return new Promise<void>((resolve, reject) => {
      const parser = new SSELineParser();
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let endpointReceived = false;

      const readLoop = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Stream ended
              this.onclose?.();
              return;
            }

            const text = decoder.decode(value, { stream: true });
            const events = parser.feed(text);

            for (const event of events) {
              if (event.event === "endpoint" && !endpointReceived) {
                // Validate and store endpoint URL
                try {
                  const endpointUrl = new URL(event.data, this._url);
                  if (endpointUrl.origin !== this._url.origin) {
                    const err = new Error(
                      `Endpoint origin does not match connection origin: ${endpointUrl.origin}`,
                    );
                    reject(err);
                    this.onerror?.(err);
                    this.close();
                    return;
                  }
                  this._endpoint = endpointUrl;
                  endpointReceived = true;
                  resolve();
                } catch (err) {
                  const error = err instanceof Error ? err : new Error(String(err));
                  reject(error);
                  this.onerror?.(error);
                  this.close();
                  return;
                }
              } else if (event.event === "message") {
                // Parse JSON-RPC message
                try {
                  const message = parseMessage(event.data);
                  this.onmessage?.(message);
                } catch (err) {
                  this.onerror?.(err instanceof Error ? err : new Error(String(err)));
                }
              }
            }
          }
        } catch (err) {
          // AbortError is expected on close
          if (err instanceof Error && err.name === "AbortError") {
            this.onclose?.();
            return;
          }
          const error = err instanceof Error ? err : new Error(String(err));
          if (!endpointReceived) {
            reject(error);
          }
          this.onerror?.(error);
        }
      };

      // Start reading in the background
      readLoop();
    });
  }

  /**
   * Send a JSON-RPC message by POSTing to the discovered endpoint.
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._endpoint) {
      throw new Error("Not connected");
    }

    const headers = await this._buildHeaders();
    headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await this._fetch(this._endpoint.href, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: this._abortController?.signal,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.onerror?.(error);
      throw error;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => null);

      if (response.status === 401 && this._authProvider) {
        // Trigger re-auth if provider exists
        const error = new Error(`Unauthorized (HTTP 401)`);
        this.onerror?.(error);
        throw error;
      }

      const error = new Error(`Error POSTing to endpoint (HTTP ${response.status}): ${body ?? ""}`);
      this.onerror?.(error);
      throw error;
    }

    // Discard response body
    await response.body?.cancel();
  }

  /**
   * Close the SSE connection and abort any in-flight requests.
   */
  async close(): Promise<void> {
    this._abortController?.abort();
    this._abortController = undefined;
    this._endpoint = undefined;
    this._started = false;
    this.onclose?.();
  }

  /**
   * Set the MCP protocol version for the mcp-protocol-version header.
   */
  setProtocolVersion(version: ProtocolVersion): void {
    this._protocolVersion = version;
  }

  /** The discovered POST endpoint URL, if connected */
  get endpoint(): URL | undefined {
    return this._endpoint;
  }
}
