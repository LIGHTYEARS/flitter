/**
 * Built-in slash command handlers.
 *
 * 逆向: amp-cli-reversed/modules/2785_unknown_e0R.js:192-1560
 * (registerCommands with all built-in commands)
 *
 * Flitter implements a minimal set: /help, /clear, /compact, /cost, /model, /status.
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
}
