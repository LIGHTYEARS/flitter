---
phase: 2
plan: 05
status: complete
---

# Keyring Credential Storage -- Summary

## One-Liner
Implemented a credential storage module with two backends -- FileSecretStore (JSON file with atomic writes and 0o600 permissions) and NativeSecretStore (OS keychain via @napi-rs/keyring) -- behind a common SecretStore interface with reactive change notification.

## What Was Built
- `SecretStore` interface with `get(key, url)`, `set(key, value, url)`, `delete(key, url)`, and `changes: Subject<void>`
- `FileSecretStore` class implementing SecretStore:
  - JSON file storage with keys formatted as `<key>@<normalized-url>`
  - Atomic writes via temp file + rename pattern (tmpPath includes PID, timestamp, random hex)
  - Restrictive file permissions (0o600) on the secrets file
  - Auto-creates directory structure on first write
  - Handles missing file (returns empty store) and corrupt JSON (returns empty, recoverable on next write)
  - Emits on `changes` Subject for every `set()` and `delete()` call
- `NativeSecretStore` class implementing SecretStore:
  - `static async create()` -- attempts dynamic import of `@napi-rs/keyring`, returns null if unavailable
  - Uses native OS keychain with "flitter" service name and composed key
  - Emits on `changes` Subject for mutations
- `createSecretStore(options)` factory function:
  - Ensures secrets directory exists (mkdir recursive)
  - Tries NativeSecretStore when `useNativeKeyring: true`, falls back to FileSecretStore if unavailable
  - Returns FileSecretStore directly when `useNativeKeyring: false`
- URL normalization helper: strips trailing slashes, lowercases scheme+host via URL constructor
- `composeKey(key, url)` -- formats storage key as `<key>@<normalizedUrl>`
- Barrel export at `packages/util/src/keyring/index.ts`

## Key Decisions
- Atomic writes use write-to-temp-then-rename rather than advisory file locking, prioritizing simplicity and cross-platform compatibility
- URL normalization uses the `URL` constructor for parsing, with a try/catch fallback for non-standard URLs (used as-is)
- The `changes` Subject uses the reactive primitives from plan 02-01 (`../reactive/index`), establishing a real cross-module dependency
- NativeSecretStore uses dynamic import with a variable module name to avoid TypeScript compile errors when `@napi-rs/keyring` is not installed
- FileSecretStore exposes `filePath` getter for testing purposes
- Corrupt JSON files are silently recovered (SyntaxError caught, returns empty object)

## Test Coverage
21 test cases in `packages/util/src/keyring/keyring.test.ts` covering:
- FileSecretStore (13 tests): set/get round-trip, missing key returns undefined, delete removes key, JSON key format verification, URL normalization (trailing slashes, scheme+host lowercasing), independent keys per URL, independent keys per key name, changes Subject emits on set(), changes Subject emits on delete(), 0o600 file permissions, auto-creation of nested directories, corrupt JSON recovery, concurrent writes (Promise.all of 5 sets) non-corruption
- NativeSecretStore (1 test): create() returns null when native module unavailable
- Factory (3 tests): useNativeKeyring false returns FileSecretStore, useNativeKeyring true falls back to FileSecretStore, factory creates missing directory
- Edge cases (3 tests): empty string key, special characters in URL, very long key value (100K chars)

## Artifacts
- `packages/util/src/keyring/keyring.ts`
- `packages/util/src/keyring/keyring.test.ts`
- `packages/util/src/keyring/index.ts`
