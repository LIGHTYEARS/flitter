/**
 * @flitter/llm — MCP Connection & Client
 *
 * MCPClient wraps a transport + RequestManager to provide a high-level MCP API.
 * MCPConnection manages a single MCP server's connection lifecycle with
 * automatic reconnection and tool/resource/prompt discovery.
 *
 * Reversed: Uq (MCPConnection), wj (Client), nPR (URL transport fallback),
 *           APR (Stdio transport), pPR (transport selection)
 */

import { BehaviorSubject } from "@flitter/util";
import type { MCPAuthProvider } from "./auth/types";
import { createNotification, McpError, RequestManager } from "./protocol";
import type {
  ClientCapabilities,
  ImplementationInfo,
  InitializeResult,
  JSONRPCErrorResponse,
  JSONRPCMessage,
  JSONRPCNotification,
  JSONRPCSuccessResponse,
  MCPPrompt,
  MCPResource,
  MCPTool,
  MCPToolResult,
  MCPTransport,
  ProtocolVersion,
  ServerCapabilities,
} from "./types";
import { ErrorCode, LATEST_PROTOCOL_VERSION, Method } from "./types";

// ─── Constants ────────────────────────────────────────────

/** Client information sent during MCP initialize handshake. */
const CLIENT_INFO: ImplementationInfo = {
  name: "flitter-mcp-client",
  version: "0.1.0",
};

/** Default client capabilities. */
const DEFAULT_CAPABILITIES: ClientCapabilities = {
  roots: { listChanged: true },
};

/** Reconnection configuration. Reversed: ky */
export const RECONNECT_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 1.5,
} as const;

/** Timeout for initial MCP connection (ms). */
const CONNECTION_TIMEOUT_MS = 60_000;

/** Timeout for tool calls (ms). Very large to avoid premature timeouts. */
const TOOL_CALL_TIMEOUT_MS = 999_999_000;

/** Error codes that should NOT trigger reconnection. Reversed: _DT */
const PERMANENT_ERROR_CODES: string[] = ["auth-failed", "permission-denied"];

// ─── MCPConnectionStatus ──────────────────────────────────

export type MCPConnectionStatus =
  | { type: "connecting" }
  | { type: "authenticating" }
  | { type: "connected"; capabilities: ServerCapabilities; serverInfo: ImplementationInfo }
  | { type: "reconnecting"; attempt: number; nextRetryMs: number }
  | { type: "denied" }
  | { type: "awaiting-approval" }
  | { type: "failed"; error: MCPConnectionError };

export interface MCPConnectionError {
  code: string;
  message: string;
  stderr?: string;
}

// ─── MCPClient ────────────────────────────────────────────

/**
 * MCP Client — wraps a transport + RequestManager.
 * Performs the MCP initialize handshake and provides high-level API methods.
 *
 * Reversed: wj
 */
export class MCPClient {
  private _transport: MCPTransport | null = null;
  private _requestManager = new RequestManager();
  private _serverCapabilities: ServerCapabilities | undefined;
  private _serverInfo: ImplementationInfo | undefined;
  private _notificationHandlers = new Map<string, () => void>();
  private _closed = false;

  readonly clientInfo: ImplementationInfo;
  readonly capabilities: ClientCapabilities;

  onclose?: () => void;

  constructor(
    clientInfo: ImplementationInfo = CLIENT_INFO,
    capabilities: ClientCapabilities = DEFAULT_CAPABILITIES,
  ) {
    this.clientInfo = clientInfo;
    this.capabilities = capabilities;
  }

  /**
   * Connect to an MCP server via the given transport.
   * Performs: transport.start() -> initialize handshake -> notifications/initialized
   */
  async connect(transport: MCPTransport, options?: { timeout?: number }): Promise<void> {
    this._transport = transport;
    this._closed = false;

    // Wire up transport message handler
    transport.onmessage = (message: JSONRPCMessage) => {
      this._handleMessage(message);
    };

    transport.onclose = () => {
      this._requestManager.cancelAll("Transport closed");
      this.onclose?.();
    };

    transport.onerror = (error: Error) => {
      // Errors are non-fatal; the transport may still be usable
      // Pending requests will fail via onclose if the transport dies
      void error;
    };

    // Start the transport
    await transport.start();

    // Perform initialize handshake
    const timeout = options?.timeout ?? CONNECTION_TIMEOUT_MS;
    const { message, response } = this._requestManager.request(
      Method.Initialize,
      {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: this.capabilities,
        clientInfo: this.clientInfo,
      },
      { timeout },
    );

    await transport.send(message);
    const result = (await response) as InitializeResult;

    this._serverCapabilities = result.capabilities;
    this._serverInfo = result.serverInfo;

    // Set protocol version on transport if supported
    if (transport.setProtocolVersion && result.protocolVersion) {
      transport.setProtocolVersion(result.protocolVersion as ProtocolVersion);
    }

    // Send initialized notification
    const notification = createNotification(Method.Initialized);
    await transport.send(notification);
  }

