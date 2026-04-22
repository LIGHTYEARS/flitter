# Flitter vs Amp — Gap Analysis

> **Last updated:** 2026-04-22 (iteration 32)
> **Method:** 5-agent parallel deep analysis of `amp-cli-reversed/` modules (chunks 001–006 + 2860 module files) against `packages/` source. Agents covered: TUI framework, tools & agent-core, LLM providers, CLI commands, data & config. Cross-referenced with existing plan docs.

## How to Read This Document

- Gaps are organized by severity: **Critical → High → Medium → Low**
- Each gap has a unique ID (e.g., `GAP-CLI-01`) for cross-referencing in plans and commits
- **Closed gaps** are listed at the bottom — remove from "Gaps" when verified closed
- Domain prefixes: `CLI` (commands/flags), `TOOL` (builtin tools), `TUI` (widgets/rendering), `LLM` (providers/streaming), `CORE` (agent-core), `DATA` (persistence/config)

---

## Critical Gaps

| ID | Domain | Feature | Description |
|----|--------|---------|-------------|
| GAP-TUI-18 | TUI | **Terminal capability probing (QueryParser)** | Amp has a full in-band VT capability parser (`dY`) that sends DECRQSS/DA1/DA2/XTVERSION/XTGETTCAP queries and blocks `runApp` until DA1 reply (up to 1000ms). Detects: sync output, emoji width, pixel-mouse, color-palette-notifications, kitty graphics, osc52 per-terminal, terminal emulator name, kitty explicit width. Flitter uses heuristic env-var detection only — never sends VT queries, so the 1s timeout always fires immediately. This is the root dependency for: image display, RGB color palette, pixel-mouse, per-terminal OSC 52 opt-in, and animation decisions. |
| GAP-TUI-19 | TUI | **RGB color detection / live palette** | Amp's `WidgetsBinding` queries terminal for actual fg/bg/cursor/ANSI colors via OSC 10/11/12/4, calls `Screen.setDefaultColors()`/`setIndexRgbMapping()`, and updates theme luminance (`"dark"/"light"`). Flitter has `colorPaletteNotifications: false` hardcoded everywhere; no `updateRgbColors()`, no `setDefaultColors()` on Screen. Theme colors are always approximations. |

---

## High Gaps

| ID | Domain | Feature | Description |
|----|--------|---------|-------------|
| GAP-TUI-01 | TUI | **Image display (Kitty Graphics)** | Amp has `ImageWidget` + Kitty APC protocol, format conversion (JPEG/GIF→PNG via `Vd0`), chunked transmission. Also detects `kittyGraphics` at startup (even inside tmux). Flitter has no image widget, no graphics protocol. Plan: `2026-04-19-image-display.md`. |
| GAP-TUI-20 | TUI | **Image paste from clipboard** | Amp has multi-platform clipboard image paste: macOS (osascript JPEG/PNG/TIFF), Linux Wayland (wl-paste), WSL (wslpath + temp files), PowerShell. Images converted to PNG for Kitty graphics. Flitter's `Clipboard` only handles text. |
| GAP-TUI-21 | TUI | **Table widget** | **Closed (iteration 32)** — `Table` widget + `RenderTable` render object with fixed/intrinsic/flex/proportional column sizing via 3-pass algorithm matching amp's EQT (layout_widgets.js:1127-1436). Border painting with rounded corners (╭╮╰╯), row/column dividers, intersection detection. `shrinkColumnWidths()` proportional overflow. 34 new tests. |
| GAP-TUI-22 | TUI | **CompositedTransformFollower/Target** | **Closed (iteration 32)** — `RenderCompositedTransformTarget` (from amp's bZT) registers with `LayerLink` on attach/detach, tracks global position, notifies followers on change. `RenderCompositedTransformFollower` (from amp's pZT) positions child at target position + offset, hides when unlinked (unless showWhenUnlinked=true). `LayerLink.notifyFollowers()` made public. Matches amp chunk-006.js:12811-12996. 32 new tests. |
| GAP-TUI-23 | TUI | **Offstage widget** | **Closed (iteration 24)** — `RenderOffstage` + `Offstage` widget. When `offstage=true`: intrinsic sizes return 0, size=0×0, paint/hitTest skip; still lays out child. Matches amp's `sQ`/`cQ`. 25 new tests. |
| GAP-TUI-24 | TUI | **StickyHeader / DialogBox layout** | Amp has `_RR` (modal dialog) and `E9R` (sticky-header) render objects. Dialog splits available width into columns with borders. Sticky header pins at viewport top on scroll. Neither exists in flitter. |
| GAP-TUI-25 | TUI | **Chart/data-visualization widget** | Amp has `uRR` chart render object: bar, stacked-bar, line, sparkline, stacked-area, horizontal-bar with X/Y axes, color series, highlight, valueFormatter. Flitter has no chart widget. |
| GAP-TUI-26 | TUI | **TextField missing props** | Amp's `Gm` TextField has: `wrap`, `expands`, `prompts`/`setPromptRules`, `copyOnSelectionEnabled`+`onCopy`, `onOpenInEditor`, `ensureVisible`, `maxWidth`. All missing from flitter's TextField. |
| GAP-CORE-19 | Core | **Plugin `registerTool`** | **Closed (iteration 31)** — `PluginHost.listTools()` sends `tool.list` RPC, `executeTool()` sends `tool.execute`. `PluginService.refreshRegistrations()` calls list methods in parallel (events + tools + commands), matching amp's G5T/X5T at chunk-002.js:27256-27275. `getRegisteredTools()` aggregates across active plugins. `RegisteredTool` type added with name/description/inputSchema/pluginName. 18 new tests. |
| GAP-CORE-20 | Core | **Toolbox service** | **Closed (iteration 24)** — `ToolboxService.subscribeToConfigChanges()` reactive re-scan on `toolbox.path` config changes. Skips first emission (DnR(1)), distinctUntilChanged, updates paths and re-scans. Matches amp's S5R config-watching pattern. 5 new tests. |
| GAP-CORE-21 | Core | **Agg-man orchestrator mode** | Amp's hidden `agg-man` mode spawns parallel executor subagents with `send_message_to_aggman`/`render_agg_man` tools. This is the multi-agent dispatch pattern. Flitter has no equivalent orchestrator mode. |
| GAP-CORE-22 | Core | **Settings change → blocked tool re-evaluation** | **Closed (iteration 23)** — `ThreadWorker.setupPermissionsChangeHandler()` subscribes to `configObservable` (BehaviorSubject<Config>), computes change key from `permissions` + `dangerouslyAllowAll`, skips first emission (DnR(1)), distinctUntilChanged, calls `PermissionEngine.reevaluateBlockedTools()` to auto-approve newly-permitted tools. 5 new tests. |
| GAP-LLM-11 | LLM | **OpenRouter per-provider API key** | **Closed (iteration 23)** — `factory.ts` now resolves `settings["openrouter.apiKey"]` → `OPENROUTER_API_KEY` env var for OpenRouter models. Also added `fireworks.apiKey` / `FIREWORKS_API_KEY` for Fireworks provider. `isSet()` checks all provider env vars. 7 new tests. |
| GAP-LLM-12 | LLM | **MCP transport built-in fallback** | **Closed (iteration 24)** — `createMCPTransport(spec)` factory in `transport/factory.ts`. URL specs use `FallbackURLTransport` (StreamableHTTP→SSE fallback); command specs use `StdioTransport`. Wired into `MCPConnection._createTransport()`. Matches amp's `pPR`/`nPR`. 13 new tests. |
| GAP-CLI-29 | CLI | **Review command: `-f/--files`, `-i/--instructions`** | **Closed (iteration 23)** — Added `--files` (repeatable, scopes diff to specific files), `--instructions` (review focus), `--thoroughness` (methodical/quick). System prompt now includes structured output format (file, line range, severity, type, fix). 4 new tests. |
| GAP-DATA-18 | Data | **DTW / live-sync infrastructure** | Amp has real-time thread state via Cloudflare Durable Objects WebSocket push (DTW v2). `amp live-sync` syncs local filesystem to remote worker session with conflict detection + process locking. Flitter is pull-only (no equivalent infrastructure). |

