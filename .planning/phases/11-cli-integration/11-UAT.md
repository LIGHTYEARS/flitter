---
status: partial
phase: 11-cli-integration
source: 11-01-SUMMARY.md, 11-02-SUMMARY.md, 11-03-SUMMARY.md, 11-04-SUMMARY.md, 11-05-SUMMARY.md, 11-06-SUMMARY.md, 11-07-SUMMARY.md, 11-08-SUMMARY.md, 11-09-SUMMARY.md
started: 2026-04-14T12:00:00Z
updated: 2026-04-14T09:20:00Z
---

## Current Test

[testing paused — 3 items outstanding (blocked: TTY/LLM required)]

## Tests

### 1. Cold Start Smoke Test
expected: `bun run apps/flitter-cli/bin/flitter.ts --version` prints semver and exits 0
result: pass

### 2. Help Output & Command Tree
expected: `bun run apps/flitter-cli/bin/flitter.ts --help` shows all subcommands (login, logout, threads, config, update) with descriptions
result: pass

### 3. Subcommand Help — threads
expected: `bun run apps/flitter-cli/bin/flitter.ts threads --help` shows 5 subcommands: list, new, continue, archive, delete
result: pass

### 4. Unknown Command Handling
expected: `bun run apps/flitter-cli/bin/flitter.ts nonexistent` does not crash or throw an unhandled error
result: pass

### 5. Package Import Chain (no circular deps)
expected: No `@flitter/cli` in flitter's package.json; `@flitter/util` present in cli's package.json
result: pass

### 6. Security Fix Verification (execFile)
expected: No `exec()` calls in oauth.ts; only `execFile` used for browser opening
result: pass

### 7. All Unit Tests Pass
expected: `bun test` in packages/cli (130 pass) and packages/flitter (21 pass) — 151 total, 0 failures
result: pass

### 8. Stub Commands Don't Crash
expected: `flitter threads list` and `flitter config list` run without errors (exit 0)
result: pass

### 9. Interactive TUI Launch (TTY required)
expected: Running `bun run apps/flitter-cli/bin/flitter.ts` in a real terminal with a valid API key launches the TUI widget tree
result: blocked
blocked_by: physical-device
reason: "Requires real TTY terminal and valid LLM API key — cannot verify in automated agent session"

### 10. Headless JSON Stream (LLM required)
expected: `echo '{"role":"user","content":"hello"}' | bun run apps/flitter-cli/bin/flitter.ts --headless` outputs JSON Lines events to stdout
result: blocked
blocked_by: third-party
reason: "Requires valid LLM API key and working provider connection — cannot verify without credentials"

### 11. Execute Mode (LLM required)
expected: `bun run apps/flitter-cli/bin/flitter.ts --execute "say hi"` prints LLM response text to stdout
result: blocked
blocked_by: third-party
reason: "Requires valid LLM API key and working provider connection — cannot verify without credentials"

### 12. ampURL Default Value Validity
expected: The default ampURL (`https://api.flitter.dev`) should either resolve to a working backend service, or be removed/made optional so login doesn't silently fail at OAuth step 3
result: issue
reported: "api.flitter.dev DNS resolution fails (HTTP 000). The default ampURL is a ghost domain — no backend exists. OAuth flow at login priority 3 will fail with DNS error when browser tries to open https://api.flitter.dev/oauth/authorize"
severity: blocker

### 13. OAuth Flow Uses @flitter/llm Providers
expected: `flitter login` should leverage @flitter/llm's OAuth Provider Registry (OpenAICodexOAuthProvider, AnthropicOAuthProvider, GitHubCopilotOAuthProvider) rather than its own hardcoded ampURL-based OAuth that points to a non-existent server
result: issue
reported: "CLI auth module (packages/cli/src/auth/oauth.ts) implements its own OAuth pointing at ampURL, completely disconnected from @flitter/llm/oauth which has working providers for OpenAI (auth.openai.com), Anthropic (claude.ai), and GitHub Copilot (github.com). Zero imports of OpenAICodexOAuthProvider/AnthropicOAuthProvider/GitHubCopilotOAuthProvider in @flitter/cli"
severity: blocker

### 14. Update Check Endpoint Validity
expected: The default update check URL (`https://update.flitter.dev/latest`) should either resolve to a working update service, or the update check should gracefully handle the unreachable endpoint without crashing
result: issue
reported: "update.flitter.dev DNS resolution fails (HTTP 000). Additionally, checkForUpdate() in checker.ts has no try/catch around fetch() — DNS failure will throw unhandled TypeError: fetch failed instead of gracefully returning null"
severity: major

