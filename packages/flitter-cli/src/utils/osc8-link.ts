// OSC8 terminal hyperlink utility — wraps text in OSC 8 escape sequences.
//
// Terminals supporting OSC 8 render the wrapped text as clickable hyperlinks.
// Unsupported terminals silently ignore the escape sequences and show plain text.
//
// Protocol: \x1b]8;{params};{uri}\x07{display text}\x1b]8;;\x07
//
// References:
//   - https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda
//   - AMP uses this for file path links in tool call headers.
//
// Phase 36 — VPOL-02.

/**
 * Wrap display text in an OSC8 terminal hyperlink escape sequence.
 *
 * @param text  - The visible text the user sees.
 * @param url   - The URL to link to (e.g. file:///path/to/file).
 * @returns The text wrapped in OSC8 open/close sequences.
 */
export function wrapOSC8Link(text: string, url: string): string {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

/**
 * Wrap a file path in an OSC8 `file://` hyperlink.
 *
 * Uses the full absolute file path as the link URL, allowing terminals
 * to open the file in the configured editor when clicked.
 *
 * @param filePath    - Absolute file path to link to.
 * @param displayText - Optional shorter display text (defaults to filePath).
 * @returns The display text wrapped in an OSC8 file:// hyperlink.
 */
export function fileLink(filePath: string, displayText?: string): string {
  const url = `file://${filePath}`;
  return wrapOSC8Link(displayText ?? filePath, url);
}
