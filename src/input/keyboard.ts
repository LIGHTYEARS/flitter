// Logical key constants and keyboard helpers
// Amp ref: input-system.md Section 2 (key name mapping), Section 5.1

import type { KeyEvent } from './events';

/**
 * Logical key names matching Amp TUI conventions.
 * Amp ref: input-system.md Section 5.1
 */
export const LogicalKey = {
  // Arrow keys
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',

  // Function keys
  f1: 'f1',
  f2: 'f2',
  f3: 'f3',
  f4: 'f4',
  f5: 'f5',
  f6: 'f6',
  f7: 'f7',
  f8: 'f8',
  f9: 'f9',
  f10: 'f10',
  f11: 'f11',
  f12: 'f12',

  // Navigation
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Insert: 'Insert',
  Delete: 'Delete',
  Clear: 'Clear',

  // Action keys
  Enter: 'Enter',
  Return: 'Return',
  Tab: 'Tab',
  Escape: 'Escape',
  Backspace: 'Backspace',
  Space: 'Space',
} as const;

export type LogicalKeyName = (typeof LogicalKey)[keyof typeof LogicalKey];

/**
 * Set of key names that are modifier keys.
 * In our system modifiers are flags on the event, not separate key events,
 * but this is useful for filtering.
 */
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta']);

/**
 * Returns true if the key name represents a modifier key.
 */
export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key);
}

/**
 * Maps a character code (0x01-0x1A) to the corresponding letter key name.
 * Control characters 0x01-0x1A map to 'a'-'z'.
 * Amp ref: input-system.md Section 2.7 (line 242044)
 */
export function keyFromCharCode(code: number): string {
  // Special single-byte characters must be checked first
  // (some overlap with control character range 0x01-0x1A)
  switch (code) {
    case 0x0D: return LogicalKey.Enter;   // \r from real terminal Enter key
    case 0x0A: return LogicalKey.Enter;
    case 0x09: return LogicalKey.Tab;
    case 0x08: return LogicalKey.Backspace;
    case 0x7F: return LogicalKey.Backspace;
    case 0x1B: return LogicalKey.Escape;
    case 0x00: return LogicalKey.Space; // ctrl+space sometimes
  }
  // Control characters: 0x01 = ctrl+a, 0x02 = ctrl+b, ..., 0x1A = ctrl+z
  if (code >= 0x01 && code <= 0x1A) {
    return String.fromCharCode(code + 0x60); // 0x01 -> 'a' (0x61)
  }
  // Printable ASCII
  if (code >= 0x20 && code <= 0x7E) {
    return String.fromCharCode(code);
  }
  return String.fromCharCode(code);
}

/**
 * Returns true if the key event represents a printable character.
 * A key is printable if it is a single character and no ctrl/alt/meta modifiers are active.
 * Amp ref: input-system.md Section 2.7 (line 242046)
 */
export function isPrintableKey(event: KeyEvent): boolean {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return false;
  }
  // Single characters that are printable (not named special keys)
  const { key } = event;
  if (key.length === 1) {
    const code = key.charCodeAt(0);
    return code >= 0x20 && code <= 0x7E;
  }
  // Space is printable
  if (key === LogicalKey.Space) {
    return true;
  }
  return false;
}

/**
 * Maps low-level emitKeys key names to our TUI-level key names.
 * Amp ref: input-system.md Section 5.1
 */
export const LOW_LEVEL_TO_TUI_KEY: Record<string, string> = {
  'up': LogicalKey.ArrowUp,
  'down': LogicalKey.ArrowDown,
  'left': LogicalKey.ArrowLeft,
  'right': LogicalKey.ArrowRight,
  'home': LogicalKey.Home,
  'end': LogicalKey.End,
  'pageup': LogicalKey.PageUp,
  'pagedown': LogicalKey.PageDown,
  'insert': LogicalKey.Insert,
  'delete': LogicalKey.Delete,
  'clear': LogicalKey.Clear,
  'enter': LogicalKey.Enter,
  'return': LogicalKey.Return,
  'tab': LogicalKey.Tab,
  'escape': LogicalKey.Escape,
  'backspace': LogicalKey.Backspace,
  'space': LogicalKey.Space,
};
