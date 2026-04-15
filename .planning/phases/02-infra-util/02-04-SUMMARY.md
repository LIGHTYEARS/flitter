---
phase: 2
plan: 04
status: complete
---

# File Scanner -- Summary

## One-Liner
Implemented a configurable FileScanner with external tool priority (rg/fd) and NodeJS recursive fallback, supporting ignore patterns, always-include overrides, depth/file limits, symlink policy, and abort signal cancellation.

## What Was Built
- `ScanEntry` interface with `uri` (file:// format), `path`, `name`, `isDirectory`, `isAlwaysIncluded` fields
- `ScanOptions` interface with `maxFiles` (default 50000), `maxDepth`, `followSymlinks` (default false), `ignorePatterns` (gitignore-style), `alwaysIncludePaths`, `abortSignal`
- `ScanResult` interface with `entries`, `scannedFiles`, `scannedDirectories`, `truncated`
- `FileScanner` class:
  - `constructor(roots, options)` -- stores roots and merges options with defaults
  - `initialize()` -- detects available external tool (rg or fd) via `which`
  - `scan()` -- auto-initializes if needed, iterates roots, merges results, enforces global maxFiles cap
- `scanWithNodeJS(root, options)` -- recursive `fs.readdir` with `withFileTypes: true`:
  - Respects maxFiles (stops early, sets truncated), maxDepth (tracks depth), ignorePatterns, alwaysIncludePaths
  - Per-entry EACCES/ENOENT error handling (skip, no throw)
  - AbortSignal checked between iterations
  - Symlink handling: skipped by default, followed via `fs.stat` when `followSymlinks: true`
- `scanWithExternalTool(tool, root, options)` -- builds CLI args for rg (`--files`) or fd, parses stdout lines, handles alwaysIncludePaths post-hoc
- Internal glob matcher (`globToRegex`) supporting `*`, `**`, `?`, trailing `/` stripping, leading `/` anchoring
- `shouldIgnore` function matching against basename (no-slash patterns) or relative path (slash-containing patterns)
- `pathToFileUri` helper: `"file://" + absPath`
- Barrel export at `packages/util/src/scanner/index.ts`

## Key Decisions
- External tool detection tries `rg` first, then `fd`, falls back to NodeJS on any failure -- zero hard dependencies
- Glob matching implemented in-house via `globToRegex` conversion rather than adding picomatch/minimatch dependency
- Pattern matching strategy: no-slash patterns match basename only; slash-containing patterns match full relative path (gitignore semantics)
- `alwaysIncludePaths` resolved to absolute paths via `path.resolve(root, p)` and checked via Set membership
- External tool scanner adds missing always-include paths by stat-checking them after parsing output
- Global maxFiles cap enforced by truncating the merged entries array across all roots
- ScanEntry URIs use simple string concatenation (`"file://" + absPath`) without percent-encoding

## Test Coverage
19 test cases in `packages/util/src/scanner/file-scanner.test.ts` covering:
- NodeJS scanner (12 tests): basic 3-file scan with URI/path/name verification, nested directory recursion with dir entries, maxFiles truncation, maxDepth limiting, ignorePatterns filtering (*.log, node_modules), alwaysIncludePaths overriding ignore, empty directory, nonexistent root, abortSignal early stop, symlinks skipped by default, symlinks followed with followSymlinks=true, URI format validation
- FileScanner class (5 tests): multiple roots merge, global maxFiles cap, initialize() no-throw, auto-initialize on scan(), scannedFiles/scannedDirectories populated
- Glob matching (2 tests): path-separator patterns match relative paths, `?` wildcard matches single character

## Artifacts
- `packages/util/src/scanner/file-scanner.ts`
- `packages/util/src/scanner/file-scanner.test.ts`
- `packages/util/src/scanner/index.ts`
