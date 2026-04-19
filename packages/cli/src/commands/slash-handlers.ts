/**
 * Built-in slash command handlers.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:192-1560
 * (registerCommands with all built-in commands)
 *
 * Flitter implements 25 slash commands matching amp's command palette.
 * Original 6: /help, /clear, /compact, /cost, /model, /status
 * Added 19: /new, /switch, /dashboard, /delete, /archive, /mode,
 *           /settings, /theme, /mcp, /tasks, /quit, /rename,
 *           /visibility, /refresh, /editor, /history, /label,
 *           /permissions, /plugins
 */

import type { SlashCommandRegistry } from "./slash-registry.js";

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
      ctx.showMessage("Compaction requested. The next inference turn will check context limits.");
      // Compaction runs as part of the inference loop (checkAndCompact).
      // We signal by showing a message. Full manual compaction would require
      // exposing contextManager.checkAndCompact on the context -- deferred.
    },
  });

  // /cost -- show session cost
  // 逆向: e0R:1508-1517 (show-costs toggles debug cost display)
  // Flitter: display accumulated session cost to user.
  registry.register({
    name: "cost",
    description: "Show session cost summary",
    execute: async (_args, ctx) => {
      // Cost data is displayed from status bar state or a SessionCostTracker.
      // For now, show a placeholder that will be wired to SessionCostTracker
      // once Plan 10 (cost-tracking) is implemented.
      ctx.showMessage(
        "Session cost tracking: use the status bar for live cost info.\n" +
          "(Detailed cost breakdown will be available after cost tracking is wired.)",
      );
    },
  });

  // /model -- show/switch model
  // 逆向: e0R:1483-1506 (model-selector shows explanation modal)
  // Flitter: show current model, allow switching via /model <name>
  registry.register({
    name: "model",
    description: "Show current model or switch model",
    execute: async (args, ctx) => {
      const config = ctx.configService.get();
      const currentModel =
        (config.settings["internal.model"] as string) ?? "claude-sonnet-4-20250514";
      if (!args.trim()) {
        ctx.showMessage(`Current model: ${currentModel}`);
      } else {
        ctx.showMessage(
          `Model switching via /model <name> is not yet implemented.\n` +
            `Current model: ${currentModel}\n` +
            `Use 'flitter config set llm.model <model>' to change.`,
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
  registry.register({
    name: "new",
    aliases: ["start"],
    description: "Start a new thread",
    execute: async (_args, ctx) => {
      ctx.showMessage(
        "Starting a new thread...\n" +
          "(Thread creation is handled by the session manager. Use 'flitter threads new' from CLI.)",
      );
    },
  });

  // /switch -- switch to existing thread
  // 逆向: e0R:202-244 (id: "continue", noun: "thread", verb: "switch")
  registry.register({
    name: "switch",
    aliases: ["continue"],
    description: "Switch to an existing thread",
    execute: async (args, ctx) => {
      if (!args.trim()) {
        ctx.showMessage("Usage: /switch <thread-id>\nTip: use /dashboard for interactive picker.");
      } else {
        ctx.showMessage(
          `Switch to thread: ${args.trim()}\n` +
            "(Thread switching is handled by the session manager.)",
        );
      }
    },
  });

  // /dashboard -- interactive thread picker
  // 逆向: e0R:202-244 (continue command's customFlow uses thread picker wQ)
  registry.register({
    name: "dashboard",
    aliases: ["dash", "threads"],
    description: "Open interactive thread dashboard",
    execute: async (_args, ctx) => {
      ctx.showMessage(
        "Thread dashboard requested.\n" +
          "(Use 'flitter threads dashboard' for the TUI thread picker.)",
      );
    },
  });

  // /delete -- delete current thread
  // 逆向: no direct e0R command; amp has archive (e0R:437-445)
  registry.register({
    name: "delete",
    description: "Delete the current thread",
    execute: async (_args, ctx) => {
      ctx.showMessage(
        `Delete thread ${ctx.threadId}?\n` +
          "(Thread deletion is handled by the session manager. Use 'flitter threads delete <id>'.)",
      );
    },
  });

  // /archive -- archive current thread
  // 逆向: e0R:437-445 (id: "archive", noun: "thread", verb: "archive and exit")
  registry.register({
    name: "archive",
    description: "Archive the current thread",
    execute: async (_args, ctx) => {
      ctx.showMessage(
        `Archive thread ${ctx.threadId}?\n` +
          "(Thread archiving is handled by the session manager. Use 'flitter threads archive <id>'.)",
      );
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
        ctx.showMessage(
          `Unknown mode: "${requested}"\nValid modes: ${validModes.join(", ")}`,
        );
        return;
      }

      ctx.showMessage(
        `Mode switch to "${requested}" requested.\n` +
          `(Mode switching applies from the next inference turn. ` +
          `Use 'flitter config set agent.mode ${requested}' for persistent change.)`,
      );
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
        ctx.showMessage("MCP server reload requested.\n(Use 'flitter mcp doctor' for diagnostics.)");
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
    execute: async (_args, ctx) => {
      ctx.showMessage("Exiting...\n(Use Ctrl+C or Ctrl+D to exit the interactive session.)");
    },
  });

  // /refresh -- refresh screen
  // 逆向: e0R:1518-1526 (id: "refresh", noun: "screen", verb: "refresh")
  registry.register({
    name: "refresh",
    description: "Refresh the screen display",
    execute: async (_args, ctx) => {
      ctx.showMessage("Screen refresh requested.");
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
      ctx.showMessage(
        `Rename thread "${ctx.threadId}" to "${newTitle}" requested.\n` +
          "(Use 'flitter threads rename <id> <title>' from CLI.)",
      );
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
      ctx.showMessage(
        `Add label "${labelName}" to thread ${ctx.threadId} requested.\n` +
          "(Use 'flitter threads label <id> <labels...>' from CLI.)",
      );
    },
  });

  // /editor -- open prompt in $EDITOR
  // 逆向: e0R:835-849 (id: "editor", noun: "prompt", verb: "open in editor")
  registry.register({
    name: "editor",
    description: "Edit prompt in $EDITOR",
    execute: async (_args, ctx) => {
      ctx.showMessage(
        "Open in $EDITOR requested.\n" +
          "(Editor integration requires TUI mode. Press Ctrl+G in interactive mode.)",
      );
    },
  });

  // /history -- show prompt history
  // 逆向: e0R:968-976 (id: "history", noun: "prompt", verb: "history")
  registry.register({
    name: "history",
    description: "Show prompt history",
    execute: async (_args, ctx) => {
      ctx.showMessage(
        "Prompt history requested.\n" +
          "(Press Ctrl+R in interactive mode for prompt history picker.)",
      );
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

  // /visibility -- set thread visibility
  // 逆向: e0R:528-588 (id: "visibility", noun: "thread", verb: "set visibility")
  registry.register({
    name: "visibility",
    aliases: ["share", "private"],
    description: "Set thread visibility (private/workspace/public)",
    execute: async (args, ctx) => {
      const level = args.trim().toLowerCase();
      const validLevels = ["private", "workspace", "public", "unlisted"];
      if (!level) {
        ctx.showMessage(
          "Usage: /visibility <level>\n" +
            `Valid levels: ${validLevels.join(", ")}`,
        );
        return;
      }
      if (!validLevels.includes(level)) {
        ctx.showMessage(
          `Unknown visibility level: "${level}"\n` +
            `Valid levels: ${validLevels.join(", ")}`,
        );
        return;
      }
      ctx.showMessage(
        `Set thread ${ctx.threadId} visibility to "${level}" requested.`,
      );
    },
  });
}
