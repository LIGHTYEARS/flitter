/**
 * MCP server management CLI commands
 *
 * 逆向: amp-cli-reversed/modules/2503_unknown_yC0.js (mcp add/list/remove)
 */

import type { ConfigService } from "@flitter/data";
import type { MCPServerSpec } from "@flitter/schemas";

// ─── Deps ──────────────────────────────────────────────────

export interface McpCommandDeps {
  configService?: ConfigService;
}

// ─── Arg Parsing ───────────────────────────────────────────

const NAME_RE = /^[A-Za-z0-9@/_-]+$/;

/**
 * Parse `mcp add` positional args into an MCPServerSpec.
 *
 * - URL (starts with http/https): { url }
 * - After `--` separator: { command, args }
 * - Otherwise: first arg is command, rest are args
 *
 * 逆向: amp 2503_unknown_yC0.js (mcp add arg parsing)
 */
export function parseMcpAddArgs(args: string[]): MCPServerSpec {
  // Strip leading `--` separator
  const stripped = args[0] === "--" ? args.slice(1) : args;

  if (stripped.length === 0) {
    throw new Error("No command or URL provided");
  }

  const first = stripped[0];

  // URL-based
  if (first.startsWith("http://") || first.startsWith("https://")) {
    return { url: first };
  }

  // Command-based
  return {
    command: first,
    args: stripped.slice(1),
  };
}

// ─── Handlers ──────────────────────────────────────────────

export interface McpAddOptions {
  env?: string[];
  header?: string[];
  workspace?: boolean;
}

/**
 * `flitter mcp add <name> [args...]`
 *
 * 逆向: amp 2503_unknown_yC0.js mcp add action
 */
export async function handleMcpAdd(
  deps: McpCommandDeps,
  name: string,
  args: string[],
  options: McpAddOptions,
): Promise<void> {
  const { configService } = deps;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }

  if (!name || name.trim() === "") {
    process.stderr.write("Error: Invalid server name: name cannot be empty\n");
    process.exitCode = 1;
    return;
  }

  if (!NAME_RE.test(name)) {
    process.stderr.write(`Error: Invalid server name "${name}". Use alphanumeric, @, /, _, -.\n`);
    process.exitCode = 1;
    return;
  }

  const config = configService.get();
  const existing = (config.settings as Record<string, unknown>).mcpServers as
    | Record<string, MCPServerSpec>
    | undefined;

  if (existing?.[name]) {
    process.stderr.write(`Error: MCP server "${name}" already exists. Remove it first.\n`);
    process.exitCode = 1;
    return;
  }

  let spec: MCPServerSpec;
  try {
    spec = parseMcpAddArgs(args);
  } catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
    return;
  }

  // Apply --env options to command-based servers
  if (options.env && "command" in spec) {
    const env: Record<string, string> = {};
    for (const e of options.env) {
      const eqIdx = e.indexOf("=");
      if (eqIdx === -1) {
        process.stderr.write(`Error: Invalid --env format "${e}". Use KEY=VALUE.\n`);
        process.exitCode = 1;
        return;
      }
      env[e.slice(0, eqIdx)] = e.slice(eqIdx + 1);
    }
    (spec as Record<string, unknown>).env = env;
  }

  // Apply --header options to URL-based servers
  if (options.header && "url" in spec) {
    const headers: Record<string, string> = {};
    for (const h of options.header) {
      const eqIdx = h.indexOf("=");
      if (eqIdx === -1) {
        process.stderr.write(`Error: Invalid --header format "${h}". Use KEY=VALUE.\n`);
        process.exitCode = 1;
        return;
      }
      headers[h.slice(0, eqIdx)] = h.slice(eqIdx + 1);
    }
    (spec as Record<string, unknown>).headers = headers;
  }

  const scope = options.workspace ? "workspace" : "global";
  const updated = { ...(existing ?? {}), [name]: spec };
  configService.updateSettings(scope, "mcpServers", updated);

  process.stdout.write(`Added flitter.mcpServers.${name} to ${scope} settings\n`);
}

/**
 * `flitter mcp list`
 *
 * 逆向: amp 2503_unknown_yC0.js mcp list action
 */
export async function handleMcpList(
  deps: McpCommandDeps,
  options: { json?: boolean },
): Promise<void> {
  const { configService } = deps;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }

  const config = configService.get();
  const servers = (config.settings as Record<string, unknown>).mcpServers as
    | Record<string, MCPServerSpec>
    | undefined;

  if (!servers || Object.keys(servers).length === 0) {
    process.stdout.write("No MCP servers configured.\n");
    return;
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(servers, null, 2) + "\n");
    return;
  }

  // Table format
  const entries = Object.entries(servers);
  const maxNameLen = Math.max(...entries.map(([n]) => n.length), 4);

  for (const [name, spec] of entries) {
    const type = "url" in spec ? "url" : "command";
    const detail = "url" in spec ? spec.url : `${spec.command} ${(spec.args ?? []).join(" ")}`;
    process.stdout.write(`  ${name.padEnd(maxNameLen)}  ${type.padEnd(7)}  ${detail}\n`);
  }
}

/**
 * `flitter mcp remove <name>`
 *
 * 逆向: amp 2503_unknown_yC0.js mcp remove action
 * Note: amp checks workspace first, then global. Flitter follows same order.
 */
export async function handleMcpRemove(
  deps: McpCommandDeps,
  name: string,
  options: { workspace?: boolean },
): Promise<void> {
  const { configService } = deps;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }

  const config = configService.get();
  const servers = (config.settings as Record<string, unknown>).mcpServers as
    | Record<string, MCPServerSpec>
    | undefined;

  if (!servers?.[name]) {
    process.stderr.write(`Error: MCP server "${name}" not found.\n`);
    process.exitCode = 1;
    return;
  }

  const scope = options.workspace ? "workspace" : "global";
  const { [name]: _, ...rest } = servers;
  if (Object.keys(rest).length === 0) {
    configService.deleteSettings(scope, "mcpServers");
  } else {
    configService.updateSettings(scope, "mcpServers", rest);
  }

  process.stdout.write(`Removed flitter.mcpServers.${name} from ${scope} settings\n`);
}
