---
phase: 11-cli-integration
plan: 04
subsystem: auth
tags: [api-key, oauth, pkce, keyring, cli-auth]

# Dependency graph
requires:
  - phase: 11-06
    provides: ServiceContainer, SecretStorage interface, createContainer
  - phase: 11-01
    provides: Commander.js command tree, CliContext
provides:
  - API Key validation and storage (validateApiKey, hasApiKey, storeApiKey)
  - OAuth PKCE browser callback flow (performOAuth, startOAuthCallbackServer)
  - Login command with 3-tier priority (env > interactive > OAuth)
  - Logout command with credential clearing
affects: [11-07-main-entry]

# Tech tracking
tech-stack:
  added: []
  patterns: [dependency-injection-hooks, port-retry-binding, state-csrf-validation]

key-files:
  created:
    - packages/cli/src/auth/api-key.ts
    - packages/cli/src/auth/oauth.ts
    - packages/cli/src/auth/api-key.test.ts
    - packages/cli/src/auth/oauth.test.ts
  modified:
    - packages/cli/src/commands/auth.ts
    - packages/cli/src/index.ts
    - packages/flitter/package.json
    - apps/flitter-cli/package.json

key-decisions:
  - "Login priority: FLITTER_API_KEY env var > interactive prompt > OAuth PKCE (matches reverse-engineered eF0)"
  - "OAuth uses dependency injection hooks (openBrowser, exchangeCodeForToken) for testability"
  - "Callback server uses event-based port retry (49152-49161) with async port resolution"

patterns-established:
  - "OAuthHooks pattern: inject openBrowser/exchangeCodeForToken for unit testing OAuth flows"
  - "SecretStorage scoping: all keys stored per-ampURL for multi-server support"

requirements-completed: [CLI-04]

# Metrics
duration: 9min
completed: 2026-04-14
---

# Phase 11 Plan 04: Auth Flow Summary

**API Key validation + OAuth PKCE browser callback + login/logout commands with 3-tier auth priority and 17 tests**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-14T05:15:04Z
- **Completed:** 2026-04-14T05:23:37Z
- **Tasks:** 3 (TDD RED/GREEN cycle + barrel exports)
- **Files modified:** 8

## Accomplishments
- API Key module: validateApiKey (sk-/flitter- prefix), getApiKeyFromEnv, promptApiKey (readline), storeApiKey/hasApiKey (SecretStorage per-URL)
- OAuth PKCE module: startOAuthCallbackServer (port retry 49152+), waitForCallback (state CSRF validation), performOAuth (full flow with DI hooks), buildAuthUrl
- Login command: 3-tier priority (env var > interactive input > OAuth PKCE), format validation at each stage
- Logout command: clears apiKey + oauthToken from SecretStorage
- 17 tests passing (9 api-key + 8 oauth), 83 total CLI tests green

## Task Commits

Each task was committed atomically:

1. **RED: Failing tests for api-key and oauth** - `ef86f92` (test)
2. **GREEN: Implement api-key.ts, oauth.ts, update commands/auth.ts** - `c57a2db` (feat)
3. **Export auth modules from barrel** - `1855da7` (feat)

## Files Created/Modified
- `packages/cli/src/auth/api-key.ts` - API Key validation, env read, interactive prompt, storage
- `packages/cli/src/auth/oauth.ts` - OAuth PKCE flow: callback server, state validation, token exchange
- `packages/cli/src/auth/api-key.test.ts` - 9 tests for validation, env, storage
- `packages/cli/src/auth/oauth.test.ts` - 8 tests for server binding, port retry, state validation, full flow
- `packages/cli/src/commands/auth.ts` - Replaced TODO stubs with real login/logout implementations
- `packages/cli/src/index.ts` - Added auth module exports
- `packages/flitter/package.json` - Fixed package name: flitter -> @flitter/flitter
- `apps/flitter-cli/package.json` - Fixed dependency: flitter -> @flitter/flitter

## Decisions Made
- Login priority follows reverse-engineered eF0: env var first, then interactive, then OAuth
- OAuth module uses dependency injection hooks (OAuthHooks) for testability without real browser/HTTP
- Callback server uses event-based async port binding with retry (not synchronous throw)
- SecretStorage keys scoped by ampURL for multi-server credential isolation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed @flitter/flitter package name for workspace resolution**
- **Found during:** Task 2 (implementation)
- **Issue:** packages/flitter/package.json had name "flitter" but @flitter/cli depended on "@flitter/flitter" via workspace:*. pnpm install failed with ERR_PNPM_WORKSPACE_PKG_NOT_FOUND.
- **Fix:** Renamed package to "@flitter/flitter" in packages/flitter/package.json and updated apps/flitter-cli/package.json dependency reference
- **Files modified:** packages/flitter/package.json, apps/flitter-cli/package.json
- **Verification:** pnpm install succeeds, all 83 CLI tests pass
- **Committed in:** c57a2db (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Package name fix was essential for workspace resolution. No scope creep.

## Issues Encountered
- OAuth callback server test for "all ports fail" needed async assertion (port promise rejection) instead of synchronous throw check, adjusted test accordingly

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Auth flow complete: login/logout commands wired with real API Key + OAuth implementations
- Ready for 11-07 main entry point integration
- SecretStorage interface from @flitter/flitter enables any keyring backend

---
*Phase: 11-cli-integration*
*Completed: 2026-04-14*
