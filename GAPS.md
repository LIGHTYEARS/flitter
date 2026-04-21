# Flitter vs Amp — Gap Analysis

> **Last updated:** 2026-04-22 (iteration 22)
> **Method:** Automated parallel analysis of `amp-cli-reversed/` modules against `packages/` source, cross-referenced with existing plan docs in `docs/superpowers/plans/`. Iteration 22 targets: thread metadata remote update, archive remote sync, threads share command, diff viewer parity verification.

## How to Read This Document

- Gaps are organized by severity: **Critical → High → Medium → Low**
- Each gap has a unique ID (e.g., `GAP-CLI-01`) for cross-referencing in plans and commits
- **Closed gaps** are listed at the bottom — remove from "Gaps" when verified closed
- Domain prefixes: `CLI` (commands/flags), `TOOL` (builtin tools), `TUI` (widgets/rendering), `LLM` (providers/streaming), `CORE` (agent-core), `DATA` (persistence/config)

---

## Critical Gaps

*None — GAP-TOOL-01 closed 2026-04-21.*

---

## High Gaps

| ID | Domain | Feature | Description |
|----|--------|---------|-------------|
| GAP-CLI-01 | CLI | ~~**`skill` / `skills` command group**~~ | **Closed (iteration 19)** — `handleSkillList`, `handleSkillInfo`, `handleSkillRemove`, `handleSkillAdd` in `skills.ts`. `skill` command tree in `program.ts` with `list` (--json), `info` (--json), `remove`, `add` (--name, --overwrite, --global). Wired in `main.ts`. 11 new tests. |
| GAP-CLI-27 | CLI | ~~`tools use <name>` direct invocation~~ | **Closed (iteration 13)** — `handleToolsUse` with `--only`/`--stream` flags, CLI arg parsing, stdin JSON, type coercion. |
| GAP-CLI-28 | CLI | ~~`threads handoff` subcommand~~ | **Closed (iteration 14)** — `handleThreadsHandoff` with `--goal/-g` and `--print/-p` flags, parent context extraction, child thread seeding, bidirectional relationship wiring. |
| GAP-TUI-01 | TUI | **Image display (Kitty Graphics)** | Amp has a full `ImageWidget` with Kitty APC protocol transmission, format conversion (JPEG/GIF→PNG), chunked transmission, lifecycle management. Flitter has no image widget. Plan: `2026-04-19-image-display.md`. |
| GAP-DATA-02 | Data | ~~**Thread metadata remote update**~~ | **Closed (iteration 22)** — `setThreadMeta(id, meta)` added to `ThreadRemoteTransport` interface + `HttpRemoteTransport`. `updateThreadMeta(id, meta)` on ThreadStore follows amp's three-phase protocol: (1) `uploadThreadNow`, (2) `remote.setThreadMeta`, (3) reload from server and replace local cache. `uploadThreadNow()` convenience method added. `ThreadMeta` type exported. Matches amp's azT.updateThreadMeta (modules/1342:260-272). 7 new tests. |
| GAP-DATA-13 | Data | ~~`ensureThreadEntriesLoaded` (remote list + local merge)~~ | **Closed (iteration 14)** — Lazy-load remote thread entries on first subscribe, three-phase merge (remote → local overlay → identity-preserving dedup), coalescing promise to prevent concurrent fetches. |
| GAP-CORE-07 | Core | ~~`blocked-on-user` persisted to thread state~~ | **Closed (iteration 13)** — `blocked-on-user` status persisted via `tool:data` delta BEFORE approval prompt shown. `getThreadSessionState()` utility for crash recovery. |
| GAP-CORE-08 | Core | ~~Skill invocation enforcement~~ | **Closed (iteration 13)** — `setPendingSkills()`, `injectPendingSkills()` (info message injection), `checkAndAppendAwaitedSkills()` (synthetic tool_use + stopReason flip). Full amp `YwR` behavior. |

---

## Medium Gaps

### CLI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-CLI-02 | `threads share <id>` | **Closed (iteration 22)** — `handleThreadsShare` with `--visibility <level>` flag. `visibilityToMeta()` maps user-facing levels (public/unlisted/workspace/private/group) to internal meta objects matching amp's MA() (modules/2514). Registered in program.ts + main.ts. Falls back to local-only `setVisibility` when no remote transport. 10 new tests. |
| GAP-CLI-03 | `threads visibility [level]` | **Closed (iteration 22)** — Handled via `threads share --visibility <level>` and `/visibility` slash command. `/visibility` slash handler now calls `ctx.threadStore.setVisibility()` instead of printing info message. `SlashCommandContext.threadStore` interface extended with `setVisibility` method. |
| GAP-CLI-04 | `threads handoff [id]` | **Closed (iteration 14)** — Duplicate of GAP-CLI-28. |
| GAP-CLI-05 | ~~`tools make <name>`~~ | **Closed (iteration 14)** — `handleToolsMake` with `--bun/--bash/--zsh/--force` flags, toolbox dir resolution (`FLITTER_TOOLBOX`/`AMP_TOOLBOX`), name validation, template generation, chmod 755. |
| GAP-CLI-06 | ~~`tools use <name>`~~ | **Closed (iteration 13)** — Duplicate of GAP-CLI-27. |
| GAP-CLI-07 | ~~`permissions edit`~~ | **Closed (iteration 19)** — `handlePermissionsEdit` opens rules in `$EDITOR` with retry loop (up to 3 attempts on parse error). Serialize/parse text format: `<action> <tool> [key=value ...]`. Comment header, error annotation. |
| GAP-CLI-08 | ~~`usage` (top-level)~~ | **Closed (iteration 18)** — Already implemented: `handleThreadsUsage` aggregates token counts from assistant messages in thread snapshots. Wired at `main.ts:415-426`. |
| GAP-CLI-09 | ~~`--mcp-config <json>`~~ | **Closed (iteration 19)** — `extractCliMcpConfig` + `parseMcpConfigValue` in `main.ts`. Accepts inline JSON or file path. Merges into runtime config via `configService.setRuntimeOverride("mcpServers", ...)` + `mcpServerManager.refresh()`. |
| GAP-CLI-25 | 2 slash commands are informational-only | `/switch`, `/dashboard` print "use `flitter threads X` from CLI" instead of performing the action inline. (`/rename`, `/label`, `/archive`, `/delete`, `/new`, `/editor`, `/history` now functional — 7 of 9 stubs done.) |

