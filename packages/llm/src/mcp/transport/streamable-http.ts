/**
 * @flitter/llm -- MCP StreamableHTTP Transport
 *
 * HTTP POST + SSE response stream transport for MCP.
 * Translated from reversed T7 class. Zero external MCP SDK dependency (KD-24).
 *
 * Key behaviors:
 * - POST JSON-RPC messages to a URL endpoint
 * - Handle responses as either application/json or text/event-stream
 * - Capture and propagate mcp-session-id
 * - Support auth via authProvider (Bearer token)
 * - Support protocol version header
 * - Support session termination via HTTP DELETE
 * - Support resumption tokens via SSE event id + Last-Event-ID header
 */

import { SSEEventParser } from "./sse-parser";
import { parseMessage } from "../protocol";
import type { MCPTransport, JSONRPCMessage, ProtocolVersion } from "../types";

/**
 * Minimal auth provider interface for StreamableHTTP transport.
 * Full OAuth flow is handled in Plan 08-05; this is the interface contract.
 */
export interface MCPAuthProvider {
  /** Return current tokens, or undefined if not authenticated. */
  tokens(): Promise<{ access_token: string } | undefined>;
}

/**
 * Options for StreamableHTTPTransport.
 */
export interface StreamableHTTPTransportOptions {
  /** The URL to POST JSON-RPC messages to. */
  url: string | URL;
  /** Additional headers to include in every request. */
  headers?: Record<string, string>;
  /** Auth provider for Bearer token authentication. */
  authProvider?: MCPAuthProvider;
  /** Custom fetch function (defaults to global fetch). */
  fetch?: typeof fetch;
}

/**
 * Error thrown when the server returns a non-OK HTTP status.
 */
export class StreamableHTTPError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "StreamableHTTPError";
    this.status = status;
  }
}

/**
 * Error thrown when authentication is required but no auth provider
 * is available, or auth fails.
 */
