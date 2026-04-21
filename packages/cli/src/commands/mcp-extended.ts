/**
 * MCP extended command handlers
 *
 * Handles `flitter mcp doctor`, `mcp approve`, `mcp oauth login`, `mcp oauth logout`.
 *
 * 逆向: amp-cli-reversed/modules/1809_MCP_jPR.js (MCP server management)
 *        amp-cli-reversed/modules/2785_unknown_e0R.js:1193-1320 (mcp-list-tools, mcp-reload)
 *
 * @example
 * ```bash
 * flitter mcp doctor          # check health of all MCP servers
 * flitter mcp approve my-srv  # trust an MCP server
 * flitter mcp oauth login x   # OAuth login for server x
 * flitter mcp oauth logout x  # remove OAuth tokens for server x
 * ```
 */

import type { ConfigService } from "@flitter/data";
import type { MCPServerManager } from "@flitter/llm";

/** Dependencies for MCP extended commands */
export interface McpExtendedDeps {
  configService: ConfigService;
  mcpServerManager?: MCPServerManager;
}

/** Dependencies for MCP approve (config-only) */
export interface McpApproveDeps {
  configService: ConfigService;
}

/**
 * Handle `flitter mcp doctor` — check health of all configured MCP servers.
 *
 * 逆向: e0R:1193-1319 (mcp-list-tools) iterates servers and checks status.
 * The doctor command is a simplified version that just checks connectivity.
 * amp's mcp-status (e0R:1345-1351) shows a modal; this prints to stdout.
 */
export async function handleMcpDoctor(deps: McpExtendedDeps): Promise<void> {
  const config = deps.configService.get();
  const mcpServers = (config.settings as Record<string, unknown>)["mcp.servers"] as
    | Record<string, unknown>
    | undefined;

  if (!mcpServers || Object.keys(mcpServers).length === 0) {
    process.stdout.write("No MCP servers configured.\n");
    process.stdout.write('Use "flitter mcp add" to configure a server.\n');
    return;
  }

  const serverNames = Object.keys(mcpServers);
  process.stdout.write(`Checking ${serverNames.length} MCP server(s)...\n\n`);

  // 逆向: e0R iterates m0(R.mcpService.servers) to check each server's status
  // Without a live mcpServerManager, we report configuration status
  for (const name of serverNames) {
    const serverConfig = mcpServers[name] as Record<string, unknown> | undefined;
    if (!serverConfig) {
      process.stdout.write(`  [?] ${name} — missing configuration\n`);
      continue;
    }

    const command = serverConfig.command as string | undefined;
    const url = serverConfig.url as string | undefined;
    const transport = url ? "HTTP" : command ? "stdio" : "unknown";

    // If we have a live MCPServerManager, check actual status
    if (deps.mcpServerManager) {
      try {
        // Try to get server status from the manager
        const servers = [...deps.mcpServerManager.servers$.getValue().values()];
        const server = servers.find((s: { name: string }) => s.name === name);
        if (server) {
          const status = server.status?.type ?? "unknown";
          const icon =
            status === "connected" ? "\u2713" : status === "failed" ? "\u2717" : "\u25CB";
          process.stdout.write(`  [${icon}] ${name} (${transport}) — ${status}\n`);
          continue;
        }
      } catch {
        // Fall through to config-only report
      }
    }

    // Config-only report
    process.stdout.write(`  [\u25CB] ${name} (${transport}) — configured\n`);
  }

  process.stdout.write("\nDone.\n");
}

/**
 * Handle `flitter mcp approve <name>` — add server to trusted list.
 *
 * 逆向: e0R:1172-1183 (permissions-disable sets dangerouslyAllowAll).
 * For MCP, amp uses per-server approval via the TUI approval widget.
 * Flitter's CLI shortcut adds the server name to mcp.trustedServers config.
 */
