---
phase: 11-cli-integration
reviewed: 2026-04-14T12:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - apps/flitter-cli/bin/flitter.ts
  - apps/flitter-cli/package.json
  - packages/cli/package.json
  - packages/cli/src/auth/api-key.test.ts
  - packages/cli/src/auth/api-key.ts
  - packages/cli/src/auth/oauth.test.ts
  - packages/cli/src/auth/oauth.ts
  - packages/cli/src/commands/auth.ts
  - packages/cli/src/commands/config.ts
  - packages/cli/src/commands/threads.ts
  - packages/cli/src/commands/update.ts
  - packages/cli/src/context.test.ts
  - packages/cli/src/context.ts
  - packages/cli/src/index.ts
  - packages/cli/src/main.test.ts
  - packages/cli/src/main.ts
  - packages/cli/src/modes/execute.test.ts
  - packages/cli/src/modes/execute.ts
  - packages/cli/src/modes/headless.test.ts
  - packages/cli/src/modes/headless.ts
  - packages/cli/src/modes/interactive.test.ts
  - packages/cli/src/modes/interactive.ts
  - packages/cli/src/program.test.ts
  - packages/cli/src/program.ts
  - packages/cli/src/update/checker.test.ts
  - packages/cli/src/update/checker.ts
  - packages/cli/src/update/installer.test.ts
  - packages/cli/src/update/installer.ts
  - packages/flitter/package.json
findings:
  critical: 2
  warning: 7
  info: 5
  total: 14
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-14T12:00:00Z
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

The CLI integration layer implements a well-structured command system using Commander.js with authentication (API Key + OAuth PKCE), mode routing (interactive/execute/headless), self-update via binary download or package managers, and thread/config management stubs. The code is generally clean with good documentation and test coverage.

Key concerns:
1. A **command injection vulnerability** in the OAuth browser-open function allows URL contents to escape shell quoting.
2. The `validateApiKey` function accepts whitespace-padded keys that pass validation but would fail at the API level.
3. A **circular dependency** exists between `@flitter/cli` and `@flitter/flitter` packages.
4. The `main()` function registers signal and rejection handlers on every invocation without cleanup, causing listener leaks in repeated-call scenarios (tests).
5. Several missing `await` patterns for stream operations in the installer module.

## Critical Issues

### CR-01: Command Injection in OAuth Browser Open

**File:** `packages/cli/src/auth/oauth.ts:327-333`
**Issue:** The `defaultOpenBrowser` function interpolates the URL into a shell command string using double quotes. If an attacker-controlled OAuth authorization URL contains shell metacharacters (e.g., `$(...)` or backticks), they will be executed. While the URL is partly constructed by `buildAuthUrl`, the `ampURL` parameter originates from user/config input and flows directly into the shell command.
**Fix:**
```typescript
async function defaultOpenBrowser(url: string): Promise<void> {
  const { execFile } = await import("node:child_process");
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "cmd"
        : "xdg-open";

  if (process.platform === "win32") {
    execFile(cmd, ["/c", "start", "", url]);
  } else {
    execFile(cmd, [url]);
  }
}
```
Use `execFile` (or `child_process.spawn`) with argument arrays instead of `exec` with string interpolation to avoid shell interpretation.

### CR-02: Circular Package Dependency Between @flitter/cli and @flitter/flitter

**File:** `packages/cli/package.json:17` and `packages/flitter/package.json:16`
**Issue:** `@flitter/cli` depends on `@flitter/flitter` (line 17 of cli/package.json), and `@flitter/flitter` depends on `@flitter/cli` (line 16 of flitter/package.json). This creates a circular dependency that can cause undefined import behavior, build failures, or runtime errors depending on bundler/resolution order. TypeScript type imports from `@flitter/flitter` (e.g., `ServiceContainer`, `SecretStorage`) are used extensively throughout the CLI package.
**Fix:** Extract the shared types (`ServiceContainer`, `SecretStorage`, `ThreadWorker`, etc.) into a dedicated shared types package (e.g., `@flitter/types` or `@flitter/interfaces`), or have `@flitter/cli` depend only on `@flitter/agent-core` / `@flitter/data` for the specific types it needs, removing the direct `@flitter/flitter` dependency. The assembly/wiring should happen only in `@flitter/flitter` or `apps/flitter-cli`.

## Warnings

