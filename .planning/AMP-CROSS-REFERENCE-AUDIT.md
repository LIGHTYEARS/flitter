# Amp Cross-Reference Audit — Full Report

**Date:** 2026-04-15
**Audited by:** 4 parallel research agents (TUI, LLM, agent-core+data, CLI+util+schemas)
**Scope:** All ~176 source files across 7 packages
**Purpose:** Identify modules implemented without consulting amp-cli-reversed/ source code

---

## Executive Summary

| Package | Source Files | With `逆向:` | No Reference | Mismatch/Shallow |
|---------|-------------|-------------|-------------|------------------|
| **@flitter/tui** | ~68 | 20 | **48** | 4 shallow, 1 mismatch |
| **@flitter/llm** | ~38 | 0 | **38** | (all informal refs only) |
| **@flitter/agent-core** | ~20 | 13 | **7** | 3 mismatch, 5 shallow |
| **@flitter/data** | ~13 | 0 | **13** | 3 mismatch |
| **@flitter/cli** | ~15 | 8 | **2** | 3 mismatch, 3 shallow |
| **@flitter/util** | ~16 | 0 | **16** | -- |
| **@flitter/schemas** | ~6 | 0 | **6** | (module docstrings only) |
| **Total** | **~176** | **41** | **~130** | **22** |

**~74% of source files have no formal `逆向:` cross-reference.**

---

## CRITICAL Issues (P0 — likely runtime failures or security gaps)

### CR-01: `packages/llm/src/providers/anthropic/provider.ts` — No retry logic, missing security features
- **Severity**: shallow_port
- **Amp reference**: `amp-cli-reversed/app/llm-sdk-providers.js` class `OwT` (lines ~1254-1296)
- Amp has exponential backoff with jitter, Retry-After header parsing, idempotency headers, `maxRetries: 0` + custom retry layer
- Amp dynamically adjusts thinking budget ("think harder" -> 31999). Flitter hardcodes `budget_tokens: maxOutputTokens`
- Amp applies `cache_control: "5m"` to last message content. Flitter does not
- **Missing prompt injection defense**: Amp's `EfR`/`dfR` removes invisible Unicode tag characters and redacts matched patterns. Flitter has none of this
- Missing `speed` mode conditional guard (amp checks model support AND context window threshold)
- Missing stop reasons: `refusal`, `pause_turn`, `compaction` handled in amp but not Flitter

### CR-02: `packages/llm/src/utils/sanitize-unicode.ts` — Missing prompt injection defense
- **Severity**: shallow_port
- **Amp reference**: `amp-cli-reversed/app/llm-sdk-providers.js` function `dfR` (line ~426-432)
- Flitter only handles unpaired surrogates. Amp's `dfR` also removes **invisible Unicode tag characters** (`kwT` pattern — prompt injection vector)
- Amp has a full redaction system (`EfR`) for API keys/credentials using regex. Flitter has none

