# Full Parity Sweep: amp-cli → flitter-cli Gap Closure

**Date:** 2026-04-19
**Status:** Draft
**Approach:** Domain-Sliced Parallel Agents (4 agents, worktree-isolated)

---

## 1. Context

Flitter is a reverse-engineering of amp-cli. After 920 commits across 8 packages, the infrastructure layer (Flutter-like TUI framework, agent core with ThreadWorker, 5 LLM providers, MCP protocol, OAuth, thread persistence) is substantially complete. However, a systematic audit reveals significant feature-layer gaps:

- **Tools:** 8 of ~20 amp tools implemented (40%)
- **CLI commands/flags:** ~12 of ~30 amp CLI flags missing; 6 of ~50 command-palette commands implemented
- **Agent modes:** 0 of 6 named modes (smart/rush/deep/large/free/agg-man)
- **TUI widgets:** Core framework complete, but ~10 amp widget types missing or partial
- **Platform features:** Plugin system, toolbox tools, DTW all absent beyond schema stubs

This spec defines 4 parallel agent workstreams to close these gaps.

---

## 2. Methodology

### 2.1 Agent Isolation

Each agent works in its own **git worktree** branching from `master`. This prevents merge conflicts during parallel work. Agents are organized by package domain boundaries, which are the natural isolation units in flitter's monorepo.

### 2.2 Amp Cross-Reference Rule

Per CLAUDE.md Rule #1, every agent MUST cross-reference the corresponding amp source in `amp-cli-reversed/` before writing functional code. The key reference files:

| Domain | Amp Reference |
|--------|--------------|
| Tools | `chunk-005.js` lines 13183–13250 (tool name constants), individual tool implementations scattered in chunk-005 |
| CLI commands/flags | `chunk-005.js` lines 5120–5230 (global options), `chunk-004.js` (command execution) |
| Agent modes | `chunk-005.js` lines 66570–67480 (model definitions + mode configs) |
| TUI widgets | `modules/1472_tui_components/` (split TUI modules), `chunk-006.js` (TUI rendering) |
| Command palette | `modules/2785_unknown_e0R.js` (full command registry) |
| Thread system | `modules/1342_ThreadService_azT.js`, `modules/1998_ThreadPool_Qz0.js` |
| MCP | `modules/1809_MCP_jPR.js` |
| Plugin system | `modules/2529_unknown_t40.js` |

### 2.3 Testing Requirements

- Every tool: unit tests with mocked LLM + integration test with real file I/O
- Every CLI command: unit test for argument parsing + handler logic
- Every TUI widget: unit test for build/layout/paint + keyboard/mouse interaction
- Per CLAUDE.md Rule #2: features that produce runnable functionality must include a real execution test (not just unit tests with mocks)

### 2.4 TDD Protocol

Each task follows: write failing test → implement → verify green → commit. Tests go in `__tests__/` or co-located `.test.ts` files matching existing patterns.

---

## 3. Agent 1: Tools Agent

**Branch:** `feat/parity-tools`
**Packages:** `packages/agent-core/src/tools/builtin/`, `packages/schemas/`, `packages/flitter/src/container.ts`

### 3.1 P0 Tools (LLM-critical)

#### 3.1.1 `undo_edit`
- **Amp behavior:** Maintains a per-thread edit history stack. `undo_edit` pops the most recent `Edit` or `Write` operation, restoring the previous file content.
- **Amp reference:** Search chunk-005.js for `undo_edit` tool definition and the edit-history tracking in the Edit/Write tool implementations.
- **Implementation:**
  - Add `EditHistory` class to `packages/agent-core/src/tools/` — stack of `{filePath, previousContent, timestamp}` entries
  - Modify `Edit` and `Write` tools to push to EditHistory before applying changes
  - Implement `undo_edit` tool that pops and restores
  - Wire EditHistory into container as a shared service
- **Schema:** `{ }` (no parameters — undoes last edit)
- **Tests:** Edit a file → undo → verify original content restored; undo with empty history → error

#### 3.1.2 `web_search`
- **Amp behavior:** Wraps an external search API. Returns structured search results (title, URL, snippet).
- **Amp reference:** Search chunk-005.js for `web_search` tool definition.
- **Implementation:**
  - HTTP client calling a search API endpoint
  - Returns `SearchResult[]` with title, url, snippet
  - Respects proxy settings from ConfigService
