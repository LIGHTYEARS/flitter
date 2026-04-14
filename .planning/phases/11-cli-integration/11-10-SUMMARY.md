---
phase: 11-cli-integration
plan: 10
subsystem: cli, llm, schemas
tags: [gap-closure, oauth, provider-config, ghost-domain, anthropic-baseurl, update-checker]

# Dependency graph
requires:
  - phase: 11-09
    provides: main.ts full wiring, container, auth commands
provides:
  - Ghost domain removal verified (zero api.flitter.dev / update.flitter.dev references)
  - OAuth rewired to @flitter/llm providers
  - Configurable Anthropic baseURL for custom endpoints (ARK/Volcengine)
  - Per-provider API key storage
  - Resilient update checker (try/catch, configurable URL, no default ghost domain)
  - Dynamic model registration via registerModel()
  - resolveProvider defaults unknown models to anthropic (custom baseURL support)
affects: [12-widgets-binding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-provider credential scoping (secrets.set/get with providerId scope)"
    - "registerModel() for runtime model registration"
    - "resolveProvider defaults to anthropic for unknown models (custom baseURL)"

key-files:
  created:
    - packages/cli/src/commands/auth.test.ts
  modified:
    - packages/schemas/src/config.test.ts
    - packages/llm/src/types.test.ts
    - packages/llm/src/providers/anthropic/provider.test.ts
    - packages/llm/src/providers/registry.test.ts
    - packages/cli/src/update/checker.test.ts

key-decisions:
  - "All implementation already done in prior plans (11-04 through 11-09); this plan validates and adds tests"
  - "Registry tests updated: unknown models default to anthropic instead of throwing"
  - "AnthropicProvider baseURL test uses notEqual assertion (SDK default varies by environment)"

patterns-established:
  - "Gap closure plans verify must_haves via targeted tests rather than reimplementation"

requirements-completed: [CLI-01, CLI-04]

# Metrics
duration: 8min
completed: 2026-04-14
---

# Phase 11 Plan 10: Gap Closure -- Ghost Domain Removal + OAuth Rewire + Configurable Providers Summary

**Verified ghost domain removal, OAuth rewire, configurable Anthropic baseURL, and resilient update checker via 21 new tests across 6 packages**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-14T12:56:50Z
- **Completed:** 2026-04-14T13:05:04Z
- **Tasks:** 6
- **Files modified:** 6

## Accomplishments
- Confirmed zero ghost domain references (api.flitter.dev, update.flitter.dev) in entire packages/ tree
- Confirmed zero ampURL references in CLI/flitter packages
- Added 21 new tests validating all 6 must_haves from the gap closure plan
- Fixed 3 existing tests that expected old throwing behavior (now default-to-anthropic)

## Task Commits

Each task was committed atomically:

1. **Task 1: Settings schema tests for provider config keys** - `170b45f` (test)
2. **Task 2: registerModel tests for dynamic model registration** - `6c2b27a` (test)
3. **Task 3: AnthropicProvider baseURL tests** - `6637d2c` (test)
4. **Task 4: Fix registry tests for new default-to-anthropic behavior** - `86d26ff` (fix)
5. **Task 5: Update checker resilience tests** - `05e37eb` (test)
6. **Task 6: Auth command handler tests** - `c30e374` (test)

## Files Created/Modified
- `packages/schemas/src/config.test.ts` - Added 9 tests for provider config keys (anthropic.baseURL, apiKey, openai.*, gemini.*, update.*)
- `packages/llm/src/types.test.ts` - Added 2 tests for registerModel (add + overwrite)
- `packages/llm/src/providers/anthropic/provider.test.ts` - Added 2 tests for _createClient baseURL from settings
- `packages/llm/src/providers/registry.test.ts` - Fixed 3 tests: unknown model/provider now default to anthropic/OpenAICompat instead of throwing
- `packages/cli/src/update/checker.test.ts` - Added 3 tests: no URL configured, network error, FLITTER_UPDATE_URL env var
- `packages/cli/src/commands/auth.test.ts` - Created with 5 tests: env key login, empty key rejection, non-TTY error, logout credential cleanup

## Decisions Made
- All implementation was already complete from prior plans (11-04 through 11-09); this gap closure plan adds test coverage and fixes stale tests
- Used `notEqual` assertion for AnthropicProvider default baseURL test since SDK default varies by environment (proxy vs production)
- Auth command tests use mock SecretStorage with call tracking (setCalls/deleteCalls arrays) for precise assertion

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale registry tests expecting throws for unknown models**
- **Found during:** Task 4
- **Issue:** 3 existing tests expected resolveProvider/createProvider/getProviderForModel to throw ProviderError for unknown models, but the implementation now defaults to "anthropic" for custom endpoint support
- **Fix:** Updated tests to assert default-to-anthropic behavior instead of throws; removed unused ProviderError import
- **Files modified:** packages/llm/src/providers/registry.test.ts
- **Verification:** 38 registry tests pass
- **Committed in:** 86d26ff

---

**Total deviations:** 1 auto-fixed (1 bug - stale test expectations)
**Impact on plan:** Necessary correction for test-code alignment. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 gap closure complete, all must_haves verified
- Ready for Phase 12 (WidgetsBinding + runApp TUI startup)

## Self-Check: PASSED

All 6 files verified present. All 6 commit hashes verified in git log.

---
*Phase: 11-cli-integration*
*Completed: 2026-04-14*
