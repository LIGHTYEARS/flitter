// file-list.ts — List project files from the working directory for autocomplete and picker.
//
// Provides a shallow traversal with reasonable depth limit (default: 4 levels).
// Excludes common noise directories (node_modules, .git, dist, build).
// Returns relative paths sorted alphabetically.
//
// Two strategies:
//   1. `fd` (preferred): Respects .gitignore by default, fast native search.
//   2. `readdir` fallback: Manual recursive traversal with exclusion patterns.
//
// Results are capped to maxFiles (default: 500) to prevent huge directories
// from blocking the UI.

import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

/** Default directories to exclude when using readdir fallback. */
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  '.turbo',
  'coverage',
  '__pycache__',
  '.planning',
]);

/**
 * Options for listProjectFiles.
 */
export interface ListProjectFilesOptions {
  /** Maximum directory depth to traverse (default: 4). */
  maxDepth?: number;
  /** Maximum number of files to return (default: 500). */
  maxFiles?: number;
}

/**
 * List project files from the working directory for autocomplete and picker.
 *
 * Uses `fd` when available (respects .gitignore by default).
 * Falls back to recursive readdir with manual exclusion patterns if `fd` is not found.
 * Returns relative paths sorted alphabetically, capped to maxFiles.
 */
export async function listProjectFiles(
  cwd: string,
  options?: ListProjectFilesOptions,
): Promise<string[]> {
  const maxDepth = options?.maxDepth ?? 4;
  const maxFiles = options?.maxFiles ?? 500;

  let files: string[];
  try {
    files = await _listWithFd(cwd, maxDepth, maxFiles);
  } catch {
    files = await _listWithReaddir(cwd, cwd, maxDepth, maxFiles);
  }

  files.sort();
  return files.slice(0, maxFiles);
}

/**
 * List files using `fd` subprocess.
 * `fd` respects .gitignore by default and is fast for large trees.
 * Throws if `fd` is not available or the spawn fails.
 */
async function _listWithFd(
  cwd: string,
  maxDepth: number,
  maxFiles: number,
): Promise<string[]> {
  const proc = Bun.spawn(
    ['fd', '--type', 'f', '--max-depth', String(maxDepth), '--max-results', String(maxFiles), '.'],
    { cwd, stdout: 'pipe', stderr: 'pipe' },
  );

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`fd exited with code ${exitCode}`);
  }

  const stdout = await new Response(proc.stdout).text();
  if (stdout.trim().length === 0) return [];

  return stdout
    .trim()
    .split('\n')
    .filter((line) => line.length > 0);
}

/**
 * List files using recursive readdir traversal (fallback when fd is unavailable).
 * Manually excludes EXCLUDE_DIRS at each level.
 */
async function _listWithReaddir(
  rootCwd: string,
  currentDir: string,
  remainingDepth: number,
  maxFiles: number,
  accumulator: string[] = [],
): Promise<string[]> {
  if (remainingDepth <= 0 || accumulator.length >= maxFiles) {
    return accumulator;
  }

  let entries: import('node:fs').Dirent[];
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    // Permission denied or directory disappeared — skip silently
    return accumulator;
  }

  for (const entry of entries) {
    if (accumulator.length >= maxFiles) break;

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      await _listWithReaddir(
        rootCwd,
        join(currentDir, entry.name),
        remainingDepth - 1,
        maxFiles,
        accumulator,
      );
    } else if (entry.isFile()) {
      accumulator.push(relative(rootCwd, join(currentDir, entry.name)));
    }
  }

  return accumulator;
}
