// clipboard-image.ts — Read image data from system clipboard
//
// Provides platform-specific clipboard image reading for Ctrl+V paste.
// Matches AMP's handleInsertImage / pasteImageFromClipboard pattern.
//
// macOS: uses `pngpaste -` to read PNG data from clipboard
// Linux: uses `xclip -selection clipboard -t image/png -o`
// Windows: not yet supported (returns null)

import { log } from './logger';

/**
 * Image attachment data read from the clipboard.
 * Matches AMP's imageAttachments array element contract.
 */
export interface ClipboardImageData {
  /** Raw image data buffer. */
  readonly data: Buffer;
  /** MIME type of the image (always 'image/png' from clipboard). */
  readonly mimeType: string;
}

/**
 * Read image data from the system clipboard.
 *
 * Uses platform-specific commands:
 * - macOS: `pngpaste -` (outputs PNG to stdout)
 * - Linux: `xclip -selection clipboard -t image/png -o`
 *
 * Returns null if no image is available or the command fails.
 * This is an async operation matching AMP's isUploadingImageAttachments spinner.
 */
export async function readImageFromClipboard(): Promise<ClipboardImageData | null> {
  const platform = process.platform;

  let cmd: string[];
  if (platform === 'darwin') {
    cmd = ['pngpaste', '-'];
  } else if (platform === 'linux') {
    cmd = ['xclip', '-selection', 'clipboard', '-t', 'image/png', '-o'];
  } else {
    log.info('clipboard-image: platform not supported', { platform });
    return null;
  }

  try {
    const proc = Bun.spawn(cmd, {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).arrayBuffer();
    const exitCode = await proc.exited;

    if (exitCode !== 0 || output.byteLength === 0) {
      log.info('clipboard-image: no image in clipboard or command failed', {
        exitCode,
        byteLength: output.byteLength,
      });
      return null;
    }

    const data = Buffer.from(output);

    log.info('clipboard-image: read image from clipboard', {
      byteLength: data.byteLength,
    });

    return {
      data,
      mimeType: 'image/png',
    };
  } catch (err) {
    log.info('clipboard-image: failed to read image', { error: String(err) });
    return null;
  }
}
