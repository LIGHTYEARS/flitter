/**
 * Command prefix detection for /slash commands.
 *
 * 逆向: ef class trigger in PZT (1472_tui_components/actions_intents.js)
 * and ZgT help table showing "/" triggers.
 */

export interface CommandInput {
  command: string;
  args: string;
}

/**
 * Parse a slash command from user input.
 * Returns null if the input is not a command.
 */
export function parseCommandInput(text: string): CommandInput | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const withoutSlash = trimmed.slice(1);
  const spaceIndex = withoutSlash.indexOf(" ");

  if (spaceIndex === -1) {
    return { command: withoutSlash, args: "" };
  }

  return {
    command: withoutSlash.slice(0, spaceIndex),
    args: withoutSlash.slice(spaceIndex + 1).trim(),
  };
}
