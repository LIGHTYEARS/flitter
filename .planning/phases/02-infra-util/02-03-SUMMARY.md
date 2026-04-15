---
phase: 2
plan: 03
status: complete
---

# Git Status Detection and Process Spawn -- Summary

## One-Liner
Implemented Git status detection utilities (captureGitStatus, porcelain parsing, branch detection, diff retrieval) and the shared spawn child-process wrapper used by git and scanner modules.

## What Was Built
- `parsePortalainStatus(output)` -- parses `git status --porcelain=v1 -z` NUL-separated output into `StatusEntry[]` with X/Y status codes, handling rename/copy entries with origPath
- `statusEntryToChangeType(entry)` -- maps XY status codes to semantic change types (modified/added/deleted/renamed/untracked)
- `isGitRepository(path)` -- runs `git rev-parse --is-inside-work-tree`, returns boolean
- `getCurrentBranch(repoRoot)` -- runs `git symbolic-ref --short HEAD`, returns branch name or null for detached HEAD
- `getGitDiff(repoRoot, ref?)` -- runs `git diff HEAD` or `git diff <ref>`, returns diff string
- `captureGitStatus(workspaceRoot, options?)` -- aggregates multiple git commands into a single `GitStatusSnapshot`:
  - Repository root, name, HEAD SHA, branch detection
  - Porcelain status parsing into `GitFileChange[]` with per-file diff and diffStat
  - Ahead/behind commit counts via `git rev-list --left-right --count`
  - Ahead commit log via `git log --oneline`
  - Graceful degradation: returns `available: false` snapshot for non-git directories
  - `maxDiffBufferBytes` option (default 50KB) to cap per-file diff size
- `GitStatusSnapshot`, `GitFileChange`, `AheadCommit`, `DiffStat`, `StatusEntry` type interfaces
- Internal helpers: `getFileDiff` (with untracked file fallback via `--no-index`), `getFileDiffStat`
- Barrel export at `packages/util/src/git/index.ts` exporting all public functions and types

## Key Decisions
- `spawn` from `process.ts` is reused as the underlying executor for all git commands via a local `git()` helper
- `parsePortalainStatus` uses NUL (`\0`) splitting and handles the two-path format for renames/copies by consuming the next segment
- Non-git directories produce a full `available: false` snapshot rather than throwing, enabling safe use in any directory
- Per-file diffs for untracked files use `git diff --no-index /dev/null <path>` as a fallback
- Ahead/behind counts use `git rev-list --left-right --count HEAD...origin/<branch>` -- silently defaults to 0/undefined if no remote tracking branch exists
- All git command failures are caught and handled gracefully (try/catch around each command)

## Test Coverage
32 test cases in `packages/util/src/git/git.test.ts` covering:
- parsePortalainStatus (9 tests): modified, added, deleted, renamed with origPath, untracked, multiple entries, empty input, whitespace-only input, mixed renames and normal entries
- statusEntryToChangeType (6 tests): untracked (??), renamed (R), added (A), deleted (D), modified (M), staged+unstaged (MM)
- isGitRepository (2 tests): true for flitter repo, false for /tmp
- getCurrentBranch (2 tests): non-null string for flitter repo, no newlines in branch name
- getGitDiff (2 tests): returns string, does not throw
- captureGitStatus (9 tests): available true, absolute repositoryRoot, non-empty repositoryName, provider is "git", branch type check, head type check, files is array, capturedAt timestamp range, available false for non-git directory
- spawn sanity (2 tests): echo returns stdout, false returns non-zero exit

## Artifacts
- `packages/util/src/git/git.ts`
- `packages/util/src/git/git.test.ts`
- `packages/util/src/git/index.ts`
- `packages/util/src/process.ts` (shared dependency, implemented in plan 07)
