/**
 * SlashCommandRegistry -- register/dispatch pattern for /slash commands.
 *
 * 逆向: e0R class in amp-cli-reversed/modules/2785_unknown_e0R.js:7-86
 * Amp's registry uses a Map<string, Command> with register/execute.
 * Flitter simplifies: no telemetry, no abort controller, no customFlow.
 */

import type { SessionTotals } from "@flitter/agent-core";
import type { CompactionResult } from "@flitter/data";
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
    deleteThread(id: string): void;
    setVisibility?(
      threadId: string,
      level: "private" | "public_unlisted" | "public_discoverable" | "thread_workspace_shared",
    ): void;
  };
  threadWorker: {
    runInference(): Promise<void>;
    cancelInference(): void;
    /**
     * Enqueue a user message for processing (used by /queue).
     * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:528-561
     */
    enqueueMessage?(message: {
      role: "user";
      messageId: number;
      content: Array<{ type: "text"; text: string }>;
    }): void;
    /**
     * Dequeue the first buffered message and process it (used by /dequeue).
     * 逆向: amp-cli-reversed/modules/1244_ThreadWorker_ov.js:431-437
     */
    dequeueMessage?(): void;
    /**
     * Access the message queue length (used by /dequeue to check emptiness).
     */
    messageQueueLength?: number;
  };
  configService: {
    get(): { settings: Record<string, unknown> };
    updateSettings?(scope: string, key: string, value: unknown): void;
  };
  /** Display a message to the user (e.g., toast or inline) */
  showMessage: (text: string) => void;
  /** Clear the input field */
  clearInput: () => void;
  /**
   * Whether thinking blocks are currently shown.
   * 逆向: Ut.instance.allExpanded (chunk-006.js:37138)
   */
  showThinkingBlocks?: boolean;
  /**
   * Toggle thinking block visibility.
   * 逆向: Ut.instance.toggleAll() (e0R:830)
   */
  toggleThinkingBlocks?: () => void;

  /**
   * Session cost tracker — accumulated token usage and USD estimates.
   * 逆向: chunk-005.js:66584-66736 (pricing table + cost accumulator)
   */
  costTracker?: {
    getTotals(): SessionTotals;
    getTurnHistory(): Array<{ model?: string; estimatedUSD: number | null }>;
  };

  /**
   * Trigger manual context compaction on the current thread.
   * Returns the CompactionResult (compacted: boolean, tokens before/after).
   * 逆向: amp does compaction automatically; Flitter adds manual /compact.
   */
  compactThread?: () => Promise<CompactionResult>;

  /**
   * Submit text as a new user message (used by /editor to inject edited text).
   * 逆向: amp's openInEditor sets textController.text; Flitter injects as message.
   */
  submitMessage?: (text: string) => void;
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
