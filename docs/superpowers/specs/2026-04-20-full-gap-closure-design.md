# Full Gap Closure Plan: flitter → amp Parity

**Date:** 2026-04-20
**Status:** Design approved
**Approach:** Foundation First — Critical/High cross-domain sprint, then domain-by-domain phases
**Baseline:** master @ `a708123`
**Source:** `GAPS.md` iteration 2 (93 open gaps — GAPS.md summary says 70 but actual ID count is 93)

---

## 1. Context

Flitter is a reverse-engineering of amp-cli. After 940+ commits, ~40 gaps have been closed. This spec covers the **remaining 93 open gaps** organized into 7 execution phases.

> **Note:** GAPS.md's summary table claims 70 gaps (Medium 29, Low 32), but the actual ID count in the body tables is 93 (Medium 39, Low 45). This spec uses the ground-truth ID count.

### 1.1 Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Goal | Full parity — close all 93 gaps | No selective pruning |
| Server-dependent gaps | Stub implementations | Match API surface with local-only backing; drop-in replaceable when real server exists |
| Phase structure | Domain-based (5-8 phases) | Clean mental model, one domain per phase |
| Prioritization | Critical/High first, then domains | Fix reliability issues before feature breadth |

### 1.2 Cross-Cutting Rules (from CLAUDE.md)

1. Every implementation cross-references `amp-cli-reversed/`
2. Integration verification before declaring completion
3. Every failure signal must be investigated and resolved
4. GAPS.md updated as gaps close (move to "Closed Gaps" section)
5. HEALTH.md updated after code changes

---

## 2. Phase Overview

| Phase | Domain | Gap Count | Est. Sessions | Dependencies |
|-------|--------|-----------|---------------|--------------|
| 1 | Critical + High (cross-domain) | 9 | 3-4 | None |
| 2 | LLM (Medium + Low) | 8 | 2 | Phase 1 (stream fixes) |
| 3 | Agent-Core (Medium) | 1 | 1 | Phase 1 (plugin wiring) |
| 4 | Tools (Medium + Low) | 25 | 4 | Phase 2 (LLM stable), Phase 3 (core stable) |
| 5 | TUI (Medium + Low) | 15 | 4 | Phase 1 (image widget) |
| 6 | CLI (Medium + Low) | 25 | 4-5 | Phase 4 (tools exist), Phase 5 (TUI renders) |
| 7 | Data (Medium + Low) | 10 | 3 | Phase 1 (transport stubs) |
| **Total** | | **93** | **~21-24** | |

```
Phase 1 (Critical/High) ─────┐
                              ├──▶ Phase 2 (LLM)
                              │         │
                              │         ▼
                              ├──▶ Phase 3 (Agent-Core)
                              │         │
                              │         ▼
                              ├──▶ Phase 4 (Tools)
                              │         │
                              │         ▼
                              ├──▶ Phase 5 (TUI)
                              │         │
                              │         ▼
                              ├──▶ Phase 6 (CLI)
                              │         │
                              │         ▼
                              └──▶ Phase 7 (Data)
```

---

## 3. Phase 1: Critical + High Gaps (Cross-Domain)

**Goal:** Fix production reliability issues and unblock core capabilities.

### 3.1 Gaps

| Gap ID | Domain | What to Build | Package | Complexity |
|--------|--------|---------------|---------|------------|
| GAP-TOOL-01 | Tools | `apply_patch` tool — Codex-format multi-file patches (add/update/delete/move via unified diff) | `agent-core` | High |
| GAP-LLM-01 | LLM | Stream idle timeout wrapper (120s idle → `StreamIdleTimeout`, log gaps >30s) | `llm` | Medium |
| GAP-LLM-02 | LLM | Set `maxRetries: 0` on Anthropic SDK stream calls | `llm` | Low |
| GAP-CORE-01 | Core | Wire PluginService into `container.ts` | `flitter` | Medium |
| GAP-TUI-01 | TUI | Image widget — Kitty Graphics Protocol (APC transmission, format conversion, chunked sending) | `tui` | High |
| GAP-TUI-02 | TUI | 5th approval option: "guarded-file deny" | `tui` + `agent-core` | Medium |
| GAP-DATA-01 | Data | ThreadRemoteTransport stub (full interface, local storage) | `data` | Medium |
| GAP-DATA-02 | Data | Thread metadata remote update (calls stub transport, reloads) | `data` | Low |
| GAP-CLI-01 | CLI | `skill` command group: `skill add/list/remove/info` | `cli` | Medium |

