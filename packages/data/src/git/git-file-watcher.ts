/**
 * GitFileWatcher — watches for file changes using git ls-files polling
 *
 * 逆向: amp-cli-reversed/modules/0305_unknown_vv.js (vv class — GitFileWatcher)
 *       amp-cli-reversed/modules/0304_unknown_GKT.js (GKT — PollingFileWatcher)
 *       amp-cli-reversed/modules/0303_unknown_FKT.js (FKT — NoOpFileWatcher)
 *       amp-cli-reversed/modules/0306_GitFileWatcher_KKT.js (KKT — factory)
 *
 * Behavior from amp reference (vv class):
 * - Uses `git ls-files --others --exclude-standard -z` to detect new untracked files
 * - Uses `git ls-files --deleted -z` to detect deleted files
 * - Maintains a set of previously seen untracked files to compute diffs
 * - Falls back to `git status --porcelain=v2 -z` on ls-files failure
 * - Scan cooldown prevents thrashing (default 5000ms)
 * - Callbacks list for file system event notification
 * - Factory function (KKT) tries git first, falls back to polling, then no-op
 */
import * as path from "node:path";
import { createLogger, spawn } from "@flitter/util";

const log = createLogger("git-file-watcher");

export interface FileSystemEvent {
  type: "created" | "modified" | "deleted";
  path: string;
  timestamp: number;
  isDirectory: boolean;
}

export type FileWatcherCallback = (events: FileSystemEvent[]) => void;

/**
 * FileWatcher interface — shared by GitFileWatcher, PollingFileWatcher, NoOpFileWatcher
 * 逆向: common interface between vv, GKT, FKT classes
 */
export interface FileWatcher {
  watch(dirPath: string): Promise<void>;
  unwatch(dirPath: string): void;
  dispose(): void;
  onFileSystemEvent(callback: FileWatcherCallback): void;
  offFileSystemEvent(callback: FileWatcherCallback): void;
  getWatchedPaths(): string[];
  isSupported(): boolean;
}

interface RepoState {
  lastScanTime: number;
  seenUntracked: Set<string>;
  cancelled?: boolean;
}

/**
 * 逆向: vv class from 0305_unknown_vv.js
 * Git-based file watcher that uses `git ls-files` for efficient change detection.
 */
export class GitFileWatcher implements FileWatcher {
  private repos = new Map<string, RepoState>();
  private callbacks: FileWatcherCallback[] = [];
  private ongoingScans = new Map<string, Promise<void>>();
  private scanCooldownMs: number;

  constructor(pollInterval = 5000) {
    this.scanCooldownMs = pollInterval;
  }

