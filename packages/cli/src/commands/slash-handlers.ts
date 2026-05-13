/**
 * Built-in slash command handlers.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:192-1560
 * (registerCommands with all built-in commands)
 *
 * Flitter implements 33 slash commands matching amp's command palette.
 * Original 6: /help, /clear, /compact, /cost, /model, /status
 * Added 27: /new, /switch, /dashboard, /delete, /archive, /mode,
 *           /settings, /theme, /mcp, /tasks, /quit, /rename,
 *           /visibility, /refresh, /editor, /history, /label,
 *           /permissions, /permissions-enable, /permissions-disable,
 *           /plugins, /handoff, /queue, /dequeue,
 *           /toggle-thinking-blocks, /context-analyze, /debug,
 *           /toggle-deep-reasoning
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { countMessageTokens } from "@flitter/data";
import { MODEL_REGISTRY } from "@flitter/llm";
import type { ThreadSnapshot } from "@flitter/schemas";
import type {
  SlashCommandContext,
  SlashCommandRegistry,
  SlashThreadEntry,
} from "./slash-registry.js";

// ─── Helpers for /switch and /dashboard ─────────────────

/**
 * Build the shareable thread URL from context.
 *
 * 逆向: e0R:346 — $P(new URL(R.ampURL), R.thread.id).toString()
 */
function buildThreadUrl(ctx: SlashCommandContext): string {
  const base = ctx.appBaseUrl ?? "https://app.ampcode.com/thread";
  return `${base.replace(/\/$/, "")}/${ctx.threadId}`;
}

/**
 * Get the thread list from context, using observeThreadList if available,
 * falling back to listRecentThreadIds + getThreadSnapshot.
 *
 * 逆向: e0R:226 — R.threads.filter(c => !c.archived)
 * Amp filters non-archived threads; we respect the includeArchived option.
 */
function getThreadList(
  ctx: SlashCommandContext,
  opts?: { includeArchived?: boolean },
): SlashThreadEntry[] {
  // Prefer observeThreadList (provides full entry data)
  if (ctx.threadStore.observeThreadList) {
    return ctx.threadStore.observeThreadList(opts);
  }

  // Fallback: use listRecentThreadIds + getThreadSnapshot to build entries
  if (ctx.threadStore.listRecentThreadIds) {
    const ids = ctx.threadStore.listRecentThreadIds(50);
    const entries: SlashThreadEntry[] = [];
    for (const id of ids) {
      const snap = ctx.threadStore.getThreadSnapshot(id);
      if (!snap) continue;
      const ext = snap as ThreadSnapshot & { archived?: boolean; created?: number };
      if (!opts?.includeArchived && ext.archived) continue;
      entries.push({
        id: snap.id,
        title: snap.title ?? null,
        messageCount: snap.messages?.length ?? 0,
        userLastInteractedAt: ext.created ?? 0,
        archived: ext.archived,
      });
    }
    return entries;
  }

  // Last resort: no thread listing available
  return [];
}

/**
 * Format a timestamp as a human-readable relative time string.
 * E.g., "2m ago", "3h ago", "5d ago".
 */
