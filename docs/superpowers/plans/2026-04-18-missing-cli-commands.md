> **STATUS: COMPLETED** — This plan has been fully implemented and is kept for historical reference only.

# Missing CLI Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `mcp`, `permissions`, and `tools` CLI subcommands so users can manage MCP servers, permission rules, and inspect available tools from the command line.

**Architecture:** Each command group follows the existing flitter CLI pattern: a `*CommandDeps` interface specifying required container services, standalone handler functions, output via `process.stdout.write`, and registration in `program.ts` via Commander.js. All three groups are read/write wrappers around existing services — no new domain logic.

**Tech Stack:** TypeScript, Commander.js, Bun test runner, `@flitter/data` (ConfigService), `@flitter/agent-core` (PermissionEngine, ToolRegistry)

**Amp reference:** `amp-cli-reversed/modules/2503_unknown_yC0.js` (mcp add/list/remove), `amp-cli-reversed/modules/2520-2524` (permissions list/test/edit/add)

**Depends on:** Plan 1 (Container Wiring) — container must be functional. Plan 3 (MCP Tools Integration) — for `tools list` to show MCP tools.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/cli/src/commands/mcp.ts` | `handleMcpAdd`, `handleMcpList`, `handleMcpRemove` |
| Create | `packages/cli/src/commands/permissions.ts` | `handlePermissionsList`, `handlePermissionsTest`, `handlePermissionsAdd` |
| Create | `packages/cli/src/commands/tools.ts` | `handleToolsList`, `handleToolsShow` |
| Modify | `packages/cli/src/program.ts` | Register all three command groups |
| Create | `packages/cli/src/commands/__tests__/mcp.test.ts` | Tests for MCP commands |
| Create | `packages/cli/src/commands/__tests__/permissions.test.ts` | Tests for permissions commands |
| Create | `packages/cli/src/commands/__tests__/tools.test.ts` | Tests for tools commands |

---

### Task 1: Implement `mcp add` command handler

**Files:**
- Create: `packages/cli/src/commands/mcp.ts`
- Test: `packages/cli/src/commands/__tests__/mcp.test.ts`

**Amp reference:** `amp-cli-reversed/modules/2503_unknown_yC0.js` — parses positional args as either URL-based or command-based spec, writes to `settings.mcpServers[name]`.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/commands/__tests__/mcp.test.ts
import { describe, expect, it } from "bun:test";
import { parseMcpAddArgs, type McpCommandDeps } from "../mcp";

describe("parseMcpAddArgs", () => {
  it("parses URL-based server", () => {
    const result = parseMcpAddArgs(["https://example.com/mcp"]);
    expect(result).toEqual({ url: "https://example.com/mcp" });
  });

  it("parses command-based server", () => {
    const result = parseMcpAddArgs(["npx", "-y", "@upstash/context7-mcp"]);
    expect(result).toEqual({
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
    });
  });

  it("parses command after -- separator", () => {
    const result = parseMcpAddArgs(["--", "node", "server.js"]);
    expect(result).toEqual({
      command: "node",
      args: ["server.js"],
    });
  });

  it("parses command with no extra args", () => {
    const result = parseMcpAddArgs(["my-server-binary"]);
    expect(result).toEqual({
      command: "my-server-binary",
      args: [],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/mcp.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the MCP command module**

```typescript
// packages/cli/src/commands/mcp.ts
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
 * 逆向: amp 2504_unknown_PC0.js
 */
export function parseMcpAddArgs(
  args: string[],
): MCPServerSpec {
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
    process.stdout.write(
      `  ${name.padEnd(maxNameLen)}  ${type.padEnd(7)}  ${detail}\n`,
    );
  }
}

