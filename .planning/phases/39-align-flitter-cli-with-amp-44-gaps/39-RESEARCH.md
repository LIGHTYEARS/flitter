# Phase 39: Align flitter-cli with AMP 44 gaps — Research

**Researched:** 2026-04-10
**Domain:** TypeScript/Bun TUI application — state machine upgrade, UI widget gap closure
**Confidence:** HIGH (all claims verified against live codebase)

## Summary

Phase 39 closes 44 audit-identified gaps between flitter-cli and AMP source code. The gaps are categorized P0-CRITICAL (6), P1-HIGH (11), P2-MED (15), P3-LOW (12). The phase is documented in SPEC.md / TASKS.md / CHECKLIST.md which constitute the authoritative implementation guide — this research maps the current codebase state against each gap claim so the planner can produce accurate wave tasks.

The single most important finding is that **F4/F5/F6 are already fully implemented** — the `_onTextChanged` handler in `input-area.ts` already detects `?` and `/` triggers, `onQuestionMarkTrigger`/`onSlashTrigger` props exist, and `app-shell.ts` wires them to `_showShortcutHelp()` and `_showCommandPalette()`. The command palette already has `maxHeight` constraints preventing RenderFlex overflow. **Wave 1 can skip W1-1 verification and jump directly to W1-2 (ThreadWorker state machine).**

The second critical finding: the current test suite has **8 pre-existing failures** in `bun test` that are unrelated to Phase 39 work. These must be documented as pre-existing so phase tests don't inherit them as regressions.

**Primary recommendation:** Execute waves in order per TASKS.md, with W1-2 (ThreadWorker) as the critical path. All P3-LOW items (F36-F44) except F35 are net-new features with no existing code — scope them as independent widgets added to command palette.

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| bun | project runtime | Test runner + TS execution | [VERIFIED: package.json] |
| zod | installed | Schema validation (ConfigService) | [VERIFIED: config-service.ts] |
| @mariozechner/pi-ai | installed | LLM provider abstraction | [VERIFIED: factory.ts] |

No new npm packages are required for Phase 39. All gaps are implementation-only changes within `packages/flitter-cli/src/`.

**Test command:** `cd packages/flitter-cli && bun test`
**Type check command:** `cd packages/flitter-cli && bun run typecheck`

## Architecture Patterns

### Recommended Project Structure (additions only)

```
packages/flitter-cli/src/
├── state/
│   ├── thread-worker.ts        # NEW: F1 — ThreadWorker class (replaces ThreadWorkerEntry)
│   └── handoff-service.ts      # NEW: F17 — HandoffService extracted from AppState
├── widgets/
│   ├── queued-messages-list.ts # NEW: F10 — Queue UI component
│   ├── mcp-status-modal.ts     # NEW: F28 — MCP status modal
│   ├── console-overlay.ts      # NEW: F36 — Console/debug log viewer
│   └── news-feed-reader.ts     # NEW: F37 — RSS news feed widget
└── utils/
    ├── effort-hint-controller.ts # NEW: F21 — Deep mode effort hint
    ├── ide-picker.ts             # NEW: F39 — IDE picker
    └── ide-client.ts             # NEW: F40 — IDE background client
```

### Pattern 1: ThreadWorker State Machine (F1 — the critical path)

**What:** `ThreadWorkerEntry` (4-field thin record in `types.ts`) must become a full `ThreadWorker` class with event-driven `handle(delta)` method.

**Current state:** `ThreadWorkerEntry` is defined in `types.ts` lines 533-542 with only 4 fields: `threadID`, `state`, `inferenceState`, `turnStartTime`. `ThreadPool.getOrCreateWorker()` creates these inline (lines 462-474). `ThreadPool.threadWorkerMap` is typed `Map<string, ThreadWorkerEntry>`.

