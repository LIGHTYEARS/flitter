/**
 * Tool name resolution and normalization for tool-call renderers.
 *
 * Maps agent tool name variants (Amp CLI snake_case, Coco ACP PascalCase,
 * MCP tool names) to canonical display names used by the dispatch switch
 * in the tool call widget.
 *
 * Ported from flitter-amp/src/widgets/tool-call/resolve-tool-name.ts
 * — import adapted from acp/types to state/types (flitter-cli native).
 */

import path from 'node:path';
import type { ToolCallItem } from '../../state/types';

/**
 * Normalizes common agent tool name variants to canonical names
 * used by the dispatch switch in ToolCallWidget.
 * Covers both Amp CLI names (snake_case) and Coco ACP names (PascalCase/lowercase).
 */
export const TOOL_NAME_MAP: Record<string, string> = {
  // Amp → Read
  read_file: 'Read',
  ReadFile: 'Read',
  // Amp → Bash
  execute_command: 'Bash',
  shell: 'Bash',
  run_command: 'Bash',
  terminal: 'Bash',
  // Coco → Bash
  bash: 'Bash',
  BashOutput: 'Bash',
  KillShell: 'Bash',
  // Amp → Grep
  search: 'Grep',
  grep: 'Grep',
  ripgrep: 'Grep',
  find_files: 'Grep',
  list_files: 'Grep',
  // Amp → create_file
  write_file: 'create_file',
  write_to_file: 'create_file',
  WriteFile: 'create_file',
  // Amp → edit_file
  edit: 'edit_file',
  str_replace_editor: 'edit_file',
  EditTool: 'edit_file',
  // Coco → apply_patch
  ApplyPatch: 'apply_patch',
  // Amp → WebSearch
  web_search: 'WebSearch',
  browser: 'WebSearch',
  fetch_url: 'WebSearch',
  // Coco → WebSearch
  WebFetch: 'WebSearch',
  // Coco → skill
  Skill: 'skill',
  // Coco → todo_write
  TodoWrite: 'todo_write',
  // Coco → Task/Subagent (ACTV-05: display as "Subagent" matching AMP)
  Task: 'Subagent',
};

/**
 * Extracts the canonical tool name from a ToolCallItem.
 * Priority: title (first space-delimited token) -> kind -> 'other'.
 *
 * Coco ACP sets `kind` unreliably ("read" for all read-type, undefined for others),
 * but `title` always starts with the tool name (e.g. "Read /path", "bash", "LS /dir").
 */
export function resolveToolName(toolCall: ToolCallItem): string {
  if (toolCall.title) {
    const firstToken = toolCall.title.split(' ')[0];
    if (firstToken) return firstToken;
  }
  return toolCall.kind || 'other';
}

/**
 * Returns the canonical display name for a tool call, suitable for ToolHeader.
 * Applies resolveToolName then maps through TOOL_NAME_MAP.
 */
export function resolveToolDisplayName(toolCall: ToolCallItem): string {
  const raw = resolveToolName(toolCall);
  return TOOL_NAME_MAP[raw] ?? raw;
}

/**
 * Shortens an absolute file path to a cwd-relative path for display.
 * Falls back to the original path if it's already relative or outside cwd.
 */
let _cwd: string = process.cwd();

/** Update the working directory used by shortenPath(). */
export function setCwd(cwd: string): void {
  _cwd = cwd;
}

/**
 * Converts an absolute path to a cwd-relative path for compact display.
 * Returns the original path if it is already relative or not under cwd.
 */
export function shortenPath(filePath: string): string {
  if (!filePath || !path.isAbsolute(filePath)) return filePath;
  const rel = path.relative(_cwd, filePath);
  if (rel.startsWith('..')) return filePath;
  return rel || filePath;
}

/**
 * Extracts the detail portion from a tool call title, stripping the leading tool name
 * to avoid duplication with the ToolHeader name.
 * e.g. "Read /path/to/file" -> "/path/to/file", "todo_write" -> ""
 */
export function extractTitleDetail(toolCall: ToolCallItem): string {
  const title = toolCall.title;
  if (!title) return '';
  const spaceIdx = title.indexOf(' ');
  if (spaceIdx === -1) return '';
  return title.slice(spaceIdx + 1);
}
