/**
 * @flitter/agent-core — WriteTool
 *
 * Writes content to a file on the filesystem.
 * Automatically creates intermediate directories as needed.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExecutionProfile, ToolContext, ToolResult, ToolSpec } from "../types";

/**
 * Compute the execution profile for a Write invocation.
 * Declares a write-mode resource key on the target file path.
 */
export function writeExecutionProfile(args: Record<string, unknown>): ExecutionProfile {
  const filePath = args.file_path as string;
  return {
    resourceKeys: [{ key: filePath, mode: "write" }],
  };
}

/**
 * WriteTool: writes content to files on the filesystem.
 */
export const WriteTool: ToolSpec = {
  name: "Write",
  description:
    "Writes content to a file on the local filesystem. Creates intermediate " +
    "directories automatically if they do not exist. Overwrites existing files.",
  source: "builtin",
  isReadOnly: false,

  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "The absolute path to the file to write",
      },
      content: {
        type: "string",
        description: "The content to write to the file",
      },
    },
    required: ["file_path", "content"],
    additionalProperties: false,
  },

  executionProfile: undefined,

  async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
    const filePath = args.file_path as string;
    const content = args.content as string;

    // Validate file_path
    if (!filePath || typeof filePath !== "string") {
      return {
        status: "error",
        error: "file_path is required and must be a string",
      };
    }

    // Validate content
    if (typeof content !== "string") {
      return {
        status: "error",
        error: "content is required and must be a string",
      };
    }

    // Create intermediate directories
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    // Write the file
    fs.writeFileSync(filePath, content, "utf-8");

    // Count lines for the confirmation message
    const lineCount = content.split("\n").length;

    return {
      status: "done",
      content: `Successfully wrote ${lineCount} lines to ${filePath}`,
      outputFiles: [filePath],
    };
  },
};
