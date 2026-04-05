// Grep tool executor — searches file contents using ripgrep (or fallback).
//
// Executes `rg` for regex pattern matching across files.
// Falls back to a simple recursive grep if rg is not available.

import type { ToolExecutor, ToolResult, ToolContext } from './executor';
import { log } from '../utils/logger';

const MAX_OUTPUT_CHARS = 30_000;

export class GrepExecutor implements ToolExecutor {
  async execute(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const pattern = input.pattern;
    if (typeof pattern !== 'string' || pattern.trim().length === 0) {
      return { content: 'Error: pattern parameter is required.', isError: true };
    }

    const searchPath = typeof input.path === 'string' ? input.path : context.cwd;
    const globFilter = typeof input.glob === 'string' ? input.glob : undefined;
    const outputMode = typeof input.output_mode === 'string' ? input.output_mode : 'files_with_matches';

    try {
      const args = ['rg'];

      // Output mode
      switch (outputMode) {
        case 'files_with_matches':
          args.push('--files-with-matches');
          break;
        case 'count':
          args.push('--count');
          break;
        case 'content':
          args.push('--line-number');
          break;
      }

      // Glob filter
      if (globFilter) {
        args.push('--glob', globFilter);
      }

      args.push('--', pattern, searchPath);

      const proc = Bun.spawn(args, {
        cwd: context.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      // rg returns 1 when no matches, 2 on error
      if (exitCode === 1) {
        return { content: 'No matches found.' };
      }

      if (exitCode === 2 || (exitCode !== 0 && exitCode !== 1)) {
        // rg not found or error — try grep fallback
        if (stderr.includes('not found') || stderr.includes('No such file')) {
          return await this._grepFallback(pattern, searchPath, outputMode, context);
        }
        return { content: stderr || `Search failed with exit code ${exitCode}`, isError: true };
      }

      let output = stdout.trim();
      if (output.length > MAX_OUTPUT_CHARS) {
        output = output.slice(0, MAX_OUTPUT_CHARS) + '\n...(truncated)';
      }

      return { content: output || 'No matches found.' };
    } catch (err) {
      // rg not available — fallback
      return await this._grepFallback(pattern, searchPath, outputMode, context);
    }
  }

  private async _grepFallback(
    pattern: string,
    searchPath: string,
    outputMode: string,
    context: ToolContext,
  ): Promise<ToolResult> {
    try {
      const args = ['grep', '-r'];
      if (outputMode === 'files_with_matches') args.push('-l');
      if (outputMode === 'content') args.push('-n');
      if (outputMode === 'count') args.push('-c');
      args.push('--', pattern, searchPath);

      const proc = Bun.spawn(args, {
        cwd: context.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      if (exitCode === 1) {
        return { content: 'No matches found.' };
      }

      let output = stdout.trim();
      if (output.length > MAX_OUTPUT_CHARS) {
        output = output.slice(0, MAX_OUTPUT_CHARS) + '\n...(truncated)';
      }

      return { content: output || 'No matches found.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: `Search error: ${msg}`, isError: true };
    }
  }
}