- **Schema:** `{ query: string, num_results?: number }`
- **Tests:** Mock HTTP response → verify parsed results; network error → graceful error

#### 3.1.3 `read_web_page`
- **Amp behavior:** Fetches a URL, converts HTML to markdown/text, returns content.
- **Amp reference:** Search chunk-005.js for `read_web_page` tool definition.
- **Implementation:**
  - HTTP fetch with timeout + redirect following
  - HTML → markdown conversion (can use turndown or simple regex-based stripping)
  - Content truncation for large pages
- **Schema:** `{ url: string }`
- **Tests:** Mock HTML response → verify markdown output; timeout → error; redirect → follows

#### 3.1.4 `read_thread`
- **Amp behavior:** Returns the current thread's message history as formatted text.
- **Implementation:**
  - Reads from ThreadStore.getThreadSnapshot()
  - Formats messages with role labels and timestamps
  - Supports optional message range/count parameter
- **Schema:** `{ thread_id?: string, limit?: number }`
- **Tests:** Thread with messages → formatted output; empty thread → empty result

#### 3.1.5 `task_list`
- **Amp behavior:** Lists currently active subagent tasks with their status.
- **Implementation:**
  - Reads from SubAgentManager.active$ observable
  - Returns task ID, status, description for each active task
- **Schema:** `{ }` (no parameters)
- **Tests:** Active tasks → list; no tasks → empty list

#### 3.1.6 `find_thread`
- **Amp behavior:** Searches threads by query string, matching against title, messages, labels.
- **Implementation:**
  - Uses ThreadStore + fuzzy search from `@flitter/util`
  - Searches thread titles and optionally message content
  - Returns matching thread IDs with titles and match scores
- **Schema:** `{ query: string, limit?: number }`
- **Tests:** Matching query → results sorted by relevance; no match → empty

### 3.2 P1 Tools (Important but not blocking)

#### 3.2.1 `finder`
- **Amp behavior:** Multi-step intelligent codebase search. Internally uses glob, grep, and read in an agent loop to answer structural questions about the codebase.
- **Amp reference:** Search chunk-005.js for `finder` tool — it's implemented as an internal sub-agent with a specific system prompt and access to file tools.
- **Implementation:**
  - Spawns a sub-agent (via SubAgentManager) with a search-focused system prompt
  - Grants the sub-agent access to: Glob, Grep, Read
  - Returns the sub-agent's final answer
- **Schema:** `{ query: string }`
- **Complexity:** High — needs careful system prompt engineering to match amp's search quality

#### 3.2.2 `skill`
- **Amp behavior:** Reads a skill file from the filesystem and injects its content into the conversation.
- **Implementation:**
  - Reads from SkillService (already implemented in `@flitter/data`)
  - Returns skill content as formatted text
  - Validates skill exists before reading
- **Schema:** `{ name: string }`
- **Tests:** Existing skill → content returned; missing skill → error

#### 3.2.3 `code_review`
- **Amp behavior:** Structured code review tool that analyzes diffs and provides feedback.
- **Amp reference:** Search chunk-005.js for `code_review` tool definition.
- **Implementation:**
  - Takes a diff or file path + optional instructions
  - Spawns a sub-agent with review-focused system prompt
  - Returns structured review comments
- **Schema:** `{ diff?: string, files?: string[], instructions?: string }`

### 3.3 Container Wiring

After implementing each tool, register it in:
- `packages/agent-core/src/tools/builtin/index.ts` — export
- `packages/flitter/src/container.ts` — `registerBuiltinTools()` call
- `packages/schemas/src/permissions.ts` — default permission rule if needed

---

## 4. Agent 2: CLI Surface Agent

**Branch:** `feat/parity-cli`
**Packages:** `packages/cli/`, `packages/agent-core/`, `packages/schemas/`

### 4.1 Agent Modes (P0 — most impactful missing feature)

#### 4.1.1 Mode Definitions

Create `packages/agent-core/src/modes/` module:

```typescript
interface AgentMode {
  key: string;           // "smart" | "rush" | "deep" | "large" | "free" | "agg-man"
  displayName: string;
  model: string;         // default model for this mode
  toolInclusions?: string[];  // tools enabled in this mode
  toolExclusions?: string[];  // tools disabled in this mode
  systemPromptModifier?: string;
}
```

