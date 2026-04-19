/**
 * @flitter/data — GitFileWatcher
 *
 * Polls `git status --porcelain` at configurable interval to detect file changes.
 * 逆向: amp-cli-reversed/modules/0305_unknown_vv.js (class vv)
 * Factory: amp-cli-reversed/modules/0306_GitFileWatcher_KKT.js
 *
 * Simplified version: uses `git status --porcelain` polling instead of amp's
 * more complex ls-files + deleted scan approach. The amp reference has three
 * watcher types:
 *   - vv (git-based, with ls-files and full status fallback)
 *   - GKT (generic polling)
 *   - FKT (no-op)
 *
 * This implementation covers the primary git-based use case.
 */
import { createLogger } from "@flitter/util";

const log = createLogger("git-file-watcher");

/**
 * File change status from git porcelain output.
 * 逆向: vv.parseStatus() parses git status output into created/deleted types
 */
export interface GitFileChange {
  path: string;
  status: "M" | "A" | "D" | "??";
}

/**
 * File system event emitted on change.
 * 逆向: vv callbacks receive events with type, path, timestamp, isDirectory
 */
export interface FileSystemEvent {
  type: "created" | "modified" | "deleted";
  path: string;
  timestamp: number;
}

export type FileSystemEventCallback = (events: FileSystemEvent[]) => void;

export interface GitFileWatcherOptions {
  /** Root path to watch (default: cwd) */
  rootPath?: string;
  /** Poll interval in ms (default: 5000) */
  pollInterval?: number;
}

/**
 * GitFileWatcher — polls git status to detect file changes.
 * 逆向: amp-cli-reversed/modules/0305_unknown_vv.js
 *
 * Lifecycle: start() -> polling -> stop() / dispose()
 */
export class GitFileWatcher {
  private readonly rootPath: string;
  private readonly pollInterval: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private callbacks: FileSystemEventCallback[] = [];
  private lastStatus = new Map<string, string>();
  private _disposed = false;

  /** Cumulative file change counts for session summary */
  private cumulativeChanges = { created: 0, modified: 0, deleted: 0 };

  constructor(options: GitFileWatcherOptions = {}) {
    this.rootPath = options.rootPath ?? process.cwd();
    this.pollInterval = options.pollInterval ?? 5000;
  }

  /**
   * Start polling git status.
   * 逆向: vv.watch(T) — initialises and starts scanning
   */
  start(): void {
    if (this.timer) return;
    if (this._disposed) return;

    log.debug("Starting GitFileWatcher", { rootPath: this.rootPath, pollInterval: this.pollInterval });

    // Do an initial scan
    this.scan().catch((err) => {
      log.warn("Initial git scan failed", { error: err instanceof Error ? err.message : String(err) });
    });

    this.timer = setInterval(() => {
      this.scan().catch((err) => {
        log.warn("Git scan failed", { error: err instanceof Error ? err.message : String(err) });
      });
    }, this.pollInterval);
  }

  /**
   * Stop polling.
   * 逆向: vv.unwatch(T) — stops scanning for a repo
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Register a callback for file system events.
   * 逆向: vv.onFileSystemEvent(T) — line 41
   */
  onFileSystemEvent(callback: FileSystemEventCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Unregister a callback.
   * 逆向: vv.offFileSystemEvent(T) — lines 43-46
   */
  offFileSystemEvent(callback: FileSystemEventCallback): void {
    const idx = this.callbacks.indexOf(callback);
    if (idx !== -1) this.callbacks.splice(idx, 1);
  }

  /**
   * Dispose: stop polling and clear callbacks.
   * 逆向: vv.dispose() — lines 37-39
   */
  dispose(): void {
    this._disposed = true;
    this.stop();
    this.callbacks.length = 0;
    this.lastStatus.clear();
  }

  /** Whether this watcher has been disposed */
  get disposed(): boolean {
    return this._disposed;
  }

  /** Get cumulative change counts for session summary */
  getCumulativeChanges(): { created: number; modified: number; deleted: number } {
    return { ...this.cumulativeChanges };
  }

  /**
   * Force a scan now.
   * 逆向: vv.triggerScan(T, R) — lines 59-76
   */
  async triggerScan(): Promise<void> {
    await this.scan();
  }

  /**
   * Parse git status --porcelain output into file changes.
   * 逆向: vv.parseStatus(T) — lines 230-257
   */
  static parseGitStatus(output: string): GitFileChange[] {
    const changes: GitFileChange[] = [];
    const lines = output.split("\n");
    for (const line of lines) {
      if (!line || line.length < 3) continue;
      const xy = line.substring(0, 2);
      const filePath = line.substring(3);

      if (xy === "??") {
        changes.push({ path: filePath, status: "??" });
      } else if (xy[0] === "A" || xy[1] === "A") {
        changes.push({ path: filePath, status: "A" });
      } else if (xy[0] === "D" || xy[1] === "D") {
        changes.push({ path: filePath, status: "D" });
      } else if (xy[0] === "M" || xy[1] === "M") {
        changes.push({ path: filePath, status: "M" });
      } else if (xy.trim().length > 0) {
        // Other statuses (R, C, U, etc.) treated as modified
        changes.push({ path: filePath, status: "M" });
      }
    }
    return changes;
  }

  /**
   * Check if a path is a git repository.
   * 逆向: vv.isRepo(T) — lines 2-8
   */
  static isRepo(rootPath: string): boolean {
    try {
      const { execSync } = require("node:child_process");
      execSync("git rev-parse --is-inside-work-tree", { cwd: rootPath, stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Internal ──────────────────────────────────────────

  private async scan(): Promise<void> {
    const { exec } = await import("node:child_process");

    const output = await new Promise<string>((resolve, reject) => {
      exec(
        "git status --porcelain",
        { cwd: this.rootPath, maxBuffer: 16 * 1024 * 1024 },
        (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        },
      );
    });

    const changes = GitFileWatcher.parseGitStatus(output);
    const newStatus = new Map<string, string>();
    for (const c of changes) {
      newStatus.set(c.path, c.status);
    }

    // Compare with last status to detect events
    const events: FileSystemEvent[] = [];
    const now = Date.now();

    // New or changed files
    for (const [filePath, status] of newStatus) {
      const prev = this.lastStatus.get(filePath);
      if (!prev) {
        // New file appeared
        if (status === "D") {
          events.push({ type: "deleted", path: filePath, timestamp: now });
          this.cumulativeChanges.deleted++;
        } else if (status === "??" || status === "A") {
          events.push({ type: "created", path: filePath, timestamp: now });
          this.cumulativeChanges.created++;
        } else {
          events.push({ type: "modified", path: filePath, timestamp: now });
          this.cumulativeChanges.modified++;
        }
      } else if (prev !== status) {
        // Status changed
        if (status === "D") {
          events.push({ type: "deleted", path: filePath, timestamp: now });
          this.cumulativeChanges.deleted++;
        } else {
          events.push({ type: "modified", path: filePath, timestamp: now });
          this.cumulativeChanges.modified++;
        }
      }
    }

    // Files that disappeared from status (were cleaned up / committed)
    for (const [filePath] of this.lastStatus) {
      if (!newStatus.has(filePath)) {
        // File was resolved (committed, discarded, etc.)
        // We don't emit an event for this — it's not a deletion
      }
    }

    this.lastStatus = newStatus;

    if (events.length > 0) {
      log.debug("Git file changes detected", {
        count: events.length,
        rootPath: this.rootPath,
      });
      for (const cb of this.callbacks) {
        try {
          cb(events);
        } catch (err) {
          log.error("File event callback error", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }
}
