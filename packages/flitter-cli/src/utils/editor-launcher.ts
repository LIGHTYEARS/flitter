// Editor launcher -- async $EDITOR integration with proper error handling
// Used by Ctrl+G handler to open the current prompt in an external editor.

import { writeFileSync, readFileSync, unlinkSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { log } from './logger';

/**
 * Result of an editor session.
 */
export interface EditorResult {
  /** Whether the editor exited successfully (code 0). */
  success: boolean;
  /** The text content after editing, or null if cancelled/failed. */
  text: string | null;
}

/**
 * Resolve the editor command from environment.
 * Priority: $VISUAL > $EDITOR > platform fallback.
 */
export function resolveEditor(): string {
  if (process.env.VISUAL) return process.env.VISUAL;
  if (process.env.EDITOR) return process.env.EDITOR;
  // No TTY (CI, tests, piped stdin) → no interactive editor available
  if (!process.stdin.isTTY) return 'true';
  return process.platform === 'win32' ? 'notepad' : 'vi';
}

/**
 * Launch $EDITOR with a temp file, wait for the editor to close,
 * and return the edited content as an EditorResult.
 *
 * The caller is responsible for suspending/resuming the TUI around this call.
 *
 * @param initialContent - Pre-populated content for the temp file
 * @param editor - Editor command (default: resolved from environment)
 * @returns EditorResult with the edited text or null on failure
 */
export async function launchEditor(
  initialContent: string = '',
  editor?: string,
): Promise<EditorResult> {
  const editorCmd = editor || resolveEditor();

  // Create temp file
  const tmpDir = mkdtempSync(join(tmpdir(), 'flitter-cli-'));
  const tmpFile = join(tmpDir, 'PROMPT.md');
  writeFileSync(tmpFile, initialContent, 'utf-8');

  try {
    // Parse editor command (may have args like "code --wait")
    const parts = editorCmd.split(/\s+/);
    const cmd = parts[0];
    const args = [...parts.slice(1), tmpFile];

    log.info(`Launching editor: ${cmd} ${args.join(' ')}`);

    const proc = Bun.spawn([cmd, ...args], {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      log.warn(`Editor exited with code ${exitCode}`);
      return { success: false, text: null };
    }

    const edited = readFileSync(tmpFile, 'utf-8');
    return { success: true, text: edited };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Failed to launch editor: ${msg}`);
    return { success: false, text: null };
  } finally {
    // Cleanup
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
    try {
      const { rmdirSync } = require('node:fs');
      rmdirSync(tmpDir);
    } catch { /* ignore */ }
  }
}
