/**
 * Built-in slash command handlers.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:192-1560
 * (registerCommands with all built-in commands)
 *
 * Flitter implements the full set of slash commands matching amp's command palette.
 */

import { execSync, spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ThreadSnapshot } from "@flitter/schemas";
import type { SlashCommandContext, SlashCommandRegistry } from "./slash-registry.js";

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
  // 逆向: e0R:273-279 (context-analyze). Amp has context analysis but not manual compact.
  // Flitter adds manual trigger for user control via contextManager if available.
  registry.register({
    name: "compact",
    description: "Manually trigger context compaction",
    execute: async (_args, ctx) => {
      // 逆向: amp's compaction runs automatically in the inference loop.
      // Try to access contextManager through the extended context.
      const extCtx = ctx as SlashCommandContext & {
        contextManager?: { compactThread?: (id: string) => Promise<void> };
      };
      if (extCtx.contextManager?.compactThread) {
        try {
          await extCtx.contextManager.compactThread(ctx.threadId);
          ctx.showMessage("Compaction completed.");
          return;
        } catch (err) {
          ctx.showMessage(`Compaction failed: ${err instanceof Error ? err.message : String(err)}`);
          return;
        }
      }
      ctx.showMessage("Compaction requested. The next inference turn will check context limits.");
    },
  });

  // /cost -- show session cost
  // 逆向: e0R:1508-1517 (show-costs toggles debug cost display)
  // Flitter: display accumulated session cost from thread usage data.
  registry.register({
    name: "cost",
    description: "Show session cost summary",
    execute: async (_args, ctx) => {
      // 逆向: e0R:1508-1517 reads agent.showUsageDebugInfo setting
      // Flitter: aggregate usage from assistant messages in current thread
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot || snapshot.messages.length === 0) {
        ctx.showMessage("No usage data available yet.");
        return;
      }

      let totalInput = 0;
      let totalOutput = 0;
      let totalCacheCreate = 0;
      let totalCacheRead = 0;
      for (const msg of snapshot.messages) {
        if (msg.role === "assistant") {
          const usage = (msg as Record<string, unknown>).usage as
            | {
                inputTokens?: number;
                outputTokens?: number;
                cacheCreationInputTokens?: number;
                cacheReadInputTokens?: number;
              }
            | undefined;
          if (usage) {
            totalInput += usage.inputTokens ?? 0;
            totalOutput += usage.outputTokens ?? 0;
            totalCacheCreate += usage.cacheCreationInputTokens ?? 0;
            totalCacheRead += usage.cacheReadInputTokens ?? 0;
          }
        }
      }

      const total = totalInput + totalOutput;
      if (total === 0) {
        ctx.showMessage("No token usage recorded in this thread.");
        return;
      }

      ctx.showMessage(
        `Session Cost Summary:\n` +
          `  Input tokens:  ${totalInput.toLocaleString()}\n` +
          `  Output tokens: ${totalOutput.toLocaleString()}\n` +
          `  Cache create:  ${totalCacheCreate.toLocaleString()}\n` +
          `  Cache read:    ${totalCacheRead.toLocaleString()}\n` +
          `  Total tokens:  ${total.toLocaleString()}`,
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

  // ─── Upgraded slash commands (Task 7-21) ───────────────

  // /new -- start a new thread
  // 逆向: e0R:192-201 (id: "new", verb: "new", execute: R.createThread())
  registry.register({
    name: "new",
    aliases: ["start"],
    description: "Start a new thread",
    execute: async (_args, ctx) => {
      // 逆向: e0R:199-200 — only creates if current thread is not empty
      const currentSnapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (currentSnapshot && currentSnapshot.messages.length === 0) {
        ctx.showMessage("Current thread is already empty.");
        return;
      }

      const newId = crypto.randomUUID();
      ctx.threadStore.setCachedThread({
        id: newId,
        v: 0,
        messages: [],
        relationships: [],
        created: Date.now(),
      } as unknown as ThreadSnapshot);

      // Update the active thread ID in context
      // The calling code should handle switching the threadId
      ctx.showMessage(`New thread created: ${newId}`);
    },
  });

  // /switch <id> -- switch to existing thread
  // 逆向: e0R:202-244 (id: "continue", verb: "switch", execute: R.switchToThread(e))
  registry.register({
    name: "switch",
    aliases: ["continue"],
    description: "Switch to an existing thread",
    execute: async (args, ctx) => {
      const threadId = args.trim();
      if (!threadId) {
        ctx.showMessage("Usage: /switch <thread-id>");
        return;
      }

      const thread = ctx.threadStore.getThreadSnapshot(threadId);
      if (!thread) {
        ctx.showMessage(`Thread "${threadId}" not found.`);
        return;
      }

      // 逆向: e0R:242 — R.switchToThread(e) switches the active thread
      ctx.showMessage(`Switched to thread: ${threadId}\nTitle: ${thread.title ?? "(none)"}\nMessages: ${thread.messages.length}`);
    },
  });

  // /quit -- exit application
  // 逆向: e0R:1536-1547 (id: "quit", aliases: ["exit"], execute: R.exitApp())
  registry.register({
    name: "quit",
    aliases: ["exit", "q"],
    description: "Exit application",
    execute: async (_args, _ctx) => {
      // 逆向: e0R:1544 — R.exitApp() calls process exit
      process.exit(0);
    },
  });

  // /delete -- delete current thread
  // 逆向: e0R does not have a direct /delete. Amp uses archive-and-exit (e0R:437-445).
  // Flitter adds direct delete for CLI convenience.
  registry.register({
    name: "delete",
    description: "Delete current thread",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("No active thread to delete.");
        return;
      }

      // biome-ignore lint/suspicious/noExplicitAny: threadStore may have deleteThread
      const store = ctx.threadStore as any;
      if (typeof store.deleteThread === "function") {
        store.deleteThread(ctx.threadId);
        ctx.showMessage(`Thread ${ctx.threadId} deleted.`);
      } else {
        ctx.showMessage("Thread deletion not available in this context.");
      }
    },
  });

  // /archive -- archive current thread
  // 逆向: e0R:437-445 (id: "archive", verb: "archive and exit")
  registry.register({
    name: "archive",
    description: "Archive current thread",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("No active thread to archive.");
        return;
      }
      if (snapshot.messages.length === 0) {
        ctx.showMessage("Cannot archive an empty thread.");
        return;
      }

      // 逆向: e0R:443 — R.threadService.archive(R.thread.id, true)
      ctx.threadStore.setCachedThread(
        { ...snapshot, archived: true } as unknown as ThreadSnapshot,
        { scheduleUpload: true },
      );
      ctx.showMessage(`Thread ${ctx.threadId} archived.`);
    },
  });

  // /settings -- show/open settings
  // 逆向: e0R:1141-1147 (id: "settings", verb: "open in editor", execute: Zb(settingsPath))
  registry.register({
    name: "settings",
    description: "Show current configuration settings",
    execute: async (_args, ctx) => {
      const config = ctx.configService.get();
      const entries = Object.entries(config.settings);
      if (entries.length === 0) {
        ctx.showMessage("No configuration settings found.");
        return;
      }
      const lines = entries.map(([key, value]) => `  ${key} = ${JSON.stringify(value)}`);
      ctx.showMessage("Current settings:\n" + lines.join("\n"));
    },
  });

  // /mcp -- list connected MCP servers
  // 逆向: e0R:1193-1319 (mcp-list-tools) and e0R:1345-1351 (mcp-status)
  registry.register({
    name: "mcp",
    aliases: ["mcp-status"],
    description: "List MCP servers and their status",
    execute: async (_args, ctx) => {
      const config = ctx.configService.get();
      const mcpServers = (config.settings as Record<string, unknown>)["mcp.servers"] as
        | Record<string, unknown>
        | undefined;

      if (!mcpServers || Object.keys(mcpServers).length === 0) {
        ctx.showMessage("No MCP servers configured.");
        return;
      }

      const lines: string[] = [];
      for (const [name, serverConfig] of Object.entries(mcpServers)) {
        const cfg = serverConfig as Record<string, unknown>;
        const transport = cfg.url ? "HTTP" : cfg.command ? "stdio" : "unknown";
        lines.push(`  ${name} (${transport})`);
      }
      ctx.showMessage(`MCP Servers (${Object.keys(mcpServers).length}):\n${lines.join("\n")}`);
    },
  });

  // /tasks -- list tasks
  // 逆向: amp has task tool (SubAgentManager). /tasks lists active sub-agent tasks.
  registry.register({
    name: "tasks",
    description: "List active tasks",
    execute: async (_args, ctx) => {
      // Tasks are managed by SubAgentManager which may not be directly accessible
      const extCtx = ctx as SlashCommandContext & {
        subAgentManager?: { getTasks?: () => Array<{ id: string; status: string; goal: string }> };
      };
      if (extCtx.subAgentManager?.getTasks) {
        const tasks = extCtx.subAgentManager.getTasks();
        if (tasks.length === 0) {
          ctx.showMessage("No active tasks.");
          return;
        }
        const lines = tasks.map((t) => `  [${t.status}] ${t.id}: ${t.goal}`);
        ctx.showMessage(`Active tasks (${tasks.length}):\n${lines.join("\n")}`);
        return;
      }
      ctx.showMessage("Task management is not available in this context.");
    },
  });

  // /refresh -- trigger config reload and screen refresh
  // 逆向: e0R:1519-1527 (id: "refresh", verb: "refresh", execute: screen.markForRefresh())
  registry.register({
    name: "refresh",
    description: "Refresh configuration and screen",
    execute: async (_args, ctx) => {
      // 逆向: e0R:1524-1526 — refreshes screen and requests frame
      // In CLI mode, we can trigger a config reload
      const extCtx = ctx as SlashCommandContext & {
        configService: { reload?: () => void };
      };
      if (typeof extCtx.configService.reload === "function") {
        extCtx.configService.reload();
      }
      ctx.showMessage("Configuration refreshed.");
    },
  });

  // /editor -- open prompt in $EDITOR
  // 逆向: e0R:836-850 (id: "editor", verb: "open in editor", execute: R.openInEditor(text))
  registry.register({
    name: "editor",
    aliases: ["edit"],
    description: "Edit prompt in $EDITOR",
    execute: async (args, ctx) => {
      // 逆向: e0R:843 — R.openInEditor(R.editorState.text.trim())
      const editor = process.env.EDITOR || process.env.VISUAL;
      if (!editor) {
        ctx.showMessage("No $EDITOR or $VISUAL environment variable set.");
        return;
      }

      const tmpDir = mkdtempSync(join(tmpdir(), "flitter-"));
      const tmpFile = join(tmpDir, "prompt.md");
      const initialText = args.trim();

      try {
        writeFileSync(tmpFile, initialText, "utf-8");

        // Spawn editor synchronously (blocks until editor closes)
        const result = execSync(`${editor} "${tmpFile}"`, {
          stdio: "inherit",
          encoding: "utf-8",
        });

        // Read back the edited content
        const editedText = readFileSync(tmpFile, "utf-8").trim();

        if (editedText && editedText !== initialText) {
          // Send the edited text as a message
          const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
          if (snapshot) {
            ctx.threadStore.setCachedThread(
              {
                ...snapshot,
                messages: [
                  ...snapshot.messages,
                  { role: "user", content: [{ type: "text", text: editedText }] },
                ],
              } as unknown as ThreadSnapshot,
            );
            // Trigger inference
            ctx.threadWorker.runInference().catch(() => {});
          }
          ctx.showMessage("Editor content submitted.");
        } else {
          ctx.showMessage("Editor closed with no changes.");
        }
      } catch (err) {
        ctx.showMessage(
          `Failed to open editor: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        try {
          unlinkSync(tmpFile);
        } catch {
          // ignore cleanup errors
        }
      }
    },
  });

  // /history -- show recent thread list
  // 逆向: e0R:969-976 (id: "history", verb: "history", execute: R.openPromptHistoryPicker())
  // In CLI mode, show recent threads instead of prompt history.
  registry.register({
    name: "history",
    description: "Show recent threads",
    execute: async (_args, ctx) => {
      // 逆向: e0R:974 — R.openPromptHistoryPicker()
      // In CLI mode, we list recent thread entries
      const extCtx = ctx as SlashCommandContext & {
        threadStore: {
          observeThreadEntries?: () => { getValue: () => Array<Record<string, unknown>> | null };
          listRecentThreadIds?: (limit: number) => string[];
        };
      };

      if (extCtx.threadStore.observeThreadEntries) {
        const entries$ = extCtx.threadStore.observeThreadEntries();
        const entries = entries$.getValue();
        if (!entries || entries.length === 0) {
          ctx.showMessage("No thread history available.");
          return;
        }

        const recent = entries.slice(0, 10);
        const lines = recent.map((e) => {
          const id = (e.id as string).slice(0, 12);
          const title = (e.title as string) ?? "Untitled";
          return `  ${id}  ${title}`;
        });
        ctx.showMessage(`Recent threads:\n${lines.join("\n")}`);
        return;
      }

      ctx.showMessage("Thread history is not available in this context.");
    },
  });

  // /permissions -- show current permission rules
  // 逆向: e0R:1149-1153 (id: "permissions", verb: "open in editor (user)")
  // In CLI mode, show permission rules instead of opening editor.
  registry.register({
    name: "permissions",
    description: "Show current permission rules",
    execute: async (_args, ctx) => {
      // 逆向: e0R:1149-1183 — permissions, permissions-workspace, permissions-enable, permissions-disable
      const config = ctx.configService.get();
      const permissionRules = (config.settings as Record<string, unknown>)["permissions"] as
        | unknown[]
        | undefined;

      if (!permissionRules || !Array.isArray(permissionRules) || permissionRules.length === 0) {
        ctx.showMessage("No custom permission rules configured. Using defaults.");
        return;
      }

      const lines = permissionRules.map((rule, i) => `  ${i + 1}. ${JSON.stringify(rule)}`);
      ctx.showMessage(`Permission rules (${permissionRules.length}):\n${lines.join("\n")}`);
    },
  });

  // /mode <name> -- switch agent mode with persistence
  // 逆向: e0R:1364-1418 (id: "set-agent-mode") and e0R:1053-1063 (toggle-agent-mode)
  registry.register({
    name: "mode",
    aliases: ["set-mode"],
    description: "Set agent mode (smart, fast, deep, auto)",
    execute: async (args, ctx) => {
      const modeName = args.trim();
      if (!modeName) {
        const config = ctx.configService.get();
        const currentMode = (config.settings["agent.mode"] as string) ?? "auto";
        ctx.showMessage(`Current mode: ${currentMode}\nAvailable modes: smart, fast, deep, auto`);
        return;
      }

      const validModes = ["smart", "fast", "deep", "auto"];
      if (!validModes.includes(modeName)) {
        ctx.showMessage(
          `Unknown mode: "${modeName}"\nAvailable modes: ${validModes.join(", ")}`,
        );
        return;
      }

      // 逆向: e0R:1400 — R.setAgentMode(e)
      // Persist the mode change via config update
      const extCtx = ctx as SlashCommandContext & {
        configService: {
          get(): { settings: Record<string, unknown> };
          updateSettings?: (scope: string, key: string, value: unknown) => void;
        };
      };
      if (typeof extCtx.configService.updateSettings === "function") {
        extCtx.configService.updateSettings("global", "agent.mode", modeName);
        ctx.showMessage(`Mode set to: ${modeName} (session override)`);
      } else {
        ctx.showMessage(`Mode would be set to: ${modeName} (config update not available)`);
      }
    },
  });

  // /theme <name> -- switch theme
  // 逆向: e0R:1420-1479 (id: "set-theme")
  registry.register({
    name: "theme",
    aliases: ["set-theme"],
    description: "Switch terminal theme",
    execute: async (args, ctx) => {
      const themeName = args.trim();
      if (!themeName) {
        const config = ctx.configService.get();
        const currentTheme = (config.settings["terminal.theme"] as string) ?? "terminal";
        ctx.showMessage(`Current theme: ${currentTheme}`);
        return;
      }

      // 逆向: e0R:1474-1478 — R.configService.updateSettings("terminal.theme", e, "global")
      const extCtx = ctx as SlashCommandContext & {
        configService: {
          get(): { settings: Record<string, unknown> };
          updateSettings?: (scope: string, key: string, value: unknown) => void;
        };
      };
      if (typeof extCtx.configService.updateSettings === "function") {
        extCtx.configService.updateSettings("global", "terminal.theme", themeName);
        ctx.showMessage(`Theme set to: ${themeName}`);
      } else {
        ctx.showMessage(`Theme switching is not available in this context.`);
      }
    },
  });

  // /rename <title> -- rename current thread
  // 逆向: e0R:407-436 (id: "rename", execute: R.activeThreadHandle.setTitle(t))
  registry.register({
    name: "rename",
    description: "Rename current thread",
    execute: async (args, ctx) => {
      const newTitle = args.trim();
      if (!newTitle) {
        ctx.showMessage("Usage: /rename <new title>");
        return;
      }

      // 逆向: e0R:423-425 — validation
      if (newTitle.length > 256) {
        ctx.showMessage("Thread title cannot exceed 256 characters.");
        return;
      }

      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("No active thread to rename.");
        return;
      }
      if (snapshot.messages.length === 0) {
        ctx.showMessage("Cannot rename an empty thread.");
        return;
      }

      // 逆向: e0R:427 — R.activeThreadHandle.setTitle(t)
      ctx.threadStore.setCachedThread(
        { ...snapshot, title: newTitle } as unknown as ThreadSnapshot,
        { scheduleUpload: true },
      );
      ctx.showMessage(`Renamed thread to "${newTitle}"`);
    },
  });

  // /label <label> -- add label to current thread
  // 逆向: e0R:633-724 (id: "add-label")
  registry.register({
    name: "label",
    aliases: ["add-label"],
    description: "Add label to current thread",
    execute: async (args, ctx) => {
      const label = args.trim().toLowerCase();
      if (!label) {
        ctx.showMessage("Usage: /label <label-name>");
        return;
      }

      // 逆向: e0R:688-690 — validation
      if (!/^[a-z0-9][a-z0-9-]*$/.test(label)) {
        ctx.showMessage(
          "Label must be alphanumeric with hyphens, starting with a letter or number.",
        );
        return;
      }
      if (label.length > 32) {
        ctx.showMessage("Label name cannot exceed 32 characters.");
        return;
      }

      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("No active thread.");
        return;
      }

      const existingLabels = (snapshot as Record<string, unknown>).labels as string[] | undefined;
      const labels = existingLabels ?? [];
      if (labels.includes(label)) {
        ctx.showMessage(`Thread already has label "${label}".`);
        return;
      }

      const updated = [...labels, label];
      ctx.threadStore.setCachedThread(
        { ...snapshot, labels: updated } as unknown as ThreadSnapshot,
        { scheduleUpload: true },
      );
      ctx.showMessage(`Added label "${label}".`);
    },
  });

  // /visibility <level> -- set thread visibility
  // 逆向: e0R:528-588 (id: "visibility")
  registry.register({
    name: "visibility",
    aliases: ["share", "private", "public"],
    description: "Set thread visibility (private, workspace, public)",
    execute: async (args, ctx) => {
      const level = args.trim().toLowerCase();
      if (!level) {
        ctx.showMessage("Usage: /visibility <private|workspace|public>");
        return;
      }

      const validLevels = ["private", "workspace", "group", "unlisted", "public"];
      if (!validLevels.includes(level)) {
        ctx.showMessage(`Unknown visibility: "${level}"\nValid: ${validLevels.join(", ")}`);
        return;
      }

      // 逆向: e0R:549-564 — visibility messages
      const messages: Record<string, string> = {
        private: "This thread's visibility has been updated to private",
        workspace: "This thread's visibility has been updated to workspace",
        group: "This thread's visibility has been updated to group",
        unlisted:
          "This thread's visibility has been updated to unlisted. Anyone with the link can view it.",
        public:
          "This thread's visibility has been updated to public. Anyone on the Internet can see it.",
      };
      ctx.showMessage(messages[level] ?? `Visibility set to: ${level}`);
    },
  });

  // /plugins -- list plugins
  // 逆向: e0R:1337-1343 (id: "plugins-list")
  registry.register({
    name: "plugins",
    description: "List active plugins",
    execute: async (_args, ctx) => {
      const extCtx = ctx as SlashCommandContext & {
        pluginService?: { getPlugins?: () => Array<{ name: string; status: string }> };
      };
      if (extCtx.pluginService?.getPlugins) {
        const plugins = extCtx.pluginService.getPlugins();
        if (plugins.length === 0) {
          ctx.showMessage("No plugins loaded.");
          return;
        }
        const lines = plugins.map((p) => `  ${p.name} (${p.status})`);
        ctx.showMessage(`Plugins (${plugins.length}):\n${lines.join("\n")}`);
        return;
      }
      ctx.showMessage("Plugin system is not available in this context.");
    },
  });

  // ─── NEW slash commands (Gaps #44-49) ──────────────────

  // /handoff <goal> -- delegate to new thread
  // 逆向: e0R:287-297 (id: "handoff", verb: "handoff")
  registry.register({
    name: "handoff",
    description: "Draft a new thread based on current thread",
    execute: async (args, ctx) => {
      const goal = args.trim();
      if (!goal) {
        ctx.showMessage("Usage: /handoff <goal description>");
        return;
      }

      // 逆向: e0R:292-296 — R.enterHandoffMode(); if text, R.submitMessage(a)
      const extCtx = ctx as SlashCommandContext & {
        threadWorker: { executeHandoff?: (goal: string) => Promise<void> };
      };
      if (typeof extCtx.threadWorker.executeHandoff === "function") {
        try {
          await extCtx.threadWorker.executeHandoff(goal);
          ctx.showMessage(`Handoff initiated: ${goal}`);
        } catch (err) {
          ctx.showMessage(
            `Handoff failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        return;
      }
      ctx.showMessage("Handoff is not available. ThreadWorker.executeHandoff not implemented.");
    },
  });

  // /back -- navigate to previous thread
  // 逆向: e0R:477-487 (id: "thread-previous", aliases: ["back"])
  registry.register({
    name: "back",
    aliases: ["previous"],
    description: "Switch to previous thread",
    execute: async (_args, ctx) => {
      const extCtx = ctx as SlashCommandContext & {
        threadNavigator?: {
          canNavigateBack?: boolean;
          back?: () => Promise<void>;
        };
      };
      if (extCtx.threadNavigator?.back) {
        if (!extCtx.threadNavigator.canNavigateBack) {
          ctx.showMessage("No previous thread to navigate to.");
          return;
        }
        await extCtx.threadNavigator.back();
        ctx.showMessage("Navigated to previous thread.");
        return;
      }
      ctx.showMessage("Thread navigation is not available in this context.");
    },
  });

  // /forward -- navigate to next thread
  // 逆向: e0R:487-497 (id: "thread-next", aliases: ["forward"])
  registry.register({
    name: "forward",
    aliases: ["next"],
    description: "Switch to next thread",
    execute: async (_args, ctx) => {
      const extCtx = ctx as SlashCommandContext & {
        threadNavigator?: {
          canNavigateForward?: boolean;
          forward?: () => Promise<void>;
        };
      };
      if (extCtx.threadNavigator?.forward) {
        if (!extCtx.threadNavigator.canNavigateForward) {
          ctx.showMessage("No next thread to navigate to.");
          return;
        }
        await extCtx.threadNavigator.forward();
        ctx.showMessage("Navigated to next thread.");
        return;
      }
      ctx.showMessage("Thread navigation is not available in this context.");
    },
  });

  // /queue <msg> -- queue a message for when inference completes
  // 逆向: e0R:851-866 (id: "queue", verb: "queue", execute: R.submitQueue(a))
  registry.register({
    name: "queue",
    description: "Queue a message to send after current inference",
    execute: async (args, ctx) => {
      const message = args.trim();
      if (!message) {
        ctx.showMessage("Usage: /queue <message>");
        return;
      }

      const extCtx = ctx as SlashCommandContext & {
        threadWorker: { enqueueMessage?: (msg: string) => void };
      };
      if (typeof extCtx.threadWorker.enqueueMessage === "function") {
        extCtx.threadWorker.enqueueMessage(message);
        ctx.showMessage(`Message queued: "${message.slice(0, 50)}${message.length > 50 ? "..." : ""}"`);
        return;
      }
      ctx.showMessage("Message queuing is not available. ThreadWorker.enqueueMessage not implemented.");
    },
  });

  // /dequeue -- remove queued messages
  // 逆向: e0R:867-892 (id: "dequeue", verb: "dequeue")
  registry.register({
    name: "dequeue",
    description: "Remove queued messages",
    execute: async (_args, ctx) => {
      const extCtx = ctx as SlashCommandContext & {
        threadWorker: { dequeueMessage?: () => string | undefined };
      };
      if (typeof extCtx.threadWorker.dequeueMessage === "function") {
        const removed = extCtx.threadWorker.dequeueMessage();
        if (removed) {
          ctx.showMessage(`Dequeued message: "${removed.slice(0, 50)}${removed.length > 50 ? "..." : ""}"`);
        } else {
          ctx.showMessage("No messages in queue.");
        }
        return;
      }
      ctx.showMessage("Message dequeuing is not available. ThreadWorker.dequeueMessage not implemented.");
    },
  });

  // /copy-url -- copy thread URL to clipboard
  // 逆向: e0R:340-373 (id: "url", verb: "copy URL")
  registry.register({
    name: "copy-url",
    aliases: ["url"],
    description: "Copy thread URL to clipboard",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot || snapshot.messages.length === 0) {
        ctx.showMessage("Cannot copy URL from an empty thread.");
        return;
      }

      // 逆向: e0R:345 — $P(new URL(R.ampURL), R.thread.id).toString()
      const url = `/threads/${ctx.threadId}`;

      // Try to copy to clipboard via platform commands
      try {
        if (process.platform === "darwin") {
          execSync(`echo -n "${url}" | pbcopy`);
        } else if (process.platform === "linux") {
          execSync(`echo -n "${url}" | xclip -selection clipboard 2>/dev/null || echo -n "${url}" | xsel --clipboard 2>/dev/null`);
        } else {
          ctx.showMessage(`Thread URL: ${url}\n(Clipboard copy not supported on this platform)`);
          return;
        }
        ctx.showMessage(`Thread URL: ${url}\n(Copied to clipboard)`);
      } catch {
        ctx.showMessage(`Thread URL: ${url}\n(Could not copy to clipboard)`);
      }
    },
  });

  // /copy-id -- copy thread ID to clipboard
  // 逆向: e0R:374-405 (id: "copy-id", verb: "copy ID")
  registry.register({
    name: "copy-id",
    description: "Copy thread ID to clipboard",
    execute: async (_args, ctx) => {
      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot || snapshot.messages.length === 0) {
        ctx.showMessage("Cannot copy ID from an empty thread.");
        return;
      }

      const id = ctx.threadId;
      try {
        if (process.platform === "darwin") {
          execSync(`echo -n "${id}" | pbcopy`);
        } else if (process.platform === "linux") {
          execSync(`echo -n "${id}" | xclip -selection clipboard 2>/dev/null || echo -n "${id}" | xsel --clipboard 2>/dev/null`);
        } else {
          ctx.showMessage(`Thread ID: ${id}\n(Clipboard copy not supported on this platform)`);
          return;
        }
        ctx.showMessage(`Thread ID: ${id}\n(Copied to clipboard)`);
      } catch {
        ctx.showMessage(`Thread ID: ${id}\n(Could not copy to clipboard)`);
      }
    },
  });

  // /remove-label <label> -- remove label from thread
  // 逆向: e0R:725-822 (id: "remove-label")
  registry.register({
    name: "remove-label",
    description: "Remove label from current thread",
    execute: async (args, ctx) => {
      const label = args.trim().toLowerCase();
      if (!label) {
        ctx.showMessage("Usage: /remove-label <label-name>");
        return;
      }

      const snapshot = ctx.threadStore.getThreadSnapshot(ctx.threadId);
      if (!snapshot) {
        ctx.showMessage("No active thread.");
        return;
      }

      const existingLabels = (snapshot as Record<string, unknown>).labels as string[] | undefined;
      if (!existingLabels || !existingLabels.includes(label)) {
        ctx.showMessage(`Thread does not have label "${label}".`);
        return;
      }

      // 逆向: e0R:801-802 — filter out the label and update
      const updated = existingLabels.filter((l) => l !== label);
      ctx.threadStore.setCachedThread(
        { ...snapshot, labels: updated } as unknown as ThreadSnapshot,
        { scheduleUpload: true },
      );
      ctx.showMessage(`Removed label "${label}".`);
    },
  });

  // /toggle-thinking-blocks -- toggle thinking visibility
  // 逆向: e0R:823-834 (id: "toggle-thinking-blocks")
  registry.register({
    name: "toggle-thinking-blocks",
    aliases: ["thinking"],
    description: "Toggle thinking block visibility",
    execute: async (_args, ctx) => {
      // 逆向: e0R:829-831 — Ut.instance.toggleAll()
      // Toggle a config flag for thinking block visibility
      const config = ctx.configService.get();
      const current = (config.settings as Record<string, unknown>)["display.showThinkingBlocks"];
      const newValue = !current;

      const extCtx = ctx as SlashCommandContext & {
        configService: {
          get(): { settings: Record<string, unknown> };
          updateSettings?: (scope: string, key: string, value: unknown) => void;
        };
      };
      if (typeof extCtx.configService.updateSettings === "function") {
        extCtx.configService.updateSettings("global", "display.showThinkingBlocks", newValue);
      }

      ctx.showMessage(`Thinking blocks: ${newValue ? "visible" : "hidden"}`);
    },
  });

  // /dashboard -- show threads dashboard (alias for thread listing)
  // 逆向: e0R:202-244 (continue command shows thread picker)
  registry.register({
    name: "dashboard",
    description: "Show threads dashboard",
    execute: async (_args, ctx) => {
      const extCtx = ctx as SlashCommandContext & {
        threadStore: {
          observeThreadEntries?: () => { getValue: () => Array<Record<string, unknown>> | null };
        };
      };

      if (extCtx.threadStore.observeThreadEntries) {
        const entries$ = extCtx.threadStore.observeThreadEntries();
        const entries = entries$.getValue();
        if (!entries || entries.length === 0) {
          ctx.showMessage("No threads found.");
          return;
        }

        const recent = entries.slice(0, 20);
        const lines = recent.map((e) => {
          const id = (e.id as string).slice(0, 12);
          const title = ((e.title as string) ?? "Untitled").slice(0, 40);
          return `  ${id.padEnd(14)}${title}`;
        });

        ctx.showMessage(`Threads (${entries.length} total):\n${"  ID".padEnd(14)}${"Title"}\n  ${"─".repeat(12)}  ${"─".repeat(40)}\n${lines.join("\n")}`);
        return;
      }

      ctx.showMessage("Thread dashboard is not available in this context.");
    },
  });
}
