---
phase: 9
plan: 02
status: complete
---

# ThreadStore JSON Persistence — Summary

## One-Liner
Implemented file-system persistence for ThreadStore with atomic writes, Zod validation on load, directory scanning, and interval-based auto-save of dirty threads.

## What Was Built
- `packages/data/src/thread/thread-persistence.ts` — ThreadPersistence class:
  - `save(thread)` — atomic write via temp file + fsync + rename to `{baseDir}/{id}.json`
  - `load(id)` — read + JSON.parse + ThreadSnapshotSchema Zod validation; returns null for missing or corrupted files
  - `delete(id)` — removes thread JSON file (tolerates ENOENT)
  - `list()` — scans baseDir for `*.json` files (excluding `.tmp`), returns thread IDs
  - `loadAll()` — loads all valid threads, silently skipping corrupted files
  - `startAutoSave(store)` — setInterval-based dirty thread flushing with configurable throttleMs; returns `{ dispose }` handle
- `packages/data/src/thread/thread-persistence.test.ts` — 18 tests

## Key Decisions
- Atomic write pattern: write to `.json.tmp`, fsync the file descriptor, then rename — prevents partial writes on crash
- Zod validation on load via `ThreadSnapshotSchema.parse()` — corrupted or schema-invalid files return null rather than throwing
- Auto-save uses `setInterval` at `throttleMs` cadence (default 1000ms); failed saves are silently retried on the next tick
- ThreadPersistenceOptions type added to `types.ts` alongside ThreadStoreOptions for co-location
- `.tmp` files are explicitly filtered out of `list()` results

## Test Coverage
18 tests covering: save (4 — basic write, create missing dir, overwrite, no leftover tmp), load (4 — valid, missing, corrupted JSON, invalid schema), delete (2 — existing and missing), list (3 — normal, ignore tmp, missing dir), loadAll (2 — valid + skip corrupted), autoSave (3 — dirty persist, stop on dispose, multiple dirty threads).

## Artifacts
- `packages/data/src/thread/thread-persistence.ts`
- `packages/data/src/thread/thread-persistence.test.ts`
- `packages/data/src/thread/types.ts` (ThreadPersistenceOptions added)
