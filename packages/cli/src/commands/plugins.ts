/**
 * @flitter/cli — Plugin management CLI commands
 *
 * 逆向: modules/2529_unknown_t40.js (t40 function)
 *
 * Provides `flitter plugins list` and `flitter plugins exec` subcommands.
 *
 * - list: Lists all discovered plugins with status (name, path, status)
 * - exec: Executes a plugin with event data JSON, returns response
 */

import type { Command } from "commander";
import type { PluginService } from "@flitter/agent-core";
import { PluginHost } from "@flitter/agent-core";
import { resolve, relative } from "node:path";
import { existsSync } from "node:fs";

/**
 * Register the `plugins` command group on the Commander program.
 *
 * 逆向: t40(T, R) in modules/2529_unknown_t40.js:
 *   T.command("plugins", { hidden: true }).alias("plugin")
 *     .description("Plugin management commands")
 *   .command("list").alias("ls")
 *   .command("exec").argument("<plugin>").argument("<event>")
 *
 * @param program - Commander.js Command instance
 * @param getPluginService - Factory function to get a PluginService instance.
 *                           The CLI layer passes this to avoid importing heavy deps at module scope.
 */
export function registerPluginsCommand(
  program: Command,
  getPluginService?: () => PluginService | null,
): void {
  const plugins = program
    .command("plugins")
    .alias("plugin")
    .description("Plugin management commands");

  // ─── plugins list ────────────────────────────────────
  // 逆向: t40 line 7-31: a.command("list").alias("ls")
  plugins
    .command("list")
    .alias("ls")
    .description("List plugins found in .flitter/plugins/")
    .option("--json", "Output as JSON", false)
    .action(async (opts) => {
      const service = getPluginService?.();

      if (!service) {
        console.error("Plugins are disabled. Set FLITTER_PLUGINS=all to enable.");
        process.exitCode = 1;
        return;
      }

      try {
        // Load plugins (discovers + starts them)
        await service.loadPlugins();

        const infos = service.getPluginInfos();
        const cwd = process.cwd();

        if (opts.json) {
          // JSON output mode
          const output = infos.map((info) => ({
            uri: info.uri,
            status: info.status,
            registeredEvents: [...info.registeredEvents],
          }));
          console.log(JSON.stringify(output, null, 2));
          return;
        }

        if (infos.length === 0) {
          console.log("No plugins found.");
          return;
        }

        // 逆向: t40 lines 15-25 — format each plugin with status icon
        for (const info of infos) {
          const path = info.uri.startsWith(cwd + "/")
            ? relative(cwd, info.uri)
            : info.uri;
          const statusIcon = info.status === "active" ? "\u2713" : "\u2717";
          const statusColor = info.status === "active" ? "green" : "red";

          console.log(`${statusIcon} ${path} (${info.status})`);

          if (info.registeredEvents.size > 0) {
            console.log(`  Events: ${[...info.registeredEvents].join(", ")}`);
          }
        }
      } finally {
        await service.dispose();
      }
    });

  // ─── plugins exec ────────────────────────────────────
  // 逆向: t40 line 32-81: a.command("exec")
  plugins
    .command("exec")
    .argument("<plugin>", "Plugin file path (e.g., .flitter/plugins/foo.ts)")
    .argument("<event>", "Event name to send (e.g., tool.result)")
    .option("--data <json>", "JSON event data", "{}")
    .description("Execute a plugin with a given event")
    .action(async (pluginPath: string, event: string, opts) => {
      // 逆向: t40 lines 34-38 — parse --data JSON
      let data: unknown;
      try {
        data = JSON.parse(opts.data);
      } catch {
        console.error("Error: --data must be valid JSON");
        process.exitCode = 1;
        return;
      }

      // 逆向: t40 line 40 — check file exists
      const resolvedPath = resolve(pluginPath);
      if (!existsSync(resolvedPath)) {
        console.error(`Error: plugin file not found: ${pluginPath}`);
        process.exitCode = 1;
        return;
      }

      // 逆向: t40 lines 44-71 — create PluginHost and execute
      const host = new PluginHost(resolvedPath, {
        onStateChange: (state) => {
          if (state.type === "failed") {
            console.error(`Plugin failed: ${state.error.message}`);
          }
        },
      });

      try {
        await host.start();
        await host.emitEvent(event, data);
        // 逆向: t40 line 73 — wait 2 seconds for async effects
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      } finally {
        await host.dispose();
      }
    });
}