  /**
   * 逆向: vv.isRepo() — lines 2-9
   * Synchronous check whether a path is inside a git work tree.
   */
  static isRepo(dirPath: string): boolean {
    try {
      const { execSync } = require("node:child_process");
      execSync("git rev-parse --is-inside-work-tree", {
        cwd: dirPath,
        stdio: "ignore",
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 逆向: vv.resolveRepoRoot() — lines 19-24
   */
  private async resolveRepoRoot(dirPath: string): Promise<string> {
    const result = await spawn("git", ["rev-parse", "--show-toplevel"], {
      cwd: dirPath,
    });
    return result.stdout.trim();
  }

  /**
   * 逆向: vv.watch() — lines 25-30
   */
  async watch(dirPath: string): Promise<void> {
    const root = await this.resolveRepoRoot(dirPath);
    if (this.repos.has(root)) return;
    await this.initialise(root);
  }

  /**
   * 逆向: vv.unwatch() — lines 31-34
   */
  unwatch(dirPath: string): void {
    if (!this.repos.get(dirPath)) return;
    this.repos.delete(dirPath);
    this.ongoingScans.delete(dirPath);
  }

  /**
   * 逆向: vv.dispose() — lines 35-38
   */
  dispose(): void {
    for (const key of Array.from(this.repos.keys())) {
      this.unwatch(key);
    }
    this.callbacks.length = 0;
  }

  /**
   * 逆向: vv.onFileSystemEvent() — line 40
   */
  onFileSystemEvent(callback: FileWatcherCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 逆向: vv.offFileSystemEvent() — lines 43-46
   */
  offFileSystemEvent(callback: FileWatcherCallback): void {
    const idx = this.callbacks.indexOf(callback);
    if (idx !== -1) this.callbacks.splice(idx, 1);
  }

  /**
   * 逆向: vv.getWatchedPaths() — lines 47-49
   */
  getWatchedPaths(): string[] {
    return Array.from(this.repos.keys());
  }

  /**
   * 逆向: vv.isSupported() — lines 50-57
   */
  isSupported(): boolean {
    try {
      const { execSync } = require("node:child_process");
      execSync("git --version", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 逆向: vv.triggerScan() — lines 58-76
   */
  async triggerScan(dirPath: string, force = false): Promise<void> {
    const root = await this.resolveRepoRoot(dirPath);
    const state = this.repos.get(root);

    if (!state) {
      log.debug("First time watching repo", { repoRoot: root });
      await this.watch(dirPath);
      return;
    }

    const now = Date.now();
    const elapsed = now - state.lastScanTime;

    if (!force && elapsed < this.scanCooldownMs) return;

    log.debug("Starting scan", { repoRoot: root, force, timeSinceLastScan: elapsed });
    state.lastScanTime = now;
    await this.scan(root);
  }

  /**
   * 逆向: vv.initialise() — lines 86-101
   */
  private async initialise(repoRoot: string): Promise<void> {
    const now = Date.now();

    const result = await spawn("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
      cwd: repoRoot,
      maxBuffer: 67_108_864,
    });

    const seenUntracked = new Set<string>();
    const files = result.stdout.split("\0").filter(Boolean);
    for (const file of files) {
      seenUntracked.add(path.resolve(repoRoot, file));
    }

    this.repos.set(repoRoot, {
      lastScanTime: now,
      seenUntracked,
    });
  }

  /**
   * 逆向: vv.scan() — lines 102-112
   */
  private async scan(repoRoot: string): Promise<void> {
    const state = this.repos.get(repoRoot);
    if (!state || state.cancelled) return;

    const scanPromise = this.performScan(repoRoot);
    this.ongoingScans.set(repoRoot, scanPromise);

    try {
      await scanPromise;
    } finally {
      if (this.ongoingScans.get(repoRoot) === scanPromise) {
        this.ongoingScans.delete(repoRoot);
      }
    }
  }

  /**
   * 逆向: vv.performScan() — lines 113-167
   * Uses git ls-files to detect new and deleted files efficiently.
   */
  private async performScan(repoRoot: string): Promise<void> {
    const state = this.repos.get(repoRoot);
    if (!state || state.cancelled) return;

    const now = Date.now();

    try {
      const [untrackedResult, deletedResult] = await Promise.all([
        spawn("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
          cwd: repoRoot,
          timeout: 60_000,
        }),
        spawn("git", ["ls-files", "--deleted", "-z"], {
          cwd: repoRoot,
          timeout: 60_000,
        }),
      ]);

      const untrackedFiles = untrackedResult.stdout.split("\0").filter(Boolean);
      const deletedFiles = deletedResult.stdout.split("\0").filter(Boolean);

      const currentState = this.repos.get(repoRoot);
      if (!currentState || currentState.cancelled) return;

      const events: FileSystemEvent[] = [];
      const currentUntracked = new Set<string>();

      // Detect newly created files
      for (const file of untrackedFiles) {
        const fullPath = path.resolve(repoRoot, file);
        currentUntracked.add(fullPath);

        if (!currentState.seenUntracked.has(fullPath)) {
          events.push({
            type: "created",
            path: fullPath,
            timestamp: now,
            isDirectory: false,
          });
        }
      }

      // Detect files that disappeared from untracked set
      for (const prevPath of currentState.seenUntracked) {
        if (!currentUntracked.has(prevPath)) {
          events.push({
            type: "deleted",
            path: prevPath,
            timestamp: now,
            isDirectory: false,
          });
        }
      }

      // Detect git-tracked deleted files
      for (const file of deletedFiles) {
        const fullPath = path.resolve(repoRoot, file);
        events.push({
          type: "deleted",
          path: fullPath,
          timestamp: now,
          isDirectory: false,
        });
      }

      // Update state
      currentState.seenUntracked = currentUntracked;
      currentState.lastScanTime = now;

      // Notify callbacks
      if (events.length > 0) {
        for (const cb of this.callbacks) cb(events);
      }
    } catch (err) {
      log.warn("Git ls-files scan failed", {
        repoRoot,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - now,
      });
    }
  }
}

/**
 * 逆向: FKT class from 0303_unknown_FKT.js
 * No-op file watcher for non-git directories.
 */
export class NoOpFileWatcher implements FileWatcher {
  async watch(_dirPath: string): Promise<void> {}
  unwatch(_dirPath: string): void {}
  dispose(): void {}
  onFileSystemEvent(_callback: FileWatcherCallback): void {}
  offFileSystemEvent(_callback: FileWatcherCallback): void {}
  getWatchedPaths(): string[] {
    return [];
  }
  isSupported(): boolean {
    return false;
  }
}

export interface FileWatcherFactoryOptions {
  useGit?: boolean;
  usePolling?: boolean;
  pollInterval?: number;
  rootPath?: string;
}

/**
 * 逆向: KKT function from 0306_GitFileWatcher_KKT.js
 * Factory that picks the best file watcher for the environment.
 */
export function createFileWatcher(options?: FileWatcherFactoryOptions): FileWatcher {
  // 逆向: if (T?.useGit) return new vv(T.pollInterval);
  if (options?.useGit) {
    return new GitFileWatcher(options.pollInterval);
  }

  const rootPath = options?.rootPath ?? process.cwd();

  // 逆向: if (vv.isRepo(R)) { ... }
  if (GitFileWatcher.isRepo(rootPath)) {
    const watcher = new GitFileWatcher(options?.pollInterval);
    if (watcher.isSupported()) {
      log.info("Git repository detected, using GitFileWatcher", { rootPath });
      return watcher;
    }
  }

  // 逆向: return new FKT();
  log.info("Not a git repository, using NoOpFileWatcher", { rootPath });
  return new NoOpFileWatcher();
}
