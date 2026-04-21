# Architecture Decision Records

> Maintained by autonomous loop agent. Records decisions made during gap analysis and implementation.

## ADR-001: Prioritize `apply_patch` (GAP-TOOL-01) as first implementation target

**Date:** 2026-04-21
**Status:** Accepted
**Context:** GAPS.md lists GAP-TOOL-01 (apply_patch) as the only Critical gap. It is amp's primary multi-file editing tool using the Codex patch format. Without it, agents must do sequential Edit/Write calls for multi-file changes, which is significantly slower and error-prone.

**Decision:** Implement `apply_patch` first as a standalone builtin tool in `packages/agent-core/src/tools/builtin/apply-patch.ts`. The implementation will:
1. Parse the Codex patch format (`*** Begin Patch / *** End Patch`)
2. Support all 4 operations: Add File, Delete File, Update File, Move File
3. Use fuzzy hunk matching with `@@` context disambiguation
4. Integrate with FileChangeTracker for undo support
5. Return structured results with per-file diffs

**Consequences:**
- Agents can perform multi-file edits in a single tool call
- FileChangeTracker integration enables `undo_edit` for patches
- The patch parser can be reused for diff display in the TUI

---

## ADR-002: Close GAP-TOOL-09 (forceRefetch) — already implemented

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Investigation reveals `read-web-page.ts` already has `forceRefetch` in its inputSchema at line 104. GAPS.md incorrectly lists this as open.

**Decision:** Mark GAP-TOOL-09 as closed in the next GAPS.md update.

---

## ADR-003: Slash command stubs (GAP-CLI-22/23/24/25) are low priority

**Date:** 2026-04-21
**Status:** Accepted
**Context:** 13 slash commands are informational stubs that print "use CLI" messages instead of performing actions inline. While this degrades the interactive experience, the underlying functionality exists via CLI commands. The `/cost` and `/compact` stubs are the most impactful to wire up since they affect the inference loop.

**Decision:** Wire `/cost` and `/compact` as part of a follow-up phase after `apply_patch`. The remaining stub commands are lower priority.

---

## ADR-004: Implementation approach — self-contained phases

**Date:** 2026-04-21
**Status:** Accepted
**Context:** The autonomous loop runs every 2 hours. Each iteration should produce shippable, tested code rather than incomplete work.

**Decision:** Each 2h iteration focuses on one complete feature:
- Iteration 1 (this one): Gap analysis + GAPS.md update + apply_patch spec, plan, AND implementation — **COMPLETED**
- Iteration 2: Wire /cost, /compact, close remaining quick-win gaps
- Iteration 3: Model registry update (GAP-LLM-04), compactFn fix (GAP-CORE-03)

**Consequences:** Each iteration produces a commit-ready artifact. No half-finished features across iterations.

---

## ADR-005: `compactFn` no-op is a silent data-loss bug (GAP-CORE-03)

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Data+Core exploration found that `factory.ts:207` wires `compactFn: async () => ""`. When compaction triggers at 80% of 200K context window, the ContextManager calls this stub and receives an empty string as the "summary", effectively deleting all conversation history. This is a high-severity functional defect.

**Decision:** Add GAP-CORE-03 to GAPS.md as a new Medium/High gap. Fix priority is after apply_patch but before other medium gaps. The fix requires wiring a real LLM call into `compactFn` that sends messages to the model with a summarization prompt.

---

## ADR-006: Close GAP-CORE-02 — compaction pinning is fully implemented

**Date:** 2026-04-21
**Status:** Accepted
**Context:** `context-manager.ts` has complete pinning implementation: info-role messages, cache-control messages, last-user-message promotion, dedup, summary-block detection. The plan `2026-04-19-compaction-pinning.md` is fully shipped.

**Decision:** Move GAP-CORE-02 to Closed section in GAPS.md.

---

## ADR-007: Wire /cost and /compact slash commands (GAP-CLI-23, GAP-CLI-24)

**Date:** 2026-04-21
**Status:** Accepted
**Context:** `/cost` was a placeholder printing "use status bar" and `/compact` printed a message but never triggered compaction. Both capabilities already existed in the codebase (`SessionCostTracker` in agent-core, `ContextManager.checkAndCompact` in data) but were not plumbed through to the slash command context.

**Decision:** Extend `SlashCommandContext` with two optional fields:
- `costTracker`: exposes `getTotals()` and `getTurnHistory()` from `SessionCostTracker`
- `compactThread`: closure that calls `contextManager.checkAndCompact(snapshot)` and updates the thread store

The `SessionCostTracker` is instantiated in `interactive.ts` immediately after the worker is created, subscribing to `worker.events$` for `inference:complete` events. The `compactThread` closure captures `container.contextManager` and `container.threadStore` in its scope.

**Consequences:**
- `/cost` shows formatted token counts + USD estimate from the session's accumulated usage
- `/compact` triggers real compaction, showing before/after token counts
- Both gracefully degrade to informational messages when the context doesn't provide them (e.g., non-TUI modes)

---

