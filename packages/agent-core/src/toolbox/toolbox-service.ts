/**
 * @flitter/agent-core — ToolboxService
 *
 * Discovers and registers user-provided shell-script tools from configured
 * directories. Each script is probed with TOOLBOX_ACTION=describe to get
 * its schema, then registered into the ToolRegistry with a `tb__` prefix.
 *
 * 逆向: modules/1371_Toolbox_S5R.js — S5R() factory function
 *       chunk-002.js:30225-30408 — full service implementation
 *       chunk-002.js:30412-30429 — d5R() directory scanning
 */

import * as fs from "node:fs";
import { join } from "node:path";
import { createLogger } from "@flitter/util";
import type { ToolRegistry } from "../tools/registry";
import type { ToolContext, ToolResult } from "../tools/types";
import { probeToolScript, type SpawnFn } from "./describe";
import { executeToolboxScript } from "./execute";
import {
  MAX_TOOLS_PER_DIRECTORY,
  toToolboxName,
} from "./toolbox-utils";
import type {
  ToolboxStatus,
  ToolboxToolInfo,
} from "./types";

const log = createLogger("toolbox:service");

// ─── ToolboxService ─────────────────────────────────────

/**
 * ToolboxService — scans directories for toolbox scripts, probes them
 * with TOOLBOX_ACTION=describe, and registers them as tools in the ToolRegistry.
 *
 * 逆向: S5R() in modules/1371_Toolbox_S5R.js
 *   - Watches config for path changes (we simplify to imperative scan())
 *   - Spawns each script with describe, registers into toolService
 *   - Deduplicates by prefixed name
 *   - Tracks status (initializing → ready)
 */
export class ToolboxService {
  /** Registered tools keyed by prefixed name → { info, unregister callback } */
  private registrations = new Map<string, { dispose: () => void }>();

  /** All discovered tool info (keyed by filename) */
  private tools = new Map<string, ToolboxToolInfo>();

  /** Set of registered tool names (for duplicate detection) */
  private registeredNames = new Set<string>();

  /** Current scan status */
  private status: ToolboxStatus = { type: "initializing" };

