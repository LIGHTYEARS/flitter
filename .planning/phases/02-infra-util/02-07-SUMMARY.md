---
phase: 2
plan: 07
status: complete
---

# Foundational Utilities (Error, Logger, Assert, Process) -- Summary

## One-Liner
Implemented four foundational utility modules that all other packages depend on: TimeoutError with callWithTimeout, structured JSON logger with child context, runtime assertion helpers, and a promise-based child process spawner with timeout/abort support.

## What Was Built
- **error.ts**:
  - `TimeoutError` class extending `Error` with readonly `timeout` property, fixed prototype chain for `instanceof`
  - `callWithTimeout<T>(promise, timeout, message?)` -- races promise against setTimeout, clears timer on resolution, rejects with TimeoutError on timeout
  - `Result<T, E>` type alias (ok/error discriminated union)
- **logger.ts**:
  - `Logger` interface with `debug`, `info`, `warn`, `error`, `wsMessage`, `child` methods
  - `LoggerImpl` class outputting structured JSON lines: `{ timestamp, level, name, message, ...context, ...extra }`
  - Timestamps in ISO 8601 format
  - Extra args collected into an `args` array field (omitted when no extra args)
  - `wsMessage(direction, clientId, data)` logs at debug level with structured fields
  - `child(context)` returns new logger with merged context (child overrides parent on conflict)
  - `createLogger(name, output?)` factory -- defaults to `process.stderr.write`; optional custom output function for testing
- **assert.ts**:
  - `assert(condition, message?)` -- throws on falsy with TypeScript `asserts condition` return type for type narrowing
  - `assertNever(value: never, message?)` -- always throws, used for exhaustiveness checking; default message includes JSON-serialized unexpected value
  - `assertDefined<T>(value, message?)` -- throws on null/undefined, returns typed T otherwise
- **process.ts**:
  - `SpawnOptions` interface: `cwd`, `env`, `timeout`, `maxBuffer` (default 10MB), `signal` (AbortSignal)
  - `SpawnResult` interface: `stdout`, `stderr`, `exitCode`
  - `spawn(command, args, options?)` -- wraps `child_process.execFile`:
    - Non-zero exit codes resolve (not reject) with the exit code
    - ENOENT/EACCES, timeout/signal kill, AbortError, maxBuffer exceeded all reject
    - Environment variables merged with `process.env`
- Updated `packages/util/src/index.ts` barrel export with all four modules

## Key Decisions
- `TimeoutError` uses `Object.setPrototypeOf(this, TimeoutError.prototype)` to fix prototype chain for correct `instanceof` checks
- `callWithTimeout` clears the timeout timer in a `finally` block to prevent dangling timer leaks
- Logger uses a pluggable output function (default stderr) rather than a stream, enabling easy test capture without mocking
- Logger puts extra args into an `args` array only when present, keeping clean JSON output for simple log calls
- `spawn` uses `execFile` (not `exec`) for shell injection safety
- `spawn` resolves on non-zero exit codes (returning the exit code) rather than rejecting, making it convenient for callers that check exit codes (like the git module)
- `spawn` rejects only on fatal errors (command not found, timeout kill, abort signal, maxBuffer exceeded)

## Test Coverage
49 test cases across 4 test files:
- **error.test.ts** (12 tests): TimeoutError instanceof checks, timeout property, name, message; callWithTimeout resolve before timeout, reject with TimeoutError on exceed, custom message, default message, timer cleanup; Result type ok/error variants
- **logger.test.ts** (12 tests): createLogger name, info/debug/warn/error level strings, extra args in output, no args field when none passed, child context merging, child override on conflict, nested child accumulation, wsMessage fields, ISO 8601 timestamp validation
- **assert.test.ts** (17 tests): assert true/false/custom message, truthy values (string, number, object), falsy values (0, "", null, undefined); assertNever always throws, includes value in message, custom message; assertDefined returns value, throws for null/undefined, custom message
- **process.test.ts** (8 tests): echo stdout, stderr capture, exitCode 0, non-zero exitCode without reject, ENOENT rejects, cwd option, timeout kills process, signal aborts process

## Artifacts
- `packages/util/src/error.ts`
- `packages/util/src/error.test.ts`
- `packages/util/src/logger.ts`
- `packages/util/src/logger.test.ts`
- `packages/util/src/assert.ts`
- `packages/util/src/assert.test.ts`
- `packages/util/src/process.ts`
- `packages/util/src/process.test.ts`
- `packages/util/src/index.ts` (updated barrel export)
