// Reverse-i-search indicator formatter (I14).
//
// Produces a formatted string for the reverse-i-search mode, similar to
// bash/readline's display:  (reverse-i-search)`query': [current/total]

/**
 * Format a reverse-i-search indicator string.
 *
 * @param query   - The current search query text
 * @param total   - Total number of matches found
 * @param current - 1-based index of the currently highlighted match
 * @returns Formatted indicator string, e.g. "(reverse-i-search)`foo': [2/5]"
 */
export function formatSearchIndicator(
  query: string,
  total: number,
  current: number,
): string {
  return `(reverse-i-search)\`${query}': [${current}/${total}]`;
}
