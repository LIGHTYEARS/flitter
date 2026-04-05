// Read tool executor — reads files from the filesystem.
//
// Returns file contents with line numbers (cat -n style).
// Supports offset and limit for large files.

import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import type { ToolExecutor, ToolResult, ToolContext } from './executor';
import { log } from '../utils/logger';

const MAX_LINES = 2000;
const MAX_LINE_LENGTH = 2000;

export class ReadExecutor implements ToolExecutor {
  async execute(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const filePath = input.file_path;
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return { content: 'Error: file_path parameter is required.', isError: true };
    }

    const absPath = isAbsolute(filePath) ? filePath : resolve(context.cwd, filePath);

    if (!existsSync(absPath)) {
      return { content: `Error: file not found: ${absPath}`, isError: true };
    }

    const stat = statSync(absPath);
    if (stat.isDirectory()) {
      return { content: `Error: '${absPath}' is a directory. Use Bash with 'ls' to list directory contents.`, isError: true };
    }

    try {
      const raw = readFileSync(absPath, 'utf-8');
      if (raw.length === 0) {
        return { content: '(empty file)' };
      }

      const allLines = raw.split('\n');

      const offset = typeof input.offset === 'number' ? Math.max(0, input.offset - 1) : 0;
      const limit = typeof input.limit === 'number' ? Math.min(input.limit, MAX_LINES) : MAX_LINES;

      const lines = allLines.slice(offset, offset + limit);
      const lineNumberWidth = String(offset + lines.length).length;

      const formatted = lines.map((line, i) => {
        const lineNum = String(offset + i + 1).padStart(lineNumberWidth, ' ');
        const truncated = line.length > MAX_LINE_LENGTH
          ? line.slice(0, MAX_LINE_LENGTH) + '...'
          : line;
        return `${lineNum}\t${truncated}`;
      }).join('\n');

      if (!formatted) {
        return { content: '(empty file)' };
      }

      let result = formatted;
      if (allLines.length > offset + limit) {
        result += `\n\n(${allLines.length - offset - limit} more lines not shown)`;
      }

      return { content: result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`ReadExecutor: error reading ${absPath}: ${msg}`);
      return { content: `Error reading file: ${msg}`, isError: true };
    }
  }
}
