/**
 * @flitter/agent-core — ReadMcpResourceTool
 *
 * Read a resource from an MCP server.
 *
 * 逆向: wVR in modules/2026_tail_anonymous.js:15886-15923
 *   - Gets MCP client via mcpService.getClient(server)
 *   - Calls client.readResource({ uri })
 *   - Collects text content; for blobs reports [Binary: mimeType, length]
 *   - Truncates at _z = 262144 chars with truncation notice
 *   - Returns "[Empty resource]" if no content
 */

import type { ToolContext, ToolResult, ToolSpec } from "../types";

/** Maximum resource content length before truncation */
const MAX_RESOURCE_LENGTH = 262144; // 逆向: _z = 262144

/**
 * Interface for the MCP manager dependency.
 * Matches the subset of MCPServerManager we need.
 */
export interface MCPManagerLike {
  getConnection(name: string): MCPConnectionLike | undefined;
}

export interface MCPConnectionLike {
  readResource(uri: string, signal?: AbortSignal): Promise<unknown[]>;
}

/**
 * Factory: create ReadMcpResourceTool bound to an MCPServerManager.
 *
 * 逆向: wVR receives mcpService from the tool environment.
 * Flitter: we bind the manager at registration time.
 */
export function createReadMcpResourceTool(mcpManager: MCPManagerLike): ToolSpec {
  return {
    name: "read_mcp_resource",
    description:
      "Read a resource from an MCP server. " +
      "Use when the user references an MCP resource URI.",
    source: "builtin",
    isReadOnly: true,

    inputSchema: {
      type: "object",
      properties: {
        server: {
          type: "string",
          description: "MCP server name",
        },
        uri: {
          type: "string",
          description: "Resource URI to read",
        },
      },
      required: ["server", "uri"],
    },

    executionProfile: {
      // Read-only, no file conflicts
      resourceKeys: () => [],
    },

    async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
      const server = args.server as string;
      const uri = args.uri as string;

      // Validate args
      if (!server || typeof server !== "string") {
        return {
          status: "error",
          error: "server is required and must be a string",
        };
      }

      if (!uri || typeof uri !== "string") {
        return {
          status: "error",
          error: "uri is required and must be a string",
        };
      }

      // 逆向: wVR line 15896-15898
      const connection = mcpManager.getConnection(server);
      if (!connection) {
        return {
          status: "error",
          error: `MCP server "${server}" not found or not connected`,
        };
      }

      try {
        // 逆向: wVR line 15900-15901 — client.readResource({ uri })
        const contents = await connection.readResource(uri, context.signal);

        // 逆向: wVR line 15903-15904 — collect text, report blobs
        let text = "";
        for (const item of contents) {
          const content = item as Record<string, unknown>;
          if ("text" in content) {
            text += content.text as string;
          } else if ("blob" in content) {
            const mimeType = (content.mimeType as string) || "unknown type";
            const blobLen = (content.blob as string).length;
            text += `[Binary content: ${mimeType}, ${blobLen} characters (base64)]`;
          }
        }

        // 逆向: wVR line 15905-15910 — truncate at _z
        if (text.length > MAX_RESOURCE_LENGTH) {
          const truncated = text.slice(0, MAX_RESOURCE_LENGTH);
          const totalKB = Math.round(text.length / 1024);
          const shownKB = Math.round(MAX_RESOURCE_LENGTH / 1024);
          text = `${truncated}\n\n... [Resource content truncated - showing first ${shownKB}KB of ${totalKB}KB total. The resource was too long and has been shortened.]`;
        }

        // 逆向: wVR line 15913 — empty check
        return {
          status: "done",
          content: text || "[Empty resource]",
        };
      } catch (err) {
        // 逆向: wVR line 15916-15921
        return {
          status: "error",
          error: `Failed to read resource "${uri}" from MCP server "${server}": ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };
}
