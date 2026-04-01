// ANSI string builder and renderer for the double-buffered terminal.
// Converts diff patches (RowPatch[]) into minimal ANSI escape strings.
// Maintains SGR state across calls to emit minimal escape sequences.
// Amp ref: amp-strings.txt:529716 — z_0 Renderer, bJ StringBuilder, WF8 buildSgrDelta, Wu0 colorToSgr

import { Color } from '../core/color.js';
import type { CellStyle, RowPatch, CellHyperlinkValue } from './cell.js';
import { stylesEqual, hyperlinksEqual } from './cell.js';
import type { TerminalCapabilities } from './platform.js';

// ── Escape Sequences ────────────────────────────────────────────
// Amp ref: screen-buffer.md section 8

export const ESC = '\x1b';
export const CSI = '\x1b[';
export const OSC = '\x1b]';
export const ST = '\x1b\\';

// Synchronized output (BSU/ESU) — prevents flicker
// Amp ref: $F8 = W3 + "?2026h", iF8 = W3 + "?2026l"
export const BSU = '\x1b[?2026h';  // Begin Synchronized Update
export const ESU = '\x1b[?2026l';  // End Synchronized Update

// Cursor visibility
// Amp ref: nF8 = CSI + "?25l", lF8 = CSI + "?25h"
export const CURSOR_HIDE = '\x1b[?25l';
export const CURSOR_SHOW = '\x1b[?25h';
export const CURSOR_MOVE = (x: number, y: number): string => `\x1b[${y + 1};${x + 1}H`;  // 1-based
export const CURSOR_SHAPE = (n: number): string => `\x1b[${n} q`;  // DECSCUSR

// Screen
// Amp ref: xF8 = CSI + "?1049h", vF8 = CSI + "?1049l", dF8 = CSI + "2J"
export const ALT_SCREEN_ON = '\x1b[?1049h';
export const ALT_SCREEN_OFF = '\x1b[?1049l';
export const CLEAR_SCREEN = '\x1b[2J';

// SGR (Select Graphic Rendition)
// Amp ref: _u0 = CSI + "0m"
export const SGR_RESET = '\x1b[0m';

// Mouse
// Amp ref: kF8, RF8
export const MOUSE_ON = '\x1b[?1003h\x1b[?1006h';
export const MOUSE_OFF = '\x1b[?1003l\x1b[?1006l';

// Bracketed paste
// Amp ref: yF8 = CSI + "?2004h", oF8 = CSI + "?2004l"
export const BRACKET_PASTE_ON = '\x1b[?2004h';
export const BRACKET_PASTE_OFF = '\x1b[?2004l';

// Hyperlink (OSC 8)
// Amp ref: pF8 = hyperlink open, iF = hyperlink close
export const HYPERLINK_CLOSE = `${OSC}8;;${ST}`;
export function hyperlinkOpen(uri: string, id?: string): string {
  const params = id ? `id=${id}` : '';
  return `${OSC}8;${params};${uri}${ST}`;
}

// ── Terminal Protocol Extensions ──────────────────────────────
// TPRO-01 through TPRO-08: Modern terminal protocol escape sequences

// Kitty Keyboard Protocol (TPRO-01)
// Amp ref: progressive keyboard enhancement mode 5
export const KITTY_KEYBOARD_ON = `${CSI}>5u`;
export const KITTY_KEYBOARD_OFF = `${CSI}<u`;

// ModifyOtherKeys (TPRO-02)
// xterm extended key reporting
export const MODIFY_OTHER_KEYS_ON = `${CSI}>4;1m`;
export const MODIFY_OTHER_KEYS_OFF = `${CSI}>4;0m`;

// Emoji Width Mode (TPRO-03)
// Terminal mode 2027 — consistent emoji width handling
export const EMOJI_WIDTH_ON = `${CSI}?2027h`;
export const EMOJI_WIDTH_OFF = `${CSI}?2027l`;

// In-Band Resize (TPRO-04)
// Terminal mode 2048 — receive resize events as escape sequences
export const IN_BAND_RESIZE_ON = `${CSI}?2048h`;
export const IN_BAND_RESIZE_OFF = `${CSI}?2048l`;