## ADR-008: Close GAP-CLI-26, GAP-TOOL-07, GAP-TOOL-08 as quick wins

**Date:** 2026-04-21
**Status:** Accepted
**Context:** After the /cost and /compact wiring, three additional gaps were identified as quick wins (< 10 lines of implementation each, no architectural risk):

1. **GAP-CLI-26**: `maxInputTokens` hardcoded to 200K in `thread-state-widget.ts`. The model registry already has the correct context window per model. One-line fix: look up `MODEL_REGISTRY[modelName]?.contextWindow ?? 200000`.

2. **GAP-TOOL-07**: Bash tool lacks `cwd` parameter. Amp supports per-command working directory override. The `executeShell` function already accepts `cwd` — just needed to expose it in the schema and pass the user-provided value.

3. **GAP-TOOL-08**: Grep tool lacks `literal` parameter. Amp maps this to rg's `--fixed-strings`. For the NodeJS fallback, escape all regex metacharacters before constructing the RegExp.

**Decision:** Implement all three in a single pass. All changes are additive (new optional parameters with sensible defaults), no breaking changes to existing behavior.

**Consequences:**
- Status bar now dynamically shows correct context window per model
- Agents can run Bash commands in arbitrary directories without `cd`
- Agents can grep for literal patterns (like `interface{}`) without regex escaping

---

## ADR-009: Terminal protocol activation + remaining iteration 4 closures

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 4 focused on closing medium-priority gaps across TUI, LLM, and CLI domains. Five gaps were targeted:

1. **GAP-TUI-03** (Synchronized Output): Amp wraps render output with DEC Private Mode 2026 (`\x1b[?2026h` / `\x1b[?2026l`) to prevent visual tearing. Flitter had the constants defined but never emitted them.

2. **GAP-TUI-04** (Kitty Keyboard Protocol): Amp enables mode 1 (disambiguate escape codes) at init and pops at deinit. Flitter had constants but no activation logic.

3. **GAP-TUI-06** (OSC 8 Hyperlinks): Amp's `G.hyperlink` wraps text with OSC 8 sequences for clickable links. Flitter had no hyperlink infrastructure.

4. **GAP-CLI-22** (`/model` slash command): Was a stub printing "use CLI". The model registry and config service already existed.

5. **GAP-LLM-06** (`prompt_cache_key`): OpenAI-compat provider didn't send `prompt_cache_key`, unlike the OpenAI provider.

**Decision:**

- **TUI-03/04**: Use heuristic detection based on `TERM_PROGRAM` environment variable (kitty, WezTerm, Ghostty, Contour, iTerm2 3.5+) rather than query-response probing. This is simpler than amp's full QueryParser but covers the common terminals. `defaultCapabilities()` now calls `detectSyncOutputSupport()` and `detectKittyKeyboardSupport()`.

- **TUI-06**: Add `url?: string` field to `Cell` class and OSC 8 emission to `AnsiRenderer.renderDiff()`. This is infrastructure-only — the widget paint pipeline doesn't yet pass URLs through, so no hyperlinks are visible yet. Completing the pipeline requires changes to `RichTextWidget` and `MarkdownRenderer`, deferred to a future iteration.

- **CLI-22**: Implement full model resolution: exact match → partial/fuzzy match → ambiguity error. Uses `MODEL_REGISTRY` keys for validation, `configService.updateSettings` for persistence.

- **LLM-06**: Add `threadId` to `_buildRequestBody` params and set `body.prompt_cache_key` using the same cascading logic as other providers: explicit setting → provider-class default → threadId fallback.

**Consequences:**
- Terminals that support sync output will see reduced visual tearing during re-renders
- Kitty keyboard mode enables better key disambiguation (function keys, modifiers)
- OSC 8 infrastructure is ready for hyperlinks once the widget pipeline is plumbed
- `/model` can switch models interactively with fuzzy matching
- OpenAI-compat providers benefit from server-side prompt caching

---

## ADR-010: Iteration 5 — preprocessArgs, cursor shape, slash command wiring

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 5 targeted three gaps across different domains:

1. **GAP-TOOL-10** (Parameter aliases): LLMs sometimes use amp's parameter names (`cmd`, `path`, `old_str`, `filePattern`) because they were trained on amp-like tool specs. Without aliases, the tool fails with a missing-argument error even though the intent is clear.

2. **GAP-TUI-14** (Cursor shape): Amp sets cursor shape (block/underline/bar) via DECSCUSR sequences. Flitter only showed/hid the cursor — no shape control.

3. **GAP-CLI-25 partial** (Slash stubs): 9 slash commands were informational stubs. Three of them (`/rename`, `/label`, `/archive`) could be wired without any context interface changes since `threadStore.getThreadSnapshot` and `setCachedThread` already existed.

**Decision:**

