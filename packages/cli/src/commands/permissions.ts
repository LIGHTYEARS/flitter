/**
 * Permission rule management CLI commands
 *
 * 逆向: amp-cli-reversed/modules/2520-2524 (permissions list/test/add)
 */

import type { PermissionEngine } from "@flitter/agent-core";
import type { ConfigService } from "@flitter/data";

// ─── Deps ──────────────────────────────────────────────────

export interface PermissionsCommandDeps {
  configService?: ConfigService;
  permissionEngine?: PermissionEngine;
}

// ─── Types ─────────────────────────────────────────────────

interface PermissionEntry {
  tool: string;
  action: "allow" | "ask" | "reject";
  matches?: Record<string, string>;
}

// ─── Arg Parsing ───────────────────────────────────────────

const VALID_ACTIONS = new Set(["allow", "ask", "reject"]);

/**
 * Parse `permissions add` arguments into a PermissionEntry.
 *
 * 逆向: amp BC0 permission entry builder (2524_unknown_XC0.js)
 */
export function parsePermissionAddArgs(
  action: string,
  tool: string,
  matchers: string[],
): PermissionEntry {
  if (!VALID_ACTIONS.has(action)) {
    throw new Error(`Invalid action "${action}". Must be: allow, ask, reject`);
  }

  const entry: PermissionEntry = {
    tool,
    action: action as "allow" | "ask" | "reject",
  };

  if (matchers.length > 0) {
    const matches: Record<string, string> = {};
    for (const m of matchers) {
      const eqIdx = m.indexOf("=");
      if (eqIdx === -1) {
        throw new Error(`Invalid matcher format "${m}". Use KEY=VALUE.`);
      }
      matches[m.slice(0, eqIdx)] = m.slice(eqIdx + 1);
    }
    entry.matches = matches;
  }

  return entry;
}

// ─── Handlers ──────────────────────────────────────────────

/**
 * `flitter permissions list`
 *
 * 逆向: amp 2521_unknown_GC0.js (permissions list action)
 */
export async function handlePermissionsList(
  deps: PermissionsCommandDeps,
  options: { json?: boolean; workspace?: boolean; builtin?: boolean },
): Promise<void> {
  const { configService } = deps;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }

  const config = configService.get();
  const rules = (config.settings as Record<string, unknown>).permissions as
    | PermissionEntry[]
    | undefined;

  if (options.json) {
    process.stdout.write(`${JSON.stringify(rules ?? [], null, 2)}\n`);
    return;
  }

  if (!rules || rules.length === 0) {
    process.stdout.write("No user-configured permission rules.\n");
    if (options.builtin) {
      process.stdout.write("\nBuilt-in default rules are applied when no user rules match.\n");
    }
    return;
  }

  // Table format
  const maxToolLen = Math.max(...rules.map((r) => r.tool.length), 4);
  const maxActionLen = Math.max(...rules.map((r) => r.action.length), 6);

  process.stdout.write(`${"TOOL".padEnd(maxToolLen)}  ${"ACTION".padEnd(maxActionLen)}  MATCHES\n`);
  process.stdout.write(
    `${"─".repeat(maxToolLen)}  ${"─".repeat(maxActionLen)}  ${"─".repeat(20)}\n`,
  );

  for (const rule of rules) {
    const matchStr = rule.matches
      ? Object.entries(rule.matches)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")
      : "";
    process.stdout.write(
      `${rule.tool.padEnd(maxToolLen)}  ${rule.action.padEnd(maxActionLen)}  ${matchStr}\n`,
    );
  }
}

/**
 * `flitter permissions test <tool-name> [args...]`
 *
 * 逆向: amp 2522_unknown_KC0.js (permissions test action)
 */
export async function handlePermissionsTest(
  deps: PermissionsCommandDeps,
  toolName: string,
  testArgs: string[],
  options: { json?: boolean; quiet?: boolean },
): Promise<void> {
  const { permissionEngine } = deps;
  if (!permissionEngine) {
    process.stderr.write("Error: PermissionEngine not available\n");
    process.exitCode = 1;
    return;
  }

  // Parse key=value pairs into args object
  const args: Record<string, unknown> = {};
  for (const a of testArgs) {
    const eqIdx = a.indexOf("=");
    if (eqIdx !== -1) {
      args[a.slice(0, eqIdx)] = a.slice(eqIdx + 1);
    }
  }

  const result = permissionEngine.checkPermission(toolName, args);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (options.quiet) {
    process.exitCode = result.permitted ? 0 : 1;
    return;
  }

  const status = result.permitted ? "ALLOWED" : `DENIED (${result.action ?? "ask"})`;
  process.stdout.write(`${toolName}: ${status}\n`);
  if (result.reason) {
    process.stdout.write(`  Reason: ${result.reason}\n`);
  }
}

/**
 * `flitter permissions add <action> <tool> [matchers...]`
 *
 * Prepends to front of rules list (first-match-wins, so newest rule wins).
 * 逆向: amp 2524_unknown_XC0.js (permissions add action — prepend to beginning)
 */
export async function handlePermissionsAdd(
  deps: PermissionsCommandDeps,
  action: string,
  tool: string,
  matchers: string[],
  options: { workspace?: boolean },
): Promise<void> {
  const { configService } = deps;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }

  let entry: PermissionEntry;
  try {
    entry = parsePermissionAddArgs(action, tool, matchers);
  } catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
    return;
  }

  const scope = options.workspace ? "workspace" : "global";
  configService.prependSettings(scope, "permissions", entry);

  const matchStr = entry.matches
    ? ` with ${Object.entries(entry.matches)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`
    : "";
  process.stdout.write(`Added permission: ${entry.action} ${entry.tool}${matchStr} (${scope})\n`);
}