/**
 * `flitter mcp remove <name>`
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/mcp.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/mcp.ts packages/cli/src/commands/__tests__/mcp.test.ts
git commit -m "feat(cli): add mcp add/list/remove command handlers

parseMcpAddArgs detects URL vs command-based specs.
handleMcpAdd validates name, checks duplicates, writes to configService.
handleMcpList prints table or JSON. handleMcpRemove deletes from config.

逆向: amp 2503_unknown_yC0.js (mcp add/list/remove)"
```

---

### Task 2: Implement `permissions list` and `permissions add` command handlers

**Files:**
- Create: `packages/cli/src/commands/permissions.ts`
- Test: `packages/cli/src/commands/__tests__/permissions.test.ts`

**Amp reference:** `amp-cli-reversed/modules/2520-2524` — `permissions list` reads from config scope, `permissions add` prepends to front of rules list.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/commands/__tests__/permissions.test.ts
import { describe, expect, it } from "bun:test";
import { parsePermissionAddArgs } from "../permissions";

describe("parsePermissionAddArgs", () => {
  it("parses simple allow rule", () => {
    const result = parsePermissionAddArgs("allow", "Bash", []);
    expect(result).toEqual({ tool: "Bash", action: "allow" });
  });

  it("parses ask rule", () => {
    const result = parsePermissionAddArgs("ask", "Write", []);
    expect(result).toEqual({ tool: "Write", action: "ask" });
  });

  it("parses rule with key=value matchers", () => {
    const result = parsePermissionAddArgs("allow", "Edit", [
      "file_path=/home/user/project/**",
    ]);
    expect(result).toEqual({
      tool: "Edit",
      action: "allow",
      matches: { file_path: "/home/user/project/**" },
    });
  });

  it("rejects invalid action", () => {
    expect(() => parsePermissionAddArgs("invalid" as any, "Bash", [])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/permissions.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement permissions command module**

```typescript
// packages/cli/src/commands/permissions.ts
/**
 * Permission rule management CLI commands
 *
 * 逆向: amp-cli-reversed/modules/2520-2524 (permissions list/test/add)
 */

import type { ConfigService } from "@flitter/data";
import type { PermissionEngine } from "@flitter/agent-core";

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
 * 逆向: amp BC0 permission entry builder
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
    process.stdout.write(JSON.stringify(rules ?? [], null, 2) + "\n");
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

  process.stdout.write(
    `${"TOOL".padEnd(maxToolLen)}  ${"ACTION".padEnd(maxActionLen)}  MATCHES\n`,
  );
  process.stdout.write(`${"─".repeat(maxToolLen)}  ${"─".repeat(maxActionLen)}  ${"─".repeat(20)}\n`);

  for (const rule of rules) {
    const matchStr = rule.matches
      ? Object.entries(rule.matches).map(([k, v]) => `${k}=${v}`).join(", ")
      : "";
    process.stdout.write(
      `${rule.tool.padEnd(maxToolLen)}  ${rule.action.padEnd(maxActionLen)}  ${matchStr}\n`,
    );
  }
}

/**
 * `flitter permissions test <tool-name> [args...]`
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
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
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
    ? ` with ${Object.entries(entry.matches).map(([k, v]) => `${k}=${v}`).join(", ")}`
    : "";
  process.stdout.write(`Added permission: ${entry.action} ${entry.tool}${matchStr} (${scope})\n`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/permissions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/permissions.ts packages/cli/src/commands/__tests__/permissions.test.ts
git commit -m "feat(cli): add permissions list/test/add command handlers

permissions list shows configured rules in table or JSON format.
permissions test runs checkPermission without executing.
permissions add prepends new rules (first-match-wins).

逆向: amp 2520-2524 (permissions list/test/add)"
```

---

### Task 3: Implement `tools list` and `tools show` command handlers

**Files:**
- Create: `packages/cli/src/commands/tools.ts`
- Test: `packages/cli/src/commands/__tests__/tools.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/commands/__tests__/tools.test.ts
import { describe, expect, it } from "bun:test";
import { ToolRegistry } from "@flitter/agent-core";
import { handleToolsList, type ToolsCommandDeps } from "../tools";

describe("handleToolsList", () => {
  it("lists registered tools", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "Read",
      description: "Read files",
      inputSchema: { type: "object" },
      source: "builtin",
      execute: async () => ({ status: "done" }),
    });
    registry.register({
      name: "mcp__server__search",
      description: "Search",
      inputSchema: { type: "object" },
      source: { mcp: "server" },
      execute: async () => ({ status: "done" }),
    });

    // Capture stdout
    const chunks: string[] = [];
    const origWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => {
      chunks.push(chunk);
      return true;
    }) as any;

    try {
      await handleToolsList({ toolRegistry: registry }, {});
    } finally {
      process.stdout.write = origWrite;
    }

    const output = chunks.join("");
    expect(output).toContain("Read");
    expect(output).toContain("mcp__server__search");
    expect(output).toContain("builtin");
    expect(output).toContain("mcp:server");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/tools.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement tools command module**

```typescript
// packages/cli/src/commands/tools.ts
/**
 * Tool introspection CLI commands
 */