### 3.2 Implementation Notes

- **GAP-TOOL-01 (apply_patch):** Most complex item. Amp's patch format supports file creation, modification (unified diff hunks), deletion, and moves. Parse patch text, validate paths, apply hunks with fuzz matching, report results. ~300-400 lines core logic. Reference: search `amp-cli-reversed/` for patch application logic.
- **GAP-LLM-01:** Wrap existing stream with a timer that resets on each chunk. On 120s idle → throw `StreamIdleTimeout`. Log any gap >30s.
- **GAP-LLM-02:** One-liner — add `maxRetries: 0` to Anthropic SDK call options.
- **GAP-CORE-01:** Wiring only — PluginService exists, instantiate in `createContainer()`, add to disposal chain, connect to ToolRegistry.
- **GAP-DATA-01/02:** Implement `ThreadRemoteTransport` interface with local file backing. Same method signatures as real server API.

### 3.3 Session Grouping

- Session 1A: GAP-TOOL-01 (apply_patch — standalone, high complexity)
- Session 1B: GAP-LLM-01, GAP-LLM-02, GAP-CORE-01 (reliability + wiring)
- Session 1C: GAP-TUI-01, GAP-TUI-02 (image display + approval widget)
- Session 1D: GAP-DATA-01, GAP-DATA-02, GAP-CLI-01 (transport stubs + skill CLI)

### 3.4 Exit Criteria

- `apply_patch` can create, modify, delete, and move files via patch text
- A stalled LLM stream throws `StreamIdleTimeout` after 120s
- No double-retry observed (SDK retries = 0, RetryScheduler handles all)
- PluginService instantiated and discoverable in container
- Image renders in Kitty-compatible terminal
- Approval widget shows 5 options
- Thread operations go through remote transport interface (backed by local files)
- `flitter skill list` shows installed skills

---

## 4. Phase 2: LLM Domain (Medium + Low)

**Goal:** Complete provider coverage and robustness.

### 4.1 Gaps

| Gap ID | Severity | What to Build | Complexity |
|--------|----------|---------------|------------|
| GAP-LLM-03 | Medium | Add fireworks, baseten, moonshotai provider presets to `KNOWN_COMPAT_CONFIGS` | Low |
| GAP-LLM-04 | Medium | Update model registry — latest IDs, correct context windows (1M for Claude) | Low |
| GAP-LLM-05 | Medium | Request-level telemetry headers on every API call | Medium |
| GAP-LLM-06 | Medium | `prompt_cache_key: threadId` auto-sent on OpenAI calls | Low |
| GAP-LLM-07 | Medium | `InvalidModelOutputError` retryable in `ModelFallbackChain` | Low |
| GAP-LLM-08 | Low | `service_tier` for OpenAI — auto-compute from agent mode | Low |
| GAP-LLM-09 | Low | `cacheTTL` in pricing model — track 5-minute TTL | Low |
| GAP-LLM-10 | Low | Context-limit → Gemini fallback via `ModelFallbackChain` | Medium |

### 4.2 Session Grouping

- Session 2A: GAP-LLM-03, 04, 06, 07, 08, 09 (config/registry/one-liners)
- Session 2B: GAP-LLM-05, 10 (telemetry headers + context fallback)

### 4.3 Exit Criteria

- `fireworks`, `baseten`, `moonshotai` appear as valid provider names
- Model registry includes latest Claude/GPT/Gemini IDs with correct context windows
- API calls include telemetry headers (verify via debug logging)
- OpenAI calls include `prompt_cache_key`
- `InvalidModelOutputError` triggers fallback (not just retry)
- Context overflow triggers Gemini fallback attempt

---

## 5. Phase 3: Agent-Core Domain

**Goal:** Complete compaction pinning.

### 5.1 Gaps

| Gap ID | Severity | What to Build | Complexity |
|--------|----------|---------------|------------|
| GAP-CORE-02 | Medium | Complete compaction pinning — preserve system prompts, recent user message, `cache_control` messages, current-turn tool results | Medium |

### 5.2 Implementation Notes

- Cross-reference amp's compaction logic in `1244_ThreadWorker_ov.js`
- Verify pinning categories: system prompt blocks, most recent user message, messages with `cache_control`, tool results from current turn
- Expose `checkAndCompact` for Phase 6's `/compact` slash command (GAP-CLI-24)

### 5.3 Exit Criteria