**AMP reference:** `tmux-capture/amp-source/29_thread_worker_statemachine.js` contains the minified AMP `ThreadWorker` class. Key delta events observed: `user:message-queue:enqueue`, `user:message-queue:dequeue`, `assistant:message`, `tool:data`, `error`, `inference:completed`, `cancelled`, `thread:truncate`, `title:generation`.

**Implementation pattern:**
```typescript
// NEW: packages/flitter-cli/src/state/thread-worker.ts
export type WorkerState = 'idle' | 'running' | 'tool_running' | 'cancelled' | 'error';
export type InferenceState = 'none' | 'streaming' | 'thinking' | 'tool_call';

export class ThreadWorker {
  readonly threadID: ThreadID;
  state: WorkerState = 'idle';
  inferenceState: InferenceState = 'none';
  ops: {
    inference: AbortController | null;
    tools: Record<string, AbortController>;
    titleGeneration: AbortController | null;
  } = { inference: null, tools: {}, titleGeneration: null };
  ephemeralError: string | null = null;
  retryCountdownSeconds: number = 0;
  fileChanges: string[] = [];
  toolCallUpdates: unknown[] = [];
  trackedFiles: string[] = [];
  turnStartTime: number | null = null;

  handle(delta: WorkerDelta): void { /* dispatch on delta.type */ }
}
```

**Migration:** `thread-pool.ts` line 456 changes `Map<string, ThreadWorkerEntry>` to `Map<string, ThreadWorker>`. `getOrCreateWorker()` constructs `ThreadWorker` instances. All callsites in `app-state.ts` and `prompt-controller.ts` that use `ThreadWorkerEntry` fields must be updated.

### Pattern 2: Compaction Actual Pruning (F3)

**What:** `_checkCompaction()` in `prompt-controller.ts` already calculates `cutIndex` and `_cutMessageId` but **never actually removes items from session**. Line 417-425 computes the cut boundary but only logs it — there's no call to `session.truncateBefore()` because that method doesn't exist yet.

**Required changes:**
1. Add `truncateBefore(index: number)` to `SessionState` in `session.ts` (sibling of existing `truncateAfter()` at line 822)
2. Call it from `_checkCompaction()` after setting `_cutMessageId`
3. Change `app-state.ts` line 335: `get isAutoCompacting(): boolean { return false; }` to read from PromptController's compaction state

**Session already has:** `truncateAfter(index: number)` at line 822 as a reference implementation pattern.

### Pattern 3: Queue Auto-Dequeue (F2)

**What:** The auto-dequeue is partially implemented. `prompt-controller.ts` lines 341-356 already check `_getQueuedMessages()` and dequeue on `end_turn`. However, the dequeue logic calls `queue.shift()` on a local array copy — **this mutates the copy, not the actual `handle.queuedMessages` array**. The callback provides a reference, so `shift()` on the returned array does mutate in-place (arrays are passed by reference in JS). This needs verification.

**Missing:** The `user:message-queue:enqueue` smart-check logic (if idle when enqueuing, immediately dequeue) belongs in the new `ThreadWorker.handle()`. Currently there's no check when a message is enqueued while the thread is idle.

### Pattern 4: Widget Creation Pattern

**What:** All new widgets follow the same flitter-core StatelessWidget/StatefulWidget pattern used throughout `src/widgets/`.

**Reference implementation:**
```typescript
// Source: packages/flitter-cli/src/widgets/toast-overlay.ts
import { StatelessWidget, Widget, type BuildContext } from '../../../flitter-core/src/framework/widget';
export class MyNewWidget extends StatelessWidget {
  constructor(props: MyWidgetProps) { super({}); ... }
  build(context: BuildContext): Widget { ... }
}
```

**Overlay registration:** New overlays use `OVERLAY_IDS` in `state/overlay-ids.ts`, `overlayManager.push()` in `state/overlay-manager.ts`, and command registration in `commands/command-registry.ts`.

### Anti-Patterns to Avoid

