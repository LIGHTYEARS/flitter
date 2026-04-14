/**
 * GrepTool -- search file contents using regex
 *
 * Uses ripgrep (rg) when available, falls back to a NodeJS recursive
 * directory walker with RegExp matching.
 *
 * @example
 * ```ts
 * import { GrepTool } from './grep';
 * const result = await GrepTool.execute(
 *   { pattern: 'TODO', path: '/src', output_mode: 'content' },
 *   context,
 * );
 * ```
 */
import * as fs from "node:fs";
import * as nodePath from "node:path";
import { spawn } from "@flitter/util";
import type { ExecutionProfile, ToolContext, ToolResult, ToolSpec } from "../types";

// ---------------------------------------------------------------------------
// Ripgrep availability cache
// ---------------------------------------------------------------------------

let _rgAvailable: boolean | null = null;

async function isRgAvailable(): Promise<boolean> {
  if (_rgAvailable !== null) return _rgAvailable;
  try {
    const result = await spawn("rg", ["--version"]);
    _rgAvailable = result.exitCode === 0;
  } catch {
    _rgAvailable = false;
  }
  return _rgAvailable;
}

// ---------------------------------------------------------------------------
// rg argument builder
// ---------------------------------------------------------------------------

interface GrepArgs {
  pattern: string;
  path?: string;
  type?: string;
  glob?: string;
  output_mode?: "content" | "files_with_matches" | "count";
  context?: number;
  "-A"?: number;
  "-B"?: number;
  "-C"?: number;
  "-i"?: boolean;
  "-n"?: boolean;
  multiline?: boolean;
  head_limit?: number;
  offset?: number;
}

function buildRgArgs(args: GrepArgs, cwd: string): string[] {
  const rgArgs: string[] = [];
  const outputMode = args.output_mode ?? "files_with_matches";

  // Output mode flags
  if (outputMode === "files_with_matches") {
    rgArgs.push("--files-with-matches");
  } else if (outputMode === "count") {
    rgArgs.push("--count");
  }

  // Context flags (only meaningful for content mode)
  if (outputMode === "content") {
    const contextVal = args["-C"] ?? args.context;
    if (contextVal !== undefined) {
      rgArgs.push("-C", String(contextVal));
    } else {
      if (args["-A"] !== undefined) rgArgs.push("-A", String(args["-A"]));
      if (args["-B"] !== undefined) rgArgs.push("-B", String(args["-B"]));
    }

    // Line numbers (default true for content mode)
    const showLineNumbers = args["-n"] !== false;
    if (showLineNumbers) {
      rgArgs.push("-n");
    }
  }

  // Case insensitive
  if (args["-i"]) {
    rgArgs.push("-i");
  }

  // Multiline
  if (args.multiline) {
    rgArgs.push("-U", "--multiline-dotall");
  }

  // File type filter
  if (args.type) {
    rgArgs.push("--type", args.type);
  }

  // Glob filter
  if (args.glob) {
    rgArgs.push("--glob", args.glob);
  }

  // No heading for easier parsing
  rgArgs.push("--no-heading");

  // Pattern
  rgArgs.push(args.pattern);

  // Search path
  const searchPath = args.path ? nodePath.resolve(cwd, args.path) : cwd;
  rgArgs.push(searchPath);

  return rgArgs;
}

// ---------------------------------------------------------------------------
// NodeJS grep fallback
// ---------------------------------------------------------------------------

interface FallbackOptions {
  ignoreCase: boolean;
  multiline: boolean;
  outputMode: "content" | "files_with_matches" | "count";
  showLineNumbers: boolean;
  contextBefore: number;
  contextAfter: number;
  glob?: string;
  type?: string;
}

/** Simple mapping from rg --type names to extensions */
const TYPE_EXTENSIONS: Record<string, string[]> = {
  js: [".js", ".mjs", ".cjs", ".jsx"],
  ts: [".ts", ".mts", ".cts", ".tsx"],
  py: [".py", ".pyi"],
  rust: [".rs"],
  go: [".go"],
  java: [".java"],
  css: [".css", ".scss", ".sass", ".less"],
  html: [".html", ".htm"],
  json: [".json"],
  yaml: [".yml", ".yaml"],
  md: [".md", ".markdown"],
  txt: [".txt"],
  xml: [".xml"],
  sh: [".sh", ".bash", ".zsh"],
  c: [".c", ".h"],
  cpp: [".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx"],
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "__pycache__",
  ".next",
  "dist",
  ".cache",
]);

function matchesGlobFilter(filePath: string, globPattern: string): boolean {
  // Convert simple glob to regex
  let pattern = globPattern;
  // Escape regex special chars except * and ?
  pattern = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  // Convert glob wildcards
  pattern = pattern.replace(/\*\*/g, "<<DOUBLE_STAR>>");
  pattern = pattern.replace(/\*/g, "[^/]*");
  pattern = pattern.replace(/<<DOUBLE_STAR>>/g, ".*");
  pattern = pattern.replace(/\?/g, "[^/]");

  const regex = new RegExp(pattern + "$");
  return regex.test(filePath);
}