- Conversation exceeding context window triggers compaction
- After compaction: system prompt, recent messages, and pinned blocks survive
- Behavior matches amp's compaction (verified against reference source)

---

## 6. Phase 4: Tools Domain (Medium + Low)

**Goal:** Add missing builtin tools and parameter improvements.

### 6.1 Gaps

| Gap ID | Severity | What to Build | Complexity |
|--------|----------|---------------|------------|
| GAP-TOOL-02 | Medium | `get_diagnostics` — LSP diagnostics or `tsc`/linter fallback | High |
| GAP-TOOL-03 | Medium | `oracle` — internal reasoning/planning tool (no side effects) | Medium |
| GAP-TOOL-04 | Medium | `librarian` — meta-search orchestrator above finder/grep | Medium |
| GAP-TOOL-05 | Medium | `restore_snapshot` — wrap `auto-snapshot.ts` as tool spec | Low |
| GAP-TOOL-06 | Medium | `shell_command` — subagent Bash variant with `workdir`/`login`/`timeout_ms` | Medium |
| GAP-TOOL-07 | Medium | Bash `cwd` parameter — per-command working directory | Low |
| GAP-TOOL-08 | Medium | Grep `literal` parameter — explicit non-regex flag | Low |
| GAP-TOOL-09 | Medium | `read_web_page` `forceRefetch` — bypass cache | Low |
| GAP-TOOL-10 | Medium | Parameter name aliases — amp-compatible names as aliases | Medium |
| GAP-TOOL-11 | Low | `mermaid` — diagram generation | Medium |
| GAP-TOOL-12 | Low | `chart` — chart generation from JSON | Medium |
| GAP-TOOL-13 | Low | `walkthrough` / `walkthrough_diagram` | Medium |
| GAP-TOOL-14 | Low | `code_tour` — guided code tour sub-agent | Medium |
| GAP-TOOL-15 | Low | `todo_write` — write TODO annotations | Low |
| GAP-TOOL-16 | Low | `format_file` — formatter subprocess | Low |
| GAP-TOOL-17 | Low | `look_at` — IDE code navigation | Low |
| GAP-TOOL-18 | Low | `painter` — image/diagram generation | Medium |
| GAP-TOOL-19 | Low | `repl` — persistent REPL subprocess | Medium |
| GAP-TOOL-20 | Low | `docs_list/read/write` — doc management (local stub) | Low |
| GAP-TOOL-21 | Low | `handoff` — thread transfer (local stub) | Low |
| GAP-TOOL-22 | Low | Thread lifecycle tools — create/archive/unarchive (local stubs) | Low |
| GAP-TOOL-23 | Low | Inter-thread messaging (local stubs) | Low |
| GAP-TOOL-24 | Low | Slack tools (local stubs) | Low |
| GAP-TOOL-25 | Low | `github_repo_ci_status` — CI check via `gh` | Low |
| GAP-TOOL-26 | Low | Bitbucket Enterprise tools (stubs) | Low |

### 6.2 Implementation Approach

- **Medium tools (02-10):** Real implementations with tool spec registered in `ToolRegistry`
- **Low tools — real logic:** `format_file`, `todo_write`, `github_repo_ci_status`, `repl`, `mermaid`, `chart`
- **Low tools — stubs:** `handoff`, thread lifecycle, inter-thread messaging, Slack, Bitbucket — implement tool spec/schema, return "not connected" or local-only equivalent
- **Parameter aliases (TOOL-10):** Add `paramAliases` map to tool definitions mapping amp names to flitter names

### 6.3 Session Grouping

- Session 4A: TOOL-07, 08, 09, 10 (parameter enhancements to existing tools)
- Session 4B: TOOL-02, 03, 04, 05, 06 (new Medium tools)
- Session 4C: TOOL-11 through 19 (new Low tools with real logic)
- Session 4D: TOOL-20 through 26 (stub tools)

### 6.4 Exit Criteria

- Each tool is invocable by the model and returns structured results
- Parameter aliases resolve correctly (e.g., `cmd` → `command` for Bash)
- Stub tools return meaningful "not connected" messages with correct schemas
- `get_diagnostics` returns real diagnostics for TypeScript files

---

## 7. Phase 5: TUI Domain (Medium + Low)

**Goal:** Complete terminal protocol support and add missing widgets.

### 7.1 Gaps