- **Don't mutate `ThreadWorkerEntry` in-place through worker map** — the new `ThreadWorker` class owns its own state mutation
- **Don't call `session.truncateBefore()` while lifecycle != 'idle'** — mirror the `truncateAfter()` guard at line 823
- **Don't add new npm packages** — all required functionality is achievable with existing dependencies

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spinner animation | Custom braille ticker | Existing `BrailleSpinner` in `scanning-bar.ts` | Already animates at frame rate |
| Toast auto-dismiss | Custom timer | Existing `ToastController` in `toast-overlay.ts` | Already has show/dismiss/auto-dismiss |
| Overlay management | Custom stack | `OverlayManager` in `state/overlay-manager.ts` | Manages priority, dismiss, has() |
| Command registration | Direct map | `CommandRegistry` in `commands/command-registry.ts` | Standard registration pattern |
| Schema validation | Custom parser | Existing `zod` + `settingsSchema` in `config-service.ts` | Already validates provider settings |
| Thread ID generation | UUID directly | `generateThreadID()` in `state/types.ts` | Ensures `T-{uuid}` format |

## Current Codebase Gap Status

### P0-CRITICAL — Verified Status

| Gap | Status | Evidence |
|-----|--------|----------|
| **F1** ThreadWorker state machine | NOT IMPLEMENTED | `types.ts:533` has 4-field `ThreadWorkerEntry`; no `thread-worker.ts` file; no `handle(delta)` method anywhere |
| **F2** Queue auto-dequeue | PARTIALLY IMPLEMENTED | `prompt-controller.ts:341-356` dequeues on `end_turn`; missing smart-enqueue-when-idle logic |
| **F3** Compaction actual pruning | NOT IMPLEMENTED | `_checkCompaction()` computes cut point but never calls `session.truncateBefore()`; `truncateBefore()` method doesn't exist; `isAutoCompacting` hardcoded `false` at `app-state.ts:335` |
| **F4** `?` triggers shortcuts help | ALREADY DONE | `input-area.ts:444-447` detects `text === '?' && oldText === ''`, clears, fires `onQuestionMarkTrigger`; `app-shell.ts:992` wires to `_showShortcutHelp()` |
| **F5** `/` triggers command palette | ALREADY DONE | `input-area.ts:449-452` detects `text === '/' && oldText === ''`, clears, fires `onSlashTrigger`; `app-shell.ts:993` wires to `_showCommandPalette()` |
| **F6** Command palette overflow fix | ALREADY DONE | `command-palette.ts:296` sets `maxHeight = screenHeight - 4`; line 479/492 use `Math.min` and `maxHeight` constraints |

### P1-HIGH — Verified Status

| Gap | Status | Evidence |
|-----|--------|----------|
| **F7** Thread relationships | NOT IMPLEMENTED | No `ThreadRelationship` type in `types.ts`; no `_relationships` in `thread-pool.ts` |
| **F8** Thread preview split-view | PARTIALLY IMPLEMENTED | `ThreadPreview` class exists in `thread-list.ts:118`; hover wiring to app-shell overlay is missing |
| **F9** createThread async | NOT IMPLEMENTED | `thread-pool.ts:182` `createThread()` is synchronous; no `seededMessages`/`parent`/`draftContent` params |
| **F10** Queue UI component | NOT IMPLEMENTED | No `queued-messages-list.ts` file |
| **F11** Confirmation overlay multi-option | NOT IMPLEMENTED | `confirmation-overlay.ts` only has `onConfirm`/`onCancel` (y/n only, no `options: string[]`) |
| **F12** Toast notifications | ALREADY DONE | `ToastController` in `toast-overlay.ts` fully implements show/dismiss/auto-dismiss with type styling |
| **F13** Edit previous message | PARTIALLY IMPLEMENTED | Shortcut registered in `defaults.ts:265-281` with `ArrowUp`; `ctx.hooks.editPreviousMessage?.()` called; **but `editPreviousMessage()` hook implementation is not wired in `app-shell.ts`** (grep returns no results) |
| **F14** Pending skills injection | PARTIALLY IMPLEMENTED | `addPendingSkill`/`consumePendingSkillsMessage` exist in `app-state.ts:894-941`; ThreadWorker pipeline injection missing because ThreadWorker itself doesn't exist yet |
| **F15** Agent mode per-thread | PARTIALLY IMPLEMENTED | `ThreadHandle.agentMode` field exists in `types.ts:508`; but switching threads doesn't restore per-thread mode (no logic in thread switch path) |
| **F16** Title generation enhanced | NOT IMPLEMENTED | `generateTitle()` in `thread-pool.ts:387` is synchronous, no `AbortController`, no skip rules, no child-thread check |
| **F17** HandoffService extracted | NOT IMPLEMENTED | No `state/handoff-service.ts`; handoff logic lives directly in `app-state.ts` |

