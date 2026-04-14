/**
 * FuzzyFindTool -- fuzzy file name search
 *
 * Uses FileScanner for directory traversal and FuzzyMatcher for ranked matching.
 * Results include file paths and match scores.
 *
 * @example
 * ```ts
 * import { FuzzyFindTool } from './fuzzy-find';
 * const result = await FuzzyFindTool.execute(
 *   { query: 'comp', limit: 10 },
 *   context,
 * );
 * ```
 */
import * as nodePath from "node:path";
import { FileScanner, FuzzyMatcher } from "@flitter/util";
import type { ExecutionProfile, ToolContext, ToolResult, ToolSpec } from "../types";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 20;

// ---------------------------------------------------------------------------
// Execution profile helper
// ---------------------------------------------------------------------------

export function fuzzyFindExecutionProfile(
  args: Record<string, unknown>,
  cwd: string,
): ExecutionProfile {
  const searchPath = args.path ? nodePath.resolve(cwd, args.path as string) : cwd;
  return {
    resourceKeys: [{ key: searchPath, mode: "read" }],
  };
}

// ---------------------------------------------------------------------------
// FuzzyFindTool
// ---------------------------------------------------------------------------

export const FuzzyFindTool: ToolSpec = {
  name: "FuzzyFind",
  description:
    "Fuzzy file name search. Finds files by approximate name matching using a " +
    "multi-tier scoring strategy (exact > prefix > suffix > substring > fuzzy). " +
    "Returns results ranked by relevance score.",
  source: "builtin",
  isReadOnly: true,

  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description: "The fuzzy search query string.",
      },
      path: {
        type: "string",
        description:
          "The directory to search in. If not specified, the current working directory is used.",
      },
      limit: {
        type: "number",
        description: `Maximum number of results to return. Defaults to ${DEFAULT_LIMIT}.`,
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const query = args.query as string | undefined;
    if (!query) {
      return { status: "error", error: "query is required." };
    }

    const cwd = context.workingDirectory;
    const searchPath = args.path ? nodePath.resolve(cwd, args.path as string) : cwd;
    const limit = (args.limit as number | undefined) ?? DEFAULT_LIMIT;

    // Scan the directory tree
    const scanner = new FileScanner([searchPath], {
      ignorePatterns: ["node_modules", ".git"],
      abortSignal: context.signal,
    });
    const scanResult = await scanner.scan();

    // Filter to non-directory entries for matching
    const fileEntries = scanResult.entries.filter((e) => !e.isDirectory);

    // Fuzzy match
    const matcher = new FuzzyMatcher(query, {
      maxResults: limit,
    });
    const results = matcher.match(fileEntries);

    if (results.length === 0) {
      return { status: "done", content: "No matching files found." };
    }

    // Format output: path (score: N)
    const lines = results.map((r) => `${r.entry.path} (score: ${r.score})`);

    return { status: "done", content: lines.join("\n") };
  },
};
