/**
 * @flitter/agent-core — PluginService: discovers and manages all plugins
 *
 * 逆向: amp-cli-reversed/chunk-002.js:27190-27510 (X5T function — full plugin service)
 * 逆向: amp-cli-reversed/chunk-002.js:27363-27382 (plugin directory scanning)
 * 逆向: amp-cli-reversed/chunk-002.js:27565-27641 (tool call/result interception)
 * 逆向: amp-cli-reversed/chunk-005.js:145466-145492 (V5T — disabled plugin service defaults)
 *
 * Discovers plugin files from workspace (.flitter/plugins/) and global (~/.config/flitter/plugins/)
 * directories, spawns them as PluginHost subprocesses, and provides interception hooks
 * for tool calls and results.
 *
 * @example
 * ```ts
 * const service = new PluginService({ workspaceDir: '/path/to/project' });
 * await service.loadPlugins();
 * const action = await service.onToolCall({ tool: 'bash', input: { cmd: 'ls' } });
 * if (action.action !== 'allow') { // handle plugin interception }
 * await service.dispose();
 * ```
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { homedir } from "node:os";
import { createLogger } from "@flitter/util";

import { PluginHost } from "./plugin-host";
import type {
  PluginAction,
  PluginInfo,
  PluginServiceOptions,
  PluginStatus,
  PluginToolCallEvent,
  PluginToolResultEvent,
  PluginToolResultOverride,
} from "./types";
import { GLOBAL_PLUGIN_DIR, WORKSPACE_PLUGIN_DIR } from "./types";

const log = createLogger("plugins:service");

/**
 * Internal record for a managed plugin.
 * 逆向: chunk-002.js:27174-27188 (puT function)
 */
interface PluginRecord {
  uri: string;
  host: PluginHost;
  status: PluginStatus;
  registeredEvents: Set<string>;
}

/**
 * PluginService discovers plugins, manages their lifecycles,
 * and provides interception hooks for tool calls/results.
 *
 * 逆向: X5T (chunk-002.js:27190-27510)
 */
export class PluginService {
  private plugins: PluginRecord[] = [];
  private disposed = false;
  private readonly workspaceDir?: string;
  private readonly userConfigDir: string;
  private readonly pluginFilter?: string;

  constructor(options?: PluginServiceOptions) {
    this.workspaceDir = options?.workspaceDir;
    this.userConfigDir =
      options?.userConfigDir ?? join(homedir(), ".config", "flitter");
    this.pluginFilter = options?.pluginFilter?.trim();
  }

  // ─── Plugin Discovery ───────────────────────────────────

  /**
   * Discover plugin files in workspace and global directories.
   * 逆向: chunk-002.js:27363-27382 (I + S functions)
   * - Scans .flitter/plugins/ in workspace root
   * - Scans ~/.config/flitter/plugins/ globally
   * - Includes only .ts and .js files, excludes directories
   */
  discoverPlugins(): string[] {
    const dirs = this.getPluginDirs();
    const files: string[] = [];

    for (const dir of dirs) {
      try {
        const entries = this.scanDirectory(dir);
        files.push(...entries);
      } catch (err) {
        log.debug("Failed to find plugin files", { dir, error: err });
      }
    }

    // Apply filter if specified
    // 逆向: chunk-002.js:27479-27484 (filter logic)
    if (this.pluginFilter && this.pluginFilter !== "all") {
      if (this.pluginFilter === "off") {
        log.debug("Plugins disabled via pluginFilter=off");
        return [];
      }
      const filter = this.pluginFilter.toLowerCase();
      const filtered = files.filter((f) =>
        basename(f).toLowerCase().includes(filter),
      );
      log.info("Filtered plugins", {
        filter: this.pluginFilter,
        total: files.length,
        matched: filtered.length,
      });
      return filtered;
    }

    return files;
  }

  /**
   * Get the directories to scan for plugins.
   * 逆向: chunk-002.js:27363-27367 (I function)
   */
  private getPluginDirs(): string[] {
    const dirs: string[] = [];
    if (this.workspaceDir) {
      dirs.push(join(this.workspaceDir, WORKSPACE_PLUGIN_DIR));
    }
    dirs.push(join(this.userConfigDir, GLOBAL_PLUGIN_DIR));
    return dirs;
  }

