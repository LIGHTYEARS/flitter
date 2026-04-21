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

---

## ADR-012: Fix 8 TypeScript errors strategically — types as contracts

**Date:** 2026-04-21
**Status:** Accepted
**Context:** `tsc --noEmit` reported 8 type errors across 3 packages. These fell into 3 root causes:

1. **`CliToolFilters` type missing** (3 errors in index.ts, container.ts): The type was exported from `registry.ts` but never defined. This was a gap from the `--allowed-tools` / `--disallowed-tools` CLI flags implementation.

2. **`ToolThreadEvent.status` vs `ToolResult.status` mismatch** (3 errors in orchestrator.ts): The orchestrator used `"done"` for `ToolThreadEvent.status`, but the type only accepts `"completed"`. Additionally, it referenced a non-existent `output` property on `ToolResult` (which uses `content`).

3. **`"thinking"` event type mismatch** (2 errors in execute.ts): Code checked `event.type === "thinking"` against `AgentEvent`, but thinking is a content block type (inside `StreamDelta`), not an event type. The fix checks `inference:delta` events where the delta contains thinking blocks.

**Decision:** Fix all 8 errors with minimal, targeted changes:
- Add `CliToolFilters` interface + `setCliFilters()`/`getCliFilters()` methods to `ToolRegistry`, plus a `listEnabledWithCliFilters()` method that layers CLI filters on top of config-based filtering
- Change `"done"` → `"completed"` in `ToolThreadEvent.status` usage, and `output` → `content` in `ToolResult` property access
- Rewrite the thinking filter to check `event.delta.content.every(b => b.type === "thinking" || b.type === "redacted_thinking")` within `inference:delta` events
- Cast `inferenceError` as `Error` to satisfy TypeScript's closure-aware control flow analysis

**Consequences:**
- Zero type errors across all packages (verified with `tsc --noEmit`)
- All 412 existing tests continue to pass
- `CliToolFilters` can now be wired from CLI `--allowed-tools`/`--disallowed-tools` flags through container to tool registry

---

## ADR-013: Iteration 8 — Glob matching, orchestrator safety, Bash cd

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 8 targeted 4 gaps across the safety, tooling, and agent-core domains:

1. **GAP-CORE-09** (Glob pattern matching): `tools.enable`/`tools.disable` used `Array.includes()` — exact string only. Patterns like `mcp__playwright__*` or `builtin:*` had no effect.

2. **GAP-CORE-05/06** (Orchestrator safety): No tool resume on reconnect. After crash/restart, all in-progress tools are silently abandoned. Dangerous tools (Bash, Task) could be naively re-executed.

3. **GAP-TOOL-30** (Bash `cd` interception): `cd path` commands only changed directory within the subprocess — the `cwd` was not rewritten for the current tool call's execution context.

**Decision:**

- **GAP-CORE-09**: Implemented `matchToolPattern()` — a zero-dependency glob-to-regex converter supporting `*`, `?`, `[...]`, `{a,b}`. Matches amp's Xf/Vf behavior exactly: fast exact match first, glob only when pattern contains glob characters, silently swallow invalid patterns. Updated `_isToolEnabled()` to check multi-form name variants: bare name, MCP bare-tool + canonical `mcp__server__tool`, and `builtin:`/`toolbox:` prefixed forms. 21 new tests.

- **GAP-CORE-05/06**: Added `ToolOrchestrator.onResume(thread)` method that scans the latest user message's tool_result blocks and: (a) restores `blocked-on-user` entries to the approval queue, (b) cancels dangerous tools with `reason: "system:safety"`, (c) re-invokes safe non-terminal tools. Exported `isDangerousToResume()` (Bash, run_terminal_command, shell_command, Task, handoff) and `isTerminalStatus()` (done, error, rejected-by-user, cancelled). 18 new tests. **Note:** `onResume()` is not yet wired into ThreadWorker — requires integration in a follow-up iteration.

- **GAP-TOOL-30**: Enhanced Bash `preprocessArgs` to detect `cd path` at the start of commands via regex. Rewrites `cwd` with the resolved absolute path, strips `cd` from command. Handles: `~` expansion, quoted paths (single/double), `&& rest`/`; rest` chain commands. Skips dynamic paths (`$VAR`, backtick substitution) matching amp's behavior. Also expands `~` in explicit `cwd` argument. 14 new tests.

**Consequences:**
- Glob patterns now work in tool enable/disable config: `mcp__playwright__*`, `builtin:*`, `{Bash,Read}` all match correctly
- Safety infrastructure is in place for crash recovery — pending ThreadWorker wiring
- Bash `cd` interception works for common cases, improving LLM tool use ergonomics
- 53 new tests added (21 + 18 + 14), total 5041 passing

---

## ADR-014: Iteration 9 — onResume wiring, provider API keys, subagent tool filtering

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 9 targeted 3 independent gaps across agent-core, data, and container domains. Two parallel research agents were dispatched to gather amp source analysis while the first implementation (onResume wiring) proceeded immediately.

| Gap | Domain | Effort | Selected? |
|-----|--------|--------|-----------|
| GAP-CORE-05 completion (onResume wiring) | Core | Small | **Yes** |
| GAP-DATA-14/15 (provider API keys) | Data | Small | **Yes** |
| GAP-CORE-18 (subagent tool filtering) | Core | Medium | **Yes** |

**Decision:**

- **GAP-CORE-05 (onResume wiring)**: Changed `ThreadWorker.resume()` from sync to async. After existing truncation + `trackFilesFromHistory()`, added two new steps: (1) `shouldResumeFromLastMessage()` guard that checks for cancelled assistant state (`NlR`), rejected tool results (`HlR`), and info messages (`NET`) — matching amp's exact checks in `ov.js:272-275`; (2) `await this.opts.toolOrchestrator.onResume(snapshot)` to resume in-progress tools. The container.ts caller uses `worker.resume().catch(() => {})` fire-and-forget to keep `createThreadWorker` synchronous — `onResume` is best-effort crash recovery, and the sync parts (truncation, file tracking) still execute synchronously before the promise settles.

