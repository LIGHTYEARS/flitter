/**
 * Shared truncation constants for tool-call renderers.
 *
 * All output display truncation across tool widgets should reference these
 * constants rather than using hard-coded numeric literals. This ensures
 * consistent behavior, makes limits discoverable, and provides a single
 * place to adjust thresholds globally.
 *
 * The tier system is organized by display context:
 *
 *   HEADER  -- Single-line details shown in the collapsed tool header.
 *              Kept short because it shares a line with the tool name and
 *              status indicator.
 *
 *   INPUT   -- Key-value input parameter summaries. Slightly longer than
 *              header since these appear in the expanded body, but still
 *              compact to avoid overwhelming the tool card.
 *
 *   PREVIEW -- Content previews for file creation, fallback summaries,
 *              and secondary output. A middle ground between input
 *              summaries and full output.
 *
 *   OUTPUT  -- Primary tool output (stdout, search results, file content).
 *              This is the main content area and gets the most space.
 */

// ---------------------------------------------------------------------------
// Character limits by display tier
// ---------------------------------------------------------------------------

/** Maximum characters for single-line header detail strings. */
export const HEADER_TRUNCATION_LIMIT = 80;

/** Maximum characters for input parameter value summaries. */
export const INPUT_TRUNCATION_LIMIT = 120;

/** Maximum characters for content previews and fallback summaries. */
export const PREVIEW_TRUNCATION_LIMIT = 500;

/** Maximum characters for primary tool output bodies. */
export const OUTPUT_TRUNCATION_LIMIT = 2000;

// ---------------------------------------------------------------------------
// Item count limits
// ---------------------------------------------------------------------------

/** Maximum number of links/items to display in list-oriented tools. */
export const MAX_DISPLAY_ITEMS = 10;

// ---------------------------------------------------------------------------
// Truncation suffixes
// ---------------------------------------------------------------------------

/**
 * Suffix appended to truncated output bodies.
 * Includes a leading newline so the marker appears on its own line.
 */
export const TRUNCATION_SUFFIX = '\n\u2026(truncated)';

/**
 * Suffix appended to truncated single-line strings (headers, input values).
 * Uses a bare ellipsis to keep inline text compact.
 */
export const INLINE_TRUNCATION_SUFFIX = '\u2026';

// ---------------------------------------------------------------------------
// Truncation helpers
// ---------------------------------------------------------------------------

/**
 * Truncates a string to `maxLength` characters, appending `suffix` if
 * the string was truncated. Returns the original string unmodified when
 * it fits within the limit.
 *
 * @param text      - The string to potentially truncate.
 * @param maxLength - Maximum character count before truncation.
 *                    Defaults to OUTPUT_TRUNCATION_LIMIT (2000).
 * @param suffix    - Suffix to append when truncated.
 *                    Defaults to TRUNCATION_SUFFIX.
 * @returns The original string, or the truncated string with suffix appended.
 */
export function truncateText(
  text: string,
  maxLength: number = OUTPUT_TRUNCATION_LIMIT,
  suffix: string = TRUNCATION_SUFFIX,
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + suffix;
}

/**
 * Truncates a single-line string for inline display (headers, input values).
 * Uses the compact ellipsis suffix by default.
 *
 * @param text      - The string to potentially truncate.
 * @param maxLength - Maximum character count. Defaults to INPUT_TRUNCATION_LIMIT.
 * @returns The original or truncated string.
 */
export function truncateInline(
  text: string,
  maxLength: number = INPUT_TRUNCATION_LIMIT,
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + INLINE_TRUNCATION_SUFFIX;
}
