---
phase: 9
plan: 04
status: complete
---

# ConfigService Hot Reload & File Watching — Summary

## One-Liner
Added file-system watching and debounced hot-reload to ConfigService so configuration changes on disk are automatically detected and merged into the reactive config stream.

## What Was Built
- Hot-reload capabilities integrated directly into `packages/data/src/config/config-service.ts` (no separate `config-watcher.ts` — consolidated into the ConfigService class):
  - `startWatching()` — starts `fs.watch` on the directories containing global and workspace settings files; returns `{ dispose }` handle
  - `debouncedReload()` — 300ms debounce timer that coalesces rapid file changes into a single `reload()` call
  - `stopWatching()` — closes all FSWatcher handles and clears the debounce timer
  - `unsubscribe()` — full cleanup of watchers and subscriptions
  - Diff filter in `reload()` — only pushes BehaviorSubject when `JSON.stringify` of settings actually differs
- `FileSettingsStorage.getWatchPaths()` — returns the list of file paths that need monitoring
- Hot-reload tests in `packages/data/src/config/config-service.test.ts` (shared test file with 09-03)

## Key Decisions
- File watching was implemented directly inside ConfigService rather than as a separate ConfigFileWatcher class — simpler architecture since the watcher's only consumer is ConfigService
- Uses native `fs.watch` on the settings directory (not individual files) to handle both creation and modification of settings files
- 300ms debounce prevents excessive reloads during rapid saves (e.g., editor auto-save)
- Watcher uses `persistent: false` to avoid keeping the Node.js process alive
- Directory watch errors are silently caught — the directory may not exist yet at startup
- Workspace root changes are handled by the caller re-instantiating or updating the storage path

## Test Coverage
Covered within the 21 tests in `config-service.test.ts` (shared with 09-03). Hot-reload-specific tests: file change detection with automatic reload, debounced reloading after file modification, cleanup on unsubscribe, diff filter preventing emission on unchanged content, no-workspace operation.

## Artifacts
- `packages/data/src/config/config-service.ts` (extended with watching methods)
- `packages/data/src/config/settings-storage.ts` (added `getWatchPaths()`)
- `packages/data/src/config/config-service.test.ts` (hot-reload tests)
