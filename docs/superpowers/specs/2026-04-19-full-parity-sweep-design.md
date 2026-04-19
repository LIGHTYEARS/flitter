# Full Parity Sweep: amp-cli → flitter-cli Gap Closure

**Date:** 2026-04-19
**Status:** Revised — reflects parallel session progress
**Approach:** Domain-Sliced Parallel Agents (4 agents, worktree-isolated)
**Baseline:** master @ `e18a658` (940+ commits)

---

## 1. Context

Flitter is a reverse-engineering of amp-cli. After 940+ commits across 8 packages, the infrastructure layer is substantially complete. A parallel session has already closed ~40% of the originally identified gaps (Gap 3, 5, 7, 9, 10). This revised spec tracks only **remaining work**.

### 1.1 What's Already Done (closed by parallel session)

| Area | Completed Items |
|------|----------------|
| **Tools (12 new)** | `undo_edit` + `FileChangeTracker`, `delete_file`, `read_mcp_resource`, `Skill` tool, 7 GitHub tools (`read_github`, `search_github`, `commit_search`, `list_directory_github`, `glob_github`, `github_diff`, `list_repositories`) |
| **Agent Modes** | 4 modes (smart/fast/deep/auto) with `AGENT_MODES` record, `resolveReasoningEffort()`, `--mode` flag |
| **CLI Flags** | `--mode`, `--stats`, `--archive`, `--label`, `--stream-json-thinking`, `--stream-json-input` |
| **CLI Commands** | 6 new thread subcommands: `export`, `markdown`, `search`, `rename`, `label`, `usage` |
| **Theme System** | 8 built-in themes (terminal, dark, light, catppuccin-mocha, solarized-dark, solarized-light, gruvbox-dark-hard, nord), `ThemeRegistry` with custom override |
| **Toolbox** | `ToolboxService` with `tb__` prefix, scan/register/execute, `tools make` command |
| **Plugin System** | `PluginService` + `PluginHost` + `PluginRuntime` with JSON-RPC subprocess protocol |
| **Lifecycle Hooks** | `InternalHooks` interface, `filterValidHooks` with `compatibilityDate` validation |

### 1.2 Current Tool Count

- **Static builtin tools:** 7 (Bash, Read, Write, Edit, Grep, Glob, FuzzyFind)
- **Factory/injected tools:** 5 (undo_edit, delete_file, read_mcp_resource, Skill, Task)
- **GitHub tools:** 7 (read_github, search_github, commit_search, list_directory_github, glob_github, github_diff, list_repositories)
- **Total: 19 tools** (up from 8 at spec creation)

### 1.3 Active Worktrees (may need merge)

| Worktree | Branch | Work | Commits Ahead |
|----------|--------|------|---------------|
| `agent-a1cffde4` | GitHub tools (Gap 10) | 7 GitHub integration tools | 1 |
| `agent-a6de2755` | ToolboxService | ToolboxService + `tools make` CLI | 3 |
| `agent-a6e6a889` | Execute mode flags (Gap 9) | `--stats`, `--archive`, `--label`, `--stream-json-*` | 3 |
| 4 others | Idle | At master HEAD | 0 |

---

## 2. Methodology

*(Unchanged — see sections 2.1–2.4 below)*

### 2.1 Agent Isolation

Each agent works in its own **git worktree** branching from `master`. Agents are organized by package domain boundaries.

### 2.2 Amp Cross-Reference Rule

Per CLAUDE.md Rule #1, every agent MUST cross-reference `amp-cli-reversed/` before writing functional code.

| Domain | Amp Reference |
|--------|--------------|
| Tools | `chunk-005.js` lines 13183–13250 (tool name constants) |
| CLI commands/flags | `chunk-005.js` lines 5120–5230 (global options), `chunk-004.js` (command execution) |
| Agent modes | `chunk-005.js` lines 66570–67480 (model definitions + mode configs) |
| TUI widgets | `modules/1472_tui_components/` (split TUI modules), `chunk-006.js` (TUI rendering) |
| Command palette | `modules/2785_unknown_e0R.js` (full command registry) |
| Thread system | `modules/1342_ThreadService_azT.js`, `modules/1998_ThreadPool_Qz0.js` |
| MCP | `modules/1809_MCP_jPR.js` |

