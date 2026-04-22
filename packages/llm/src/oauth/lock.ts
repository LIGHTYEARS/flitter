/**
 * @flitter/llm -- OAuth Cross-Process File Locking
 *
 * PID-based file lock so that when multiple CLI processes try to start an
 * OAuth callback server simultaneously, they coordinate instead of conflicting
 * on the port.
 *
 * Uses atomic fs.link() from temp file -> lock file (standard POSIX advisory locking).
 *
 * 逆向: dj() (acquire), ED() (release), yL() (read lock), zW() (stale check)
 * amp-cli-reversed/modules/1670_unknown_dj.js
 * amp-cli-reversed/modules/1671_unknown_ED.js
 * amp-cli-reversed/modules/1669_unknown_yL.js
 * amp-cli-reversed/chunk-001.js lines 7624-7769
 * amp-cli-reversed/chunk-005.js line 69513 (lock dir = path.join(dataDir, "oauth", "locks"))
 * amp-cli-reversed/chunk-005.js lines 13391-13394 (constants)
 */

import { randomBytes } from "node:crypto";
import * as fs from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";
import { createLogger } from "@flitter/util";

const log = createLogger("oauth:lock");

// ---------------------------------------------------------------------------
// Constants (from amp-cli-reversed/chunk-005.js lines 13391-13394)
// ---------------------------------------------------------------------------

/** Maximum age of a lock before it's considered stale: 5 minutes (SpR = 300000) */
export const STALE_LOCK_TIMEOUT_MS = 300_000;

/** Poll interval when waiting for tokens from another instance: 2 seconds (a4T = 2000) */
export const LOCK_POLL_INTERVAL_MS = 2_000;

/** Maximum time to wait for tokens from another instance: 5 minutes (FW = 300000) */
export const LOCK_WAIT_TIMEOUT_MS = 300_000;

// ---------------------------------------------------------------------------
// Lock file data
// ---------------------------------------------------------------------------

/**
 * Data stored in the lock file. Matches amp's lock file structure.
 */
export interface LockData {
  pid: number;
  timestamp: number;
  hostname: string;
}

/**
 * Result of attempting to acquire the lock.
 */
export type AcquireLockResult = { acquired: true } | { acquired: false; holder: LockData };

// ---------------------------------------------------------------------------
// Lock directory configuration
// ---------------------------------------------------------------------------

let _lockDir: string | undefined;

/**
 * Get the lock directory, creating it if needed.
 * Default: ~/.local/share/flitter/oauth/locks (matches amp's pattern:
 * R9T = path.join(RN, "oauth", "locks") where RN = ~/.local/share/amp)
 */
export function getLockDir(): string {
  if (_lockDir) return _lockDir;
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return join(home, ".local", "share", "flitter", "oauth", "locks");
}

/**
 * Override the lock directory. Primarily for testing.
 */
export function setLockDir(dir: string): void {
  _lockDir = dir;
}

/**
 * Reset the lock directory to the default. For testing.
 */
export function resetLockDir(): void {
  _lockDir = undefined;
}

// ---------------------------------------------------------------------------
// Internal helpers
// 逆向: $pR (sanitize), _N (lock path), vpR (ensure dir), jpR (pid alive), zW (stale check)
// ---------------------------------------------------------------------------

/**
 * Sanitize a server name for use as a filename.
 * 逆向: $pR — T.replace(/[^a-zA-Z0-9_-]/g, "_")
 */