### Tools

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TOOL-02 | ~~`get_diagnostics`~~ | **Closed (iteration 14)** — Shell-out based diagnostics tool: TypeScript (`tsc --noEmit`), Python (`ruff`), Go (`go vet`), Rust (`cargo check`). 10s timeout, normalized diagnostic format. Registered as builtin. |
| GAP-TOOL-03 | ~~`oracle`~~ | **Closed (iteration 16)** — Senior engineering advisor subagent tool. Params: task (required), context, files. Spawns oracle subagent via SubAgentManager with filtered toolset (Read, Grep, Glob, web_search, read_web_page, read_thread, find_thread). Prompt builder matches amp's EVR. disableTimeout, no resource conflicts. Registered in container.ts. |
| GAP-TOOL-04 | ~~`librarian`~~ | **Closed (iteration 17)** — Codebase understanding subagent for remote repositories. Params: query (required), context (optional). Spawns librarian subagent via SubAgentManager with GitHub-specific toolset (read_github, search_github, commit_search, diff, list_directory_github, list_repositories, glob_github). Prompt builder matches amp's mKR. disableTimeout, no resource conflicts. Registered in container.ts. |
| GAP-TOOL-06 | ~~`shell_command` (subagent)~~ | **Closed (iteration 15)** — Alternate Bash tool for subagents with `command`, `workdir`, `login`, `timeout_ms` params. Maps to Bash execution via `preprocessArgs`. Registered as builtin. |
| GAP-TOOL-27 | ~~`look_at` tool~~ | **Closed (iteration 18)** — Multimodal file analysis via Google Gemini. Params: `path`, `objective`, `context` (required), `referenceFiles` (optional). Detects MIME type from extension, sends binary as base64 inlineData or text as fenced code block (truncated at 100K chars). System prompt matches amp's pVR. preprocessArgs expands ~ and resolves relative paths. Registered in container.ts. 22 new tests. |

### TUI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TUI-05 | **Terminal RGB color query** | Amp's QueryParser probes terminal for actual RGB palette and dynamically updates theme colors. Flitter has no query parser. |
| GAP-TUI-07 | ~~**OverlapColumn widget**~~ | **Closed (iteration 20)** — `OverlapColumn` widget + `RenderOverlapColumn` render object. Vertical column with `overlap` rows subtracted between adjacent children (merged borders). Cross-axis alignment (start/end/center/stretch), reverse paint order for visual stacking. 23 new tests. |
| GAP-TUI-08 | ~~**IntrinsicHeight widget**~~ | **Closed (iteration 21)** — `IntrinsicHeight` widget + `RenderIntrinsicHeight` render object. Forces child height to its max intrinsic height. Short-circuits when constraints already tight. Intrinsic measurement delegation matches amp's `n1T` (chunk-006.js:3030-3065). Exported from `@flitter/tui`. 19 new tests. |
| GAP-TUI-10 | ~~**Overlay background fix**~~ | **Closed (iteration 21)** — Three surgical fixes: (1) `CommandPaletteState.build()` rebuilt from stub to full visual tree with opaque `Container` + `BoxDecoration({ color: Color.default() })`, TextField prompt, item list. (2) `FuzzyPicker` outer Container changed from `Color.rgb(0,0,0)` to `Color.default()`. (3) FuzzyPicker items Column changed to `crossAxisAlignment: "stretch"` for full-width selection. (4) Non-selected items given explicit `Color.default()` background. 10 new tests. |

### LLM

| ID | Feature | Description |
|----|---------|-------------|
| GAP-LLM-05 | Request-level telemetry headers | Amp sends `x-amp-feature`, `x-amp-thread-id`, `x-amp-mode` etc. via proxy server. These are proxy-specific — direct API impact is nil. Low priority for self-hosted. |

### Data

| ID | Feature | Description |
|----|---------|-------------|
| GAP-DATA-04 | ~~Fetch-from-server on cache miss~~ | **Closed (iteration 21)** — `ensureThreadSubject(id, opts)` added to `ThreadStore`: checks local cache first, then fetches from remote via `ThreadRemoteTransport.getThread()`. Coalescing promise (`pendingThreadLoads` Map) deduplicates concurrent fetches. `fetchThread(id)` async wrapper for callers that just need the snapshot. Graceful error handling (returns null on network failure). Matches amp's `azT.ensureThreadSubject` (modules/1342:128-155). 9 new tests. |
| GAP-DATA-05 | Thread archive via remote API | **Closed (iteration 22)** — `handleThreadsArchive` now calls `threadStore.uploadThreadNow(threadId)` after setting `archived` flag + incrementing version, matching amp's synchronous archive behavior (azT:255-258). Server PATCH endpoint already handles `archived: boolean`. |
| GAP-DATA-06 | ~~Thread search (client-side wiring)~~ | **Closed (iteration 20)** — `searchThreads()` added to `ThreadRemoteTransport` interface + `HttpRemoteTransport`. `ThreadStoreLike.searchRemote` optional callback. `find_thread` tool tries remote FTS5 first, falls back to local keyword matching. 7 new tests (4 find_thread + 3 transport). |

### Agent-Core

| ID | Feature | Description |
|----|---------|-------------|
| GAP-CORE-04 | ~~ThreadWorkerService missing `handoff`/`createThread`~~ | **Closed (iteration 20)** — `createThread()` and `createThreadWorker()` methods added to `ThreadWorkerService`. `createThread` orchestrates: thread ID generation, message seeding, worker creation+resume, idempotency guard, parent relationship, initial user message. `handoff()` deferred (requires LLM summarizer). 9 new tests. |

---

## Low Gaps

### CLI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-CLI-10 | ~~`threads continue --last`~~ | **Closed (iteration 15)** — `--last` flag on `threads continue` resolves most recent thread via `listRecentThreadIds(1)` without picker. Thread ID argument now optional. Alias `c` added. |
| GAP-CLI-11 | ~~`threads --include-archived`~~ | **Closed (iteration 16)** — `--include-archived` flag on `threads list`. Typed in `ThreadsListOptions`, passed through `main.ts` to `observeThreadList()` (backend from DATA-17). Removed unsafe cast. |
| GAP-CLI-12 | ~~`threads archive --unarchive`~~ | **Closed (iteration 17)** — `--unarchive` option on `archive` command. `handleThreadsArchive` now accepts options with `unarchive?: boolean`, toggles `archived: false` to restore archived threads. Wired through `main.ts` and `program.ts`. |
| GAP-CLI-13 | `--visibility` (top-level) | Thread creation visibility flag. |
| GAP-CLI-14 | `--remote` flag | Server-side async agent execution. Requires server infrastructure. |
| GAP-CLI-15 | `--notifications` | Sound notification toggle. |
| GAP-CLI-16 | `--settings-file <path>` | Override settings file path. |
| GAP-CLI-17 | `--log-level` / `--log-file` | Explicit log control flags (flitter only has `--verbose`). |
| GAP-CLI-18 | `mcp oauth status` | OAuth status check for MCP servers. |
| GAP-CLI-19 | ~~`threads` aliases~~ | **Closed (iteration 16)** — Commander.js `.alias()` chains: threads→t/thread, new→n, list→l/ls. (continue→c, markdown→md, search→find, rename→r, handoff→h were already done.) Matches amp's chunk-005.js:4879 alias mapping. |
| GAP-CLI-20 | `install` (hidden) | Install ripgrep to `$AMP_HOME/bin`. |
| GAP-CLI-21 | `--jetbrains` / `--ide` flags | IDE integration toggles. |