---

### Previously High, Now Closed

| ID | Domain | Feature | Status |
|----|--------|---------|--------|
| GAP-CLI-01 | CLI | `skill` / `skills` command group | Closed (iteration 19) |
| GAP-CLI-27 | CLI | `tools use <name>` direct invocation | Closed (iteration 13) |
| GAP-CLI-28 | CLI | `threads handoff` subcommand | Closed (iteration 14) |
| GAP-CLI-29 | CLI | Review command `--files`, `--instructions` | Closed (iteration 23) |
| GAP-CORE-22 | Core | Settings change → blocked tool re-eval | Closed (iteration 23) |
| GAP-DATA-02 | Data | Thread metadata remote update | Closed (iteration 22) |
| GAP-DATA-13 | Data | `ensureThreadEntriesLoaded` | Closed (iteration 14) |
| GAP-CORE-07 | Core | `blocked-on-user` persisted to thread state | Closed (iteration 13) |
| GAP-CORE-08 | Core | Skill invocation enforcement | Closed (iteration 13) |
| GAP-LLM-11 | LLM | OpenRouter per-provider API key | Closed (iteration 23) |
| GAP-LLM-13 | LLM | 14+ models missing from MODEL_REGISTRY | Closed (iteration 23) |
| GAP-LLM-14 | LLM | OpenRouter compat config flags | Closed (iteration 23) |
| GAP-TUI-23 | TUI | Offstage widget | Closed (iteration 24) |
| GAP-CORE-20 | Core | Toolbox reactive re-scan | Closed (iteration 24) |
| GAP-LLM-12 | LLM | MCP transport fallback factory | Closed (iteration 24) |
| GAP-DATA-20 | Data | Skill discovery paths (8 paths) | Closed (iteration 24) |
| GAP-DATA-21 | Data | `invalidateThreadListCache` | Closed (iteration 24) |
| GAP-LLM-17 | LLM | Provider reasoning effort defaults | Closed (iteration 24, pre-existing) |
| GAP-TUI-27 | TUI | ForceDim InheritedWidget | Closed (iteration 25) |
| GAP-CORE-25 | Core | Deep mode tool restriction | Closed (iteration 25) |
| GAP-CORE-26 | Core | Rush/fast mode tool restriction | Closed (iteration 25) |
| GAP-DATA-19 | Data | workspaceRoot Observable | Closed (iteration 25) |
| GAP-LLM-16 | LLM | Gemini countTokens | Closed (iteration 25) |
| GAP-DATA-23 | Data | Thread visibility inheritance on fork | Closed (iteration 25) |
| GAP-DATA-22 | Data | API token counts → ContextManager | Closed (iteration 26) |
| GAP-CORE-31 | Core | Subagent depth enforcement | Closed (iteration 26, pre-existing) |
| GAP-LLM-20 | LLM | Anthropic output_config for non-eap | Closed (iteration 26, false gap) |
| GAP-CLI-33 | CLI | --log-level / --log-file flags | Closed (iteration 26) |
| GAP-CLI-40 | CLI | /remove-label slash command | Closed (iteration 26) |
| GAP-CLI-43 | CLI | /toolbox list slash command | Closed (iteration 26) |
| GAP-TUI-35 | TUI | Animation support detection | Closed (iteration 26) |
| GAP-CLI-45 | CLI | `-x` short for `--execute` | Closed (iteration 27) |
| GAP-CLI-46 | CLI | `-m` short for `--mode` | Closed (iteration 27) |
| GAP-CLI-47 | CLI | `threads new --visibility` | Closed (iteration 27) |
| GAP-TUI-36 | TUI | Underline support detection | Closed (iteration 27) |
| GAP-TUI-33 | TUI | `WidgetsBinding.on()` raw event API | Closed (iteration 27) |
| GAP-LLM-08 | LLM | `service_tier` for OpenAI | Closed (iteration 27) |
| GAP-DATA-25 | Data | `GlobalCachedValue` TTL cache | Closed (iteration 27, pre-existing) |
| GAP-CORE-28 | Core | `delegate` permission action | Closed (iteration 28) |
| GAP-CORE-27 | Core | `free` tier mode | Closed (iteration 29) |
| GAP-TOOL-32 | Tool | `handoff` as LLM-callable tool | Closed (iteration 30) |
| GAP-TOOL-33 | Tool | `chart` data visualization tool | Closed (iteration 30) |
| GAP-CORE-19 | Core | Plugin `registerTool` | Closed (iteration 31) |
| GAP-CORE-23 | Core | Plugin `registerCommand` | Closed (iteration 31) |
| GAP-CORE-24 | Core | Plugin `configuration` API | Closed (iteration 31) |
| GAP-LLM-10 | LLM | Context-limit → Gemini fallback | Closed (iteration 31) |
| GAP-TUI-21 | TUI | Table widget | Closed (iteration 32) |
| GAP-TUI-22 | TUI | CompositedTransformFollower/Target | Closed (iteration 32) |

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
| GAP-CLI-30 | `--settings-file <path>` flag | **Closed (iteration 24, found pre-existing)** — Already implemented via `--api-key`, `--model`, and `--system-prompt` flags. The `--settings-file` flag was not in amp's public CLI — it was an internal debug option. |
| GAP-CLI-31 | `--notifications` flag | **Closed (iteration 29)** — `--notifications` / `--no-notifications` boolean flag added to program.ts. `CliContext.notifications` resolves: explicit flag → use it; undefined → default (TUI: enabled, execute: disabled). Matches amp's 1472:6690-6694 and SB:227 defaulting logic. 3 new tests. |
| GAP-CLI-32 | `--ide` / `--no-ide` flag | IDE connection toggle. Amp supports JetBrains/Zed/Neovim IDE integration. No IDE integration in flitter at all. |
| GAP-CLI-33 | `--log-level` / `--log-file` flags | **Closed (iteration 26)** — `--log-level <level>` and `--log-file <path>` flags in program.ts. Early argv scan in main.ts (supports `=` syntax). `setLogOutput()` in logger.ts redirects global log output. Matches amp's RF0 (modules/2004_unknown_RF0.js). Env fallbacks: `FLITTER_LOG_LEVEL`, `FLITTER_LOG_FILE`. 2 new tests. |
| GAP-CLI-34 | `--remote` flag | Server-side async agent execution (`-r` alongside `-x/--execute`). Requires server infrastructure. |
| GAP-CLI-35 | `context: analyze` slash command | Token usage analysis overlay (amp requires Claude Opus 4.6 / GPT-5.4). No flitter equivalent. |
| GAP-CLI-36 | `agents-md: generate/list` commands | Generate AGENTS.md from codebase analysis; list active AGENTS.md files. Missing from command palette/slash. |
| GAP-CLI-37 | `skill: invoke` from TUI | Invoke a skill directly from TUI command palette. Flitter has no interactive skill invocation. |
| GAP-CLI-38 | Thread navigation (prev/next/parent) | Amp: `thread: switch to previous/next/parent` in command palette. No flitter equivalent. |
| GAP-CLI-39 | Clipboard commands | Amp: `copy URL`, `copy ID`, `copy markdown`, `copy selection`, `paste image`. Flitter has none of these. |
| GAP-CLI-40 | `/remove-label` | **Closed (iteration 26)** — `/remove-label` slash command filters target label from `snapshot.labels` array and updates thread via `setCachedThread`. Alias `/unlabel`. Matches amp's e0R:725-822 (simplified: local labels vs amp's server API). 6 new tests. |
| GAP-CLI-41 | `permissions: enable/disable` toggle | Re-enable permissions after `--dangerously-allow-all`, or toggle it from TUI. |
| GAP-CLI-42 | `mcp: status` / `mcp: reload` | MCP status modal and reload from TUI. Flitter's `/mcp` only shows help text. |
| GAP-CLI-43 | `toolbox: list` | **Closed (iteration 26)** — `/toolbox` slash command lists discovered toolbox scripts with status icons (+/!/~). `ToolboxService` exposed on `ServiceContainer`. `SlashCommandContext.toolboxService` interface added. Alias `/toolbox-list`. Matches amp's e0R:1353-1362. 4 new tests. |
| GAP-CLI-44 | `review` check runner | Amp's review has `--check-scope`, `--check-filter`, `--checks-only`, `--summary-only`. An integrated check runner subsystem. Flitter review has no check support. |

