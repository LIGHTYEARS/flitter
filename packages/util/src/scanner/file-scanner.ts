/**
 * File Scanner -- fast directory traversal
 *
 * External tool priority (rg/fd) + NodeJS recursive fallback,
 * supports ignore patterns, always-include, depth/file limits.
 *
 * @example
 * ```ts
 * import { FileScanner } from '@flitter/util';
 * const scanner = new FileScanner(['/home/user/project'], {
 *   ignorePatterns: ['node_modules', '*.log'],
 *   maxFiles: 10000,
 * });
 * await scanner.initialize();
 * const result = await scanner.scan();
 * console.log(result.entries.length, result.truncated);
 * ```
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "../process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanEntry {
  /** file:// URI */
  uri: string;
  /** Absolute filesystem path */
  path: string;
  /** Basename */
  name: string;
  isDirectory: boolean;
  isAlwaysIncluded: boolean;
}

export interface ScanOptions {
  /** Maximum number of entries returned (default 50 000) */
  maxFiles?: number;
  /** Maximum recursion depth */
  maxDepth?: number;
  /** Follow symbolic links (default false) */
  followSymlinks?: boolean;
  /** Gitignore-style glob patterns to exclude */
  ignorePatterns?: string[];
  /** Paths (relative to root) that are always included even if they match an ignore pattern */
  alwaysIncludePaths?: string[];
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

export interface ScanResult {
  entries: ScanEntry[];
  scannedFiles: number;
  scannedDirectories: number;
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Internal option type with all fields required
// ---------------------------------------------------------------------------

interface ResolvedOptions {
  maxFiles: number;
  maxDepth: number;
  followSymlinks: boolean;
  ignorePatterns: string[];
  alwaysIncludePaths: string[];
  abortSignal: AbortSignal | undefined;
}

// ---------------------------------------------------------------------------
// Glob matcher (simple, no external deps)
// ---------------------------------------------------------------------------

/**
 * Convert a gitignore-style glob pattern to a RegExp.
 *
 * Supported syntax:
 *  - `*`   matches anything except `/`
 *  - `**`  matches zero or more path segments
 *  - `?`   matches a single char (not `/`)
 *  - Trailing `/` is stripped (directory-only flag not enforced here)
 *  - Leading `/` anchors to the root (stripped before conversion)
 */
function globToRegex(pattern: string): RegExp {
  // Strip trailing slash (directory-only marker -- we ignore it at this level)
  if (pattern.endsWith("/")) {
    pattern = pattern.slice(0, -1);
  }

  let result = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i]!;
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        if (pattern[i + 2] === "/") {
          // `**/` -- match zero or more directories
          result += "(?:.*/)?";
          i += 3;
          continue;
        }
        // `**` at end -- match everything
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
    } else if (".+^${}|()[]\\".includes(c)) {
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

/**
 * Test whether `relativePath` (forward-slashed, relative to scan root) or
 * `baseName` matches a single gitignore-style `pattern`.
 *
 * If the pattern contains no `/` it is matched against the basename only,
 * otherwise against the full relative path.
 */
function matchesGlob(
  relativePath: string,
  baseName: string,
  pattern: string,
): boolean {
  // Strip leading `/` (anchors pattern, but we always match from start)
  const stripped = pattern.startsWith("/") ? pattern.slice(1) : pattern;
  const hasSlash = stripped.includes("/");
  const target = hasSlash ? relativePath : baseName;
  const regex = globToRegex(stripped);
  return regex.test(target);
}

function shouldIgnore(
  relativePath: string,
  baseName: string,
  patterns: string[],
): boolean {
  for (const pattern of patterns) {
    if (matchesGlob(relativePath, baseName, pattern)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pathToFileUri(absPath: string): string {
  return "file://" + absPath;
}

// ---------------------------------------------------------------------------
// NodeJS recursive scanner
// ---------------------------------------------------------------------------

async function scanWithNodeJS(
  root: string,
  options: ResolvedOptions,
): Promise<ScanResult> {
  const entries: ScanEntry[] = [];
  let scannedFiles = 0;
  let scannedDirectories = 0;
  let truncated = false;

  const alwaysIncludeSet = new Set(
    options.alwaysIncludePaths.map((p) => path.resolve(root, p)),
  );

  async function walk(dir: string, depth: number): Promise<void> {
    if (options.abortSignal?.aborted) return;
    if (depth > options.maxDepth) return;
    if (truncated) return;

    let dirents: fs.Dirent[];
    try {
      dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return; // EACCES, ENOENT etc -- skip
    }
    scannedDirectories++;

    for (const dirent of dirents) {
      if (options.abortSignal?.aborted) return;
      if (entries.length >= options.maxFiles) {
        truncated = true;
        return;
      }

      const fullPath = path.join(dir, dirent.name);
      const relativePath = path.relative(root, fullPath);

      const isAlwaysIncluded = alwaysIncludeSet.has(fullPath);

      // Check ignore patterns (skip if matched, unless always-included)
      if (
        !isAlwaysIncluded &&
        shouldIgnore(relativePath, dirent.name, options.ignorePatterns)
      ) {
        continue;
      }

      let isDir: boolean;
      if (options.followSymlinks && dirent.isSymbolicLink()) {
        try {
          const stat = await fs.promises.stat(fullPath);
          isDir = stat.isDirectory();
        } catch {
          continue;
        }
      } else if (dirent.isSymbolicLink()) {
        // Skip symlinks by default
        continue;
      } else {
        isDir = dirent.isDirectory();
      }

      if (isDir) {
        entries.push({
          uri: pathToFileUri(fullPath),
          path: fullPath,
          name: dirent.name,
          isDirectory: true,
          isAlwaysIncluded,
        });
        await walk(fullPath, depth + 1);
      } else {
        scannedFiles++;
        entries.push({
          uri: pathToFileUri(fullPath),
          path: fullPath,
          name: dirent.name,
          isDirectory: false,
          isAlwaysIncluded,
        });
      }
    }
  }

  await walk(root, 0);
  return { entries, scannedFiles, scannedDirectories, truncated };
}

// ---------------------------------------------------------------------------
// External tool scanner (rg / fd)
// ---------------------------------------------------------------------------

async function detectExternalTool(): Promise<"rg" | "fd" | null> {
  try {
    const rgResult = await spawn("which", ["rg"]);
    if (rgResult.exitCode === 0) return "rg";
  } catch {
    /* not found */
  }
  try {
    const fdResult = await spawn("which", ["fd"]);
    if (fdResult.exitCode === 0) return "fd";
  } catch {
    /* not found */
  }
  return null;
}

async function scanWithExternalTool(
  tool: "rg" | "fd",
  root: string,
  options: ResolvedOptions,
): Promise<ScanResult | null> {
  try {
    let args: string[];
    if (tool === "rg") {
      args = ["--files", "--no-messages"];
      if (options.followSymlinks) args.push("--follow");
      if (options.maxDepth !== Infinity) {
        args.push("--max-depth", String(options.maxDepth));
      }
      for (const pattern of options.ignorePatterns) {
        args.push("--glob", "!" + pattern);
      }
      args.push(root);
    } else {
      // fd
      args = ["--type", "f", "--absolute-path"];
      if (options.followSymlinks) args.push("--follow");
      if (options.maxDepth !== Infinity) {
        args.push("--max-depth", String(options.maxDepth));
      }
      for (const pattern of options.ignorePatterns) {
        args.push("--exclude", pattern);
      }
      args.push(".", root);
    }

    const result = await spawn(tool, args, { timeout: 30_000 });
    if (result.exitCode !== 0 && result.stdout.trim() === "") return null;

    const lines = result.stdout.trim().split("\n").filter(Boolean);
    const entries: ScanEntry[] = [];
    let truncated = false;

    for (const line of lines) {
      if (entries.length >= options.maxFiles) {
        truncated = true;
        break;
      }
      const absPath = path.isAbsolute(line) ? line : path.resolve(root, line);
      const name = path.basename(absPath);
      entries.push({
        uri: pathToFileUri(absPath),
        path: absPath,
        name,
        isDirectory: false,
        isAlwaysIncluded: false,
      });
    }

    // Handle always-include paths
    const alwaysIncludeSet = new Set(
      options.alwaysIncludePaths.map((p) => path.resolve(root, p)),
    );
    for (const entry of entries) {
      if (alwaysIncludeSet.has(entry.path)) entry.isAlwaysIncluded = true;
    }
    // Add missing always-include paths
    const existingPaths = new Set(entries.map((e) => e.path));
    for (const aip of alwaysIncludeSet) {
      if (!existingPaths.has(aip)) {
        try {
          const stat = await fs.promises.stat(aip);
          entries.push({
            uri: pathToFileUri(aip),
            path: aip,
            name: path.basename(aip),
            isDirectory: stat.isDirectory(),
            isAlwaysIncluded: true,
          });
        } catch {
          /* skip if not found */
        }
      }
    }

    return {
      entries,
      scannedFiles: entries.filter((e) => !e.isDirectory).length,
      scannedDirectories: 0, // external tools don't report dir count
      truncated,
    };
  } catch {
    return null; // fall back to NodeJS
  }
}

// ---------------------------------------------------------------------------
// FileScanner class
// ---------------------------------------------------------------------------

export class FileScanner {
  private _roots: string[];
  private _options: ResolvedOptions;
  private _externalTool: "rg" | "fd" | null = null;
  private _initialized = false;

  constructor(roots: string[], options?: ScanOptions) {
    this._roots = roots;
    this._options = {
      maxFiles: options?.maxFiles ?? 50_000,
      maxDepth: options?.maxDepth ?? Infinity,
      followSymlinks: options?.followSymlinks ?? false,
      ignorePatterns: options?.ignorePatterns ?? [],
      alwaysIncludePaths: options?.alwaysIncludePaths ?? [],
      abortSignal: options?.abortSignal,
    };
  }

  /** Detect available external tools (rg / fd). Called automatically by scan(). */
  async initialize(): Promise<void> {
    this._externalTool = await detectExternalTool();
    this._initialized = true;
  }

  /** Run the scan across all configured roots. */
  async scan(): Promise<ScanResult> {
    if (!this._initialized) await this.initialize();

    const allEntries: ScanEntry[] = [];
    let totalFiles = 0;
    let totalDirs = 0;
    let truncated = false;

    for (const root of this._roots) {
      if (truncated) break;

      const currentMax = this._options.maxFiles - allEntries.length;
      if (currentMax <= 0) {
        truncated = true;
        break;
      }

      const opts: ResolvedOptions = { ...this._options, maxFiles: currentMax };

      let result: ScanResult | null = null;

      // Try external tool first
      if (this._externalTool) {
        result = await scanWithExternalTool(this._externalTool, root, opts);
      }

      // Fall back to NodeJS
      if (!result) {
        try {
          await fs.promises.access(root);
          result = await scanWithNodeJS(root, opts);
        } catch {
          result = {
            entries: [],
            scannedFiles: 0,
            scannedDirectories: 0,
            truncated: false,
          };
        }
      }

      allEntries.push(...result.entries);
      totalFiles += result.scannedFiles;
      totalDirs += result.scannedDirectories;
      if (result.truncated) truncated = true;
    }

    // Enforce global maxFiles cap
    if (allEntries.length > this._options.maxFiles) {
      allEntries.length = this._options.maxFiles;
      truncated = true;
    }

    return {
      entries: allEntries,
      scannedFiles: totalFiles,
      scannedDirectories: totalDirs,
      truncated,
    };
  }
}
