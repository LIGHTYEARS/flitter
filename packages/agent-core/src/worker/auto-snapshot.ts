/**
 * Auto-Snapshot: Git tree snapshot utility
 *
 * Creates and restores git tree snapshots for undo/rollback support.
 * Gated by `experimental.autoSnapshot` setting.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:21422-21500
 *   - FwR (createSnapshot): git read-tree HEAD → git add -A → git write-tree → git update-ref
 *   - GwR (isGitRepo): git rev-parse --git-dir
 *   - VwR (restoreSnapshot): git checkout --no-overlay <treeOID> -- .
 *
 * Architecture:
 *   In amp, auto-snapshot is called from the handle pipeline (chunk-002.js:21889-21916)
 *   BEFORE the message reaches the ThreadWorker. When experimental.autoSnapshot is true
 *   and the event is a user:message, amp:
 *   1. Creates tree snapshots for each workspace root
 *   2. Stores the snapshot OIDs in userState.snapshotOIDs on the message
 *   3. On truncation/undo, calls restoreSnapshot to revert to the saved tree
 */
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlinkSync } from "node:fs";

// ─── Types ─────────────────────────────────────────────

/**
 * A snapshot OID representing a git tree state.
 * 逆向: amp-cli-reversed/chunk-005.js:155833
 *   `snapshotOIDs: K.array(ms0).optional()`
 *   where ms0 = { treeOID: string, repoRoot: string }
 */
export interface SnapshotOID {
  /** The git tree object ID */
  treeOID: string;
  /** Absolute path to the git repository root */
  repoRoot: string;
}

// ─── Git helpers ───────────────────────────────────────

/**
 * Run a git command and return stdout (trimmed).
 * Uses a separate process to avoid blocking the event loop.
 */
function gitExec(
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      {
        cwd: opts.cwd,
        env: opts.env ? { ...process.env, ...opts.env } : undefined,
        timeout: 30_000,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`git ${args[0]} failed: ${stderr || error.message}`));
        } else {
          resolve(stdout.trim());
        }
      },
    );
  });
}

// ─── Public API ────────────────────────────────────────

/**
 * Check if a directory is inside a git repository.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:21461-21468 (GwR)
 *   `return await ks(["rev-parse", "--git-dir"], { cwd: T }), !0;`
 */
export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await gitExec(["rev-parse", "--git-dir"], { cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a git tree snapshot of the working directory.
 *
 * Uses a temporary index file to avoid disturbing the main index.
 * Returns a SnapshotOID with the tree hash and repo root.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:21422-21460 (FwR)
 *   1. Create temp index: GIT_INDEX_FILE=<tmp>
 *   2. git read-tree HEAD (or --empty if no HEAD)
 *   3. git add -A
 *   4. git write-tree → treeOID
 *   5. git update-ref refs/amp/snapshots/<threadId>/<messageId> <treeOID>
 *   6. Cleanup temp index
 */
export async function createSnapshot(
  repoRoot: string,
  threadId: string,
  messageId: number,
): Promise<SnapshotOID> {
  const tmpIndex = join(tmpdir(), `flitter-snapshot-${threadId}-${messageId}-${Date.now()}`);
  const env = {
    GIT_INDEX_FILE: tmpIndex,
    GIT_WORK_TREE: repoRoot,
  };

  try {
    // 逆向: try read-tree HEAD, fallback to --empty
    try {
      await gitExec(["read-tree", "HEAD"], { cwd: repoRoot, env });
    } catch {
      await gitExec(["read-tree", "--empty"], { cwd: repoRoot, env });
    }

    // Stage all changes
    await gitExec(["add", "-A"], { cwd: repoRoot, env });

    // Write the tree object
    const treeOID = await gitExec(["write-tree"], { cwd: repoRoot, env });

    // Store as a ref for later retrieval
    // 逆向: `refs/amp/snapshots/${R}/${a}`
    const ref = `refs/flitter/snapshots/${threadId}/${messageId}`;
    await gitExec(
      ["update-ref", "-m", `flitter snapshot ${threadId} ${messageId}`, ref, treeOID],
      { cwd: repoRoot },
    );

    return { treeOID, repoRoot };
  } finally {
    // Clean up temp index
    try {
      unlinkSync(tmpIndex);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Create snapshots for multiple workspace roots.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:21900-21902
 *   `h = await s(c ? [c] : [], this.threadID, i);`
 *
 * @param roots Array of workspace root paths to snapshot
 * @param threadId Current thread ID
 * @param messageId Current message ID
 * @returns Array of SnapshotOIDs (one per repo root that is a git repo)
 */
export async function createSnapshots(
  roots: string[],
  threadId: string,
  messageId: number,
): Promise<SnapshotOID[]> {
  const results: SnapshotOID[] = [];

  for (const root of roots) {
    if (await isGitRepo(root)) {
      try {
        const snapshot = await createSnapshot(root, threadId, messageId);
        results.push(snapshot);
      } catch {
        // 逆向: amp silently skips failed snapshots
      }
    }
  }

  return results;
}

/**
 * Restore the working directory to a previously saved snapshot.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:21461-21500 (GwR + restoreSnapshot)
 *   Uses a temporary index to checkout the saved tree:
 *   1. git read-tree <treeOID> (or --empty fallback + add -A)
 *   2. git checkout --no-overlay <treeOID> -- .
 */
export async function restoreSnapshot(snapshot: SnapshotOID): Promise<void> {
  const tmpIndex = join(tmpdir(), `flitter-restore-${Date.now()}`);
  const env = {
    GIT_INDEX_FILE: tmpIndex,
    GIT_WORK_TREE: snapshot.repoRoot,
  };

  try {
    // 逆向: amp-cli-reversed/chunk-002.js:21474-21494
    try {
      await gitExec(["read-tree", snapshot.treeOID], { cwd: snapshot.repoRoot, env });
    } catch {
      await gitExec(["read-tree", "--empty"], { cwd: snapshot.repoRoot, env });
    }

    await gitExec(["add", "-A"], { cwd: snapshot.repoRoot, env });

    // Checkout the tree
    await gitExec(
      ["checkout", "--no-overlay", snapshot.treeOID, "--", "."],
      { cwd: snapshot.repoRoot, env },
    );
  } finally {
    try {
      unlinkSync(tmpIndex);
    } catch {
      // Ignore cleanup errors
    }
  }
}