function sanitizeName(serverName: string): string {
  return serverName.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Get the lock file path for a server name.
 * 逆向: _N — path.join(R9T, `${$pR(T)}.lock`)
 */
export function getLockPath(serverName: string): string {
  return join(getLockDir(), `${sanitizeName(serverName)}.lock`);
}

/**
 * Ensure the lock directory exists.
 * 逆向: vpR — fs.mkdir(R9T, { recursive: true, mode: 0o700 })
 * Mode 448 decimal = 0o700 (owner read/write/execute only)
 */
async function ensureLockDir(): Promise<void> {
  await fs.mkdir(getLockDir(), { recursive: true, mode: 0o700 });
}

/**
 * Check if a process is alive by sending signal 0.
 * 逆向: jpR — process.kill(T, 0) wrapped in try/catch
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a lock is stale.
 * A lock is stale if:
 * 1. It's older than STALE_LOCK_TIMEOUT_MS, OR
 * 2. It's from the same hostname and the PID is dead
 *
 * 逆向: zW
 */
export function isLockStale(lock: LockData): boolean {
  // Check age first
  if (Date.now() - lock.timestamp > STALE_LOCK_TIMEOUT_MS) return true;

  // If same hostname, check if PID is alive
  const currentHost = hostname();
  if (lock.hostname === currentHost && !isProcessAlive(lock.pid)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Read lock
// 逆向: yL — read and parse the lock file, return null if absent or invalid
// ---------------------------------------------------------------------------

/**
 * Read the current lock data for a server name.
 * Returns null if no lock exists or the lock file is invalid.
 *
 * 逆向: yL (amp-cli-reversed/modules/1669_unknown_yL.js lines 36-52)
 */
export async function readOAuthLock(serverName: string): Promise<LockData | null> {
  const lockPath = getLockPath(serverName);
  try {
    const content = await fs.readFile(lockPath, "utf8");
    const data = JSON.parse(content) as Record<string, unknown>;

    // Validate structure (from amp: typeof e.pid !== "number" || typeof e.timestamp !== "number")
    if (typeof data.pid !== "number" || typeof data.timestamp !== "number") {
      log.warn("Invalid lock file structure, treating as stale", {
        serverName,
        lockPath,
      });
      return null;
    }

    return data as unknown as LockData;
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error?.code === "ENOENT") return null;
    log.debug("Failed to read lock file", {
      serverName,
      error: error?.message,
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Acquire lock
// 逆向: dj (amp-cli-reversed/modules/1670_unknown_dj.js)
// Uses atomic temp-file + fs.link pattern for race-condition safety
// ---------------------------------------------------------------------------

/**
 * Attempt to acquire the OAuth lock for a server name.
 *
 * Algorithm (from amp):
 * 1. Ensure lock directory exists
 * 2. Read existing lock; if stale, remove it; if valid, return not-acquired
 * 3. Write lock data to a temp file (exclusive create)
 * 4. Atomic link temp -> lock path
 * 5. On EEXIST during link: re-read lock to see who won the race
 * 6. Clean up temp file in all paths
 *
 * 逆向: dj (amp-cli-reversed/modules/1670_unknown_dj.js)
 */
export async function acquireOAuthLock(serverName: string): Promise<AcquireLockResult> {
  await ensureLockDir();

  const lockPath = getLockPath(serverName);

  // Check for existing lock
  const existing = await readOAuthLock(serverName);
  if (existing) {
    if (isLockStale(existing)) {
      log.info("Removing stale OAuth lock", {
        serverName,
        stalePid: existing.pid,
        ageMs: Date.now() - existing.timestamp,
      });
      try {
        await fs.unlink(lockPath);
      } catch {
        // Ignore — may have been removed by another process
      }
    } else {
      log.debug("OAuth lock held by another process", {
        serverName,
        holderPid: existing.pid,
        ageMs: Date.now() - existing.timestamp,
      });
      return { acquired: false, holder: existing };
    }
  }

  // Prepare lock data
  const lockData: LockData = {
    pid: process.pid,
    timestamp: Date.now(),
    hostname: hostname(),
  };
  const content = JSON.stringify(lockData);

  // Temp file path: lockPath.PID.randomHex
  // 逆向: `${R}.${process.pid}.${IpR(4).toString("hex")}`
  const tempPath = `${lockPath}.${process.pid}.${randomBytes(4).toString("hex")}`;

  try {
    // Write to temp file with exclusive create (wx = O_WRONLY | O_CREAT | O_EXCL)
    // Mode 384 decimal = 0o600 (owner read/write only)
    const handle = await fs.open(tempPath, "wx", 0o600);
    try {
      await handle.writeFile(content);
      await handle.sync();
    } finally {
      await handle.close();
    }

    // Atomic link: temp -> lock path
    try {
      await fs.link(tempPath, lockPath);
      // Link succeeded — we hold the lock
      await fs.unlink(tempPath).catch(() => {});
      log.info("Acquired OAuth lock", {
        serverName,
        pid: process.pid,
      });
      return { acquired: true };
    } catch (linkErr: unknown) {
      const error = linkErr as NodeJS.ErrnoException;
      // Clean up temp file
      await fs.unlink(tempPath).catch(() => {});

      if (error?.code === "EEXIST") {
        // Another process won the race — check who holds the lock
        const winner = await readOAuthLock(serverName);
        if (winner && !isLockStale(winner)) {
          log.debug("Lost OAuth lock race to another process", {
            serverName,
            winnerPid: winner.pid,
          });
          return { acquired: false, holder: winner };
        }
        // Winner's lock is stale or gone — retry
        return acquireOAuthLock(serverName);
      }
      throw error;
    }
  } catch (outerErr: unknown) {
    const error = outerErr as NodeJS.ErrnoException;
    // Clean up temp file on any error
    await fs.unlink(tempPath).catch(() => {});

    if (error?.code === "EEXIST") {
      // Temp file already exists (extremely unlikely with random suffix)
      const winner = await readOAuthLock(serverName);
      if (winner && !isLockStale(winner)) {
        return { acquired: false, holder: winner };
      }
      return acquireOAuthLock(serverName);
    }

    log.error("Failed to acquire OAuth lock", {
      serverName,
      error: error?.message,
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Release lock
// 逆向: ED (amp-cli-reversed/modules/1671_unknown_ED.js)
// ---------------------------------------------------------------------------

/**
 * Release the OAuth lock for a server name.
 * Only removes the lock if it belongs to the current process.
 *
 * 逆向: ED (amp-cli-reversed/modules/1671_unknown_ED.js)
 */
export async function releaseOAuthLock(serverName: string): Promise<void> {
  const lockPath = getLockPath(serverName);
  try {
    const lock = await readOAuthLock(serverName);

    if (!lock) {
      log.debug("No lock to release", { serverName });
      return;
    }

    if (lock.pid !== process.pid) {
      log.warn("Cannot release lock owned by another process", {
        serverName,
        ownerPid: lock.pid,
        ourPid: process.pid,
      });
      return;
    }

    await fs.unlink(lockPath);
    log.info("Released OAuth lock", {
      serverName,
      pid: process.pid,
    });
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error?.code === "ENOENT") return;
    log.error("Failed to release OAuth lock", {
      serverName,
      error: error?.message,
    });
  }
}