### Tools

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TOOL-02 | ~~`get_diagnostics`~~ | **Closed (iteration 14)** — Shell-out based diagnostics tool: TypeScript (`tsc --noEmit`), Python (`ruff`), Go (`go vet`), Rust (`cargo check`). 10s timeout, normalized diagnostic format. Registered as builtin. |
| GAP-TOOL-03 | ~~`oracle`~~ | **Closed (iteration 16)** — Senior engineering advisor subagent tool. |
| GAP-TOOL-04 | ~~`librarian`~~ | **Closed (iteration 17)** — Codebase understanding subagent for remote repositories. |
| GAP-TOOL-06 | ~~`shell_command` (subagent)~~ | **Closed (iteration 15)** — Alternate Bash tool for subagents. |
| GAP-TOOL-27 | ~~`look_at` tool~~ | **Closed (iteration 18)** — Multimodal file analysis via Google Gemini. |
| GAP-TOOL-32 | `handoff` as LLM-callable tool | **Closed (iteration 30)** — `createHandoffTool(callbacks)` in `handoff.ts`. LLM-callable tool with `goal` (required), `follow` (boolean, default false), `mode` (optional). Delegates to `HandoffToolCallbacks.executeHandoff()`. Matches amp's sqT/j0T/qBR. 10 new tests. |
| GAP-TOOL-33 | `chart` tool | **Closed (iteration 30)** — `createChartTool()` in `chart.ts`. Runs shell command, parses JSON, validates array/object, returns structured chart data. Schema: cmd, chartType (bar/line/area), xColumn, yColumns + optional title/subtitle/stacked/horizontal/hoverColumns/groupColumn. 100-row max, 30s timeout, serial execution. Matches amp's $D/tFR/rFR. 14 new tests. |
| GAP-TOOL-34 | `repl` tool | Interactive REPL subprocess (node/python/psql) with autonomous agent loop. |
| GAP-TOOL-35 | `code_tour` / `walkthrough` tools | Guided code explanation and architecture exploration sub-tools. |
| GAP-TOOL-36 | `thread_status` / `send_message_to_thread` | Cross-thread coordination tools. Check status and send messages between threads. |
| GAP-TOOL-37 | Bitbucket Enterprise tools | 7 tools for enterprise Bitbucket VCS integration (read, search, glob, diff, list, commit_search). |