  private _handleMessage(message: JSONRPCMessage): void {
    // Response (has id + result or error)
    if ("id" in message && ("result" in message || "error" in message)) {
      this._requestManager.handleResponse(message as JSONRPCSuccessResponse | JSONRPCErrorResponse);
      return;
    }

    // Notification (has method, no id)
    if ("method" in message && !("id" in message)) {
      const notification = message as JSONRPCNotification;
      const handler = this._notificationHandlers.get(notification.method);
      if (handler) handler();
      return;
    }

    // Request from server (has id + method) — we don't handle server requests yet
  }

  /**
   * Send a request and return the result.
   */
  private async _request(
    method: string,
    params?: unknown,
    options?: { timeout?: number; signal?: AbortSignal },
  ): Promise<unknown> {
    if (!this._transport || this._closed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is not connected");
    }

    const { message, response } = this._requestManager.request(method, params, options);
    await this._transport.send(message);
    return response;
  }

  // ─── High-level API ───────────────────────────────────

  async listTools(
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<{ tools: MCPTool[]; nextCursor?: string }> {
    const params = cursor ? { cursor } : undefined;
    const result = (await this._request(Method.ToolsList, params, {
      signal,
      timeout: TOOL_CALL_TIMEOUT_MS,
    })) as { tools: MCPTool[]; nextCursor?: string };
    return result;
  }

  async callTool(
    params: { name: string; arguments?: Record<string, unknown> },
    signal?: AbortSignal,
  ): Promise<MCPToolResult> {
    const result = (await this._request(Method.ToolsCall, params, {
      signal,
      timeout: TOOL_CALL_TIMEOUT_MS,
    })) as MCPToolResult;
    return result;
  }

  async listResources(
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<{ resources: MCPResource[]; nextCursor?: string }> {
    const params = cursor ? { cursor } : undefined;
    const result = (await this._request(Method.ResourcesList, params, {
      signal,
      timeout: TOOL_CALL_TIMEOUT_MS,
    })) as { resources: MCPResource[]; nextCursor?: string };
    return result;
  }

  async readResource(uri: string, signal?: AbortSignal): Promise<{ contents: unknown[] }> {
    const result = (await this._request(
      Method.ResourcesRead,
      { uri },
      { signal, timeout: TOOL_CALL_TIMEOUT_MS },
    )) as { contents: unknown[] };
    return result;
  }

  async listPrompts(
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<{ prompts: MCPPrompt[]; nextCursor?: string }> {
    const params = cursor ? { cursor } : undefined;
    const result = (await this._request(Method.PromptsList, params, {
      signal,
      timeout: TOOL_CALL_TIMEOUT_MS,
    })) as { prompts: MCPPrompt[]; nextCursor?: string };
    return result;
  }

  async getPrompt(
    params: { name: string; arguments?: Record<string, unknown> },
    signal?: AbortSignal,
  ): Promise<unknown> {
    return this._request(Method.PromptsGet, params, {
      signal,
      timeout: TOOL_CALL_TIMEOUT_MS,
    });
  }

  // ─── Notification handlers ────────────────────────────

  setNotificationHandler(method: string, handler: () => void): void {
    this._notificationHandlers.set(method, handler);
  }

  removeNotificationHandler(method: string): void {
    this._notificationHandlers.delete(method);
  }

  // ─── Accessors ────────────────────────────────────────

  getServerCapabilities(): ServerCapabilities | undefined {
    return this._serverCapabilities;
  }

  getServerVersion(): ImplementationInfo | undefined {
    return this._serverInfo;
  }

  // ─── Cleanup ──────────────────────────────────────────

  async close(): Promise<void> {
    if (this._closed) return;
    this._closed = true;
    this._requestManager.cancelAll("Client closed");
    this._notificationHandlers.clear();
    if (this._transport) {
      try {
        await this._transport.close();
      } catch {
        // ignore close errors
      }
      this._transport = null;
    }
  }
}

// ─── MCPServerSpec types ──────────────────────────────────

export interface MCPCommandServerSpec {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  _target?: string;
}

export interface MCPURLServerSpec {
  url: string;
  headers?: Record<string, string>;
  transport?: string;
  _target?: string;
}

export type MCPServerSpec = MCPCommandServerSpec | MCPURLServerSpec;

// ─── MCPConnection ────────────────────────────────────────

export interface MCPConnectionOptions {
  workingDirectory?: string;
  loadProfile?: string;
  authProvider?: MCPAuthProvider;
  serverName?: string;
  /** Override transport creation for testing */
  createTransport?: (spec: MCPServerSpec) => MCPTransport;
  /** Override client creation for testing */
  createClient?: () => MCPClient;
}

/**
 * MCPConnection manages a single MCP server's connection lifecycle.
 * It handles connecting, tool/resource/prompt discovery, list_changed
 * notifications, and automatic reconnection with exponential backoff.
 *
 * Reversed: Uq
 */
export class MCPConnection {
  readonly status$: BehaviorSubject<MCPConnectionStatus>;
  readonly tools$: BehaviorSubject<MCPTool[]>;
  readonly resources$: BehaviorSubject<MCPResource[]>;
  readonly prompts$: BehaviorSubject<MCPPrompt[]>;
  readonly toolsLoaded$: BehaviorSubject<boolean>;

  private _spec: MCPServerSpec;
  private _options: MCPConnectionOptions;
  private _client: MCPClient | null = null;
  private _disposed = false;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _reconnectAttempt = 0;

  constructor(spec: MCPServerSpec, options: MCPConnectionOptions = {}) {
    this._spec = spec;
    this._options = options;

    this.status$ = new BehaviorSubject<MCPConnectionStatus>({
      type: "connecting",
    });
    this.tools$ = new BehaviorSubject<MCPTool[]>([]);
    this.resources$ = new BehaviorSubject<MCPResource[]>([]);
    this.prompts$ = new BehaviorSubject<MCPPrompt[]>([]);
    this.toolsLoaded$ = new BehaviorSubject<boolean>(false);

    // Start connection
    this._connect();
  }

  private async _connect(): Promise<void> {
    if (this._disposed) return;

    this.status$.next({ type: "connecting" });

    try {
      // Create client
      const client = this._options.createClient ? this._options.createClient() : new MCPClient();

      // Create transport
      const transport = this._options.createTransport
        ? this._options.createTransport(this._spec)
        : this._createTransport(this._spec);

      // Set up close handler for reconnection
      client.onclose = () => {
        if (!this._disposed) {
          this._scheduleReconnect();
        }
      };

      // Connect
      await client.connect(transport, { timeout: CONNECTION_TIMEOUT_MS });

      if (this._disposed) {
        await client.close();
        return;
      }

      this._client = client;
      this._reconnectAttempt = 0;

      // Update status to connected
      this.status$.next({
        type: "connected",
        capabilities: client.getServerCapabilities() ?? {},
        serverInfo: client.getServerVersion() ?? { name: "unknown", version: "0.0.0" },
      });

      // Set up notification handlers
      this._setupNotificationHandlers(client);

      // Discover tools, resources, prompts
      await this._discoverCapabilities(client);
    } catch (err) {
      if (this._disposed) return;

      const error = this._classifyError(err);

      // Check for permanent errors
      if (PERMANENT_ERROR_CODES.includes(error.code)) {
        this.status$.next({ type: "failed", error });
        return;
      }

      this.status$.next({ type: "failed", error });
      this._scheduleReconnect(error);
    }
  }

  private _createTransport(_spec: MCPServerSpec): MCPTransport {
    // Dynamic imports would be needed in production, but for now
    // we throw if no createTransport is provided and there's no way
    // to dynamically create transports
    throw new Error(
      "No transport factory provided. Pass createTransport in options, " +
        "or use MCPConnection with a transport factory.",
    );
  }

  private _setupNotificationHandlers(client: MCPClient): void {
    // Tools list changed
    client.setNotificationHandler(Method.ListChanged, () => {
      this._refreshTools(client);
    });

    // Resources list changed
    client.setNotificationHandler(Method.ResourcesListChanged, () => {
      this._refreshResources(client);
    });

    // Prompts list changed
    client.setNotificationHandler(Method.PromptsListChanged, () => {
      this._refreshPrompts(client);
    });
  }

  private async _discoverCapabilities(client: MCPClient): Promise<void> {
    await Promise.all([
      this._refreshTools(client),
      this._refreshResources(client),
      this._refreshPrompts(client),
    ]);
  }

  private async _refreshTools(client: MCPClient): Promise<void> {
    try {
      const result = await client.listTools();
      this.tools$.next(result.tools);
      this.toolsLoaded$.next(true);
    } catch (_err) {
      // Keep existing tools on error, but mark as loaded
      this.toolsLoaded$.next(true);
    }
  }

  private async _refreshResources(client: MCPClient): Promise<void> {
    try {
      const capabilities = client.getServerCapabilities();
      if (!capabilities?.resources) {
        this.resources$.next([]);
        return;
      }
      const result = await client.listResources();
      this.resources$.next(result.resources);
    } catch {
      // Keep existing resources on error
    }
  }

  private async _refreshPrompts(client: MCPClient): Promise<void> {
    try {
      const capabilities = client.getServerCapabilities();
      if (!capabilities?.prompts) {
        this.prompts$.next([]);
        return;
      }
      const result = await client.listPrompts();
      this.prompts$.next(result.prompts);
    } catch {
      // Keep existing prompts on error
    }
  }

  private _scheduleReconnect(error?: MCPConnectionError): void {
    if (this._disposed) return;

    // Check max retries
    if (this._reconnectAttempt >= RECONNECT_CONFIG.maxRetries) {
      this.status$.next({
        type: "failed",
        error: error ?? { code: "network", message: "Max reconnection attempts reached" },
      });
      return;
    }

    // Check permanent errors
    if (error && PERMANENT_ERROR_CODES.includes(error.code)) {
      this.status$.next({ type: "failed", error });
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      RECONNECT_CONFIG.initialDelayMs * RECONNECT_CONFIG.backoffFactor ** this._reconnectAttempt,
      RECONNECT_CONFIG.maxDelayMs,
    );

    const attempt = this._reconnectAttempt + 1;

    this.status$.next({
      type: "reconnecting",
      attempt,
      nextRetryMs: delay,
    });

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (!this._disposed) {
        this._reconnectAttempt = attempt;
        this.toolsLoaded$.next(false);
        this._connect();
      }
    }, delay);
  }

  private _classifyError(err: unknown): MCPConnectionError {
    if (err instanceof McpError) {
      // Map MCP error codes to connection error codes
      if (err.code === ErrorCode.InvalidParams) {
        return { code: "permission-denied", message: err.message };
      }
      return { code: "server-error", message: err.message };
    }

    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
      return { code: "network", message };
    }
    if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
      return { code: "timeout", message };
    }
    if (message.includes("ENOENT") || message.includes("spawn")) {
      return { code: "spawn-failed", message };
    }
    if (message.includes("auth") || message.includes("401")) {
      return { code: "auth-failed", message };
    }

