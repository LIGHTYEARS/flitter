/**
 * @flitter/llm — MCP Server Manager
 *
 * Aggregates multiple MCPConnections, provides namespaced tool access,
 * and routes tool calls to the correct server.
 *
 * Reversed: jPR
 */

import { BehaviorSubject, type Subscription } from "@flitter/util";
import type {
  MCPTool,
  MCPToolResult,
  MCPResource,
  MCPPrompt,
} from "./types";
import {
  MCPConnection,
  type MCPConnectionStatus,
  type MCPServerSpec,
  type MCPConnectionOptions,
} from "./connection";
import {
  namespacedToolName,
  parseNamespacedToolName,
} from "./tools";
import type { MCPAuthProvider } from "./auth/types";

// ─── Types ────────────────────────────────────────────────

export interface MCPServerInfo {
  name: string;
  spec: MCPServerSpec;
  status: MCPConnectionStatus;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

export interface NamespacedMCPTool {
  /** Namespaced name: mcp__<server>__<tool> */
  name: string;
  /** Original tool name on the MCP server */
  originalName: string;
  /** Server name this tool belongs to */
  serverName: string;
  /** Tool description */
  description?: string;
  /** JSON Schema for tool input */
  inputSchema: Record<string, unknown>;
  /** Tool output schema (optional) */
  outputSchema?: Record<string, unknown>;
  /** Tool annotations (optional) */
  annotations?: Record<string, unknown>;
}

export interface MCPServerManagerOptions {
  /** Function that returns the current MCP servers configuration. */
  getConfig: () => Record<string, MCPServerSpec>;
  /** Working directory for Stdio transports. */
  workingDirectory?: string;
  /** Factory for creating OAuth providers for URL-based servers. */
  createOAuthProvider?: (serverName: string, url: string) => MCPAuthProvider | undefined;
  /** Override connection creation for testing. */
  createConnection?: (name: string, spec: MCPServerSpec) => MCPConnection;
}

// ─── MCPServerManager ─────────────────────────────────────

/**
 * MCPServerManager aggregates multiple MCPConnections.
 * It manages a map of server name -> MCPConnection, exposes
 * aggregated tools (namespaced), and routes callTool requests
 * by namespace prefix.
 *
 * Reversed: jPR
 */
export class MCPServerManager {
  readonly servers$: BehaviorSubject<Map<string, MCPServerInfo>>;
  readonly allTools$: BehaviorSubject<NamespacedMCPTool[]>;

  private _connections = new Map<string, MCPConnection>();
  private _specs = new Map<string, string>(); // name -> JSON.stringify(spec)
  private _subscriptions = new Map<string, Subscription[]>();
  private _options: MCPServerManagerOptions;
  private _disposed = false;

  constructor(options: MCPServerManagerOptions) {
    this._options = options;
    this.servers$ = new BehaviorSubject<Map<string, MCPServerInfo>>(new Map());
    this.allTools$ = new BehaviorSubject<NamespacedMCPTool[]>([]);

    // Initialize from config
    this.refresh();
  }

  /**
   * Refresh connections based on current configuration.
   * Compares specs to only create/destroy connections that changed.
   *
   * Reversed: Uses XE (JSON.stringify comparison) for spec diffing.
   */
  refresh(): void {
    if (this._disposed) return;

    const config = this._options.getConfig();
    const currentNames = new Set(this._connections.keys());
    const newNames = new Set(Object.keys(config));

    // Remove servers no longer in config
    for (const name of currentNames) {
      if (!newNames.has(name)) {
        this._removeServer(name);
      }
    }

    // Add or update servers
    for (const [name, spec] of Object.entries(config)) {
      const specHash = JSON.stringify(spec);
      const existingHash = this._specs.get(name);

      if (existingHash === specHash) {
        // Spec unchanged, skip
        continue;
      }

      // Spec changed or new server — remove old if exists, then create new
      if (this._connections.has(name)) {
        this._removeServer(name);
      }

      this._addServer(name, spec);
    }
  }

