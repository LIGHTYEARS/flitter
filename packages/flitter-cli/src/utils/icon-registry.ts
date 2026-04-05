// Centralized icon/symbol registry for TUI rendering (N13).
//
// All visual symbols used across the TUI are defined here.
// Uses ASCII/Unicode symbols only — no emoji.
//
// Production widgets MUST use `icon(name)` or import ICONS for all glyphs.
// Modeled after flitter-amp's icon-registry with semantic dotted names.

export const ICONS = {
  /** Braille spinner frames for animation. */
  spinner: ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'] as const,
  /** Success checkmark. */
  success: '\u2713',
  /** Error cross. */
  error: '\u2717',
  /** Warning sign. */
  warning: '\u26A0',
  /** Info symbol. */
  info: '\u2139',
  /** Right-pointing arrow (single-barb ›). */
  arrow: '\u203A',
  /** Ellipsis. */
  ellipsis: '\u2026',
  /** Gear/settings symbol. */
  gear: '\u2699',
  /** Folder indicator (right-pointing triangle). */
  folder: '\u25B8',
  /** File indicator (small square). */
  file: '\u25AA',
  /** Tool indicator (lightning bolt text). */
  tool: '\u26A1',
  /** Thinking indicator (circle with left half black). */
  thinking: '\u25D0',
  /** Streaming indicator (right-pointing triangle). */
  streaming: '\u25B6',

  // --- Semantic status icons (tool / todo / plan / disclosure) ---

  /** Tool call: completed (checkmark). */
  'tool.status.done': '\u2713',
  /** Tool call: error / failed (cross). */
  'tool.status.error': '\u2715',
  /** Tool call: pending / in-progress placeholder (midline horizontal ellipsis). */
  'tool.status.pending': '\u22EF',

  /** Todo: pending (empty circle). */
  'todo.status.pending': '\u25CB',
  /** Todo: in-progress (circle with left half black). */
  'todo.status.in_progress': '\u25D0',
  /** Todo: completed (black circle). */
  'todo.status.completed': '\u25CF',
  /** Todo: cancelled (empty set). */
  'todo.status.cancelled': '\u2205',

  /** Plan entry: completed (checkmark). */
  'plan.status.completed': '\u2713',
  /** Plan entry: in-progress (black circle). */
  'plan.status.in_progress': '\u25CF',
  /** Plan entry: pending (empty circle). */
  'plan.status.pending': '\u25CB',

  /** Disclosure triangle: collapsed (right-pointing triangle). */
  'disclosure.collapsed': '\u25B6',
  /** Disclosure triangle: expanded (down-pointing triangle). */
  'disclosure.expanded': '\u25BC',

  /** Right arrow (full arrow →). */
  'arrow.right': '\u2192',

  /** Filled circle (used by handoff blink indicator). */
  'status.active': '\u25CF',
  /** Warning indicator (exclamation mark). */
  'status.warning': '!',
  /** Processing indicator (midline horizontal ellipsis). */
  'status.processing': '\u22EF',

  /** Density orb: compact (filled diamond). */
  'density.compact': '\u25C6',
  /** Density orb: normal (outline diamond). */
  'density.normal': '\u25C7',
  /** Density orb: comfortable (empty circle). */
  'density.comfortable': '\u25CB',
} as const;

/** All valid icon names (keys of the ICONS registry). */
export type IconName = keyof typeof ICONS;

/**
 * Look up a single icon glyph by semantic name.
 *
 * Throws at runtime if `name` is not a valid registry key, keeping
 * the registry exhaustive.  For spinner frames use `ICONS.spinner` directly.
 *
 * @example
 *   icon('tool.status.done')   // '✓'
 *   icon('arrow.right')        // '→'
 */
export function icon(name: IconName): string {
  const value = ICONS[name];
  // Spinner is an array — callers wanting frames should use ICONS.spinner.
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
