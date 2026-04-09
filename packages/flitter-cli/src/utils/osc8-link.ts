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

/** A structured hyperlink descriptor for use with TextSpan.hyperlink. */
export interface FileLinkDescriptor {
  readonly text: string;
  readonly uri: string;
}

/**
 * Build a structured file hyperlink descriptor for use with TextSpan.
 *
 * Returns { text, uri } so callers can feed it into TextSpan({ hyperlink: { uri } })
 * instead of embedding raw OSC 8 escape sequences in plain text strings.
 *
 * @param filePath    - Absolute file path to link to.
 * @param displayText - Optional shorter display text (defaults to filePath).
 * @returns A FileLinkDescriptor with display text and file:// URI.
 */
export function fileLink(filePath: string, displayText?: string): FileLinkDescriptor {
  return { text: displayText ?? filePath, uri: `file://${filePath}` };
}