  private _addServer(name: string, spec: MCPServerSpec): void {
    const specHash = JSON.stringify(spec);

    // Create connection
    const connection = this._options.createConnection
      ? this._options.createConnection(name, spec)
      : new MCPConnection(spec, {
          workingDirectory: this._options.workingDirectory,
          serverName: name,
          authProvider:
            "url" in spec && this._options.createOAuthProvider
              ? this._options.createOAuthProvider(name, spec.url)
              : undefined,
        });

    this._connections.set(name, connection);
    this._specs.set(name, specHash);

    // Subscribe to connection changes and update aggregated state
    const subs: Subscription[] = [];

    // Subscribe to status changes
    subs.push(
      connection.status$.subscribe(() => this._updateServers()),
    );

    // Subscribe to tool changes
    subs.push(
      connection.tools$.subscribe(() => {
        this._updateServers();
        this._updateAllTools();
      }),
    );

    // Subscribe to resource changes
    subs.push(
      connection.resources$.subscribe(() => this._updateServers()),
    );

    // Subscribe to prompt changes
    subs.push(
      connection.prompts$.subscribe(() => this._updateServers()),
    );

    this._subscriptions.set(name, subs);

    // Trigger initial update
    this._updateServers();
    this._updateAllTools();
  }

  private _removeServer(name: string): void {
    // Unsubscribe from all observables
    const subs = this._subscriptions.get(name);
    if (subs) {
      for (const sub of subs) sub.unsubscribe();
      this._subscriptions.delete(name);
    }

    // Dispose connection
    const connection = this._connections.get(name);
    if (connection) {
      connection.dispose().catch(() => {
        // ignore dispose errors
      });
      this._connections.delete(name);
    }

    this._specs.delete(name);

    // Update aggregated state
    this._updateServers();
    this._updateAllTools();
  }

  private _updateServers(): void {
    const servers = new Map<string, MCPServerInfo>();
    for (const [name, connection] of this._connections) {
      const spec = JSON.parse(this._specs.get(name)!) as MCPServerSpec;
      servers.set(name, {
        name,
        spec,
        status: connection.status$.value,
        tools: connection.tools$.value,
        resources: connection.resources$.value,
        prompts: connection.prompts$.value,
      });
    }
    this.servers$.next(servers);
  }

  private _updateAllTools(): void {
    const tools: NamespacedMCPTool[] = [];
    for (const [name, connection] of this._connections) {
      for (const tool of connection.tools$.value) {
        tools.push({
          name: namespacedToolName(name, tool.name),
          originalName: tool.name,
          serverName: name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          outputSchema: tool.outputSchema,
          annotations: tool.annotations,
        });
      }
    }
    this.allTools$.next(tools);
  }

  // ─── Public API ─────────────────────────────────────────

  /**
   * Call a tool by its namespaced name.
   * Parses the namespace prefix to route to the correct MCPConnection.
   */
  async callTool(
    namespacedName: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<MCPToolResult> {
    const parsed = parseNamespacedToolName(namespacedName);
    if (!parsed) {
      throw new Error(
        `Invalid namespaced tool name: "${namespacedName}". ` +
          `Expected format: mcp__<server>__<tool>`,
      );
    }

    const connection = this._connections.get(parsed.serverName);
    if (!connection) {
      throw new Error(
        `MCP server "${parsed.serverName}" not found. ` +
          `Available servers: ${[...this._connections.keys()].join(", ")}`,
      );
    }

    return connection.callTool(
      { name: parsed.toolName, arguments: args },
      signal,
    );
  }

  /**
   * Get a connection by server name.
   */
  getConnection(name: string): MCPConnection | undefined {
    return this._connections.get(name);
  }

  /**
   * Get all server names.
   */
  getServerNames(): string[] {
    return [...this._connections.keys()];
  }

  /**
   * Dispose all connections and clean up.
   */
  async dispose(): Promise<void> {
    if (this._disposed) return;
    this._disposed = true;

    // Unsubscribe all
    for (const [, subs] of this._subscriptions) {
      for (const sub of subs) sub.unsubscribe();
    }
    this._subscriptions.clear();

    // Dispose all connections
    const disposePromises: Promise<void>[] = [];
    for (const [, connection] of this._connections) {
      disposePromises.push(
        connection.dispose().catch(() => {
          // ignore dispose errors
        }),
      );
    }
    await Promise.all(disposePromises);

    this._connections.clear();
    this._specs.clear();
  }
}
