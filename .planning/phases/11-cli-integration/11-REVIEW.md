---
phase: 11-cli-integration
reviewed: 2026-04-14T13:19:26Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - packages/cli/src/auth/api-key.test.ts
  - packages/cli/src/auth/api-key.ts
  - packages/cli/src/commands/auth.test.ts
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
  - packages/flitter/src/container.test.ts
  - packages/flitter/src/container.ts
  - packages/flitter/src/factory.ts
  - packages/flitter/src/index.ts
  - packages/llm/src/providers/anthropic/provider.test.ts
  - packages/llm/src/providers/registry.test.ts
  - packages/llm/src/types.test.ts
  - packages/schemas/src/config.test.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-14T13:19:26Z
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

The CLI integration layer is well-structured with clear separation of concerns across commands, modes, context resolution, and update management. The DI container pattern in `@flitter/flitter` is solid with proper disposal ordering and error isolation. Test coverage is thorough across all packages.

Key concerns found:

1. **Critical:** `handleLogout` fails to register OAuth providers before iterating them, causing incomplete credential cleanup in fresh-process scenarios.
2. **Critical:** User messages are resolved but never actually delivered to the inference worker in execute and headless modes -- the `runInference()` call operates on an empty thread.
3. **Warning:** The binary updater registers its stream error handler too late, risking an uncaught exception on filesystem errors during download.
4. **Warning:** A missing `StreamDelta` import in the Anthropic provider test file will cause TypeScript compilation errors.

The `@flitter/flitter` container, factory functions, `@flitter/llm` provider/registry/types tests, and `@flitter/schemas` config tests are clean with no issues found.

## Critical Issues

### CR-01: handleLogout skips OAuth credential cleanup when called without prior login

**File:** `packages/cli/src/commands/auth.ts:166-175`
**Issue:** `handleLogout` calls `getOAuthProviders()` at line 170 without first calling `ensureOAuthProviders()`. The OAuth providers are only registered during `handleLogin` (line 72). If a user runs `flitter logout` in a fresh process (without a preceding `flitter login` call in that same process), `getOAuthProviders()` returns an empty array, and all OAuth credentials (`oauthCredentials` and per-provider `apiKey` entries) are silently left in storage. The message "All credentials have been removed" is misleading.
**Fix:**
```typescript
export async function handleLogout(deps: AuthCommandDeps, _context: CliContext): Promise<void> {
  const { secrets } = deps;
  ensureOAuthProviders(); // <-- Add this call

  await secrets.delete("apiKey", "default");
  const providers = getOAuthProviders();
  for (const provider of providers) {
    await secrets.delete("oauthCredentials", provider.id);
    await secrets.delete("apiKey", provider.id);
  }
  process.stderr.write("Logged out. All credentials have been removed.\n");
}
```

### CR-02: User messages never delivered to ThreadWorker in execute and headless modes

**File:** `packages/cli/src/modes/execute.ts:119-132`
**File:** `packages/cli/src/modes/headless.ts:69-92`
**Issue:** In `runExecuteMode`, the `userMessage` is resolved from CLI args or stdin (lines 108-117), but it is never injected into the thread store or passed to `worker.runInference()`. The worker is created via `container.createThreadWorker(threadId)` which initializes with an empty thread snapshot (no messages -- see `container.ts:278`). The comment on line 131 ("userMessage already passed to worker via context") is incorrect -- no such passing occurs.

The same pattern exists in `runHeadlessMode` (lines 79-81 and 89-92): messages parsed from stdin JSON Lines are validated but never added to the thread. As a result, inference runs with an empty message history, producing no meaningful output.

The tests mask this bug because they mock `runInference` to succeed regardless of thread content.
**Fix:** Before calling `worker.runInference()`, add the user message to the thread store:
```typescript
// In execute.ts, before worker.runInference():
container.threadStore.updateThread(threadId, (snapshot) => ({
  ...snapshot,
  messages: [
    ...snapshot.messages,
    {
      role: "user",
      messageId: Date.now(),
      content: [{ type: "text", text: userMessage }],
    },
  ],
}));
await worker.runInference();
```
Apply the same pattern in `headless.ts` for both the initial `context.userMessage` and each parsed stdin JSON message.

## Warnings

### WR-01: Stream write error handler registered after write loop in installBinaryUpdate

**File:** `packages/cli/src/update/installer.ts:97-111`
**Issue:** The `createWriteStream` error handler (`writer.on("error", reject)`) is registered at line 110, only after the entire download write loop finishes (lines 100-106). If a filesystem error occurs during the write loop (e.g., disk full, permission denied), the "error" event fires before the handler is attached. In Node.js, an unhandled "error" event on a stream causes an uncaught exception that crashes the process.
**Fix:** Register the error handler immediately after creating the write stream:
```typescript
const writer = createWriteStream(tempPath);

// Register error handler immediately to prevent unhandled 'error' event crash
let writeError: Error | null = null;
writer.on("error", (err) => { writeError = err; });

const reader = resp.body.getReader();
while (true) {
  if (writeError) throw writeError;
  const { done, value } = await reader.read();
  if (done) break;
  writer.write(value);
  downloaded += value.byteLength;
  opts?.onProgress?.(downloaded, total);
}
writer.end();
await new Promise<void>((resolve, reject) => {
  writer.on("finish", resolve);
  writer.on("error", reject);
});
```