function matchesTypeFilter(filePath: string, type: string): boolean {
  const extensions = TYPE_EXTENSIONS[type];
  if (!extensions) return true; // unknown type, don't filter
  const ext = nodePath.extname(filePath).toLowerCase();
  return extensions.includes(ext);
}

function isBinaryBuffer(buffer: Buffer, bytesRead: number): boolean {
  for (let i = 0; i < bytesRead; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

async function grepFallback(
  pattern: string,
  searchPath: string,
  options: FallbackOptions,
): Promise<string> {
  const flags = (options.ignoreCase ? "i" : "") + (options.multiline ? "ms" : "");
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    return `Error: Invalid regex pattern: ${pattern}`;
  }

  const fileMatches: Array<{ file: string; lines: string[] }> = [];
  const fileCounts: Array<{ file: string; count: number }> = [];
  const matchedFiles: string[] = [];

  async function walkDir(dir: string): Promise<void> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = nodePath.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walkDir(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      // Apply type filter
      if (options.type && !matchesTypeFilter(fullPath, options.type)) continue;

      // Apply glob filter
      if (options.glob && !matchesGlobFilter(fullPath, options.glob)) continue;

      // Read file and check for binary content
      let content: string;
      try {
        const buffer = Buffer.alloc(512);
        const fd = await fs.promises.open(fullPath, "r");
        try {
          const { bytesRead } = await fd.read(buffer, 0, 512, 0);
          if (isBinaryBuffer(buffer, bytesRead)) continue;
        } finally {
          await fd.close();
        }
        content = await fs.promises.readFile(fullPath, "utf-8");
      } catch {
        continue;
      }

      const lines = content.split("\n");

      if (options.outputMode === "files_with_matches") {
        // Check if any line matches
        if (options.multiline) {
          if (regex.test(content)) {
            matchedFiles.push(fullPath);
          }
        } else {
          for (const line of lines) {
            if (regex.test(line)) {
              matchedFiles.push(fullPath);
              break;
            }
          }
        }
      } else if (options.outputMode === "count") {
        let count = 0;
        if (options.multiline) {
          const matches = content.match(new RegExp(regex.source, regex.flags + "g"));
          count = matches ? matches.length : 0;
        } else {
          for (const line of lines) {
            if (regex.test(line)) count++;
          }
        }
        if (count > 0) {
          fileCounts.push({ file: fullPath, count });
        }
      } else {
        // content mode
        const matchingLines: Array<{ lineNum: number; text: string; isContext: boolean }> = [];

        if (options.multiline) {
          // For multiline, just show matching lines
          if (regex.test(content)) {
            for (let i = 0; i < lines.length; i++) {
              matchingLines.push({ lineNum: i + 1, text: lines[i]!, isContext: false });
            }
          }
        } else {
          const matchedLineNums = new Set<number>();
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i]!)) {
              matchedLineNums.add(i);
            }
          }

          if (matchedLineNums.size > 0) {
            // Include context lines
            const includedLines = new Set<number>();
            for (const lineNum of matchedLineNums) {
              const start = Math.max(0, lineNum - options.contextBefore);
              const end = Math.min(lines.length - 1, lineNum + options.contextAfter);
              for (let i = start; i <= end; i++) {
                includedLines.add(i);
              }
            }

            const sortedLines = Array.from(includedLines).sort((a, b) => a - b);
            for (const idx of sortedLines) {
              matchingLines.push({
                lineNum: idx + 1,
                text: lines[idx]!,
                isContext: !matchedLineNums.has(idx),
              });
            }
          }
        }

        if (matchingLines.length > 0) {
          const formatted = matchingLines.map((m) => {
            const sep = m.isContext ? "-" : ":";
            return options.showLineNumbers ? `${m.lineNum}${sep}${m.text}` : m.text;
          });
          fileMatches.push({ file: fullPath, lines: formatted });
        }
      }
    }
  }

  await walkDir(searchPath);

  // Format output
  if (options.outputMode === "files_with_matches") {
    return matchedFiles.length > 0 ? matchedFiles.join("\n") : "";
  }
  if (options.outputMode === "count") {
    return fileCounts.length > 0 ? fileCounts.map((fc) => `${fc.file}:${fc.count}`).join("\n") : "";
  }
  // content mode
  if (fileMatches.length === 0) return "";
  return fileMatches.map((fm) => `${fm.file}\n${fm.lines.join("\n")}`).join("\n\n");
}

// ---------------------------------------------------------------------------
// Post-processing helpers
// ---------------------------------------------------------------------------

