// Shortcut matching system — simple key+modifier binding
// Amp ref: input-system.md Section 8.1, amp-strings.txt:530127

import type { KeyEvent } from './events';

/**
 * A shortcut binding describes a key combination.
 * Modifier flags default to false when not specified.
 *
 * Amp ref: input-system.md Section 8.1 — inline comparison pattern
 */
export interface ShortcutBinding {
  /** Logical key name: "ArrowUp", "Enter", "a", "Escape", etc. */
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/**
 * Check whether a KeyEvent matches a ShortcutBinding.
 *
 * All modifier flags in the binding default to false if not specified,
 * so they must be explicitly set to true to require them.
 *
 * Amp ref: input-system.md Section 8.1 matchKey pattern
 */
export function matchesShortcut(event: KeyEvent, binding: ShortcutBinding): boolean {
  return (
    event.key === binding.key &&
    event.ctrlKey === (binding.ctrl ?? false) &&
    event.altKey === (binding.alt ?? false) &&
    event.shiftKey === (binding.shift ?? false) &&
    event.metaKey === (binding.meta ?? false)
  );
}