  /** Injectable spawn function (for testing) */
  private spawn: SpawnFn | undefined;

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly paths: string[],
    options?: { spawn?: SpawnFn },
  ) {
    this.spawn = options?.spawn;
  }

  // ── Public API ────────────────────────────────────────

  /**
   * Scan all configured directories, probe scripts, and register tools.
   *
   * 逆向: S5R's `s()` function (chunk-002.js:30248-30330)
   *   - Iterates directories
   *   - Reads files, filters out .md and directories
   *   - Probes each script, registers into toolService
   *   - Cleans up old registrations not seen in new scan
   */
  async scan(): Promise<void> {
    log.debug("Toolbox scan triggered", { pathCount: this.paths.length });

    // Track which names are seen in this scan
    const seenInScan = new Set<string>();

    // Clean up previous state
    this.tools.clear();
    this.registeredNames.clear();

    for (const dir of this.paths) {
      await this.scanDirectory(dir, seenInScan);
    }

    // Clean up registrations that are no longer seen
    // 逆向: chunk-002.js:30328 — `for (let [y, u] of o) if (!p.has(y)) u.dispose()`
    for (const [name, reg] of this.registrations) {
      if (!seenInScan.has(name)) {
        reg.dispose();
        this.registrations.delete(name);
      }
    }

    const toolCount = this.registeredNames.size;
    this.status = { type: "ready", toolCount };
    log.debug("Toolbox scan complete", {
      toolboxCount: this.paths.length,
      toolCount,
    });
  }

  /** Get all discovered tool info */
  getTools(): ToolboxToolInfo[] {
    return Array.from(this.tools.values());
  }

  /** Get current service status */
  getStatus(): ToolboxStatus {
    return this.status;
  }

  /** Dispose all registrations */
  dispose(): void {
    for (const reg of this.registrations.values()) {
      reg.dispose();
    }
    this.registrations.clear();
    this.registeredNames.clear();
    this.tools.clear();
  }

  // ── Internal ──────────────────────────────────────────

  /**
   * Scan a single directory for toolbox scripts.
   *
   * 逆向: d5R() in chunk-002.js:30412-30429
   *   - Reads directory entries, filters out directories and .md files
   *   - Throws if > duT (100) tools found
   *   - Probes each file with C5R (describe)
   */
  private async scanDirectory(
    dir: string,
    seenInScan: Set<string>,
  ): Promise<void> {
    if (!fs.existsSync(dir)) {
      log.debug("Toolbox directory does not exist, skipping", { path: dir });
      return;
    }

    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch (err) {
      log.debug("Failed to read toolbox directory", { path: dir, error: err });
      return;
    }

    // Filter: skip directories, .md files, hidden files (.)
    // 逆向: d5R filters `!i.isDirectory && !i.uri.fsPath.endsWith(".md")`
    const files = entries.filter((f) => {
      if (f.startsWith(".")) return false;
      if (f.endsWith(".md")) return false;
      try {
        const stat = fs.statSync(join(dir, f));
        return !stat.isDirectory();
      } catch {
        return false;
      }
    });

    // 逆向: chunk-002.js:30416 — limit check
    if (files.length > MAX_TOOLS_PER_DIRECTORY) {
      log.warn(`Toolbox size exceeded (found ${files.length}, limit: ${MAX_TOOLS_PER_DIRECTORY})`, {
        path: dir,
      });
      // Still process up to the limit (consistent with plan spec)
    }

    const limited = files.slice(0, MAX_TOOLS_PER_DIRECTORY);

    // Probe all files in parallel
    // 逆向: d5R uses Promise.all on r.map(...)
    await Promise.all(
      limited.map(async (filename) => {
        const scriptPath = join(dir, filename);
        await this.probeAndRegister(filename, scriptPath, seenInScan);
      }),
    );
  }

  /**
   * Probe a single script and register it if successful.
   *
   * 逆向: The callback passed to d5R (chunk-002.js:30283-30322)
   */
  private async probeAndRegister(
    filename: string,
    scriptPath: string,
    seenInScan: Set<string>,
  ): Promise<void> {
    const describeResult = await probeToolScript(scriptPath, this.spawn);

    if (!describeResult) {
      this.tools.set(filename, {
        name: filename,
        description: "",
        status: "failed",
        error: "Failed to describe tool",
      });
      return;
    }

    const { spec, format } = describeResult;
    const toolName = toToolboxName(spec.name);

    // Duplicate detection
    // 逆向: chunk-002.js:30289-30294 — `if (_.has(I))`
    if (this.registeredNames.has(toolName)) {
      this.tools.set(filename, {
        name: spec.name,
        description: spec.description,
        status: "duplicate",
      });
      return;
    }

    this.registeredNames.add(toolName);
    seenInScan.add(toolName);

    // Dispose previous registration if re-scanning
    // 逆向: chunk-002.js:30295 — `o.get(I)?.dispose()`
    const existing = this.registrations.get(toolName);
    if (existing) {
      existing.dispose();
    }

    try {
      // Register the tool into ToolRegistry
      // 逆向: chunk-002.js:30297-30312 — registerTool with spec + fn
      //
      // The ToolRegistry.register() throws on duplicate, so we unregister first
      if (this.toolRegistry.has(toolName)) {
        this.toolRegistry.unregister(toolName);
      }

      this.toolRegistry.register({
        name: toolName,
        description: spec.description,
        source: { toolbox: scriptPath },
        isReadOnly: false,
        inputSchema: spec.inputSchema ?? {
          type: "object",
          properties: {},
        },
        executionProfile: {
          serial: false,
          resourceKeys: [],
        },
        execute: async (
          args: Record<string, unknown>,
          context: ToolContext,
        ): Promise<ToolResult> => {
          const result = await executeToolboxScript(scriptPath, args, {
            threadId: context.threadId,
            signal: context.signal,
            format,
            spawn: this.spawn,
          });
          return {
            status: result.exitCode === 0 ? "done" : "error",
            content: result.output,
          };
        },
      });

      // Store a dispose callback that unregisters from ToolRegistry
      this.registrations.set(toolName, {
        dispose: () => {
          this.toolRegistry.unregister(toolName);
        },
      });

      this.tools.set(filename, {
        name: spec.name,
        description: spec.description,
        status: "registered",
      });
    } catch (err) {
      this.tools.set(filename, {
        name: spec.name,
        description: spec.description,
        status: "failed",
        error: String(err),
      });
    }
  }
}