### WR-02: Missing import of StreamDelta in Anthropic provider test

**File:** `packages/llm/src/providers/anthropic/provider.test.ts:381,428,486,550`
**Issue:** The type `StreamDelta` is used at 4 locations (`let lastDelta: StreamDelta | undefined;`) but is never imported. The imports at the top of the file (lines 7-14) include `SystemPromptBlock` and `TransformState` from `../../types` but not `StreamDelta`. This will cause a TypeScript compilation error.
**Fix:** Add the missing import at the top of the file:
```typescript
import type { StreamDelta, SystemPromptBlock } from "../../types";
```

### WR-03: Missing await on async defaultOpenBrowser call

**File:** `packages/cli/src/commands/auth.ts:118`
**Issue:** `defaultOpenBrowser(info.url)` is called without `await` inside the synchronous `onAuth` callback. The function is `async` (line 178) and returns a Promise. If `execFile` fails (e.g., `xdg-open` not found on Linux), the rejection becomes an unhandled promise rejection, which triggers the global `unhandledRejection` handler registered in `main.ts` and sets `exitCode = 2`.
**Fix:** Add `.catch()` to handle browser-open failures gracefully:
```typescript
onAuth: (info) => {
  defaultOpenBrowser(info.url).catch(() => {
    // Browser open failure is non-fatal
  });
  process.stderr.write("Opening browser for authentication...\n");
```

### WR-04: Missing validateApiKey call for interactively entered API key

**File:** `packages/cli/src/commands/auth.ts:96-101`
**Issue:** When a user selects "API Key" from the interactive prompt and enters a key, the key is stored directly via `storeApiKey` at line 99 without calling `validateApiKey()`. The environment variable path (line 76) correctly validates. While the current validator is permissive (any non-empty string passes), skipping validation means future changes to validation rules won't apply to the interactive path, creating an inconsistency between the two input paths.
**Fix:**
```typescript
if (method === "api-key") {
  const key = await promptApiKey();
  if (key && validateApiKey(key)) {
    await storeApiKey(secrets, "default", key);
    process.stderr.write("API key saved successfully.\n");
    return;
  }
  process.stderr.write(key ? "Invalid API key format.\n" : "No key entered.\n");
  return;
}
```

## Info

### IN-01: Inconsistent SecretStorage mock key format between test files

**File:** `packages/cli/src/auth/api-key.test.ts:15`
**File:** `packages/cli/src/commands/auth.test.ts:31`
**Issue:** The mock `SecretStorage` in `api-key.test.ts` uses `${key}@${scope}` format for composite keys (line 15), while `auth.test.ts` and `main.ts:createInMemorySecretStorage` use `${scope}:${key}` format (line 31 and main.ts:73 respectively). Each test file is internally consistent so tests pass, but the differing conventions would cause cross-test failures if mocks were shared and makes it harder to reason about key format expectations.
**Fix:** Standardize on one format (e.g., `${scope}:${key}`) across all mock implementations.

### IN-02: Double disposal of container in mode handlers and main.ts

**File:** `packages/cli/src/main.ts:339-343`
**File:** `packages/cli/src/modes/execute.ts:147-149`
**File:** `packages/cli/src/modes/headless.ts:98-100`
**File:** `packages/cli/src/modes/interactive.ts:281`
**Issue:** The mode handlers (`runExecuteMode`, `runHeadlessMode`, `launchInteractiveMode`) each call `container.asyncDispose()` in their `finally` blocks. Additionally, `main.ts` calls `container.asyncDispose()` in its own `finally` block (line 342). This results in double disposal on every normal execution path. While the container's `disposed` guard makes this safe (idempotent), the unclear ownership of disposal responsibility is a code smell that could confuse future maintainers.
**Fix:** Choose one layer to own disposal. Either remove `asyncDispose()` from mode handlers (let `main.ts` handle it) or remove it from `main.ts` (let each mode own its cleanup).

### IN-03: Stub command handlers with TODO comments

**File:** `packages/cli/src/commands/config.ts:41-45`
**File:** `packages/cli/src/commands/threads.ts:57-61`
**Issue:** Multiple command handlers (`handleConfigGet`, `handleConfigSet`, `handleConfigList`, `handleThreadsList`, `handleThreadsNew`, `handleThreadsContinue`, `handleThreadsArchive`, `handleThreadsDelete`) are stub implementations with `void` expressions to suppress unused-parameter warnings and TODO comments. When users invoke these commands, they execute silently with no output and no error, which is confusing.
**Fix:** No immediate action needed if these are tracked in the roadmap. Consider adding `stderr.write("Not yet implemented.\n")` so users receive clear feedback.

---

_Reviewed: 2026-04-14T13:19:26Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