// Progress Bar OSC 9;4 (TPRO-05)
// ConEmu/Windows Terminal/iTerm2 progress indication
export const PROGRESS_BAR_OFF = `${OSC}9;4;0${ST}`;
export const PROGRESS_BAR_INDETERMINATE = `${OSC}9;4;3${ST}`;
export const PROGRESS_BAR_PAUSED = `${OSC}9;4;4${ST}`;

// Window Title OSC 0 (TPRO-06)
export function windowTitle(title: string): string {
  return `${ESC}]0;${title}\x07`;
}

// Mouse Cursor Shape OSC 22 (TPRO-07)
export function mouseShape(name: string): string {
  return `${OSC}22;${name}${ST}`;
}

// Pixel Mouse Mode (TPRO-08)
// SGR-Pixels mouse mode 1016
export const PIXEL_MOUSE_ON = `${CSI}?1016h`;
export const PIXEL_MOUSE_OFF = `${CSI}?1016l`;

// OSC 52 — Clipboard manipulation
// Amp ref: terminal sends OSC 52 to copy selected text to system clipboard
// Format: OSC 52 ; <targets> ; <base64-data> ST
// targets: 'c' = clipboard, 'p' = primary selection
// BEL (\x07) can be used as ST alternative for wider compatibility
export function osc52Copy(text: string, target: string = 'c'): string {
  const encoded = typeof Buffer !== 'undefined'
    ? Buffer.from(text, 'utf8').toString('base64')
    : btoa(text);
  return `${OSC}52;${target};${encoded}\x07`;
}

// ── SGR Attribute Code Constants ────────────────────────────────

const SGR_BOLD_ON = '1';
const SGR_DIM_ON = '2';
const SGR_ITALIC_ON = '3';
const SGR_UNDERLINE_ON = '4';
const SGR_INVERSE_ON = '7';
const SGR_STRIKETHROUGH_ON = '9';

const SGR_BOLD_DIM_OFF = '22';
const SGR_ITALIC_OFF = '23';
const SGR_UNDERLINE_OFF = '24';
const SGR_INVERSE_OFF = '27';
const SGR_STRIKETHROUGH_OFF = '29';

// ── buildSgrDelta ───────────────────────────────────────────────

/**
 * Compute the minimal SGR escape sequence to transition from `prev` to `next` style.
 * Returns an empty string if the styles are identical.
 *
 * Strategy matching Amp's WF8:
 * - If styles are identical, return ''
 * - Check if a full reset (SGR 0) is needed (when removing attributes with shared off-codes)
 * - If reset needed: emit 0 then all of next's attributes
 * - Otherwise: emit only the delta codes
 *
 * Amp ref: WF8 buildSgrDelta — mutates currentState, emits delta codes
 */
export function buildSgrDelta(prev: CellStyle, next: CellStyle, capabilities?: TerminalCapabilities | null): string {
  if (stylesEqual(prev, next)) return '';

  const needsReset = checkNeedsReset(prev, next);
  const codes: string[] = [];

  if (needsReset) {
    codes.push('0');
    // After reset, emit ALL attributes of next
    addColorCodes(codes, undefined, next.fg, true, capabilities);
    addColorCodes(codes, undefined, next.bg, false, capabilities);
    if (next.bold) codes.push(SGR_BOLD_ON);
    if (next.dim) codes.push(SGR_DIM_ON);
    if (next.italic) codes.push(SGR_ITALIC_ON);
    if (next.underline) codes.push(SGR_UNDERLINE_ON);
    if (next.inverse) codes.push(SGR_INVERSE_ON);
    if (next.strikethrough) codes.push(SGR_STRIKETHROUGH_ON);
  } else {
    // Incremental delta: only emit what changed
    addColorCodes(codes, prev.fg, next.fg, true, capabilities);
    addColorCodes(codes, prev.bg, next.bg, false, capabilities);
    addBoolAttrDelta(codes, prev, next);
  }

  if (codes.length === 0) return '';
  return `${CSI}${codes.join(';')}m`;
}