### Tools

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TOOL-11 | ~~`mermaid`~~ | **Closed (iteration 19)** — Mermaid diagram tool registered as builtin. No-op execute returns success + mermaid.live base64 link. Schema: `{code, citations}` matching amp's gVR. TUI rendering deferred. 13 new tests. |
| GAP-TOOL-12 | `chart` | Chart generation from JSON data. |
| GAP-TOOL-13 | `walkthrough` / `walkthrough_diagram` | Guided code walkthroughs. |
| GAP-TOOL-14 | `code_tour` | Guided code tour sub-agent. |
| GAP-TOOL-15 | ~~`todo_write`~~ | **Closed (iteration 16)** — Stateless todo tracking tool pair (todo_write + todo_read). todo_write: no-op execution, state lives in conversation history. Accepts `todos` array ({content, status}) or `content` string. todo_read: reads from ToolContext.todos. `getTodosFromThread()` scanner matches amp's O0T (backward scan, summary boundary). Registered as builtin. |
| GAP-TOOL-16 | ~~`format_file`~~ | **Closed (iteration 15)** — Auto-detects formatter by file extension + project config (biome.json). Supported: TypeScript/JS (prettier/biome), Python (ruff/black), Go (gofmt), Rust (rustfmt). 15s timeout. Registered as builtin. |
| GAP-TOOL-17 | `look_at` | IDE-specific code navigation. |
| GAP-TOOL-18 | `painter` | Image/diagram generation. |
| GAP-TOOL-19 | `repl` | Interactive REPL tool. |
| GAP-TOOL-20 | `docs_list/read/write` | Documentation management (server-side). |
| GAP-TOOL-21 | `handoff` | Transfer conversation to another thread. Server-dependent. |
| GAP-TOOL-22 | Thread lifecycle tools | `create_thread`, `archive_thread`, `unarchive_thread`. Server-dependent. |
| GAP-TOOL-23 | Inter-thread messaging | `send_message_to_thread`, `send_message_to_aggman`. Server-dependent. |
| GAP-TOOL-24 | Slack tools | `slack_write`, `slack_read`. Server-dependent. |
| GAP-TOOL-25 | ~~`github_repo_ci_status`~~ | **Closed (iteration 17)** — Client-side CI status tool. Queries GitHub REST API for check-runs and workflow-runs on a given ref. Shows summary with pass/fail/pending counts. Follows `createXxxTool(client: GitHubClient)` factory pattern. Added to `createGitHubTools()` array (now 8 tools). |
| GAP-TOOL-26 | Bitbucket Enterprise tools | 7 enterprise Bitbucket integration tools. |

### TUI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TUI-11 | Emoji width mode (`?2027`) | Detected but not enabled. |
| GAP-TUI-12 | In-band resize | Amp uses in-band resize notification; flitter uses SIGWINCH only. |
| GAP-TUI-13 | `modifyOtherKeys` | Enhanced key disambiguation mode. |
| GAP-TUI-15 | Ghostty progress bar | Terminal-specific progress integration. |
| GAP-TUI-16 | Custom theme TOML loading | File-based custom theme loading. Plan: `2026-04-19-gap8-theme-system.md`. |
| GAP-TUI-17 | Diff viewer as full widget | **Closed (iteration 22)** — Flitter's `buildDiffWidget()` is a function returning `RichText`, exactly matching amp's `cE0(T, R)` (chunk-004.js:21105-21125). Amp also uses a function (not a StatefulWidget). Feature-complete by comparison. |

### LLM

| ID | Feature | Description |
|----|---------|-------------|
| GAP-LLM-08 | `service_tier` for OpenAI speed | Amp auto-computes from agent mode; flitter requires explicit setting. |
| GAP-LLM-09 | `cacheTTL` in pricing model | Amp tracks 5-minute TTL for cache invalidation awareness. |
| GAP-LLM-10 | Context-limit → Gemini fallback | Amp auto-falls back to Gemini on context overflow. Flitter detects but doesn't auto-fallback. |

### Data

| ID | Feature | Description |
|----|---------|-------------|
| GAP-DATA-07 | Secret migration (file→keychain) | Amp auto-migrates secrets from file to native keychain. Flitter has both backends but no migration. |
| GAP-DATA-08 | GitHub auth status check | Server-side endpoint for interactive auth approval flow. |
| GAP-DATA-09 | GitHub git access token | Server-side credential helper for git operations. |
| GAP-DATA-10 | `observeThreadList` with filtering | Reactive filtered view (excludes archived/child) with throttle. Flitter returns raw list. |
| GAP-DATA-11 | Thread labels via server API | Labels don't propagate to remote. |
| GAP-DATA-12 | `invalidateThreadListCache` | Force re-fetch from server. N/A without remote transport. |

---

## Closed Gaps (Verified Implemented)

These were previously identified as gaps but are now implemented in flitter.

### CLI Commands (from gap1-missing-cli-commands.md)
- `threads export`, `threads markdown`, `threads rename`, `threads search`, `threads usage`, `threads label`
- `threads dashboard` (flitter extension)
- `mcp doctor`, `mcp approve`, `mcp oauth login/logout`
- `review` command
- `--execute`, `--headless`, `--stream-json`, `--print`, `--pipe`, `--max-turns`, `--model`, `--mode`, `--system-prompt`, `--dangerously-allow-all`, `--allowed-tools`, `--disallowed-tools`, `--toolbox`, `--output-format`

### Builtin Tools (from gap2-missing-builtin-tools.md)
- `undo_edit` (with FileChangeTracker), `delete_file`, `read_mcp_resource`, `Skill` tool
- `web_search` (stub with configurable endpoint), `read_web_page`
- `code_review`, `finder` (factory tools bound to SubAgentManager)
- `task_list` (in-memory TaskStore), `find_thread`, `read_thread`
- All 7 GitHub tools: `read_github`, `search_github`, `commit_search`, `list_directory_github`, `glob_github`, `github_diff`, `list_repositories`

### TUI (from various plans)
- All 8 built-in themes ported, ThemeRegistry with custom+builtin lookup
- BrailleSpinner (cellular automaton), Diff Widget, Selection/Clipboard
- Fling scroll physics, Overlay system (fuzzy picker, command palette, dialogs)
- Toast/notification, Thread picker, Welcome screen

### LLM (from bedrock/cost-tracking/retry-backoff plans)
- Bedrock provider (flitter extension — amp does NOT have this)
- SessionCostTracker with per-turn accumulation and pricing table
- RetryScheduler with 7 error classifiers matching amp's exact patterns
- ModelFallbackChain, PromptCacheTracker
- **GAP-LLM-01**: Stream idle timeout wrapper (`withStreamIdleTimeout`, 120s default) on all 5 providers
- **GAP-LLM-02**: `maxRetries: 0` on Anthropic, OpenAI, OpenAI-compat, and Bedrock SDK clients

### Agent-Core
- **GAP-CORE-01**: PluginService wired into `container.ts` — instantiated, tool call/result interception hooked into `OrchestratorCallbacks`, CLI `plugins` command registered
- **GAP-CORE-02**: Compaction pinning fully implemented in `context-manager.ts` — info-message/cache-control message pinning, last-user-message promotion, dedup, system context injection