  /**
   * Scan a directory for plugin files (.ts, .js).
   * 逆向: chunk-002.js:27368-27382 (S + O functions)
   */
  private scanDirectory(dir: string): string[] {
    if (!existsSync(dir)) return [];

    try {
      const entries = readdirSync(dir);
      return entries
        .filter((entry) => {
          const fullPath = join(dir, entry);
          try {
            const stat = statSync(fullPath);
            if (stat.isDirectory()) return false;
          } catch {
            return false;
          }
          const ext = extname(entry);
          return ext === ".ts" || ext === ".js";
        })
        .map((entry) => join(dir, entry));
    } catch (err) {
      // 逆向: chunk-002.js:27375-27378 (ENOENT handling)
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  // ─── Plugin Loading ─────────────────────────────────────

  /**
   * Load all discovered plugins. Creates PluginHost instances and starts them.
   * 逆向: chunk-002.js:27421-27441 (C function) + chunk-002.js:27467-27510 (D function)
   */
  async loadPlugins(): Promise<void> {
    if (this.disposed) return;

    // Stop any existing plugins first
    await this.stopAllPlugins(false);

    const files = this.discoverPlugins();
    if (files.length === 0) {
      log.debug("No plugins found");
      return;
    }

    const startTime = Date.now();
    log.info("Starting plugins", { count: files.length, plugins: files });

    // Create plugin records with hosts
    // 逆向: chunk-002.js:27499 (map to j(Ht(jT)) — create PluginHost per file)
    this.plugins = files.map((file) => this.createPluginRecord(file));

    // Start all plugins in parallel
    // 逆向: chunk-002.js:27421-27441 (C function — parallel start with error handling)
    await Promise.all(
      this.plugins.map(async (record) => {
        const pluginStartTime = Date.now();
        try {
          await record.host.start();
          await this.refreshRegistrations(record);
          record.status = "active";
          log.debug("Plugin started", {
            pluginFile: record.uri,
            durationMs: Date.now() - pluginStartTime,
            registeredEvents: [...record.registeredEvents],
          });
        } catch (err) {
          record.status = "error";
          log.warn("Failed to start plugin", {
            pluginFile: record.uri,
            durationMs: Date.now() - pluginStartTime,
            error: err,
          });
        }
      }),
    );

    if (this.disposed) {
      await this.stopAllPlugins(true);
      return;
    }

    log.info("All plugins started", {
      count: this.plugins.length,
      totalDurationMs: Date.now() - startTime,
    });
  }

  /**
   * Create a PluginRecord for a file.
   * 逆向: chunk-002.js:27383-27399 (j function) + chunk-002.js:27174-27188 (puT)
   */
  private createPluginRecord(file: string): PluginRecord {
    const record: PluginRecord = {
      uri: file,
      host: null!,
      status: "loading",
      registeredEvents: new Set(),
    };

    record.host = new PluginHost(file, {
      onEvent: (event, data) => {
        this.handlePluginEvent(record, event, data);
      },
      onStateChange: (state) => {
        this.handlePluginStateChange(record, state);
      },
    });

    return record;
  }

  /**
   * Refresh a plugin's registered events.
   * 逆向: chunk-002.js:27256-27275 (u function)
   */
  private async refreshRegistrations(record: PluginRecord): Promise<void> {
    if (record.status !== "active" && record.status !== "loading") return;
    try {
      const events = await record.host.listRegisteredEvents();
      record.registeredEvents = new Set(events);
    } catch (err) {
      log.debug("Failed to refresh plugin registrations", {
        uri: record.uri,
        error: err,
      });
    }
  }

  /**
   * Handle state change from a plugin host.
   * 逆向: chunk-002.js:27245-27255 (y function)
   */
  private handlePluginStateChange(
    record: PluginRecord,
    state: { type: string; error?: Error },
  ): void {
    if (state.type === "restarting") {
      record.status = "loading";
      record.registeredEvents = new Set();
    } else if (state.type === "failed") {
      record.status = "error";
      record.registeredEvents = new Set();
    } else if (state.type === "ready") {
      record.status = "active";
      // Refresh registrations asynchronously
      this.refreshRegistrations(record).catch(() => {});
    }
  }

  /**
   * Handle events from a plugin.
   * 逆向: chunk-002.js:27276-27278 (P function)
   */
  private handlePluginEvent(
    record: PluginRecord,
    event: string,
    _data: unknown,
  ): void {
    // If plugin reports that commands or tools changed, refresh registrations
    if (event === "commands.changed" || event === "tools.changed") {
      this.refreshRegistrations(record).catch(() => {});
    }
  }

  // ─── Tool Call Interception ─────────────────────────────

  /**
   * Call all active plugins that registered for "tool.call" and return the first non-allow action.
   * 逆向: chunk-002.js:27565-27609 (iT function)
   *
   * Action priority: error > reject-and-continue > synthesize > modify > allow
   */
  async onToolCall(event: PluginToolCallEvent): Promise<PluginAction> {
    const activePlugins = this.getPluginsForEvent("tool.call");
    if (activePlugins.length === 0) return { action: "allow" };

    // Call all plugins in parallel
    // 逆向: chunk-002.js:27571-27598 (parallel map over plugins)
    const results = await Promise.all(
      activePlugins.map(async (record) => {
        try {
          return await record.host.requestToolCall(event);
        } catch (err) {
          log.warn("Failed to request tool.call from plugin", {
            uri: record.uri,
            error: err,
            tool: event.tool,
          });
          return {
            action: "error" as const,
            message:
              err instanceof Error
                ? err.message
                : `Plugin error: ${String(err)}`,
          };
        }
      }),
    );

    // Return first non-allow action (逆向: chunk-002.js:27600-27608)
    for (const result of results) {
      if (result.action === "error") return result;
      if (result.action === "reject-and-continue") return result;
      if (result.action === "synthesize") return result;
      if (result.action === "modify") return result;
    }

    return { action: "allow" };
  }

  /**
   * Call all active plugins that registered for "tool.result" and return the first override.
   * 逆向: chunk-002.js:27610-27641 (aT function)
   */
  async onToolResult(
    event: PluginToolResultEvent,
  ): Promise<PluginToolResultOverride | undefined> {
    const activePlugins = this.getPluginsForEvent("tool.result");
    if (activePlugins.length === 0) return undefined;

    const results = await Promise.all(
      activePlugins.map(async (record) => {
        try {
          return await record.host.requestToolResult(event);
        } catch (err) {
          log.debug("Failed to request tool.result from plugin", {
            uri: record.uri,
            error: err,
          });
          return undefined;
        }
      }),
    );

    // Return first non-undefined result (逆向: chunk-002.js:27639)
    for (const result of results) {
      if (result) return result;
    }

    return undefined;
  }

  // ─── Helpers ────────────────────────────────────────────

  /**
   * Get active plugins that registered for a specific event.
   * 逆向: chunk-002.js:27531-27533 (V function)
   */
  private getPluginsForEvent(event: string): PluginRecord[] {
    return this.plugins.filter(
      (p) => p.status === "active" && p.registeredEvents.has(event),
    );
  }

  /**
   * Get information about all loaded plugins.
   * 逆向: chunk-002.js:27351-27361 (v function)
   */
  getPluginInfos(): PluginInfo[] {
    return this.plugins.map((p) => ({
      uri: p.uri,
      status: p.status,
      registeredEvents: new Set(p.registeredEvents),
    }));
  }

  /**
   * Reload all plugins (stop + re-discover + restart).
   * 逆向: chunk-002.js:27527-27530 (M function)
   */
  async reload(): Promise<void> {
    if (this.disposed) return;
    log.info("Reloading all plugins");
    await this.loadPlugins();
  }

  // ─── Shutdown ───────────────────────────────────────────

  /**
   * Stop all running plugins.
   * 逆向: chunk-002.js:27512-27526 (B function)
   */
  private async stopAllPlugins(waitForExit: boolean): Promise<void> {
    const current = this.plugins;
    this.plugins = [];

    const disposePromises = current.map(async (record) => {
      try {
        await record.host.dispose();
      } catch (err) {
        log.debug("Failed to dispose plugin process", {
          uri: record.uri,
          error: err,
        });
      }
    });

    if (waitForExit) {
      await Promise.all(disposePromises);
    }
  }

  /**
   * Dispose the plugin service and all managed plugins.
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    await this.stopAllPlugins(true);
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  get pluginCount(): number {
    return this.plugins.length;
  }
}