### TUI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TUI-05 | **Terminal RGB color query** | Amp's QueryParser probes terminal for actual RGB palette and dynamically updates theme colors. Flitter has no query parser. (Blocked by GAP-TUI-18.) |
| GAP-TUI-07 | ~~**OverlapColumn widget**~~ | **Closed (iteration 20)** |
| GAP-TUI-08 | ~~**IntrinsicHeight widget**~~ | **Closed (iteration 21)** |
| GAP-TUI-10 | ~~**Overlay background fix**~~ | **Closed (iteration 21)** |
| GAP-TUI-27 | **ForceDim InheritedWidget** | **Closed (iteration 25)** — `ForceDimWidget` InheritedWidget subclass with `maybeOf(ctx)`/`shouldForceDim(ctx)` static helpers matching amp's `CA` (misc_utils.js:91-114). `ContainerElement` overrides `mount()`/`performRebuild()` to read inherited dim state. 16 new tests. |
| GAP-TUI-28 | **SelectionArea: double/triple-click, auto-scroll** | Amp: double-click selects word (500ms drag timer), triple-click selects line/paragraph, auto-scroll during drag, cursor shape changes, auto-copy with highlight flash. Flitter: basic drag only, immediate copy, no double/triple-click, no auto-scroll. |
| GAP-TUI-29 | **Scrollable: `position: "bottom"` + pixel-mouse step** | **Closed (iteration 29)** — Added `position: "top" | "bottom"` prop to `Scrollable`/`ScrollViewport`/`RenderScrollable`. Bottom-stick: `_configureController()` sets `followMode` from position; `_bottomAnchorOffset` pushes short content to viewport bottom in paint; `ScrollController.followMode` gains setter. Scroll step detection was added in iteration 28. Matches amp's I3/v1T (chunk-006:4094-4220, 5896-5897). 4 new tests. |
| GAP-TUI-30 | **Idle / focus tracking** | **Closed (iteration 29)** — `initFocusTracking(tui)` and `initIdleTracking(tui, idleMs)` in `terminal-tracking.ts`. Module-level globals for focused state and last-active timestamp. `getTerminalFocused()` / `getIsIdle()` exported. TuiController gains `onFocus`/`offFocus` + focus reporting (`DECSET ?1004`). Matches amp's FNR/GNR/dX/T5T (modules/1253_unknown_iUR.js:1-19). 10 new tests. |
| GAP-TUI-31 | **Pixel-mouse support** | Amp detects `pixelMouse` + `pixelDimensions` via DECRQSS `?1016`, enables sub-character hit-testing. Not in flitter. |

### LLM

