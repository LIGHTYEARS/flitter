// Edit tool executor — performs exact string replacements in files.
//
// Finds old_string in the file and replaces it with new_string.
// old_string must be unique unless replace_all is true.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import type { ToolExecutor, ToolResult, ToolContext } from './executor';
import { log } from '../utils/logger';

export class EditExecutor implements ToolExecutor {
  async execute(
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> {
    const filePath = input.file_path;
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return { content: 'Error: file_path parameter is required.', isError: true };
    }

    const oldString = input.old_string;
    if (typeof oldString !== 'string') {
      return { content: 'Error: old_string parameter is required.', isError: true };
    }

    const newString = input.new_string;
    if (typeof newString !== 'string') {
      return { content: 'Error: new_string parameter is required.', isError: true };
    }

    if (oldString === newString) {
      return { content: 'Error: old_string and new_string are identical.', isError: true };
    }

    const replaceAll = input.replace_all === true;
    const absPath = isAbsolute(filePath) ? filePath : resolve(context.cwd, filePath);

    if (!existsSync(absPath)) {
      return { content: `Error: file not found: ${absPath}`, isError: true };
    }

    try {
      const content = readFileSync(absPath, 'utf-8');

      if (!content.includes(oldString)) {
        return {
          content: `Error: old_string not found in ${absPath}. Ensure the string matches exactly, including whitespace.`,
          isError: true,
        };
      }

      let newContent: string;
      let replacements: number;

      if (replaceAll) {
        newContent = content.split(oldString).join(newString);
        replacements = content.split(oldString).length - 1;
      } else {
        // Check uniqueness
        const firstIndex = content.indexOf(oldString);
        const secondIndex = content.indexOf(oldString, firstIndex + 1);
        if (secondIndex !== -1) {
          return {
            content: `Error: old_string is not unique in ${absPath}. Found multiple occurrences. Use replace_all=true to replace all, or provide more context to make it unique.`,
            isError: true,
          };
        }
        newContent = content.replace(oldString, newString);
        replacements = 1;
      }

      writeFileSync(absPath, newContent, 'utf-8');

      return {
        content: `Edited ${absPath}: ${replacements} replacement${replacements !== 1 ? 's' : ''} made.`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`EditExecutor: error editing ${absPath}: ${msg}`);
      return { content: `Error editing file: ${msg}`, isError: true };
    }
  }
}
