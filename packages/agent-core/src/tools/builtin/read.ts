/**
 * @flitter/agent-core — ReadTool
 *
 * Reads a file from the filesystem, returning its contents with
 * cat -n style line numbers. Supports offset/limit for partial reads
 * and detects binary files.
 */
import * as fs from "node:fs";
import type { ExecutionProfile, ToolContext, ToolResult, ToolSpec } from "../types";

/** Default number of lines to return when no limit is specified */
const DEFAULT_LIMIT = 2000;

/** Maximum characters per line before truncation */
const MAX_LINE_LENGTH = 2000;

/**
 * Check if a file is binary by reading its first 8192 bytes
 * and looking for null bytes (0x00).
 */
function isBinaryFile(filePath: string): boolean {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0x00) {
        return true;
      }
    }
    return false;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Format lines with cat -n style line numbers.
 * Line numbers are right-aligned to 6 characters width.
 * Lines exceeding MAX_LINE_LENGTH are truncated with " [truncated]".
 *
 * @param lines - Array of line strings
 * @param startLine - 1-based starting line number
 */
function formatWithLineNumbers(lines: string[], startLine: number): string {
  return lines
    .map((line, index) => {
      const lineNum = (startLine + index).toString().padStart(6, " ");
      const truncatedLine =
        line.length > MAX_LINE_LENGTH ? line.slice(0, MAX_LINE_LENGTH) + " [truncated]" : line;
      return `${lineNum}\t${truncatedLine}`;
    })
    .join("\n");
}

/**
 * Compute the execution profile for a Read invocation.
 * Declares a read-mode resource key on the target file path.
 */
export function readExecutionProfile(args: Record<string, unknown>): ExecutionProfile {
  const filePath = args.file_path as string;
  return {
    resourceKeys: [{ key: filePath, mode: "read" }],
  };
}

/**
 * ReadTool: reads files from the filesystem with line numbers.
 */
export const ReadTool: ToolSpec = {
  name: "Read",
  description:
    "Reads a file from the local filesystem. Returns the file content " +
    "with cat -n style line numbers. Supports offset and limit parameters " +
    "for reading specific portions of large files. Detects and rejects binary files.",
  source: "builtin",
  isReadOnly: true,

  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "The absolute path to the file to read",
      },
      offset: {
        type: "number",
        description: "The 1-based line number to start reading from. Defaults to 1.",
      },
      limit: {
        type: "number",
        description: `The number of lines to read. Defaults to ${DEFAULT_LIMIT}.`,
      },
    },
    required: ["file_path"],
    additionalProperties: false,
  },

  executionProfile: undefined,

  async execute(args: Record<string, unknown>, _context: ToolContext): Promise<ToolResult> {
    const filePath = args.file_path as string;
    const offset = (args.offset as number | undefined) ?? 1;
    const limit = (args.limit as number | undefined) ?? DEFAULT_LIMIT;

    // Validate file_path is provided
    if (!filePath || typeof filePath !== "string") {
      return {
        status: "error",
        error: "file_path is required and must be a string",
      };
    }

    // Check file exists
    if (!fs.existsSync(filePath)) {
      return {
        status: "error",
        error: `File not found: ${filePath}`,
      };
    }

    // Check it's actually a file
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return {
        status: "error",
        error: `Not a file: ${filePath}`,
      };
    }

    // Detect binary files
    if (stat.size > 0 && isBinaryFile(filePath)) {
      return {
        status: "error",
        error: `Cannot read binary file: ${filePath}`,
      };
    }

    // Read the file
    const content = fs.readFileSync(filePath, "utf-8");
    const allLines = content.split("\n");

    // Handle trailing newline: if file ends with \n, the last split element
    // is empty string. We keep it as-is to match cat -n behavior.

    // Apply offset (1-based) and limit
    const startIndex = Math.max(0, offset - 1);
    const endIndex = Math.min(allLines.length, startIndex + limit);
    const selectedLines = allLines.slice(startIndex, endIndex);

    // Format with line numbers (1-based)
    const startLine = startIndex + 1;
    const formatted = formatWithLineNumbers(selectedLines, startLine);

    return {
      status: "done",
      content: formatted,
    };
  },
};