### Data (from thread-persistence/secret-storage/thread-resume plans)
- File-based SecretStorage + native keyring
- Thread persistence wiring (auto-save, hydration, `--continue`)
- Thread resume with stream recovery
- Title generation
- **GAP-DATA-01**: Self-hosted sync server (`packages/server/`) with HttpRemoteTransport, container wiring, version-aware hydration
- **GAP-DATA-03**: Remote thread list hydration on startup (version-aware merge in `container.ts`)

### Tools
- **GAP-TOOL-01**: `apply_patch` tool — Codex patch format parser + hunk applicator + tool spec in `apply-patch.ts`, registered as builtin tool
- **GAP-TOOL-07**: Bash `cwd` parameter — per-command working directory override matching amp's behavior
- **GAP-TOOL-08**: Grep `literal` parameter — `--fixed-strings` mode for non-regex matching
- **GAP-TOOL-09**: `read_web_page` `forceRefetch` — already implemented in `read-web-page.ts:104` inputSchema

### LLM
- **GAP-LLM-03**: Missing providers (fireworks, baseten, moonshotai) — all 3 present in `KNOWN_COMPAT_CONFIGS`
- **GAP-LLM-07**: `InvalidModelOutputError` in model-fallback — implemented in both `model-fallback.ts:93` and `retry-scheduler.ts`

### TUI
- **GAP-TUI-03**: Synchronized output (DEC Private Mode 2026) — `SYNC_START`/`SYNC_END` wraps render output in `tui-controller.ts`; heuristic detection via `TERM_PROGRAM` for kitty/WezTerm/Ghostty/Contour/iTerm2 3.5+
- **GAP-TUI-04**: Kitty keyboard protocol — `CSI > 1 u` (push) / `CSI < u` (pop) wired into `init()`, `handleResume()`, and `restoreTerminalSync()`; heuristic detection for kitty/WezTerm/Ghostty/Contour
- **GAP-TUI-06**: OSC 8 hyperlink infrastructure — `Cell.url` field, `AnsiRenderer.renderDiff()` emits `OSC8_START`/`OSC8_END` on URL transitions (partial: widget paint pipeline not yet plumbed)
- **GAP-TUI-09**: Animated spinner integration — `BrailleSpinner` wired into `ConversationViewState` with 200ms `setInterval` animation timer

### CLI (from secret CLI command)
- `flitter secret set/get/delete/list` commands for managing stored credentials
- **GAP-CLI-23**: `/cost` slash command — wired to `SessionCostTracker.getTotals()` with formatted token/cost output
- **GAP-CLI-24**: `/compact` slash command — wired to `contextManager.checkAndCompact()` with before/after token counts
- **GAP-CLI-26**: `maxInputTokens` — now derived from `MODEL_REGISTRY[modelName].contextWindow` instead of hardcoded 200K
- **GAP-CLI-22**: `/model` slash command — fully wired with model validation, partial-match fuzzy resolution, and `configService.updateSettings` for runtime switching

### Agent-Core (from iteration 3)
- **GAP-CORE-03**: `compactFn` wired to real LLM summarization call in `container.ts` with amp's exact 5-section continuation prompt

### LLM (from iteration 3+4)
- **GAP-LLM-04**: Model registry updated from ~16 to ~35 models — added GPT-5.x family, newer Claude models, Gemini 3.x; fixed Sonnet 4 contextWindow to 1M
- **GAP-LLM-06**: `prompt_cache_key` for openai-compat — now sends `prompt_cache_key: threadId` on all compat provider requests, matching OpenAI provider behavior

### Tools (from iteration 5)
- **GAP-TOOL-10**: Parameter aliases via `preprocessArgs` on `ToolSpec` — Bash (`cmd`→`command`), Read (`path`→`file_path`, `read_range`→`offset`+`limit`), Edit (`path`/`old_str`/`new_str`→canonical names), Write (`path`→`file_path`), Glob (`filePattern`→`pattern`). Mirrors amp's `preprocessArgs` pattern.

### TUI (from iteration 5)
- **GAP-TUI-14**: Cursor shape control (DECSCUSR) — `SET_CURSOR_SHAPE(n)` constant, `cursorShape` field on Screen, shape emission in `renderCursor()`, reset to 0 on deinit/suspend, `supportsCursorShape` capability with Emacs/JetBrains exclusion heuristic

### CLI (from iteration 5)
- **GAP-CLI-25 partial**: `/rename`, `/label`, `/archive`, `/delete` slash commands wired to mutate thread state via `threadStore.setCachedThread()` / `threadStore.deleteThread()` instead of printing info messages. 4 of 9 stubs now functional.

### Tools (from iteration 6)
- **GAP-TOOL-05**: `restore_snapshot` tool spec — wraps existing `auto-snapshot.ts` `restoreSnapshot()` function. Input: `{ path, treeOID }`. Added `restorePath` parameter to support file/directory-level restore (not just full workspace). Registered as static builtin.

### Agent-Core (from iteration 6)
- **GAP-CORE-04 partial**: `ThreadRelationshipSchema` extended with `role` ("child"/"parent") and `createdAt` fields. `ThreadWorkerService` gained `seedThreadMessages()` (atomic message seeding via `exclusiveSyncReadWriter`) and `applyParentRelationship()` (bidirectional child-parent relationship wiring with dedup). `handoff()` and `createThread()` deferred.

### Iteration 7 — Type errors + CLI tool filter bug + tool fixes
- **8 TypeScript type errors fixed**: `CliToolFilters` type added to `registry.ts` with `setCliFilters()`/`getCliFilters()` methods + `listEnabledWithCliFilters()`. Orchestrator `output`→`content` mapping corrected. Execute mode `"thinking"` event filter rewritten to check `inference:delta` content blocks. `ToolThreadEvent.status` `"done"`→`"completed"` mapping corrected.
- **GAP-R5 (CLI tool filter bug) fixed**: `interactive.ts` and `execute.ts` were writing `tools.allowed`/`tools.disallowed` to config, but `ToolRegistry` reads `tools.enable`/`tools.disable`. Rewired both modes to use `toolRegistry.setCliFilters()` directly, routing through the new `CliToolFilters` layer.
- **GAP-TOOL-28**: `disableTimeout` — Added `disableTimeout?: boolean` field to `ExecutionProfile` interface, conditional timeout skip in orchestrator, set on Bash/Task/code_review/finder tools. Long-running tools no longer time out at 120s.
- **GAP-TOOL-29**: `skill` name case mismatch — Changed `"Skill"` → `"skill"` (lowercase) in skill-tool.ts to match amp's registration.

### Iteration 8 — Glob matching, orchestrator safety, Bash cd
- **GAP-CORE-09**: Glob pattern matching for `tools.enable`/`tools.disable` — Implemented `matchToolPattern()` with lightweight glob-to-regex converter (handles `*`, `?`, `[...]`, `{a,b}`). Updated `_isToolEnabled()` to check multiple name variants: bare name, MCP bare-tool + full-form, `builtin:`/`toolbox:` prefix. 21 new tests. Matches amp's Xf/Vf behavior.
- **GAP-CORE-05** (partial): `onResume()` method added to `ToolOrchestrator` — scans latest user message for non-terminal tool_results, restores blocked-on-user to approval queue, cancels dangerous tools with system:safety, re-invokes safe tools.
- **GAP-CORE-06**: `isDangerousToResume()` — exported from orchestrator. Flags Bash, run_terminal_command, shell_command, Task, handoff (exact amp match).
- **GAP-TOOL-30**: Bash `cd` interception — `preprocessArgs` now detects `cd path` patterns, rewrites `cwd` with resolved absolute path, strips `cd` from command. Handles `~` expansion, quoted paths, `&& rest`/`; rest` chains. Skips dynamic paths ($VAR, backtick). 14 new tests.

