/**
 * MCP Tools ↔ ToolRegistry bridge
 *
 * Subscribes to MCPServerManager.allTools$ and syncs MCP tools into
 * the ToolRegistry so the LLM can discover and call them.
 *
 * 逆向: amp chunk-001.js:13553-13628 (mcpService.registerToolsWithToolService)
 */

import type { ToolRegistry, ToolResult, ToolSpec } from "@flitter/agent-core";
import type { MCPServerManager, MCPToolResult, NamespacedMCPTool } from "@flitter/llm";
import type { Subscription } from "@flitter/util";
import { createLogger } from "@flitter/util";

const log = createLogger("mcp-bridge");

/**
 * Convert MCPToolResult to ToolResult.
 *
 * 逆向: amp OPR() result conversion (chunk-001.js:13880-13896)
 */
export function mcpToolResultToToolResult(mcpResult: MCPToolResult): ToolResult {
  const textParts: string[] = [];
  const otherParts: string[] = [];

  for (const block of mcpResult.content) {
    if (block.type === "text") {
      textParts.push((block as { type: "text"; text: string }).text);
    } else if (block.type === "image") {
      const img = block as { type: "image"; mimeType: string };
      otherParts.push(`[image: ${img.mimeType}]`);
    } else {
      otherParts.push(`[${(block as { type: string }).type}]`);
    }
  }

  const allParts = [...textParts, ...otherParts];
  const content = allParts.join("\n");

  if (mcpResult.isError) {
    return { status: "error", error: content || "MCP tool error" };
  }

  return { status: "done", content };
}

/**
 * Build a ToolSpec from a NamespacedMCPTool.
 *
 * The execute function routes to mcpServerManager.callTool() and converts
 * the MCPToolResult to a ToolResult.
 *
 * 逆向: amp OPR() (chunk-001.js:13850-13896)
 */
export function buildMCPToolSpec(tool: NamespacedMCPTool, manager: MCPServerManager): ToolSpec {
  return {
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: tool.inputSchema,
    source: { mcp: tool.serverName },
    isReadOnly: false,
    execute: async (args, context) => {
      try {
        const mcpResult = await manager.callTool(tool.name, args, context.signal);
        return mcpToolResultToToolResult(mcpResult);
      } catch (err) {
        return {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}

/**
 * Subscribe to MCPServerManager.allTools$ and sync MCP tools into ToolRegistry.
 *
 * Returns a Disposable that unsubscribes and unregisters all MCP tools.
 *
 * 逆向: amp mcpService.registerToolsWithToolService (chunk-001.js:13553-13628)
 */
export function syncMCPToolsToRegistry(
  manager: MCPServerManager,
  registry: ToolRegistry,
): { dispose: () => void } {
  // Track which MCP tool names we have currently registered
  const registeredMCPTools = new Set<string>();

  const subscription: Subscription = manager.allTools$.subscribe((tools) => {
    const currentNames = new Set(tools.map((t) => t.name));

    // Unregister removed tools
    for (const name of [...registeredMCPTools]) {
      if (!currentNames.has(name)) {
        registry.unregister(name);
        registeredMCPTools.delete(name);
        log.debug("Unregistered MCP tool", { name });
      }
    }

    // Register new tools
    for (const tool of tools) {
      if (!registeredMCPTools.has(tool.name)) {
        const spec = buildMCPToolSpec(tool, manager);
        try {
          registry.register(spec);
          registeredMCPTools.add(tool.name);
          log.debug("Registered MCP tool", { name: tool.name, server: tool.serverName });
        } catch (err) {
          // Duplicate name (e.g. MCP tool conflicts with builtin) — skip
          log.warn("Failed to register MCP tool", { name: tool.name, error: err });
        }
      }
    }
  });

  return {
    dispose: () => {
      subscription.unsubscribe();
      // Unregister all MCP tools on dispose
      for (const name of registeredMCPTools) {
        registry.unregister(name);
      }
      registeredMCPTools.clear();
    },
  };
}
