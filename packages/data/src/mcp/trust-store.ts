/**
 * @flitter/data — MCP Trust Store
 *
 * Manages the list of trusted MCP servers. Used by MCPServerManager
 * to gate workspace-scoped server connections.
 *
 * 逆向: amp-cli-reversed/modules/1809_MCP_jPR.js
 *   - jPR receives trustStore param — line 6
 *   - mcpTrustedServers read from settings — line 17
 *   - trustStore used at line 591 for server approval gating
 */
import type { ConfigScope, ConfigService } from "@flitter/schemas";
import { createLogger } from "@flitter/util";

const log = createLogger("mcp-trust-store");

/**
 * TrustStore — manages trusted MCP server list via config.
 * 逆向: amp's trustStore interface passed to jPR
 */
export class TrustStore {
  private readonly configService: ConfigService;
  private readonly scope: ConfigScope;

  constructor(configService: ConfigService, scope: ConfigScope = "global") {
    this.configService = configService;
    this.scope = scope;
  }

  /**
   * Check if a server is trusted.
   * 逆向: amp reads mcpTrustedServers from settings — jPR line 17
   */
  isTrusted(serverName: string): boolean {
    const trusted = this.listTrusted();
    return trusted.includes(serverName);
  }

  /**
   * Add a server to the trusted list and persist.
   * 逆向: amp trustStore.approve pattern
   */
  async approve(serverName: string): Promise<void> {
    const current = this.listTrusted();
    if (current.includes(serverName)) return;

    log.debug("Approving MCP server", { serverName });
    this.configService.appendSettings(this.scope, "mcpTrustedServers", serverName);
  }

  /**
   * Remove a server from the trusted list and persist.
   * 逆向: amp trustStore.revoke pattern
   */
  async revoke(serverName: string): Promise<void> {
    const current = this.listTrusted();
    const filtered = current.filter((s) => s !== serverName);
    if (filtered.length === current.length) return; // not found

    log.debug("Revoking MCP server trust", { serverName });
    this.configService.updateSettings(this.scope, "mcpTrustedServers", filtered);
  }

  /**
   * List all trusted server names.
   * 逆向: amp settings.mcpTrustedServers — jPR line 17
   */
  listTrusted(): string[] {
    const config = this.configService.get();
    const servers = config.settings.mcpTrustedServers;
    if (!Array.isArray(servers)) return [];
    return servers.filter((s): s is string => typeof s === "string");
  }
}
