// Editor launcher — async $EDITOR integration with proper error handling
// Used by Ctrl+G handler to open the current prompt in an external editor.
// Amp ref: editor resolution pattern -- checks VISUAL, EDITOR, falls back to vi/nano.

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

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
  return (
    process.env.VISUAL ||
    process.env.EDITOR ||
    (process.platform === 'win32' ? 'notepad' : 'vi')
  );
}

/**
 * Write the initial text to a temp file, spawn the editor, wait for it
 * to exit, then read back the result.
 *
 * The caller is responsible for suspending/resuming the TUI around this call.
 *
 * @param initialText - Text to pre-populate in the editor
 * @returns EditorResult with the edited text or null on failure
 */
export async function launchEditor(initialText: string): Promise<EditorResult> {
  // 1. Create a temporary file with initial content
  const tmpFile = join(
    tmpdir(),
    `flitter-prompt-${randomBytes(4).toString('hex')}.md`,
  );

  try {
    writeFileSync(tmpFile, initialText, 'utf-8');
  } catch {
    return { success: false, text: null };
  }

  // 2. Resolve editor command
  const editor = resolveEditor();

  // 3. Parse editor command (handle "code --wait", "vim", etc.)
  const parts = editor.split(/\s+/);
  const cmd = parts[0]!;
  const args = [...parts.slice(1), tmpFile];

  // 4. Spawn the editor with inherited stdio
  try {
    const proc = Bun.spawn([cmd, ...args], {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: process.env,
    });

    // Wait for the editor to exit
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      return { success: false, text: null };
    }

    // 5. Read back the edited content
    const editedText = readFileSync(tmpFile, 'utf-8');
    return { success: true, text: editedText };
  } catch {
    return { success: false, text: null };
  } finally {
    // 6. Clean up temp file
    try {
      if (existsSync(tmpFile)) {
        unlinkSync(tmpFile);
      }
    } catch {
      // Best-effort cleanup
    }
  }
}
