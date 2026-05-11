# Broad Sweep Gap Closure — 5-Agent Parallel Design

> **Date:** 2026-04-23
> **Baseline:** iteration 36 (GAPS.md), commit `89ef991`
> **Target:** Close ~25 open gaps across all domains via 5 parallel worktree agents

---

## Context

GAPS.md tracks 90 open gaps (2 Critical, ~14 High, ~28 Medium, ~51 Low). After 36 iterations of focused work, the infrastructure and agent-core layers are substantially complete. The remaining gaps span terminal protocol, TUI widgets, tools, agent-core, LLM, CLI, and data.

This spec organizes a single-session broad sweep using 5 domain-parallel agents, each in an isolated git worktree. Server-dependent gaps (DTW, Slack, remote execution, enterprise auth) are explicitly excluded.

---

## Agent Assignments

### Agent 1: Terminal Protocol (Critical)

**Branch:** `sweep/terminal-protocol`
**Gaps:** GAP-TUI-18, GAP-TUI-19, GAP-TUI-05

| Gap ID | Feature | Severity |
|--------|---------|----------|
| GAP-TUI-18 | QueryParser — VT capability probing (DECRQSS/DA1/DA2/XTVERSION/XTGETTCAP) | Critical |
| GAP-TUI-19 | RGB color detection — OSC 10/11/12/4, setDefaultColors, theme luminance | Critical |
| GAP-TUI-05 | Terminal RGB color query integration (downstream of above) | Medium |

**Amp References:**
- `dY` class in chunk-004.js (QueryParser): sends DA1 (`\x1b[c`), DA2 (`\x1b[>c`), DECRQSS (`\x1bP$q"p\x1b\\`), XTVERSION (`\x1b[>0q`), XTGETTCAP queries
- WidgetsBinding init sequence: blocks `runApp` until DA1 reply or 1000ms timeout
- `Screen.setDefaultColors()` / `setIndexRgbMapping()` for runtime palette
- `updateRgbColors()` for OSC 10/11/12/4 response parsing

**Implementation Strategy:**
1. Create `QueryParser` class in `packages/tui/src/terminal/query-parser.ts`
2. Send capability queries on TuiController init, parse VT responses
3. Gate `runApp` behind DA1 response or 1s timeout
4. Parse DA1/DA2 for terminal identification → populate `TerminalCapabilities`
5. Send OSC 10/11/12/4 queries → parse RGB responses → update `Screen` default colors
6. Wire theme luminance detection from actual bg color
7. Tests: unit tests for response parsing, integration test with mock terminal

**Success Criteria:**
- `TerminalCapabilities` populated from VT probing, not just env vars
- Theme luminance auto-detected from terminal bg color
- Backward-compatible: falls back to env-var heuristics if no VT response within 1s

---

### Agent 2: TUI Widgets

**Branch:** `sweep/tui-widgets`
**Gaps:** GAP-TUI-25, GAP-TUI-12, GAP-TUI-11, GAP-TUI-13, GAP-TUI-32, GAP-TUI-15

| Gap ID | Feature | Severity |
|--------|---------|----------|
| GAP-TUI-25 | Chart render object (bar/line/sparkline/stacked/horizontal) | High |
| GAP-TUI-12 | In-band resize notification (Mode 2048) | Low |
| GAP-TUI-11 | Emoji width mode (`?2027`) | Low |
| GAP-TUI-13 | modifyOtherKeys (`CSI > 4 ; 2 m`) | Low |
| GAP-TUI-32 | OSC 52 per-terminal opt-in | Low |
| GAP-TUI-15 | Ghostty progress bar (OSC 9;4) | Low |

**Amp References:**
- `uRR` in misc_utils.js (chart render object): `chartType`, `series`, `xAxis`, `yAxis`, `highlight`, `valueFormatter`
- Mode 2048 (in-band resize): `CSI ? 2048 h` to enable, response `CSI 8 ; rows ; cols t`
- Emoji width: `CSI ? 2027 h` (Unicode core spec mode) in dY
- modifyOtherKeys: `CSI > 4 ; 2 m` for enhanced key disambiguation
- OSC 52 per-terminal: capability-gated clipboard in dY

**Implementation Strategy:**
1. **Chart RenderObject** (`packages/tui/src/render-object/render-chart.ts`):
   - Bar, stacked-bar, line, stacked-area, sparkline, horizontal-bar types
   - X/Y axis labels with value formatter
   - Color series with highlight support
   - Braille character grid for sub-cell resolution on line/area charts
2. **In-band resize**: Enable Mode 2048 in TuiController init, parse `CSI 8;rows;cols t` response, call `handleResize()`
3. **Emoji width**: Enable `?2027` on supported terminals, affects character width measurement
4. **modifyOtherKeys**: Enable `CSI > 4 ; 2 m`, parse enhanced key events
5. **OSC 52**: Gate clipboard copy behind per-terminal capability check
6. **Ghostty progress**: Emit `OSC 9;4;1;N ST` for progress updates in supported terminals