- **GAP-TOOL-10**: Added `preprocessArgs?: (args) => args` optional field to `ToolSpec` interface (mirrors amp's exact pattern at chunk-005.js:146320). The orchestrator calls it before `execute()` — one 3-line change. Each tool defines its own alias logic:
  - Bash: `cmd` → `command`
  - Read: `path` → `file_path`, `read_range` [start, end] → `offset` + `limit`
  - Edit: `path` → `file_path`, `old_str` → `old_string`, `new_str` → `new_string`
  - Write: `path` → `file_path`
  - Glob: `filePattern` → `pattern`
  
  The `read_range` alias is a semantic transformation, not just a rename: amp uses `[start_line, end_line]` while flitter uses separate `offset` (start) and `limit` (count).

- **GAP-TUI-14**: Added `SET_CURSOR_SHAPE(n)` constant (`CSI N SP q`), `cursorShape` field on Screen, shape emission in `renderCursor()`, reset to 0 on deinit/suspend. Detection uses negative heuristic: assume support unless Emacs (`INSIDE_EMACS`) or JetBrains (`TERMINAL_EMULATOR=JetBrains*`), matching amp's `detectCursorShapeSupport()`.

- **GAP-CLI-25 partial**: Wired `/rename`, `/label`, `/archive` — all three already had validation logic; only the final mutation step was missing. Each now calls `setCachedThread()` with the modified snapshot. The remaining 6 stubs (`/new`, `/switch`, `/dashboard`, `/delete`, `/editor`, `/history`) require either a `switchThread` callback in the context or TUI lifecycle changes.

**Consequences:**
- Tools now accept both amp-style and flitter-style parameter names, improving robustness with diverse LLMs
- Cursor shape changes are visible in supporting terminals (most except Emacs/JetBrains)
- Users can rename threads, add labels, and archive threads inline without leaving the conversation

---

## ADR-011: Iteration 6 — restore_snapshot tool, ThreadRelationship schema, seedThreadMessages

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 6 explored 4 candidates via parallel subagents:

| Gap | Effort | Selected? |
|-----|--------|-----------|
| GAP-TOOL-02 (get_diagnostics) | Medium | No — requires LSP/subprocess infra |
| GAP-TOOL-05 (restore_snapshot) | Small | **Yes** |
| GAP-TOOL-03 (oracle) | Large | No — requires OpenAI Responses API or alternate scaffold |
| GAP-CORE-04 (handoff/seed) | Mixed | **Partial** — schema + seedThreadMessages + applyParentRelationship |

**Decision:**

- **GAP-TOOL-05 (restore_snapshot)**: Created `RestoreSnapshotTool` in `packages/agent-core/src/tools/builtin/restore-snapshot.ts`. The tool wraps the existing `restoreSnapshot()` from `auto-snapshot.ts`, which already implements amp's exact git operations (temp index → read-tree → add -A → checkout --no-overlay). Added a `restorePath` parameter to `restoreSnapshot()` (previously hardcoded to `"."`), matching amp's Y2R which accepts an arbitrary path. Registered as a static builtin in `registerBuiltinTools()`.

  The tool spec mirrors amp's J2R (modules/2026_tail_anonymous.js:140789): `{ path, treeOID }` with the same description format. The execution flow matches amp's Y2R (14244-14298): parse args → get workingDirectory → restoreSnapshot({ treeOID, repoRoot }, path) → return success/error.

  Note: The agent won't receive snapshot OIDs until `userState.snapshotOIDs` is surfaced in the system prompt context (separate gap). The tool itself is fully functional for manual or programmatic use.

- **GAP-CORE-04 partial (schema + service methods)**:
  1. **ThreadRelationshipSchema**: Added `role: z.enum(["child", "parent"]).optional()` and `createdAt: z.number().optional()`. Fields are optional for backward compatibility with existing persisted threads. Amp deduplicates relationships on `(threadID, type, role)` — the `role` field enables this.
  
  2. **ThreadWorkerService.seedThreadMessages()**: Atomic message seeding using `exclusiveSyncReadWriter`. Recomputes `nextMessageId` as `max(messageId) + 1`, optionally stamps `agentMode` on user messages. Mirrors amp QWT.seedThreadMessages exactly.
  
  3. **ThreadWorkerService.applyParentRelationship()**: Bidirectional relationship wiring — adds `role: "child"` to child thread and `role: "parent"` to parent thread. Deduplicates on `(threadID, type, role)`. Currently uses direct store writes; worker delta dispatch can be added when thread-worker handle() gains a "relationship" delta handler.
  
  4. **ThreadStoreForService interface**: Avoids importing full ThreadStore class to prevent circular dependencies. `setThreadStore()` method wired in container after both services are created.

  The `handoff()` method itself is deferred — it requires the `b4R` summarizer (an LLM call that extracts relevant files and context), which is a medium-to-large task.

**Consequences:**
- Agents can restore file snapshots via tool call, enabling undo-to-checkpoint workflows
- Thread relationships now carry role information, enabling proper parent-child traversal
- `seedThreadMessages` enables thread forking (create thread with pre-seeded conversation)
- `applyParentRelationship` enables handoff thread creation (prerequisite for GAP-CORE-04 `handoff()`)
- `createThread` orchestration method can be built in a future iteration atop these primitives