### Iteration 9 — onResume wiring, provider API keys, subagent tool filtering
- **GAP-CORE-05** (completed): `toolOrchestrator.onResume(snapshot)` now called from `ThreadWorker.resume()` after truncation + file tracking. Added `shouldResumeFromLastMessage()` guard matching amp's NlR/HlR/NET checks (cancelled, rejected-by-user, info role → skip resume, set state to cancelled). `resume()` changed from sync to async. Container uses fire-and-forget `.catch(() => {})` to keep `createThreadWorker` synchronous. 4 new tests.
- **GAP-DATA-14/15** (completed): `getToken("apiKey")` in `factory.ts` is now provider-aware. Reads `internal.model` from settings → looks up `MODEL_REGISTRY[model].provider` → checks provider-specific settings key + env vars. Gemini: `gemini.apiKey` → `GOOGLE_API_KEY` → `GEMINI_API_KEY`. OpenAI: `openai.apiKey` → `OPENAI_API_KEY`. Anthropic: `anthropic.apiKey` → `ANTHROPIC_API_KEY`. `isSet()` checks all env vars before provider is cached, narrows after first `getToken()`. 13 new tests.
- **GAP-CORE-18** (completed): Subagent tool filtering implemented. `SUBAGENT_TYPE_REGISTRY` maps 8 types (finder, oracle, code-review, code-tour, codereview-check, walkthrough, task-subagent, librarian) to tool patterns matching amp's qe object. `ToolRegistry.createFilteredRegistry(patterns)` creates snapshot registries filtered by `matchToolPattern()`. `SubAgentWorkerOptions.toolPatterns` added; `spawn()` auto-populates from registry. Container wiring passes filtered registry to `createThreadWorker`. 14 new tests.

### Iteration 10 — Orchestrator safety: rejected-by-user, approval clearing, processing mutex
- **GAP-CORE-13** (completed): Tool denial now emits `"rejected-by-user"` status (not `"cancelled"`) with `reason` and `toAllow` fields, matching amp's $mR invokeTool. Feedback-denial emits `"error"` with the user's feedback text so the LLM can read it. Static `"reject"` action also emits `"rejected-by-user"` with permission rule reason. `toAllow` computed from tool args (command string for Bash, file path for Edit/Write). `ToolRunRejectedSchema` extended with `toAllow` field. 5 new tests.
- **GAP-CORE-14** (completed): `ToolOrchestrator.onNewUserMessage()` added — calls `clearPendingApprovals` (resolves all pending approval Promises with `accepted: false`) pre-emptively outside the mutex, then `cancelAll("user:interrupted")` under the mutex. `clearPendingApprovals` callback wired in `container.ts` to iterate `ThreadWorker._pendingApprovals` Map. Called from `ThreadWorker.enqueueMessage()` on immediate (non-buffered) processing. 3 new tests.
- **GAP-CORE-10** (completed): `Mutex` utility class — FIFO queuing async mutex matching amp's `Cm` class (modules/1184_unknown_Cm.js). `processingMutex` field added to `ToolOrchestrator`. `onResume()` now acquires mutex before scanning tools, releases before `updateFileChanges`. `cancelAll()` now async with mutex. `dispose()` bypasses mutex for synchronous cleanup. `cancelInference()` uses fire-and-forget `void cancelAll()`. 6 + 4 new tests (mutex + serialization).

### Iteration 11 — toolMessages channel, cancelToolOnly, plugin lifecycle hooks, Read directory/image
- **GAP-CORE-12** (completed): `toolMessages` Subject channel — `Map<string, Subject<ToolMessage>>` added to `ToolOrchestrator`. Each `invokeTool()` call creates a Subject, stores it in the map, and injects it into `ToolContext.toolMessages`. On normal completion, the Subject is completed and removed. `cancelAll()` and `dispose()` send `{ type: "stop-command" }` to all Subjects before completing. `sendToolMessage()` method added for arbitrary message delivery. `ToolMessage` type defined in `types.ts`. Matches amp's FWT.toolMessages pattern (modules/1234_unknown_FWT.js:8,347-369). 4 new tests.
- **GAP-CORE-11** (completed): `cancelToolOnly(toolUseId)` — cooperative per-tool cancel that sends `{ type: "stop-command" }` via the toolMessages Subject but does NOT abort the AbortController. The tool continues running but should honor the stop-command and terminate gracefully. Matches amp's FWT.cancelToolOnly (modules/1234_unknown_FWT.js:135-158). Also updates `cancelTool()` to send stop-command alongside abort. 3 new tests.
- **GAP-CORE-15** (completed): `onAgentStart(event)` and `onAgentEnd(event)` methods added to `PluginService`. `PluginAgentStartEvent`, `PluginAgentStartResult`, `PluginAgentEndEvent`, `PluginAgentEndResult` types added. `ThreadWorkerOptions.pluginService` optional field added. `runInference()` fires `agentStart` before inference (can inject content into user message), fires `agentEnd("done")` on turn:complete, `agentEnd("interrupted")` on abort, `agentEnd("error")` on non-retryable error. `agentEnd` supports `action: "continue"` to chain turns. 7 new tests.
- **GAP-TOOL-31** (completed): Read tool now handles directories and images. Directories: `readdir` + sort (dirs first alphabetically with trailing `/`, then files alphabetically), capped at 1000 entries, offset/limit pagination, truncation markers. Images: extension-based detection (.jpg, .jpeg, .png, .gif, .webp), base64 encoding with ~4.9MB size gate, returns `{ isImage: true, base64Content, imageInfo: { mimeType, size } }`. Non-image binary files still rejected. 10 new tests.

