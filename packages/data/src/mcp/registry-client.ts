/**
 * @flitter/data — MCP Registry Client
 *
 * Validates MCP servers against an external registry URL.
 * Fail-closed: if registry is unreachable, deny all connections.
 *
 * 逆向: amp-cli-reversed/modules/1809_MCP_jPR.js
 *   - mcpRegistryUrl read from workspace config — line 23
 *   - fPR(V, O) validates servers against registry — line 79
 *   - Fail-closed on error — lines 84-104
 *   - Returns { approved, blocked, error } — lines 105-122
 */
import { createLogger } from "@flitter/util";

const log = createLogger("mcp-registry-client");

export interface McpRegistryResult {
  /** Whether the server is approved by the registry */
  approved: boolean;
  /** Error message if registry was unreachable */
  error?: string;
}

export interface McpRegistryClientOptions {
  /** Registry URL. If null/undefined, all servers are approved. */
  registryUrl: string | null;
  /** HTTP timeout in ms (default 5000) */
  timeoutMs?: number;
}

/**
 * McpRegistryClient — validates MCP servers against an external registry.
 * 逆向: amp-cli-reversed/modules/1809_MCP_jPR.js
 * Function fPR validates servers, fail-closed on error.
 */
export class McpRegistryClient {
  private readonly registryUrl: string | null;
  private readonly timeoutMs: number;

  constructor(options: McpRegistryClientOptions) {
    this.registryUrl = options.registryUrl;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  /**
   * Validate whether a server is approved by the registry.
   * 逆向: fPR(V, O) — lines 78-123
   *
   * - If no registryUrl configured, all servers are approved
   * - HTTP GET to registry with server name
   * - Fail-closed: unreachable registry = deny
   */
  async validateServer(serverName: string): Promise<McpRegistryResult> {
    if (!this.registryUrl) {
      return { approved: true };
    }

    try {
      const url = new URL(this.registryUrl);
      url.searchParams.set("server", serverName);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          // 逆向: fail-closed — non-200 = deny
          log.warn("MCP registry returned non-OK status", {
            serverName,
            status: response.status,
            registryUrl: this.registryUrl,
          });
          return { approved: false, error: `Registry returned status ${response.status}` };
        }

        const body = (await response.json()) as Record<string, unknown>;

        // Expected response format: { approved: boolean }
        if (typeof body.approved === "boolean") {
          return { approved: body.approved };
        }

        // Fallback: if the response doesn't have the expected format, deny
        log.warn("MCP registry returned unexpected format", {
          serverName,
          registryUrl: this.registryUrl,
        });
        return { approved: false, error: "Unexpected registry response format" };
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      // 逆向: fail-closed — any error = deny
      const message = err instanceof Error ? err.message : String(err);
      log.error("MCP registry unreachable, blocking server (fail-closed)", {
        serverName,
        registryUrl: this.registryUrl,
        error: message,
      });
      return { approved: false, error: message };
    }
  }

  /**
   * Validate multiple servers at once.
   * 逆向: fPR takes all servers and returns approved/blocked maps
   */
  async validateServers(
    serverNames: string[],
  ): Promise<{ approved: string[]; blocked: string[]; error?: string }> {
    if (!this.registryUrl) {
      return { approved: serverNames, blocked: [] };
    }

    const results = await Promise.all(
      serverNames.map(async (name) => {
        const result = await this.validateServer(name);
        return { name, ...result };
      }),
    );

    const approved: string[] = [];
    const blocked: string[] = [];
    let firstError: string | undefined;

    for (const r of results) {
      if (r.approved) {
        approved.push(r.name);
      } else {
        blocked.push(r.name);
        if (r.error && !firstError) firstError = r.error;
      }
    }

    return { approved, blocked, error: firstError };
  }
}