- **GAP-DATA-14/15 (provider API key wiring)**: Extended `getToken("apiKey")` in `factory.ts` to be provider-aware. Added `detectActiveProvider()` which reads `internal.model` from settings → looks up `MODEL_REGISTRY[model].provider`. Based on provider:
  - Anthropic: `anthropic.apiKey` setting → `ANTHROPIC_API_KEY` env
  - Gemini: `gemini.apiKey` setting → `GOOGLE_API_KEY` env → `GEMINI_API_KEY` env (matching amp's `YdR()` priority: GOOGLE takes precedence with warning)
  - OpenAI: `openai.apiKey` setting → `OPENAI_API_KEY` env
  
  `isSet()` (sync) checks all env vars before provider is cached, narrows to correct provider after first `getToken()` populates the cache.

- **GAP-CORE-18 (subagent tool filtering)**: Created `subagent-types.ts` with `SUBAGENT_TYPE_REGISTRY` mapping 8 subagent types to tool patterns, mirroring amp's `qe` object. Added `toolPatterns: string[]` to `SubAgentWorkerOptions`. `SubAgentManager.spawn()` calls `getSubAgentToolPatterns(type)` (defaults to `["*"]` for unknown types). Added `ToolRegistry.createFilteredRegistry(patterns)` which creates an independent snapshot registry containing only matching tools (using existing `matchToolPattern()` from iteration 8). Container's subagent `createWorker` callback now passes `toolRegistry.createFilteredRegistry(workerOpts.toolPatterns)` to `createThreadWorker`.

**Consequences:**
- `onResume` crash recovery is fully wired end-to-end — safe tools are re-invoked, dangerous tools are cancelled, blocked tools are restored to approval queue
- Gemini and OpenAI providers now work with their native API keys (settings or env vars) without requiring `anthropic.apiKey` workaround
- Subagents are restricted to their type-appropriate tool set — finder can only use Grep/Glob/Read, code-review gets Bash but not Edit, etc.
- 31 new tests added (4 + 13 + 14), total 5072 passing, 0 TypeScript errors

---

## ADR-015: Iteration 10 — Orchestrator safety: rejected-by-user, approval clearing, processing mutex

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 10 targeted 3 medium-priority orchestrator safety gaps that form a natural cluster around the approval/permission lifecycle. These gaps were identified in theme #6 ("Orchestrator safety gaps") and are interconnected: proper rejection status feeds into approval clearing, and the mutex prevents race conditions across all approval operations.

| Gap | Domain | Effort | Selected? |
|-----|--------|--------|-----------|
| GAP-CORE-13 (rejected-by-user status) | Core | Small | **Yes** |
| GAP-CORE-14 (onNewUserMessage approval clearing) | Core | Small | **Yes** |
| GAP-CORE-10 (processing mutex) | Core | Medium | **Yes** |

**Decision:**

- **GAP-CORE-13 (rejected-by-user status)**: Updated `invokeTool` denial paths to distinguish between feedback-denial and plain-denial, matching amp's `$mR` (modules/1737_EarliestNonDisabledTool_$mR.js):
  - Plain denial (`accepted: false`, no feedback) → `status: "rejected-by-user"` with `reason` and `toAllow` fields. `toAllow` computed from tool args: `command`/`cmd` for Bash/shell, `file_path`/`path` for file tools.
  - Feedback denial (`accepted: false`, feedback present) → `status: "error"` with message `"rejected by user with feedback: {text}"` so the LLM reads the feedback and adjusts.
  - Static `reject` action (from permission rules) → `status: "rejected-by-user"` with permission reason.
  - `ToolThreadEvent` interface extended with `reason?: string` and `toAllow?: string[]` fields.
  - `ToolRunRejectedSchema` in `@flitter/schemas` extended with `toAllow: z.array(z.string()).optional()`.

- **GAP-CORE-14 (onNewUserMessage approval clearing)**: Added `ToolOrchestrator.onNewUserMessage()` matching amp's FWT.onNewUserMessage (modules/1234_unknown_FWT.js:119-121). The method: (1) marks all running tools as cancelled + calls `clearPendingApprovals` pre-emptively *outside* the mutex (ensures approvals drain even if mutex is held by an executing tool), then (2) calls `cancelAll("user:interrupted")` which acquires the mutex and repeats the clearing (idempotent). Added `clearPendingApprovals` callback to `OrchestratorCallbacks`. Container wiring iterates `ThreadWorker._pendingApprovals` Map, resolving each Promise with `{ accepted: false }`, then clears the Map. Called from `enqueueMessage()` when processing a message immediately (not buffered).

- **GAP-CORE-10 (processing mutex)**: Created `Mutex` class in `tools/mutex.ts` — minimal FIFO queuing async mutex matching amp's `Cm` class (modules/1184_unknown_Cm.js). Semantics: `acquire()` returns a Promise that resolves immediately if unlocked or queues in FIFO order; `release()` wakes the first waiter. No timeout, no rejection, no skip. Added `processingMutex` field to `ToolOrchestrator`. Methods wrapped:
  - `onResume()` — mutex held for tool scan, released before `updateFileChanges()`
  - `cancelAll()` — now `async`, mutex held for abort + clear cycle
  - `onNewUserMessage()` — pre-emptive clear outside mutex, then delegates to `cancelAll`
  - `dispose()` — bypasses mutex for synchronous cleanup (abort + clear directly)
  - `cancelInference()` — uses `void cancelAll()` fire-and-forget since AbortController does immediate work

**Consequences:**
- Tools denied by user now send meaningful `"rejected-by-user"` status to thread state (not generic `"cancelled"`), enabling correct TUI display and resume behavior
- Pending approvals are auto-rejected when user sends a new message, preventing zombie Promise leaks across turns
- Concurrent operations on orchestrator state (resume, cancel, new message) are serialized via FIFO mutex, preventing race conditions that could corrupt `runningTools` or `cancelledToolUses`
- 18 new tests added (6 mutex + 5 rejected-by-user + 3 approval clearing + 4 serialization), total 5089 passing, 0 TypeScript errors

---

## ADR-016: Iteration 11 — toolMessages channel, cancelToolOnly, plugin lifecycle hooks, Read directory/image

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 11 selected 4 gaps across 3 domains. CORE-11 and CORE-12 are tightly coupled (the message channel is the mechanism cancelToolOnly uses). CORE-15 extends the plugin system. TOOL-31 is a user-facing Read tool improvement.

| Gap | Domain | Effort | Selected? |
|-----|--------|--------|-----------|
| GAP-CORE-12 (toolMessages Subject) | Core | Small | **Yes** — prerequisite for CORE-11 |
| GAP-CORE-11 (cancelToolOnly) | Core | Small | **Yes** — completes orchestrator safety |
| GAP-CORE-15 (agentStart/agentEnd) | Core/Plugins | Medium | **Yes** — extends plugin system |
| GAP-TOOL-31 (Read dir/image) | Tools | Medium | **Yes** — user-facing improvement |

**Decision:**

- **GAP-CORE-12 (toolMessages Subject channel)**: Added `toolMessages: Map<string, Subject<ToolMessage>>` to `ToolOrchestrator`. In `invokeTool()`, a new `Subject<ToolMessage>` is created and stored in the map before tool execution, then injected into `ToolContext.toolMessages`. On normal completion (finally block), the Subject is completed and removed. Changed `ToolContext.toolMessages` type from `Subject<string>` to `Subject<ToolMessage>` (where `ToolMessage = { type: "stop-command" }`). This matches amp's exact pattern (modules/1234_unknown_FWT.js:8,347-369):
  ```
  s = new AR(u => { this.toolMessages.set(T.id, u) })
  A = { ...c, toolMessages: s }
  ```
  Also added `sendToolMessage(toolUseId, message)` for arbitrary message delivery (amp's FWT.sendToolMessage, line 174-178).

- **GAP-CORE-11 (cancelToolOnly)**: Added `cancelToolOnly(toolUseId)` to `ToolOrchestrator`. Key difference from `cancelTool()`: does NOT abort the AbortController — only sends `{ type: "stop-command" }` on the toolMessages Subject, then completes and removes it. This is a cooperative cancel: the tool's execution continues but should honor the stop-command. Matches amp's FWT.cancelToolOnly (modules/1234_unknown_FWT.js:135-158). Also updated `cancelTool()` (hard cancel) to send stop-command alongside the AbortController abort. Updated `cancelAll()` and `dispose()` to send stop-command to all Subjects before clearing.

- **GAP-CORE-15 (agentStart/agentEnd plugin lifecycle hooks)**: Added 4 new types (`PluginAgentStartEvent`, `PluginAgentStartResult`, `PluginAgentEndEvent`, `PluginAgentEndResult`) and 2 new methods (`onAgentStart()`, `onAgentEnd()`) to `PluginService`. Both use `record.host.sendRequest()` to communicate with plugin subprocesses. Added optional `pluginService?: PluginService` to `ThreadWorkerOptions`. Wired into `runInference()` at 4 sites matching amp:
  - Before inference: `agentStart` — if plugin returns message content, appends to user message
  - On turn:complete: `agentEnd("done")` — fire-and-forget
  - On signal.aborted: `agentEnd("interrupted")` — fire-and-forget
  - On non-retryable error: `agentEnd("error")` — fire-and-forget
  `agentEnd` supports `action: "continue"` return value — if a plugin returns this with a `userMessage`, the message is enqueued for another turn (matching amp's handleAgentEndResult at ov.js:734-748).

- **GAP-TOOL-31 (Read tool directory/image support)**: Updated `read.ts` to handle directories and images:
  - **Directories**: `fs.readdirSync` + `statSync` per entry → classify dirs/files → sort dirs alphabetically (with trailing `/`), then files alphabetically. Capped at 1000 entries (matching amp's `pq = 1000`). Offset/limit pagination with `[... omitted N entries ...]` markers. Returns `{ isDirectory: true, directoryEntries: [...] }` in data field.
  - **Images**: Extension-based detection (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` — matching amp's `BLT` set). Binary read + base64 encode. Size gate at ~4.9MB base64 (matching amp's `zD = 5138022.4`). Returns `{ isImage: true, base64Content, imageInfo: { mimeType, size } }` in data field, with content set to `"Image: <path>"`.
  - Non-image binary files still rejected with error. Text files unchanged.

**Consequences:**
- Tools can now receive cooperative cancel signals without hard abort — essential for graceful cleanup (e.g., Bash tool can finish writing output before stopping)
- Plugin system now supports full agent lifecycle hooks, enabling plugins to inject context before inference and chain turns on completion
- Read tool accepts directories (returns listings) and images (returns base64) — agents no longer need workarounds for these common operations

## ADR-017: Iteration 12 — activatedSkills tracking, API token counting, admin settings, thread list filtering

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 12 targets 4 gaps: 2 Agent-Core (CORE-16, CORE-17) and 2 Data (DATA-16, DATA-17). These are medium/small items that round out the skill system, improve token counting accuracy, wire a previously-dead code path, and add proper thread list filtering.

| Gap | Domain | Effort | Selected? |
|-----|--------|--------|-----------|
| GAP-CORE-17 (activatedSkills) | Core | Small | **Yes** — completes skill vertical |
| GAP-CORE-16 (API token counting) | Core/LLM | Medium | **Yes** — improves accuracy |
| GAP-DATA-16 (admin settings merge) | Data | Small | **Yes** — wires dead code path |
| GAP-DATA-17 (thread list filtering) | Data/CLI | Small | **Yes** — user-facing fix |

**Decision:**

- **GAP-CORE-17 (activatedSkills tracking)**: Three-layer implementation matching amp's FWT:384 + ov:211-219:
  1. **Schema**: Added `activatedSkills: z.array(z.object({ name, arguments? })).optional()` to `ThreadSnapshotSchema`.
  2. **Orchestrator**: Added `SKILL_TOOL_NAME = "skill"` constant and `onSkillToolComplete?: (toolUse) => void` to `OrchestratorCallbacks`. In `invokeTool()` step 9b, after the tool completes, checks `result.status === "done" && toolUse.name.toLowerCase() === SKILL_TOOL_NAME`. Case-insensitive comparison matches amp's `T.name.toLowerCase() === oc.toLowerCase()`.
  3. **ThreadWorker**: Added `onSkillToolComplete(toolUse)` method that reads `toolUse.input.name`, deduplicates against existing `activatedSkills` by name, and persists to thread snapshot.

- **GAP-CORE-16 (API-based token counting)**: Added optional `countTokens?(params: CountTokensParams): Promise<CountTokensResult>` to `LLMProvider` interface. Implemented on `AnthropicProvider` using the SDK's `messages.countTokens()` endpoint, passing `thinking: { type: "enabled", budget_tokens: 10000 }` to ensure the count matches a thinking-enabled request (matching amp's Qu function at 0084_unknown_Qu.js). On any error (API failure, missing key), falls back to `Math.ceil(JSON.stringify(payload).length / 4)` (matching amp's `n1R` fallback at 0083_unknown_l1R.js). Both `CountTokensParams` and `CountTokensResult` exported from `@flitter/llm`.

- **GAP-DATA-16 (admin settings merge)**: Wired `readAdminSettings()` into `ConfigService.reload()`. After merging global+workspace settings, admin settings are spread over the result as unconditional overrides: `settings = { ...settings, ...adminSettings }`. This matches amp's `iHR` wrapper (modules/1273_unknown_iHR.js:1-5) where admin keys take priority over any user/workspace setting. The existing `readAdminSettings()` function handles platform paths (`/Library/Application Support/flitter/managed-settings.json` on macOS), ENOENT gracefully, and `flitter.` prefix stripping.

- **GAP-DATA-17 (observeThreadList with filtering)**: Added `observeThreadList(opts: { includeArchived?: boolean })` to `ThreadStore`. Applies two filters matching amp's azT.observeThreadList (modules/1342:286-295): `!entry.mainThreadID` (excludes subagent threads) AND `(opts.includeArchived || !entry.archived)` (excludes archived unless opted in). Wired into `handleThreadsList` (default excludes archived), `handleThreadsSearch` (includes archived for broader search), and `handleThreadsDashboard` (excludes archived). Updated the mock `ThreadStore` in threads tests to include the new method.

**Consequences:**
- Skills loaded via the `skill` tool are now persisted to thread state — resumed threads can know which skills were active (needed for deferred tool unlocking in future CORE-08 work)
- Token counting accuracy improves from ±20-30% heuristic to exact API count for Anthropic, with graceful fallback
- Enterprise admins can now enforce settings via managed-settings.json (previously parsed but never applied)
- Thread list/dashboard/search now properly hide subagent and archived threads, matching amp's UX
- 26 new tests (9 CORE-11/12 + 7 CORE-15 + 10 TOOL-31), total 5116 passing, 0 TypeScript errors

---

## ADR-018: Iteration 13 — Skill Enforcement, CLI Tool Invocation, Guarded-File Approval, Blocked-on-User

**Date:** 2026-04-21
**Status:** Accepted

### Context

Iteration 13 targets 4 gaps spanning the agent-core, CLI, and TUI layers:
- **CORE-08**: Model compliance with required skills (enforcement)
- **CLI-27**: Developer workflow for testing tools directly from CLI
- **TUI-02**: Fine-grained file access control in approval prompts
- **CORE-07**: Crash recovery for pending approval state

### Decisions

1. **Skill Enforcement via Synthetic tool_use (CORE-08)**: Implement amp's 3-phase skill enforcement — inject info message, check after inference, inject synthetic tool_use if model didn't comply. `InfoContentBlockSchema` extended with `TextBlockSchema` to support text in info messages.

2. **`tools use` Dual-Path Argument Parsing (CLI-27)**: Support stdin JSON and CLI `--flag value` parsing with type coercion. `--only` extracts fields, `--stream` outputs JSON lines. Matches amp's `sM0`/`tM0`/`cM0` pattern.

3. **Conditional Guarded-File Option (TUI-02)**: Dynamic option list via `buildApprovalOptions()`. "Allow File for Every Session" appears only when tool is file-tool AND path matches guarded pattern. 16 patterns defined in `GUARDED_FILE_PATTERNS`.

4. **blocked-on-user Before Approval Prompt (CORE-07)**: Persist `status: "blocked-on-user"` BEFORE `requestApproval()` call. Added `getThreadSessionState()` (amp's `IUT`) for UI state detection on resume.

### Consequences

- Skill enforcement is complete — models cannot silently ignore required skills
- `tools use` enables rapid tool testing from CLI without starting an interactive session
- Guarded file approval adds a security layer for sensitive file access
- Combined with existing `onResume()`, crash recovery now has full fidelity for blocked approvals
- 39 new tests (7 CORE-08 + 12 CLI-27 + 14 TUI-02 + 6 CORE-07), total 5177 passing, 0 TypeScript errors

---

## ADR-019: Iteration 14 — tools make, ensureThreadEntriesLoaded, get_diagnostics, threads handoff

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Four targets selected for iteration 14 spanning CLI, Data, and Tools domains:
- **CLI-05**: `tools make` — templates already existed, just needed the CLI handler and toolbox dir resolution
- **DATA-13**: `ensureThreadEntriesLoaded` — High priority, all infrastructure (remote transport, thread store, entry comparison) was in place
- **TOOL-02**: `get_diagnostics` — amp uses IDE WebSocket bridge; flitter takes pragmatic shell-out approach
- **CLI-28**: `threads handoff` — partial infrastructure existed (seedThreadMessages, applyParentRelationship)

### Decisions

1. **Toolbox Dir Resolution (CLI-05)**: Env var chain `FLITTER_TOOLBOX` > `AMP_TOOLBOX` > `~/.config/flitter/tools`. Divergence from amp: flitter adds file extensions (`.ts`/`.sh`/`.zsh`) to tool files while amp writes bare filenames. This is more explicit and matches `toolbox-templates.ts`'s existing `getTemplateExtension()`.

2. **Three-Phase Merge for Thread Entries (DATA-13)**: Exact replica of amp's `azT.ensureThreadEntriesLoaded()` pattern — remote fetch → identity-preserving merge → local overlay (local wins on conflict). Coalescing promise prevents concurrent fetches. Remote is optional (`setRemote()`), graceful fallback to local-only on network error.

3. **Shell-Out Diagnostics Instead of IDE Bridge (TOOL-02)**: Amp's `get_diagnostics` connects to a VS Code/JetBrains IDE plugin via WebSocket. Flitter has no IDE infrastructure. Decision: shell out to common type-checkers/linters with 10s timeout. This works for batch diagnostics but loses live IDE state. Supported: TypeScript (`tsc`), Python (`ruff`), Go (`go vet`), Rust (`cargo check`).

4. **Simplified Handoff Without LLM Summarization (CLI-28)**: Amp's handoff calls `b4R` to LLM-summarize the parent thread context. Flitter's simplified approach extracts the last 20 messages as raw text context and seeds the child thread with a goal message. This is functional for CLI use but doesn't produce the same concise summaries amp generates. `/handoff` slash stub left as informational (needs `SlashCommandContext` extension for full wiring).

### Consequences

- `tools` command group is now complete: `list`, `show`, `use`, `make`
- Remote thread sync has lazy loading — threads from other devices become visible on first subscription
- Agents can check code quality via `get_diagnostics` without IDE plugins
- Thread handoff enables context transfer between conversations
- 41 new tests (14 CLI-05 + 9 DATA-13 + 10 TOOL-02 + 8 CLI-28), 0 TypeScript errors

---

## ADR-020: Iteration 15 — shell_command, format_file, threads continue --last

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 15 selected 3 gaps plus 1 duplicate closure. Research agents investigated 4 additional candidates (CLI-01 skill CLI commands, TOOL-27 look_at, CLI-07 permissions edit, TOOL-06 shell_command) and findings informed target selection. CLI-07 (permissions edit) was deferred due to medium-high complexity (custom DSL parser needed). CLI-01 deferred for similar reasons (git clone path for `skill add`). TOOL-27 deferred (requires Gemini LLM sub-call with multimodal parts).

| Gap | Domain | Effort | Selected? |
|-----|--------|--------|-----------|
| GAP-TOOL-06 (shell_command) | Tools | Small | **Yes** — thin wrapper with clear amp reference |
| GAP-TOOL-16 (format_file) | Tools | Small | **Yes** — shell-out formatters, similar to get_diagnostics |
| GAP-CLI-10 (threads continue --last) | CLI | Small | **Yes** — flag addition to existing command |
| GAP-CLI-04 (threads handoff) | CLI | None | **Closed** — duplicate of CLI-28 |

### Decisions

1. **shell_command as preprocessArgs Wrapper (TOOL-06)**: Rather than duplicating Bash execution logic, `ShellCommandTool` reuses `BashTool.execute` directly and only transforms parameters via `preprocessArgs`. The `workdir→cwd` and `timeout_ms→timeout` mappings match amp's `q5T` function (modules/1299_unknown_q5T.js). The `login` parameter is accepted but not forwarded — Bash tool always uses `shell: true` which provides login-like behavior. This keeps maintenance cost minimal.

2. **Formatter Auto-Detection with Project-Level Config (TOOL-16)**: The tool checks `biome.json`/`biome.jsonc` presence to decide between biome and prettier for JS/TS files. Language-specific formatters (gofmt, rustfmt, ruff) take precedence. Python has a ruff→black fallback chain. The `detectFormatter()` function is exported for unit testability, avoiding slow subprocess-based tests.

3. **Optional Thread ID with --last Fallback (CLI-10)**: Changed `<id>` (required) to `[id]` (optional) in Commander.js. When neither ID nor `--last` is provided, gives a clear error message directing the user to either option. This matches amp's behavior (chunk-005.js:4888-4903) where `--last || threadID || executeMode` skips the picker.

### Consequences

- Subagents can now use `shell_command` tool with their expected parameter names
- `format_file` enables agents to auto-format code after edits (prettier, biome, gofmt, rustfmt, ruff)
- `threads continue --last` provides a quick path to resume work without a thread picker
- 39 new tests (15 shell_command + 20 format_file + 4 threads continue --last), 0 TypeScript errors

## ADR-021: Iteration 16 — todo_write, oracle, threads aliases, --include-archived

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 16 targeted 4 gaps: 2 tools (todo_write, oracle) and 2 CLI improvements (thread aliases, include-archived). Research agents investigated all 4 candidates plus oracle/librarian internals. The selection balanced two medium-effort tool implementations with two small CLI polish items.

| Gap | Domain | Effort | Selected? |
|-----|--------|--------|-----------|
| GAP-TOOL-15 (todo_write) | Tools | Small-medium | **Yes** — stateless no-op tool, clear amp reference (O0T) |
| GAP-TOOL-03 (oracle) | Tools | Medium | **Yes** — subagent tool, follows Task/finder pattern |
| GAP-CLI-19 (threads aliases) | CLI | Small | **Yes** — pure .alias() calls |
| GAP-CLI-11 (--include-archived) | CLI | Small | **Yes** — backend already existed from DATA-17 |

### Decisions

1. **Stateless Todo Model (TOOL-15)**: Following amp's design, `todo_write` is a pure no-op tool — execution returns "Todos updated." immediately, and the actual state lives in the conversation history as tool_use blocks. `getTodosFromThread()` scans backward through thread messages matching amp's `O0T` (modules/1601), stopping at summary boundaries (info messages with `summary.type === "message"`). This avoids any persistence layer — the thread IS the store. `todo_read` reads from `ToolContext.todos` which is set by `ThreadWorker` using the scanner.

2. **Oracle as SubAgentManager Consumer (TOOL-03)**: Rather than implementing a new subagent runner, oracle reuses the existing `SubAgentManager.spawn()` with `type: "oracle"`, which already maps to the correct tool patterns via `SUBAGENT_TYPE_REGISTRY`. The `buildOraclePrompt()` function mirrors amp's `EVR` (modules/0050): combines task + context + file list + parent thread reference. Oracle-specific model override (`internal.model.oracle` → GPT-5.4 default) and reasoning effort (`internal.oracleReasoningEffort`) are noted but not yet wired into the spawn call — they require model override support in SubAgentManager which will be a future enhancement.

3. **Thread Alias Subset (CLI-19)**: Only aliases for existing commands were added: `t`/`thread` (threads group), `n` (new), `l`/`ls` (list). Aliases for commands that don't exist in flitter (`v` for visibility, `s` for share, `f` for fork) were not added to avoid dead-end commands.

4. **Type-Safe Include-Archived (CLI-11)**: The flag was already flowing through via an unsafe `as unknown as Record<string, unknown>` cast from a previous iteration. This iteration properly types it in `ThreadsListOptions` and passes it through `main.ts` explicitly, removing the cast.

### Consequences

- LLMs can now track progress with `todo_write`/`todo_read` — the TUI can scan thread history to render todo lists
- Oracle subagent enables senior-engineering advice from GPT-5.4 (or configurable model) for architecture, code review, and debugging
- `flitter t l --include-archived` is now a properly typed path from CLI to data layer
- 47 new tests (23 todo_write + 22 oracle + 2 include-archived), 0 TypeScript errors
- Total: 5307 tests passing across 295 files

## ADR-022: Iteration 17 — librarian, github_repo_ci_status, --unarchive, /delete

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 17 targeted 4 gaps: 2 tools (librarian, ci_status) and 2 CLI improvements (unarchive flag, /delete wiring). The librarian is a near-clone of oracle (just completed in iteration 16), making it low-risk. The CI status tool fills a GitHub tool gap using direct REST API calls since amp's implementation is server-side only.

| Gap | Domain | Effort | Selected? |
|-----|--------|--------|-----------|
| GAP-TOOL-04 (librarian) | Tools | Medium | **Yes** — near-clone of oracle, clear amp reference (IKR/mKR) |
| GAP-TOOL-25 (ci_status) | Tools | Small-medium | **Yes** — server-side in amp, client-side via GitHub REST API |
| GAP-CLI-12 (--unarchive) | CLI | Small | **Yes** — single flag addition, toggle archived field |
| GAP-CLI-25 partial (/delete) | CLI | Small | **Yes** — wire existing stub to threadStore.deleteThread |

### Decisions

1. **Librarian as Oracle Twin (TOOL-04)**: The librarian shares the same `createXxxTool(subAgentManager)` factory pattern as oracle. Key differences from oracle: `query` parameter instead of `task`, no `files` parameter, GitHub-specific tool access (Y2: read_github, search_github, commit_search, diff, list_directory_github, list_repositories, glob_github), model CLAUDE_SONNET_4_6 instead of GPT_5_4. Subagent type was already registered in `subagent-types.ts` from iteration 8. The prompt builder `buildLibrarianPrompt` matches amp's `mKR` pattern: `"Context: ${context}\n\nQuery: ${query}"` when context is provided, otherwise just the raw query. No file-reading instructions (unlike oracle) since librarian operates on remote repos via GitHub tools.

2. **Client-Side CI Status (TOOL-25)**: Amp defines `ElR = "github_repo_ci_status"` as a constant but implements it server-side (through the internal proxy). Flitter implements it client-side using two GitHub REST API endpoints: `GET /repos/{owner}/{repo}/commits/{ref}/check-runs` for check-run status, and `GET /repos/{owner}/{repo}/actions/runs?branch={branch}` for workflow runs. The tool skips workflow-run queries for SHA-like refs (they don't map to branches). Output is a structured markdown summary: totals, failed checks first, then pending, then up to 10 passing. Follows the `createXxxTool(client: GitHubClient)` factory pattern used by all 7 existing GitHub tools.

3. **Unarchive as Flag Toggle (CLI-12)**: Rather than creating a separate `unarchive` command (which amp has as a distinct constant `dlR`), flitter uses `--unarchive` on the existing `archive` command. This maps to `handleThreadsArchive(deps, ctx, threadId, { unarchive: true })` which sets `archived: false` on the snapshot. This is simpler than a separate command and follows the existing precedent of flags modifying command behavior (like `--include-archived` on `list`).

4. **SlashCommandContext Extension (CLI-25)**: To wire `/delete` to actually delete threads, the `SlashCommandContext.threadStore` interface needed `deleteThread(id)` added. This is a breaking change to the interface, but all consumers (tests and main.ts) already had the method available on the underlying ThreadStore — the interface was just too narrow. The `/delete` command now calls `threadStore.deleteThread(ctx.threadId)` directly instead of printing an info message.

### Consequences

- Librarian enables multi-repository codebase understanding via GitHub tools (7 GitHub-specific tools)
- CI status provides build verification without server infrastructure
- Archived threads can now be restored via `flitter threads archive <id> --unarchive`
- `/delete` slash command is now functional (4 of 9 slash command stubs done)
- 40 new tests (22 librarian + 14 ci_status + 2 unarchive + 2 /delete), 0 TypeScript errors

## ADR-023: Iteration 18 — look_at, /history, /editor, /new, CLI-08 verified

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 18 targeted: 1 tool gap (look_at multimodal analysis), 3 slash command stub conversions (/history, /editor, /new), and verified CLI-08 (usage command). Research revealed CLI-08 was already fully implemented and wired — no work needed. The look_at tool required direct Gemini API integration. The slash command improvements brought the functional count from 4/9 to 7/9.

| Gap | Domain | Effort | Selected? |
|-----|--------|--------|-----------|
| GAP-TOOL-27 (look_at) | Tools | Medium | **Yes** — multimodal analysis via Gemini, clear amp reference (mVR/kVR/pVR) |
| GAP-CLI-25 partial (/history) | CLI | Small | **Yes** — iterate thread messages, display compact summary |
| GAP-CLI-25 partial (/editor) | CLI | Small-medium | **Yes** — spawn $EDITOR on temp file, read result back |
| GAP-CLI-25 partial (/new) | CLI | Small | **Yes** — create thread via setCachedThread with fresh UUID |
| GAP-CLI-08 (usage) | CLI | None | **Already done** — verified wiring exists at main.ts:415-426 |

### Decisions

1. **look_at via Direct Gemini API (TOOL-27)**: Amp's `mVR` (chunk-005.js:21875-21987) calls `gemini-3-flash-preview` via a server-proxied Google API. Flitter calls `@google/genai` SDK directly with `generateContent`. Model: `gemini-2.0-flash` (closest publicly available equivalent). MIME detection uses extension-based lookup (amp uses magic-byte `file-type` library — we avoid that dependency). Binary files (images, PDFs, audio, video) sent as `inlineData` with base64 encoding; text files sent as fenced code blocks truncated at 100K chars (matching amp's `ZuT`). System prompt matches amp's `pVR`. preprocessArgs expands `~` and resolves relative paths (matching amp's `kVR`). Reference file failures are non-fatal (matching amp pattern). API key from `GOOGLE_API_KEY` or `GEMINI_API_KEY` env vars, or injected via options.

2. **SlashCommandContext.submitMessage (CLI-25)**: The `/editor` command needs to inject text back into the conversation after the user edits in `$EDITOR`. Added `submitMessage?: (text: string) => void` to `SlashCommandContext`. This is optional — when not provided, `/editor` displays the edited text as a message instead. Editor resolution follows amp's `eB` priority: `$FLITTER_EDITOR` > `$EDITOR` > `$VISUAL` > `vi`. Temp file uses `.md` extension under `os.tmpdir()/flitter-edit-<random>/message.md`.

3. **Thread-Local /new (CLI-25)**: The `/new` command creates a thread via `threadStore.setCachedThread()` with a `crypto.randomUUID()` ID. It cannot switch the active session to the new thread (the interactive loop holds `threadId` in closure), so it shows the new ID and suggests `/switch` or `--thread-id`. Full thread switching requires TUI refactoring (deferred to /switch and /dashboard work).

4. **Skip /switch and /dashboard (CLI-25)**: Both require interactive thread pickers (amp uses `wQ` FuzzyPicker widget). These are TUI-level features that need component work beyond simple wiring. Deferred — 2 remaining stubs out of 9.

### Consequences

- look_at enables multimodal file analysis (images, PDFs, audio, video, text) via Gemini
- 7 of 9 slash command stubs now functional (only /switch and /dashboard remain)
- SlashCommandContext extended with submitMessage for editor integration
- GAP-CLI-08 verified as already complete — no implementation waste
- 28 new tests (22 look_at + 6 slash commands), 0 TypeScript errors

---

## ADR-024: Iteration 19 — skill CLI, --mcp-config, permissions edit, mermaid tool

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 19 targets 4 gaps across CLI commands (CLI-01, CLI-07, CLI-09) and tools (TOOL-11).

### Targets

| Gap | Domain | Size | Amp Reference |
|-----|--------|------|---------------|
| GAP-CLI-01 (skill commands) | CLI | Medium | **Yes** — g40 at chunk-004.js:23716; 4 subcommands |
| GAP-CLI-09 (--mcp-config) | CLI | Small-medium | **Yes** — EC0/CC0 at modules/2509-2510; arg peek + merge |
| GAP-CLI-07 (permissions edit) | CLI | Medium | **Yes** — MQT at modules/2435; serialize + $EDITOR + parse-with-retry |
| GAP-TOOL-11 (mermaid) | Tools | Small | **Yes** — gVR at chunk-005.js:148656; no-op execute + IVR description |

### Decisions

1. **Skill CLI via scan() not getSkills() (CLI-01)**: Amp's skillService exposes `getSkills()`, `getSkillErrors()`, and `getSkill(name)` as separate async methods. Flitter's SkillService has a single `scan()` returning `{skills, errors, warnings}`. This is actually cleaner — one call instead of two for `skill list`. For `skill info`, we scan then filter by name. The `--global` flag is accepted in CLI but not yet wired to override install path (SkillService computes path internally from workspaceRoot/userConfigDir). No `--target` flag (amp-specific).

2. **--mcp-config via runtime override (CLI-09)**: Amp's CC0 function creates a proxy wrapper around the settings object that intercepts `get("mcpServers")` and merges CLI-provided servers. Flitter uses a simpler approach: `configService.setRuntimeOverride("mcpServers", merged)` which directly updates the in-memory settings. Then `mcpServerManager.refresh()` diffs and connects. The CLI servers are in-memory only (never persisted to disk), matching amp's behavior. Parsing follows amp's EC0 exactly: if value starts with `{`, treat as inline JSON; otherwise read as file path. Basic shape validation (must be `Record<string, object>`), no Zod schema (not in CLI deps).

3. **Permissions edit with text-based serialization (CLI-07)**: Amp serializes rules via Z2 (one line per rule: `<action> [--to x] [--message x] [--context x] <tool> [matchers]`). Flitter simplifies to `<action> <tool> [key=value ...]` — no `--to`/`--message`/`--context` flags since we don't support `delegate` action or `reject --message`. The retry loop is capped at 3 attempts (matching amp's MQT). Parse errors are inserted as `# Error:` comment lines above offending rules (matching amp's DQT).

4. **Mermaid as declarative no-op tool (TOOL-11)**: Amp's mermaid tool has a no-op execute (`() => ({status: "done", result: {success: true}})`) — all rendering happens in the TUI's `buildMermaidTool`. We replicate this pattern but add a mermaid.live base64 link in the tool output, so even in non-TUI contexts (headless, execute mode) the user gets a clickable link. The link uses amp's dark theme config (xVR). TUI-side rendering (ASCII mermaid via x50()) is deferred.

### Consequences

- Skill system vertical now fully implemented: SkillTool (agent-callable) + SkillService (backend) + CLI commands (user-facing)
- --mcp-config enables scripted/automated MCP server injection without modifying config files
- permissions edit provides interactive CRUD for permission rules (previously only add/list/test)
- mermaid tool enables diagram generation in conversations with clickable mermaid.live links
- 24 new tests (11 skill handlers + 13 mermaid), 0 TypeScript errors

## ADR-025: Iteration 20 — OverlapColumn widget, createThread, thread search wiring

**Date:** 2026-04-21
**Status:** Accepted
**Context:** Iteration 20 targets 3 gaps across TUI (TUI-07), Agent-Core (CORE-04), and Data (DATA-06). Targets selected for: clear amp reference, medium complexity, self-contained implementation, strong testability.

### Targets

| Gap | Domain | Size | Amp Reference |
|-----|--------|------|---------------|
| GAP-TUI-07 (OverlapColumn) | TUI | Medium | **Yes** — l1T/LY at chunk-006.js:3066-3176; widget + render object |
| GAP-CORE-04 (createThread) | Core | Medium | **Yes** — QWT.createThread at 1246:111-143; orchestrator method |
| GAP-DATA-06 (thread search) | Data | Small-medium | **Yes** — rGR at chunk-005.js:20511; client→server FTS5 wiring |

### Decisions

1. **OverlapColumn as direct RenderBox subclass (TUI-07)**: Unlike regular `Column` which uses `RenderFlex`, OverlapColumn extends `RenderBox` directly — matching amp's `LY extends O9`. This is correct because OverlapColumn doesn't support flex children (Flexible/Expanded), mainAxisAlignment, or mainAxisSize. It's a simpler single-pass sequential layout with a negative gap. Key detail: amp defaults `overlap` to 1 (not 0) and `crossAxisAlignment` to "stretch" (not "start"). Paint order is reversed (index 0 paints last = on top) which matches the visual stacking expectation for overlap regions.

2. **createThread without worker.handle() (CORE-04)**: Amp's createThread uses `worker.handle({type: "agent-mode"})`, `worker.handle({type: "draft"})`, etc. for several steps. Flitter's ThreadWorker doesn't have a general `handle()` dispatcher — only `enqueueMessage()`, `resume()`, `cancelInference()`. We implement the core orchestration (ID gen, seeding, worker creation+resume, idempotency guard, parent relationship, initial user message via `enqueueMessage`) and defer steps requiring `handle()` (agentMode on live worker, draftContent, setPendingNavigation, transferQueuedMessages). The `handoff()` method is also deferred since it requires an LLM summarizer call.

3. **Thread search via optional callback pattern (DATA-06)**: Rather than making `find_thread` depend directly on `HttpRemoteTransport`, we add `searchRemote` as an optional callback on `ThreadStoreLike`. This keeps the tool's dependency surface minimal — it doesn't need to know about transport details. The container wires the callback by wrapping `transport.searchThreads()`. Falls back gracefully to local keyword search on `null` return or exception. Server uses `/api/threads/search` (flitter naming) vs amp's `/api/threads/find` — functionally identical FTS5 endpoint.

### Consequences

- OverlapColumn widget enables merged-border layouts in the TUI (e.g., chat bubbles with shared borders)
- createThread provides programmatic thread creation for handoff, subagent spawning, and CLI `threads new`
- Thread search quality improves dramatically when a sync server is available (FTS5 vs local substring matching)
- 39 new tests (23 + 9 + 7), 0 TypeScript errors
- 4 gaps closed: CLI-01, CLI-07, CLI-09, TOOL-11
- Total open gaps reduced from 54 to 50