- **Amp reference:** `chunk-005.js` lines 66570–67480 for exact mode→model mappings and tool sets.
- Cross-reference each mode's model assignment, tool inclusion set, and any behavioral flags.

#### 4.1.2 Mode Wiring

- Add `--mode` flag to `packages/cli/src/program.ts`
- Wire mode selection into `createThreadWorker()` — mode determines which model the provider uses and which tools are enabled
- Add `/mode` slash command for in-session switching (extend existing `/model` handler)
- Update `StatusBar` to show current mode name

### 4.2 Missing CLI Flags (P0-P1)

All flags added to `packages/cli/src/program.ts` and wired through `packages/cli/src/context.ts`:

| Flag | Priority | Wiring |
|------|----------|--------|
| `--mode <mode>` | P0 | → AgentMode selection → model + tools |
| `--dangerously-allow-all` | P0 | → PermissionEngine.setAllowAll(true) |
| `--allowedTools <list>` | P1 | → PermissionEngine tool whitelist |
| `--disallowedTools <list>` | P1 | → PermissionEngine tool blacklist |
| `--archive` | P1 | → ThreadStore.archive() on exit |
| `-l/--label <label>` | P1 | → ThreadSnapshot.metadata.label |
| `--no-shell-cmd` | P1 | → ToolRegistry.disable("Bash") |
| `--toolbox` | P1 | → Enable toolbox tool loading |
| `--include-co-authors` | P2 | → Git commit co-author injection |
| `--output-format <fmt>` | P2 | → Output formatter selection |
| `--stream-json-thinking` | P2 | → Include thinking tokens in stream output |
| `--stream-json-input` | P2 | → Echo input in stream output |

### 4.3 Missing Commands (P1)

#### 4.3.1 `flitter review [diff]`
- **Amp reference:** Search chunk-005.js for the `review` command registration.
- Accept optional diff input (stdin or file), `--checks`, `--files`, `--instructions` flags.
- Spawns a ThreadWorker with review-focused system prompt + code_review tool.

#### 4.3.2 `flitter mcp doctor`
- Diagnoses MCP server connections — tests each configured server, reports status, latency, errors.
- Reads MCPServerManager status for each connection.

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

#### 4.3.6 `flitter usage`
- Prints comprehensive help/usage information.
- Can delegate to commander.js help system.

### 4.4 Command Palette Expansion (P1)

Extend `SlashCommandRegistry` from 6 → ~30 commands:

- Thread commands: `/new`, `/switch`, `/dashboard`, `/delete`, `/archive`
- Mode commands: `/mode smart`, `/mode rush`, `/mode deep`, `/mode large`
- Settings: `/settings`, `/theme`
- MCP: `/mcp add`, `/mcp remove`, `/mcp list`
- Debug: `/debug logs`, `/debug thread`
- Task: `/tasks`, `/task cancel <id>`
- Screen: `/quit`

Each command maps to an existing handler or new functionality.

---

## 5. Agent 3: TUI Widgets Agent

**Branch:** `feat/parity-tui`
**Packages:** `packages/tui/`, `packages/cli/src/widgets/`

### 5.1 Theme System (P0)

#### 5.1.1 Multiple Named Themes

- **Amp reference:** `chunk-006.js` for theme definitions and `N1T` ThemeData structure.
- Add 4-6 named themes: Default (Catppuccin Mocha — already exists), Tokyo Night, Monokai, Solarized Dark, Solarized Light, Nord.
- Each theme defines: `AppColorScheme` values (foreground, background, accent, success, error, warning, info, muted, border, selection).
- Store in `packages/tui/src/widgets/themes/` as individual exports.

#### 5.1.2 Theme Switching

- Add `ThemeRegistry` with `getTheme(name)`, `listThemes()`.
- Wire `terminal.theme` config key → ThemeController hot-reload.
- Add `/theme` slash command for in-session switching (FuzzyPicker-based).

### 5.2 Generic Popup/Dialog (P0)

- **Amp reference:** `QQT` (popup overlay), `XRR` (popup dialog), `T0R` (confirmation dialog).
- Implement `PopupOverlay` widget — positions itself in the Overlay layer, handles focus trapping, backdrop dismiss.
- Implement `PromptDialog` — text input + confirm/cancel buttons.
- Implement `ConfirmDialog` — message + Yes/No buttons.
- These become the foundation for thread dashboard, MCP approval, etc.