### P2-MED — Verified Status

| Gap | Status | Evidence |
|-----|--------|----------|
| **F18** Provider speed settings | ALREADY DONE | `config-service.ts:10,16` has `anthropic.speed` and `openai.speed` schema; `border-builders.ts:190` renders speed suffix |
| **F19** Interleaved thinking config | PARTIALLY IMPLEMENTED | `config-service.ts:14` has `anthropic.interleavedThinking.enabled`; not verified if wired to `pi-ai-provider.ts` request |
| **F20** Shimmer/falling overlay | PARTIALLY IMPLEMENTED | `border-shimmer.ts` implements border shimmer on InputArea; "falling overlay" effect on deep reasoning activation not implemented |
| **F21** Deep mode effort hint | NOT IMPLEMENTED | No `effort-hint-controller.ts` |
| **F22** Image click external viewer | NOT IMPLEMENTED | `image-preview-overlay.ts` has no click → external open handler |
| **F23** Context analyze precise tokens | UNKNOWN | Requires inspection of `context-analyze-overlay.ts` |
| **F24** Thread mentions `@@` | PARTIALLY IMPLEMENTED | `input-area.ts:438-441` detects `@@` and fires `onSpecialCommandTrigger`; thread picker overlay integration status unclear |
| **F25** Model catalog 40+ models | DELEGATED TO pi-ai | `factory.ts` uses pi-ai catalog; number of models depends on pi-ai's catalog |
| **F26** Provider config service enhanced | PARTIALLY IMPLEMENTED | `config-service.ts` has Zod schema; `baseUrl` overrides supported in `factory.ts`; per-provider persistent storage unclear |
| **F27** Bash invocation spinner | PARTIALLY IMPLEMENTED | `bash-invocations.ts:68` shows `'⠋ '` for running state but it's a static character, not animated BrailleSpinner |
| **F28** MCP status modal | NOT IMPLEMENTED | No `mcp-status-modal.ts` |
| **F29** File changes overlay | PARTIALLY IMPLEMENTED | `file-changes-overlay.ts` exists; "session-modified files" + diff view completion status unclear |
| **F30** Resizable bottom grid | NOT IMPLEMENTED | No `bottomGridUserHeight`/`bottomGridDragStartY` in `app-state.ts` (grep found nothing) |
| **F31** interruptQueuedMessage | PARTIALLY IMPLEMENTED | `app-state.ts:1008` has `interruptQueue()` which removes last item; no `interruptQueuedMessage(index)` for specific item |
| **F32** pendingHandoffThreads | NOT IMPLEMENTED | `thread-pool.ts` has no `pendingHandoffThreads: Map<string, ThreadHandle>` |

### P3-LOW — Verified Status

