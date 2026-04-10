// Cross-platform clipboard copy utility for flitter-cli.
//
// Tries platform-specific clipboard tools in sequence:
//   macOS  → pbcopy
//   Linux  → xclip -selection clipboard, then xsel --clipboard --input
//   WSL    → clip.exe
//
// Returns true on success, false if no clipboard tool is available or the
// copy operation fails.

import { log } from './logger';

// ---------------------------------------------------------------------------
// Auto-copy timing constants
// ---------------------------------------------------------------------------

/** Delay in ms before auto-copying selected text to clipboard. */
export const AUTO_COPY_DELAY_MS = 300;

/** Duration in ms to highlight text after a successful auto-copy. */
export const AUTO_COPY_HIGHLIGHT_DURATION_MS = 500;

/** Candidate clipboard commands tried in order. */
const CLIPBOARD_COMMANDS: ReadonlyArray<{ cmd: string; args: string[] }> = [
  // macOS
  { cmd: 'pbcopy', args: [] },
  // Linux (X11/Wayland with xclip)
  { cmd: 'xclip', args: ['-selection', 'clipboard'] },
  // Linux (xsel fallback)
  { cmd: 'xsel', args: ['--clipboard', '--input'] },
  // WSL / Windows
  { cmd: 'clip.exe', args: [] },
];

/**
 * Copy text to the system clipboard.
 *
 * Iterates through known clipboard tools until one succeeds. The text is
 * written to the tool's stdin. Returns `true` on success, `false` when no
 * tool is available or the copy fails.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  for (const { cmd, args } of CLIPBOARD_COMMANDS) {
    try {
      const proc = Bun.spawn([cmd, ...args], {
        stdin: 'pipe',
        stdout: 'ignore',
        stderr: 'ignore',
      });

      // Write text to stdin and close
      proc.stdin.write(text);
      proc.stdin.end();

      const exitCode = await proc.exited;
      if (exitCode === 0) {
        log.info(`clipboard: copied ${text.length} chars via ${cmd}`);
        return true;
      }
    } catch {
      // Command not found or failed — try next candidate
      continue;
    }
  }

  log.warn('clipboard: no clipboard tool available');
  return false;
}

// ---------------------------------------------------------------------------
// ClipboardManager — encapsulates auto-copy on selection behavior
// ---------------------------------------------------------------------------

/**
 * ClipboardManager manages auto-copy on text selection with a debounced
 * delay. When text is selected, scheduleAutoCopy() starts a timer; after
 * AUTO_COPY_DELAY_MS the text is copied to the system clipboard.
 *
 * Calling cancelAutoCopy() (e.g. when the selection changes before the
 * timer fires) clears the pending timer without copying.
 */
export class ClipboardManager {
  /** Pending auto-copy timer handle, or null when idle. */
  private _autoCopyTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Schedule an auto-copy of the given text after AUTO_COPY_DELAY_MS.
   *
   * If a previous auto-copy is already pending it is cancelled first,
   * so only the most recent selection is copied.
   *
   * @param text - The selected text to copy to the clipboard
   */
  scheduleAutoCopy(text: string): void {
    this.cancelAutoCopy();

    if (!text) {
      log.info('ClipboardManager.scheduleAutoCopy: empty text, skipping');
      return;
    }

    log.info(`ClipboardManager.scheduleAutoCopy: scheduling in ${AUTO_COPY_DELAY_MS}ms (${text.length} chars)`);

    this._autoCopyTimer = setTimeout(async () => {
      this._autoCopyTimer = null;
      const ok = await copyToClipboard(text);
      if (ok) {
        log.info(`ClipboardManager.scheduleAutoCopy: auto-copied ${text.length} chars`);
      } else {
        log.warn('ClipboardManager.scheduleAutoCopy: auto-copy failed');
      }
    }, AUTO_COPY_DELAY_MS);
  }

  /**
   * Cancel any pending auto-copy timer.
   *
   * Safe to call when no timer is pending (no-op).
   */
  cancelAutoCopy(): void {
    if (this._autoCopyTimer !== null) {
      clearTimeout(this._autoCopyTimer);
      this._autoCopyTimer = null;
      log.info('ClipboardManager.cancelAutoCopy: cancelled pending auto-copy');
    }
  }
}