### 2.3 Testing Requirements

- Every tool: unit tests + integration test with real file I/O
- Every CLI command: unit test for argument parsing + handler logic
- Every TUI widget: unit test for build/layout/paint + keyboard/mouse interaction
- Per CLAUDE.md Rule #2: runnable features must include a real execution test

### 2.4 TDD Protocol

Write failing test → implement → verify green → commit.

---

## 3. Agent 1: Tools Agent (Remaining)

**Branch:** `feat/parity-tools`
**Packages:** `packages/agent-core/src/tools/builtin/`, `packages/schemas/`, `packages/flitter/src/container.ts`

### ~~3.1 Previously Completed~~

- ~~`undo_edit`~~ — DONE (`undo-edit.ts` + `FileChangeTracker`)
- ~~`delete_file`~~ — DONE (`delete-file.ts`)
- ~~`read_mcp_resource`~~ — DONE (`read-mcp-resource.ts`)
- ~~`Skill`~~ — DONE (`skill-tool.ts` with `{{arguments}}` substitution)
- ~~GitHub tools (7)~~ — DONE (`packages/agent-core/src/tools/github/`)

### 3.2 Remaining P0 Tools (5 tools)

#### 3.2.1 `web_search`
- **Amp behavior:** Wraps an external search API. Returns structured results (title, URL, snippet).
- **Amp reference:** Search chunk-005.js for `web_search` tool definition.
- **Implementation:**
  - HTTP client calling a search API endpoint
  - Returns `SearchResult[]` with title, url, snippet
  - Respects proxy settings from ConfigService
- **Schema:** `{ query: string, num_results?: number }`
- **Tests:** Mock HTTP response → verify parsed results; network error → graceful error

#### 3.2.2 `read_web_page`
- **Amp behavior:** Fetches a URL, converts HTML to markdown/text, returns content.
- **Amp reference:** Search chunk-005.js for `read_web_page` tool definition.
- **Implementation:**
  - HTTP fetch with timeout + redirect following
  - HTML → markdown conversion (turndown or regex-based stripping)
  - Content truncation for large pages
- **Schema:** `{ url: string }`
- **Tests:** Mock HTML → verify markdown; timeout → error; redirect → follows

#### 3.2.3 `read_thread`
- **Amp behavior:** Returns the current thread's message history as formatted text.
- **Implementation:**
  - Reads from ThreadStore.getThreadSnapshot()
  - Formats messages with role labels and timestamps
- **Schema:** `{ thread_id?: string, limit?: number }`
- **Tests:** Thread with messages → formatted output; empty thread → empty result

#### 3.2.4 `task_list`
- **Amp behavior:** Lists currently active subagent tasks with status.
- **Implementation:**
  - Reads from SubAgentManager.active$ observable
  - Returns task ID, status, description for each active task
- **Schema:** `{ }` (no parameters)
- **Tests:** Active tasks → list; no tasks → empty list

#### 3.2.5 `find_thread`
- **Amp behavior:** Searches threads by query, matching title, messages, labels.
- **Implementation:**
  - Uses ThreadStore + fuzzy search from `@flitter/util`
  - Returns matching thread IDs with titles and match scores
- **Schema:** `{ query: string, limit?: number }`
- **Tests:** Matching query → sorted results; no match → empty

### 3.3 Remaining P1 Tools (2 tools)

#### 3.3.1 `finder`
- **Amp behavior:** Multi-step intelligent codebase search agent. Internally uses glob, grep, and read in a loop.
- **Amp reference:** Search chunk-005.js for `finder` tool — implemented as an internal sub-agent.
- **Implementation:**
  - Spawns a sub-agent (via SubAgentManager) with a search-focused system prompt
  - Grants sub-agent access to: Glob, Grep, Read
  - Returns the sub-agent's final answer
- **Schema:** `{ query: string }`
- **Complexity:** High — needs system prompt engineering to match amp's search quality

#### 3.3.2 `code_review`
- **Amp behavior:** Structured code review tool that analyzes diffs.
- **Amp reference:** Search chunk-005.js for `code_review` tool definition.
- **Implementation:**
  - Takes a diff or file paths + optional instructions
  - Spawns a sub-agent with review-focused system prompt
  - Returns structured review comments
