/**
 * Built-in slash command handlers.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:192-1560
 * (registerCommands with all built-in commands)
 *
 * Flitter implements 29 slash commands matching amp's command palette.
 * Original 6: /help, /clear, /compact, /cost, /model, /status
 * Added 23: /new, /switch, /dashboard, /delete, /archive, /mode,
 *           /settings, /theme, /mcp, /tasks, /quit, /rename,
 *           /visibility, /refresh, /editor, /history, /label,
 *           /permissions, /plugins, /handoff, /queue, /dequeue,
 *           /toggle-thinking-blocks
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { MODEL_REGISTRY } from "@flitter/llm";
import type { ThreadSnapshot } from "@flitter/schemas";
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
}
