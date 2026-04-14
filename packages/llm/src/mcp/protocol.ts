/**
 * @flitter/llm — MCP JSON-RPC 2.0 Protocol
 *
 * Encoding/decoding, error handling, and request management.
 * Direct translation from reversed VyR/XyR, l9, and request tracking.
 */
import type {
  JSONRPCErrorResponse,
  JSONRPCMessage,
  JSONRPCNotification,
  JSONRPCRequest,
  JSONRPCSuccessResponse,
} from "./types";
import { ErrorCode } from "./types";

// ─── Encoders ──────────────────────────────────────────

let _nextId = 1;

/** Reset ID counter (for testing) */
export function _resetIdCounter(): void {
  _nextId = 1;
}

export function createRequest(method: string, params?: unknown): JSONRPCRequest {
  return {
    jsonrpc: "2.0",
    id: _nextId++,
    method,
    ...(params !== undefined && { params }),
  };
}

export function createNotification(method: string, params?: unknown): JSONRPCNotification {
  return {
    jsonrpc: "2.0",
    method,
    ...(params !== undefined && { params }),
  };
}

export function createSuccessResponse(
  id: string | number,
  result: unknown,
): JSONRPCSuccessResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

export function createErrorResponse(
  id: string | number,
  code: number,
  message: string,
  data?: unknown,
): JSONRPCErrorResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message, ...(data !== undefined && { data }) },
  };
}

// ─── Decoder ───────────────────────────────────────────

/** Check if a value is a valid JSON-RPC 2.0 message */
function isJSONRPCMessage(value: unknown): value is JSONRPCMessage {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.jsonrpc !== "2.0") return false;

  // Response (has id + result or error)
  if ("id" in obj && ("result" in obj || "error" in obj)) {
    const idOk = typeof obj.id === "string" || typeof obj.id === "number";
    if (!idOk) return false;
    if ("error" in obj) {
      const err = obj.error as Record<string, unknown>;
      return (
        typeof err === "object" &&
        err !== null &&
        typeof err.code === "number" &&
        typeof err.message === "string"
      );
    }
    return true;
  }

  // Request (has id + method)
  if ("id" in obj && "method" in obj) {
    return (
      (typeof obj.id === "string" || typeof obj.id === "number") && typeof obj.method === "string"
    );
  }

  // Notification (has method, no id)
  if ("method" in obj && !("id" in obj)) {
    return typeof obj.method === "string";
  }

  return false;
}

/**
 * Parse a JSON string into a JSONRPCMessage.
 * Translated from reversed VyR: `vP.parse(JSON.parse(T))`
 */
export function parseMessage(input: string): JSONRPCMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new McpError(ErrorCode.ParseError, `Invalid JSON: ${input.slice(0, 100)}`);
  }
  if (!isJSONRPCMessage(parsed)) {
    throw new McpError(ErrorCode.InvalidRequest, "Invalid JSON-RPC 2.0 message");
  }
  return parsed as JSONRPCMessage;
}

/**
 * Serialize a JSONRPCMessage to a newline-delimited JSON string.
 * Translated from reversed XyR: `JSON.stringify(T) + "\n"`
 */
export function serializeMessage(message: JSONRPCMessage): string {
  return JSON.stringify(message) + "\n";
}

// ─── McpError ──────────────────────────────────────────

/**
 * MCP protocol error with error code and optional data.
 * Translated from reversed l9 class.
 */
export class McpError extends Error {
  readonly code: number;
  readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(`MCP error ${code}: ${message}`);
    this.name = "McpError";
    this.code = code;
    this.data = data;
  }

  static fromError(err: unknown): McpError {
    if (err instanceof McpError) return err;
    const message = err instanceof Error ? err.message : String(err);
    return new McpError(ErrorCode.InternalError, message);
  }

  toJSON(): { code: number; message: string; data?: unknown } {
    return {
      code: this.code,
      message: this.message,
      ...(this.data !== undefined && { data: this.data }),
    };
  }
}

// ─── RequestManager ────────────────────────────────────

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
}

/**
 * Manages pending JSON-RPC requests with timeout and cancellation.
 * Tracks in-flight requests by ID, resolves/rejects on response.
 */
export class RequestManager {
  private _pending = new Map<string | number, PendingRequest>();
  private _nextId = 1;

  /** Create a request with a unique auto-increment ID */
  createRequest(method: string, params?: unknown): JSONRPCRequest {
    return {
      jsonrpc: "2.0",
      id: this._nextId++,
      method,
      ...(params !== undefined && { params }),
    };
  }

  /**
   * Register a pending request and return a promise that resolves
   * when the response is received.
   */
  request(
    method: string,
    params?: unknown,
    options?: { timeout?: number; signal?: AbortSignal },
  ): { message: JSONRPCRequest; response: Promise<unknown> } {
    const message = this.createRequest(method, params);

    const response = new Promise<unknown>((resolve, reject) => {
      const pending: PendingRequest = { resolve, reject };

      if (options?.timeout && options.timeout > 0) {
        pending.timer = setTimeout(() => {
          this._pending.delete(message.id);
          reject(
            new McpError(
              ErrorCode.RequestTimeout,
              `Request ${message.id} timed out after ${options.timeout}ms`,
            ),
          );
        }, options.timeout);
      }

      if (options?.signal) {
        options.signal.addEventListener(
          "abort",
          () => {
            if (pending.timer) clearTimeout(pending.timer);
            this._pending.delete(message.id);
            reject(new McpError(ErrorCode.RequestTimeout, "Request cancelled"));
          },
          { once: true },
        );
      }

      this._pending.set(message.id, pending);
    });

    return { message, response };
  }

  /** Handle an incoming response message */
  handleResponse(message: JSONRPCSuccessResponse | JSONRPCErrorResponse): boolean {
    const pending = this._pending.get(message.id);
    if (!pending) return false;

    if (pending.timer) clearTimeout(pending.timer);
    this._pending.delete(message.id);

    if ("error" in message) {
      pending.reject(new McpError(message.error.code, message.error.message, message.error.data));
    } else {
      pending.resolve(message.result);
    }
    return true;
  }

  /** Cancel all pending requests */
  cancelAll(reason?: string): void {
    const error = new McpError(ErrorCode.ConnectionClosed, reason ?? "Connection closed");
    for (const [_id, pending] of this._pending) {
      if (pending.timer) clearTimeout(pending.timer);
      pending.reject(error);
    }
    this._pending.clear();
  }

  /** Number of pending requests */
  get pendingCount(): number {
    return this._pending.size;
  }

  /** Get current next ID value (for testing) */
  get nextId(): number {
    return this._nextId;
  }
}
