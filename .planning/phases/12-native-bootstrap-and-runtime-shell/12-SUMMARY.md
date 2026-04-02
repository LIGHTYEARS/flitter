# Phase 12: Native Bootstrap and Runtime Shell — Summary

## Changes

### 1. Created first-class `flitter-cli` package scaffold (BOOT-01)
**Files:**
- `packages/flitter-cli/package.json`
- `packages/flitter-cli/tsconfig.json`

- Added a new workspace package with its own `flitter-cli` bin target
- Added `start`, `test`, and `typecheck` scripts
- Kept dependencies minimal: `flitter-core` only

### 2. Added native CLI config and namespace (BOOT-02)
**File:** `packages/flitter-cli/src/state/config.ts`

- Added config loading from `~/.flitter-cli/config.json`
- Added native CLI flags for `--cwd`, `--editor`, `--debug`, and `--help`
- Resolved cwd/editor defaults without any ACP/coco boot dependency

### 3. Added native logging bootstrap (BOOT-03)
**File:** `packages/flitter-cli/src/utils/logger.ts`

- Added file logging under `~/.flitter-cli/logs`
- Added retention-based pruning
- Added stderr fallback and current log-path reporting

### 4. Added minimal native runtime shell (BOOT-04)
**Files:**
- `packages/flitter-cli/src/index.ts`
- `packages/flitter-cli/src/bootstrap-shell.ts`

- Added a Bun entrypoint that initializes config and logging before boot
- Added a minimal `flitter-core` shell with visible bootstrap/runtime metadata
- Added clean exit via `Ctrl+C`, `Esc`, and `q`
- Kept the boot path free of ACP/coco coupling

### 5. Added baseline scaffold verification
**File:** `packages/flitter-cli/src/__tests__/config.test.ts`

- Added a smoke test for CLI config parsing

## Files Modified

- `packages/flitter-cli/package.json`
- `packages/flitter-cli/tsconfig.json`
- `packages/flitter-cli/src/index.ts`
- `packages/flitter-cli/src/bootstrap-shell.ts`
- `packages/flitter-cli/src/state/config.ts`
- `packages/flitter-cli/src/utils/logger.ts`
- `packages/flitter-cli/src/__tests__/config.test.ts`
- `pnpm-lock.yaml`

## Commit

- `31af0f8` — `feat(12): scaffold flitter-cli runtime shell`
