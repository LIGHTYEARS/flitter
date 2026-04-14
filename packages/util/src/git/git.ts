/**
 * Git status detection utilities
 *
 * Provides captureGitStatus aggregated snapshot, porcelain status parsing,
 * branch detection, and diff retrieval.
 *
 * @example
 * ```ts
 * import { captureGitStatus, isGitRepository } from '@flitter/util';
 * if (await isGitRepository('/path/to/repo')) {
 *   const status = await captureGitStatus('/path/to/repo');
 *   console.log(status.branch, status.files.length);
 * }
 * ```
 */
import * as path from "node:path";
import { spawn } from "../process";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface DiffStat {
  additions: number;
  deletions: number;
}

export interface GitFileChange {
  path: string;
  previousPath?: string;
  changeType: "modified" | "added" | "deleted" | "renamed" | "untracked";
  created: boolean;
  diff: string | null;
  fullFileDiff: string | null;
  oldContent: string | undefined;
  newContent: string | undefined;
  diffStat: DiffStat;
}

export interface AheadCommit {
  sha: string;
  message: string;
}

export interface GitStatusSnapshot {
  provider: "git";
  capturedAt: number;
  available: boolean;
  repositoryRoot: string;
  repositoryName: string;
  branch: string | null;
  head: string | null;
  baseRef: string | null;
  baseRefHead: string | null;
  aheadCount: number;
  behindCount: number | undefined;
  aheadCommits: AheadCommit[];
  files: GitFileChange[];
}

export interface StatusEntry {
  x: string;
  y: string;
  path: string;
  origPath?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_DIFF_BYTES = 50 * 1024; // 50 KB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run a git command in the given working directory.
 * Returns the SpawnResult.  Callers should inspect exitCode.
 */
async function git(cwd: string, args: string[]) {
  return spawn("git", args, { cwd });
}

// ---------------------------------------------------------------------------
// parsePortalainStatus
// ---------------------------------------------------------------------------

/**
 * Parse the output of `git status --porcelain=v1 -z` (NUL-separated).
 *
 * Normal entries:  `XY PATH\0`
 * Rename/copy entries: `XY NEW_PATH\0ORIG_PATH\0`
 */
export function parsePortalainStatus(output: string): StatusEntry[] {
  if (!output || output.trim() === "") return [];

  const entries: StatusEntry[] = [];
  const parts = output.split("\0");
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];
    if (part === undefined || part.length < 3) {
      i++;
      continue;
    }

    const x = part[0]!;
    const y = part[1]!;
    // part[2] is the space separator
    const filePath = part.slice(3);

    if (x === "R" || x === "C" || y === "R" || y === "C") {
      // Next NUL-delimited segment is the original (old) path
      i++;
      const origPath = parts[i] ?? "";
      entries.push({ x, y, path: filePath, origPath });
    } else {
      entries.push({ x, y, path: filePath });
    }
    i++;
  }

  return entries;
}

// ---------------------------------------------------------------------------
// statusEntryToChangeType
// ---------------------------------------------------------------------------

export function statusEntryToChangeType(entry: StatusEntry): GitFileChange["changeType"] {
  if (entry.x === "?" && entry.y === "?") return "untracked";
  if (entry.x === "R" || entry.y === "R") return "renamed";
  if (entry.x === "C" || entry.y === "C") return "renamed"; // copy treated as rename
  if (entry.x === "A" || entry.y === "A") return "added";
  if (entry.x === "D" || entry.y === "D") return "deleted";
  return "modified";
}

// ---------------------------------------------------------------------------
// isGitRepository
// ---------------------------------------------------------------------------

export async function isGitRepository(dirPath: string): Promise<boolean> {
  try {
    const result = await git(dirPath, ["rev-parse", "--is-inside-work-tree"]);
    return result.exitCode === 0;
  } catch {
    // ENOENT (git not installed) or other spawn errors
    return false;
  }
}

// ---------------------------------------------------------------------------
// getCurrentBranch
// ---------------------------------------------------------------------------