- **Schema:** `{ diff?: string, files?: string[], instructions?: string }`

### 3.4 Container Wiring

Register each new tool in:
- `packages/agent-core/src/tools/builtin/index.ts` — export
- `packages/flitter/src/container.ts` — registration call
- `packages/schemas/src/permissions.ts` — default permission rule if needed

---

## 4. Agent 2: CLI Surface Agent (Remaining)

**Branch:** `feat/parity-cli`
**Packages:** `packages/cli/`, `packages/agent-core/`, `packages/schemas/`

### ~~4.1 Previously Completed~~

- ~~Agent modes~~ — DONE (smart/fast/deep/auto in `packages/agent-core/src/modes/`)
- ~~`--mode` flag~~ — DONE
- ~~`--stats`, `--archive`, `--label`~~ — DONE
- ~~`--stream-json-thinking`, `--stream-json-input`~~ — DONE
- ~~Thread subcommands (export/markdown/search/rename/label/usage)~~ — DONE

### 4.2 Remaining CLI Flags (P0-P1, 6 flags)

All flags go in `packages/cli/src/program.ts`, wired through `packages/cli/src/context.ts`:

| Flag | Priority | Wiring |
|------|----------|--------|
| `--dangerously-allow-all` | P0 | → PermissionEngine.setAllowAll(true) |
| `--allowedTools <list>` | P1 | → PermissionEngine tool whitelist |
| `--disallowedTools <list>` | P1 | → PermissionEngine tool blacklist |
| `--no-shell-cmd` | P1 | → ToolRegistry.disable("Bash") |
| `--toolbox` | P1 | → Enable ToolboxService scanning (service exists, flag not wired) |
| `--include-co-authors` | P2 | → Git commit co-author injection (schema key `git.commit.coauthor.enabled` exists) |
| `--output-format <fmt>` | P2 | → Output formatter selection |

### 4.3 Remaining Commands (P1, 5 commands)

#### 4.3.1 `flitter review [diff]`
- **Amp reference:** Search chunk-005.js for the `review` command registration.
- Accept optional diff input (stdin or file), `--checks`, `--files`, `--instructions` flags.
- Spawns a ThreadWorker with review-focused system prompt.

#### 4.3.2 `flitter mcp doctor`
- Diagnoses MCP server connections — tests each configured server, reports status, latency, errors.

#### 4.3.3 `flitter mcp approve`
- Prompts user to approve/trust a workspace-scoped MCP server.
- Writes trust decision to workspace config.

#### 4.3.4 `flitter mcp oauth login|logout`
- Delegates to OAuthProvider for the specified MCP server.
- Reuses existing OAuth infrastructure from `packages/llm/src/oauth/`.

#### 4.3.5 `flitter thread dashboard`
- TUI mode: launches a FuzzyPicker-based thread switcher.
- Lists recent threads with title, date, message count.
- Select to switch, or create new.

### 4.4 Command Palette Expansion (P1)

Extend `SlashCommandRegistry` from 6 → ~30 commands:

- Thread: `/new`, `/switch`, `/dashboard`, `/delete`, `/archive`
- Mode: `/mode smart`, `/mode fast`, `/mode deep`, `/mode auto`
- Settings: `/settings`, `/theme`
- MCP: `/mcp add`, `/mcp remove`, `/mcp list`
- Debug: `/debug logs`, `/debug thread`
- Task: `/tasks`, `/task cancel <id>`
- Screen: `/quit`

### 4.5 Agent Mode Expansion (P2)

Current: 4 modes (smart/fast/deep/auto). Amp has 6 (smart/rush/deep/large/free/agg-man).
- Cross-reference amp's `chunk-005.js` lines 66570–67480 for the 2 missing modes
- Evaluate whether `rush`→`fast` and `large`→(missing) mappings are correct
- Add any missing mode-specific tool sets or system prompt modifiers

---

## 5. Agent 3: TUI Widgets Agent (Remaining)

**Branch:** `feat/parity-tui`
**Packages:** `packages/tui/`, `packages/cli/src/widgets/`

### ~~5.1 Previously Completed~~

