---
phase: 11-cli-integration
fixed_at: 2026-04-14T13:33:40Z
review_path: .planning/phases/11-cli-integration/11-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-04-14T13:33:40Z
**Source review:** .planning/phases/11-cli-integration/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: handleLogout skips OAuth credential cleanup when called without prior login

**Files modified:** `packages/cli/src/commands/auth.ts`
**Commit:** 906a422
**Applied fix:** Added `ensureOAuthProviders()` call at the beginning of `handleLogout` so that OAuth providers are registered before iterating them for credential cleanup. This ensures all OAuth credentials are properly deleted even when `handleLogout` runs in a fresh process without a preceding `handleLogin`.

### CR-02: User messages never delivered to ThreadWorker in execute and headless modes

**Files modified:** `packages/cli/src/modes/execute.ts`, `packages/cli/src/modes/headless.ts`
**Commit:** 9d93b08
**Applied fix:** The review suggested using `container.threadStore.updateThread()` which does not exist in the codebase. Adapted the fix to the actual architecture: created a local `Message[]` array containing the user message(s) and passed it to `createThreadWorker` via the `workerOpts.getMessages` callback. In execute.ts, the array is pre-populated with the single user message before worker creation. In headless.ts, messages are pushed into the mutable array before each `runInference()` call (both for the initial `context.userMessage` and for each stdin JSON line). This ensures the `ThreadWorker` receives the user messages when it calls `this.opts.getMessages()` during inference. **Status: fixed: requires human verification** (logic bug -- semantic correctness of message delivery should be confirmed by developer).

### WR-01: Stream write error handler registered after write loop in installBinaryUpdate

**Files modified:** `packages/cli/src/update/installer.ts`
**Commit:** 313c36b
**Applied fix:** Registered an error handler on the write stream immediately after `createWriteStream()`, before the download write loop begins. The handler captures the error into a local variable, which is checked at the top of each loop iteration. This prevents an unhandled `error` event from crashing the process if a filesystem error occurs during download.

### WR-02: Missing import of StreamDelta in Anthropic provider test

**Files modified:** `packages/llm/src/providers/anthropic/provider.test.ts`
**Commit:** dd7a2de
**Applied fix:** Added `StreamDelta` to the existing type import from `../../types`, changing the import line to `import type { StreamDelta, SystemPromptBlock } from "../../types";`. This resolves the TypeScript compilation error caused by using `StreamDelta` at 4 locations without importing it.

### WR-03: Missing await on async defaultOpenBrowser call

**Files modified:** `packages/cli/src/commands/auth.ts`
**Commit:** 1d7ced7
**Applied fix:** Added `.catch(() => { ... })` to the `defaultOpenBrowser(info.url)` call inside the synchronous `onAuth` callback. Since the callback is not async, `await` cannot be used. The `.catch()` prevents unhandled promise rejections when the browser command fails (e.g., `xdg-open` not found on Linux). Browser open failure is non-fatal since the URL is displayed to the user below.

### WR-04: Missing validateApiKey call for interactively entered API key

**Files modified:** `packages/cli/src/commands/auth.ts`
**Commit:** 8ea3209
**Applied fix:** Added `validateApiKey(key)` check in the interactive API key path, consistent with the environment variable path. The key is now validated before being stored. If validation fails, the user receives an "Invalid API key format." message instead of silently storing an invalid key.

## Skipped Issues

None -- all findings were fixed.

---

_Fixed: 2026-04-14T13:33:40Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
