/**
 * Permission rule management CLI commands
 *
 * 逆向: amp-cli-reversed/modules/2520-2524 (permissions list/test/add)
 *        amp-cli-reversed/modules/2435_unknown_MQT.js (permissions edit)
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
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
  action: "allow" | "ask" | "reject" | "delegate";
  to?: string;
  matches?: Record<string, string>;
}

// ─── Arg Parsing ───────────────────────────────────────────

const VALID_ACTIONS = new Set(["allow", "ask", "reject", "delegate"]);

/**
 * Parse `permissions add` arguments into a PermissionEntry.
 *
 * 逆向: amp BC0 permission entry builder (2524_unknown_XC0.js)
 *        amp Z2() (chunk-001.js:8783) — serializes delegate with `--to`
 */
export function parsePermissionAddArgs(
  action: string,
  tool: string,
  matchers: string[],
): PermissionEntry {
  if (!VALID_ACTIONS.has(action)) {
    throw new Error(`Invalid action "${action}". Must be: allow, ask, reject, delegate`);
  }

  const entry: PermissionEntry = {
    tool,
    action: action as PermissionEntry["action"],
  };

  // Parse --to for delegate action
  const remaining: string[] = [];
  for (let i = 0; i < matchers.length; i++) {
    if (matchers[i] === "--to" && i + 1 < matchers.length) {
      entry.to = matchers[i + 1];
      i++; // skip the value
    } else {
      remaining.push(matchers[i]!);
    }
  }

  if (action === "delegate" && !entry.to) {
    throw new Error("delegate action requires --to <program>");
  }

  if (remaining.length > 0) {
    const matches: Record<string, string> = {};
    for (const m of remaining) {
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

// ─── Edit helpers ─────────────────────────────────────────

const EDIT_HEADER = `# Permission Rules
# Format: <action> <tool> [key=value ...]
# Actions: allow, ask, reject
# Lines starting with # are comments.
# Example:
#   allow bash path=/tmp/*
#   reject bash
#   allow read
#
`;

/**
 * Serialize a PermissionEntry to a single text line.
 *
 * 逆向: amp-cli-reversed/modules/1711_unknown_Z2.js — Z2(entry) builds one line
 * Format: `<action> <tool> [key=value ...]`
 */
function serializeEntry(entry: PermissionEntry): string {
  const parts = [entry.action, entry.tool];
  if (entry.matches) {
    for (const [k, v] of Object.entries(entry.matches)) {
      parts.push(`${k}=${v}`);
    }
  }
  return parts.join(" ");
}

/**
 * Parse a single non-comment, non-empty line back to a PermissionEntry.
 *
 * 逆向: amp-cli-reversed/modules/1708_unknown_mLT.js — parses each line via ubR
 */
function parseLine(line: string, lineNum: number): { entry?: PermissionEntry; error?: string } {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 2) {
    return { error: `Line ${lineNum}: expected at least "<action> <tool>", got "${line.trim()}"` };
  }

  const [action, tool, ...rest] = tokens;
  if (!VALID_ACTIONS.has(action!)) {
    return { error: `Line ${lineNum}: invalid action "${action}". Must be: allow, ask, reject` };
  }

  const matches: Record<string, string> = {};
  for (const token of rest) {
    const eqIdx = token.indexOf("=");
    if (eqIdx === -1) {
      return { error: `Line ${lineNum}: invalid matcher "${token}". Use KEY=VALUE format` };
    }
    matches[token.slice(0, eqIdx)] = token.slice(eqIdx + 1);
  }

  return {
    entry: {
      action: action as "allow" | "ask" | "reject",
      tool: tool!,
      ...(Object.keys(matches).length > 0 ? { matches } : {}),
    },
  };
}

/**
 * Parse full text content → entries or error-annotated content.
 *
 * 逆向: amp-cli-reversed/modules/2437_unknown_DQT.js — DQT(text) → {success, entries|contentWithErrors}
 */
function parsePermissionsText(
  text: string,
): { success: true; entries: PermissionEntry[] } | { success: false; contentWithErrors: string } {
  const lines = text.split("\n");
  const entries: PermissionEntry[] = [];
  const errors: Array<{ lineIdx: number; message: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line || line.startsWith("#")) continue;

    const result = parseLine(line, i + 1);
    if (result.error) {
      errors.push({ lineIdx: i, message: result.error });
    } else if (result.entry) {
      entries.push(result.entry);
    }
  }

  if (errors.length === 0) {
    return { success: true, entries };
  }

  // Insert error comments above offending lines
  const annotated = [...lines];
  let offset = 0;
  for (const err of errors) {
    annotated.splice(err.lineIdx + offset, 0, `# Error: ${err.message}`);
    offset++;
  }
  return { success: false, contentWithErrors: annotated.join("\n") };
}

/**
 * `flitter permissions edit`
 *
 * Opens permission rules in $EDITOR for interactive editing.
 * Retry loop if parsing fails (up to 3 attempts).
 *
 * 逆向: amp-cli-reversed/modules/2435_unknown_MQT.js (MQT function)
 */
export async function handlePermissionsEdit(
  deps: PermissionsCommandDeps,
  options: { workspace?: boolean },
): Promise<void> {
  const { configService } = deps;
  if (!configService) {
    process.stderr.write("Error: ConfigService not available\n");
    process.exitCode = 1;
    return;
  }

  // Resolve editor (逆向: amp T.resolveEditor())
  const editor = process.env.FLITTER_EDITOR || process.env.EDITOR || process.env.VISUAL || "vi";

  // Get current rules
  const config = configService.get();
  const rules = (config.settings as Record<string, unknown>).permissions as
    | PermissionEntry[]
    | undefined;

  // Serialize to text
  const rulesText = rules && rules.length > 0 ? rules.map(serializeEntry).join("\n") : "";

  // Create temp file
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "flitter-permissions-"));
  const tmpFile = path.join(tmpDir, "permissions.txt");

  try {
    let content = EDIT_HEADER + rulesText;
    let attempts = 0;
    const maxAttempts = 3;

    // 逆向: retry loop — amp retries up to 3 times on parse error
    let done = false;
    while (!done) {
      writeFileSync(tmpFile, content, "utf-8");

      // Open editor
      const result = spawnSync(editor, [tmpFile], { stdio: "inherit" });
      if (result.status !== 0) {
        process.stderr.write("Editor exited with error.\n");
        process.exitCode = 1;
        return;
      }

      // Read back edited content
      const edited = readFileSync(tmpFile, "utf-8");
      const parsed = parsePermissionsText(edited);

      if (parsed.success) {
        // Save
        const scope = options.workspace ? "workspace" : "global";
        configService.updateSettings(scope, "permissions", parsed.entries);
        process.stdout.write(`Updated ${parsed.entries.length} permission rule(s) (${scope}).\n`);
        done = true;
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          process.stderr.write("Aborting: errors unresolved after multiple edit attempts.\n");
          process.exitCode = 1;
          return;
        }
        content = parsed.contentWithErrors;
        process.stderr.write("Parse errors found — reopening editor...\n");
      }
    }
  } finally {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* cleanup best-effort */
    }
  }
}