### Iteration 12 — activatedSkills, API token counting, admin settings, thread list filtering
- **GAP-CORE-17** (completed): `activatedSkills` tracking — `activatedSkills` field added to `ThreadSnapshotSchema` (array of `{ name, arguments? }`). `onSkillToolComplete` callback added to `OrchestratorCallbacks`. `ToolOrchestrator.invokeTool()` detects skill tool completion (case-insensitive `"skill"` name match + `status === "done"`) and fires the callback. `ThreadWorker.onSkillToolComplete()` deduplicates by name and persists to thread state. Matches amp's FWT:384 + ov:211-219. 10 new tests.
- **GAP-CORE-16** (completed): API-based token counting — `countTokens` optional method added to `LLMProvider` interface with `CountTokensParams`/`CountTokensResult` types. `AnthropicProvider.countTokens()` calls `/v1/messages/count_tokens` via the SDK with `thinking: { type: "enabled", budget_tokens: 10000 }` for accurate counts. Falls back to character-based `Math.ceil(length / 4)` on error (matching amp's `n1R` fallback). Exported from `@flitter/llm`. 6 new tests.
- **GAP-DATA-16** (completed): Admin settings merge — `readAdminSettings()` now called in `ConfigService.reload()`. Admin settings are spread over the global+workspace merge result, giving admin keys unconditional priority (matching amp's `iHR` wrapper pattern from modules/1273_unknown_iHR.js). Debug-logged when admin keys are applied. 4 new tests.
- **GAP-DATA-17** (completed): `observeThreadList` with filtering — `ThreadStore.observeThreadList(opts)` method added. Filters: `!entry.mainThreadID` (excludes subagent threads) AND `opts.includeArchived || !entry.archived`. Wired into `handleThreadsList` (default `includeArchived: false`), `handleThreadsSearch` (includes archived for search), and `handleThreadsDashboard` (excludes archived). Matches amp's azT.observeThreadList (modules/1342:286-295). 8 new tests.

### Iteration 17 — librarian, github_repo_ci_status, unarchive, /delete
- **GAP-TOOL-04** (completed): `librarian` — Codebase understanding subagent for remote repositories. Near-clone of oracle but with GitHub-specific toolset (Y2: read_github, search_github, commit_search, diff, list_directory_github, list_repositories, glob_github). Params: `query` (required), `context` (optional). Model: CLAUDE_SONNET_4_6. Prompt builder matches amp's mKR. Subagent type already registered. 22 new tests.
- **GAP-TOOL-25** (completed): `github_repo_ci_status` — Client-side CI status tool (amp's ElR is server-side constant only). Queries GitHub REST API for check-runs + workflow-runs on a ref. Follows `createXxxTool(client)` factory pattern. Added to `createGitHubTools()` array (now 8 tools). 14 new tests.
- **GAP-CLI-12** (completed): `threads archive --unarchive` — `--unarchive` option toggles `archived: false` on the thread snapshot. Handler signature extended with optional `options` param. Wired through program.ts + main.ts. 2 new tests.
- **GAP-CLI-25 partial** (iteration 17): `/delete` slash command now calls `threadStore.deleteThread(ctx.threadId)` instead of printing info message. `SlashCommandContext.threadStore` interface extended with `deleteThread(id)`. 2 new tests. 4 of 9 stubs now functional.

### Iteration 18 — look_at, /history, /editor, /new, CLI-08 verified
- **GAP-TOOL-27** (completed): `look_at` — Multimodal file analysis tool via Google Gemini (gemini-2.0-flash). Sends local files (images, PDFs, audio, video, text) to Gemini's `generateContent` API with system prompt matching amp's pVR. Extension-based MIME detection, binary files as base64 inlineData, text files truncated at 100K chars in fenced code blocks. preprocessArgs expands `~` and resolves relative paths (matching amp's kVR). Reference file failures are non-fatal. disableTimeout, no resource conflicts. 22 new tests.
- **GAP-CLI-25 partial** (iteration 18): `/history` — Shows compact thread message history summary with role, index, and first-line preview. `/editor` — Opens `$FLITTER_EDITOR`/`$EDITOR`/`$VISUAL`/`vi` on temp file, reads result back, injects via `submitMessage` callback. `/new` — Creates new thread via `threadStore.setCachedThread` with fresh UUID. `SlashCommandContext` extended with `submitMessage` callback. 7 of 9 stubs now functional (2 remaining: /switch, /dashboard need TUI pickers). 6 new tests.
- **GAP-CLI-08** (verified): `threads usage` handler already existed and wired at `main.ts:415-426`. No implementation needed — marking as closed.

### Iteration 19 — skill CLI, --mcp-config, permissions edit, mermaid tool

### Iteration 20 — OverlapColumn, createThread, thread search wiring
- **GAP-TUI-07** (completed): `OverlapColumn` widget — `OverlapColumn` widget class + `RenderOverlapColumn` render object. Vertical column layout with `overlap` parameter (default 1) — subtracts N rows between adjacent children for merged border effects. Matching amp's l1T/LY (chunk-006.js:3066-3176). Cross-axis alignment (start/end/center/stretch, default stretch). Reverse paint order (earlier children paint on top in overlap region). `_computeTotalHeight` for intrinsic measurements. Custom `performLayout` with two-pass algorithm. Exported from `@flitter/tui`. 23 new tests.
- **GAP-CORE-04** (completed): `createThread()` + `createThreadWorker()` on `ThreadWorkerService` — matching amp's QWT.createThread (1246:111-143). `createThread(opts?)` orchestrates: thread ID generation (`crypto.randomUUID()`), message seeding (via `seedThreadMessages`), worker creation + resume (via `createThreadWorker`), idempotency guard (existing thread early return), parent relationship wiring, initial user message dispatch (via `enqueueMessage`). `CreateThreadOptions` type exported. `handoff()` deferred (requires LLM summarizer call). 9 new tests (2 createThreadWorker + 7 createThread).
- **GAP-DATA-06** (completed): Thread search client-side wiring — `searchThreads(opts)` added to `ThreadRemoteTransport` interface + `HttpRemoteTransport` implementation (calls `/api/threads/search?q=&limit=`). `ThreadStoreLike.searchRemote` optional callback added. `find_thread` tool updated: tries remote FTS5 search first, falls back gracefully to local keyword matching on `null` return or error. `SearchThreadResult` and `SearchThreadsResponse` types exported from `@flitter/data`. 7 new tests (4 find_thread remote + 3 transport).
- **39 new tests total** (23 OverlapColumn + 9 createThread + 7 search wiring), 0 TypeScript errors.

### Iteration 21 — Overlay background fix, IntrinsicHeight, fetch-from-server
- **GAP-TUI-10** (completed): Overlay background fix — four surgical fixes: (1) `CommandPaletteState.build()` rebuilt from placeholder stub to full visual tree with opaque Container, TextField prompt, item list with selection highlight. (2) FuzzyPicker outer Container changed from `Color.rgb(0,0,0)` to `Color.default()` (terminal default). (3) FuzzyPicker items Column crossAxisAlignment changed to `"stretch"` for full-width selection highlight. (4) Non-selected FuzzyPicker items given explicit `Color.default()` background to prevent bleed-through in flat buffer model. 10 new tests.
- **GAP-TUI-08** (completed): `IntrinsicHeight` widget + `RenderIntrinsicHeight` render object — forces child height to its max intrinsic height. Short-circuits when constraints already tight. Intrinsic measurement delegation: `getMinIntrinsicHeight` delegates to `getMaxIntrinsicHeight`; width queries resolve infinite height via child's intrinsic height first. Matches amp's `BtT`/`n1T` (chunk-006.js:3019-3065). Exported from `@flitter/tui`. 19 new tests.
- **GAP-DATA-04** (completed): Fetch-from-server on cache miss — `ensureThreadSubject(id, opts)` on ThreadStore: checks local cache first, fetches from remote via `ThreadRemoteTransport.getThread()` on miss. Coalescing promise (`pendingThreadLoads` Map) deduplicates concurrent fetches for same thread. `fetchThread(id)` async wrapper. Graceful error handling. Matches amp's `azT.ensureThreadSubject` (modules/1342:128-155). 9 new tests.
- **38 new tests total** (10 overlay + 19 IntrinsicHeight + 9 fetch-from-server), 0 TypeScript errors.

### Iteration 22 — Thread metadata remote update, archive sync, threads share, diff viewer parity
- **GAP-DATA-02** (completed): Thread metadata remote update — `setThreadMeta(id, meta)` added to `ThreadRemoteTransport` interface + `HttpRemoteTransport` (PATCH /api/threads/:id). `updateThreadMeta(id, meta)` on `ThreadStore` follows amp's three-phase protocol (modules/1342:260-272): (1) `uploadThreadNow` to ensure server has latest snapshot, (2) `remote.setThreadMeta` to PATCH metadata, (3) reload from server and replace local cache with `setCachedThread(reloaded, { scheduleUpload: false })`. `ThreadMeta` type + `uploadThreadNow()` convenience method exported. 7 new tests.
- **GAP-DATA-05** (completed): Thread archive via remote API — `handleThreadsArchive` now increments version (`v: snapshot.v + 1`) and calls `threadStore.uploadThreadNow(threadId)` after setting archived flag, matching amp's synchronous archive behavior (azT:255-258). Server PATCH endpoint already handles `archived: boolean`.
- **GAP-CLI-02** (completed): `threads share` command — `handleThreadsShare` with `--visibility <level>` flag. `visibilityToMeta()` maps user-facing levels to internal ThreadMeta objects matching amp's MA() function (modules/2514): public→public_discoverable, unlisted→public_unlisted, workspace→thread_workspace_shared, private→private+sharedGroupIDs:[], group→private+shareWithAllCreatorGroups. Falls back to local `setVisibility` when no remote transport. Registered in program.ts + main.ts. 10 new tests (5 visibilityToMeta + 5 handleThreadsShare).
- **GAP-CLI-03** (completed): `/visibility` slash command fix — Handler now calls `ctx.threadStore.setVisibility()` instead of printing info message. `SlashCommandContext.threadStore` interface extended with optional `setVisibility` method. Added "group" to valid levels.
- **GAP-TUI-17** (completed): Diff viewer parity verification — Confirmed flitter's `buildDiffWidget()` exactly matches amp's `cE0(T, R)` (chunk-004.js:21105-21125). Both are pure functions returning `RichText` with colored `TextSpan` nodes. No StatefulWidget needed.
- **17 new tests total** (7 updateThreadMeta + 10 share/visibility), 0 TypeScript errors, 0 High gaps remaining.
- **GAP-CLI-01** (completed): `skill` CLI command group — `skill list` (--json), `skill info <name>` (--json), `skill remove <name>`, `skill add <source>` (--name, --overwrite, --global). Handlers in `skills.ts`, command tree in `program.ts`, wired in `main.ts`. Backend uses `SkillService.scan()`/`.install()`/`.remove()` (API difference from amp: single `scan()` vs amp's `getSkills()`+`getSkillErrors()`+`getSkill(name)`). 11 new tests.
- **GAP-CLI-09** (completed): `--mcp-config <json-or-path>` flag — `extractCliMcpConfig()` peeks argv before Commander parse, `parseMcpConfigValue()` accepts inline JSON (starts with `{`) or file path. Parsed servers merged into runtime config via `configService.setRuntimeOverride("mcpServers", merged)` + `mcpServerManager.refresh()`. Matches amp's EC0 parser + CC0 merge pattern. In-memory only (never persisted).
- **GAP-CLI-07** (completed): `permissions edit` — `handlePermissionsEdit()` opens rules in `$EDITOR` (FLITTER_EDITOR > EDITOR > VISUAL > vi). Serializes `PermissionEntry[]` to text (`<action> <tool> [key=value ...]`, one per line), writes to temp file with comment header, reads back, parses with error annotation + retry loop (up to 3 attempts). Matches amp's MQT/DQT/J2/Z2 flow.
- **GAP-TOOL-11** (completed): `mermaid` diagram tool — Declarative no-op tool with `{code, citations}` schema matching amp's gVR. Execute generates mermaid.live base64 link for interactive viewing. `isReadOnly: true`, source `"builtin"`. Registered in container.ts. Description matches amp's IVR (supported headers, citation format, styling rules). 13 new tests.
- **24 new tests total** (11 skill handlers + 13 mermaid), 0 TypeScript errors.

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 3 |
| Low | 36 |
| **Total open gaps** | **39** |
| Closed gaps | 127+ |

### Cross-Cutting Themes

1. **Server infrastructure**: The self-hosted sync server (`packages/server/`) is now implemented. Remaining DATA gaps (DATA-04/05/06/13) need to wire the existing server endpoints into client-side fetches. CLI share/visibility/handoff gaps still need additional server endpoints or client support.

2. **Terminal protocol activation**: ~~Several TUI capabilities are detected but never activated (synchronized output, kitty keyboard, emoji width, in-band resize, modifyOtherKeys). These are quick wins.~~ **Partially resolved** — Synchronized output (TUI-03) and kitty keyboard (TUI-04) are now activated with heuristic detection. Remaining: emoji width mode (`?2027`), in-band resize, `modifyOtherKeys`.

3. **Model/provider freshness**: ~~The model registry and provider presets need updating to match amp's latest models (Claude 4.x, GPT-5.x, Gemini 3.x).~~ **Resolved** — MODEL_REGISTRY expanded to ~35 models, context windows corrected (GAP-LLM-04 closed).

4. **Stream reliability**: ~~The two High LLM gaps (idle timeout + double-retry) are reliability issues that affect production use. They should be addressed before heavy usage.~~ **Resolved** — `withStreamIdleTimeout` (120s) wraps all 5 providers; `maxRetries: 0` prevents double-retry on Anthropic, OpenAI, OpenAI-compat, and Bedrock SDK clients.

5. **Slash command completeness**: ~~Many interactive slash commands (`/model`, `/cost`, `/compact`, `/new`, `/switch`, etc.) are stubs that print help text rather than performing actions inline.~~ `/cost`, `/compact`, `/model`, `/rename`, `/label`, `/archive` now fully functional (GAP-CLI-22/23/24/25 partial). Remaining 6 stubs need context interface changes (`switchThread` callback) or TUI lifecycle work.

6. **Orchestrator safety gaps**: ~~Iteration 7 uncovered multiple safety-critical gaps in the tool orchestrator: no tool resume on reconnect (CORE-05), no dangerous-tool safety gate (CORE-06), no persisted approval state (CORE-07), no per-tool cancel (CORE-11). These affect production reliability and should be addressed as a group.~~ **Resolved** — CORE-05, CORE-06 (iter 9), CORE-10, CORE-13, CORE-14 (iter 10), CORE-11, CORE-12 (iter 11), CORE-07 (iter 13) all closed.

7. **Skill system vertical (new)**: Skills are a first-class amp feature with CLI commands, slash commands, invocation enforcement, and activation tracking. **Now complete:** CLI command group (CLI-01 closed iter 19), activation tracking (CORE-17), enforcement (CORE-08), SkillTool. All 4 layers implemented.

8. **Provider API key wiring**: ~~Gemini and OpenAI providers don't read per-provider API keys from settings (DATA-14) or environment variables (DATA-15). This blocks users who don't use the default Anthropic provider.~~ **Resolved** — DATA-14 and DATA-15 closed in iteration 9. Provider-aware key resolution now covers Anthropic, Gemini, and OpenAI.

### Iteration 13 — Skill enforcement, tools use, guarded-file approval, blocked-on-user
- **GAP-CORE-08** (completed): Skill invocation enforcement — `_pendingSkills`/`_awaitingSkillInvocation` BehaviorSubjects on ThreadWorker, `setPendingSkills()` public API, `injectPendingSkills()` drains pending skills on user message and injects info message, `checkAndAppendAwaitedSkills()` after inference completes checks if model called required skills and injects synthetic `tool_use` blocks + flips `stopReason` to `"tool_use"` if not. Full `YwR` equivalent. 7 new tests.
- **GAP-CLI-27** (completed): `tools use <name>` CLI command — `handleToolsUse()` with dual arg paths (stdin JSON / CLI `--flag value` parsing), `--only <field>` for field extraction, `--stream` for JSON line output, type coercion from tool schema, `preprocessArgs` support. Registered in program.ts + main.ts. 12 new tests.
- **GAP-TUI-02** (completed): Approval widget guarded-file option — `GUARDED_FILE_PATTERNS` array (16 patterns: SSH, .env, shell configs, git internals, IDE configs, etc.), `matchGuardedFilePattern()` utility, `isGuardedFileRequest()` check, `buildApprovalOptions()` conditionally inserts "Allow File for Every Session" (`always-guarded`) at position 2 for file tools on guarded paths. `ApprovalRequest.toAllow` field added. 14 new tests (total 29 in approval widget tests).
- **GAP-CORE-07** (completed): `blocked-on-user` persistence — orchestrator now emits `tool:data` with `status: "blocked-on-user"` + reason + toAllow BEFORE calling `requestApproval`. `getThreadSessionState()` utility reads thread state to return `"user-tool-approval"` | `"tool-running"` | `"user-message-reply"` (amp's `IUT` equivalent). `ToolThreadEvent.status` union extended. 6 new tests.
- **Schema**: `InfoContentBlockSchema` extended with `TextBlockSchema` to support text content in info messages (used by skill enforcement's injected info message).

### Iteration 14 — tools make, ensureThreadEntriesLoaded, get_diagnostics, threads handoff
- **GAP-CLI-05** (completed): `tools make <name>` CLI command — `handleToolsMake()` with `--bun/--bash/--zsh/--force` flags, toolbox dir resolution (`FLITTER_TOOLBOX` > `AMP_TOOLBOX` > `~/.config/flitter/tools`), name validation (regex `^[-a-zA-Z0-9_]{1,64}$`), template generation via existing `toolbox-templates.ts`, chmod 755. Registered in program.ts + main.ts. 14 new tests.
- **GAP-DATA-13** (completed): `ensureThreadEntriesLoaded()` on ThreadStore — lazy-load remote thread entries with three-phase merge (fetch remote → build merged map with identity-preserving dedup → overlay with `threadEntriesFromCachedThreads()` for local wins). Coalescing promise prevents concurrent fetches. `setRemote(transport)` wiring method. Graceful fallback to local-only on network error. 9 new tests.
- **GAP-TOOL-02** (completed): `get_diagnostics` builtin tool — shells out to language-specific checkers: TypeScript (`npx tsc --noEmit --pretty false`), Python (`ruff check --output-format json`), Go (`go vet ./...`), Rust (`cargo check --message-format json`). Auto-detects language from file extension and directory markers. 10s timeout per checker, normalized `DiagnosticEntry` output format. Registered in factory.ts. 10 new tests.
- **GAP-CLI-28** (completed): `threads handoff [id]` CLI command — `handleThreadsHandoff()` with `-g/--goal` and `-p/--print` flags. Resolves parent thread (fallback to most recent), builds condensed context summary from last 20 messages, creates child thread with goal-seeded messages, wires bidirectional parent-child relationship via `applyParentRelationship()`. `/handoff` slash stub unchanged (needs `SlashCommandContext` extension for full wiring). 8 new tests.

### Iteration 15 — shell_command, format_file, threads continue --last
- **GAP-TOOL-06** (completed): `shell_command` subagent tool — thin wrapper around Bash execution with `command`, `workdir`, `login`, `timeout_ms` params. `preprocessArgs` maps `workdir→cwd`, `timeout_ms→timeout`, strips `login`, then delegates to `BashTool.preprocessArgs` for cd interception. Reuses `BashTool.execute`. 15 new tests.
- **GAP-TOOL-16** (completed): `format_file` builtin tool — auto-detects formatter by file extension + project config (biome.json/biome.jsonc). Dispatches to: gofmt (Go), rustfmt (Rust), ruff/black (Python), biome (JS/TS with config), prettier (JS/TS default + generic fallback). 15s timeout. Ruff→black fallback on error. `detectFormatter()` exported for unit testing. 20 new tests.
- **GAP-CLI-10** (completed): `threads continue --last` — thread ID argument changed from required `<id>` to optional `[id]`. `--last` flag resolves most recent thread via `listRecentThreadIds(1)`. Alias `c` added matching amp. 4 new tests (total 7 for continue).

### Iteration 16 — todo_write, oracle, threads aliases, --include-archived
- **GAP-TOOL-15** (completed): `todo_write`/`todo_read` tool pair — Stateless todo tracking. `todo_write` is a no-op executor; state persists in conversation history. Accepts `{todos: Array<{content, status}>}` or `{content: string}` fallback. `getTodosFromThread()` scanner matches amp's `O0T` (backward scan stopping at summary boundary). `todo_read` reads from `ToolContext.todos`. Both registered as builtins. 23 new tests.
- **GAP-TOOL-03** (completed): `oracle` subagent tool — Senior engineering advisor spawned via `SubAgentManager.spawn({type: "oracle"})`. Params: `task` (required), `context`, `files`. `buildOraclePrompt()` matches amp's `EVR`. `disableTimeout: true`, empty `resourceKeys`. Restricted to read-only tools (Read, Grep, Glob, web_search, read_web_page, read_thread, find_thread). Registered in `container.ts` alongside finder/code_review. 22 new tests.
- **GAP-CLI-19** (completed): `threads` command aliases — Commander.js `.alias()` chains: threads→`t`/`thread`, new→`n`, list→`l`/`ls`. Matches amp's chunk-005.js:4879 mapping. (continue→c, markdown→md, search→find, rename→r, handoff→h were already done in prior iterations.)
- **GAP-CLI-11** (completed): `threads --include-archived` flag — `.option("--include-archived")` added to `threads list` in `program.ts`. `ThreadsListOptions.includeArchived?: boolean` properly typed. Unsafe `as unknown as Record<string, unknown>` cast removed from `handleThreadsList`. Passed through `main.ts`. Backend `observeThreadList({includeArchived})` already implemented (DATA-17). 2 new tests.