export class UnauthorizedError extends Error {
  constructor(message?: string) {
    super(message ?? "Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Check if a JSON-RPC message is a request (has id + method).
 */
function isRequest(msg: JSONRPCMessage): boolean {
  return "method" in msg && "id" in msg && (msg as any).id !== undefined;
}

/**
 * Check if a JSON-RPC message is a notification (has method but no id).
 */
function isNotification(msg: JSONRPCMessage): boolean {
  return "method" in msg && !("id" in msg);
}

/**
 * StreamableHTTP Transport implementing the MCPTransport interface.
 *
 * Communication pattern:
 * 1. Client sends JSON-RPC messages as HTTP POST with JSON body
 * 2. Server responds with either:
 *    - application/json: direct JSON-RPC response
 *    - text/event-stream: SSE stream of JSON-RPC messages
 * 3. Session management via mcp-session-id header
 * 4. Session termination via HTTP DELETE
 */
export class StreamableHTTPTransport implements MCPTransport {
  private _url: URL;
  private _customHeaders: Record<string, string>;
  private _authProvider?: MCPAuthProvider;
  private _fetch: typeof fetch;
  private _abortController?: AbortController;
  private _sessionId?: string;
  private _protocolVersion?: string;
  private _lastEventId?: string;

  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  constructor(options: StreamableHTTPTransportOptions) {
    this._url = typeof options.url === "string" ? new URL(options.url) : options.url;
    this._customHeaders = options.headers ?? {};
    this._authProvider = options.authProvider;
    this._fetch = options.fetch ?? globalThis.fetch;
  }

  /** Current session ID (captured from server responses). */
  get sessionId(): string | undefined {
    return this._sessionId;
  }

  /** Set the protocol version to include in requests. */
  setProtocolVersion(version: ProtocolVersion): void {
    this._protocolVersion = version;
  }

  /** Get the current protocol version. */
  get protocolVersion(): string | undefined {
    return this._protocolVersion;
  }

  /**
   * Build common headers for all requests.
   */
  private async _buildHeaders(): Promise<Headers> {
    const headers: Record<string, string> = {};

    // Auth token
    if (this._authProvider) {
      const tokenResult = await this._authProvider.tokens();
      if (tokenResult) {
        headers["Authorization"] = `Bearer ${tokenResult.access_token}`;
      }
    }

    // Session ID
    if (this._sessionId) {
      headers["mcp-session-id"] = this._sessionId;
    }

    // Protocol version
    if (this._protocolVersion) {
      headers["mcp-protocol-version"] = this._protocolVersion;
    }

    // Merge custom headers (custom headers take precedence for non-protocol headers)
    return new Headers({
      ...headers,
      ...this._customHeaders,
    });
  }

  /**
   * Start the transport. Creates the abort controller.
   */
  async start(): Promise<void> {
    if (this._abortController) {
      throw new Error(
        "StreamableHTTPTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    }
    this._abortController = new AbortController();
  }

  /**
   * Send a JSON-RPC message to the server.
   *
   * The server may respond with:
   * - 200 + application/json: direct JSON-RPC response
   * - 200 + text/event-stream: SSE stream of messages
   * - 202: notification accepted (no response body)
   * - 401: authentication required
   * - Other errors: throws StreamableHTTPError
   */
  async send(message: JSONRPCMessage): Promise<void> {
    try {
      const headers = await this._buildHeaders();
      headers.set("Content-Type", "application/json");
      headers.set("Accept", "application/json, text/event-stream");

      // If we have a last event ID from SSE, include it for resumption
      if (this._lastEventId) {
        headers.set("Last-Event-ID", this._lastEventId);
      }

      const response = await this._fetch(this._url.href, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: this._abortController?.signal,
      });

      // Capture session ID
      const sessionId = response.headers.get("mcp-session-id");
      if (sessionId) {
        this._sessionId = sessionId;
      }

      // Handle non-OK responses
      if (!response.ok) {
        const body = await response.text().catch(() => null);

        if (response.status === 401 && this._authProvider) {
          throw new UnauthorizedError(
            `Server returned 401: ${body ?? response.statusText}`,
          );
        }

        throw new StreamableHTTPError(
          response.status,
          `Error POSTing to endpoint (${response.status}): ${body ?? response.statusText}`,
        );
      }

      // 202 Accepted -- notification was accepted, no response body
      if (response.status === 202) {
        await response.body?.cancel();
        return;
      }

      // Determine if this message expects a response
      const expectsResponse = isRequest(message);

      if (!expectsResponse) {
        // Notification: no response expected
        await response.body?.cancel();
        return;
      }

      // Parse response based on Content-Type
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("text/event-stream")) {
        // SSE stream response
        this._handleSSEStream(response.body);
      } else if (contentType?.includes("application/json")) {
        // Direct JSON response
        const json = await response.json();
        const messages = Array.isArray(json)
          ? json.map((m: unknown) => parseMessage(JSON.stringify(m)))
          : [parseMessage(JSON.stringify(json))];

        for (const msg of messages) {
          this.onmessage?.(msg);
        }
      } else {
        await response.body?.cancel();
        throw new StreamableHTTPError(
          -1,
          `Unexpected content type: ${contentType}`,
        );
      }
    } catch (err) {
      // Re-throw abort errors without calling onerror
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      const error = err instanceof Error ? err : new Error(String(err));
      this.onerror?.(error);
      throw err;
    }
  }

  /**
   * Handle an SSE response stream: pipe through TextDecoderStream and
   * SSEEventParser, extract JSON-RPC messages from `data` fields.
   */
  private _handleSSEStream(body: ReadableStream<Uint8Array> | null): void {
    if (!body) return;

    (async () => {
      try {
        const reader = body
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new SSEEventParser())
          .getReader();

        while (true) {
          const { value: event, done } = await reader.read();
          if (done) break;

          // Track event ID for resumption
          if (event.id) {
            this._lastEventId = event.id;
          }

          // Skip events without data
          if (!event.data) continue;

          // Only process "message" events or events with no type
          if (!event.event || event.event === "message") {
            try {
              const msg = parseMessage(event.data);
              this.onmessage?.(msg);
            } catch (parseErr) {
              this.onerror?.(
                parseErr instanceof Error
                  ? parseErr
                  : new Error(String(parseErr)),
              );
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // Expected when transport is closed
        }
        this.onerror?.(
          err instanceof Error
            ? new Error(`SSE stream disconnected: ${err.message}`)
            : new Error(`SSE stream disconnected: ${err}`),
        );
      }
    })();
  }

  /**
   * Terminate the MCP session by sending an HTTP DELETE request.
   */
  async terminateSession(): Promise<void> {
    if (!this._sessionId) return;

    try {
      const headers = await this._buildHeaders();

      const response = await this._fetch(this._url.href, {
        method: "DELETE",
        headers,
        signal: this._abortController?.signal,
      });

      await response.body?.cancel();

      if (!response.ok && response.status !== 405) {
        throw new StreamableHTTPError(
          response.status,
          `Failed to terminate session: ${response.statusText}`,
        );
      }

      this._sessionId = undefined;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.onerror?.(error);
      throw err;
    }
  }

  /**
   * Close the transport. Aborts all active streams and fires onclose.
   */
  async close(): Promise<void> {
    this._abortController?.abort();
    this.onclose?.();
  }
}
