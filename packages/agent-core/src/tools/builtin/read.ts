/**
 * @flitter/agent-core — ReadTool
 *
 * Reads a file from the filesystem, returning its contents with
 * cat -n style line numbers. Supports offset/limit for partial reads,
 * detects binary files, lists directory contents, and handles images.
 *
 * 逆向: amp-cli-reversed/chunk-001.js:9470-9543 (Read tool execute)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExecutionProfile, ToolContext, ToolResult, ToolSpec } from "../types";

/** Default number of lines to return when no limit is specified */
const DEFAULT_LIMIT = 2000;

/** Maximum characters per line before truncation */
const MAX_LINE_LENGTH = 2000;

/**
 * Maximum directory entries before truncation.
 * 逆向: amp-cli-reversed/chunk-001.js:9481 `pq = 1000`
 */
const MAX_DIRECTORY_ENTRIES = 1000;

/**
 * Image extensions supported by the Read tool.
 * 逆向: amp-cli-reversed/chunk-001.js:9514 `BLT = { ".jpg", ".jpeg", ".png", ".gif", ".webp" }`
 */
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

/**
 * Maximum base64 size for images (~4.9MB base64 ≈ ~3.7MB binary).
 * 逆向: amp-cli-reversed/chunk-001.js:9520 `zD = 5138022.4`
 */
const MAX_IMAGE_BASE64_SIZE = 5_138_022;

/**
 * Map file extensions to MIME types.
 */
function getMimeType(ext: string): string | undefined {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return undefined;
  }
}

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
 * List directory contents, sorted: directories first (alpha), then files (alpha).
 * Directories are suffixed with '/'. Capped at MAX_DIRECTORY_ENTRIES.
 *
 * 逆向: amp-cli-reversed/chunk-001.js:9481-9512
 *   - readdir, sort dirs first then files alphabetically
 *   - append '/' to dir names
 *   - cap at pq = 1000
 *   - apply read_range pagination
 */
function listDirectory(dirPath: string, offset: number, limit: number): ToolResult {
  let entries: string[];
  try {
    entries = fs.readdirSync(dirPath);
  } catch (err) {
    return {
      status: "error",
      error: `Failed to read directory: ${(err as Error).message}`,
    };
  }

  // Classify entries into dirs and files
  const dirs: string[] = [];
  const files: string[] = [];
  for (const entry of entries) {
    try {
      const stat = fs.statSync(path.join(dirPath, entry));
      if (stat.isDirectory()) {
        dirs.push(entry + "/");
      } else {
        files.push(entry);
      }
    } catch {
      // If we can't stat, include as a file
      files.push(entry);
    }
  }

  // Sort each group alphabetically
  dirs.sort();
  files.sort();

  // Combine: directories first, then files
  const allEntries = [...dirs, ...files];
  const totalCount = allEntries.length;
  const truncated = totalCount > MAX_DIRECTORY_ENTRIES;
  const capped = truncated ? allEntries.slice(0, MAX_DIRECTORY_ENTRIES) : allEntries;

  // Apply offset/limit pagination
  const startIndex = Math.max(0, offset - 1);
  const endIndex = Math.min(capped.length, startIndex + limit);
  const lines: string[] = [];

  if (startIndex > 0) {
    lines.push(`[... omitted ${startIndex} entries ...]`);
  }

  for (let i = startIndex; i < endIndex; i++) {
    lines.push(capped[i]!);
  }

  if (endIndex < capped.length) {
    lines.push(`[... omitted ${capped.length - endIndex} entries ...]`);
  }

  if (truncated) {
    lines.push(
      `[... directory listing truncated, ${totalCount - MAX_DIRECTORY_ENTRIES} more entries not shown ...]`,
    );
  }

  return {
    status: "done",
    content: lines.join("\n"),
    data: { isDirectory: true, directoryEntries: capped.slice(startIndex, endIndex) },
  };
}

/**
 * Read an image file and return base64-encoded content with metadata.
 *
 * 逆向: amp-cli-reversed/chunk-001.js:9514-9543
 *   - Extension-based detection
 *   - base64 encode, size gate at ~4.9MB
 *   - Return { isImage: true, content: base64, imageInfo: { mimeType, size } }
 */
function readImage(filePath: string, stat: fs.Stats): ToolResult {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = getMimeType(ext);
  if (!mimeType) {
    return { status: "error", error: `Unsupported image format: ${ext}` };
  }

  // Read the binary file
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString("base64");

  // Size gate
  if (base64.length > MAX_IMAGE_BASE64_SIZE) {
    return {
      status: "error",
      error: `Image too large: ${(stat.size / 1024 / 1024).toFixed(1)}MB exceeds the ~3.7MB limit`,
    };
  }

  return {
    status: "done",
    content: `Image: ${filePath}`,
    data: {
      isImage: true,
      base64Content: base64,
      imageInfo: { mimeType, size: stat.size },
    },
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
    "for reading specific portions of large files. When given a directory path, " +
    "returns a sorted listing (directories first, then files). Detects and " +
    "returns images as base64-encoded content. Rejects other binary files.",
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

  // 逆向: amp uses `path` (not `file_path`) and `read_range: [start, end]` (not offset/limit)
  // chunk-005.js:89579-89591
  preprocessArgs(args) {
    const out = { ...args };
    if ("path" in out && !("file_path" in out)) {
      out.file_path = out.path;
      delete out.path;
    }
    if ("read_range" in out && Array.isArray(out.read_range) && !("offset" in out)) {
      const [start, end] = out.read_range as [number, number];
      out.offset = start;
      if (end > start) out.limit = end - start;
      delete out.read_range;
    }
    return out;
  },

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

    // Stat the path
    const stat = fs.statSync(filePath);

    // Handle directories — return sorted listing
    // 逆向: amp-cli-reversed/chunk-001.js:9481-9512
    if (stat.isDirectory()) {
      return listDirectory(filePath, offset, limit);
    }

    // Check it's a file
    if (!stat.isFile()) {
      return {
        status: "error",
        error: `Not a file or directory: ${filePath}`,
      };
    }

    // Handle images — return base64-encoded content
    // 逆向: amp-cli-reversed/chunk-001.js:9514-9543
    const ext = path.extname(filePath).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      return readImage(filePath, stat);
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