export async function getCurrentBranch(repoRoot: string): Promise<string | null> {
  try {
    const result = await git(repoRoot, ["symbolic-ref", "--short", "HEAD"]);
    if (result.exitCode === 0) {
      return result.stdout.trim() || null;
    }
    return null; // detached HEAD
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// getGitDiff
// ---------------------------------------------------------------------------

export async function getGitDiff(repoRoot: string, ref?: string): Promise<string> {
  try {
    const args = ref ? ["diff", ref] : ["diff", "HEAD"];
    const result = await git(repoRoot, args);
    return result.stdout;
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers for captureGitStatus
// ---------------------------------------------------------------------------

async function getFileDiff(
  repoRoot: string,
  filePath: string,
  maxBytes: number,
): Promise<string | null> {
  try {
    const result = await git(repoRoot, ["diff", "HEAD", "--", filePath]);
    if (result.exitCode !== 0 && result.stdout === "") {
      // For untracked files, diff won't produce output — try diff --no-index
      const untrackedResult = await git(repoRoot, ["diff", "--no-index", "/dev/null", filePath]);
      const raw = untrackedResult.stdout;
      return raw.length > maxBytes ? raw.slice(0, maxBytes) : raw || null;
    }
    const raw = result.stdout;
    return raw.length > maxBytes ? raw.slice(0, maxBytes) : raw || null;
  } catch {
    return null;
  }
}

async function getFileDiffStat(repoRoot: string, filePath: string): Promise<DiffStat> {
  try {
    const result = await git(repoRoot, ["diff", "--numstat", "HEAD", "--", filePath]);
    if (result.exitCode === 0 && result.stdout.trim()) {
      const line = result.stdout.trim().split("\n")[0]!;
      const [addStr, delStr] = line.split("\t");
      const additions = addStr === "-" ? 0 : parseInt(addStr ?? "0", 10);
      const deletions = delStr === "-" ? 0 : parseInt(delStr ?? "0", 10);
      return {
        additions: Number.isNaN(additions) ? 0 : additions,
        deletions: Number.isNaN(deletions) ? 0 : deletions,
      };
    }
    return { additions: 0, deletions: 0 };
  } catch {
    return { additions: 0, deletions: 0 };
  }
}

// ---------------------------------------------------------------------------
// captureGitStatus
// ---------------------------------------------------------------------------

function makeUnavailableSnapshot(workspaceRoot: string): GitStatusSnapshot {
  return {
    provider: "git",
    capturedAt: Date.now(),
    available: false,
    repositoryRoot: workspaceRoot,
    repositoryName: path.basename(workspaceRoot),
    branch: null,
    head: null,
    baseRef: null,
    baseRefHead: null,
    aheadCount: 0,
    behindCount: undefined,
    aheadCommits: [],
    files: [],
  };
}

export async function captureGitStatus(
  workspaceRoot: string,
  options?: { maxDiffBufferBytes?: number },
): Promise<GitStatusSnapshot> {
  const maxDiffBytes = options?.maxDiffBufferBytes ?? DEFAULT_MAX_DIFF_BYTES;

  // a. Repository root
  let repositoryRoot: string;
  try {
    const result = await git(workspaceRoot, ["rev-parse", "--show-toplevel"]);
    if (result.exitCode !== 0) {
      return makeUnavailableSnapshot(workspaceRoot);
    }
    repositoryRoot = result.stdout.trim();
  } catch {
    return makeUnavailableSnapshot(workspaceRoot);
  }

  // b. HEAD short sha
  let head: string | null = null;
  try {
    const result = await git(repositoryRoot, ["rev-parse", "--short", "HEAD"]);
    if (result.exitCode === 0) {
      head = result.stdout.trim() || null;
    }
  } catch {
    // ignore — head stays null
  }

  // c. Current branch
  const branch = await getCurrentBranch(repositoryRoot);

  // d. Porcelain status
  let statusEntries: StatusEntry[] = [];
  try {
    const result = await git(repositoryRoot, ["status", "--porcelain=v1", "-z"]);
    if (result.exitCode === 0) {
      statusEntries = parsePortalainStatus(result.stdout);
    }
  } catch {
    // ignore
  }

  // e. Convert entries to GitFileChange
  const files: GitFileChange[] = [];
  for (const entry of statusEntries) {
    const changeType = statusEntryToChangeType(entry);
    const created = changeType === "added" || changeType === "untracked";

    const diff = await getFileDiff(repositoryRoot, entry.path, maxDiffBytes);
    const diffStat = await getFileDiffStat(repositoryRoot, entry.path);

    const fileChange: GitFileChange = {
      path: entry.path,
      changeType,
      created,
      diff,
      fullFileDiff: diff,
      oldContent: undefined,
      newContent: undefined,
      diffStat,
    };

    if (entry.origPath) {
      fileChange.previousPath = entry.origPath;
    }

    files.push(fileChange);
  }

  // f. Ahead / behind counts
  let aheadCount = 0;
  let behindCount: number | undefined;
  if (branch) {
    try {
      const result = await git(repositoryRoot, [
        "rev-list",
        "--left-right",
        "--count",
        `HEAD...origin/${branch}`,
      ]);
      if (result.exitCode === 0 && result.stdout.trim()) {
        const parts = result.stdout.trim().split("\t");
        const ahead = parseInt(parts[0] ?? "0", 10);
        const behind = parseInt(parts[1] ?? "0", 10);
        aheadCount = Number.isNaN(ahead) ? 0 : ahead;
        behindCount = Number.isNaN(behind) ? undefined : behind;
      }
    } catch {
      // no remote tracking branch — defaults stay
    }
  }

  // g. Ahead commits
  const aheadCommits: AheadCommit[] = [];
  if (branch && aheadCount > 0) {
    try {
      const result = await git(repositoryRoot, [
        "log",
        "--oneline",
        "-n",
        "20",
        `origin/${branch}..HEAD`,
      ]);
      if (result.exitCode === 0) {
        for (const line of result.stdout.trim().split("\n")) {
          if (!line.trim()) continue;
          const spaceIdx = line.indexOf(" ");
          if (spaceIdx === -1) continue;
          aheadCommits.push({
            sha: line.slice(0, spaceIdx),
            message: line.slice(spaceIdx + 1),
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // h. Repository name
  const repositoryName = path.basename(repositoryRoot);

  return {
    provider: "git",
    capturedAt: Date.now(),
    available: true,
    repositoryRoot,
    repositoryName,
    branch,
    head,
    baseRef: null,
    baseRefHead: null,
    aheadCount,
    behindCount,
    aheadCommits,
    files,
  };
}