**Success Criteria:**
- Chart widget renders all 6 chart types with axes and labels
- Terminal protocol features activate on supported terminals, no-op on others

---

### Agent 3: Tools

**Branch:** `sweep/tools`
**Gaps:** GAP-TOOL-35, GAP-TOOL-40, GAP-TOOL-37, GAP-TOOL-18

| Gap ID | Feature | Severity |
|--------|---------|----------|
| GAP-TOOL-35 | code_tour / walkthrough / walkthrough_diagram | Low |
| GAP-TOOL-40 | create_project scaffolding tool | Low |
| GAP-TOOL-37 | Bitbucket Enterprise tools (7 tools) | Medium |
| GAP-TOOL-18 | painter — AI image generation via Gemini | Low |

**Amp References:**
- `modules/2026_tail_anonymous.js`: tool schemas for code_tour, walkthrough, walkthrough_diagram, create_project, painter
- `modules/1472_tui_components/layout_widgets.js`: `buildCodeTourTool`, `buildWalkthroughTool`, `buildPainterTool`
- Bitbucket Enterprise: mirrors GitHub tool pattern with `_bitbucket_enterprise` suffix
- Painter: `buildPainterTool` / `buildRenderAggManTool` in misc_utils.js

**Implementation Strategy:**
1. **code_tour**: Subagent tool (type `"code-tour"`) with read-only tool access. Params: `query`, `files`, `depth`. System prompt from amp's walkthrough/tour prompt.
2. **walkthrough** + **walkthrough_diagram**: Pair of tools — walkthrough generates guided explanation, walkthrough_diagram generates mermaid diagram. Both use subagent pattern.
3. **create_project**: Shell-based tool that creates project directories from amp's scaffolding templates. Params: `name`, `template`, `path`.
4. **Bitbucket Enterprise**: Factory function `createBitbucketEnterpriseTools(client)` mirroring `createGitHubTools(client)`. 7 tools: read, search, glob, diff, list_directory, list_repositories, commit_search.
5. **painter**: Gemini Pro Image tool. Params: `prompt`, `style`, `size`. Returns image data for Kitty graphics display.

**Success Criteria:**
- All tools registered in container.ts with correct mode tool lists
- Follow existing factory pattern (createXxxTool)
- Tests for each tool's schema validation, preprocessArgs, and execute path

---

### Agent 4: Agent-Core + LLM

**Branch:** `sweep/core-llm`
**Gaps:** GAP-CORE-21, GAP-CORE-29, GAP-CORE-30, GAP-LLM-18, GAP-LLM-19

| Gap ID | Feature | Severity |
|--------|---------|----------|
| GAP-CORE-21 | Agg-man orchestrator mode | High |
| GAP-CORE-29 | Plugin tracing/spans (OpenTelemetry) | Medium |
| GAP-CORE-30 | Plugin ai/system/helpers context | Medium |
| GAP-LLM-18 | OpenAI Responses API → chat.completions alignment | Medium |
| GAP-LLM-19 | MCP OAuth headless auth handler | Medium |

**Amp References:**
- `modules/1246_ThreadWorkerService_QWT.js`: agg-man worker creation, `send_message_to_aggman` routing
- `modules/1998_ThreadPool_Qz0.js`: DTW thread pool for parallel executor subagents
- `chunk-002.js:27256+`: `cI` class with plugin context (ai.*, system.*, helpers.*)
- `chunk-002.js:12397`: OpenAI `AUT()` with chat.completions
- `modules/1280_ToAuthorization_M5T.js`: `headlessAuthHandler` for CI environments

**Implementation Strategy:**
1. **Agg-man mode** (`packages/agent-core/src/modes/aggman.ts`):
   - New `AGENT_MODES.aggman` entry with dedicated tool list
   - `AggManOrchestrator` class that spawns parallel executor subagents
   - `send_message_to_aggman` tool for routing messages to orchestrator
   - `render_agg_man` tool for aggregating/displaying results
   - Wire into ThreadWorkerService mode dispatch
2. **Plugin tracing**: Add `span.event` RPC handler in PluginHost. Create OpenTelemetry-compatible span objects that plugins can write events to.
3. **Plugin context**: Extend `PluginHost` with `ai.*` (inference call), `system.*` (env, cwd, platform), `helpers.*` (Bun shell, file read) namespaced RPCs.
4. **OpenAI alignment**: Add `chat.completions.create` path alongside Responses API. Config flag `openai.useChatCompletions: true` for proxy compatibility.
5. **MCP OAuth headless**: Add `headlessAuthHandler` callback to OAuth flow for CI (reads code from stdin or env var).

