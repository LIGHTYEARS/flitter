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
 * Lightweight thread entry used by /switch and /dashboard.
 * Mirrors the essential fields from ThreadEntry in @flitter/data.
 *
 * 逆向: amp's wQ (ThreadContinuationPicker) receives threads with id, title,
 * archived, messageCount — used for display and filtering.
 */
export interface SlashThreadEntry {
  id: string;
  title: string | null;
  messageCount: number;
  userLastInteractedAt: number;
  archived?: boolean;
}

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
    /**
     * Return non-subagent thread entries, optionally including archived.
     * 逆向: azT.observeThreadList({ includeArchived }) — modules/1342:286-295
     * Used by /switch (no args) and /dashboard to list threads.
     */
    observeThreadList?(opts?: { includeArchived?: boolean }): SlashThreadEntry[];
    /**
     * Return thread IDs sorted by most recently interacted, limited to maxCount.
     * 逆向: amp threadService.listLocalThreads() sorts by lastInteracted desc
     * Fallback when observeThreadList is not available.
     */
    listRecentThreadIds?(maxCount: number): string[];
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
    /**
     * Apply a runtime-only override (in-memory, never persisted to disk).
     * 逆向: amp-cli-reversed/modules/1276_unknown_LX.js:11-16
     *   Ms(T, R) { CX.next({ ...CX.getValue(), [T]: R }); }
     * Used by /permissions-enable and /permissions-disable to toggle dangerouslyAllowAll.
     */
    setRuntimeOverride?(key: string, value: unknown): void;
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

  /**
   * Toolbox service — lists discovered toolbox scripts.
   * 逆向: e0R:1353-1362 (toolbox-list command)
   */
  toolboxService?: {
    getTools(): Array<{ name: string; description: string; status: string; error?: string }>;
    getStatus(): { type: string; toolCount?: number };
  };

  /**
   * Skill service — scan/list available skills.
   * 逆向: e0R:1797-1860 (skill-invoke calls R.skillService.getSkills())
   * Amp uses getSkills() async; Flitter's SkillService exposes scan() async + list() sync.
   * We type the minimal surface needed by the slash command.
   */
  skillService?: {
    scan(): Promise<{
      skills: Array<{ name: string; description: string }>;
      errors: Array<{ path: string; error: string }>;
      warnings: string[];
    }>;
    list(): Array<{ name: string; description: string }>;
  };

  /**
   * Thread navigation — back/forward history.
   * 逆向: SrT.navigateBack/navigateForward (2633_unknown_SrT.js:94-121)
   * Amp guards with canNavigateBack/canNavigateForward before calling navigate.
   */
  navigateBack?: () => Promise<void>;
  navigateForward?: () => Promise<void>;
  canNavigateBack?: () => boolean;
  canNavigateForward?: () => boolean;

  /**
   * Switch to an arbitrary thread by ID.
   * 逆向: SrT.switchThread() (2633_unknown_SrT.js:83-87)
   * Used by /parent to jump to the parent thread.
   */
  switchToThread?: (threadId: string) => Promise<void>;

  /**
   * Write text to the system clipboard.
   * 逆向: d9.instance.tuiInstance.clipboard.writeText(a) (e0R:348)
   * Used by /copy-url, /copy-id, /copy-markdown.
   * Returns true on success, false on failure.
   */
  writeClipboard?: (text: string) => Promise<boolean>;

  /**
   * Base URL used to construct thread URLs.
   * 逆向: R.ampURL (e0R:346) — amp uses $P(new URL(R.ampURL), R.thread.id)
   * If absent, /copy-url falls back to showing the raw thread ID.
   */
  appBaseUrl?: string;

  /**
   * MCP server manager for /mcp-reload and /mcp-status.
   * 逆向: R.mcpService.restartServers() (e0R:1326)
   * 逆向: R.showMCPStatusModal() (e0R:1350) — Flitter uses text output instead of modal
   */
  mcpServerManager?: {
    restartServers(): void;
    getServers(): Array<{
      name: string;
      status: "connected" | "connecting" | "disconnected" | "error";
      toolCount?: number;
      error?: string;
    }>;
  };

  /**
   * Context analyzer dependencies for /context-analyze.
   * 逆向: e0R:274-286 (id: "context-analyze", noun: "context", verb: "analyze")
   * 逆向: oFT in 0088_Messages_oFT.js — builds token breakdown using API counting.
   * Flitter uses local approximate token counting (no API calls needed).
   *
   * If absent, /context-analyze uses built-in approximate counting from the
   * thread snapshot. When provided, the modelId and contextWindow from here
   * take precedence over config-based lookups.
   */
  contextAnalyzer?: {
    /** Current model ID (used for display and context window lookup) */
    modelId: string;
    /** Last API-reported input token count (from ContextManager) */
    lastApiInputTokens?: number | null;
  };
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
