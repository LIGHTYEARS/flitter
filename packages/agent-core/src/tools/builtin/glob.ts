/**
 * GlobTool -- fast file pattern matching
 *
 * Uses FileScanner for directory traversal and matches entries against
 * glob patterns. Results are sorted by modification time (most recent first).
 *
 * @example
 * ```ts
 * import { GlobTool } from './glob';
 * const result = await GlobTool.execute(
 *   { pattern: '**\/*.ts', path: '/src' },
 *   context,
 * );
 * ```
 */
import * as fs from "node:fs";
import * as nodePath from "node:path";
import { FileScanner } from "@flitter/util";
import type { ExecutionProfile, ToolContext, ToolResult, ToolSpec } from "../types";

// ---------------------------------------------------------------------------
// Glob-to-regex converter
// ---------------------------------------------------------------------------

/**
 * Convert a glob pattern to a RegExp.
 *
 * Supported syntax:
 *  - `*`   matches any character except `/`
 *  - `**`  matches everything including `/` (zero or more path segments)
 *  - `?`   matches a single character (not `/`)
 *  - `{a,b}` alternation groups
 *  - Special regex chars are escaped
 */
export function globPatternToRegex(pattern: string): RegExp {
  let result = "^";
  let i = 0;
  let inGroup = false;

  while (i < pattern.length) {
    const c = pattern[i]!;

    if (c === "*") {
      if (pattern[i + 1] === "*") {
        // `**`
        if (pattern[i + 2] === "/") {
          // `**/` -- match zero or more directories
          result += "(?:.*/)?";
          i += 3;
          continue;
        }
        // `**` at end or not followed by `/` -- match everything
        result += ".*";
        i += 2;
        continue;
      }
      // single `*` -- anything except `/`
      result += "[^/]*";
      i++;
    } else if (c === "?") {
      result += "[^/]";
      i++;
    } else if (c === "{") {
      result += "(?:";
      inGroup = true;
      i++;
    } else if (c === "}" && inGroup) {
      result += ")";
      inGroup = false;
      i++;
    } else if (c === "," && inGroup) {
      result += "|";
      i++;
    } else if (".+^$|()[]\\".includes(c)) {
      result += "\\" + c;
      i++;
    } else {
      result += c;
      i++;
    }
  }

  result += "$";
  return new RegExp(result);
}

// ---------------------------------------------------------------------------
// Mtime sort
// ---------------------------------------------------------------------------

interface FileWithMtime {
  path: string;
  mtimeMs: number;
}

async function sortByMtime(filePaths: string[]): Promise<string[]> {
  const entries: FileWithMtime[] = [];

  for (const filePath of filePaths) {
    try {
      const stat = await fs.promises.stat(filePath);
      entries.push({ path: filePath, mtimeMs: stat.mtimeMs });
    } catch {
      // File may have been deleted between scan and stat -- include with
      // mtime 0 so it still appears in results
      entries.push({ path: filePath, mtimeMs: 0 });
    }
  }

  // Sort descending by mtime (most recently modified first)
  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return entries.map((e) => e.path);
}

// ---------------------------------------------------------------------------
// Execution profile helper
// ---------------------------------------------------------------------------

export function globExecutionProfile(args: Record<string, unknown>, cwd: string): ExecutionProfile {
  const searchPath = args.path ? nodePath.resolve(cwd, args.path as string) : cwd;
  return {
    resourceKeys: [{ key: searchPath, mode: "read" }],
  };
}

// ---------------------------------------------------------------------------
// GlobTool
// ---------------------------------------------------------------------------

export const GlobTool: ToolSpec = {
  name: "Glob",
  description:
    "Fast file pattern matching tool that works with any codebase size. " +
    'Supports glob patterns like "**/*.js" or "src/**/*.ts". ' +
    "Returns matching file paths sorted by modification time (most recent first).",
  source: "builtin",
  isReadOnly: true,

  inputSchema: {
    type: "object",
    required: ["pattern"],
    properties: {
      pattern: {
        type: "string",
        description: 'The glob pattern to match files against (e.g. "**/*.ts").',
      },
      path: {
        type: "string",
        description:
          "The directory to search in. If not specified, the current working directory is used.",
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const pattern = args.pattern as string | undefined;
    if (!pattern) {
      return { status: "error", error: "pattern is required." };
    }

    const cwd = context.workingDirectory;
    const searchPath = args.path ? nodePath.resolve(cwd, args.path as string) : cwd;

    // Scan the directory tree
    const scanner = new FileScanner([searchPath], {
      ignorePatterns: ["node_modules", ".git"],
      abortSignal: context.signal,
    });
    const scanResult = await scanner.scan();

    // Convert glob pattern to regex and filter non-directory entries
    const regex = globPatternToRegex(pattern);
    const matchedPaths: string[] = [];

    for (const entry of scanResult.entries) {
      if (entry.isDirectory) continue;

      // Match against the relative path from searchPath
      const relativePath = nodePath.relative(searchPath, entry.path);
      if (regex.test(relativePath) || regex.test(entry.name)) {
        matchedPaths.push(entry.path);
      }
    }

    if (matchedPaths.length === 0) {
      return { status: "done", content: "No files matched the pattern." };
    }

    // Sort by modification time (most recent first)
    const sorted = await sortByMtime(matchedPaths);

    return { status: "done", content: sorted.join("\n") };
  },
};