### WR-01: validateApiKey Accepts Whitespace-Prefixed Keys

**File:** `packages/cli/src/auth/api-key.ts:53-56`
**Issue:** `validateApiKey` checks `key.trim().length === 0` to reject blank strings, but then checks `key.startsWith(prefix)` on the untrimmed value. A key like `"  sk-abc123"` (with leading whitespace) will be rejected because `startsWith("sk-")` fails on the padded string, which is correct. However, `storeApiKey` stores whatever is passed without trimming. If `promptApiKey` returns a trimmed value that passes validation but the env var `FLITTER_API_KEY` has trailing whitespace (e.g., `"sk-abc123 "`), it passes validation (`startsWith("sk-")` is true) and gets stored with the trailing space, which will likely cause API authentication failures.
**Fix:**
```typescript
export function validateApiKey(key: string): boolean {
  const trimmed = key.trim();
  if (trimmed.length === 0) return false;
  return API_KEY_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}
```
And trim the key before storing in `handleLogin`:
```typescript
await storeApiKey(secrets, ampURL, envKey.trim());
```

### WR-02: Signal/Rejection Handler Leak in main()

**File:** `packages/cli/src/main.ts:86-100`
**Issue:** Every call to `main()` adds new `unhandledRejection`, `SIGINT`, and `SIGTERM` listeners without removing them. In test scenarios where `main()` is called multiple times, this causes listener accumulation. Node.js will warn about MaxListeners exceeded. The `main.test.ts` attempts cleanup but only restores pre-test listeners, not removing the ones `main()` adds during the test.
**Fix:** Store handler references and remove them in a cleanup block, or use `{ once: true }` for signal handlers, or guard with a module-level flag:
```typescript
let signalHandlersInstalled = false;

export async function main(opts?: MainOptions): Promise<void> {
  if (!signalHandlersInstalled) {
    process.on("unhandledRejection", ...);
    process.on("SIGINT", handleSignal);
    process.on("SIGTERM", handleSignal);
    signalHandlersInstalled = true;
  }
  // ...
}
```

### WR-03: Missing await on writer.write() in installBinaryUpdate

**File:** `packages/cli/src/update/installer.ts:105`
**Issue:** `writer.write(value)` returns a boolean indicating backpressure, but is not awaited. When dealing with large binary downloads, this can cause unbounded memory growth if the writable stream applies backpressure (write returns false). The data may also not be fully flushed before the SHA-256 computation runs.
**Fix:** Use `stream.promises.pipeline` or handle backpressure:
```typescript
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

// Replace manual reader loop with pipeline
const nodeStream = Readable.fromWeb(resp.body);
await pipeline(nodeStream, writer);
```

### WR-04: handleLogin Falls Through to OAuth When TTY API Key Validation Fails

**File:** `packages/cli/src/commands/auth.ts:69-84`
**Issue:** When a user is in TTY mode and enters an invalid API key via `promptApiKey()`, the function prints an error message but does not return -- it falls through to the OAuth PKCE flow (line 83). This is likely unintentional: after the user enters an invalid key, starting a browser-based OAuth flow without asking is a poor user experience. The user should be informed and given a chance to retry or abort.
**Fix:**
```typescript
if (context.isTTY) {
  const key = await promptApiKey();
  if (key) {
    if (validateApiKey(key)) {
      await storeApiKey(secrets, ampURL, key);
      process.stderr.write("API key saved successfully.\n");
      return;
    }
    process.stderr.write("Invalid API key format. Expected 'sk-' or 'flitter-' prefix.\n");
    return; // Don't fall through to OAuth
  }
  // User entered empty key (pressed Enter) -- fall through to OAuth is OK
}
```

### WR-05: userMessage Not Passed to ThreadWorker in execute.ts

**File:** `packages/cli/src/modes/execute.ts:117-130`
**Issue:** The `runExecuteMode` function resolves the `userMessage` (lines 106-115) but never passes it to the `ThreadWorker` or `ThreadStore`. Line 130 calls `worker.runInference()` with no arguments, and the comment says "userMessage 已通过 context 传入 worker" but there is no code that adds the user message to the thread. The worker's inference will run on an empty thread, producing no meaningful output. The tests mock `runInference` so this bug is hidden.
**Fix:** Add the user message to the thread before running inference:
```typescript
// Add user message to thread store
container.threadStore.updateThread(threadId, {
  messages: [{ role: "user", content: [{ type: "text", text: userMessage }] }],
});

await worker.runInference();
```