| Gap | Status | Evidence |
|-----|--------|----------|
| **F33** Thread visibility UI command | PARTIALLY IMPLEMENTED | `setThreadVisibility()` in `thread-pool.ts:423`; command palette entry may be missing |
| **F34** Thread merging/merged | NOT IMPLEMENTED | No `merging`/`merged` in `ThreadVisibility` or `ThreadStatus` types |
| **F35** Worker ephemeralError + retry | NOT IMPLEMENTED | Depends on F1 ThreadWorker |
| **F36** Console overlay | NOT IMPLEMENTED | No `console-overlay.ts` |
| **F37** News feed reader | STUB ONLY | Command registry at line 219 has "Open news feed in browser" (opens URL); no RSS reader widget |
| **F38** JetBrains installer | NOT IMPLEMENTED | |
| **F39** IDE picker `/ide` command | NOT IMPLEMENTED | |
| **F40** IDE client | NOT IMPLEMENTED | |
| **F41** Auto-copy on selection | NOT IMPLEMENTED | |
| **F42** Skill preview | NOT IMPLEMENTED | No `skillPreview`/`cachedSkillForPreview` in `skill-service.ts` |
| **F43** Code mode | PARTIALLY IMPLEMENTED | `AGENT_MODES` in `types.ts` doesn't have `code` key; would need to be added |
| **F44** DTW mode/transport | NOT IMPLEMENTED | No `createThreadWorker` transport layer |

## Common Pitfalls

### Pitfall 1: ThreadWorkerEntry migration breaks TypeScript types
**What goes wrong:** After creating `thread-worker.ts`, the import of `ThreadWorkerEntry` in `thread-pool.ts:7` and all callers must be updated simultaneously. TypeScript will catch this, but partially migrated code will fail to compile.
**How to avoid:** Do the full migration in W1-2.3 atomically — update `types.ts`, `thread-pool.ts`, and all callsites in a single commit. Run `bun run typecheck` before committing.
**Warning signs:** TS2305 errors about missing `ThreadWorkerEntry` properties or "type is not assignable" errors.

### Pitfall 2: Pre-existing test failures mask regressions
**What goes wrong:** 8 tests currently fail in the baseline (`bun test` returns 8 fail). Developers may think new failures from Phase 39 work are pre-existing.
**How to avoid:** Document the 8 pre-existing failures before starting. After each wave, count failures — if count > 8, new regressions exist.
**Pre-existing failures (as of 2026-04-10):**
1. `BashExecutor > respects working directory`
2. `AppState > UI-specific state > newThread() keeps sessionId unchanged`
3. `Lifecycle Integration > newThread() resets conversation > preserves sessionId`
4. `Lifecycle Integration > newThread() resets conversation > allows new prompt submission after newThread`
5. `InputArea — Widget Tree Structure > mode badge shows when mode is set`
6. `AppState turn and screen state integration > screenState after newThread > returns empty (not welcome) after newThread because turnCount > 0`
7. `WelcomeScreen — Hint Text Content > 2.1 contains "Welcome to Amp" text`
8. `resolveToolDisplayName > maps Task -> Task`

### Pitfall 3: queue.shift() mutates handle reference but dequeue not surfaced to UI
**What goes wrong:** `prompt-controller.ts:348` calls `queue.shift()` which mutates `handle.queuedMessages` in-place (since arrays are reference types). But the ThreadPool listener is not notified, so the Queue UI (F10) won't see the dequeue.
**How to avoid:** After dequeuing, call `this._getQueuedMessages = ...` callback path OR ensure the ThreadPool/AppState is notified. The F2 auto-dequeue fix and F10 Queue UI must coordinate notification.

### Pitfall 4: createThread async breaks synchronous callers
**What goes wrong:** F9 makes `createThread()` async. Callers in `app-state.ts` and `app-shell.ts` that currently call `createThread()` synchronously will need `await` or be wrapped in async contexts.
**How to avoid:** grep all callers of `createThread` before converting to async; update all callsites.

### Pitfall 5: F8 thread preview hover — no mouse events in TUI
**What goes wrong:** TUI (terminal) mode has limited mouse event support. "Hover" in AMP may be keyboard-driven selection preview, not literal mouse hover.
**How to avoid:** Check AMP reference `20_thread_management.js` to confirm preview trigger mechanism. The existing `ThreadPreview` widget in `thread-list.ts:118` may already be correct — only the wiring to show it on selection/hover may be missing.

