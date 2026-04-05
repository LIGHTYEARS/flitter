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
