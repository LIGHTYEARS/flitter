// Glob tool executor — finds files by name pattern.
//
// Uses Bun.Glob for fast pattern matching.
// Returns matching file paths sorted by modification time.

import { statSync, readdirSync } from 'node:fs';
import { resolve, isAbsolute, relative, join } from 'node:path';
import type { ToolExecutor, ToolResult, ToolContext } from './executor';
import { log } from '../utils/logger';

const MAX_RESULTS = 500;

export class GlobExecutor implements ToolExecutor {
  async execute(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const pattern = input.pattern;
    if (typeof pattern !== 'string' || pattern.trim().length === 0) {
      return { content: 'Error: pattern parameter is required.', isError: true };
    }

    const searchPath = typeof input.path === 'string'
      ? (isAbsolute(input.path) ? input.path : resolve(context.cwd, input.path))
      : context.cwd;

    try {
      const glob = new Bun.Glob(pattern);
      const matches: Array<{ path: string; mtime: number }> = [];

      for (const match of glob.scanSync({ cwd: searchPath, absolute: true })) {
        try {
          const stat = statSync(match);
          matches.push({ path: match, mtime: stat.mtimeMs });
        } catch {
          // Skip files we can't stat
          matches.push({ path: match, mtime: 0 });
        }

        if (matches.length >= MAX_RESULTS) break;
      }

      // Sort by modification time (most recent first)
      matches.sort((a, b) => b.mtime - a.mtime);

      if (matches.length === 0) {
        return { content: 'No files found matching pattern.' };
      }

      const output = matches.map(m => m.path).join('\n');
      const suffix = matches.length >= MAX_RESULTS
        ? `\n\n(showing first ${MAX_RESULTS} results)`
        : '';

      return { content: output + suffix };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`GlobExecutor: error: ${msg}`);
      return { content: `Error searching files: ${msg}`, isError: true };
    }
  }
}