function applyPagination(output: string, headLimit: number, offset: number): string {
  if (!output) return output;
  const lines = output.split("\n");
  const sliced = lines.slice(offset);
  if (headLimit > 0) {
    return sliced.slice(0, headLimit).join("\n");
  }
  return sliced.join("\n");
}

// ---------------------------------------------------------------------------
// Execution profile helper
// ---------------------------------------------------------------------------

export function grepExecutionProfile(args: Record<string, unknown>, cwd: string): ExecutionProfile {
  const searchPath = args.path ? nodePath.resolve(cwd, args.path as string) : cwd;
  return {
    resourceKeys: [{ key: searchPath, mode: "read" }],
  };
}

// ---------------------------------------------------------------------------
// GrepTool
// ---------------------------------------------------------------------------

export const GrepTool: ToolSpec = {
  name: "Grep",
  description:
    "Search file contents using regex patterns. Uses ripgrep when available, with a NodeJS fallback. " +
    "Supports file type and glob filtering, context lines, case-insensitive and multiline search, " +
    "and three output modes: content (matching lines), files_with_matches (file paths), count (match counts).",
  source: "builtin",
  isReadOnly: true,

  inputSchema: {
    type: "object",
    required: ["pattern"],
    properties: {
      pattern: {
        type: "string",
        description: "The regular expression pattern to search for in file contents.",
      },
      path: {
        type: "string",
        description: "File or directory to search in. Defaults to current working directory.",
      },
      type: {
        type: "string",
        description:
          "File type to search (e.g. js, py, rust, go, java). More efficient than glob for standard file types.",
      },
      glob: {
        type: "string",
        description: 'Glob pattern to filter files (e.g. "*.js", "**/*.tsx").',
      },
      output_mode: {
        type: "string",
        enum: ["content", "files_with_matches", "count"],
        description:
          'Output mode. "content" shows matching lines, "files_with_matches" shows file paths (default), "count" shows match counts.',
      },
      context: {
        type: "number",
        description:
          "Number of lines to show before and after each match. Requires output_mode: content.",
      },
      "-A": {
        type: "number",
        description: "Number of lines to show after each match. Requires output_mode: content.",
      },
      "-B": {
        type: "number",
        description: "Number of lines to show before each match. Requires output_mode: content.",
      },
      "-C": {
        type: "number",
        description: "Alias for context.",
      },
      "-i": {
        type: "boolean",
        description: "Case insensitive search.",
      },
      "-n": {
        type: "boolean",
        description:
          "Show line numbers in output. Requires output_mode: content. Defaults to true.",
      },
      multiline: {
        type: "boolean",
        description: "Enable multiline mode where . matches newlines and patterns can span lines.",
      },
      head_limit: {
        type: "number",
        description: "Limit output to first N lines/entries. Defaults to 0 (unlimited).",
      },
      offset: {
        type: "number",
        description: "Skip first N lines/entries before applying head_limit. Defaults to 0.",
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const grepArgs = args as unknown as GrepArgs;

    if (!grepArgs.pattern) {
      return { status: "error", error: "pattern is required." };
    }

    const cwd = context.workingDirectory;
    const outputMode = grepArgs.output_mode ?? "files_with_matches";
    const headLimit = grepArgs.head_limit ?? 0;
    const offset = grepArgs.offset ?? 0;

    let output: string;

    const rgReady = await isRgAvailable();

    if (rgReady) {
      // Use ripgrep
      const rgArgs = buildRgArgs(grepArgs, cwd);
      try {
        const result = await spawn("rg", rgArgs, {
          cwd,
          timeout: 30_000,
          signal: context.signal,
        });
        output = result.stdout.trim();
      } catch {
        // rg failed (e.g. timeout, signal), fall through to fallback
        output = "";
      }
    } else {
      // Fallback to NodeJS implementation
      const searchPath = grepArgs.path ? nodePath.resolve(cwd, grepArgs.path) : cwd;

      const contextVal = grepArgs["-C"] ?? grepArgs.context ?? 0;
      const contextBefore = grepArgs["-B"] ?? contextVal;
      const contextAfter = grepArgs["-A"] ?? contextVal;

      output = await grepFallback(grepArgs.pattern, searchPath, {
        ignoreCase: grepArgs["-i"] ?? false,
        multiline: grepArgs.multiline ?? false,
        outputMode,
        showLineNumbers: grepArgs["-n"] !== false,
        contextBefore,
        contextAfter,
        glob: grepArgs.glob,
        type: grepArgs.type,
      });
    }

    // Apply pagination
    if (output && (headLimit > 0 || offset > 0)) {
      output = applyPagination(output, headLimit, offset);
    }

    if (!output) {
      return { status: "done", content: "No matches found." };
    }

    return { status: "done", content: output };
  },
};
