/**
 * @-mention file autocomplete detection and file listing.
 *
 * 逆向: ef class trigger in PZT (1472_tui_components/actions_intents.js)
 * The @ trigger opens a file autocomplete overlay that fuzzy-searches
 * file paths in the workspace.
 */

export interface AtMention {
  /** Index of the @ character in the text */
  triggerIndex: number;
  /** Text typed after @ (the fuzzy search query) */
  query: string;
}

/**
 * Detect an active @-mention at the cursor position.
 * Returns null if the cursor is not inside an @-mention.
 *
 * An @-mention is triggered when:
 * 1. There's an @ preceded by a space or at position 0
 * 2. The cursor is between the @ and the next space (or end of text)
 */
export function detectAtMention(text: string, cursorPosition: number): AtMention | null {
  // Scan backward from cursor to find the @ trigger
  const beforeCursor = text.slice(0, cursorPosition);

  // Find the last @ that could be a trigger
  let atIndex = -1;
  for (let i = beforeCursor.length - 1; i >= 0; i--) {
    if (beforeCursor[i] === "@") {
      // @ must be preceded by a space or be at position 0
      if (i === 0 || beforeCursor[i - 1] === " " || beforeCursor[i - 1] === "\n") {
        atIndex = i;
        break;
      }
      // Otherwise it's an email-like @ — skip
      return null;
    }
    // If we hit a space before finding @, no active trigger
    if (beforeCursor[i] === " " || beforeCursor[i] === "\n") {
      break;
    }
  }

  if (atIndex === -1) return null;

  const query = beforeCursor.slice(atIndex + 1);

  // Query should not contain spaces (that would end the mention)
  if (query.includes(" ")) return null;

  return { triggerIndex: atIndex, query };
}
