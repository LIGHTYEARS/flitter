# Progress Log

## 2026-04-01

### 04:35 - TraeCli (Workstream 0: scaffolding)
- Started execution of the AMP parity gap-closure plan (TDD, scaffold-first).
- Next: restore `packages/flitter-amp/src/themes/amp-theme-data.ts` (currently truncated) and add theme contract unit tests.
- Tests: not run yet.

### 04:41 - TraeCli (Workstream 3: theme contract scaffold)
- Restored AMP theme type contracts in `packages/flitter-amp/src/themes/amp-theme-data.ts` (was truncated).
- Updated `deriveAppColors()` to strict AMP `x1.default()` token inventory + mappings in `packages/flitter-amp/src/themes/index.ts`.
- Next: add unit tests for theme contract + token mappings, then run `pnpm --filter flitter-amp test`.

### 04:43 - TraeCli (Infra: unblock test runner)
- Fixed a Bun parse error in `packages/flitter-core/src/widgets/markdown.ts:794` (duplicate `const fgColor`).
- Next: rerun `pnpm --filter flitter-amp test`.

### 04:56 - TraeCli (Workstream 3: tighten theme + tests)
- Updated cell assertions to reflect strict AMP ANSI mappings for keybind (`Color.blue`) and tool success (`Color.green`) in `packages/flitter-amp/src/__tests__/visual-cell-assertions.test.ts:88`.
- Fixed `SessionStore.save()` to ensure monotonic `updatedAt` even when `Date.now()` ties, unblocking `mostRecent()` determinism in `packages/flitter-amp/src/state/session-store.ts:76`.
- Fixed `ThinkingBlock` layout test to account for StatefulWidget build semantics in `packages/flitter-amp/src/__tests__/tool-card-layout.test.ts:152`.
- Next: rerun `pnpm --filter flitter-amp test`.

### 05:00 - TraeCli (Verification)
- Added `packages/flitter-amp/src/__tests__/theme-contract.test.ts` to lock AMP `x1` theme token inventory + mappings.
- Fixed ScreenBuffer double-buffer semantics by clearing recycled back buffer in `packages/flitter-core/src/terminal/screen-buffer.ts:322`.
- Tests: `pnpm --filter flitter-core test` PASS, `pnpm --filter flitter-amp test` PASS, `pnpm test` PASS.

### 05:05 - TraeCli (E2E scaffold)
- Added `packages/flitter-amp/src/__tests__/e2e-tmux-welcome.test.ts` to exercise the real TUI in a tmux pseudo-tty and assert the bottom hint is present.
- Next: run the new e2e test and re-run `pnpm test`.

### 05:06 - TraeCli (E2E verification)
- Tests: `bun test packages/flitter-amp/src/__tests__/e2e-tmux-welcome.test.ts` PASS, `pnpm test` PASS.

### 05:22 - TraeCli (AMP icon alignment)
- Expanded icon registry to cover AMP-style disclosure/tool/plan/todo/arrow icons in `packages/flitter-amp/src/ui/icons/types.ts:1` and `packages/flitter-amp/src/ui/icons/sets/unicode.ts:1`.
- Updated ThinkingBlock disclosure chevrons to AMP `▶/▼` and fixed streaming indicator to use braille spinner in `packages/flitter-amp/src/widgets/thinking-block.ts:115`.
- Routed remaining icon glyphs through registry: tool header status (`toolStatusIcon`), plan view, todo list tool, handoff indicator, and web search arrows.
- Updated cell assertions + fixed tmux e2e harness to start the TUI as the pane process.
- Tests: `pnpm --filter flitter-amp test` PASS, `pnpm test` PASS.

### 05:26 - TraeCli (AMP-only icons)
- Removed legacy icon sets (nerd/ascii) and the `--icons`/config surface; project now uses AMP icon mapping only.
- Simplified icon registry API: `icon(name)` and `toolStatusIcon(status)` are now fixed to `UNICODE_ICONS`.
- Tests: `pnpm --filter flitter-amp test` PASS, `pnpm test` PASS.
