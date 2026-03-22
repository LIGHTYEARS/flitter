// Terminal cleanup function — comprehensive mode reset on exit.
// Disables ALL terminal modes enabled during the session.
// Amp ref: zG8 terminal cleanup function

import type { Renderer } from './renderer.js';
import {
  KITTY_KEYBOARD_OFF,
  MODIFY_OTHER_KEYS_OFF,
  EMOJI_WIDTH_OFF,
  IN_BAND_RESIZE_OFF,
  PROGRESS_BAR_OFF,
  BRACKET_PASTE_OFF,
  ALT_SCREEN_OFF,
  CURSOR_SHOW,
  SGR_RESET,
  HYPERLINK_CLOSE,
  CSI,
} from './renderer.js';

/**
 * Build a comprehensive cleanup string that disables ALL terminal modes.
 * Used during TerminalManager.dispose() to ensure a clean terminal state.
 *
 * Uses the renderer's disableMouse() method (which disables all mouse
 * tracking modes including 1002, 1003, 1004, 1006, and 1016) rather
 * than the MOUSE_OFF constant (which only covers 1003 and 1006).
 *
 * The order follows Amp's zG8 cleanup pattern:
 * 1. Disable extended keyboard protocols
 * 2. Disable visual/reporting modes
 * 3. Disable mouse modes (via renderer for full coverage)
 * 4. Disable bracketed paste
 * 5. Exit alt screen
 * 6. Reset cursor shape to default
 * 7. Show cursor
 * 8. Reset SGR attributes
 * 9. Close any open hyperlink
 *
 * Amp ref: zG8 terminal cleanup function
 */
export function terminalCleanup(renderer: Renderer): string {
  return (
    // 1. Disable extended keyboard protocols
    KITTY_KEYBOARD_OFF +
    MODIFY_OTHER_KEYS_OFF +
    // 2. Disable visual/reporting modes
    EMOJI_WIDTH_OFF +
    IN_BAND_RESIZE_OFF +
    PROGRESS_BAR_OFF +
    // 3. Disable all mouse modes (renderer.disableMouse includes 1002, 1003, 1004, 1006, 1016)
    renderer.disableMouse() +
    // 4. Disable bracketed paste
    BRACKET_PASTE_OFF +
    // 5. Exit alt screen
    ALT_SCREEN_OFF +
    // 6. Reset cursor shape (DECSCUSR default)
    `${CSI}0 q` +
    // 7. Show cursor
    CURSOR_SHOW +
    // 8. Reset SGR
    SGR_RESET +
    // 9. Close any open hyperlink
    HYPERLINK_CLOSE
  );
}
