/**
 * MCP Registry Client — checks allowed MCP servers against a registry URL
 *
 * 逆向: amp-cli-reversed/modules/1805_unknown_fPR.js (fPR function)
 *       amp-cli-reversed/modules/1800_unknown_yPR.js (yPR — HTTP fetch)
 *
 * Behavior from amp reference:
 * - fPR: If no registry URL, return all servers as approved (line 2-4)
 * - fPR: If no servers, return empty approved/blocked (line 6-8)
 * - fPR: If registry fetch fails, return ALL servers as blocked + error (fail-closed) (line 12-17)
 * - fPR: Otherwise, check each server against the registry allowlist (line 18-23)
 * - yPR: HTTP GET with 10s timeout, parse JSON .servers[].server (line 1-7)
 */
import { createLogger } from "@flitter/util";

const log = createLogger("mcp-registry");

/** A simplified MCP server spec — just enough for registry checking */
export interface McpServerSpec {
  command?: string;
  url?: string;
  [key: string]: unknown;
}

export interface RegistryCheckResult {
  approved: Record<string, McpServerSpec>;
  blocked: Record<string, McpServerSpec>;
  error?: Error;
}

/**
 * 逆向: yPR — fetch the registry allowlist
 * Fetches the MCP registry URL and returns the list of allowed server identifiers.
 */
export async function fetchRegistry(
  registryUrl: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<string[]> {
  // 逆向: let R = await fetch(T, { signal: AbortSignal.timeout(1e4) });
  const response = await fetchFn(registryUrl, {
    signal: AbortSignal.timeout(10_000),
  });

  // 逆向: if (!R.ok) throw Error(`MCP registry request failed with status ${R.status}`);
  if (!response.ok) {
    throw new Error(`MCP registry request failed with status ${response.status}`);
  }

  // 逆向: return (await R.json()).servers.map(a => a.server);
  const data = (await response.json()) as { servers: Array<{ server: string }> };
  return data.servers.map((entry) => entry.server);
}

/**
 * Check whether an MCP server spec matches the registry allowlist.
 * 逆向: xPR function (called from fPR line 21)
 *
 * The exact matching logic in amp checks both command and url fields.
 */
function isServerAllowed(spec: McpServerSpec, allowedServers: string[]): boolean {
  for (const allowed of allowedServers) {
    if (spec.command && spec.command === allowed) return true;
    if (spec.url && spec.url === allowed) return true;
    // Also match by checking if the allowed string is contained in the command/url
    if (spec.command?.includes(allowed)) return true;
    if (spec.url?.includes(allowed)) return true;
  }
  return false;
}

/**
 * 逆向: fPR function — check servers against registry
 *
 * Fail-closed: if registry is unreachable, ALL servers are blocked.
 */
export async function checkMcpRegistry(
  servers: Record<string, McpServerSpec>,
  registryUrl: string | null,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<RegistryCheckResult> {
  // 逆向: if (!R) return { approved: T, blocked: {} };
  if (!registryUrl) {
    return { approved: servers, blocked: {} };
  }

  const entries = Object.entries(servers);

  // 逆向: if (a.length === 0) return { approved: {}, blocked: {} };
  if (entries.length === 0) {
    return { approved: {}, blocked: {} };
  }

  // 逆向: try { e = await PPR(R); } catch (h) { return { approved: {}, blocked: T, error: ... }; }
  let allowedServers: string[];
  try {
    allowedServers = await fetchRegistry(registryUrl, fetchFn);
  } catch (err) {
    log.error("MCP registry unreachable, blocking all servers (fail-closed)", {
      registryUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      approved: {},
      blocked: servers,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }

  // 逆向: for (let [h, i] of a) if (xPR(i, e)) t[h] = i; else r[h] = i;
  const approved: Record<string, McpServerSpec> = {};
  const blocked: Record<string, McpServerSpec> = {};

  for (const [name, spec] of entries) {
    if (isServerAllowed(spec, allowedServers)) {
      approved[name] = spec;
    } else {
      blocked[name] = spec;
    }
  }

  return { approved, blocked };
}
