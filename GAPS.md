# Flitter vs Amp — Gap Analysis

> **Last updated:** 2026-04-21 (iteration 6)
> **Method:** Automated parallel analysis of `amp-cli-reversed/` modules against `packages/` source, cross-referenced with existing plan docs in `docs/superpowers/plans/`.

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
| GAP-CLI-01 | CLI | **`skill` / `skills` command group** | Amp has `skill add`, `skill list`, `skill remove`, `skill info` (alias `skills`). Flitter has the agent-callable Skill tool (`skill-tool.ts`) but no CLI command group (`skill add/list/remove/info`) to manage skills from the terminal. Partially addressed. |
| GAP-TUI-01 | TUI | **Image display (Kitty Graphics)** | Amp has a full `ImageWidget` with Kitty APC protocol transmission, format conversion (JPEG/GIF→PNG), chunked transmission, lifecycle management. Flitter has no image widget. Plan: `2026-04-19-image-display.md`. |
| GAP-TUI-02 | TUI | **Approval widget (5 options)** | Amp has 5-option approval flow (approve, allow-session, allow-persistent, deny-with-feedback, guarded-file). Flitter has 4 options (approve, allow-session, allow-persistent, deny-with-feedback) — missing the guarded-file deny option. Plan: `2026-04-19-approval-widget.md`. |
| GAP-DATA-02 | Data | **Thread metadata remote update** | Amp's `updateThreadMeta` calls `remote.setThreadMeta()` then reloads from server. Flitter only updates in-memory + marks dirty for local persistence. |

---

## Medium Gaps

### CLI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-CLI-02 | `threads share <id>` | Amp has `threads share` with `--visibility` and `--support [message]` for sharing with support. |
| GAP-CLI-03 | `threads visibility [level]` | Show/set default thread visibility for a repo. |
| GAP-CLI-04 | `threads handoff [id]` | Create handoff threads from existing threads (alias `h`) with `--goal` and `--print`. |
| GAP-CLI-05 | `tools make <name>` | Scaffold toolbox scripts (`--bun`, `--zsh`, `--bash`, `--force`). Templates exist in `toolbox-templates.ts` but no CLI command. |
| GAP-CLI-06 | `tools use <name>` | Invoke tools directly from CLI with `--only <field>` and `--stream`. |
| GAP-CLI-07 | `permissions edit` | Open permissions in `$EDITOR` with retry loop. |
| GAP-CLI-08 | `usage` (top-level) | Top-level command showing credit balance/account usage. |
| GAP-CLI-09 | `--mcp-config <json>` | Inline MCP server config JSON via CLI flag. |
| GAP-CLI-25 | 6 slash commands are informational-only | `/new`, `/switch`, `/dashboard`, `/delete`, `/editor`, `/history` print "use `flitter threads X` from CLI" instead of performing the action inline. (`/rename`, `/label`, `/archive` now functional.) |

### Tools

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TOOL-02 | `get_diagnostics` | LSP diagnostics (errors/warnings) for a file or directory. |
| GAP-TOOL-03 | `oracle` | Internal reasoning/planning tool. |
| GAP-TOOL-04 | `librarian` | Code/doc search orchestrator — meta-search above finder/grep. |
| GAP-TOOL-06 | `shell_command` (subagent) | Alternate Bash tool for subagents with `workdir`/`login`/`timeout_ms` params. |

### TUI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TUI-05 | **Terminal RGB color query** | Amp's QueryParser probes terminal for actual RGB palette and dynamically updates theme colors. Flitter has no query parser. |
| GAP-TUI-07 | **OverlapColumn widget** | Column that overlaps children by N rows for merged borders between adjacent containers. |
| GAP-TUI-08 | **IntrinsicHeight widget** | Wraps child and forces height to equal its intrinsic height. |
| GAP-TUI-10 | **Overlay background fix** | Overlays bleed through underlying content. Plan: `2026-04-19-overlay-background-fix.md`. |

### LLM

| ID | Feature | Description |
|----|---------|-------------|
| GAP-LLM-05 | Request-level telemetry headers | Amp sends `x-amp-feature`, `x-amp-thread-id`, `x-amp-mode` etc. via proxy server. These are proxy-specific — direct API impact is nil. Low priority for self-hosted. |

### Data

| ID | Feature | Description |
|----|---------|-------------|
| GAP-DATA-04 | Fetch-from-server on cache miss | Amp fetches threads from server when not in local cache, with dedup. Flitter returns null. |
| GAP-DATA-05 | Thread archive via remote API | Amp uploads archive state to server. Flitter archives locally only. |
| GAP-DATA-06 | Thread search (client-side wiring) | Server-side FTS5 endpoint exists at `/api/threads/search`. `HttpRemoteTransport` lacks `searchThreads()` — CLI and `find_thread` tool use local substring matching only. |

### Agent-Core

| ID | Feature | Description |
|----|---------|-------------|
| GAP-CORE-04 | ThreadWorkerService missing `handoff`/`createThread` | Amp's `QWT.handoff()` and `createThread()` not implemented. (`seedThreadMessages` and `applyParentRelationship` now implemented; `handoff` requires `b4R` summarizer LLM call.) |

---

## Low Gaps

