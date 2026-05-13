/**
 * @flitter/mcp — MCP Transport Factory
 *
 * Creates the appropriate MCP transport for a given server spec.
 * For URL-based servers, tries StreamableHTTP first and falls back to SSE.
 * For command-based servers, uses Stdio.
 *
 * 逆向: pPR (modules/1795_unknown_pPR.js) — top-level transport selector
 *        nPR (modules/1792_StreamableHTTPClientTransport_nPR.js) — URL transport with fallback
 *        APR (modules/1794_unknown_APR.js) — Stdio transport
 */

import { createLogger } from "@flitter/util";
import type { MCPAuthProvider } from "../auth/types";
import type { MCPCommandServerSpec, MCPServerSpec, MCPURLServerSpec } from "../connection";
import type { MCPTransport } from "../types";
import type { SSEAuthProvider } from "./sse";
import { SSETransport } from "./sse";
import { StdioTransport } from "./stdio";
import { StreamableHTTPTransport } from "./streamable-http";

const log = createLogger("mcp:transport-factory");

/**
 * Options for the transport factory.
 */
export interface TransportFactoryOptions {
  /** Auth provider for URL-based servers. */
  authProvider?: MCPAuthProvider;
  /** Working directory for stdio-based servers. */
  cwd?: string;
}

/**
 * Result of transport creation — includes the transport and metadata about
 * which transport type was selected (useful for debugging/logging).
 */
export interface TransportCreateResult {
  transport: MCPTransport;
  transportType: "streamable-http" | "sse" | "stdio";
}

/**
 * Resolve environment variable references in a string.
 * Replaces `${ENV_VAR}` patterns with their values.
 *
 * 逆向: z$ (chunk-005.js) — env var interpolation in MCP specs
 */
function resolveEnvVars(
  value: string,
  env: Record<string, string | undefined> = process.env,
): string {
  return value.replace(/\$\{([^}]+)\}/g, (_match, varName) => {
    return env[varName] ?? "";
  });
}

/**
 * Check if a server spec is URL-based.
 */
function isURLSpec(spec: MCPServerSpec): spec is MCPURLServerSpec {
  return "url" in spec;
}

/**
 * Create the appropriate MCP transport for a server spec.
 *
 * For URL-based servers:
 *   1. Try StreamableHTTP first
 *   2. If that fails, fall back to SSE (legacy)
 *
 * For command-based servers:
 *   Use Stdio transport directly.
 *
 * 逆向: pPR() in modules/1795_unknown_pPR.js
 *
 * @param spec - The MCP server specification
 * @param options - Optional transport factory options
 * @returns The transport and its type
 */
export function createMCPTransport(
  spec: MCPServerSpec,
  options: TransportFactoryOptions = {},
): MCPTransport {
  if (isURLSpec(spec)) {
    return createURLTransport(spec, options);
  }
  return createStdioTransport(spec as MCPCommandServerSpec, options);
}

/**
 * Create a transport for URL-based MCP servers.
 * Tries StreamableHTTP first; the fallback to SSE happens at connect time
 * (the factory returns a FallbackURLTransport that encapsulates this logic).
 *
 * 逆向: nPR() in modules/1792_StreamableHTTPClientTransport_nPR.js
 */
function createURLTransport(
  spec: MCPURLServerSpec,
  options: TransportFactoryOptions,
): MCPTransport {
  const resolvedURL = resolveEnvVars(spec.url);
  const headers = spec.headers
    ? Object.fromEntries(Object.entries(spec.headers).map(([k, v]) => [k, resolveEnvVars(v)]))
    : undefined;

  // Return a FallbackURLTransport that tries StreamableHTTP, then SSE
  return new FallbackURLTransport(resolvedURL, headers, options.authProvider);
}

/**
 * Create a transport for command-based (stdio) MCP servers.
 *
 * 逆向: APR() in modules/1794_unknown_APR.js
 */
function createStdioTransport(
  spec: MCPCommandServerSpec,
  options: TransportFactoryOptions,
): MCPTransport {
  const env = spec.env
    ? Object.fromEntries(Object.entries(spec.env).map(([k, v]) => [k, resolveEnvVars(v)]))
    : undefined;

  return new StdioTransport({
    command: spec.command,
    args: spec.args,
    env,
    cwd: options.cwd,
  });
}

/**
 * FallbackURLTransport — wraps StreamableHTTP + SSE fallback.
 *
 * On `start()`, tries StreamableHTTP first. If it fails (any error),
 * closes it and retries with SSE. This matches amp's nPR behavior where
 * the fallback happens during the connect/start phase.
 *
 * 逆向: nPR tries StreamableHTTPClientTransport.connect() first,
 *        catches any error, then creates a new SSEClientTransport
 *        and connects with that instead.
 */
class FallbackURLTransport implements MCPTransport {
  private _inner: MCPTransport | null = null;
  private _url: string;
  private _headers: Record<string, string> | undefined;
  private _authProvider: MCPAuthProvider | undefined;

  onmessage?: (message: import("../types").JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  setProtocolVersion?: (version: import("../types").ProtocolVersion) => void;

  constructor(url: string, headers?: Record<string, string>, authProvider?: MCPAuthProvider) {
    this._url = url;
    this._headers = headers;
    this._authProvider = authProvider;
  }

  /**
   * Start the transport — try StreamableHTTP, fall back to SSE on failure.
   *
   * 逆向: nPR try/catch pattern (modules/1792:11-52)
   */
  async start(): Promise<void> {
    // Try StreamableHTTP first
    const httpTransport = new StreamableHTTPTransport({
      url: this._url,
      headers: this._headers,
      authProvider: this._authProvider,
    });

    try {
      this._wireInner(httpTransport);
      await httpTransport.start();
      this._inner = httpTransport;
      log.debug("Connected using StreamableHTTP", { url: this._url });
      return;
    } catch (err) {
      log.debug("StreamableHTTP failed, falling back to SSE", {
        url: this._url,
        error: err instanceof Error ? err.message : String(err),
      });

      // Close the failed transport
      // 逆向: nPR line 53-58 — tries to close previous client on failure
      try {
        await httpTransport.close();
      } catch {
        // ignore close errors
      }
    }

    // Fall back to SSE
    // 逆向: nPR line 60-68 — creates new SSEClientTransport (JD)
    const sseAuthProvider: SSEAuthProvider | undefined = this._authProvider
      ? {
          tokens: async () => {
            const result = await this._authProvider!.tokens();
            return result ?? null;
          },
        }
      : undefined;

    const sseTransport = new SSETransport({
      url: this._url,
      headers: this._headers,
      authProvider: sseAuthProvider,
    });

    this._wireInner(sseTransport);
    await sseTransport.start();
    this._inner = sseTransport;
    log.debug("Connected using SSE (fallback)", { url: this._url });
  }

  private _wireInner(transport: MCPTransport): void {
    transport.onmessage = (msg) => this.onmessage?.(msg);
    transport.onclose = () => this.onclose?.();
    transport.onerror = (err) => this.onerror?.(err);
    if (transport.setProtocolVersion) {
      this.setProtocolVersion = (v) => transport.setProtocolVersion!(v);
    }
  }

  async send(message: import("../types").JSONRPCMessage): Promise<void> {
    if (!this._inner) throw new Error("Transport not started");
    return this._inner.send(message);
  }

  async close(): Promise<void> {
    if (this._inner) {
      await this._inner.close();
      this._inner = null;
    }
  }
}
