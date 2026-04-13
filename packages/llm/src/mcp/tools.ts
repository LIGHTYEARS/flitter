/**
 * @flitter/llm — MCP Tool Naming Utilities
 *
 * Namespaced tool names for MCP server tools.
 * Pattern: mcp__<serverName>__<toolName> (max 64 chars)
 * Direct translation from reversed PDT/klT.
 */

import type { MCPToolContent } from "./types";

const MAX_TOOL_NAME_LENGTH = 64;
const MAX_TOOL_RESULT_BYTES = 100_000;

/**
 * Sanitize a name for use in tool identifiers.
 * Replaces spaces/hyphens with underscores, strips non-alphanumeric chars,
 * collapses runs of underscores, trims leading/trailing underscores.
 * Returns fallback if the result is empty.
 *
 * Reversed: klT
 */
export function sanitizeName(name: string, fallback: string): string {
  return (
    name
      .replace(/[\s-]+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || fallback
  );
}

/**
 * Create a namespaced tool name: mcp__<server>__<tool>
 * Truncates to tool name only (up to 64 chars) if the full name exceeds 64 chars.
 *
 * Reversed: PDT
 */
export function namespacedToolName(
  serverName: string,
  toolName: string,
): string {
  const server = sanitizeName(serverName, "server");
  const tool = sanitizeName(toolName, "tool");
  const full = `mcp__${server}__${tool}`;
  if (full.length >= MAX_TOOL_NAME_LENGTH) {
    return tool.slice(0, MAX_TOOL_NAME_LENGTH);
  }
  return full;
}

/**
 * Parse a namespaced tool name back into server and tool names.
 * Returns null if the name doesn't match the mcp__<server>__<tool> pattern.
 *
 * The server name is captured as all segments between the first `mcp__` and the
 * last `__`, and the tool name is everything after the last `__`.
 */
export function parseNamespacedToolName(
  name: string,
): { serverName: string; toolName: string } | null {
  const match = name.match(/^mcp__(.+?)__([^_](?:.*[^_])?)$/);
  if (!match) return null;

  // More precise: split on double underscore
  const withoutPrefix = name.slice(5); // remove "mcp__"
  const lastDoubleUnderscore = withoutPrefix.lastIndexOf("__");
  if (lastDoubleUnderscore === -1) return null;

  const serverName = withoutPrefix.slice(0, lastDoubleUnderscore);
  const toolName = withoutPrefix.slice(lastDoubleUnderscore + 2);

  if (!serverName || !toolName) return null;

  return { serverName, toolName };
}

/**
 * Truncate tool result content entries to a maximum byte size.
 * Text content exceeding the limit is truncated with a notice.
 * Image content with invalid data is replaced with an error message.
 *
 * Reversed: bPR
 */
export function truncateToolResult(
  content: MCPToolContent[],
  maxBytes: number = MAX_TOOL_RESULT_BYTES,
): MCPToolContent[] {
  return content.map((item) => {
    if (item.type === "text") {
      const byteLength = Buffer.byteLength(item.text, "utf-8");
      if (byteLength > maxBytes) {
        // Truncate to approximate character count (may not be exact for multi-byte)
        const truncated = Buffer.from(item.text, "utf-8")
          .subarray(0, maxBytes)
          .toString("utf-8");
        const totalKB = Math.round(byteLength / 1024);
        const shownKB = Math.round(maxBytes / 1024);
        return {
          type: "text" as const,
          text: `${truncated}\n\n... [Tool result truncated - showing first ${shownKB}KB of ${totalKB}KB total. The tool result was too long and has been shortened. Consider using more specific queries or parameters to get focused results.]`,
        };
      }
    }
    return item;
  });
}

/**
 * Format an error tool result as a human-readable string.
 * Extracts text from content entries and joins them.
 */
export function formatToolError(
  toolName: string,
  content: MCPToolContent[],
): string {
  const texts = content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text.trim())
    .filter((t) => t.length > 0);

  if (texts.length > 0) return texts.join("\n\n");
  return `MCP tool "${toolName}" returned an error response without details.`;
}
