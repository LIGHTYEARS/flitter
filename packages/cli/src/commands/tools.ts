/**
 * Tool introspection CLI commands
 */

import type { ToolRegistry } from "@flitter/agent-core";

// ─── Deps ──────────────────────────────────────────────────

export interface ToolsCommandDeps {
  toolRegistry?: ToolRegistry;
}

// ─── Helpers ───────────────────────────────────────────────

function formatSource(source: unknown): string {
  if (source === "builtin") return "builtin";
  if (typeof source === "object" && source !== null) {
    if ("mcp" in source) return `mcp:${(source as { mcp: string }).mcp}`;
    if ("toolbox" in source) return `toolbox:${(source as { toolbox: string }).toolbox}`;
  }
  return String(source);
}

// ─── Handlers ──────────────────────────────────────────────

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
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
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
  process.stdout.write(`${"─".repeat(maxNameLen)}  ${"─".repeat(maxSrcLen)}  ${"─".repeat(30)}\n`);

  for (const tool of tools) {
    const src = formatSource(tool.source);
    const desc = (tool.description ?? "").slice(0, 60);
    process.stdout.write(`${tool.name.padEnd(maxNameLen)}  ${src.padEnd(maxSrcLen)}  ${desc}\n`);
  }
}

/**
 * `flitter tools show <name>`
 */
export async function handleToolsShow(deps: ToolsCommandDeps, name: string): Promise<void> {
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
  process.stdout.write("\nInput Schema:\n");
  process.stdout.write(`${JSON.stringify(tool.inputSchema, null, 2)}\n`);
}