/**
 * Determine if a full SGR reset (code 0) is needed to transition from prev to next.
 *
 * Bold and dim share the off-code (22). If we need to turn off bold but keep dim
 * (or vice versa), we must reset and re-emit all next attributes.
 *
 * Amp ref: WF8 — uses reset when removing bold/dim with the other still set
 */
function checkNeedsReset(prev: CellStyle, next: CellStyle): boolean {
  const prevBold = !!prev.bold;
  const prevDim = !!prev.dim;
  const nextBold = !!next.bold;
  const nextDim = !!next.dim;

  // If turning off bold while dim should stay, or turning off dim while bold should stay
  if ((prevBold && !nextBold && nextDim) || (prevDim && !nextDim && nextBold)) {
    return true;
  }

  return false;
}

/**
 * Add incremental boolean attribute SGR codes for the delta between prev and next.
 *
 * SGR code pairs:
 * - Bold: 1 on, 22 off (also turns off dim)
 * - Dim: 2 on, 22 off (also turns off bold)
 * - Italic: 3 on, 23 off
 * - Underline: 4 on, 24 off
 * - Inverse: 7 on, 27 off
 * - Strikethrough: 9 on, 29 off
 */
function addBoolAttrDelta(codes: string[], prev: CellStyle, next: CellStyle): void {
  // Bold
  if (!!prev.bold !== !!next.bold) {
    if (next.bold) {
      codes.push(SGR_BOLD_ON);
    } else {
      codes.push(SGR_BOLD_DIM_OFF);
      // SGR 22 also turns off dim — re-emit dim if still needed
      if (next.dim) codes.push(SGR_DIM_ON);
    }
  }

  // Dim
  if (!!prev.dim !== !!next.dim) {
    if (next.dim) {
      codes.push(SGR_DIM_ON);
    } else {
      codes.push(SGR_BOLD_DIM_OFF);
      // SGR 22 also turns off bold — re-emit bold if still needed
      if (next.bold) codes.push(SGR_BOLD_ON);
    }
  }

  // Italic
  if (!!prev.italic !== !!next.italic) {
    codes.push(next.italic ? SGR_ITALIC_ON : SGR_ITALIC_OFF);
  }

  // Underline
  if (!!prev.underline !== !!next.underline) {
    codes.push(next.underline ? SGR_UNDERLINE_ON : SGR_UNDERLINE_OFF);
  }

  // Inverse
  if (!!prev.inverse !== !!next.inverse) {
    codes.push(next.inverse ? SGR_INVERSE_ON : SGR_INVERSE_OFF);
  }

  // Strikethrough
  if (!!prev.strikethrough !== !!next.strikethrough) {
    codes.push(next.strikethrough ? SGR_STRIKETHROUGH_ON : SGR_STRIKETHROUGH_OFF);
  }
}

/**
 * Add color SGR codes if the color changed between prev and next.
 * Uses Color.toSgrFg() / toSgrBg() for output.
 * When capabilities are provided and trueColor is false, RGB colors are
 * downconverted to ansi256 before emitting SGR codes.
 * Amp ref: Wu0 colorToSgr
 */
function addColorCodes(
  codes: string[],
  prevColor: Color | undefined,
  nextColor: Color | undefined,
  isFg: boolean,
  capabilities?: TerminalCapabilities | null,
): void {
  // Both undefined — no change
  if (prevColor === nextColor) return;
  if (prevColor !== undefined && nextColor !== undefined && prevColor.equals(nextColor)) return;

  if (nextColor === undefined) {
    // Reset to default
    codes.push(isFg ? '39' : '49');
  } else {
    // Downconvert RGB to ansi256 when terminal doesn't support true color
    let color = nextColor;
    if (capabilities && !capabilities.trueColor && color.mode === 'rgb') {
      color = color.toAnsi256();
    }
    // Emit the color's SGR parameter
    codes.push(isFg ? color.toSgrFg() : color.toSgrBg());
  }
}

// ── CursorState ─────────────────────────────────────────────────

export interface CursorState {
  position: { x: number; y: number } | null;
  visible: boolean;
  shape: number;  // DECSCUSR: 0=defa