### 5.3 ProgressBar (P1)

- **Amp reference:** `E0R` — linear progress bar with Unicode block elements.
- Implement `ProgressBar` widget with `value` (0.0–1.0), `width`, optional label.
- Uses `▏▎▍▌▋▊▉█` sub-character-width rendering for smooth progress.

### 5.4 Toggle/Checkbox (P1)

- **Amp reference:** `P0R` — interactive toggle.
- Implement `Toggle` widget with `value`, `onChanged`, `label`.
- Keyboard: Space to toggle, Enter to confirm.
- Visual: `[x]` / `[ ]` or `●` / `○`.

### 5.5 Badge (P1)

- **Amp reference:** `T3R` — count badge / tag.
- Implement `Badge` widget with `count` or `label`, `color`.
- Renders as inline colored pill: `[3]` or `[NEW]`.

### 5.6 Animated Orb Mode Indicator (P1)

- **Amp reference:** `GZT` — animated mode indicator in the input area.
- Shows current agent mode with animated pulsing effect.
- Integrates with BrailleSpinner animation system.
- Positioned in InputField or StatusBar area.

### 5.7 Split Pane (P2)

- **Amp reference:** `VZT`/`YZT` — horizontal/vertical resizable split.
- Implement `SplitPane` widget with `direction`, `initialRatio`, `onResize`.
- Mouse drag on divider to resize.
- Keyboard shortcut to adjust ratio.

### 5.8 Physics-Based Scroll (P2)

- **Amp reference:** Scrollable physics with velocity tracking and deceleration.
- Extend existing `ScrollPhysics` with `FlingPhysics`:
  - Track drag velocity over last N events
  - On release, animate with deceleration curve
  - Configurable friction coefficient
- Wire into `ScrollController.animateTo()` mechanism.

### 5.9 Notification Panels (P2)

- **Amp reference:** `TZT`/`RZT` — inline notification panels (not overlay toasts).
- Implement `NotificationBanner` — dismissible inline banner with icon, message, action button.
- Types: info, warning, error, success.
- Different from ToastOverlay — these are part of the layout, not overlay-positioned.

---

## 6. Agent 4: Agent Engine Agent

**Branch:** `feat/parity-engine`
**Packages:** `packages/agent-core/`, `packages/data/`, `packages/flitter/`, `packages/tui/`, `packages/llm/`

### 6.1 Terminal Capability Detection (P0)

- **Amp reference:** Multi-layer terminal detection in chunk-006.js.
- Extend `TerminalCapabilities` in TuiController:
  - Check `COLORTERM` env var for `truecolor`/`24bit` → true color support
  - Check `TERM` for `256color` → 256-color mode
  - Fallback to 16-color ANSI
  - Probe Unicode width with cursor-position query
- Wire detected color depth into `AnsiRenderer` for appropriate color encoding
- Expose capabilities to widgets via `MediaQuery`

### 6.2 Toolbox Tool System (P0)

- **Amp reference:** Toolbox tools are external scripts in user directories, prefixed `tb__`, discovered and registered dynamically.
- Implement `ToolboxLoader` in `packages/agent-core/src/tools/toolbox/`:
  - Scans `toolbox.path` config directory for executable scripts
  - Parses tool metadata from script header comments or companion JSON
  - Registers as tools with `source: { toolbox: scriptName }`
  - Executes via child_process with JSON stdin/stdout protocol
- Wire into container startup after ToolRegistry creation

### 6.3 Plugin System (P1)

- **Amp reference:** `modules/2529_unknown_t40.js` — TypeScript plugins in `.amp/plugins/`.
- Implement `PluginLoader` in `packages/data/src/plugin/`:
  - Scans `.flitter/plugins/` for TypeScript/JavaScript modules
  - Each plugin exports: `{ tools?, commands?, events? }`
  - Event hooks: `tool.result`, custom events
  - IPC protocol: `ui.notify`, `system.open`, `client.info`
- Add `flitter plugins list` and `flitter plugins exec` commands
- Wire into container lifecycle

### 6.4 DTW — Durable Thread Worker (P1)

- **Amp reference:** Remote execution via Cloudflare Durable Objects for persistent threads.
- Implement `DTWClient` in `packages/agent-core/src/dtw/`:
  - HTTP/WebSocket client to DTW service endpoint
  - Send/receive thread messages remotely
  - Reconnect/resume on disconnect
  - Sync remote thread state to local ThreadStore
