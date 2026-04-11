# Amp CLI — First-Party Module Analysis

> Reverse-engineered from `amp` binary. Modules built by Sourcegraph's Amp team (not third-party).
> Generated: 2026-04-11

## Summary

| Layer | Directory | Modules | Total Lines |
|-------|-----------|---------|-------------|
| Application Core | `app/` | 20 | ~58,243 |
| TUI Framework | `framework/` | 10 | ~26,243 |
| Infrastructure | `util/` | 9 | ~27,869 |
| Internal ESM | `vendor/esm/` (non-npm) | ~100 substantive + ~99 init stubs | — |
| **Total** | | **~238** | — |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      CLI Entry Points                        │
│  cli-commander-system.js (6228L) · cli-entrypoint.js (1494L) │
└──────────┬────────────────────────────┬──────────────────────┘
           │                            │
    ┌──────▼──────────┐      ┌──────────▼──────────┐
    │  Agent Core     │      │  TUI Framework      │
    │  ThreadWorker   │      │  Flutter-for-Terminal│
    │  ToolOrchestrator│     │  Widget→Element→     │
    │  PromptRouter   │      │  RenderObject tree   │
    └──────┬──────────┘      └──────────┬──────────┘
           │                            │
    ┌──────▼──────────────────────────────────────────┐
    │               Integration Layer                  │
    │  LLM SDKs (Anthropic·OpenAI·Gemini·xAI·Cerebras)│
    │  MCP Protocol · OAuth · IDE Bridge · Git         │
    └──────┬──────────────────────────────┬────────────┘
           │                              │
    ┌──────▼──────────┐      ┌────────────▼──────────┐
    │  Data Layer     │      │  Utilities            │
    │  ThreadStore    │      │  FileScanner · Keyring│
    │  ConfigService  │      │  OTel · Streams · URI │
    │  SkillService   │      │  Validation · i18n    │
    └─────────────────┘      └───────────────────────┘