    return { code: "server-error", message };
  }

  // ─── Public API ─────────────────────────────────────────

  /**
   * Call a tool on the connected MCP server.
   */
  async callTool(
    params: { name: string; arguments?: Record<string, unknown> },
    signal?: AbortSignal,
  ): Promise<MCPToolResult> {
    const client = this._client;
    if (!client) {
      throw new Error("MCP client is not connected");
    }
    return client.callTool(params, signal);
  }

  /**
   * List resources from the connected MCP server.
   */
  async listResources(signal?: AbortSignal): Promise<MCPResource[]> {
    const client = this._client;
    if (!client) {
      throw new Error("MCP client is not connected");
    }
    const capabilities = client.getServerCapabilities();
    if (!capabilities?.resources) return [];
    const result = await client.listResources(undefined, signal);
    return result.resources;
  }

  /**
   * Read a resource from the connected MCP server.
   */
  async readResource(uri: string, signal?: AbortSignal): Promise<unknown[]> {
    const client = this._client;
    if (!client) {
      throw new Error("MCP client is not connected");
    }
    const result = await client.readResource(uri, signal);
    return result.contents;
  }

  /**
   * Get a prompt from the connected MCP server.
   */
  async getPrompt(
    name: string,
    args?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const client = this._client;
    if (!client) {
      throw new Error("MCP client is not connected");
    }
    try {
      return await client.getPrompt({ name, arguments: args }, signal);
    } catch {
      return null;
    }
  }

  /**
   * Get the current connection status.
   */
  get status(): MCPConnectionStatus {
    return this.status$.value;
  }

  /**
   * Get the current tool list.
   */
  get tools(): MCPTool[] {
    return this.tools$.value;
  }

  /**
   * Clean up the connection and all resources.
   */
  async dispose(): Promise<void> {
    if (this._disposed) return;
    this._disposed = true;

    // Cancel reconnect timer
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    // Close client
    if (this._client) {
      try {
        await this._client.close();
      } catch {
        // ignore close errors
      }
      this._client = null;
    }
  }
}