### CR-03: `packages/llm/src/providers/anthropic/transformer.ts` — Missing security sanitization
- **Severity**: no_reference
- **Amp reference**: `amp-cli-reversed/app/llm-sdk-providers.js` functions `k8T`, `PAT`, `O8`, `rIR`, `EfR`
- Missing `web_search_tool_result` and `tool_search_tool_result` filtering (amp's `rIR` at line 1243-1247)
- Missing prompt injection sanitization (invisible Unicode tag removal + pattern redaction)

### CR-04: `packages/agent-core/src/worker/thread-worker.ts` — Shallow state machine
- **Severity**: shallow_port (has `逆向:` but massively simplified)
- **Amp reference**: `amp-cli-reversed/app/tool-execution-engine.js` class `ov` (~1200 lines)
- Flitter's version is ~347 lines. Missing:
  - **Exponential retry with backoff**: BASE_RETRY_SECONDS=5, MAX_RETRY_SECONDS=60, MAX_AUTO_RETRIES=5, countdown timer, auto-retry on transient errors
  - **Git snapshots**: `experimental.autoSnapshot` before tool execution, restore on edit
  - **blocked-on-user handling**: Full approval queue with state restoration
  - **Title generation**: `triggerTitleGeneration()` after first user message
  - **Message truncation on retry**: Truncates incomplete assistant messages before retry (line 2843-2846)
  - **States**: Missing `_state` ("active"/"disposed"), `ephemeralError`, `retryCountdownSeconds`, `handoffState`, `_turnStartTime`, `_turnElapsedMs`
  - **Plugin/hook integration**: `pluginService.event.agentStart()` and `agent.end` continue actions

### CR-05: `packages/tui/src/tree/render-object.ts` hitTest — Missing `allowHitTestOutsideBounds`
- **Severity**: reference_mismatch
- **Amp reference**: `Dy0` in tui-widget-framework.js:1879-1921 (lines 1905-1913)
- Amp checks `this.allowHitTestOutsideBounds` and recurses into children when true
- Flitter returns `false` immediately when point is outside bounds
- **This breaks overlay/dropdown interactivity** — overlays render outside parent's clip region

### CR-06: `packages/llm/src/mcp/transport/streamable-http.ts` — No auth recovery
- **Severity**: no_reference (informal "Translated from reversed T7 class")
- **Amp reference**: `amp-cli-reversed/app/mcp-transport.js` class T7 (lines 107-143)
- Amp handles 401 by calling `Q_()` to perform full OAuth flow, retries request, tracks `_hasCompletedAuthFlow`. Flitter throws `UnauthorizedError`
- Amp handles 403 `insufficient_scope` with WWW-Authenticate parsing for upscoping. Flitter ignores 403
- Amp reconnects on SSE stream disconnect (`_handleSseStream` tracks id-seen + response-complete flags). Flitter does not

### CR-07: `packages/llm/src/mcp/transport/sse.ts` — No reconnection on disconnect
- **Severity**: no_reference (informal "Direct translation from reversed JD class")
- **Amp reference**: `amp-cli-reversed/app/oauth-auth-provider.js` class JD (lines ~1367-1505)
- Amp has `_scheduleReconnection` with configurable reconnect attempts. Flitter calls `onclose()` with no reconnection
- Missing 401 re-auth flow (amp triggers re-authentication through auth provider)

### CR-08: `packages/llm/src/mcp/connection.ts` — Default transport factory throws
- **Severity**: shallow_port (informal "Reversed: Uq")
- **Amp reference**: `amp-cli-reversed/app/mcp-transport.js` class Uq (lines ~300-600)
- `_createTransport()` always throws instead of dynamically creating Stdio/SSE/StreamableHTTP based on spec
- Missing ping/keepalive (amp sends periodic pings)
- Missing `sampling` and `elicitation` capability handling (server-initiated requests)
- Notification handler signature is `() => void` — amp passes notification payload

### CR-09: `packages/tui/src/tui/tui-controller.ts` getSize() — Infinity bug (KNOWN)
- **Severity**: reference_mismatch (documented in HANDOFF.json)
- **Amp reference**: `amp-cli-reversed/framework/tui-layout-engine.js:413-426` function `Uk0()`
- Uses `process.stdout.rows ?? 24` — Bun returns `Infinity`, bypassing `??`
- Amp has 4-layer defense: `_refreshSize` -> truthy check -> `getWindowSize` -> cached fallback

### CR-10: `packages/tui/src/tui/tui-controller.ts` cleanup() — Async race (KNOWN)
- **Severity**: reference_mismatch (documented in 12.1-REVIEW.md CR-01/CR-02)
- `cleanup()` is sync but calls async `deinit()` — Promise silently discarded
- `handleSuspend()` calls `deinit()` without await then sends SIGTSTP
- Terminal left in raw mode on SIGINT

---

## HIGH Issues (P1 — behavioral divergence affecting correctness)

### HI-01: `packages/agent-core/src/permissions/matcher.ts` — Inverted enable/disable precedence
- **Severity**: reference_mismatch (has `逆向:`)
- **Amp reference**: `yy` in tool-permissions.js (~190-200)
- Flitter treats `tools.enable` as override for `tools.disable`. Amp treats `tools.enable` as whitelist that restricts what appears. **Logic is inverted.**
- `listEnabled()` uses string `includes()` instead of glob matching. Amp uses picomatch

### HI-02: `packages/agent-core/src/prompt/system-prompt.ts` — Generic prompt, not from amp
- **Severity**: reference_mismatch (has `逆向:`)
- **Amp reference**: prompt-routing.js and _preamble.js
- `BASE_ROLE_PROMPT` is a generic coding assistant prompt bearing no resemblance to amp's actual system prompt ("You are Amp. You and the user share the same workspace" with YAGNI, rg preference traits)

### HI-03: `packages/data/src/config/config-service.ts` — 2-tier, not 3-tier
- **Severity**: reference_mismatch (informal docstring ref)
- **Amp reference**: `util/otel-instrumentation.js` function `LX` (lines 1782-1880)
- Claims "三级" (3-tier) but only implements global + workspace. Amp has third tier: managed/admin settings (`CX`)
- Imperative `reload()` instead of reactive Observable pipeline (amp uses RxJS pipe/switchMap/combineLatest)
- Missing permission normalization (`I0T`)
- Array merge approach differs from amp's `appendSettings`/`prependSettings`

### HI-04: `packages/data/src/guidance/guidance-loader.ts` — Hand-rolled YAML and glob
- **Severity**: reference_mismatch
- **Amp reference**: `mcp-tools-integration.js` function `kkR` (lines 967-1032) and `XDT` (lines 728-754)
- Uses hand-rolled `parseSimpleYaml` (breaks on complex YAML). Amp uses real YAML parser (`QDT.default.parse`)
- Uses `simpleGlobMatch` instead of picomatch. Missing relative glob resolution, glob safety checks (`pkR`)
- Missing "subtree" type guidance. Missing 32KB byte budget enforcement
- Missing `~/` home-relative path support in @reference resolution

### HI-05: `packages/agent-core/src/prompt/context-blocks.ts` — No mode awareness, no budget
- **Severity**: reference_mismatch (has `逆向:`)
- **Amp reference**: `fwR` at tool-execution-engine.js (lines 434-547)
- No concept of deep vs. smart mode
- No 32768-byte budget with truncation
- No `<instructions>` / `<INSTRUCTIONS>` tag wrapping per mode
- No awareness of "subtree" guidance type

### HI-06: `packages/llm/src/mcp/server-manager.ts` — No permissions checking
- **Severity**: no_reference (informal "Reversed: jPR")
- **Amp reference**: `amp-cli-reversed/app/mcp-tools-integration.js` (jPR, ADT, Hq)
- Amp's `ADT` checks `mcpPermissions` before exposing tools. Flitter exposes ALL tools unconditionally
- Missing `includeToolsBySkill` filtering
- Missing tool cache with 30000ms TTL

### HI-07: `packages/agent-core/src/tools/orchestrator.ts` — Batch conflict checking bug
- **Severity**: shallow_port (has `逆向:`)
- **Amp reference**: `FWT`/`wwR` in tool-execution-engine.js
- `batchToolsByDependency` only checks LAST batch for conflicts. Amp's `wwR` checks ALL batches
- Missing `blocked-on-user` state, tool approval queues, tool timeout (`pbR`/`OnR`), and `preprocessArgs`

### HI-08: `packages/data/src/skill/skill-parser.ts` — Hand-rolled YAML, missing validation
- **Severity**: reference_mismatch (inline comments reference amp lines informally)
- **Amp reference**: `skills-agents-system.js` (SqR, OqR, vqR, jqR)
- Uses hand-rolled `parseSimpleYaml` instead of real YAML parser (breaks on nested maps, multi-line, anchors)
- Missing `jqR` file size/count validation (max files, max per-file size, max total size)
- Missing `$qR` path traversal security check

### HI-09: `packages/cli/src/modes/interactive.ts` — No dynamic theme, unsafe casts
- **Severity**: reference_mismatch
- **Amp reference**: `_70()` in html-sanitizer-repl.js:1327-1388
- Amp subscribes to config changes to update theme dynamically via `configService.config.pipe(...)`. Flitter reads theme once
- Uses `as unknown as` unsafe casts, suggesting API was guessed
- Missing inspector (`AMP_INSPECTOR_ENABLED`) and custom theme loading (`s70()`)

### HI-10: `packages/cli/src/commands/config.ts` and `threads.ts` — Empty stubs
- **Severity**: no_reference
- **Amp reference**: `cli-commander-system.js` (`uC0`) for config, `cli-entrypoint.js` for threads
- All handler functions are `// TODO` with `void` swallowing parameters. Completely non-functional

---

## MEDIUM Issues (P2 — missing features, subtle behavioral differences)

### Package: @flitter/tui — 48 files with no reference

| Subsystem | Files | Concern | Amp Reference |
|-----------|-------|---------|---------------|
| `screen/` (6 files) | Screen, Buffer, Cell, Color, TextStyle, AnsiRenderer | Likely implemented independently. Amp has its own Screen/Color in `tui-render-pipeline.js` with `setDefaultColors`, `setIndexRgbMapping`, `markForRefresh`, `requiresFullRefresh`, `clearCursor` | `tui-render-pipeline.js` `cT` class (line 209+) |
| `vt/` (3 files) | VtParser, InputParser, types | No `逆向:` despite `tty-input.ts` referencing amp functions `Zu0`/`Ju0`/`hy0`/`Qu0` | `tui-widget-framework.js` |
| `widgets/` (14 files) | Flex, Row, Column, Stack, Container, SizedBox, Flexible, RichText, Text, TextSpan, Theme, ColorScheme, EdgeInsets, MultiChildROE | All fundamental layout widgets unverified | `tui-widget-library.js`, `tui-widget-framework.js` |
| `tree/` (10 files) | RenderBox, BuildOwner, PipelineOwner, FrameScheduler, ComponentElement, RenderObjectElement, StatefulWidget, StatelessWidget, Widget, types | Core framework foundation unverified. `PipelineOwner.flushPaint` doesn't trigger painting (diverges from amp). `FrameScheduler.addFrameCallback` missing debugName param | `tui-widget-framework.js`, `tui-layout-engine.js` YXT/JXT/k8 |
| `selection/` (3 files) | SelectionArea, Clipboard, SelectionKeepAlive | No cross-reference | `tui-render-pipeline.js` `zk0` |
| `markdown/` (3 files) | MarkdownParser, MarkdownRenderer, SyntaxHighlighter | Amp uses micromark too (`micromark-parser.js`) but no cross-reference | `micromark-parser.js` |
| `text/` (2 files) | char-width, emoji | Character width critical for terminal rendering | `tui-widget-library.js` |
| `perf/` (1 file) | PerformanceTracker | Missing amp's frame stat recording integration | `tui-render-pipeline.js` d9 |

### Package: @flitter/llm — All 38 files informal references only

| Area | Key Files | Specific Gaps |
|------|-----------|---------------|
| **Anthropic** | provider.ts, transformer.ts | No retry layer, no thinking budget dynamics, no cache_control on last message, no security sanitization |
| **OpenAI** | provider.ts, transformer.ts | Missing 409 retry status, missing encrypted thinking content parsing, hardcoded `maxInputTokens: 128_000` |
| **Gemini** | provider.ts, transformer.ts | Missing Vertex AI service account auth, wrong `maxInputTokens` (128K vs 1M), always sets `provider: "gemini"` instead of "vertexai" |
| **OpenAI-compat** | provider.ts, compat.ts, transformer.ts | Missing kimi-k2, gpt-5-codex compat configs. `thinkingFormat` declared but never consulted during delta processing |
| **Registry** | registry.ts | Unknown model defaults to "anthropic" — amp's resolution is more nuanced with `agentMode` and `rAR` lookup |
| **MCP Auth** | oauth-provider.ts | Well-implemented but missing `fetchWithInit` wrapper for custom request init options |
| **MCP Tools** | tools.ts | Close to amp. Minor: missing image content data format validation |
| **Transport** | read-buffer.ts, sse-parser.ts | Correct implementations |
| **Stdio** | stdio.ts | Missing stderr capture/forwarding for error diagnostics |

### Package: @flitter/agent-core — Specific shallow ports

| File | Issue |
|------|-------|
| `tools/registry.ts` | `listEnabled()` uses string `includes()` not glob matching; missing deferred tool check |
| `permissions/engine.ts` | Missing delegate mechanism, subagent-specific permission logic, ShellCommand→Bash normalization |
| `worker/events.ts` | Missing `tool:processed`, `blocked-on-user`, handoff, retry, and timing events |
| `subagent/subagent.ts` | No token budgets, no specialized sub-agent modes (Haiku review, `<checkResult>` parsing) |
| `tools/builtin/*.ts` (7 files) | ALL 7 builtin tools have zero `逆向:` references. Missing `preprocessArgs`, tool timeout, `disableTimeout` meta |

### Package: @flitter/data — All 13 files zero references

| File | Issue | Amp Reference |
|------|-------|---------------|
| `thread/thread-store.ts` | Missing `totalSizeBytes`, file validation (`jqR`), fragile `JSON.stringify` equality | `skills-agents-system.js` azT/fuT/T4 |
| `thread/thread-persistence.ts` | Local-only JSON. No remote sync (amp has ThrottledUpload + ThreadService) | `protobuf-mime-types.js` |
| `config/settings-storage.ts` | Missing admin/managed scope (amp has `/Library/Application Support/ampcode/managed-settings.json`) | `process-runner.js` f_0 |
| `skill/skill-service.ts` | Only 2-tier discovery (workspace + global). Amp has 3-tier (workspace + project + global) | `skills-agents-system.js` |
| `context/context-manager.ts` | Compaction design appears Flitter-specific, not ported from amp | `tool-execution-engine.js` |
| `context/token-counter.ts` | Heuristic chars/4 counter. Amp likely uses actual tokenizer or API counts | Unknown |

### Package: @flitter/util — All 16 files zero references

| File | Concern | Amp Reference |
|------|---------|---------------|
| `reactive/*.ts` (6 files) | Core reactive primitives powering entire data flow. Only 3 operators (map/filter/distinctUntilChanged). Amp uses more operators | `realtime-sync.js` f0/AR |
| `git/git.ts` | 390 lines unverified. Function name typo (`parsePortalainStatus` → should be `Porcelain`) | `process-runner.js` rVT |
| `uri/uri.ts` | 361-line RFC 3986 impl. Percent-encoding and Windows path handling unverified | `claude-config-system.js` zR |
| `keyring/keyring.ts` | Different service name ("flitter" vs amp naming). URL normalization unverified | `process-runner.js` w_0 |
| `scanner/file-scanner.ts` | 440 lines. No direct amp counterpart identified in reversed source | Unknown |
| `search/fuzzy-search.ts` | 277 lines. Scoring constants unverified | Unknown |
| `logger.ts` | Structured JSON logger. Format/semantics unverified against amp's `J` logger | `cli-entrypoint.js` Lz0(J) |
| `process.ts` | Simplified spawn wrapper. Amp has complex process spawning with env handling, profile loading, PTY allocation | `tool-execution-engine.js` SBR |

### Package: @flitter/schemas — All 6 files missing inline references

| File | Concern |
|------|---------|
| `config.ts` | 50+ settings keys. Any deviation in key names/types causes runtime failures |
| `mcp.ts` | 8-variant `MCPConnectionStatus` union, complex specs need field-level verification |
| `messages.ts` | `AssistantContentBlock` with 5 variants, `ToolRun` with 5 status variants |
| `permissions.ts` | Recursive `PermissionMatcher` type with refine constraints |
| `thread.ts` | **27-variant `ConversationDelta` union** — most complex schema, any missed field breaks sync |
| `types.ts` | MODEL_REGISTRY missing some amp models (gpt-5-codex, kimi-k2) |

### Package: @flitter/cli — Specific issues

| File | Issue | Amp Reference |
|------|-------|---------------|
| `commands/auth.ts` | Different architecture: multi-provider OAuth vs amp's URL-keyed storage | `eF0()`/`tF0()` in cli-entrypoint.js |
| `main.ts` | Container creation differs from amp's `X3()`. `pc0` reference misidentified | `aF0()` in cli-entrypoint.js |
| `modes/execute.ts` | Happy path only. No auth gating, no telemetry, no timing | `SB()` in cli-entrypoint.js:546-700 |
| `modes/headless.ts` | Happy path only. No protocol-level error framing, no keepalive | `SB()` in cli-entrypoint.js:700-813 |
| `widgets/status-bar.ts` | References "D-07" design doc, not a specific amp function | Unknown |

---

## Scroll-specific gaps

### `packages/tui/src/scroll/scroll-controller.ts` — shallow_port
- **Amp reference**: Q3 class in widget-property-system.js:393-585
- Missing methods: `animateScrollUp`, `animateScrollDown`, `animateToBottom`, `animatePageUp`, `animatePageDown`, `currentLine`, `animateToLine`, `jumpToLine`, `hasInitialOffset`, animation curve selection (`_animationCurve`, `_resolveAnimationOptions`)
- `animateToBottom` is functionally important for smooth auto-scroll to new content

### `packages/tui/src/scroll/scroll-key-handler.ts` — shallow_port
- **Amp reference**: P1T in widget-property-system.js:300-392
- Missing `maxScrollExtent <= 0` guard (always returns true for arrow keys even when nothing to scroll)
- Missing horizontal axis support (ArrowLeft/ArrowRight/h/l)
- Missing dynamic scroll step from `I9.capabilitiesOf(this.context).scrollStep()` — uses fixed value
- Missing `handleMouseEvent` with raw button codes (64-67)

### `packages/tui/src/scroll/render-scrollable.ts` and `scrollable.ts` — shallow_port
- Vague `逆向` comments without specific function/class references. Impossible to verify alignment

---

## Patterns Observed

1. **Phase 1-6 (early phases)**: Built before `逆向:` convention was established. Almost all files lack references. These form the foundation (tree engine, screen, widgets, reactive, schemas).

2. **Phase 7-8 (LLM/MCP)**: Used informal "Reversed: Xxx" comments in docstrings — close but not systematic. Many real divergences in error handling and auth flows.

3. **Phase 9-10 (data/agent-core)**: Mixed — agent-core has `逆向:` references but implementations are shallow ports. Data package has zero references.

4. **Phase 12+ (binding/focus/gestures)**: Best-referenced code in the project. The `逆向:` convention was being enforced by this point.

---

## Remediation Priority Tiers

| Tier | Description | Files | Action |
|------|-------------|-------|--------|
| **P0** | Runtime-breaking or security gaps | ~10 | Fix before TUI launch |
| **P1** | Behavioral divergence affecting correctness | ~12 | Fix before v1 |
| **P2** | Missing references / unverified but probably functional | ~108 | Add `逆向:` annotations + spot-check in future passes |

---

*Audit completed: 2026-04-15*
*This document is the authoritative reference for all gap closure phases.*