| Gap ID | Severity | What to Build | Complexity |
|--------|----------|---------------|------------|
| GAP-TUI-03 | Medium | Synchronized output mode (`?2026`) — emit enable/disable sequences | Low |
| GAP-TUI-04 | Medium | Kitty keyboard protocol — enable/disable enhanced keyboard | Low |
| GAP-TUI-05 | Medium | Terminal RGB color query — OSC 4/10/11 probe + dynamic theme update | High |
| GAP-TUI-06 | Medium | Hyperlink rendering (OSC 8) — emit sequences from `TextSpan.url` | Medium |
| GAP-TUI-07 | Medium | `OverlapColumn` widget — overlapping children for merged borders | Medium |
| GAP-TUI-08 | Medium | `IntrinsicHeight` widget — force child to intrinsic height | Low |
| GAP-TUI-09 | Medium | Animated spinner integration — wire BrailleSpinner 200ms timer | Low |
| GAP-TUI-10 | Medium | Overlay background fix — prevent bleed-through | Medium |
| GAP-TUI-11 | Low | Emoji width mode (`?2027`) | Low |
| GAP-TUI-12 | Low | In-band resize (mode 2048) | Low |
| GAP-TUI-13 | Low | `modifyOtherKeys` — enhanced key disambiguation | Low |
| GAP-TUI-14 | Low | Cursor shape control — block/underline/bar | Low |
| GAP-TUI-15 | Low | Ghostty progress bar — terminal-specific integration | Low |
| GAP-TUI-16 | Low | Custom theme TOML loading | Medium |
| GAP-TUI-17 | Low | Diff viewer as stateful widget (promote from function) | Medium |

### 7.2 Implementation Approach

- **Terminal protocol gaps (03, 04, 11, 12, 13, 14, 15):** Quick wins — capability detection exists, just emit activation sequences at terminal attach/detach. Modify `AnsiRenderer` or `TerminalBackend`.
- **Widget gaps (07, 08, 09, 10, 17):** Self-contained layout/rendering additions following existing widget pattern (`performLayout` → `performPaint`).
- **GAP-TUI-05 (RGB query):** Most complex — async query/response protocol. Emit OSC query, parse response from stdin, update theme. Reference amp's `QueryParser`.
- **GAP-TUI-06 (OSC 8):** Wrap cell output in `\e]8;;url\e\\text\e]8;;\e\\` when URL set.

### 7.3 Session Grouping

- Session 5A: TUI-03, 04, 11, 12, 13, 14, 15 (terminal protocol activations — all same pattern)
- Session 5B: TUI-05, 06 (query/response + hyperlinks — renderer changes)
- Session 5C: TUI-07, 08, 09, 10, 17 (widgets)
- Session 5D: TUI-16 (TOML theme loading)

### 7.4 Exit Criteria

- Synchronized output enabled on terminals that support it (no tearing on fast updates)
- Kitty keyboard protocol active on Kitty/compatible terminals
- `TextSpan` with `.url` renders as clickable hyperlink
- BrailleSpinner animates in conversation view during loading
- Overlays render with opaque backgrounds
- Custom `.toml` theme file loads and applies

---

## 8. Phase 6: CLI Domain (Medium + Low)

**Goal:** Fill in missing commands, slash command implementations, and flags.

### 8.1 Gaps

| Gap ID | Severity | What to Build | Complexity |
|--------|----------|---------------|------------|
| GAP-CLI-02 | Medium | `threads share <id>` with `--visibility`, `--support` | Medium |
| GAP-CLI-03 | Medium | `threads visibility [level]` | Low |
| GAP-CLI-04 | Medium | `threads handoff [id]` with `--goal`, `--print` (alias `h`) | Medium |
| GAP-CLI-05 | Medium | `tools make <name>` — scaffold toolbox scripts | Low |
| GAP-CLI-06 | Medium | `tools use <name>` with `--only`, `--stream` | Medium |
| GAP-CLI-07 | Medium | `permissions edit` — open in `$EDITOR` with retry | Low |
| GAP-CLI-08 | Medium | `usage` top-level — show session cost from `SessionCostTracker` | Low |
| GAP-CLI-09 | Medium | `--mcp-config <json>` — inline MCP server config via flag | Low |
| GAP-CLI-22 | Medium | `/model` slash command — actually switch active model | Medium |
| GAP-CLI-23 | Medium | `/cost` slash command — wire `SessionCostTracker` | Low |
| GAP-CLI-24 | Medium | `/compact` slash command — trigger `checkAndCompact` | Low |
| GAP-CLI-25 | Medium | 9 slash commands perform actions inline (not "use CLI" messages) | High |
| GAP-CLI-10 | Low | `threads continue --last` | Low |
| GAP-CLI-11 | Low | `threads --include-archived` | Low |
| GAP-CLI-12 | Low | `threads archive --unarchive` | Low |
| GAP-CLI-13 | Low | `--visibility` top-level flag | Low |
| GAP-CLI-14 | Low | `--remote` flag (stub: "not available") | Low |
| GAP-CLI-15 | Low | `--notifications` — sound toggle | Low |
| GAP-CLI-16 | Low | `--settings-file <path>` | Low |
| GAP-CLI-17 | Low | `--log-level` / `--log-file` | Low |
| GAP-CLI-18 | Low | `mcp oauth status` | Low |
| GAP-CLI-19 | Low | `threads` aliases (`t`, `n`, `c`, `l`, `f`, `h`, `s`, `v`) | Low |
| GAP-CLI-20 | Low | `install` (hidden) — install ripgrep | Low |
| GAP-CLI-21 | Low | `--jetbrains` / `--ide` flags | Low |
| GAP-CLI-26 | Low | `maxInputTokens` from `MODEL_REGISTRY` instead of hardcoded | Low |