**Success Criteria:**
- `flitter --mode aggman` launches orchestrator with subagent dispatch
- Plugin context RPCs functional (ai.chat, system.env, helpers.readFile)
- OpenAI provider works with both Responses API and chat.completions
- OAuth flow works in headless CI via `FLITTER_MCP_OAUTH_CODE` env var

---

### Agent 5: CLI Surface

**Branch:** `sweep/cli-surface`
**Gaps:** GAP-CLI-32, GAP-CLI-20, GAP-CLI-18, GAP-CLI-48, GAP-CLI-49, GAP-CLI-51, GAP-TUI-16

| Gap ID | Feature | Severity |
|--------|---------|----------|
| GAP-CLI-32 | --ide / --no-ide flag | Medium |
| GAP-CLI-20 | install (hidden) — ripgrep binary installer | Low |
| GAP-CLI-18 | mcp oauth status command | Low |
| GAP-CLI-48 | send-queued-message TUI command | Low |
| GAP-CLI-49 | thread: open in browser | Low |
| GAP-CLI-51 | thread: mention | Low |
| GAP-TUI-16 | Custom theme TOML loading | Low |

**Amp References:**
- `chunk-005.js`: `--jetbrains`/`--ide` CLI flag parsing
- `modules/1472_tui_components/jetbrains_wizard.js`: JetBrains/IDE integration state
- `chunk-005.js:4879+`: command aliases and hidden commands
- Theme TOML: amp's `CA`/`Yb` theme providers with file-based override

**Implementation Strategy:**
1. **--ide flag**: Add `--ide`/`--no-ide` boolean option to program.ts. Store in CliContext. Wire no-op IDE client interface for future integration.
2. **install command**: Hidden `install` command that downloads ripgrep binary to `$FLITTER_HOME/bin`. SHA-256 verification. Platform detection (darwin/linux/win, arm64/x64).
3. **mcp oauth status**: `mcp oauth status` subcommand. Lists OAuth-enabled MCP servers with token expiry, refresh status.
4. **send-queued-message**: Command palette entry that immediately sends the currently queued message (bypasses prompt, different from `/queue`).
5. **open in browser**: Command palette entry that opens thread URL in default browser via `open`/`xdg-open`.
6. **thread mention**: Command palette entry that inserts `@thread:<id>` reference into prompt.
7. **TOML themes**: `loadCustomTheme(path)` reads TOML file with color overrides. Discovery: `~/.config/flitter/themes/*.toml`. Registration in ThemeRegistry alongside built-in themes.

**Success Criteria:**
- All CLI flags accepted without error
- Command palette entries functional
- Custom TOML themes loaded and applied

---

## Deferred Gaps (Dependency-Blocked)

These gaps have dependencies on Agent 1's terminal probing work and should be tackled in a follow-up session after the QueryParser lands:

| Gap ID | Feature | Blocked By |
|--------|---------|------------|
| GAP-TUI-01 | Kitty Graphics image widget | GAP-TUI-18 (QueryParser) |
| GAP-TUI-20 | Image paste from clipboard | GAP-TUI-01 (image widget) |
| GAP-TUI-31 | Pixel-mouse support | GAP-TUI-18 (QueryParser) |
| GAP-TUI-34 | Kitty explicit width detection | GAP-TUI-18 (QueryParser) |

## Excluded Gaps (Server-Dependent)

These gaps require server infrastructure and are explicitly out of scope:

| Gap ID | Reason |
|--------|--------|
| GAP-DATA-18 | DTW / Cloudflare Durable Objects live-sync |
| GAP-CLI-34 | --remote flag (server-side execution) |
| GAP-CLI-50 | share with support (server API) |
| GAP-CLI-52 | Enterprise visibility default (server) |
| GAP-CLI-53 | threads share --support (server API) |
| GAP-TOOL-20 | docs_list/read/write (server API) |
| GAP-TOOL-21 | handoff server-side tools |
| GAP-TOOL-22 | Thread lifecycle tools (server) |
| GAP-TOOL-23 | Inter-thread messaging (server) |
| GAP-TOOL-24 | Slack tools (server) |
| GAP-TOOL-38 | search_documents (server) |
| GAP-DATA-08 | GitHub auth endpoint (server) |
| GAP-DATA-09 | GitHub git access token (server) |
| GAP-DATA-11 | Thread labels remote propagation |

---

## Execution Protocol

1. Each agent works in an **isolated git worktree** branching from `master`
2. Agents MUST cross-reference `amp-cli-reversed/` before writing code (CLAUDE.md Rule 1)
3. Each gap closure requires: implementation + tests + GAPS.md update (mark closed)
4. Agents run `bun test` on affected packages before declaring completion
5. After all agents complete, orchestrator reviews changes and merges branches

## Expected Outcome

- **~25 gaps closed** (2 Critical + 1 High + ~8 Medium + ~14 Low)
- Open gap count reduced from 90 to ~65
- Terminal protocol layer unblocked for downstream image/color features