### 15. Worker URL Derivation (Pi/lH functions)
expected: Amp's Pi()/lH() functions that derive worker URLs from ampURL (routing to ampworkers.com / api.rivet.dev) should NOT be present in Flitter code, as these are Amp-specific infrastructure with no Flitter equivalent
result: pass

## Summary

total: 15
passed: 9
issues: 3
pending: 0
skipped: 0
blocked: 3

## Gaps

- truth: "ampURL default value resolves to a working backend or is optional"
  status: failed
  reason: "User reported: api.flitter.dev DNS resolution fails (HTTP 000). The default ampURL is a ghost domain — no backend exists. OAuth flow at login priority 3 will fail with DNS error when browser tries to open https://api.flitter.dev/oauth/authorize"
  severity: blocker
  test: 12
  root_cause: "Mechanical domain replacement during JS→TS migration: ampcode.com was replaced with api.flitter.dev without considering that ampURL serves as the entry point for Amp's proprietary backend (OAuth, Thread management, Worker routing, billing). Flitter has no equivalent backend."
  artifacts:
    - path: "packages/cli/src/main.ts"
      issue: "Hardcoded default ampURL to non-existent api.flitter.dev"
    - path: "packages/cli/src/auth/oauth.ts"
      issue: "buildAuthUrl and defaultExchangeCodeForToken construct URLs against ampURL which doesn't exist"
    - path: "packages/flitter/src/container.ts"
      issue: "ContainerOptions.ampURL propagated but never validated for reachability"
  missing:
    - "Remove or make ampURL optional; login should not default to a ghost domain"
    - "OAuth flow should use @flitter/llm OAuth Provider Registry instead of custom ampURL-based flow"
  debug_session: ""

- truth: "flitter login uses @flitter/llm OAuth Provider Registry for multi-provider authentication"
  status: failed
  reason: "User reported: CLI auth module implements its own OAuth pointing at ampURL, completely disconnected from @flitter/llm/oauth which has working providers for OpenAI, Anthropic, and GitHub Copilot"
  severity: blocker
  test: 13
  root_cause: "Phase 11-04 implemented OAuth by translating Amp's ampURL-based OAuth flow verbatim, instead of connecting to the already-existing @flitter/llm OAuth Provider Registry that has working provider implementations"
  artifacts:
    - path: "packages/cli/src/auth/oauth.ts"
      issue: "Custom OAuth implementation pointing at ampURL instead of using @flitter/llm/oauth"
    - path: "packages/cli/src/commands/auth.ts"
      issue: "handleLogin calls performOAuth(ampURL) instead of @flitter/llm provider registry"
    - path: "packages/llm/src/oauth/providers/openai-codex.ts"
      issue: "Working OpenAI OAuth provider exists but is unused by CLI"
    - path: "packages/llm/src/oauth/providers/anthropic.ts"
      issue: "Working Anthropic OAuth provider exists but is unused by CLI"
    - path: "packages/llm/src/oauth/providers/github-copilot.ts"
      issue: "Working GitHub Copilot OAuth provider exists but is unused by CLI"
    - path: "packages/llm/src/oauth/registry.ts"
      issue: "OAuth Provider Registry exists but CLI doesn't use it"
  missing:
    - "Refactor handleLogin to present provider selection (Anthropic/OpenAI/GitHub Copilot)"
    - "Wire selected provider through @flitter/llm OAuth Provider Registry"
    - "Store credentials per-provider using OAuthCredentials interface"
    - "Remove custom performOAuth(ampURL) flow from packages/cli/src/auth/oauth.ts"
  debug_session: ""

- truth: "Update check gracefully handles unreachable endpoint without crashing"
  status: failed
  reason: "User reported: update.flitter.dev DNS resolution fails. checkForUpdate() has no try/catch around fetch() — DNS failure will throw unhandled TypeError instead of returning null"
  severity: major
  test: 14
  root_cause: "checkForUpdate() in checker.ts was translated from Amp's code which pointed at static.ampcode.com (a real CDN). The domain was replaced with update.flitter.dev (non-existent), and no error handling was added for network failures"
  artifacts:
    - path: "packages/cli/src/update/checker.ts"
      issue: "fetch() call at line 158 has no try/catch; DNS failure throws unhandled TypeError"
    - path: "packages/cli/src/update/checker.ts"
      issue: "Default URL update.flitter.dev is non-existent"
  missing:
    - "Wrap fetch() in try/catch, return null on network errors"
    - "Remove or make update URL configurable; don't default to non-existent domain"
  debug_session: ""
