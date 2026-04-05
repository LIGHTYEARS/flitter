// Write tool executor — writes content to files.
//
// Creates the file if it doesn't exist, overwrites if it does.
// Creates parent directories as needed.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, isAbsolute, dirname } from 'node:path';
import type { ToolExecutor, ToolResult, ToolContext } from './executor';
import { log } from '../utils/logger';

export class WriteExecutor implements ToolExecutor {
  async execute(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const filePath = input.file_path;
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return { content: 'Error: file_path parameter is required.', isError: true };
    }

    const content = input.content;
    if (typeof content !== 'string') {
      return { content: 'Error: content parameter is required and must be a string.', isError: true };
    }

    const absPath = isAbsolute(filePath) ? filePath : resolve(context.cwd, filePath);

    try {
      // Create parent directories if needed
      const dir = dirname(absPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const existed = existsSync(absPath);
      writeFileSync(absPath, content, 'utf-8');

      const lines = content.split('\n').length;
      const action = existed ? 'Updated' : 'Created';
      return { content: `${action} ${absPath} (${lines} lines)` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`WriteExecutor: error writing ${absPath}: ${msg}`);
      return { content: `Error writing file: ${msg}`, isError: true };
    }
  }
}