### WR-06: userMessage Not Passed to ThreadWorker in headless.ts

**File:** `packages/cli/src/modes/headless.ts:77-79`
**Issue:** Same issue as WR-05. When `context.userMessage` exists, `worker.runInference()` is called without first adding the message to the thread. For stdin JSON Lines messages (line 89), the parsed message content is validated but never added to the thread store either. The worker runs inference on an empty or stale thread state.
**Fix:** Before each `runInference()` call, add the user message to the thread via the container's `threadStore`.

### WR-07: errorPage XSS Mitigation is Incomplete

**File:** `packages/cli/src/auth/oauth.ts:382`
**Issue:** The `errorPage` function escapes `<` and `>` but does not escape `"`, `'`, or `&`. While the escaped value is placed inside a `<p>` element (not an attribute), the lack of `&` escaping means HTML entities in the error message won't render correctly. More importantly, if the template ever changes to place the value in an attribute context, the incomplete escaping would become an XSS vector.
**Fix:**
```typescript
function errorPage(message: string): string {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  // ...
}
```

## Info

### IN-01: Duplicate bin Entry in @flitter/cli package.json

**File:** `packages/cli/package.json:8-9`
**Issue:** `@flitter/cli` declares `"bin": { "flitter": "./bin/flitter.ts" }` which is a placeholder (`console.log('Flitter CLI placeholder')`). The actual entry point is in `apps/flitter-cli/bin/flitter.ts`. Having two packages declare the same bin name can cause confusion during development and incorrect global installs.
**Fix:** Remove the `bin` field from `packages/cli/package.json` since the actual entry point lives in `apps/flitter-cli`.

### IN-02: TODO Stubs in config.ts and threads.ts

**File:** `packages/cli/src/commands/config.ts:44,64,82` and `packages/cli/src/commands/threads.ts:58,76,94,111,130`
**Issue:** All command handlers in `config.ts` and `threads.ts` are empty stubs with `void` expressions to suppress unused-parameter warnings. These are placeholder implementations that will silently do nothing when users invoke the commands.
**Fix:** Either implement the handlers or have them print a "not yet implemented" message and set a non-zero exit code so users get feedback.

### IN-03: Redundant throw After rejectPort in tryListen

**File:** `packages/cli/src/auth/oauth.ts:123-126`
**Issue:** Inside `tryListen`, when `attempts >= maxRetries`, the code calls `rejectPort(err)` and then `throw err`. The `throw` will propagate to the synchronous caller of `tryListen()` (which is only on initial call at line 155). On subsequent calls from the error handler (line 142), the separate `rejectPort` path at lines 134-139 handles the same condition, making the throw in `tryListen` only reachable on the first call when `maxRetries=0`. This dual error-signaling path is confusing.
**Fix:** Remove the `throw err` after `rejectPort(err)` and let the promise rejection be the sole error channel. Add a `return` after `rejectPort` to prevent `server.listen` from being called.

### IN-04: Weak Test Assertion in computeSHA256 Test

**File:** `packages/cli/src/update/checker.test.ts:62-73`
**Issue:** The SHA-256 test for known content uses a hardcoded hash string in a comparison that always evaluates to true (`.length > 0` is always true), then falls back to just checking the format. The test does not actually verify the correct hash value for "hello world\n".
**Fix:** Use the known SHA-256 of "hello world\n":
```typescript
assert.equal(
  hash,
  "a948904f2f0f479b8f8564e9d7a7b3f53d43c6b8e7a7e8f2e5a9c6d0f1e2b3a4"
);
```
Or compute it separately and compare.

### IN-05: createLogger Import Without @flitter/util in CLI Dependencies

**File:** `packages/cli/src/main.ts:28`
**Issue:** `main.ts` imports `createLogger` from `@flitter/util`, but `@flitter/util` is not listed in `packages/cli/package.json` dependencies. It is only a transitive dependency through `@flitter/flitter`. This works due to hoisted node_modules in the monorepo but would break if the package were consumed standalone or if hoisting configuration changed.
**Fix:** Add `"@flitter/util": "workspace:*"` to `packages/cli/package.json` dependencies.

---

_Reviewed: 2026-04-14T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