export async function handleMcpApprove(deps: McpApproveDeps, serverName: string): Promise<void> {
  const config = deps.configService.get();
  const mcpServers = (config.settings as Record<string, unknown>)["mcp.servers"] as
    | Record<string, unknown>
    | undefined;

  if (!mcpServers?.[serverName]) {
    process.stderr.write(`Error: MCP server "${serverName}" is not configured.\n`);
    process.exitCode = 1;
    return;
  }

  // Read existing trusted servers list
  const trustedServers =
    ((config.settings as Record<string, unknown>)["mcp.trustedServers"] as string[] | undefined) ??
    [];

  if (trustedServers.includes(serverName)) {
    process.stdout.write(`MCP server "${serverName}" is already trusted.\n`);
    return;
  }

  // Add to trusted list
  const updated = [...trustedServers, serverName];
  deps.configService.updateSettings("global", "mcp.trustedServers", updated);

  process.stdout.write(`MCP server "${serverName}" has been approved and added to trusted list.\n`);
}

/**
 * Handle `flitter mcp oauth login <server>` — initiate OAuth flow.
 *
 * 逆向: amp uses StreamableHTTPClientTransport (1792) for OAuth-based MCP servers.
 * The OAuth flow is handled by the transport layer. This command triggers it
 * via the MCPServerManager.
 *
 * NOTE: Full OAuth flow requires browser interaction. This command checks
 * if the server supports OAuth and initiates the flow if possible.
 */
export async function handleMcpOAuthLogin(
  deps: McpExtendedDeps,
  serverName: string,
): Promise<void> {
  const config = deps.configService.get();
  const mcpServers = (config.settings as Record<string, unknown>)["mcp.servers"] as
    | Record<string, unknown>
    | undefined;

  if (!mcpServers?.[serverName]) {
    process.stderr.write(`Error: MCP server "${serverName}" is not configured.\n`);
    process.exitCode = 1;
    return;
  }

  const serverConfig = mcpServers[serverName] as Record<string, unknown>;
  const url = serverConfig.url as string | undefined;

  if (!url) {
    process.stderr.write(
      `Error: MCP server "${serverName}" is not URL-based. OAuth is only supported for HTTP/SSE servers.\n`,
    );
    process.exitCode = 1;
    return;
  }

  // 逆向: amp's OAuth flow is handled by StreamableHTTPClientTransport
  // For now, we report that the feature requires the interactive mode
  if (deps.mcpServerManager) {
    try {
      // Attempt to trigger OAuth through the server manager
      const servers = [...deps.mcpServerManager.servers$.getValue().values()];
      const server = servers.find((s: { name: string }) => s.name === serverName);
      if ((server as unknown as { startOAuth?: () => Promise<void> })?.startOAuth) {
        await (server as unknown as { startOAuth: () => Promise<void> }).startOAuth();
        process.stdout.write(`OAuth login initiated for "${serverName}". Check your browser.\n`);
        return;
      }
    } catch (err) {
      process.stderr.write(
        `Error: OAuth login failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      process.exitCode = 1;
      return;
    }
  }

  process.stdout.write(
    `OAuth login for "${serverName}" requires interactive mode.\n` +
      `Run flitter in interactive mode and the server will prompt for OAuth authentication.\n`,
  );
}

/**
 * Handle `flitter mcp oauth logout <server>` — clear OAuth tokens.
 *
 * 逆向: amp clears tokens via the OAuth provider; Flitter removes from config.
 */
export async function handleMcpOAuthLogout(
  deps: McpExtendedDeps,
  serverName: string,
): Promise<void> {
  const config = deps.configService.get();
  const mcpServers = (config.settings as Record<string, unknown>)["mcp.servers"] as
    | Record<string, unknown>
    | undefined;

  if (!mcpServers?.[serverName]) {
    process.stderr.write(`Error: MCP server "${serverName}" is not configured.\n`);
    process.exitCode = 1;
    return;
  }

  // Clear OAuth tokens from config
  const settingsKey = `mcp.oauth.${serverName}`;
  deps.configService.updateSettings("global", settingsKey, undefined);

  process.stdout.write(`OAuth tokens cleared for "${serverName}".\n`);
}