```

---

## 1. Application Core — `app/` (20 modules)

### 1.1 Entry Points

#### cli-commander-system.js — CLI Command Tree & Thread Pool
- **Lines**: 6,228
- **Purpose**: Defines the complete `amp` CLI command tree using Commander.js. Implements all subcommands (`mcp add/remove/list/doctor/approve`, `permissions list/test/edit/add`, `plugins list/exec`, `review`), the interactive REPL command processor, thread pool harness creation (standard and DTW-backed), MCP server trust approval workflows, and thread visibility management.
- **Key Strings**: `"amp mcp add"`, `"amp permissions list"`, `"DTW thread pool harness is only available for Amp employees"`, `"cli-tui-"`
- **Architecture Role**: **Entry point** — main CLI command registration and dispatch

#### cli-entrypoint.js — Headless Stream-JSON Mode
- **Lines**: 1,494
- **Purpose**: Implements the non-interactive/headless execution mode. Drives a complete agent session: sends user input, subscribes to thread state via RxJS, emits structured JSON events to stdout (`system/init`, `user/message`, `assistant/message`, `tool/call`, `result`), manages stdin streaming, and handles SIGINT/SIGTERM graceful shutdown.
- **Key Strings**: `"type": "system"`, `"subtype": "init"`, `"stream JSON mode is not permitted with '${p}' mode"`
- **Architecture Role**: **Entry point** — headless/CI execution driver

---

### 1.2 Agent Core

#### tool-execution-engine.js — ThreadWorker & Tool Orchestrator
- **Lines**: 3,597
- **Purpose**: The central orchestrator for a single thread's lifecycle. The `ThreadWorker` class handles user message processing (with snapshot creation, skill injection, guidance file discovery), inference triggering, the tool_use → tool_result execution cycle, message edit cleanup, retry logic, and the complete agent turn loop. Coordinates parallel tool execution, cancellation, user approval, and the inference-tools-inference cycle.
- **Key Strings**: `"user:message"`, `"assistant:message"`, `"tool:data"`, `"tool:processed"`, `"blocked-on-user"`, `"idle"`, `"streaming"`, `"experimental.autoSnapshot"`, `"handoffThreadID"`
- **Architecture Role**: **Core logic** — main agent execution engine

#### prompt-routing.js — System Prompt Generator
- **Lines**: 132
- **Purpose**: Generates system prompts for different agent modes. Contains the "aggman" (aggregator/manager) orchestrator prompt for managing execution threads and Slack workflows, and the default "smart" agent prompt defining Amp's engineering personality ("You are Amp. You and the user share the same workspace").
- **Key Strings**: `"You are Amp"`, `"You are a pragmatic, effective software engineer"`, `"YAGNI"`, `"rg is much faster than alternatives like grep"`, `"multi_tool_use.parallel"`
- **Architecture Role**: **Core logic** — system prompt templates

#### prompt-classification.js — Hook System & Skill Loading
- **Lines**: 619
- **Purpose**: Implements the hook/plugin system for tool lifecycle events (`tool:pre-execute`, `tool:post-execute`, `assistant:end-turn`). Hooks can send user messages, redact tool inputs, or trigger handoffs. Loads SKILL.md files, performs `{{arguments}}` template substitution, attaches MCP and builtin tool schemas, and wraps in XML tags for LLM consumption.
- **Key Strings**: `"compatibilityDate"`: `"2025-05-13"`, `"tool:pre-execute"`, `"tool:post-execute"`, `"SKILL.md"`, `"<loaded_skill"`
- **Architecture Role**: **Core logic** — hook execution + skill injection

#### cli-command-router.js — Tool Lifecycle Hooks
- **Lines**: 732
- **Purpose**: Contains the hook processing system for tool lifecycle events and skill content loading/formatting. Validates hooks by `compatibilityDate`, matches hooks by tool name and input patterns, executes hook actions. Generates example tool inputs from JSON Schema for documentation.
- **Architecture Role**: **Core logic** — tool hooks (companion to prompt-classification)

---

### 1.3 Tool System

#### tool-permissions.js — Tool Registry & Permission Matching
- **Lines**: 675
- **Purpose**: Manages the registry of available tools, handles enable/disable based on settings (`tools.enable`, `tools.disable`), normalizes tool names/arguments (e.g., `ShellCommand` → `Bash`), filters by JSON schemas, and matches tool names against glob patterns via picomatch. Provides the tool approval request/resolution system.
- **Key Strings**: `"tools.disable"`, `"tools.enable"`, `"mcp__"`, `"builtin:"`, `"toolbox:"`, `"ShellCommand"` → `"Bash"`
- **Architecture Role**: **Core logic** — tool registry and permission engine

#### html-sanitizer-repl.js — REPL Tool & Code Review
- **Lines**: 2,774
- **Purpose**: Implements the REPL tool (spawns interactive subprocess REPLs like Python/Node.js with LLM-driven interaction loops) and the code review tool (invokes review with diff descriptions, runs automated checks, generates summaries via Claude, formats review comments with severity levels). Also contains JSON file-based key-value storage for thread persistence.
- **Key Strings**: `"REPL: Spawning process"`, `"REPL output buffer overflow"`, `"Analyzing diff..."`, `"Running checks..."`, `"Reviewing..."`, `".amptmp"`
- **Architecture Role**: **Core logic** — REPL + code review tools

---

### 1.4 LLM Integration

#### llm-sdk-providers.js — Multi-Provider LLM SDK
- **Lines**: 10,232 (largest module)
- **Purpose**: Contains complete SDK implementations for multiple LLM providers: Anthropic SDK (request building, retry, streaming, auth), Google Vertex AI / Gemini SDK (text/image/video generation), OpenAI Responses API adapter (streaming event → internal message format). Converts internal thread messages to each provider's format (tool_use/tool_result, thinking blocks, images, guidance files).
- **Key Strings**: `"https://api.anthropic.com"`, `"anthropic-version": "2023-06-01"`, `"gpt-5-codex"`, `"kimi-k2"`, `"<ENCRYPTED>"`
- **Architecture Role**: **Integration** — multi-model LLM inference

#### mcp-tools-integration.js — Anthropic SDK Client & Tool Loop
- **Lines**: 3,234
- **Purpose**: Contains the Anthropic API client class with HTTP request building, retry logic with exponential backoff, streaming, auth (API key + Bearer), idempotency headers, timeout management, and structured output parsing. Also includes the promise-based auto-run tool execution loop.
- **Key Strings**: `"X-Api-Key"`, `"X-Stainless-Retry-Count"`, `"Streaming is required for operations that may take longer than 10 minutes"`, `"Error: Tool '${e.name}' not found"`
- **Architecture Role**: **Integration** — Anthropic API client

---

### 1.5 MCP & Transport

#### mcp-transport.js — MCP Stdio/SSE Transport
- **Lines**: 1,309
- **Purpose**: Implements MCP protocol transports (stdio: spawns child processes with JSON-RPC over stdin/stdout; SSE: Server-Sent Events for HTTP-based servers). Manages server lifecycle (start, stop, restart, health monitoring), capability negotiation, tool/prompt/resource listing.
- **Key Strings**: `"mcp://"`, `"tools/list"`, `"prompts/list"`, `"initialize"`, `"notifications/initialized"`, `"ping"`
- **Architecture Role**: **Integration** — MCP protocol transport

#### oauth-auth-provider.js — OAuth 2.0 for MCP
- **Lines**: 1,699
- **Purpose**: Complete OAuth 2.0 flow for MCP server authentication. Handles protected resource metadata discovery (`/.well-known/oauth-protected-resource`), authorization server metadata, dynamic client registration, PKCE challenge/verification, authorization code exchange, and refresh token rotation.
- **Key Strings**: `"/.well-known/oauth-protected-resource"`, `"MCP-Protocol-Version"`, `"AUTHORIZED"`, `"REDIRECT"`, `"code_challenge_methods_supported"`
- **Architecture Role**: **Integration** — OAuth authentication

#### rpc-protocol-layer.js — DTW WebSocket & File Detection
- **Lines**: 9,265
- **Purpose**: Multi-concern module: (1) file-type/MIME detector for 100+ formats by magic bytes; (2) OpenAI Responses API streaming event handler; (3) Oracle system prompt generator; (4) environment description builder for system prompts; (5) CBOR encoder/decoder for DTW binary wire protocol; (6) OpenTelemetry span serialization; (7) DTW WebSocket transport with reconnection, ping/pong keepalive, and binary message framing.
- **Key Strings**: `"You are the Oracle"`, `"ws:"`, `"wss:"`, `"/threads"`, `"amp"` (WebSocket subprotocol), `"dtw-transport"`
- **Architecture Role**: **Integration** — WebSocket transport + file detection + OpenAI adapter

#### realtime-sync.js — DTW Thread Sync Engine
- **Lines**: 2,175
- **Purpose**: Implements the Durable Thread Worker (DTW) protocol for real-time thread synchronization. Applies deltas to local thread state, streams assistant message blocks, merges tool results, processes edits/truncation, manages queued messages, and maintains DTW-to-local message ID mapping.
- **Key Strings**: `"message_edited"`, `"delta"`, `"message_added"`, `"tool_progress"`, `"agent_state"`, `"thread_title"`, `"error_notice"`
- **Architecture Role**: **Core logic** — real-time state synchronization

---

### 1.6 State & Configuration

#### session-management.js — Thread Store & Trust Manager
- **Lines**: 2,345
- **Purpose**: Thread persistence layer (ThreadStore) managing cached threads, entries, dirty tracking, and remote sync. MCP server trust management (approve/deny workspace servers). Device fingerprinting, ripgrep binary download, file watching for guidance files with glob resolution, YAML front-matter parsing.
- **Key Strings**: `"amp.mcpTrustedWorkspaces"`, `"v1:fp_"`, `"ripgrep is not installed and could not be downloaded"`, `"AGENTS.md guidance budget exceeded"` (32768 byte budget)
- **Architecture Role**: **Data layer** — persistence + trust + guidance files

#### claude-config-system.js — Settings & Configuration Service
- **Lines**: 1,604
- **Purpose**: Settings system managing `settings.json` / `settings.jsonc` from global and workspace scopes. JSON/JSONC parsing with comment support, atomic file writes, settings merging, MCP server config merging, headless PID file management, and ripgrep binary discovery/download.
- **Key Strings**: `"settings.json"`, `"settings.jsonc"`, `".amp/settings.json"`, `"~/.config/amp/settings.json"`, `"https://storage.googleapis.com/amp-public-assets-prod-0/ripgrep/"`
- **Architecture Role**: **Data layer** — configuration management

#### skills-agents-system.js — Skill Service & Thread Entry Model
- **Lines**: 3,393
- **Purpose**: Skill discovery, loading, and management. Scans skill directories (workspace `.agents/skills/`, project `.amp/skills/`, global `~/.config/amp/skills/`), reads SKILL.md with YAML front-matter, resolves paths, manages install/remove, watches for changes. Also contains ThreadEntry data model and ThreadStore class.
- **Key Strings**: `".agents/skills"`, `".amp/skills"`, `"~/.config/amp/skills"`, `"SKILL.md"`, `"public_discoverable"`, `"thread_workspace_shared"`
- **Architecture Role**: **Data layer** — skill management + thread entries

---

### 1.7 UI Components

#### permission-rule-defs.js — TUI Command Palette & Message Renderer
- **Lines**: 6,415
- **Purpose**: Implements the TUI command registry/palette (add-label, remove-label, toggle-thinking-blocks, open-in-editor, queue/dequeue prompts) and the thread message rendering pipeline. Converts thread items (tool results, assistant messages) into dense UI widgets: activity groups, bash output, file edits, code reviews, apply-patches, skill invocations.
- **Key Strings**: `"add-label"`, `"toggle-thinking-blocks"`, `"editor"` (open in $EDITOR), keyboard shortcuts: `alt+t`, `ctrl+g`, render types: `"bash"`, `"edit-file"`, `"create-file"`, `"skill"`, `"code-review"`
- **Architecture Role**: **UI** — command palette + message rendering

#### conversation-ui-logic.js — OAuth Callback & DTW Observer
- **Lines**: 324
- **Purpose**: OAuth callback server for CLI login (local HTTP server receiving auth codes), terminal prompt utilities (confirm, question), and DTW client-side observer for real-time thread state (deltas, tool progress, agent state, queued messages).
- **Key Strings**: `"CLI Connected"`, `"Amp CLI Login Error"`, `"When prompted, paste your code here: "`, `"/api/durable-thread-workers"`
- **Architecture Role**: **UI** — login flow + thread observation

#### process-runner.js — Terminal Emulator & Self-Update
- **Lines**: 3,935
- **Purpose**: Full VT/ANSI terminal state parser and emulator, CJK/emoji character width calculation, grapheme segmentation, string measurement/truncation. Also the self-update system: binary download from `cdn.ampcode.com`, SHA-256 verification, atomic binary replacement, package manager detection (npm/pnpm/yarn/bun/brew).
- **Key Strings**: `"https://cdn.ampcode.com/"`, `"@sourcegraph/amp"`, `"ampcode/tap/ampcode"`, VT states: ground, escape, csi_entry, osc_string
- **Architecture Role**: **Core logic** — terminal rendering + self-update

---

## 2. TUI Framework — `framework/` (10 modules)

> Amp implements a **Flutter-for-Terminal** framework with a Widget → Element → RenderObject three-tree architecture.

### 2.1 Foundation Layer

#### tui-widget-framework.js — Terminal Parser, Renderer & RenderObject Base
- **Lines**: 2,598
- **Purpose**: Core framework foundation. VT/ANSI terminal parser (`utT`) with full escape sequence state machine (CSI, OSC, DCS, APC), UTF-8 grapheme clustering, bracket paste, mouse events, Kitty keyboard protocol. ANSI Renderer (`ktT`) generating escape sequences from cell diffs. Screen buffer management. `RenderObject` base class (`vH`) with parent/child management, layout/paint dirty flags, depth tracking, and full adopt/drop/replace lifecycle.
- **Design Pattern**: State Machine (VT parser) + RenderObject Tree (Flutter's `RenderObject`)
- **Pipeline Role**: **Foundation** — lowest-level primitives

#### tui-render-pipeline.js — WidgetsBinding, TextStyle, TextSpan & Selection
- **Lines**: 783
- **Purpose**: The pipeline binding layer. `WidgetsBinding` (`d9`) connects TUI, frame scheduler, build owner, pipeline owner, focus manager, mouse manager, and root element. Implements `runApp()` and frame lifecycle (beginFrame → paint → render). `TextStyle` (immutable style), `TextSpan` (rich text tree), `EdgeInsets` (padding), `SelectionArea` (cross-widget text selection with copy-to-clipboard). ANSI-to-TextSpan parser.
- **Design Pattern**: Flutter WidgetsBinding + Composite (TextSpan) + Mediator (SelectionArea)
- **Pipeline Role**: **The pipeline itself** — `runApp()` entry point

---

### 2.2 Pipeline Orchestration

#### tui-layout-engine.js — Frame Scheduler & Build Owner
- **Lines**: 1,193
- **Purpose**: Frame scheduling and build pipeline orchestration. `FrameScheduler` (`k8`) manages ~16ms frame pacing, executes build→layout→paint→render phases, handles post-frame callbacks. `BuildOwner` (`YXT`) tracks dirty elements, sorts by depth, triggers rebuilds. `PerformanceTracker` (`QXT`) collects P95/P99 stats for frame times, phase durations, key/mouse latencies. Debug overlay with "Gotta Go Fast" real-time metrics.
- **Design Pattern**: Game Loop / Frame Scheduler + Dirty Flag Pattern
- **Pipeline Role**: **Engine heartbeat** — drives the entire pipeline

---

### 2.3 Application Widgets

#### tui-widget-library.js — Text Editor, Theme & Activity Pipeline
- **Lines**: 3,400
- **Purpose**: High-level component library. `TextEditingController` — full-featured text editor model with cursor movement, selection, delete operations, kill buffer, layout-aware wrapping, grapheme-aware indexing. `AppColorScheme` (`yS`) — 40+ semantic color definitions. `AppTheme` (`Xa`). Tool activity classification pipeline (message → structured entries → grouped activities with bash/edit/read/search categories).
- **Design Pattern**: MVC (TextEditingController) + Pipeline (activity classifier) + Composition (theme)
- **Pipeline Role**: **Data models & theme**

#### tui-thread-widgets.js — Thread UI, Handoff & Charts
- **Lines**: 3,167
- **Purpose**: Feature-specific widgets. Deep reasoning hint overlay with shimmer/particle animations. `HandoffManager` (`qTR`) for thread handoff workflow. Cross-platform image paste (macOS/Wayland/X11/Windows). Braille spinner. Command registration (share, set-visibility). Chart rendering (bar, line, sparkline, stacked area) with monotonic cubic spline interpolation. Console log interceptor.
- **Design Pattern**: State Machine (hint overlay) + Particle System + Observer
- **Pipeline Role**: **Application-layer widgets**

#### activity-feed-ui.js — Activity Feed View Builder
- **Lines**: 227
- **Purpose**: Renders the conversation thread's activity feed. Implements dense "activity group" collapsible views that group tool runs (reads/searches/explores/actions). Handles per-item expand/collapse state, lifecycle tracking, and signature-based cache invalidation.
- **Design Pattern**: Strategy Pattern (flat vs. dense render) + Composite (widget trees)
- **Pipeline Role**: **Presentation** — builds widget trees from thread data

---

### 2.4 Input & State

#### clipboard-and-input.js — Clipboard, Terminal Query & TUI Controller
- **Lines**: 619
- **Purpose**: Three subsystems: (1) Terminal capability detection (`dY`) — queries RGB color, Kitty keyboard, pixel mouse, emoji width, OSC-52 clipboard; (2) Cross-platform clipboard (`KXT`) — OSC-52, pbcopy/pbpaste, wl-copy/wl-paste, xclip, clip.exe; (3) Main TUI controller (`XXT`) — terminal init, raw mode, screen buffer, alt screen, resize, suspend/resume, event dispatch.
- **Design Pattern**: Facade (TUI controller) + Strategy (clipboard per OS) + Observer (events)
- **Pipeline Role**: **Input & platform abstraction**

#### app-state-management.js — Live Sync & Auth State
- **Lines**: 577
- **Purpose**: Manages live sync (bidirectional file synchronization between local git worktree and remote DTW executor) and CLI authentication (local HTTP callback server, auth code parsing, API key storage). PID file management for exclusive locks.
- **Design Pattern**: State Machine (connection lifecycle) + Observer + PID-file Mutex
- **Pipeline Role**: **External state management**

#### widget-property-system.js — Scroll, Selection Boundary & CLI Parser
- **Lines**: 1,246
- **Purpose**: Framework utilities: `SelectionKeepAliveBoundary` (prevents unmount during selection), `ScrollKeyHandler` (keyboard/mouse scroll: arrows, j/k, Page Up/Down, Ctrl-U/D, Home/End, g/G), `ScrollController` (animated scroll with linear/easeInOut/spring curves, follow-mode), lightweight CLI argument parser.
- **Design Pattern**: Observer (scroll listeners) + State (scroll animation) + Keep-Alive + Composite Command
- **Pipeline Role**: **Framework utilities & input handling**

---

### 2.5 Content Processing

#### micromark-parser.js — Markdown & HTML Parser
- **Lines**: 12,483 (largest framework module)
- **Purpose**: Combined parser: (1) Full micromark-compatible CommonMark parser with constructs for headings, code fences, blockquotes, lists, attention, autolinks, character references; (2) HTML5 tokenizer (parse5-based) with complete state machine; (3) GFM extensions (tables, strikethrough, autolinks). Also contains some MCP CLI command code (bundler artifact).
- **Design Pattern**: State Machine (both parsers) + Construct/Plugin Pattern (markdown features)
- **Pipeline Role**: **Data transformation** — markdown → structured tokens for rendering

---

## 3. Infrastructure — `util/` (9 modules)

> Note: Many filenames are misleading artifacts of the auto-naming process. Actual purpose determined by code analysis.

### 3.1 Core Runtime

#### http-sdk-core.js — Observable Core, URI & JSON Schema→Zod
- **Lines**: 4,141
- **Purpose**: Foundational reactive primitives (Observable with subscribe/pipe/map/filter, BehaviorSubject, promise-to-observable bridges), VS Code-style URI class (scheme/authority/path/query/fragment with fsPath), JSON Schema to Zod schema conversion ($ref, anyOf/oneOf/allOf, OpenAPI 3.0 nullable, format validators).
- **Architecture Role**: **Core runtime** — reactive system + URI model + schema validation

#### json-schema-validator.js — Zod Library & i18n
- **Lines**: 4,378
- **Purpose**: Contains Zod validation library (v4-style) including full JSON Schema → Zod conversion engine with $ref resolution, pattern properties, tuple schemas, OpenAPI nullable. Large i18n module with locale-specific error messages for 30+ languages with plural-form functions.
- **Key Strings**: `"/Library/Application Support/ampcode/managed-settings.json"`, `"/etc/ampcode/managed-settings.json"`
- **Architecture Role**: **Core runtime** — validation + internationalization

#### keyring-native-loader.js — Native Keyring Bootstrap
- **Lines**: 539
- **Purpose**: Bootstraps `@napi-rs/keyring` native Node addon for secure credential storage. Platform-aware loading chain (darwin-universal → darwin-arm64 → WASI fallback), version enforcement (1.1.10), CJS/ESM interop shims.
- **Key Strings**: `"/$bunfs/root/keyring.darwin-arm64-cqyn4aeg.node"`, `"Native binding package version mismatch, expected 1.1.10"`
- **Architecture Role**: **Security** — OS keychain credential storage

---

### 3.2 Integration

#### connection-transport.js — IDE Bridge & Tool Permission Manager
- **Lines**: 2,717
- **Purpose**: WebSocket connections to IDE extensions (VS Code, JetBrains) with reconnection, query-based polling fallback, and notification handling. Full tool permission system (allow/ask/reject/delegate) with pattern-matching. Custom config DSL tokenizer/parser.
- **Key Strings**: `"IDE Not Connected"`, `"IDE authentication failed"`, `"getDiagnostics"`, `"openURI"`, `"Tool ${...} already approved by user"`, `"not allowed for subagents"`
- **Architecture Role**: **Transport** — IDE bridge + permission enforcement

#### otel-instrumentation.js — MCP Manager, JSON Editor & OAuth Server
- **Lines**: 2,199
- **Purpose**: MCP server lifecycle management (connect/reconnect/authenticate/status), full JSON parser/formatter with AST support, OAuth callback HTTP server (`localhost` at `/oauth/callback`), OpenTelemetry fetch instrumentation, REPL tool operator for interactive subprocess sessions.
- **Key Strings**: `"fetch-instrumentation"`, `"1.0.0"`, `"/oauth/callback"`, `"MCP server \"${a}\" not found"`, `"[REPL started. Awaiting your input.]"`
- **Architecture Role**: **Integration** — MCP management + OAuth + telemetry

#### web-streams-polyfill.js — LLM Provider Adapters & Streams
- **Lines**: 4,279
- **Purpose**: OpenAI Responses API stream accumulator (SSE → complete response), xAI (Grok) API adapter, multi-provider LLM client framework (HTTP API base class with get/post, retries, provider routing for OpenAI/Anthropic/Fireworks/BaseTen), and spec-compliant Web Streams polyfill (ReadableStream, WritableStream, TransformStream).
- **Key Strings**: `"[openai-responses] response.completed"`, `"/api/provider/xai/v1"`, `"/api/provider/fireworks/v1"`, `"/api/provider/baseten/v1"`
- **Architecture Role**: **Integration** — LLM provider abstraction + streaming

---

### 3.3 Application Logic

#### protobuf-mime-types.js — Thread Service, Subagents & Code Review
- **Lines**: 7,341 (largest util module)
- **Purpose**: Mega-module containing: ThreadService (get/observe/delete/archive/flush with throttled upload), remote thread API client, thread title generation via Claude, subagent execution framework (sub-agent LLM loops with tool invocation and token budgets), code review engine (loading `.amp/checks/*.md`, running review checks as Claude Haiku sub-agents, parsing `<checkResult>` XML), GitHub/Bitbucket integration (API clients for file reading, code search, directory listing), and magic-byte-based MIME detection.
- **Key Strings**: `"ThreadService"`, `"set_title"`, `"CLAUDE_HAIKU_4_5"`, `"github"`, `"bitbucket-enterprise"`, `"/api/internal/github-proxy/"`, `"Model Stream Timed Out"`
- **Architecture Role**: **Core business logic** — thread persistence + subagents + code review + repo integration

#### file-scanner.js — File System Scanner
- **Lines**: 428
- **Purpose**: Recursively scans directory trees to build a file index. External tool scanning via `rg`/`fd` with glob patterns and a pure Node.js `fs.readdir` fallback. Supports abort signals, `.gitignore`-style filtering, and "always include" paths.
- **Architecture Role**: **Filesystem** — workspace file indexing

#### http-request-executor.js — Fuzzy File Search & Git State
- **Lines**: 1,847
- **Purpose**: Sophisticated fuzzy/semantic file search engine with scoring tiers (exact, prefix, suffix, substring, segment-ordered, fuzzy), tie-breaker heuristics, and character-bag pre-filtering. Git state module: parsing `git status --porcelain`, extracting diffs, computing diff stats, applying `*** Begin Patch / *** End Patch` patches.
- **Key Strings**: `"*** Begin Patch"`, `"*** End Patch"`, `"*** Add File:"`, `"*** Delete File:"`, `"executor_artifact_upsert"`, `"GIT_CONFIG_NOSYSTEM"`
- **Architecture Role**: **Filesystem** — file search + git integration

---

## 4. Internal ESM Modules — `vendor/esm/` (non-npm)

### 4.A Application Schemas (6 modules)
| File | Purpose |
|------|---------|
| `app-schemas.js` | Core application data schemas (threads, messages, tool calls) |
| `app-schemas-2.js` | Extended application schemas (thread metadata, relationships) |
| `message-schemas.js` | Message type schemas (user/assistant/tool messages, content blocks) |
| `thread-visibility-schemas.js` | Thread visibility schemas (public/unlisted/workspace/private/group) |
| `ide-protocol-schemas.js` | IDE integration protocol schemas (VS Code, Zed, JetBrains) |
| `mcp-oauth-schemas.js` | MCP OAuth flow schemas (tokens, client registration) |

### 4.B MCP Protocol (5 modules)
| File | Purpose |
|------|---------|
| `mcp-protocol-schemas.js` | MCP JSON-RPC base schemas (request/response/notification) |
| `mcp-protocol-schemas-2.js` | MCP protocol version negotiation (2025-06-18, 2025-03-26, etc.) |
| `sse-error.js` | SSE transport error class for MCP connections |
| `module-n9t-bmt-sPR.js` | MCP client config (`amp-mcp-client`, OAuth flow errors) |
| `module-bmt-zmt-bDT.js` | MCP client initialization configuration |

### 4.C Agent & Model Infrastructure (8 modules)
| File | Purpose |
|------|---------|
| `agent-modes.js` | Agent mode definitions (finder, coding, aggman, etc.) |
| `agent-modes-2.js` | Extended agent mode configuration |
| `agent-modes-3.js` | Agent mode switching logic |
| `model-registry.js` | LLM provider catalog (20+ models: Claude, GPT, Gemini, Grok, Kimi, etc.) |
| `config-keys.js` | All configuration key definitions for settings.json |
| `feature-flags.js` | Feature flag definitions and evaluation |
| `tool-service.js` | Tool service infrastructure (registry, lookup, filtering) |
| `tool-error.js` + `tool-error-2.js` | Tool error handling and model deprecation warnings |

### 4.D Tools & Permissions (4 modules)
| File | Purpose |
|------|---------|
| `tool-permission-rules.js` | Tool permission rule engine with DSL-based matching |
| `permission-dsl-parser.js` | Permission DSL parser (tokenizer + AST builder) |
| `npm-licensed-e9T.js` | Sensitive file pattern definitions (SSH keys, .env, credentials) |
| `secret-scanner-patterns.js` | Secret/credential detection regex for 15+ providers |

### 4.E Auth / OAuth (5+ modules)
| File | Purpose |
|------|---------|
| `unknown-J0T.js` | OAuth error types (UnauthorizedError, OAuthTimeoutError) |
| `unknown-_yR.js` | OAuth2 RFC error codes (invalid_request, invalid_client, etc.) |
| `unknown-N9T.js` | Auth error base class |
| `unknown-oyR.js` | WebCrypto polyfill for PKCE |
| `unknown-gc.js` | URL constants (ampcode.com, api.anthropic.com) |

### 4.F Skills System (4 modules)
| File | Purpose |
|------|---------|
| `unknown-dkR.js` | Built-in skill: code-review (SKILL.md content) |
| `unknown-jkR.js` | Built-in skill: code-tour |
| `skill-setup-tmux.js` | Built-in skill: tmux setup |
| `unknown-BkR.js` | SkillPackageError class |

### 4.G Utilities (11+ modules)
| File | Purpose |
|------|---------|
| `logger.js` | Logging infrastructure with OTel integration |
| `tracing-stub.js` | OpenTelemetry tracing stub (span creation, context propagation) |
| `text-utf8-utils.js` | UTF-8 text clamping and byte-length utilities |
| `bigint-ranges.js` | BigInt range arithmetic utilities |
| `file-not-exist-error.js` | Custom file error types |
| `init-homedir.js` | Home directory detection |
| `module-homedir-m0T.js` | XDG Base Directory resolution |
| `unknown-mm.js` | Absolute path regex matcher |
| `unknown-S9T.js` | Alphanumeric character set constants |
| `unknown-YnR.js` + `unknown-ZnR.js` | UUID generation helpers (byte-to-hex tables) |
| `unknown-f9T.js` | MIME type extension map (.jpg → image/jpeg) |

### 4.H Module Composition (22+ modules)
Large composition modules that wire subsystems together:
| File | Purpose |
|------|---------|
| `unknown-P0.js` | Tool name registry (Bash, Grep, Read, edit_file, etc.) |
| `unknown-nm.js` | Sourcegraph employee email allowlist |
| `unknown-L8.js` | Agent config file paths (Agents.md, CLAUDE.md) |
| `unknown-Zs.js` + `unknown-zS-1.js` | Amp config defaults (timeouts, retries) |
| `unknown-IPR.js` | Package manager detection (npx, bunx, uvx, pipx) |
| `unknown-o7T.js` | Skill name → path mapping |
| `ide-integration-zed.js` | Zed editor integration adapter |
| `visible-files-state.js` | Visible files state tracking for IDE |
| `async-stream.js` + `-2.js` + `-3.js` | Async stream utilities for LLM response processing |

### 4.I Init/Dependency Stubs (~99 modules)
Small initialization modules (~10 lines each) that wire up the module dependency graph:
```
init-2oR.js, init-3oR.js, init-4oR.js, init-5oR.js, init-6oR.js, ...
init-RoR.js, init-SoR.js, init-ToR.js, init-VoR.js, init-WoR.js, ...
```

Each simply invokes other module initializers — no application logic.

---

## 5. Module Relationship Map

### Critical Data Flows

```
User Input → cli-commander-system.js
  → tool-execution-engine.js (ThreadWorker)
    → prompt-routing.js (system prompt)
    → prompt-classification.js (skill injection + hooks)
    → llm-sdk-providers.js (LLM inference)
    → tool-permissions.js (permission check)
    → [tool execution: Bash, Read, edit_file, etc.]
    → realtime-sync.js (DTW sync)
    → session-management.js (persistence)
```

```
TUI Rendering Pipeline:
  clipboard-and-input.js (raw terminal I/O)
    → tui-widget-framework.js (VT parser + RenderObject)
    → tui-layout-engine.js (FrameScheduler: build→layout→paint→render)
    → tui-render-pipeline.js (WidgetsBinding, TextStyle, TextSpan)
    → tui-widget-library.js (TextEditor, Theme, Activity pipeline)
    → activity-feed-ui.js (thread view widgets)
    → tui-thread-widgets.js (handoff, commands, charts)
    → micromark-parser.js (markdown → structured tokens)
```

### Module Size Distribution

| Size Bracket | Count | Examples |
|---|---|---|
| 10,000+ lines | 2 | `micromark-parser` (12,483), `llm-sdk-providers` (10,232) |
| 5,000–10,000 | 3 | `rpc-protocol-layer` (9,265), `protobuf-mime-types` (7,341), `permission-rule-defs` (6,415) |
| 2,000–5,000 | 12 | `cli-commander-system`, `web-streams-polyfill`, `json-schema-validator`, etc. |
| 500–2,000 | 14 | Most modules |
| < 500 | 8 | `prompt-routing` (132), `activity-feed-ui` (227), etc. |