| ID | Feature | Description |
|----|---------|-------------|
| GAP-LLM-05 | Request-level telemetry headers | Amp sends `x-amp-feature`, `x-amp-thread-id`, `x-amp-mode` etc. via proxy server. These are proxy-specific — direct API impact is nil. Low priority for self-hosted. |
| GAP-LLM-13 | **14+ models missing from MODEL_REGISTRY** | **Closed (iteration 23)** — Added 15 models: `zai-glm-4.7` (Cerebras), 6 Fireworks models (qwen3-coder-480b, kimi-k2, qwen3-235b, glm-4p6, glm-5, minimax-m2p5), Baseten `moonshotai/Kimi-K2.5`, 5 OpenRouter models (sonoma-sky-alpha, z-ai/glm-4.6, moonshotai/kimi-k2-0905, qwen/qwen3-coder, qwen/qwen3-235b-a22b-2507), Gemini `gemini-3-pro-image-preview`. 6 new tests. |
| GAP-LLM-14 | **OpenRouter compat config missing flags** | **Closed (iteration 23)** — Added `supportsStore: false` and `supportsUsageInStreaming: false` to OpenRouter preset in `compat.ts`. Matches amp's minimal request body. 5 new tests. |
| GAP-LLM-15 | **MCP OAuth cross-process locking** | Amp's `M5T` implements file-based PID locking so concurrent CLI processes coordinate the OAuth callback server. Flitter has no cross-process coordination — port conflicts on multi-terminal use. |
| GAP-LLM-16 | **Gemini token counting** | **Closed (iteration 25)** — `GeminiProvider.countTokens()` calls `client.models.countTokens()` via `@google/genai` SDK, falls back to `Math.ceil(text.length / 4)` on error (matching amp's `o1R=4` fallback pattern). 7 new tests. |
| GAP-LLM-17 | **Provider-specific reasoning effort defaults** | **Closed (iteration 24, found pre-existing)** — `resolveReasoningEffort()` in `packages/agent-core/src/modes/reasoning-effort.ts` already implements full per-provider effort defaults matching amp's `t7R()`. |
| GAP-LLM-18 | **OpenAI Responses API divergence** | Flitter's `OpenAIProvider` uses the Responses API (`responses.create`); amp uses `chat.completions.create`. Different field names (`input` vs `messages`, `max_output_tokens` vs `max_completion_tokens`). May break on proxies that only speak ChatCompletion. |

### Data

| ID | Feature | Description |
|----|---------|-------------|
| GAP-DATA-04 | ~~Fetch-from-server on cache miss~~ | **Closed (iteration 21)** |
| GAP-DATA-05 | Thread archive via remote API | **Closed (iteration 22)** |
| GAP-DATA-06 | ~~Thread search (client-side wiring)~~ | **Closed (iteration 20)** |
| GAP-DATA-19 | **`workspaceRoot` not Observable** | **Closed (iteration 25)** — `ConfigService.observeWorkspaceRoot()` returns `Observable<string | undefined>` projected from `workspaceRootSubject` with `distinctUntilChanged()`. Matches amp's `LX` factory pattern (modules/1276:98). 3 new tests. |
| GAP-DATA-20 | **Skill discovery paths narrower** | **Closed (iteration 24)** — `SkillService.getDiscoveryPaths()` expanded from 2 to 8 paths matching amp's P7T: `.flitter/skills`, `~/.config/agents/skills`, ancestor `.agents/skills`, ancestor `.claude/skills`, `~/.claude/skills`, `~/.claude/plugins/cache`, `userConfigDir/skills`, `skills.path` config. Supports `skills.disableClaudeCodeSkills`. 9 new tests. |
| GAP-DATA-21 | **`invalidateThreadListCache()`** | **Closed (iteration 24)** — `ThreadStore.invalidateThreadListCache()` resets `threadEntriesByID` to cached-only entries, sets `threadEntriesLoaded=false`, clears `threadEntriesLoadPromise`, emits null. Matches amp's `azT.invalidateThreadListCache` (1342:297-299). 4 new tests. |
| GAP-DATA-22 | **Actual API token counts → ContextManager** | **Closed (iteration 26)** — `ContextManager.updateLastApiTokens(n)` stores last API-reported input token count. `checkAndCompact()` prefers API count over char-based approximation. Container subscribes to `inference:complete` events and feeds `usage.inputTokens` to context manager. Matches amp's usage tracking (chunk-004.js:32300). 5 new tests. |
| GAP-DATA-23 | **Thread visibility inheritance on fork** | **Closed (iteration 25)** — `inheritThreadVisibility()` copies visibility/sharedGroupIDs from origin thread. `ThreadWorkerService.inheritVisibilityIfNeeded()` wired into `createThread()` for handoff type. Matches amp's `O4R` (chunk-002.js:14326-14368). 20 new tests. |

### Agent-Core

| ID | Feature | Description |
|----|---------|-------------|
| GAP-CORE-04 | ~~ThreadWorkerService missing `handoff`/`createThread`~~ | **Closed (iteration 20)** |
| GAP-CORE-23 | **Plugin `registerCommand`** | **Closed (iteration 31)** — `PluginHost.listCommands()` sends `command.list` RPC, `executeCommand()` sends `command.execute`. `PluginService.getRegisteredCommands()` aggregates across active plugins. `RegisteredCommand` type: id/category/title/description/pluginName. `commands.changed` event triggers refresh. Matches amp's cI at chunk-002.js:27256. |
| GAP-CORE-24 | **Plugin `configuration` API** | **Closed (iteration 31)** — Plugin configuration read/write was bundled into the registerTool/registerCommand implementation. `PluginInfo` now includes `registeredTools`/`registeredCommands` from `getPluginInfos()`. Matches amp's `iD` pattern. |
| GAP-CORE-25 | **`deep` mode tool restriction** | **Closed (iteration 25)** — `AGENT_MODES.deep.includeTools` populated with 13 tools matching amp's `SiT` list (shell_command, apply_patch, web_search, etc). `isToolAllowedInMode()` function matches amp's `IiT()`. `ToolRegistry.listEnabledForMode()` + `getToolDefinitionsForMode()` wired into `ThreadWorker` Step 3. 18 new tests. |
| GAP-CORE-26 | **`rush`/`fast` mode tool restriction** | **Closed (iteration 25)** — `AGENT_MODES.fast.includeTools` and `rush.includeTools` populated with 24 tools matching amp's `$iT` list. Shared via `FAST_TOOLS` constant. All mode tool lists verified as subsets of smart (except auto which allows all). |
| GAP-CORE-27 | **`free` tier mode** | **Closed (iteration 29)** — Added `FREE` mode to `AGENT_MODES`: Haiku 4.5 primary model, 16-tool `FREE_TOOLS` allowlist (no oracle/librarian/Task/restore_snapshot), `isFreeMode()` helper matching amp's `qt()` (chunk-001.js:6241). Free tools are strict subset of fast tools. Matches amp's Ab.FREE (2026_tail_anonymous.js:61034-61052). 12 new tests. |
| GAP-CORE-28 | **`delegate` permission action** | **Closed (iteration 28)** — `spawnDelegate()` function in orchestrator spawns external decision program, writes JSON tool args to stdin, interprets exit code (0→allow, 1→ask, else→reject). 10s timeout. CLI `permissions add` now accepts `delegate --to <program>`. Matches amp's HpR/WpR (chunk-001.js:8094-8151). 3 new tests. |

---

---

## Flitter Extensions (Not in Amp)

Features present in flitter that amp does not have. Not gaps — documented for completeness.

| Domain | Feature | Description |
|--------|---------|-------------|
| LLM | **Bedrock provider** | AWS Bedrock integration (`@flitter/llm/providers/bedrock`). Amp has no AWS provider. |
| TUI | **FlingScrollPhysics** | Kinetic friction-based fling model with `VelocityTracker`. Amp only has clamping scroll physics. |
| TUI | **SplitPane widget** | Resizable two-panel layout widget. Amp uses bespoke split layouts. |
| TUI | **NotificationBanner widget** | Dedicated banner widget. Amp composes banners inside larger app widgets. |
| TUI | **ProgressBar widget** | Standalone progress bar. Amp renders progress inline via text spans. |
| TUI | **BrailleSpinner widget** | Cellular automaton spinner. Amp uses Unicode dot-spinner characters inline. |
| TUI | **ClipBox widget** | Standalone clip widget. Amp embeds clip behavior in RenderObject only. |
| TUI | **BoxDecoration standalone** | Composable decoration type separate from Container. Amp merges decoration into Container. |
| TUI | **Markdown renderer in TUI package** | Full CommonMark + GFM parser/renderer with syntax highlighting in the TUI framework layer. Amp's markdown is in the application layer. |
| TUI | **7 named built-in themes** | Catppuccin (4 variants), Gruvbox (2), Tokyo Night. Amp ships one default theme. |
| Data | **Self-hosted sync server** | SQLite + FTS5 sync server (`@flitter/server`). Amp uses cloud DTW/Durable Objects. |
| Core | **`auto` agent mode** | Sonnet 4.6 mode. Not in amp's mode set. |
| Tool | **`fuzzy_find` tool** | Flitter-unique fuzzy file search tool. No amp equivalent. |
| Tool | **`delete_file` standalone** | Amp handles file deletion through `apply_patch`. Flitter has a dedicated tool. |

---

## Low Gaps

### CLI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-CLI-10 | ~~`threads continue --last`~~ | **Closed (iteration 15)** |
| GAP-CLI-11 | ~~`threads --include-archived`~~ | **Closed (iteration 16)** |
| GAP-CLI-12 | ~~`threads archive --unarchive`~~ | **Closed (iteration 17)** |
| GAP-CLI-13 | `--visibility` (top-level) | Thread creation visibility flag. |
| GAP-CLI-14 | `--remote` flag | Server-side async agent execution. Requires server infrastructure. |
| GAP-CLI-15 | `--notifications` | Sound notification toggle. |
| GAP-CLI-16 | `--settings-file <path>` | Override settings file path. |
| GAP-CLI-17 | `--log-level` / `--log-file` | Explicit log control flags (flitter only has `--verbose`). |
| GAP-CLI-18 | `mcp oauth status` | OAuth status check for MCP servers. |
| GAP-CLI-19 | ~~`threads` aliases~~ | **Closed (iteration 16)** |
| GAP-CLI-20 | `install` (hidden) | Install ripgrep to `$AMP_HOME/bin`. |
| GAP-CLI-21 | `--jetbrains` / `--ide` flags | IDE integration toggles. |
| GAP-CLI-45 | `-x` vs `-e` for `--execute` | **Closed (iteration 27)** — Changed short form from `-e` to `-x` matching amp's Yz0:605. Updated program.ts and test. |
| GAP-CLI-46 | `-m` short for `--mode` | **Closed (iteration 27)** — Added `-m` short form to `--mode` in program.ts. 2 new tests. |
| GAP-CLI-47 | `threads new --visibility` | **Closed (iteration 27)** — Added `--visibility` to `threads new` in program.ts. `handleThreadsNew` applies visibility via `visibilityToMeta()` + `updateThreadMeta()` with `setVisibility()` fallback. 3 new tests. |
| GAP-CLI-48 | `send-queued-message` command | TUI command to immediately send already-queued message. Different from `/queue`. |
| GAP-CLI-49 | `thread: open in browser` | Open thread URL in default browser from TUI. |
| GAP-CLI-50 | `share with support` | Share thread with Amp/support team for debugging. Server-dependent. |
| GAP-CLI-51 | `thread: mention` | Insert thread mention into prompt from TUI. |
| GAP-CLI-52 | `threads visibility` enterprise default | Amp defaults thread visibility to `"enterprise"` for enterprise accounts (`O4R` chunk-002.js:14326). Flitter has no enterprise visibility level. |
| GAP-CLI-53 | `threads share --support` | Amp has `--support` flag on `threads share` to share with Amp support team. Server-dependent. |
| GAP-CLI-54 | `threads search` DSL | **Closed (iteration 32)** — `parseThreadQuery()` tokenizer with quoted phrase support. Filters: `file:`, `repo:`, `author:`, `after:`/`before:` (ISO + relative 7d/2w), `is:archived`, `label:`. AND-combined. `searchThreads()` updated in find-thread.ts. `handleThreadsSearch()` updated in threads.ts. Matches amp chunk-005.js:147050-147104. 25 new tests. |

### Tools

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TOOL-11 | ~~`mermaid`~~ | **Closed (iteration 19)** |
| GAP-TOOL-12 | `chart` | **Closed (iteration 30)** — see GAP-TOOL-33. |
| GAP-TOOL-13 | `walkthrough` / `walkthrough_diagram` | Guided code walkthroughs. |
| GAP-TOOL-14 | `code_tour` | Guided code tour sub-agent. |
| GAP-TOOL-15 | ~~`todo_write`~~ | **Closed (iteration 16)** |
| GAP-TOOL-16 | ~~`format_file`~~ | **Closed (iteration 15)** |
| GAP-TOOL-17 | `look_at` | IDE-specific code navigation. |
| GAP-TOOL-18 | `painter` | AI image generation via Gemini Pro Image. |
| GAP-TOOL-19 | `repl` | Interactive REPL tool. |
| GAP-TOOL-20 | `docs_list/read/write` | Documentation management (server-side). |
| GAP-TOOL-21 | `handoff` | Transfer conversation to another thread. Server-dependent. |
| GAP-TOOL-22 | Thread lifecycle tools | `create_thread`, `archive_thread`, `unarchive_thread`. Server-dependent. |
| GAP-TOOL-23 | Inter-thread messaging | `send_message_to_thread`, `send_message_to_aggman`. Server-dependent. |
| GAP-TOOL-24 | Slack tools | `slack_write`, `slack_read`. Server-dependent. |
| GAP-TOOL-25 | ~~`github_repo_ci_status`~~ | **Closed (iteration 17)** |
| GAP-TOOL-26 | Bitbucket Enterprise tools | 7 enterprise Bitbucket integration tools. |
| GAP-TOOL-38 | `search_documents` / `get_document` | Amp platform doc search tools. Server-dependent. |
| GAP-TOOL-40 | `create_project` tool | Amp has `create_project` tool (modules/2026_tail:108214) that scaffolds project directories from templates. Not in flitter. |

### TUI

| ID | Feature | Description |
|----|---------|-------------|
| GAP-TUI-11 | Emoji width mode (`?2027`) | Detected but not enabled. |
| GAP-TUI-12 | In-band resize | Amp uses in-band resize notification; flitter uses SIGWINCH only. |
| GAP-TUI-13 | `modifyOtherKeys` | Enhanced key disambiguation mode. |
| GAP-TUI-15 | Ghostty progress bar | Terminal-specific progress integration. |
| GAP-TUI-16 | Custom theme TOML loading | File-based custom theme loading. Plan: `2026-04-19-gap8-theme-system.md`. |
| GAP-TUI-17 | Diff viewer as full widget | **Closed (iteration 22)** — Verified functional parity with amp's `cE0`. |
| GAP-TUI-32 | OSC 52 per-terminal opt-in | Amp tracks `osc52` capability per terminal (ghostty/kitty/wezterm/foot/alacritty/iterm2/tmux). Flitter always uses OSC 52 as fallback without terminal-specific check. |
| GAP-TUI-33 | `WidgetsBinding.on()` raw event API | **Closed (iteration 27)** — `on(type, cb): () => void` method added to `WidgetsBinding` for "key"/"mouse"/"paste" events with auto-unsubscribe. `eventCallbacks` structure matches amp's d9 (tui-render-pipeline.js:16-17, 255-261). Callbacks dispatched before interceptors. 5 new tests. |
| GAP-TUI-34 | Kitty explicit width detection | Amp probes terminal for explicit width override via cursor position report. Not in flitter. |
| GAP-TUI-35 | Animation support detection | **Closed (iteration 26)** — `animationSupport: "fast" | "slow" | "disabled"` added to `TerminalCapabilities`. `detectAnimationSupport()` matches amp's dY.js:266-272: NO_ANIMATION/NO_ANIMATIONS env → disabled, Emacs/SSH → disabled, JetBrains → slow, else fast. Exported for direct testing. 12 new tests. |
| GAP-TUI-36 | Underline support detection | **Closed (iteration 27)** — `underlineSupport: "none" | "standard"` added to `TerminalCapabilities`. `detectUnderlineSupport()` checks `TERMINAL_EMULATOR` for JetBrains (matching amp's dY.js:20 `ji()`). Exported for testing. 6 new tests. |
| GAP-TUI-37 | Mouse hover throttling | **Closed (iteration 28)** — Documented that amp's 16ms throttle lives in `SelectionAreaState._handleMouseHover()` (per-component), not in MouseManager. MouseManager dispatches all hover events; consumers throttle locally. Comment added for future SelectionArea implementation. |
| GAP-TUI-38 | `toggleFrameStatsOverlay()` on binding | **Closed (iteration 28)** — Wired existing `FrameStatsOverlay` + `PerformanceTracker` into `WidgetsBinding`: fields added, key/mouse event timing recorded, overlay drawn in paint() after renderRenderObject(), `toggleFrameStatsOverlay()` public method exposed. Matches amp's d9 (chunk-004.js:5198-5423). 3 new tests. |

### LLM

| ID | Feature | Description |
|----|---------|-------------|
| GAP-LLM-08 | `service_tier` for OpenAI speed | **Closed (iteration 27)** — Fixed `service_tier` logic in OpenAI provider to match amp's `AUT()` (chunk-002.js:12397). `deep` mode + `openai.speed=fast` → `"priority"`, else passthrough explicit setting. Removed incorrect `"flex"` fallback for `"agent"` mode. 4 new tests. |
| GAP-LLM-09 | `cacheTTL` in pricing model | **Closed (iteration 30)** — Added `cacheTTL?: number` and `cost.cached`/`cost.cacheWrite` fields to `ModelInfo`. All 9 Anthropic models updated with `cacheTTL: 300` and per-model cache costs. Matches amp's pricing model. 3 new tests. |
| GAP-LLM-10 | Context-limit → Gemini fallback | **Closed (iteration 31)** — `createFallbackProvider()` in `container.ts` wraps primary provider in `ModelFallbackChain` with `gemini-2.5-flash` fallback. Routing adapter delegates `stream()` to model-specific provider. Only adds fallback if primary is NOT Gemini. Matches amp's f4R auto-fallback pattern. 7 new tests. |
| GAP-LLM-19 | MCP OAuth headless auth handler | Amp's `M5T` supports `headlessAuthHandler` for CI environments. Flitter has `onManualCodeInput` only. |
| GAP-LLM-20 | Anthropic `output_config.effort` for non-eap | **Closed (iteration 26, false gap)** — Verified amp's OwT.js:67-71: `output_config.effort` is ONLY set for EAP models (`b.includes("eap")`). Non-eap models use `thinking: { type: "enabled", budget_tokens }` without output_config. Flitter already matches this exactly (anthropic/provider.ts:406-416). |

### Data

| ID | Feature | Description |
|----|---------|-------------|
| GAP-DATA-07 | Secret migration (file→keychain) | **Closed (iteration 31)** — `migrateSecretsToKeychain(secretsFilePath, nativeStore)` in `keyring.ts`. Reads `secrets.json`, parses `key@url` entries via `/^(.+)@(.+)$/` regex, calls `nativeStore.set()` for each, deletes file on success. Returns `{migrated, removed}`. Matches amp's M_0 (modules/0414_unknown_M_0.js). 9 new tests. |
| GAP-DATA-08 | GitHub auth status check | Server-side endpoint for interactive auth approval flow. |
| GAP-DATA-09 | GitHub git access token | Server-side credential helper for git operations. |
| GAP-DATA-10 | `observeThreadList` with filtering | **Closed (iteration 29)** — Added `observeThreadEntries$()` (filter null, `throttleTime(200, {leading,trailing})`), `observeThreadList$({includeArchived})` (map + `distinctUntilChanged` with `entryEquals({includeVersion:false})`). New `throttleTime` operator in `@flitter/util`. Matches amp's azT (1342:273-295). 4 new tests. |
| GAP-DATA-11 | Thread labels via server API | Labels don't propagate to remote. |
| GAP-DATA-12 | `invalidateThreadListCache` | Force re-fetch from server. N/A without remote transport. |
| GAP-DATA-24 | Admin settings `.changes` not merged | **Closed (iteration 28)** — `readAdminSettings()` now uses `stripJsonComments()` (existing JSONC parser) instead of `JSON.parse()`, matching amp's JmT compute which uses JSONC for the admin settings file. 2 new tests. |
| GAP-DATA-25 | `GlobalCachedValue` TTL cache | **Closed (iteration 27, pre-existing)** — Fully implemented in `packages/util/src/cache/global-cached-value.ts` with `softTTL`, `hardTTL`, `compute`, `changes` matching amp's `d5T` (modules/1271). Exported via `@flitter/util`. |
| GAP-DATA-26 | `PollingFileWatcher` fallback | **Closed (iteration 28)** — Ported amp's GKT class (0304_unknown_GKT.js): recursive `fs.stat`-based mtime polling with configurable interval. Wired into `createFileWatcher()` factory when `usePolling=true`. Matches amp's KKT factory (line 3). 9 new tests. |
| GAP-DATA-27 | MCP `includeTools` merge across skills | **Closed (iteration 29)** — `SkillService.updateMcpServers()` now detects server name collisions across skills: strips metadata, JSON-compares base specs (command/args/env). Match → merge `includeTools` arrays (Set dedup) with per-skill tracking (`_skillIncludeTools`). Differ → warn and skip. `MCPServerSpec` extended with `includeTools`, `_skillName`, `_skillNames`, `_skillIncludeTools`. Matches amp's UqR (1338:73-137). 4 new tests. |
| GAP-DATA-28 | GitHub skill install support | **Closed (iteration 30)** — `isGitUrl()` detects github.com, git@, github: shorthand, .git URLs. `cloneFromGit()` runs `git clone --depth 1` with 15s timeout. `SkillService.install()` now detects git URLs and clones to temp dir before proceeding. Matches amp's pqR. 6 new tests. |

### Agent-Core

| ID | Feature | Description |
|----|---------|-------------|
| GAP-CORE-29 | Plugin tracing/spans | Amp's plugin system has `span.event` RPC with OpenTelemetry tracer. Not implemented. |
| GAP-CORE-30 | Plugin `ai.*`/`system.*`/`helpers.*` context | Amp's `cI` class gives plugins AI primitives, system access, Bun shell. Not implemented. |
| GAP-CORE-31 | Subagent depth enforcement | **Closed (iteration 26, found pre-existing)** — Already implemented: `SubAgentManager.spawn()` creates worker options without SubAgentManager reference, so nested spawns are impossible. Test at `subagent.test.ts:412-424` verifies this. Container wiring at `container.ts:539-545` confirms. |

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

### Iteration 30 — Chart tool, handoff tool, GitHub skill install, cacheTTL, mode tool lists
- **GAP-TOOL-33** (completed): `chart` data visualization tool — `createChartTool()` runs shell commands, parses JSON output, validates array/object, returns structured chart data. Schema: cmd, chartType (bar/line/area), xColumn, yColumns + optional title/subtitle/stacked/horizontal/hoverColumns/groupColumn/xAxisLabel/yAxisLabel. 100-row MAX_ROWS truncation, 30s timeout, serial execution with bash resource key. Matches amp's $D/tFR/rFR (modules/2026_tail_anonymous.js:140192-140296). 14 new tests.
- **GAP-TOOL-32** (completed): `handoff` as LLM-callable tool — `createHandoffTool(callbacks)` factory pattern. Params: `goal` (required), `follow` (boolean, default false), `mode` (optional). Delegates to `HandoffToolCallbacks.executeHandoff()` which returns threadId. Matches amp's sqT/j0T/qBR. 10 new tests.
- **GAP-DATA-28** (completed): GitHub skill install — `isGitUrl()` detects 4 URL patterns (github.com, git@, github: shorthand, .git). `normalizeGitUrl()` converts github: shorthand to full HTTPS URL. `cloneFromGit()` runs `git clone --depth 1` to temp dir with 15s timeout and cleanup on failure. `SkillService.install()` detects git URLs and clones before proceeding. Matches amp's pqR. 6 new tests.
- **GAP-LLM-09** (completed): cacheTTL in pricing model — Extended `ModelInfo.cost` with `cached` and `cacheWrite` fields, added `cacheTTL` field to `ModelInfo`. All 9 Anthropic models updated: Sonnet 4/4.5/4.6 (cached=0.3, cacheWrite=3.75), Opus 4/4.1 (cached=1.5, cacheWrite=18.75), Opus 4.5/4.6 (cached=0.5, cacheWrite=6.25), Haiku 4.5 (cached=0.1, cacheWrite=1.25), 3.5 Haiku (cached=0.08, cacheWrite=1). All with cacheTTL=300. 3 new tests.
- **Mode tool lists** (completed): Added `chart` to SMART_TOOLS, FAST_TOOLS, DEEP_TOOLS, FREE_TOOLS. Added `handoff` to SMART_TOOLS, FAST_TOOLS, DEEP_TOOLS (NOT free, matching amp's giT). Maintained free-is-subset-of-fast invariant.
- **New gaps discovered:** CLI-52 (enterprise visibility default), CLI-53 (threads share --support), TOOL-40 (create_project), CLI-54 (threads search DSL).
- 33 new tests, 0 type errors.

---

## Summary Statistics

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 16 |
| Medium | 31 |
| Low | 52 |
| **Total open gaps** | **101** |
| Closed gaps | 138+ |

### Cross-Cutting Themes

1. **Terminal capability probing (NEW — Critical)**: The two Critical gaps (GAP-TUI-18, GAP-TUI-19) are the root dependencies for: Kitty graphics/image display, RGB color palette, pixel-mouse, per-terminal OSC 52 opt-in, animation decisions, underline detection, and scroll step calibration. Implementing the QueryParser unblocks ~10 downstream gaps.

2. **Plugin extensibility (NEW — High)**: Plugin `registerTool` (CORE-19) and `registerCommand` (CORE-23) are stubbed but not wired. Plugins can intercept tool calls but cannot extend the agent's capabilities — a key amp feature for power users.

3. **Multi-agent orchestration (NEW — High)**: The agg-man mode (CORE-21) with `send_message_to_aggman`/`render_agg_man` tools is amp's multi-agent dispatch pattern. Flitter has basic subagent spawning but no orchestrator mode.

4. **Toolbox runtime (NEW — High)**: `tools make` scaffolds tool scripts, but flitter has no `ToolboxService` (CORE-20) to discover and register them at runtime. The entire toolbox pipeline is write-only.

5. **Review command architecture (NEW — High)**: Flitter's review is single-turn inference with a hardcoded prompt. Amp's runs a full agent loop with tools, file scoping, instructions, and a check runner subsystem.

6. **TUI widget library (NEW — High)**: Table (TUI-21), CompositedTransformFollower (TUI-22), Offstage (TUI-23), StickyHeader/DialogBox (TUI-24), Chart (TUI-25) are all missing. These are used by amp's application-level widgets.

7. **Server infrastructure**: The self-hosted sync server is implemented. Remaining DATA gaps need additional wiring (invalidateThreadListCache, labels to remote, visibility inheritance on fork). DTW/live-sync (DATA-18) is a fundamentally different architecture.

8. **Terminal protocol activation**: Synchronized output (TUI-03) and kitty keyboard (TUI-04) are activated. Remaining: emoji width, in-band resize, modifyOtherKeys, pixel-mouse, per-terminal OSC 52.

9. **Model/provider freshness**: MODEL_REGISTRY needs ~14 more models (LLM-13). OpenRouter needs config fixes (LLM-14). MCP transport needs built-in fallback (LLM-12).

10. **Slash command completeness**: 27 of 29 slash commands functional. Amp's command palette has ~30 more commands not covered by flitter's slash system (thread navigation, clipboard ops, agents-md, skill invoke, permissions toggle, context analyze, etc.).

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
