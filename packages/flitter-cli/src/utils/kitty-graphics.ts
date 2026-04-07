// kitty-graphics.ts — Kitty graphics protocol support for terminal image rendering
//
// Implements the Kitty terminal graphics protocol (APC-based) for displaying
// images natively in supported terminals. Matches AMP's kittyGraphics module
// with supportsKittyGraphics(), transmitImage(), and clearImage().
//
// Protocol specification: https://sw.kovidgoyal.net/kitty/graphics-protocol/
//
// The protocol works by sending base64-encoded image data in chunks via
// APC (Application Program Command) escape sequences. Each chunk is
// limited to 4096 bytes of base64 data.

import { log } from './logger';

/** Maximum bytes of base64 data per chunk (Kitty protocol limit). */
const CHUNK_SIZE = 4096;

/** Auto-incrementing image ID counter for unique image identification. */
let nextImageId = 1;

/**
 * Detect whether the current terminal supports the Kitty graphics protocol.
 *
 * Checks TERM_PROGRAM environment variable for known Kitty-compatible terminals.
 * Matches AMP's supportsKittyGraphics() function.
 */
export function supportsKittyGraphics(): boolean {
  const termProgram = process.env.TERM_PROGRAM ?? '';
  const term = process.env.TERM ?? '';

  // Kitty terminal
  if (termProgram === 'kitty' || term.includes('kitty')) return true;

  // WezTerm supports Kitty graphics protocol
  if (termProgram === 'WezTerm') return true;

  // Ghostty supports Kitty graphics protocol
  if (termProgram === 'ghostty') return true;

  return false;
}

/**
 * Allocate a unique image ID for Kitty graphics protocol transmission.
 */
export function allocateImageId(): number {
  return nextImageId++;
}

/**
 * Options for transmitting an image via Kitty graphics protocol.
 */
export interface TransmitImageOpts {
  /** Number of terminal columns for the image width. */
  columns?: number;
  /** Number of terminal rows for the image height. */
  rows?: number;
}

/**
 * Encode image data as Kitty graphics protocol escape sequences for transmission.
 *
 * The image data is base64-encoded and split into chunks of CHUNK_SIZE bytes.
 * Each chunk is wrapped in an APC escape sequence with appropriate control
 * parameters (action=transmit, format=PNG, more flag for continuation).
 *
 * @param imageId - Unique image identifier from allocateImageId()
 * @param data - Raw image data (PNG format)
 * @param opts - Optional display dimensions in terminal cells
 * @returns String of escape sequences to write to stdout
 */
export function transmitImage(
  imageId: number,
  data: Buffer,
  opts: TransmitImageOpts = {},
): string {
  const b64 = data.toString('base64');
  const chunks: string[] = [];

  // Split base64 data into chunks
  for (let i = 0; i < b64.length; i += CHUNK_SIZE) {
    chunks.push(b64.slice(i, i + CHUNK_SIZE));
  }

  if (chunks.length === 0) {
    log.info('kitty-graphics: empty image data, skipping transmission');
    return '';
  }

  const result: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const isFirst = i === 0;
    const isLast = i === chunks.length - 1;
    const chunk = chunks[i];
    const more = isLast ? 0 : 1;

    // Build control parameters
    let ctrl: string;
    if (isFirst) {
      // First chunk: action=transmit(T), format=PNG(f=100), image ID
      const parts = [`a=T`, `f=100`, `i=${imageId}`];
      if (opts.columns !== undefined) parts.push(`c=${opts.columns}`);
      if (opts.rows !== undefined) parts.push(`r=${opts.rows}`);
      parts.push(`m=${more}`);
      ctrl = parts.join(',');
    } else {
      // Continuation chunks: just more flag
      ctrl = `m=${more}`;
    }

    // APC sequence: ESC _ G <ctrl> ; <payload> ESC \
    result.push(`\x1b_G${ctrl};${chunk}\x1b\\`);
  }

  log.info('kitty-graphics: transmitImage', {
    imageId,
    dataBytes: data.byteLength,
    chunks: chunks.length,
  });

  return result.join('');
}

/**
 * Generate the escape sequence to clear a previously transmitted image.
 *
 * @param imageId - The image ID to clear
 * @returns Escape sequence string to write to stdout
 */
export function clearImage(imageId: number): string {
  // action=delete(d), delete by image ID(d=I), image ID
  return `\x1b_Ga=d,d=I,i=${imageId}\x1b\\`;
}
