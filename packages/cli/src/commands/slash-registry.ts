/**
 * SlashCommandRegistry -- register/dispatch pattern for /slash commands.
 *
 * 逆向: e0R class in amp-cli-reversed/modules/2785_unknown_e0R.js:7-86
 * Amp's registry uses a Map<string, Command> with register/execute.
 * Flitter simplifies: no telemetry, no abort controller, no customFlow.
 */

import type { ThreadSnapshot } from "@flitter/schemas";

/**
 * Context passed to slash command handlers.
 *
 * 逆向: amp's command execute receives a context object with thread handle,
 * config service, editor dispatch, showToast, etc. Flitter passes a simpler
 * subset relevant to CLI mode.
 */
export interface SlashCommandContext {
  threadId: string;
  threadStore: {
    getThreadSnapshot(id: string): ThreadSnapshot | null | undefined;
    setCachedThread(snapshot: ThreadSnapshot, opts?: { scheduleUpload?: boolean }): void;
  };
  threadWorker: {
    runInference(): Promise<void>;
    cancelInference(): void;
  };
  configService: {
    get(): { settings: Record<string, unknown> };
  };
  /** Display a message to the user (e.g., toast or inline) */
  showMessage: (text: string) => void;
  /** Clear the input field */
  clearInput: () => void;
}

/**
 * Slash command definition.
 *
 * 逆向: amp's command object has id, noun, verb, description, execute,
 * aliases, isShown, customFlow. Flitter uses name + description + execute.
 */
export interface SlashCommand {
  /** Command name (without the leading /) */
  name: string;
  /** Alternative names */
  aliases?: string[];
  /** Human-readable description */
  description: string;
  /** Handler: receives args string and context */
  execute: (args: string, context: SlashCommandContext) => Promise<void>;
}

/**
 * SlashCommandRegistry -- simple register/dispatch for /commands.
 *
 * 逆向: e0R (2785_unknown_e0R.js:7-86)
 */
export class SlashCommandRegistry {
  private commands = new Map<string, SlashCommand>();
  private aliasMap = new Map<string, string>();

  register(command: SlashCommand): void {
    this.commands.set(command.name, command);
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliasMap.set(alias, command.name);
      }
    }
  }

  async dispatch(name: string, args: string, context: SlashCommandContext): Promise<boolean> {
    const resolved = this.aliasMap.get(name) ?? name;
    const command = this.commands.get(resolved);
    if (!command) return false;
    await command.execute(args, context);
    return true;
  }

  listCommands(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  has(name: string): boolean {
    const resolved = this.aliasMap.get(name) ?? name;
    return this.commands.has(resolved);
  }
}