- ~~Theme data (8 themes)~~ — DONE (`packages/tui/src/theme/builtin-themes.ts`)
- ~~ThemeRegistry~~ — DONE (`packages/tui/src/theme/theme-registry.ts`)

### 5.2 Theme Switching Wiring (P0)

The theme data and registry exist, but switching is not wired:
- Wire `terminal.theme` config key → `ThemeController` hot-reload via ConfigService subscription
- Add `/theme` slash command for in-session switching (FuzzyPicker-based theme picker)
- Ensure `ThemeController.of(context)` propagates the selected theme through the widget tree

### 5.3 Generic Popup/Dialog (P0)

- **Amp reference:** `QQT` (popup overlay), `XRR` (popup dialog), `T0R` (confirmation dialog).
- Implement `PopupOverlay` — positions in Overlay layer, focus trapping, backdrop dismiss.
- Implement `PromptDialog` — text input + confirm/cancel buttons.
- Implement `ConfirmDialog` — message + Yes/No buttons.
- Foundation for thread dashboard, MCP approval, etc.

### 5.4 ProgressBar (P1)

- **Amp reference:** `E0R` — linear progress bar with Unicode block elements.
- `ProgressBar` widget: `value` (0.0–1.0), `width`, optional label.
- Sub-character-width rendering: `▏▎▍▌▋▊▉█`.

### 5.5 Toggle/Checkbox (P1)

- **Amp reference:** `P0R` — interactive toggle.
- `Toggle` widget: `value`, `onChanged`, `label`.
- Keyboard: Space to toggle, Enter to confirm.

### 5.6 Badge (P1)

- **Amp reference:** `T3R` — count badge / tag.
- `Badge` widget: `count` or `label`, `color`.
- Renders as inline colored pill: `[3]` or `[NEW]`.

### 5.7 Animated Orb Mode Indicator (P1)

- **Amp reference:** `GZT` — animated mode indicator in input area.
- Shows current agent mode with animated pulsing effect.
- Integrates with BrailleSpinner animation system.

### 5.8 Split Pane (P2)

- **Amp reference:** `VZT`/`YZT` — horizontal/vertical resizable split.
- `SplitPane` widget: `direction`, `initialRatio`, `onResize`.
- Mouse drag on divider. Keyboard shortcut to adjust.

### 5.9 Physics-Based Scroll (P2)

- Extend `ScrollPhysics` with `FlingPhysics`:
  - Velocity tracking over last N events
  - Deceleration curve on release
  - Configurable friction coefficient
- Wire into `ScrollController.animateTo()`.

### 5.10 Notification Panels (P2)

- **Amp reference:** `TZT`/`RZT` — inline notification panels (not overlay toasts).
- `NotificationBanner` — dismissible inline banner with icon, message, action button.
- Types: info, warning, error, success.

---

## 6. Agent 4: Agent Engine Agent (Remaining)

**Branch:** `feat/parity-engine`
**Packages:** `packages/agent-core/`, `packages/data/`, `packages/flitter/`, `packages/tui/`, `packages/llm/`

### ~~6.1 Previously Completed~~

- ~~Toolbox tool system~~ — DONE (`ToolboxService` in `packages/agent-core/src/toolbox/`)
- ~~Plugin system~~ — DONE (`PluginService` + `PluginHost` + `PluginRuntime`)
- ~~Lifecycle hooks~~ — DONE (`InternalHooks`, `filterValidHooks`, `compatibilityDate`)

### 6.2 Terminal Capability Detection Enhancement (P0)

Current state: `TerminalCapabilities` with 5 fields + `waitForCapabilities()` with timeout fallback. Missing: color depth detection.

- **Amp reference:** Multi-layer terminal detection in chunk-006.js.
- Add COLORTERM env var check (`truecolor`/`24bit` → true color)
- Add TERM check (`256color` → 256-color mode)
- Fallback to 16-color ANSI
- Wire detected color depth into `AnsiRenderer` for appropriate color encoding
- Expose via `MediaQuery` so widgets can adapt

### 6.3 DTW — Durable Thread Worker (P1)