### 8.2 Session Grouping

- Session 6A: CLI-05, 06, 07, 08 (new command handlers)
- Session 6B: CLI-02, 03, 04, 09 (thread sharing/handoff + mcp-config flag)
- Session 6C: CLI-22, 23, 24, 25 (slash command implementations)
- Session 6D: CLI-10 through 21, 26 (Low flags, aliases, one-liners)

### 8.3 Exit Criteria

- All new commands runnable via `flitter <command>` with `--help`
- Slash commands perform actions inline (e.g., `/cost` shows real cost, `/model gpt-4` switches model)
- `maxInputTokens` derived from model registry

---

## 9. Phase 7: Data Domain (Medium + Low)

**Goal:** Stub server APIs and complete data layer.

### 9.1 Gaps

| Gap ID | Severity | What to Build | Complexity |
|--------|----------|---------------|------------|
| GAP-DATA-03 | Medium | Remote thread list hydration (stub: scan local disk on first access) | Medium |
| GAP-DATA-04 | Medium | Fetch-from-server on cache miss (stub: check disk with dedup) | Medium |
| GAP-DATA-05 | Medium | Thread archive via remote API (stub: local metadata file) | Low |
| GAP-DATA-06 | Medium | Thread search — server-side full-text (stub: local full-text over thread JSON) | High |
| GAP-DATA-07 | Low | Secret migration (file → keychain) — one-time startup migration | Medium |
| GAP-DATA-08 | Low | GitHub auth status check (stub: `gh auth status`) | Low |
| GAP-DATA-09 | Low | GitHub git access token (stub: `gh auth token` or env) | Low |
| GAP-DATA-10 | Low | `observeThreadList` with filtering + throttle | Medium |
| GAP-DATA-11 | Low | Thread labels via server API (stub: local metadata) | Low |
| GAP-DATA-12 | Low | `invalidateThreadListCache` (stub: re-scan disk) | Low |

### 9.2 Implementation Approach

- All stubs implement the same TypeScript interface a real server transport would use — drop-in replaceable
- DATA-06 (local full-text search) is the most substantial — index thread messages on disk, support query DSL subset (title match, content match, date range)
- DATA-07 (secret migration) runs once on startup: detect file-based secrets, copy to keyring, delete file
- DATA-10 builds on `BehaviorSubject` from `@flitter/util`

### 9.3 Session Grouping

- Session 7A: DATA-03, 04, 05, 12 (thread transport stub methods)
- Session 7B: DATA-06 (local full-text search)
- Session 7C: DATA-07, 08, 09, 10, 11 (remaining Low gaps)

### 9.4 Exit Criteria

- Thread operations use remote transport interface (backed by local files)
- Full-text search returns results matching query across local threads
- Secret migration runs cleanly on first startup after upgrade
- `observeThreadList` emits filtered, throttled updates

---

## 10. Tracking

As each gap is closed:
1. Move it from the appropriate severity table to the "Closed Gaps" section in `GAPS.md`
2. Reference the closing commit hash
3. Update `HEALTH.md` if tests/debt/dependencies changed

### Progress Template

```
## Phase N Progress
- [ ] GAP-XXX-NN: description (session Na)
- [ ] GAP-XXX-NN: description (session Nb)
...
```