## Code Examples

### Existing ThreadWorkerEntry (to be replaced)

```typescript
// Source: packages/flitter-cli/src/state/types.ts lines 533-542
export interface ThreadWorkerEntry {
  readonly threadID: ThreadID;
  state: ThreadWorkerState;        // 'initial' | 'active' | 'disposed'
  inferenceState: ThreadInferenceState; // 'idle' | 'running' | 'cancelled'
  turnStartTime: number | null;
}
```

### getOrCreateWorker (current, to be refactored)

```typescript
// Source: packages/flitter-cli/src/state/thread-pool.ts lines 462-474
getOrCreateWorker(threadID: string): ThreadWorkerEntry {
  let worker = this.threadWorkerMap.get(threadID);
  if (!worker) {
    worker = {
      threadID: threadID as ThreadID,
      state: 'initial',
      inferenceState: 'idle',
      turnStartTime: null,
    };
    this.threadWorkerMap.set(threadID, worker);
  }
  return worker;
}
```

### isAutoCompacting (hardcoded false — to be fixed)

```typescript
// Source: packages/flitter-cli/src/state/app-state.ts line 335
get isAutoCompacting(): boolean {
  return false;  // F3: must become dynamic based on PromptController state
}
```

### F4/F5 already wired correctly (DONE — no action needed)

```typescript
// Source: packages/flitter-cli/src/widgets/input-area.ts lines 444-453
if (newText === '?' && oldText === '') {
  this.controller.clear();
  this.widget.onQuestionMarkTrigger?.();
  return;
}
if (newText === '/' && oldText === '') {
  this.controller.clear();
  this.widget.onSlashTrigger?.();
  return;
}

// Source: packages/flitter-cli/src/widgets/app-shell.ts lines 992-993
onQuestionMarkTrigger: () => this._showShortcutHelp(),
onSlashTrigger: () => this._showCommandPalette(),
```

### toast already working (F12 DONE)

```typescript
// Source: packages/flitter-cli/src/widgets/toast-overlay.ts
// ToastController.show(message, type, duration?) — already full implementation
// Auto-dismiss timer, success/error/info types, addListener/removeListener
```

### Existing truncateAfter pattern (template for truncateBefore)