import type { ToolRegistry } from "@flitter/agent-core";

// ─── Deps ──────────────────────────────────────────────────

export interface ToolsCommandDeps {
  toolRegistry?: ToolRegistry;
}

// ─── Handlers ──────────────────────────────────────────────

function formatSource(source: unknown): string {
  if (source === "builtin") return "builtin";
  if (typeof source === "object" && source !== null) {
    if ("mcp" in source) return `mcp:${(source as { mcp: string }).mcp}`;
    if ("toolbox" in source) return `toolbox:${(source as { toolbox: string }).toolbox}`;
  }
  return String(source);
}

/**
 * `flitter tools list`
 */
export async function handleToolsList(
  deps: ToolsCommandDeps,
  options: { json?: boolean },
): Promise<void> {
  const { toolRegistry } = deps;
  if (!toolRegistry) {
    process.stderr.write("Error: ToolRegistry not available\n");
    process.exitCode = 1;
    return;
  }

  const tools = toolRegistry.list();

  if (options.json) {
    const data = tools.map((t) => ({
      name: t.name,
      description: t.description,
      source: t.source,
      isReadOnly: t.isReadOnly ?? false,
    }));
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
    return;
  }

  if (tools.length === 0) {
    process.stdout.write("No tools registered.\n");
    return;
  }

  const maxNameLen = Math.max(...tools.map((t) => t.name.length), 4);
  const maxSrcLen = Math.max(...tools.map((t) => formatSource(t.source).length), 6);

  process.stdout.write(
    `${"NAME".padEnd(maxNameLen)}  ${"SOURCE".padEnd(maxSrcLen)}  DESCRIPTION\n`,
  );
  process.stdout.write(
    `${"─".repeat(maxNameLen)}  ${"─".repeat(maxSrcLen)}  ${"─".repeat(30)}\n`,
  );

  for (const tool of tools) {
    const src = formatSource(tool.source);
    const desc = (tool.description ?? "").slice(0, 60);
    process.stdout.write(
      `${tool.name.padEnd(maxNameLen)}  ${src.padEnd(maxSrcLen)}  ${desc}\n`,
    );
  }
}

/**
 * `flitter tools show <name>`
 */