function formatRelativeTime(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return "";
  const diff = Date.now() - timestamp;
  if (diff < 0) return "just now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Register all built-in slash commands on the given registry.
 *
 * 逆向: e0R.registerCommands() (2785_unknown_e0R.js:192)
 */
export function createBuiltinCommands(registry: SlashCommandRegistry): void {
  // /help -- show available commands
  // 逆向: e0R:1528-1534 (id: "help", verb: "help", execute: R.openHelp())
  registry.register({
    name: "help",
    aliases: ["?", "h"],
    description: "Show available slash commands",
    execute: async (_args, ctx) => {
      const commands = registry.listCommands();
      const lines = commands.map((c) => `  /${c.name} — ${c.description}`);
      ctx.showMessage("Available commands:\n" + lines.join("\n"));
    },
  });

  // /clear -- clear conversation (reset thread messages)
  // 逆向: e0R:918-926 (id: "clear", verb: "clear"). Amp clears the editor input.
  // Flitter interprets /clear as clearing the conversation history, which is more
  // useful in a CLI context. The thread snapshot is reset to empty messages.
  registry.register({
    name: "clear",
    description: "Clear conversation history",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (snapshot) {
        // biome-ignore lint/suspicious/noExplicitAny: spreading snapshot with override - type-safe at runtime
        ctx.threadStore.setCachedThread({ ...snapshot, messages: [] } as any, {
          scheduleUpload: true,
        });
      }
      ctx.showMessage("Conversation cleared.");
    },
  });

  // /compact -- manually trigger context compaction
  // Note: amp does not have a direct /compact command. Compaction is automatic.
  // Flitter adds manual trigger for user control.
  registry.register({
    name: "compact",
    description: "Manually trigger context compaction",
    execute: async (_args, ctx) => {
      if (!ctx.compactThread) {
        ctx.showMessage(
          "Manual compaction is not available in this session.\n" +
            "Compaction runs automatically when context nears the model's limit.",
        );
        return;
      }
      ctx.showMessage("Compacting...");
      const result = await ctx.compactThread();
      if (result.compacted) {
        ctx.showMessage(
          `Compaction complete.\n` +
            `  Tokens before: ${result.tokensBefore.toLocaleString()}\n` +
            `  Tokens after:  ${result.tokensAfter.toLocaleString()}\n` +
            `  Reduced by:    ${(result.tokensBefore - result.tokensAfter).toLocaleString()} tokens`,
        );
      } else {
        ctx.showMessage(
          `No compaction needed.\n` +
            `  Current tokens: ${result.tokensBefore.toLocaleString()}\n` +
            `  (Below compaction threshold or too few messages)`,
        );
      }
    },
  });

  // /cost -- show session cost
  // 逆向: e0R:1508-1517 (show-costs toggles debug cost display)
  // 逆向: chunk-005.js:66584 xrT() formats costBreakdown with AP()
  // Flitter: display accumulated session cost from SessionCostTracker.
  registry.register({
    name: "cost",
    description: "Show session cost summary",
    execute: async (_args, ctx) => {
      if (!ctx.costTracker) {
        ctx.showMessage("Session cost tracking is not available in this session.");
        return;
      }
      const totals = ctx.costTracker.getTotals();
      const turns = ctx.costTracker.getTurnHistory();
      const costStr =
        totals.estimatedUSD !== null
          ? `$${totals.estimatedUSD.toFixed(4)}`
          : "unknown (model pricing unavailable)";
      ctx.showMessage(
        `Session Cost Summary (${turns.length} turns)\n` +
          `──────────────────────────────\n` +
          `  Input tokens:       ${totals.inputTokens.toLocaleString()}\n` +
          `  Output tokens:      ${totals.outputTokens.toLocaleString()}\n` +
          `  Cache write tokens: ${totals.cacheCreationInputTokens.toLocaleString()}\n` +
          `  Cache read tokens:  ${totals.cacheReadInputTokens.toLocaleString()}\n` +
          `  Estimated cost:     ${costStr}`,
      );
    },
  });

  // /model -- show/switch model
  // 逆向: e0R:1483-1506 (model-selector shows explanation modal)
  // Flitter: show current model, switch via /model <name>
  registry.register({
    name: "model",
    description: "Show current model or switch model",
    execute: async (args, ctx) => {
      const config = ctx.configService.get();
      const currentModel =
        (config.settings["internal.model"] as string) ?? "claude-sonnet-4-20250514";
      if (!args.trim()) {
        const modelInfo = MODEL_REGISTRY[currentModel];
        const contextStr = modelInfo
          ? ` (${modelInfo.provider}, ${(modelInfo.contextWindow / 1000).toFixed(0)}K context)`
          : "";
        ctx.showMessage(`Current model: ${currentModel}${contextStr}`);
        return;
      }

      const requested = args.trim();
      // Validate against MODEL_REGISTRY
      if (!MODEL_REGISTRY[requested]) {
        // Try partial match (e.g., "sonnet" → "claude-sonnet-4-20250514")
        const matches = Object.keys(MODEL_REGISTRY).filter((id) =>
          id.toLowerCase().includes(requested.toLowerCase()),
        );
        if (matches.length === 1) {
          // Unique partial match — use it
          const resolved = matches[0]!;
          if (ctx.configService.updateSettings) {
            ctx.configService.updateSettings("global", "internal.model", resolved);
            ctx.showMessage(`Model switched to: ${resolved}`);
          } else {
            ctx.showMessage(
              `Model resolved to: ${resolved}\n` +
                "(Config updates not available in this session.)",
            );
          }
          return;
        }
        if (matches.length > 1) {
          ctx.showMessage(
            `Ambiguous model name "${requested}". Matches:\n` +
              matches.map((m) => `  ${m}`).join("\n"),
          );
          return;
        }
        ctx.showMessage(
          `Unknown model: "${requested}"\n` +
            `Use a model ID from the registry (e.g., claude-sonnet-4-20250514, gpt-4o).`,
        );
        return;
      }

      // Exact match
      if (ctx.configService.updateSettings) {
        ctx.configService.updateSettings("global", "internal.model", requested);
        ctx.showMessage(`Model switched to: ${requested}`);
      } else {
        ctx.showMessage(
          `Model validated: ${requested}\n` + "(Config updates not available in this session.)",
        );
      }
    },
  });

  // /status -- show thread and session status
  // 逆向: e0R:1345-1351 (mcp-status shows MCP connection status)
  // Flitter: show thread ID, message count, model, inference state.
  registry.register({
    name: "status",
    description: "Show thread and session status",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      const messageCount = snapshot?.messages?.length ?? 0;
      const config = ctx.configService.get();
      const model = (config.settings["internal.model"] as string) ?? "unknown";
      ctx.showMessage(
        `Thread: ${ctx.threadId}\n` +
          `Messages: ${messageCount} messages\n` +
          `Model: ${model}\n` +
          `Title: ${snapshot?.title ?? "(none)"}`,
      );
    },
  });

  // ─── Thread Commands ────────────────────────────────────

  // /new -- start new thread
  // 逆向: e0R:193-201 (id: "new", noun: "thread", verb: "new")
  // amp calls R.createThread() which creates a new empty thread.
  // Flitter: create via threadStore.setCachedThread with fresh UUID.
  registry.register({
    name: "new",
    aliases: ["start"],
    description: "Start a new thread",
    execute: async (_args, ctx) => {
      const newId = crypto.randomUUID();
      ctx.threadStore.setCachedThread(
        {
          id: newId,
          v: 0,
          messages: [],
          relationships: [],
          created: Date.now(),
        } as unknown as ThreadSnapshot,
        { scheduleUpload: true },
      );
      ctx.showMessage(
        `New thread created: ${newId}\nUse /switch ${newId} or run: flitter --thread-id ${newId}`,
      );
      // 逆向: amp's /new calls R.switchToThread(newId) after creation
      if (ctx.switchToThread) {
        await ctx.switchToThread(newId);
      }
    },
  });

  // /switch -- switch to existing thread
  // 逆向: e0R:202-244 (id: "continue", noun: "thread", verb: "switch")
  // customFlow: shows wQ (ThreadContinuationPicker) with R.threads.filter(c => !c.archived)
  // execute: async (R, a, e) => { await R.switchToThread(e); }
  registry.register({
    name: "switch",
    aliases: ["continue"],
    description: "Switch to an existing thread",
    execute: async (args, ctx) => {
      const query = args.trim();

      if (!query) {
        // No args: list recent non-archived threads
        // 逆向: e0R:226 — R.threads.filter(c => !c.archived)
        // 逆向: wQ shows these threads in a picker with title "Select a thread"
        const threads = getThreadList(ctx);
        if (threads.length === 0) {
          ctx.showMessage("No threads found. Use /new to create a thread.");
          return;
        }

        const lines: string[] = ["Select a thread:\n"];
        for (const t of threads) {
          const title = t.title ?? "(untitled)";
          const age = formatRelativeTime(t.userLastInteractedAt);
          const current = t.id === ctx.threadId ? " (current)" : "";
          lines.push(`  ${t.id.slice(0, 8)}  ${title}  ${age}  ${t.messageCount} msgs${current}`);
        }
        lines.push("\nUse /switch <thread-id> to switch.");
        ctx.showMessage(lines.join("\n"));
        return;
      }

      // With args: search for matching thread and switch to it
      // 逆向: e0R:242-244 — execute: async (R, a, e) => { await R.switchToThread(e); }
      const threads = getThreadList(ctx);

      // Try exact ID match first (full or prefix)
      let match = threads.find((t) => t.id === query);
      if (!match) {
        match = threads.find((t) => t.id.startsWith(query));
      }
      // Then try title substring match (case-insensitive)
      if (!match) {
        const queryLower = query.toLowerCase();
        const titleMatches = threads.filter((t) => t.title?.toLowerCase().includes(queryLower));
        if (titleMatches.length === 1) {
          match = titleMatches[0];
        } else if (titleMatches.length > 1) {
          const lines = titleMatches.map(
            (t) => `  ${t.id.slice(0, 8)}  ${t.title ?? "(untitled)"}`,
          );
          ctx.showMessage(
            `Multiple threads match "${query}":\n${lines.join("\n")}\n\nUse a more specific query or thread ID.`,
          );
          return;
        }
      }

      if (!match) {
        ctx.showMessage(`No thread found matching "${query}".`);
        return;
      }

      if (match.id === ctx.threadId) {
        ctx.showMessage(
          `Already on thread ${match.id.slice(0, 8)} (${match.title ?? "untitled"}).`,
        );
        return;
      }

      if (ctx.switchToThread) {
        try {
          await ctx.switchToThread(match.id);
          ctx.showMessage(
            `Switched to thread: ${match.id.slice(0, 8)} (${match.title ?? "untitled"})`,
          );
        } catch (err) {
          // 逆向: e0R:218-223 — J.error("Failed to switch thread from command palette", ...)
          const msg = err instanceof Error ? err.message : "Unknown error";
          ctx.showMessage(`Failed to switch thread: ${msg}`);
        }
      } else {
        ctx.showMessage(
          `Thread found: ${match.id} (${match.title ?? "untitled"})\n` +
            "(Thread switching not available — use 'flitter --thread-id' to open it.)",
        );
      }
    },
  });

  // /dashboard -- thread overview / workspace stats
  // 逆向: e0R:202-244 (continue command's customFlow uses thread picker wQ)
  // Amp's "continue" customFlow shows thread list with stats.
  // Flitter's /dashboard shows a text-based summary of workspace state.
  registry.register({
    name: "dashboard",
    aliases: ["dash", "threads"],
    description: "Open interactive thread dashboard",
    execute: async (_args, ctx) => {
      const threads = getThreadList(ctx, { includeArchived: true });
      const active = threads.filter((t) => !t.archived);
      const archived = threads.filter((t) => t.archived);
      const totalMessages = threads.reduce((sum, t) => sum + t.messageCount, 0);

      const config = ctx.configService.get();
      const model = (config.settings["internal.model"] as string) ?? "unknown";
      const agentMode =
        (config.settings["experimental.agentMode"] as string) ??
        (config.settings["agent.mode"] as string) ??
        "smart";
      const workspace = process.cwd();

      // Session token info (if available)
      let tokenLine = "";
      if (ctx.costTracker) {
        const totals = ctx.costTracker.getTotals();
        const costStr = totals.estimatedUSD !== null ? ` ($${totals.estimatedUSD.toFixed(4)})` : "";
        tokenLine = `  Session tokens:  ${(totals.inputTokens + totals.outputTokens).toLocaleString()}${costStr}\n`;
      }

      // Current thread info
      const currentSnapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      const currentTitle = currentSnapshot?.title ?? "(untitled)";
      const currentMsgCount = currentSnapshot?.messages?.length ?? 0;

      // Recent threads list (up to 5)
      const recentLines: string[] = [];
      const recentThreads = active.slice(0, 5);
      for (const t of recentThreads) {
        const title = t.title ?? "(untitled)";
        const age = formatRelativeTime(t.userLastInteractedAt);
        const current = t.id === ctx.threadId ? " *" : "";
        recentLines.push(`  ${t.id.slice(0, 8)}  ${title}  ${age}${current}`);
      }

      ctx.showMessage(
        `Workspace Dashboard\n` +
          `${"─".repeat(40)}\n` +
          `  Workspace:       ${workspace}\n` +
          `  Model:           ${model}\n` +
          `  Mode:            ${agentMode}\n` +
          `  Current thread:  ${currentTitle} (${currentMsgCount} msgs)\n` +
          tokenLine +
          `${"─".repeat(40)}\n` +
          `  Threads: ${active.length} active, ${archived.length} archived\n` +
          `  Total messages:  ${totalMessages}\n` +
          (recentLines.length > 0
            ? `${"─".repeat(40)}\n` + `  Recent threads:\n${recentLines.join("\n")}`
            : ""),
      );
    },
  });

  // /delete -- delete current thread
  // 逆向: no direct e0R command; amp has archive (e0R:437-445)
  // Flitter: actually perform deletion via threadStore.deleteThread
  registry.register({
    name: "delete",
    description: "Delete the current thread",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("Error: Could not load current thread snapshot.");
        return;
      }
      ctx.threadStore.deleteThread(ctx.threadId);
      ctx.showMessage(`Thread ${ctx.threadId} deleted.`);
    },
  });

  // /archive -- archive current thread
  // 逆向: e0R:437-445 (id: "archive", noun: "thread", verb: "archive and exit")
  registry.register({
    name: "archive",
    description: "Archive the current thread",
    execute: async (_args, ctx) => {
      // 逆向: handleThreadsArchive in threads.ts — setCachedThread with archived: true
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("Error: Could not load current thread snapshot.");
        return;
      }
      const updated = { ...snapshot, archived: true } as ThreadSnapshot;
      ctx.threadStore.setCachedThread(updated, { scheduleUpload: true });
      ctx.showMessage(`Thread ${ctx.threadId} archived.`);
    },
  });

  // ─── Mode Commands ──────────────────────────────────────

  // /mode -- show/set agent mode
  // 逆向: e0R:1364-1418 (id: "set-agent-mode", noun: "mode", verb: "set")
  // Also: e0R:1480 (M0T.forEach → createAgentModeCommand per mode)
  registry.register({
    name: "mode",
    description: "Show current mode or switch mode (smart/fast/deep/auto)",
    execute: async (args, ctx) => {
      const config = ctx.configService.get();
      const currentMode =
        (config.settings["experimental.agentMode"] as string) ??
        (config.settings["agent.mode"] as string) ??
        "smart";

      if (!args.trim()) {
        ctx.showMessage(
          `Current mode: ${currentMode}\n` +
            "Available modes: smart, fast, deep, auto\n" +
            "Use /mode <name> to switch.",
        );
        return;
      }

      const validModes = ["smart", "fast", "deep", "auto"];
      const requested = args.trim().toLowerCase();
      if (!validModes.includes(requested)) {
        ctx.showMessage(`Unknown mode: "${requested}"\nValid modes: ${validModes.join(", ")}`);
        return;
      }

      // 逆向: e0R:1364-1418 — amp calls agentModeController.setMode(requested)
      // Persist to config and apply as runtime override
      if (ctx.configService.setRuntimeOverride) {
        ctx.configService.setRuntimeOverride("agent.mode", requested);
      }
      if (ctx.configService.updateSettings) {
        ctx.configService.updateSettings("global", "agent.mode", requested);
      }
      ctx.showMessage(`Mode switched to: ${requested}`);
    },
  });

  // ─── Settings Commands ──────────────────────────────────

  // /settings -- open settings
  // 逆向: e0R:1141-1147 (id: "settings", noun: "settings", verb: "open in editor")
  registry.register({
    name: "settings",
    description: "Show settings info or open settings in $EDITOR",
    execute: async (_args, ctx) => {
      ctx.showMessage(
        "Settings management:\n" +
          "  flitter config list           — view all settings\n" +
          "  flitter config get <key>      — get a specific setting\n" +
          "  flitter config set <key> <v>  — set a setting",
      );
    },
  });

  // /theme -- switch theme
  // 逆向: e0R:1419-1479 (id: "set-theme", noun: "theme", verb: "switch")
  registry.register({
    name: "theme",
    description: "Switch terminal theme",
    execute: async (args, ctx) => {
      if (!args.trim()) {
        const config = ctx.configService.get();
        const currentTheme = (config.settings["terminal.theme"] as string) ?? "default";
        ctx.showMessage(
          `Current theme: ${currentTheme}\n` +
            "Use /theme <name> to switch, or 'flitter config set terminal.theme <name>'.",
        );
      } else {
        ctx.showMessage(
          `Theme switch to "${args.trim()}" requested.\n` +
            `Use 'flitter config set terminal.theme ${args.trim()}' for persistent change.`,
        );
      }
    },
  });

  // ─── MCP Commands ───────────────────────────────────────

  // /mcp -- list MCP servers and tools
  // 逆向: e0R:1193-1319 (id: "mcp-list-tools", noun: "mcp", verb: "list tools")
  registry.register({
    name: "mcp",
    aliases: ["mcp-list"],
    description: "List MCP servers and their tools",
    execute: async (args, ctx) => {
      const subcmd = args.trim().toLowerCase();
      if (subcmd === "reload") {
        ctx.showMessage(
          "MCP server reload requested.\n(Use 'flitter mcp doctor' for diagnostics.)",
        );
        return;
      }
      ctx.showMessage(
        "MCP server management:\n" +
          "  flitter mcp list     — list configured servers\n" +
          "  flitter mcp add      — add a server\n" +
          "  flitter mcp remove   — remove a server\n" +
          "  flitter mcp doctor   — diagnose connections\n" +
          "  /mcp reload          — reload all servers",
      );
    },
  });

  // ─── Task Commands ──────────────────────────────────────

  // /tasks -- list/pick tasks
  // 逆向: e0R:1863-2056 (id: "task-pick", noun: "task", verb: "pick")
  registry.register({
    name: "tasks",
    aliases: ["task"],
    description: "List or pick a task to work on",
    execute: async (_args, ctx) => {
      ctx.showMessage(
        "Task picker requested.\n" +
          "(Task integration is available when connected to a task management system.)",
      );
    },
  });

  // ─── Screen Commands ────────────────────────────────────

  // /quit -- exit application
  // 逆向: e0R:1535-1546 (id: "quit", noun: "amp", verb: "quit", aliases: ["exit"])
  registry.register({
    name: "quit",
    aliases: ["exit", "q"],
    description: "Exit the application",
    execute: async (_args, _ctx) => {
      // 逆向: d9.instance.stop() in chunk-006.js:36707-36715
      // Stops the TUI framework, which resolves the runApp() promise
      // and triggers cleanup in interactive.ts's finally block.
      const { WidgetsBinding } = await import("@flitter/tui");
      WidgetsBinding.instance.stop();
    },
  });

  // /refresh -- refresh screen
  // 逆向: e0R:1518-1526 (id: "refresh", noun: "screen", verb: "refresh")
  // 逆向: d9.instance.tuiInstance.getScreen().markForRefresh(), k8.instance.requestFrame()
  registry.register({
    name: "refresh",
    description: "Refresh the screen display",
    execute: async (_args, _ctx) => {
      const { WidgetsBinding } = await import("@flitter/tui");
      const binding = WidgetsBinding.instance;
      binding.tui.getScreen().needsFullRefresh = true;
      binding.frameScheduler.requestFrame();
    },
  });

  // ─── Additional Commands from amp's e0R ─────────────────

  // /rename -- rename thread title
  // 逆向: e0R:406-436 (id: "rename", noun: "thread", verb: "rename")
  registry.register({
    name: "rename",
    description: "Rename the current thread title",
    execute: async (args, ctx) => {
      const newTitle = args.trim();
      if (!newTitle) {
        ctx.showMessage("Usage: /rename <new title>");
        return;
      }
      if (newTitle.length > 256) {
        ctx.showMessage("Error: Thread title cannot exceed 256 characters.");
        return;
      }
      // 逆向: handleThreadsRename in threads.ts — setCachedThread with new title
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("Error: Could not load current thread snapshot.");
        return;
      }
      const updated = { ...snapshot, title: newTitle } as ThreadSnapshot;
      ctx.threadStore.setCachedThread(updated, { scheduleUpload: true });
      ctx.showMessage(`Thread renamed to "${newTitle}".`);
    },
  });

  // /label -- add label to thread
  // 逆向: e0R:633-724 (id: "add-label", noun: "label", verb: "add")
  registry.register({
    name: "label",
    aliases: ["add-label"],
    description: "Add a label to the current thread",
    execute: async (args, ctx) => {
      const labelName = args.trim().toLowerCase();
      if (!labelName) {
        ctx.showMessage("Usage: /label <name>");
        return;
      }
      if (!/^[a-z0-9][a-z0-9-]*$/.test(labelName)) {
        ctx.showMessage(
          "Error: Label must be alphanumeric with hyphens, starting with a letter or number.",
        );
        return;
      }
      if (labelName.length > 32) {
        ctx.showMessage("Error: Label name cannot exceed 32 characters.");
        return;
      }
      // 逆向: handleThreadsLabel in threads.ts — merge labels + setCachedThread
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("Error: Could not load current thread snapshot.");
        return;
      }
      const existingLabels = Array.isArray((snapshot as Record<string, unknown>).labels)
        ? ((snapshot as Record<string, unknown>).labels as string[])
        : [];
      const mergedLabels = [...new Set([...existingLabels, labelName])];
      const updated = { ...snapshot, labels: mergedLabels } as ThreadSnapshot;
      ctx.threadStore.setCachedThread(updated, { scheduleUpload: true });
      ctx.showMessage(`Label "${labelName}" added to thread. Labels: ${mergedLabels.join(", ")}`);
    },
  });

  // /remove-label -- remove label from thread
  // 逆向: e0R:725-822 (id: "remove-label", noun: "label", verb: "remove")
  // Amp loads labels via internalAPIClient, shows picker, then calls setThreadLabels.
  // Flitter stores labels locally on the thread snapshot — we just filter.
  registry.register({
    name: "remove-label",
    aliases: ["unlabel"],
    description: "Remove a label from the current thread",
    execute: async (args, ctx) => {
      const labelName = args.trim().toLowerCase();
      if (!labelName) {
        ctx.showMessage("Usage: /remove-label <name>");
        return;
      }
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("Error: Could not load current thread snapshot.");
        return;
      }
      const existingLabels = snapshot.labels ?? [];
      if (existingLabels.length === 0) {
        ctx.showMessage("This thread has no labels to remove.");
        return;
      }
      if (!existingLabels.includes(labelName)) {
        ctx.showMessage(
          `Label "${labelName}" not found. Current labels: ${existingLabels.join(", ")}`,
        );
        return;
      }
      const updatedLabels = existingLabels.filter((l) => l !== labelName);
      const updated: ThreadSnapshot = { ...snapshot, labels: updatedLabels };
      ctx.threadStore.setCachedThread(updated, { scheduleUpload: true });
      ctx.showMessage(
        updatedLabels.length > 0
          ? `Removed label "${labelName}". Remaining labels: ${updatedLabels.join(", ")}`
          : `Removed label "${labelName}". Thread has no labels.`,
      );
    },
  });

  // /editor -- open prompt in $EDITOR
  // 逆向: e0R:835-849 (id: "editor", noun: "prompt", verb: "open in editor")
  // 逆向: chunk-006.js:35969-35988 (openInEditor creates temp file, spawns editor, reads back)
  // 逆向: 2433_unknown_eB.js:8 (editor resolution: $AMP_EDITOR > $EDITOR > $VISUAL > vi > nano)
  registry.register({
    name: "editor",
    description: "Edit prompt in $EDITOR",
    execute: async (_args, ctx) => {
      // Resolve editor binary (逆向: eB priority chain)
      const editor = process.env.FLITTER_EDITOR || process.env.EDITOR || process.env.VISUAL || "vi";

      // Create temp file (逆向: amp uses amp-edit-<random>/message.amp.md)
      let tmpDir: string;
      try {
        tmpDir = mkdtempSync(path.join(os.tmpdir(), "flitter-edit-"));
      } catch (err) {
        ctx.showMessage(
          `Error: Could not create temp directory: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
      const tmpFile = path.join(tmpDir, "message.md");

      try {
        // Write empty file for editing
        writeFileSync(tmpFile, "", "utf-8");

        // Spawn editor synchronously (逆向: Zb(a) suspends TUI, stdio: "inherit")
        const result = spawnSync(editor, [tmpFile], {
          stdio: "inherit",
          env: process.env,
        });

        if (result.error) {
          ctx.showMessage(
            `Error: Could not launch editor "${editor}": ${result.error.message}\n` +
              "Set $FLITTER_EDITOR or $EDITOR to your preferred editor.",
          );
          return;
        }

        // Read back the edited text (逆向: P70(a, "utf-8"))
        let editedText: string;
        try {
          editedText = readFileSync(tmpFile, "utf-8").trim();
        } catch {
          // User may have deleted the file — silently ignore (逆向: ENOENT swallowed)
          ctx.showMessage("Editor closed without saving.");
          return;
        }

        if (!editedText) {
          ctx.showMessage("Editor closed with empty content. No message sent.");
          return;
        }

        // Inject the edited text as a message
        if (ctx.submitMessage) {
          ctx.submitMessage(editedText);
          ctx.showMessage(`Message from editor (${editedText.length} chars) submitted.`);
        } else {
          ctx.showMessage(
            `Edited text (${editedText.length} chars):\n${editedText.slice(0, 200)}${editedText.length > 200 ? "..." : ""}`,
          );
        }
      } finally {
        // Cleanup temp dir (逆向: x70, k70 — cleanup failures only warned)
        try {
          rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // Cleanup failures are non-fatal
        }
      }
    },
  });

  // /history -- show thread message history summary
  // 逆向: e0R:968-976 (id: "history", noun: "prompt", verb: "history")
  // amp opens a prompt-history picker overlay (isShowingPromptHistoryPicker).
  // Flitter CLI: display a compact summary of thread messages.
  registry.register({
    name: "history",
    description: "Show thread message history",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot?.messages || snapshot.messages.length === 0) {
        ctx.showMessage("No messages in this thread yet.");
        return;
      }
      const lines: string[] = [`Thread history (${snapshot.messages.length} messages):`];
      for (let i = 0; i < snapshot.messages.length; i++) {
        const msg = snapshot.messages[i]!;
        const role = msg.role.toUpperCase().padEnd(9);
        // Extract first text block's first line as preview
        let preview = "";
        for (const block of msg.content) {
          if (block.type === "text" && block.text) {
            preview = block.text.split("\n")[0]!.slice(0, 80);
            break;
          }
          if (block.type === "tool_use") {
            preview = `[tool: ${block.name}]`;
            break;
          }
        }
        if (!preview) preview = `[${msg.content[0]?.type ?? "empty"}]`;
        lines.push(`  ${String(i + 1).padStart(3)}. ${role} ${preview}`);
      }
      ctx.showMessage(lines.join("\n"));
    },
  });

  // /permissions -- edit permissions
  // 逆向: e0R:1148-1159 (id: "permissions")
  registry.register({
    name: "permissions",
    aliases: ["perms"],
    description: "Manage permission rules",
    execute: async (_args, ctx) => {
      ctx.showMessage(
        "Permission management:\n" +
          "  flitter permissions list      — view rules\n" +
          "  flitter permissions add       — add a rule\n" +
          "  flitter permissions test      — test a tool invocation",
      );
    },
  });

  // /permissions-enable -- enable permissions (re-enable after dangerouslyAllowAll)
  // 逆向: e0R:1161-1171 (id: "permissions-enable", verb: "enable")
  // Amp: Ms("dangerouslyAllowAll", false) → sets runtime override on BehaviorSubject CX
  // Amp returns: new Tc("Amp is now following permissions rules for this session")
  // On error: Error("Failed to enable permissions for this session")
  registry.register({
    name: "permissions-enable",
    description: "Enable permissions",
    execute: async (_args, ctx) => {
      try {
        if (!ctx.configService.setRuntimeOverride) {
          ctx.showMessage("Runtime config override not available in this session.");
          return;
        }
        // 逆向: Ms("dangerouslyAllowAll", !1) — set to false to re-enable permission checks
        ctx.configService.setRuntimeOverride("dangerouslyAllowAll", false);
        // 逆向: new Tc("Amp is now following permissions rules for this session")
        ctx.showMessage("Flitter is now following permissions rules for this session.");
      } catch (err) {
        // 逆向: J.error("Failed to set dangerously allow all setting", R)
        ctx.showMessage(
          `Failed to enable permissions for this session: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  });

  // /permissions-disable -- disable permissions (equivalent to --dangerously-allow-all)
  // 逆向: e0R:1173-1183 (id: "permissions-disable", verb: "dangerously allow all")
  // Amp: Ms("dangerouslyAllowAll", true) → sets runtime override on BehaviorSubject CX
  // Amp returns: new Tc("Permissions disabled for this session - you will NOT be asked ...")
  // On error: Error("Failed to disable permissions for this session")
  registry.register({
    name: "permissions-disable",
    description: "Disable permissions (dangerously allow all)",
    execute: async (_args, ctx) => {
      try {
        if (!ctx.configService.setRuntimeOverride) {
          ctx.showMessage("Runtime config override not available in this session.");
          return;
        }
        // 逆向: Ms("dangerouslyAllowAll", !0) — set to true to skip all permission checks
        ctx.configService.setRuntimeOverride("dangerouslyAllowAll", true);
        // 逆向: new Tc("Permissions disabled for this session - you will NOT be asked ...")
        ctx.showMessage(
          "Permissions disabled for this session — you will NOT be asked for confirmation before Flitter runs a command.",
        );
      } catch (err) {
        // 逆向: J.error("Failed to set dangerously allow all setting", R)
        ctx.showMessage(
          `Failed to disable permissions for this session: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  });

  // /plugins -- list plugins
  // 逆向: e0R:1329-1343 (id: "plugins-list" / "plugins-reload")
  registry.register({
    name: "plugins",
    description: "List or reload plugins",
    execute: async (args, ctx) => {
      const subcmd = args.trim().toLowerCase();
      if (subcmd === "reload") {
        ctx.showMessage("Plugin reload requested.");
        return;
      }
      ctx.showMessage(
        "Plugin management:\n" +
          "  /plugins           — list installed plugins\n" +
          "  /plugins reload    — reload all plugins",
      );
    },
  });

  // /toolbox -- list discovered toolbox scripts
  // 逆向: e0R:1353-1362 (id: "toolbox-list", noun: "toolbox", verb: "list")
  // Amp shows a widget with toolbox tools. Flitter CLI formats as text.
  registry.register({
    name: "toolbox",
    aliases: ["toolbox-list"],
    description: "List discovered toolbox scripts",
    execute: async (_args, ctx) => {
      if (!ctx.toolboxService) {
        ctx.showMessage("Toolbox service not available.");
        return;
      }
      const tools = ctx.toolboxService.getTools();
      const status = ctx.toolboxService.getStatus();
      if (tools.length === 0) {
        ctx.showMessage(
          status.type === "initializing"
            ? "Toolbox is still initializing..."
            : "No toolbox scripts found. Create one with: flitter tools make <name>",
        );
        return;
      }
      const lines = tools.map((t) => {
        const statusIcon = t.status === "ready" ? "+" : t.status === "error" ? "!" : "~";
        const errorSuffix = t.error ? ` (${t.error})` : "";
        return `  [${statusIcon}] ${t.name} — ${t.description}${errorSuffix}`;
      });
      ctx.showMessage(`Toolbox scripts (${tools.length}):\n${lines.join("\n")}`);
    },
  });

  // /handoff -- draft a new thread based on current thread
  // 逆向: e0R:288-297 (id: "handoff", noun: "thread", verb: "handoff")
  // Amp's handoff enters handoff mode and optionally submits the editor text.
  // Flitter CLI: show instruction for handoff (requires TUI mode for full behavior).
  registry.register({
    name: "handoff",
    description: "Draft a new thread based on current thread",
    execute: async (args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot?.messages || snapshot.messages.length === 0) {
        ctx.showMessage("Cannot handoff from an empty thread.");
        return;
      }
      const text = args.trim();
      if (text) {
        ctx.showMessage(
          `Handoff requested with message: "${text.length > 40 ? text.slice(0, 40) + "..." : text}"\n` +
            "(Full handoff mode requires TUI. A new thread will be drafted with context from this thread.)",
        );
      } else {
        ctx.showMessage(
          "Handoff mode requested.\n" +
            "Usage: /handoff [message]\n" +
            "(Enter handoff mode to draft a new thread based on the current conversation.)",
        );
      }
    },
  });

  // /queue -- queue a prompt while agent is running
  // 逆向: e0R:852-866 (id: "queue", noun: "prompt", verb: "queue")
  // Amp's /queue takes the editor text and calls submitQueue(text) if non-empty,
  // or enters queue mode if empty. Flitter CLI: enqueue the args as a user message.
  registry.register({
    name: "queue",
    description: "Queue a prompt for processing after current turn",
    execute: async (args, ctx) => {
      const text = args.trim();
      if (!text) {
        ctx.showMessage(
          "Usage: /queue <message>\n" +
            "Queue a message to be processed after the current inference turn completes.",
        );
        return;
      }
      if (!ctx.threadWorker.enqueueMessage) {
        ctx.showMessage("Message queuing is not available in this session.");
        return;
      }
      // 逆向: amp constructs a user message with text content and enqueues it
      ctx.threadWorker.enqueueMessage({
        role: "user" as const,
        messageId: Date.now(),
        content: [{ type: "text" as const, text }],
      });
      ctx.showMessage(`Queued message: "${text.length > 60 ? text.slice(0, 60) + "..." : text}"`);
    },
  });

  // /dequeue -- dequeue and display queued prompts
  // 逆向: e0R:868-892 (id: "dequeue", noun: "prompt", verb: "dequeue")
  // Amp's /dequeue collects all queued messages, extracts text and images,
  // discards the queue, and sets the editor input to the combined text.
  // Flitter CLI: dequeue the first message (simpler model — one at a time).
  registry.register({
    name: "dequeue",
    description: "Dequeue pending prompts from the message queue",
    execute: async (_args, ctx) => {
      if (!ctx.threadWorker.dequeueMessage) {
        ctx.showMessage("Message dequeuing is not available in this session.");
        return;
      }
      const queueLength = ctx.threadWorker.messageQueueLength ?? 0;
      if (queueLength === 0) {
        ctx.showMessage("No messages in the queue.");
        return;
      }
      ctx.threadWorker.dequeueMessage();
      ctx.showMessage(`Dequeued 1 message (${queueLength - 1} remaining in queue).`);
    },
  });

  // /toggle-thinking-blocks -- toggle thinking block visibility
  // 逆向: e0R:824-834 (id: "toggle-thinking-blocks", noun: "thread",
  //        verb: "toggle thinking blocks")
  // Amp calls Ut.instance.toggleAll() to flip allExpanded, then requests a frame.
  // Flitter: toggles the showThinkingBlocks flag via context callback.
  registry.register({
    name: "toggle-thinking-blocks",
    aliases: ["thinking"],
    description: "Toggle thinking block visibility",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot?.messages || snapshot.messages.length === 0) {
        // 逆向: e0R:833 — isShown returns error string for empty threads
        ctx.showMessage("Cannot toggle thinking blocks on an empty thread.");
        return;
      }
      if (!ctx.toggleThinkingBlocks) {
        ctx.showMessage(
          "Thinking block toggle is not available in this session.\n" +
            "(This feature requires TUI mode with thinking block rendering.)",
        );
        return;
      }
      ctx.toggleThinkingBlocks();
      const newState = ctx.showThinkingBlocks ? "collapsed" : "expanded";
      ctx.showMessage(`Thinking blocks ${newState}.`);
    },
  });

  // /skill-invoke -- invoke (load) a skill for this thread
  // 逆向: e0R:1797-1860 (id: "skill-invoke", noun: "skill", verb: "invoke")
  // Amp shows a FuzzyList picker (customFlow), then calls:
  //   R.addPendingSkill({ name }) — queues the skill for injection on the next message
  //   R.showToast(`Skill "${name}" will be used on next message`, "success")
  // Flitter CLI: no overlay picker available in TUI; instead:
  //   - No args → scan skills and print the list via showMessage
  //   - With args → case-insensitive match by name, then inject as submitMessage
  //     (addPendingSkill equivalent: next user message will include the skill)
  registry.register({
    name: "skill-invoke",
    aliases: ["invoke-skill", "use-skill"],
    description: "Invoke (load) a skill for this thread",
    execute: async (args, ctx) => {
      // 逆向: e0R:1797 — R.skillService.getSkills() (async, returns array)
      if (!ctx.skillService) {
        ctx.showMessage("Skill service is not available in this session.");
        return;
      }

      const query = args.trim();

      if (!query) {
        // No args — list available skills
        // 逆向: amp shows FuzzyList; Flitter shows text list
        let skills: Array<{ name: string; description: string }>;
        try {
          const result = await ctx.skillService.scan();
          skills = result.skills;
        } catch {
          skills = ctx.skillService.list();
        }

        if (skills.length === 0) {
          ctx.showMessage(
            'No skills available. Add skills with "skill add" or create one in .agents/skills/.',
          );
          return;
        }

        const lines = skills.map((s) => {
          const desc = s.description ? ` — ${s.description}` : "";
          return `  • ${s.name}${desc}`;
        });
        ctx.showMessage(
          `Available skills (${skills.length}):\n${lines.join("\n")}\n\nUsage: /skill-invoke <name>`,
        );
        return;
      }

      // Args provided — find matching skill (case-insensitive)
      // 逆向: e0R:1857 — onAccept: async c => { await a({ name: c.name }), e(); }
      let skills: Array<{ name: string; description: string }>;
      try {
        const result = await ctx.skillService.scan();
        skills = result.skills;
      } catch {
        skills = ctx.skillService.list();
      }

      const queryLower = query.toLowerCase();
      const match = skills.find((s) => s.name.toLowerCase() === queryLower);

      if (!match) {
        // 逆向: amp shows nothing (FuzzyList filters in real-time); Flitter shows error + list
        const names = skills.map((s) => `  • ${s.name}`).join("\n");
        const notFoundMsg =
          skills.length > 0
            ? `Skill "${query}" not found.\n\nAvailable skills:\n${names}`
            : `Skill "${query}" not found. No skills are currently installed.`;
        ctx.showMessage(notFoundMsg);
        return;
      }

      // Invoke the skill
      // 逆向: execute: async (R, a, e) => {
      //   R.addPendingSkill({ name: e.name })
      //   R.showToast(`Skill "${e.name}" will be used on next message`, "success")
      // }
      // Flitter equivalent: inject as user message so the skill context loads on the next turn.
      // submitMessage sends it through the normal LLM path, which includes skill injection.
      if (ctx.submitMessage) {
        ctx.submitMessage(`/skill ${match.name}`);
        ctx.showMessage(`Skill "${match.name}" will be used on next message.`);
      } else {
        ctx.showMessage(
          `Skill "${match.name}" selected.\n` +
            "(submitMessage not available — skill injection requires TUI mode.)",
        );
      }
    },
  });

  // /visibility -- set thread visibility
  // 逆向: e0R:528-588 (id: "visibility", noun: "thread", verb: "set visibility")
  registry.register({
    name: "visibility",
    aliases: ["share", "private"],
    description: "Set thread visibility (private/workspace/public/unlisted/group)",
    execute: async (args, ctx) => {
      const level = args.trim().toLowerCase();
      const validLevels = ["private", "workspace", "public", "unlisted", "group"];
      if (!level) {
        ctx.showMessage("Usage: /visibility <level>\n" + `Valid levels: ${validLevels.join(", ")}`);
        return;
      }
      if (!validLevels.includes(level)) {
        ctx.showMessage(
          `Unknown visibility level: "${level}"\n` + `Valid levels: ${validLevels.join(", ")}`,
        );
        return;
      }

      // 逆向: MA() maps user-facing levels to internal visibility values
      const levelToInternal: Record<
        string,
        "private" | "public_unlisted" | "public_discoverable" | "thread_workspace_shared"
      > = {
        private: "private",
        unlisted: "public_unlisted",
        public: "public_discoverable",
        workspace: "thread_workspace_shared",
        group: "private", // group also uses "private" visibility with shared flag
      };

      const internal = levelToInternal[level];
      if (ctx.threadStore.setVisibility && internal) {
        ctx.threadStore.setVisibility(ctx.threadId, internal);
        ctx.showMessage(`\u2713 Thread ${ctx.threadId} visibility changed to ${level}.`);
      } else {
        ctx.showMessage(`Set thread ${ctx.threadId} visibility to "${level}" requested.`);
      }
    },
  });

  // ─── Thread Navigation Commands ─────────────────────────────

  // /back -- navigate to previous thread in history
  // 逆向: e0R:477-487 (id: "thread-previous", verb: "switch to previous", aliases: ["back"])
  // Amp: `if (R.canNavigateBack) await R.navigateBack()`
  // isShown: guards with canNavigateBack — shows error string when unavailable
  registry.register({
    name: "back",
    aliases: ["prev", "previous"],
    description: "Navigate to previous thread",
    execute: async (_args, ctx) => {
      if (!ctx.canNavigateBack?.()) {
        ctx.showMessage("No previous thread in navigation history.");
        return;
      }
      await ctx.navigateBack?.();
    },
  });

  // /forward -- navigate to next thread in history
  // 逆向: e0R:487-497 (id: "thread-next", verb: "switch to next", aliases: ["forward"])
  // Amp: `if (R.canNavigateForward) await R.navigateForward()`
  registry.register({
    name: "forward",
    aliases: ["next"],
    description: "Navigate to next thread",
    execute: async (_args, ctx) => {
      if (!ctx.canNavigateForward?.()) {
        ctx.showMessage("No next thread in navigation history.");
        return;
      }
      await ctx.navigateForward?.();
    },
  });

  // /parent -- navigate to parent thread
  // 逆向: e0R:497-527 (id: "thread-parent", verb: "switch to parent")
  // Amp calls vD(R.thread) which filters relationships where role === "child"
  // (meaning the current thread has spawned those threads as children, so they are
  // "parents" in the navigation sense of "threads I came from").
  // Flitter spec: filter relationships where role === "parent" — the current thread
  // is the child and the relationship points to its parent.
  // isShown: `vD(R.thread).length > 0` — only shown when parent exists
  registry.register({
    name: "parent",
    description: "Navigate to parent thread",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("Error: Could not load current thread snapshot.");
        return;
      }

      // Filter relationships with role === "parent": this thread is a child of those threads
      const parentRelationships = (snapshot.relationships ?? []).filter((r) => r.role === "parent");

      if (parentRelationships.length === 0) {
        ctx.showMessage("No parent thread.");
        return;
      }

      if (parentRelationships.length === 1) {
        const parentId = parentRelationships[0]!.threadID;
        if (ctx.switchToThread) {
          await ctx.switchToThread(parentId);
        } else {
          ctx.showMessage(
            `Parent thread: ${parentId}\n` +
              "(Thread switching not available — use 'flitter --thread-id' to open it.)",
          );
        }
        return;
      }

      // Multiple parents (rare but possible with handoff chains)
      // 逆向: e0R:508-519 shows a FuzzyList picker for multiple parents
      const parentIds = parentRelationships.map((r) => r.threadID);
      ctx.showMessage(
        `Multiple parent threads found:\n${parentIds.map((id) => `  ${id}`).join("\n")}\n\n` +
          "Use /switch <thread-id> to navigate to a specific parent.",
      );
    },
  });

  // ─── Clipboard Commands (CLI-39) ────────────────────────
  // 逆向: e0R:341-372 (id: "url", verb: "copy URL")
  // Amp uses d9.instance.tuiInstance.clipboard.writeText(a) with try/catch.
  // Flitter: calls ctx.writeClipboard (injected by caller), falls back to error msg.

  // /copy-url -- copy thread URL to clipboard
  // 逆向: e0R:341-373
  registry.register({
    name: "copy-url",
    aliases: ["copy-thread-url"],
    description: "Copy thread URL to clipboard",
    execute: async (_args, ctx) => {
      // 逆向: e0R:346 — $P(new URL(R.ampURL), R.thread.id).toString()
      const url = buildThreadUrl(ctx);
      try {
        if (ctx.writeClipboard) {
          const ok = await ctx.writeClipboard(url);
          if (ok) {
            ctx.showMessage("Copied thread URL to clipboard");
          } else {
            ctx.showMessage(`Thread URL: ${url}\n(Could not copy to clipboard)`);
          }
        } else {
          ctx.showMessage(`Thread URL: ${url}\n(Clipboard not available)`);
        }
      } catch (err) {
        // 逆向: e0R:365-371 — catch logs error, returns Error with URL
        ctx.showMessage(
          `Thread URL: ${url}\n(Could not copy to clipboard: ${err instanceof Error ? err.message : String(err)})`,
        );
      }
    },
  });

  // /open-in-browser -- open thread URL in the default browser
  // 逆向: e0R:298-311 (id: "browser", noun: "thread", verb: "open in browser")
  // Amp: $P(new URL(a), R.id).toString() → je(context, url) (Wb cross-platform opener)
  // Wb (chunk-002.js:24072): darwin→open, win32→start "", default→xdg-open
  // isShown: isThreadEmpty → "Cannot use thread: open in browser from an empty thread"
  registry.register({
    name: "open-in-browser",
    aliases: ["open-browser", "browser"],
    description: "Open thread URL in the default browser",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot?.messages || snapshot.messages.length === 0) {
        // 逆向: e0R:311 — isShown guard for empty thread
        ctx.showMessage("Cannot use thread: open in browser from an empty thread.");
        return;
      }
      // 逆向: e0R:307-309 — $P(new URL(a), R.id).toString()
      const url = buildThreadUrl(ctx);
      if (!ctx.openUrl) {
        ctx.showMessage(`Thread URL: ${url}\n(Browser opener not available — open manually.)`);
        return;
      }
      try {
        await ctx.openUrl(url);
        ctx.showMessage(`Opened in browser: ${url}`);
      } catch (err) {
        // 逆向: Wb catch — J.error("Failed to open browser", ...) re-throws
        ctx.showMessage(
          `Failed to open browser: ${err instanceof Error ? err.message : String(err)}\n` +
            `URL: ${url}`,
        );
      }
    },
  });

  // /copy-id -- copy thread ID to clipboard  // 逆向: e0R:374-405
  registry.register({
    name: "copy-id",
    aliases: ["copy-thread-id"],
    description: "Copy thread ID to clipboard",
    execute: async (_args, ctx) => {
      const threadId = ctx.threadId;
      try {
        if (ctx.writeClipboard) {
          const ok = await ctx.writeClipboard(threadId);
          if (ok) {
            ctx.showMessage("Copied thread ID to clipboard");
          } else {
            ctx.showMessage(`Thread ID: ${threadId}\n(Could not copy to clipboard)`);
          }
        } else {
          ctx.showMessage(`Thread ID: ${threadId}\n(Clipboard not available)`);
        }
      } catch (err) {
        ctx.showMessage(
          `Thread ID: ${threadId}\n(Could not copy to clipboard: ${err instanceof Error ? err.message : String(err)})`,
        );
      }
    },
  });

  // /copy-markdown -- copy thread as markdown to clipboard
  // 逆向: e0R:447-467 (id: "markdown", verb: "copy markdown")
  // Amp calls KN(R.thread) which builds: title + all messages from compaction point.
  // pxR(message) formats each message as "**User**\n\ntext\n\n" or "**Assistant**\n\ntext"
  // Flitter: join assistant text blocks with newlines (simplified KN equivalent).
  registry.register({
    name: "copy-markdown",
    aliases: ["copy-md"],
    description: "Copy thread as markdown to clipboard",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot?.messages || snapshot.messages.length === 0) {
        ctx.showMessage("Cannot copy markdown from an empty thread.");
        return;
      }

      // 逆向: KN() builds title + per-message markdown via pxR()
      // Task spec: "## User\n\n<content>\n\n" / "## Assistant\n\n<content>\n\n"
      const parts: string[] = [];
      if (snapshot.title) {
        parts.push(`# ${snapshot.title}`);
      }
      for (const msg of snapshot.messages) {
        const roleLabel = msg.role === "user" ? "## User" : "## Assistant";
        const textParts: string[] = [];
        for (const block of msg.content) {
          if (block.type === "text" && block.text) {
            textParts.push(block.text);
          }
        }
        if (textParts.length > 0) {
          parts.push(`${roleLabel}\n\n${textParts.join("\n")}\n\n`);
        }
      }
      const markdown = parts.join("\n\n");

      try {
        if (ctx.writeClipboard) {
          const ok = await ctx.writeClipboard(markdown);
          if (ok) {
            ctx.showMessage("Copied thread as markdown to clipboard");
          } else {
            ctx.showMessage(
              `Thread markdown (${markdown.length} chars) — could not copy to clipboard.`,
            );
          }
        } else {
          ctx.showMessage(`Thread markdown (${markdown.length} chars) — clipboard not available.`);
        }
      } catch (err) {
        ctx.showMessage(
          `Failed to copy markdown to clipboard: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  });

  // ─── AGENTS.md Commands (CLI-36) ───────────────────────
  // 逆向: e0R:1105-1139

  // /agents-md-generate -- generate AGENTS.md via LLM
  // 逆向: e0R:1105-1119 (id: "generate-agent-file")
  // Amp sends the qWT prompt via activeThreadHandle.sendMessage().
  // Flitter: use ctx.submitMessage (same role — inject user message to trigger LLM).
  // 逆向: chunk-005.js:111979 — qWT = "Please analyze this codebase and create an AGENTS.md file..."
  registry.register({
    name: "agents-md-generate",
    aliases: ["generate-agents-md"],
    description: "Generate an AGENTS.md file for this codebase",
    execute: async (_args, ctx) => {
      // 逆向: qWT prompt (chunk-005.js:111979-111985)
      const prompt =
        "Please analyze this codebase and create an AGENTS.md file containing:\n" +
        "1. Build/lint/test commands - especially for running a single test\n" +
        "2. Architecture and codebase structure information, including important subprojects, internal APIs, databases, etc.\n" +
        "3. Code style guidelines, including imports, conventions, formatting, types, naming conventions, error handling, etc.\n\n" +
        "The file you create will be given to agentic coding tools (such as yourself) that operate in this repository. Make it about 20 lines long.\n\n" +
        "If there are Cursor rules (in .cursor/rules/ or .cursorrules), Claude rules (CLAUDE.md), Windsurf rules (.windsurfrules), Cline rules (.clinerules), Goose rules (.goosehints), or Copilot rules (in .github/copilot-instructions.md), make sure to include them. Also, first check if there is an existing AGENTS.md or AGENT.md file, and if so, update it instead of overwriting it.";

      if (ctx.submitMessage) {
        ctx.submitMessage(prompt);
        ctx.showMessage("Generating AGENTS.md — analyzing codebase...");
      } else {
        ctx.showMessage(
          "AGENTS.md generation requires an active LLM session.\n" +
            "(submitMessage not available in this context.)",
        );
      }
    },
  });

  // /agents-md-list -- list AGENTS.md guidance files in use
  // 逆向: e0R:1120-1139 (id: "agent-files")
  // Amp calls R.getGuidanceFiles(signal) which searches the project for AGENTS.md files.
  // Flitter: walk cwd recursively to find AGENTS.md / .agents.md files (max depth 8).
  registry.register({
    name: "agents-md-list",
    aliases: ["list-agents-md", "agent-files"],
    description: "List AGENTS.md guidance files found in the project",
    execute: async (_args, ctx) => {
      const cwd = process.cwd();

      // Recursive directory walk limited to depth 8, skipping node_modules/.git
      // 逆向: amp uses getGuidanceFiles() which traverses workspace roots
      function findAgentFilesSync(dir: string, depth: number): string[] {
        if (depth > 8) return [];
        let results: string[] = [];
        let entries: string[];
        try {
          entries = readdirSync(dir) as string[];
        } catch {
          return [];
        }
        for (const entry of entries) {
          // Skip heavy directories
          if (
            entry === "node_modules" ||
            entry === ".git" ||
            entry === ".next" ||
            entry.startsWith(".cache")
          )
            continue;
          const fullPath = path.join(dir, entry);
          if (entry === "AGENTS.md" || entry === ".agents.md" || entry === "AGENT.md") {
            results.push(fullPath);
          } else {
            // Recurse into subdirectories only
            try {
              const stat = statSync(fullPath);
              if (stat.isDirectory()) {
                results = results.concat(findAgentFilesSync(fullPath, depth + 1));
              }
            } catch {
              // skip unreadable entries
            }
          }
        }
        return results;
      }

      let files: string[];
      try {
        files = findAgentFilesSync(cwd, 0);
      } catch {
        files = [];
      }

      if (files.length === 0) {
        // 逆向: e0R:1128 — "No guidance files are currently in use for this thread."
        ctx.showMessage(
          "No AGENTS.md guidance files found in this project.\n" +
            "Use /agents-md-generate to create one.",
        );
        return;
      }

      // 逆向: e0R:1130-1134 — format as "Agent File(s) (N):\n  • <path> (type)"
      const count = files.length;
      const label = count === 1 ? "Agent File" : "Agent Files";
      const lines = files.map((f) => {
        // Show relative path for readability
        const rel = path.relative(cwd, f);
        return `  \u2022 ${rel}`;
      });
      ctx.showMessage(`${label} (${count}):\n\n${lines.join("\n")}`);
    },
  });

  // ─── MCP Commands (CLI-42) ─────────────────────────────
  // 逆向: e0R:1321-1351

  // /mcp-reload -- reload all MCP servers
  // 逆向: e0R:1321-1327 (id: "mcp-reload", verb: "reload")
  // Amp: R.mcpService.restartServers(), R.showStatusMessage("Reloading MCP servers...")
  registry.register({
    name: "mcp-reload",
    aliases: ["mcp-restart"],
    description: "Reload all MCP servers",
    execute: async (_args, ctx) => {
      if (!ctx.mcpServerManager) {
        ctx.showMessage(
          "MCP server manager not available in this session.\n" +
            "Use 'flitter mcp doctor' to diagnose MCP connections.",
        );
        return;
      }
      // 逆向: e0R:1326 — R.mcpService.restartServers()
      ctx.mcpServerManager.restartServers();
      ctx.showMessage("Reloading MCP servers...");
    },
  });

  // /mcp-status -- show MCP server connection status
  // 逆向: e0R:1345-1351 (id: "mcp-status", verb: "status")
  // Amp: R.showMCPStatusModal() — shows a modal with server statuses.
  // Flitter: format as text summary via showMessage.
  registry.register({
    name: "mcp-status",
    description: "Show MCP server connection status",
    execute: async (_args, ctx) => {
      if (!ctx.mcpServerManager) {
        ctx.showMessage(
          "MCP server manager not available in this session.\n" +
            "Use 'flitter mcp list' for server configuration.",
        );
        return;
      }
      const servers = ctx.mcpServerManager.getServers();
      if (servers.length === 0) {
        ctx.showMessage("No MCP servers configured.\nUse 'flitter mcp add' to configure a server.");
        return;
      }
      const lines = servers.map((s) => {
        const statusIcon =
          s.status === "connected"
            ? "+"
            : s.status === "connecting"
              ? "~"
              : s.status === "error"
                ? "!"
                : "-";
        const toolInfo = s.toolCount !== undefined ? ` (${s.toolCount} tools)` : "";
        const errorInfo = s.error ? ` — ${s.error}` : "";
        return `  [${statusIcon}] ${s.name}  ${s.status}${toolInfo}${errorInfo}`;
      });
      const connected = servers.filter((s) => s.status === "connected").length;
      ctx.showMessage(
        `MCP Servers (${connected}/${servers.length} connected):\n${lines.join("\n")}`,
      );
    },
  });

  // ─── Context Analysis (CLI-35) ─────────────────────────
  // 逆向: e0R:274-286 (id: "context-analyze", noun: "context", verb: "analyze")
  // 逆向: oFT in 0088_Messages_oFT.js — builds token breakdown via API counting.
  // 逆向: eX0 in 0246_unknown_eX0.js — CLI output formatting.
  //
  // Amp's oFT makes multiple API calls (full, no_messages, no_tools, system_only)
  // to get exact token counts. Flitter uses local approximate counting from the
  // thread snapshot since we don't have a counting API endpoint.
  //
  // Output format matches amp's eX0:
  //   Context Usage Analysis
  //   ──────────────────────────────────────────────────────
  //   Model: <name> (<contextWindow>k context)
  //
  //   <section>  <tokens>  (<pct>%)
  //   ...
  //
  //   Used:  <total> tokens (<pct>% used)
  //   Free:  <free> tokens

  registry.register({
    name: "context-analyze",
    aliases: ["analyze-context"],
    description: "Analyze context token usage",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);

      // ── Resolve model and context window ──
      // 逆向: oFT:19-46 — resolves model from agentModeOverride or config settings
      const config = ctx.configService.get();
      const modelId =
        ctx.contextAnalyzer?.modelId ??
        (config.settings["internal.model"] as string) ??
        "claude-sonnet-4-20250514";
      const modelInfo = MODEL_REGISTRY[modelId];
      const modelDisplayName = modelId;
      const contextWindow = modelInfo?.contextWindow ?? 200_000;
      const maxOutputTokens = modelInfo?.maxOutputTokens ?? 32_000;

      // 逆向: oFT:38-40 — maxContextTokens = contextWindow - maxOutputTokens (for anthropic)
      const maxContextTokens = contextWindow - maxOutputTokens;

      // ── Count tokens by category ──
      // 逆向: oFT:139-195 — amp counts: full, no_messages, no_tools, system_only
      // Flitter approximation: iterate messages and categorize by role.

      let userMessageTokens = 0;
      let assistantMessageTokens = 0;
      let toolResultTokens = 0;

      if (snapshot?.messages) {
        for (const msg of snapshot.messages) {
          const msgTokens = countMessageTokens(msg);
          if (msg.role === "user") {
            // Check if message contains tool_result blocks
            const hasToolResult =
              Array.isArray(msg.content) &&
              msg.content.some((b: { type: string }) => b.type === "tool_result");
            if (hasToolResult) {
              toolResultTokens += msgTokens;
            } else {
              userMessageTokens += msgTokens;
            }
          } else if (msg.role === "assistant") {
            assistantMessageTokens += msgTokens;
          } else {
            // info, system, etc. — count as user messages
            userMessageTokens += msgTokens;
          }
        }
      }

      const messageTokens = userMessageTokens + assistantMessageTokens + toolResultTokens;

      // ── Use last API token count if available ──
      // 逆向: oFT:139-141 — full = Ts(O, { kind: "full" })
      // If the context analyzer provides an API-reported count, use that as
      // totalTokens; otherwise fall back to approximate counting.
      const lastApi = ctx.contextAnalyzer?.lastApiInputTokens;
      const totalTokens = lastApi != null && lastApi > 0 ? lastApi : messageTokens;

      // ── Build sections (matches amp's oFT:232-286 output structure) ──
      // 逆向: oFT:232-286 — sections: System prompt, Builtin tools, MCP tools, Messages
      // Flitter simplification: we don't have separate system prompt / tool
      // definition token counts (those require API counting). We report Messages
      // breakdown by sub-category.

      interface Section {
        name: string;
        tokens: number;
        percentage: number;
      }

      const sections: Section[] = [];

      if (userMessageTokens > 0) {
        sections.push({
          name: "User messages",
          tokens: userMessageTokens,
          percentage: maxContextTokens > 0 ? (userMessageTokens / maxContextTokens) * 100 : 0,
        });
      }

      if (assistantMessageTokens > 0) {
        sections.push({
          name: "Assistant messages",
          tokens: assistantMessageTokens,
          percentage: maxContextTokens > 0 ? (assistantMessageTokens / maxContextTokens) * 100 : 0,
        });
      }

      if (toolResultTokens > 0) {
        sections.push({
          name: "Tool results",
          tokens: toolResultTokens,
          percentage: maxContextTokens > 0 ? (toolResultTokens / maxContextTokens) * 100 : 0,
        });
      }

      // ── Format output (matches amp's eX0:38-70) ──
      // 逆向: eX0:38 — "Context Usage Analysis"
      // 逆向: eX0:40 — "─".repeat(50)
      // 逆向: eX0:43 — "Model: <displayName> (<contextWindow> context)"

      // Ki() helper — 逆向: eX0:1-4 — formats numbers as "Nk" or localeString
      const formatTokens = (n: number, forceExact = false): string => {
        if (forceExact || n < 1000) return n.toLocaleString();
        return `${(n / 1000).toFixed(1)}k`;
      };

      const lines: string[] = [];
      lines.push("Context Usage Analysis");
      lines.push("\u2500".repeat(50));
      lines.push(`Model: ${modelDisplayName} (${formatTokens(maxContextTokens)} context)\n`);

      // 逆向: eX0:46-59 — section table with padded columns
      if (sections.length > 0) {
        const nameWidth = Math.max(...sections.map((s) => s.name.length));
        for (const section of sections) {
          const name = section.name.padEnd(nameWidth + 2);
          const tokens = formatTokens(section.tokens).padStart(8);
          const pct = `(${section.percentage.toFixed(1)}%)`.padStart(8);
          lines.push(`  ${name}${tokens} ${pct}`);
        }
        lines.push("");
      }

      // 逆向: eX0:63-66 — "Used: <total> tokens (<pct>% used)" / "Free: <free> tokens"
      const freeSpace = Math.max(0, maxContextTokens - totalTokens);
      const usedPercent =
        maxContextTokens > 0 ? ((totalTokens / maxContextTokens) * 100).toFixed(1) : "0.0";
      lines.push(`Used:  ${formatTokens(totalTokens, true)} tokens (${usedPercent}% used)`);
      lines.push(`Free:  ${formatTokens(freeSpace, true)} tokens`);

      // ── Message count summary ──
      const messageCount = snapshot?.messages?.length ?? 0;
      lines.push(`Messages: ${messageCount}`);

      // ── Warning if near capacity ──
      const usedPct = maxContextTokens > 0 ? (totalTokens / maxContextTokens) * 100 : 0;
      if (usedPct > 90) {
        lines.push("\nWARNING: Context window is nearly full. Consider using /compact.");
      }

      // ── Note about approximation when API count unavailable ──
      if (lastApi == null || lastApi <= 0) {
        lines.push(
          "\n(Token counts are approximate estimates. " +
            "Actual usage may differ based on encoding.)",
        );
      }

      ctx.showMessage(lines.join("\n"));
    },
  });

  // ─── Deep Reasoning Commands ───────────────────────
  // 逆向: jetbrains_wizard.js:3659-3675
  //   getNextDeepReasoningEffort(T): "medium" → "high" → "xhigh" → "medium"
  //   toggleDeepReasoningEffort(): cycles effort, persists via configService,
  //     shows statusMessage(`Deep reasoning effort: ${R}`)
  //   applyDeepReasoningEffort(T): sets this.deepReasoningEffort, calls
  //     Ms("agent.deepReasoningEffort", T) (runtime override)
  //   commitDeepReasoningEffort(T): calls configService.updateSettings(
  //     "agent.deepReasoningEffort", T, "global")

  registry.register({
    name: "toggle-deep-reasoning",
    aliases: ["deep-reasoning", "deep-effort"],
    description: "Toggle deep reasoning effort (medium → high → xhigh)",
    execute: async (_args, ctx) => {
      const config = ctx.configService.get();

      // Read current effort from settings
      // 逆向: jetbrains_wizard.js:2406 — deepReasoningEffort defaults to "high"
      // 逆向: jetbrains_wizard.js:4231 — O2(r.settings) reads initial value
      const currentEffort =
        (config.settings["agent.deepReasoningEffort"] as string | undefined) ?? "medium";

      // Cycle: medium → high → xhigh → medium
      // 逆向: jetbrains_wizard.js:3659-3661 — getNextDeepReasoningEffort
      let nextEffort: string;
      if (currentEffort === "medium") {
        nextEffort = "high";
      } else if (currentEffort === "high") {
        nextEffort = "xhigh";
      } else {
        nextEffort = "medium";
      }

      // Persist via configService
      // 逆向: jetbrains_wizard.js:3653 — configService.updateSettings(
      //   "agent.deepReasoningEffort", T, "global")
      if (ctx.configService.updateSettings) {
        ctx.configService.updateSettings("global", "agent.deepReasoningEffort", nextEffort);
      }

      // Also apply runtime override if available (immediate effect without restart)
      // 逆向: jetbrains_wizard.js:3648 — Ms("agent.deepReasoningEffort", T)
      if (ctx.configService.setRuntimeOverride) {
        ctx.configService.setRuntimeOverride("agent.deepReasoningEffort", nextEffort);
      }

      // 逆向: jetbrains_wizard.js:3672 — showStatusMessage(`Deep reasoning effort: ${R}`)
      ctx.showMessage(`Deep reasoning effort: ${nextEffort}`);
    },
  });

  // ─── Debug Commands ────────────────────────────────
  // 逆向: e0R:1648-1678

  // /debug -- debug subcommands (copy-prompt, copy-command)
  // 逆向: e0R:1648-1653 (id: "debug-copy-prompt", verb: "copy prompt")
  // 逆向: e0R:1655-1678 (id: "debug-copy-command", verb: "copy command")
  // 逆向: 2776_unknown_VU0.js — VU0(T) builds Markdown via NU0(RhT(T)),
  //        calls clipboard.writeText(a), shows "Copied Markdown debug prompt to clipboard"
  // 逆向: 2768_unknown_NU0.js — NU0() builds: title, thread URL, DTW commands, CLI logs, diagnostics
  // 逆向: 2772_unknown_RhT.js — RhT() extracts thread/runtime state
  // 逆向: 2777_unknown_YU0.js — XU0 validates label+command, YU0 copies command text
  //
  // Flitter simplification: no DTW/Cloudflare links; builds thread info + conversation content.
  registry.register({
    name: "debug",
    description: "Debug commands (copy-prompt, copy-command)",
    execute: async (args, ctx) => {
      const subcmd = args.trim();

      // ── /debug copy-prompt ──
      // 逆向: VU0 → NU0(RhT(T)) builds Markdown, clipboard.writeText, shows toast
      if (subcmd === "copy-prompt" || subcmd === "copy prompt") {
        const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
        const config = ctx.configService.get();
        const modelId = (config.settings["internal.model"] as string) ?? "unknown";

        // Build Markdown debug prompt (simplified NU0 equivalent)
        // 逆向: NU0 builds: # Debug Instructions, ## Quick Links (thread URL),
        //        ## DTW Commands, ## CLI Logs (log file, PID), ## Diagnostics (ThT)
        // 逆向: ThT builds: thread ID/title/URL/created/mode, runtime info, view state
        const parts: string[] = [];
        parts.push("# Debug Prompt");
        parts.push("");
        parts.push("## Thread Info");
        parts.push(`- Thread ID: \`${ctx.threadId}\``);
        if (snapshot?.title) {
          parts.push(`- Title: ${snapshot.title}`);
        }
        parts.push(`- Model: \`${modelId}\``);
        parts.push(`- Messages: ${snapshot?.messages?.length ?? 0}`);
        parts.push(`- PID: \`${process.pid}\``);
        parts.push("");

        // Serialize conversation messages
        // 逆向: NU0 includes diagnostics (ThT); Flitter includes actual conversation
        // content which is more useful for debugging in a CLI context.
        if (snapshot?.messages && snapshot.messages.length > 0) {
          parts.push("## Conversation");
          parts.push("");
          for (const msg of snapshot.messages) {
            const roleLabel = msg.role === "user" ? "**User**" : "**Assistant**";
            const textParts: string[] = [];
            for (const block of msg.content) {
              if (block.type === "text" && block.text) {
                textParts.push(block.text);
              } else if (block.type === "tool_use") {
                textParts.push(`[tool_use: ${block.name}]`);
              } else if (block.type === "tool_result") {
                textParts.push("[tool_result]");
              }
            }
            if (textParts.length > 0) {
              parts.push(`${roleLabel}\n\n${textParts.join("\n")}`);
              parts.push("");
            }
          }
        }

        const markdown = parts.join("\n");

        // 逆向: VU0:6 — clipboard.writeText(a); on success show "Copied ..."
        // 逆向: VU0:14 — on failure, show the markdown content for manual copy
        try {
          if (ctx.writeClipboard) {
            const ok = await ctx.writeClipboard(markdown);
            if (ok) {
              ctx.showMessage("Copied Markdown debug prompt to clipboard.");
              return;
            }
          }
          // Fallback: show the markdown directly
          ctx.showMessage("Clipboard copy failed. Select and copy manually.\n\n" + markdown);
        } catch {
          ctx.showMessage("Clipboard copy failed. Select and copy manually.\n\n" + markdown);
        }
        return;
      }

      // ── /debug copy-command ──
      // 逆向: 2777_unknown_YU0.js:4-12 — XU0 validates label+command, YU0 copies R.command
      // 逆向: clipboard.writeText(R.command), showToast(`Copied: ${R.label}`, "success")
      // Flitter simplification: takes command text directly as argument (no picker).
      if (subcmd.startsWith("copy-command") || subcmd.startsWith("copy command")) {
        // Extract the command text after "copy-command " or "copy command "
        let commandText = "";
        if (subcmd.startsWith("copy-command ")) {
          commandText = subcmd.slice("copy-command ".length).trim();
        } else if (subcmd.startsWith("copy command ")) {
          commandText = subcmd.slice("copy command ".length).trim();
        }

        // 逆向: XU0:1-2 — validates that label and command exist; returns Error if missing
        if (!commandText) {
          ctx.showMessage("Usage: /debug copy-command <command text>");
          return;
        }

        // 逆向: YU0:7 — clipboard.writeText(R.command), showToast on success
        try {
          if (ctx.writeClipboard) {
            const ok = await ctx.writeClipboard(commandText);
            if (ok) {
              ctx.showMessage("Copied command to clipboard.");
              return;
            }
          }
          ctx.showMessage(`Could not copy to clipboard. Command:\n${commandText}`);
        } catch {
          ctx.showMessage(`Could not copy to clipboard. Command:\n${commandText}`);
        }
        return;
      }

      // Unknown /debug subcommand — show usage
      ctx.showMessage(
        "Debug commands:\n" +
          "  /debug copy-prompt    — Copy Markdown debug prompt to clipboard\n" +
          "  /debug copy-command   — Copy a command to clipboard",
      );
    },
  });
}