- Wire `usesDtw` flag in ThreadSnapshot to route through DTWClient
- **Scope limitation:** The server-side DTW service is out-of-scope (requires cloud infra). This task implements the client-side transport and protocol only. The DTWClient should work against a conforming server endpoint but will be tested with a mock HTTP server in tests.

### 6.5 Thread Navigation History (P1)

- **Amp reference:** `modules/1998_ThreadPool_Qz0.js` — `navigateBack()`/`navigateForward()`.
- Implement navigation stack in `ThreadStore` or a new `ThreadNavigator`:
  - Push thread ID on switch
  - `back()` / `forward()` methods
  - Expose as `/back` and `/forward` slash commands
  - Wire keyboard shortcuts (Alt+Left, Alt+Right)

### 6.6 Retry Fidelity Audit (P2)

- Cross-reference amp's `modules/2798_WithRetry_HQ.js` against flitter's `RetryScheduler`.
- Verify: error code classification matches, backoff parameters match, header parsing matches.
- Fix any divergences found.

---

## 7. Execution Plan

### 7.1 Agent Dispatch Order

All 4 agents launch simultaneously in separate worktrees:

```
master ─┬─ feat/parity-tools    (Agent 1: Tools)
        ├─ feat/parity-cli      (Agent 2: CLI Surface)
        ├─ feat/parity-tui      (Agent 3: TUI Widgets)
        └─ feat/parity-engine   (Agent 4: Agent Engine)
```

### 7.2 Cross-Agent Dependencies

Most work is independent. Known dependencies:

| Dependency | From | To | Resolution |
|-----------|------|-----|-----------|
| Agent modes need model mapping | Agent 2 (modes) | Agent 4 (engine) | Agent 2 defines mode→model map; Agent 4 doesn't need to know about modes |
| Thread dashboard needs FuzzyPicker + Popup | Agent 2 (dashboard command) | Agent 3 (popup/dialog) | Agent 2 can use existing FuzzyPicker; generic Popup is nice-to-have |
| `code_review` tool needs `review` command | Agent 1 (tool) | Agent 2 (command) | Independent — tool is callable by LLM, command is user-facing |
| Toolbox tools need `--toolbox` flag | Agent 4 (loader) | Agent 2 (flag) | Agent 4 implements loader; Agent 2 adds flag — merge resolves |

These are soft dependencies — each agent can implement their side independently, and integration happens at merge time.

### 7.3 Merge Strategy

After all agents complete:
1. Merge `feat/parity-tools` → `master` first (least conflict risk)
2. Merge `feat/parity-tui` → `master` (widgets are self-contained)
3. Merge `feat/parity-engine` → `master` (may touch shared files)
4. Merge `feat/parity-cli` → `master` last (most cross-cutting)

Each merge: run full test suite, resolve conflicts, verify no regressions.

### 7.4 Estimated Task Counts

| Agent | P0 Tasks | P1 Tasks | P2 Tasks | Total |
|-------|----------|----------|----------|-------|
| Agent 1: Tools | 6 | 3 | 0 | 9 |
| Agent 2: CLI Surface | 3 | 5 | 4 | 12 |
| Agent 3: TUI Widgets | 2 | 4 | 3 | 9 |
| Agent 4: Agent Engine | 2 | 3 | 1 | 6 |
| **Total** | **13** | **15** | **8** | **36** |

---

## 8. Success Criteria

1. All P0 items implemented and tested
2. All P1 items implemented and tested
3. P2 items implemented where time permits
4. Every implementation cross-references amp source (逆向: comments)
5. Full test suite passes after all merges
6. `flitter` can start an interactive TUI session, use all core tools, switch modes, and manage threads
7. `flitter --execute` headless mode works for CI/scripting

---

## 9. Out of Scope

These amp features are excluded from this sweep:

- `painter` / `look_at` / `render_agg_man` — media/visual tools (mode-gated, niche)
- `slack_write` / `slack_read` — Slack integration (requires external service)
- `oracle` / `librarian` — specialized reasoning tools (mode-gated)
- `code_tour` — guided code tour (IDE-specific)
- JetBrains / Neovim / Zed IDE integrations — separate project
- DTW server-side implementation — requires cloud infrastructure