- **Amp reference:** Remote execution via Cloudflare Durable Objects.
- Implement `DTWClient` in `packages/agent-core/src/dtw/`:
  - HTTP/WebSocket client to DTW service endpoint
  - Send/receive thread messages remotely
  - Reconnect/resume on disconnect
  - Sync remote thread state to local ThreadStore
- Wire `usesDtw` flag in ThreadSnapshot to route through DTWClient
- **Scope limitation:** Server-side DTW is out-of-scope. Implements client transport + protocol only. Tested with mock HTTP server.

### 6.4 Thread Navigation History (P1)

- **Amp reference:** `modules/1998_ThreadPool_Qz0.js` — `navigateBack()`/`navigateForward()`.
- Implement navigation stack in `ThreadStore` or new `ThreadNavigator`:
  - Push thread ID on switch
  - `back()` / `forward()` methods
  - Expose as `/back` and `/forward` slash commands
  - Wire keyboard shortcuts (Alt+Left, Alt+Right)

### 6.5 Retry Fidelity Audit (P2)

- Cross-reference amp's `modules/2798_WithRetry_HQ.js` against flitter's `RetryScheduler`.
- Verify: error code classification, backoff parameters, header parsing all match.
- Fix any divergences.

### 6.6 `plugins` CLI Commands (P1)

Plugin system exists but CLI commands are missing:
- `flitter plugins list` — lists installed plugins with status
- `flitter plugins exec <plugin> <event>` — execute a plugin with event data

---

## 7. Execution Plan

### 7.1 Agent Dispatch

All 4 agents launch simultaneously in separate worktrees:

```
master ─┬─ feat/parity-tools    (Agent 1: 7 remaining tools)
        ├─ feat/parity-cli      (Agent 2: 6 flags + 5 cmds + palette)
        ├─ feat/parity-tui      (Agent 3: 9 TUI widgets/features)
        └─ feat/parity-engine   (Agent 4: 4 engine features)
```

### 7.2 Cross-Agent Dependencies

| Dependency | From | To | Resolution |
|-----------|------|-----|-----------|
| Thread dashboard needs Popup | Agent 2 | Agent 3 | Agent 2 uses existing FuzzyPicker; generic Popup is additive |
| `code_review` tool ↔ `review` command | Agent 1 | Agent 2 | Independent — tool is LLM-callable, command is user-facing |
| `/theme` command needs ThemeRegistry | Agent 2 (palette) | Agent 3 (wiring) | Agent 3 wires ThemeController; Agent 2 adds slash command |
| `plugins` commands need PluginService | Agent 4 (commands) | Already done | PluginService exists, just needs CLI wiring |

### 7.3 Merge Strategy

1. `feat/parity-tools` → `master` first (pure additions, lowest conflict)
2. `feat/parity-tui` → `master` (self-contained widgets)
3. `feat/parity-engine` → `master` (touches shared container)
4. `feat/parity-cli` → `master` last (most cross-cutting)

### 7.4 Revised Task Counts

| Agent | P0 | P1 | P2 | Total |
|-------|----|----|----|----|
| Agent 1: Tools | 5 | 2 | 0 | **7** |
| Agent 2: CLI Surface | 1 | 5 | 3 | **9** |
| Agent 3: TUI Widgets | 2 | 4 | 3 | **9** |
| Agent 4: Agent Engine | 1 | 3 | 1 | **5** |
| **Total** | **9** | **14** | **7** | **30** |

*(Down from 36 originally — 6 tasks completed by parallel session)*

---

## 8. Success Criteria

1. All P0 items implemented and tested
2. All P1 items implemented and tested
3. P2 items implemented where time permits
4. Every implementation cross-references amp source (`逆向:` comments)
5. Full test suite passes after all merges
6. `flitter` can start an interactive TUI session, use all core tools, switch modes, and manage threads
7. `flitter --execute` headless mode works for CI/scripting

---

## 9. Out of Scope

- `painter` / `look_at` / `render_agg_man` — media/visual tools (mode-gated, niche)
- `slack_write` / `slack_read` — Slack integration (requires external service)
- `oracle` / `librarian` — specialized reasoning tools (mode-gated)
- `code_tour` — guided code tour (IDE-specific)
- JetBrains / Neovim / Zed IDE integrations — separate project
- DTW server-side implementation — requires cloud infrastructure