export async function handleToolsShow(
  deps: ToolsCommandDeps,
  name: string,
): Promise<void> {
  const { toolRegistry } = deps;
  if (!toolRegistry) {
    process.stderr.write("Error: ToolRegistry not available\n");
    process.exitCode = 1;
    return;
  }

  const tool = toolRegistry.get(name);
  if (!tool) {
    process.stderr.write(`Error: Tool "${name}" not found.\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Name: ${tool.name}\n`);
  process.stdout.write(`Source: ${formatSource(tool.source)}\n`);
  process.stdout.write(`Read-only: ${tool.isReadOnly ?? false}\n`);
  process.stdout.write(`Description: ${tool.description ?? "(none)"}\n`);
  process.stdout.write(`\nInput Schema:\n`);
  process.stdout.write(JSON.stringify(tool.inputSchema, null, 2) + "\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/commands/__tests__/tools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/tools.ts packages/cli/src/commands/__tests__/tools.test.ts
git commit -m "feat(cli): add tools list/show command handlers

tools list shows all registered tools (builtin + MCP) in table or JSON.
tools show displays full details including input schema for a named tool."
```

---

### Task 4: Register all three command groups in `program.ts`

**Files:**
- Modify: `packages/cli/src/program.ts`

- [ ] **Step 1: Add imports**

At the top of `packages/cli/src/program.ts`, add:

```typescript
import { handleMcpAdd, handleMcpList, handleMcpRemove } from "./commands/mcp";
import {
  handlePermissionsAdd,
  handlePermissionsList,
  handlePermissionsTest,
} from "./commands/permissions";
import { handleToolsList, handleToolsShow } from "./commands/tools";
```

- [ ] **Step 2: Register `mcp` command group**

Add after the existing command registrations (after the `update` command):

```typescript
// ─── MCP Commands ──────────────────────────────────────────
const mcp = program.command("mcp").description("Manage MCP servers");

mcp
  .command("add <name> [args...]")
  .description("Add an MCP server")
  .option("-e, --env <KEY=VALUE>", "Environment variable (repeatable)", collect, [])
  .option("-H, --header <KEY=VALUE>", "HTTP header (repeatable)", collect, [])
  .option("-w, --workspace", "Save to workspace settings", false)
  .action(async (name: string, args: string[], opts) => {
    const c = await ensureContainer();
    await handleMcpAdd({ configService: c.configService }, name, args, opts);
  });

mcp
  .command("list")
  .alias("ls")
  .description("List configured MCP servers")
  .option("--json", "Output as JSON", false)
  .action(async (opts) => {
    const c = await ensureContainer();
    await handleMcpList({ configService: c.configService }, opts);
  });

mcp
  .command("remove <name>")
  .alias("rm")
  .description("Remove an MCP server")
  .option("-w, --workspace", "Remove from workspace settings", false)
  .action(async (name: string, opts) => {
    const c = await ensureContainer();
    await handleMcpRemove({ configService: c.configService }, name, opts);
  });

// Helper for repeatable options
function collect(value: string, previous: string[]) {
  return [...previous, value];
}
```

- [ ] **Step 3: Register `permissions` command group**

```typescript
// ─── Permissions Commands ──────────────────────────────────
const perms = program.command("permissions").alias("permission").description("Manage permission rules");

perms
  .command("list")
  .alias("ls")
  .description("List configured permission rules")
  .option("--json", "Output as JSON", false)
  .option("--builtin", "Show info about built-in defaults", false)
  .option("-w, --workspace", "Show workspace-scoped rules", false)
  .action(async (opts) => {
    const c = await ensureContainer();
    await handlePermissionsList({ configService: c.configService, permissionEngine: c.permissionEngine }, opts);
  });

perms
  .command("test <tool-name> [args...]")
  .description("Test if a tool invocation would be permitted")
  .option("--json", "Output as JSON", false)
  .option("-q, --quiet", "Exit code only (0=allowed, 1=denied)", false)
  .action(async (toolName: string, args: string[], opts) => {
    const c = await ensureContainer();
    await handlePermissionsTest({ configService: c.configService, permissionEngine: c.permissionEngine }, toolName, args, opts);
  });

perms
  .command("add <action> <tool> [matchers...]")
  .description("Add a permission rule (prepended, takes precedence)")
  .option("-w, --workspace", "Save to workspace settings", false)
  .allowUnknownOption(true)
  .action(async (action: string, tool: string, matchers: string[], opts) => {
    const c = await ensureContainer();
    await handlePermissionsAdd({ configService: c.configService }, action, tool, matchers, opts);
  });
```

- [ ] **Step 4: Register `tools` command group**

```typescript
// ─── Tools Commands ────────────────────────────────────────
const tools = program.command("tools").description("Inspect available tools");

tools
  .command("list")
  .alias("ls")
  .description("List all registered tools")
  .option("--json", "Output as JSON", false)
  .action(async (opts) => {
    const c = await ensureContainer();
    await handleToolsList({ toolRegistry: c.toolRegistry }, opts);
  });

tools
  .command("show <name>")
  .description("Show details of a specific tool")
  .action(async (name: string) => {
    const c = await ensureContainer();
    await handleToolsShow({ toolRegistry: c.toolRegistry }, name);
  });
```

- [ ] **Step 5: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 6: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/program.ts
git commit -m "feat(cli): register mcp, permissions, tools command groups in program.ts

mcp: add/list/remove MCP server configurations
permissions: list/test/add permission rules
tools: list/show registered tools (builtin + MCP)"
```