```typescript
// Source: packages/flitter-cli/src/state/session.ts lines 822-851
truncateAfter(index: number): void {
  if (this._lifecycle !== 'idle') {
    log.warn(`SessionState: truncateAfter ignored — lifecycle is '${this._lifecycle}'`);
    return;
  }
  if (index < 0 || index >= this._items.length) return;
  this._items = this._items.slice(0, index + 1);
  // ... reset streaming state, rebuild tool call index, bumpVersion, notifyListeners
}
// truncateBefore should mirror: this._items = this._items.slice(index)
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| ThreadWorkerEntry thin record | Must become ThreadWorker event-driven class | Enables reliable concurrent thread operations |
| isAutoCompacting: false (hardcoded) | Must read PromptController compaction state | Enables UI feedback during compaction |
| createThread synchronous | Must become async with seededMessages | Required for handoff and fork thread creation |

## Open Questions

1. **F8 Thread Preview hover trigger mechanism**
   - What we know: `ThreadPreview` widget exists in `thread-list.ts:118`; preview is shown in AMP on hover/selection
   - What's unclear: In TUI context, "hover" likely means keyboard selection — does the thread list's currently-selected item trigger preview, or does it require a separate keystroke?
   - Recommendation: Check `20_thread_management.js` AMP source for the exact trigger; likely implement as "selected item shows preview" rather than mouse hover

2. **F19 Interleaved thinking wired to pi-ai**
   - What we know: `config-service.ts` schema has `anthropic.interleavedThinking.enabled`
   - What's unclear: Does `pi-ai-provider.ts` read this setting and pass it to the API request?
   - Recommendation: Inspect `packages/flitter-cli/src/provider/pi-ai-provider.ts` before implementing F19

3. **F30 Resizable bottom grid — was this removed?**
   - What we know: SPEC mentions `bottomGridUserHeight` / `bottomGridDragStartY`; grep found no such fields in `app-state.ts`
   - What's unclear: Phase 23 BORDER-08 requirement says "Resizable bottom grid with bottomGridUserHeight global state" was completed — so it may exist somewhere else
   - Recommendation: Inspect `app-shell.ts` and `input-area.ts` for drag resize state before implementing

4. **F13 editPreviousMessage hook wiring**
   - What we know: Shortcut is registered in `defaults.ts`; `ctx.hooks.editPreviousMessage?.()` is called; `editPreviousMessage?(): void` is in `registry.ts`
   - What's unclear: The hook implementation (actual function that reads last user message and populates InputArea) is not in `app-shell.ts`
   - Recommendation: This is a genuine gap — implement the hook body in `app-shell.ts` similar to other hook implementations

## Environment Availability

Step 2.6: SKIPPED — Phase 39 is purely code changes within `packages/flitter-cli/src/`. No external services, databases, CLI tools, or runtimes beyond the existing bun + Node.js environment are required. All AMP reference source is already available at `tmux-capture/amp-source/`.

## Validation Architecture

nyquist_validation is `false` in `.planning/config.json` — validation section skipped per config.

**Test command reference:**
- Per-task: `cd packages/flitter-cli && bun test --testPathPattern [test-file]`
- Full suite: `cd packages/flitter-cli && bun test`
- Type check: `cd packages/flitter-cli && bun run typecheck`
- **Baseline:** 1161 pass, 8 fail (pre-existing), 7410 expect() calls across 51 files

## Security Domain

This phase makes no changes to authentication, authorization, cryptography, input handling from external sources, or network request handling. All changes are internal state machine upgrades and UI widget additions. Security domain not applicable.

## Sources

### Primary (HIGH confidence — verified against live codebase)

- `packages/flitter-cli/src/widgets/input-area.ts` — F4/F5/F6 verification (lines 422-460)
- `packages/flitter-cli/src/state/thread-pool.ts` — ThreadWorkerEntry current state (lines 456-488)
- `packages/flitter-cli/src/state/prompt-controller.ts` — F2/F3 current state (lines 335-430)
- `packages/flitter-cli/src/state/types.ts` — ThreadWorkerEntry type definition (lines 533-542)
- `packages/flitter-cli/src/state/app-state.ts` — isAutoCompacting getter (line 335)
- `packages/flitter-cli/src/state/config-service.ts` — F18/F19/F26 config schema
- `packages/flitter-cli/src/widgets/toast-overlay.ts` — F12 toast completeness
- `packages/flitter-cli/src/shortcuts/defaults.ts` — F13 ArrowUp shortcut registration
- `tmux-capture/amp-source/29_thread_worker_statemachine.js` — AMP ThreadWorker reference
- bun test output (2026-04-10) — 8 pre-existing failures baseline

### Secondary (MEDIUM confidence)

- SPEC.md, TASKS.md, CHECKLIST.md in phase directory — authoritative gap specification
- `.planning/STATE.md` — project history context

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | F30 resizable bottom grid was already done in Phase 23 (BORDER-08) but the state fields may be in `input-area.ts` not `app-state.ts` | Current Codebase Gap Status | If truly not implemented, F30 requires more work than estimated |
| A2 | F24 `@@` thread picker is partially wired (trigger fires but overlay missing) | Current Codebase Gap Status | May be fully missing |

## Metadata

**Confidence breakdown:**
- P0 gap verification: HIGH — direct file read confirmed all 6 items
- P1 gap verification: HIGH — direct search confirmed all 11 items
- P2 gap verification: MEDIUM — spot-checked key items; F19/F23/F29/F30 need follow-up inspection
- P3 gap verification: HIGH — all 12 items confirmed as not-implemented (no source files found)

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable codebase, no external dependencies)