### CLI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-CLI-10 | `threads continue --last` | Continue most recent thread without a picker. |
| GAP-CLI-11 | `threads --include-archived` | Filter flag for `threads list`. |
| GAP-CLI-12 | `threads archive --unarchive` | Restore archived threads. |
| GAP-CLI-13 | `--visibility` (top-level) | Thread creation visibility flag. |
| GAP-CLI-14 | `--remote` flag | Server-side async agent execution. Requires server infrastructure. |
| GAP-CLI-15 | `--notifications` | Sound notification toggle. |
| GAP-CLI-16 | `--settings-file <path>` | Override settings file path. |
| GAP-CLI-17 | `--log-level` / `--log-file` | Explicit log control flags (flitter only has `--verbose`). |
| GAP-CLI-18 | `mcp oauth status` | OAuth status check for MCP servers. |
| GAP-CLI-19 | `threads` aliases | Short aliases: `t`, `n`, `c`, `l`, `f`, `h`, `s`, `v`. |
| GAP-CLI-20 | `install` (hidden) | Install ripgrep to `$AMP_HOME/bin`. |
| GAP-CLI-21 | `--jetbrains` / `--ide` flags | IDE integration toggles. |

### Tools

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TOOL-11 | `mermaid` | Mermaid diagram generation. |
| GAP-TOOL-12 | `chart` | Chart generation from JSON data. |
| GAP-TOOL-13 | `walkthrough` / `walkthrough_diagram` | Guided code walkthroughs. |
| GAP-TOOL-14 | `code_tour` | Guided code tour sub-agent. |
| GAP-TOOL-15 | `todo_write` | Write TODO annotations. |
| GAP-TOOL-16 | `format_file` | Format file using configured formatter. |
| GAP-TOOL-17 | `look_at` | IDE-specific code navigation. |
| GAP-TOOL-18 | `painter` | Image/diagram generation. |
| GAP-TOOL-19 | `repl` | Interactive REPL tool. |
| GAP-TOOL-20 | `docs_list/read/write` | Documentation management (server-side). |
| GAP-TOOL-21 | `handoff` | Transfer conversation to another thread. Server-dependent. |
| GAP-TOOL-22 | Thread lifecycle tools | `create_thread`, `archive_thread`, `unarchive_thread`. Server-dependent. |
| GAP-TOOL-23 | Inter-thread messaging | `send_message_to_thread`, `send_message_to_aggman`. Server-dependent. |
| GAP-TOOL-24 | Slack tools | `slack_write`, `slack_read`. Server-dependent. |
| GAP-TOOL-25 | `github_repo_ci_status` | GitHub CI status check. |
| GAP-TOOL-26 | Bitbucket Enterprise tools | 7 enterprise Bitbucket integration tools. |

### TUI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TUI-11 | Emoji width mode (`?2027`) | Detected but not enabled. |
| GAP-TUI-12 | In-band resize | Amp uses in-band resize notification; flitter uses SIGWINCH only. |
| GAP-TUI-13 | `modifyOtherKeys` | Enhanced key disambiguation mode. |
| GAP-TUI-15 | Ghostty progress bar | Terminal-specific progress integration. |
| GAP-TUI-16 | Custom theme TOML loading | File-based custom theme loading. Plan: `2026-04-19-gap8-theme-system.md`. |
| GAP-TUI-17 | Diff viewer as full widget | `buildDiffWidget()` exists as function, not a proper stateful widget. |

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
- **GAP-CLI-25 partial**: `/rename`, `/label`, `/archive` slash commands wired to mutate thread state via `threadStore.setCachedThread()` instead of printing info messages. 3 of 9 stubs now functional.

### Tools (from iteration 6)
- **GAP-TOOL-05**: `restore_snapshot` tool spec — wraps existing `auto-snapshot.ts` `restoreSnapshot()` function. Input: `{ path, treeOID }`. Added `restorePath` parameter to support file/directory-level restore (not just full workspace). Registered as static builtin.

### Agent-Core (from iteration 6)
- **GAP-CORE-04 partial**: `ThreadRelationshipSchema` extended with `role` ("child"/"parent") and `createdAt` fields. `ThreadWorkerService` gained `seedThreadMessages()` (atomic message seeding via `exclusiveSyncReadWriter`) and `applyParentRelationship()` (bidirectional child-parent relationship wiring with dedup). `handoff()` and `createThread()` deferred.

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 4 |
| Medium | 22 |
| Low | 43 |
| **Total open gaps** | **69** |
| Closed gaps | 70+ |

### Cross-Cutting Themes

1. **Server infrastructure**: The self-hosted sync server (`packages/server/`) is now implemented. Remaining DATA gaps (DATA-04/05/06) need to wire the existing server endpoints into client-side fetches. CLI share/visibility/handoff gaps still need additional server endpoints or client support.

2. **Terminal protocol activation**: ~~Several TUI capabilities are detected but never activated (synchronized output, kitty keyboard, emoji width, in-band resize, modifyOtherKeys). These are quick wins.~~ **Partially resolved** — Synchronized output (TUI-03) and kitty keyboard (TUI-04) are now activated with heuristic detection. Remaining: emoji width mode (`?2027`), in-band resize, `modifyOtherKeys`.

3. **Model/provider freshness**: ~~The model registry and provider presets need updating to match amp's latest models (Claude 4.x, GPT-5.x, Gemini 3.x).~~ **Resolved** — MODEL_REGISTRY expanded to ~35 models, context windows corrected (GAP-LLM-04 closed).

4. **Stream reliability**: ~~The two High LLM gaps (idle timeout + double-retry) are reliability issues that affect production use. They should be addressed before heavy usage.~~ **Resolved** — `withStreamIdleTimeout` (120s) wraps all 5 providers; `maxRetries: 0` prevents double-retry on Anthropic, OpenAI, OpenAI-compat, and Bedrock SDK clients.

5. **Slash command completeness**: ~~Many interactive slash commands (`/model`, `/cost`, `/compact`, `/new`, `/switch`, etc.) are stubs that print help text rather than performing actions inline.~~ `/cost`, `/compact`, `/model`, `/rename`, `/label`, `/archive` now fully functional (GAP-CLI-22/23/24/25 partial). Remaining 6 stubs need context interface changes (`switchThread` callback) or TUI lifecycle work.
