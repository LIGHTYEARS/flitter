# AMP Feature Audit -- Beyond P56-P62

Source: `/home/gem/home/tmp/amp-reverse/amp-js-bundles.txt` (5.2MB minified JS, 44 lines)
Comparison: `/home/gem/workspace/flitter/packages/flitter-cli/src/` (159 TypeScript files)
Date: 2026-04-06

## Summary

- **Total distinct features found:** 42
- **Already in flitter-cli:** 18
- **Missing from flitter-cli:** 19
- **Partially implemented:** 5

### Already-planned P56-P62 (excluded from counts above)
- Rich border InputArea
- Activity group tree
- HITL dialog
- Shortcut help inline
- Skills modal
- Command palette category
- Footer status

---

## Feature Details

### Category: Thread Management

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Thread switching | `switchThread`: 9 occ, `threadSwitch`: 7 occ. Full navigation with `activateThreadWithNavigation`, `recordNavigation` | **Partial** -- `thread-list.ts` exists (194 lines) with basic listing, but no `switchThread` / `createThread` / `deleteThread` actions | P1-HIGH |
| Thread back/forward navigation | `navigateBack`: 16, `navigateForward`: 16, `threadBackStack`: 14, `threadForwardStack`: 14, `canNavigateBack`: 8, `canNavigateForward`: 8. Full browser-style history stack | **Missing** -- No navigation stack at all | P2-MED |
| Thread creation/deletion | `createThread`: 18, `deleteThread`: 5. Creates workers, seeds messages, navigates | **Missing** -- `newThread()` in command-registry only resets session, no true multi-thread | P1-HIGH |
| Thread title generation | `titleGeneration`: 13, `threadTitle`: 51, `skipTitleGeneration`: 3. Auto-generates titles from conversation content | **Missing** -- No title generation logic | P2-MED |
| Thread visibility modes | `threadVisibility`: 2, `switchThreadVisibility`. Threads can be visible/hidden | **Missing** | P3-LOW |
| Thread preview (split-view) | `previewThread`: 12, `threadPreview`: 15, `previewMessage`: 2. Shows thread content inline before switching, with dedicated scroll controller and message view | **Missing** -- No preview mechanism | P2-MED |
| Thread relationships | `thread_relationships`, `merging`, `merged`. Parent-child thread tracking | **Missing** | P3-LOW |
| Thread worker pool | `threadWorker`: 50, `threadWorkerMap`, `workersByThreadID`. Full worker pool managing concurrent thread execution | **Missing** -- Single-session architecture | P2-MED |

### Category: Handoff Mode

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Handoff mode (full) | `handoff`: 214 occ total. `handoffMode`: 25, `isInHandoffMode`: 15, `handoffController`: 23, `handoffState`: 38. Enter/exit handoff, submit handoff, abort confirmation, countdown auto-submit | **Partial** -- `handoff-tool.ts` renders handoff tool calls with blink animation, theme colors defined (`handoffMode`, `handoffModeDim`), but no handoff controller, mode entry/exit, or countdown | P1-HIGH |
| Handoff countdown | `countdownSeconds`, auto-submit timer with "Auto-submitting in N..." UI | **Missing** | P2-MED |
| Handoff from parent thread | `handoffIfSourceActive`, `sourceThreadID`, `targetThreadID`. Cross-thread handoff initiation | **Missing** | P2-MED |

### Category: Queue Mode

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Queue mode (full) | `queuedMessage`: 88, `isInQueueMode`: 11, `submitQueue`: 9, `interruptQueue`: 19, `queueMode`: 19, `clearQueue`: 3. Users can queue messages while agent is busy, then submit or interrupt | **Partial** -- Theme color `queueMode` defined but no queue logic, no `enterQueueMode`/`exitQueueMode`, no message queue data structure | P1-HIGH |
| Queue dequeue on completion | `user:message-queue:dequeue` event. Auto-dequeues next message when current turn completes | **Missing** | P1-HIGH |

### Category: Deep Reasoning / Thinking

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Deep reasoning effort levels | `deepReasoningEffort`: 31, values: `"medium"`, `"high"`, `"xhigh"`. `reasoningEffort`: 37. Toggle with keyboard shortcut | **Partial** -- `deepReasoningActive` boolean toggle exists, `reasoning-toggle.ts` present, but only binary on/off, no tri-state (medium/high/xhigh). Test file `deep-reasoning.test.ts` exists | P2-MED |
| Deep mode effort hint controller | `deepModeEffortHintController`, `dismissForInteraction`, `canShowHintInCurrentThread`. Shows/hides hint about current reasoning level | **Missing** | P3-LOW |
| Shimmer / falling overlay animation | `shimmer`: 3, `fallingOverlay`: 1. Visual effect when deep reasoning is active | **Missing** -- No shimmer animation | P3-LOW |
| Interleaved thinking | `interleavedThinking`: 2. Anthropic-specific streaming mode with interleaved thinking blocks | **Missing** -- Thinking blocks rendered but no interleaved mode config | P3-LOW |
| Provider-specific speed settings | `anthropicSpeed`: 10, `openAISpeed`: 10. Per-provider "standard"/"fast" speed toggle | **Missing** | P2-MED |

### Category: Image Support

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Image paste/attachment | `imageAttachments`: many refs, `isUploadingImageAttachments`, `popImage` (backspace to remove). Full array of attached images with upload spinner | **Partial** -- Chat-view test shows `images` array on user messages and badge `[image]`, but no paste handler, no attachment UI, no upload | P1-HIGH |
| Kitty graphics protocol | `kittyGraphics`: 8, `supportsKittyGraphics()`, `transmitImage`, `imageId`. Native terminal image rendering via Kitty protocol | **Missing** | P2-MED |
| Image preview overlay | `ImagePreview`: 57, `onShowImagePreview`, `imagePreview` state field. Full-screen image preview with save dialog | **Missing** | P2-MED |
| Image click handler | `onImageClick`, `forceExternal`. Click to open image in external viewer or preview | **Missing** | P3-LOW |

### Category: Context Window Management

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Context detail overlay | `contextDetail`: 8, `showContextDetail`: 2, `isShowingContextDetailOverlay`. Detailed token breakdown UI | **Partial** -- `contextWindowUsagePercent` computed, `context-warning.ts` exists with percentage-based warnings, but no detail overlay | P2-MED |
| Context window usage display | `contextWindow`: 44. Real-time context window monitoring | **Present** -- `contextWindowUsagePercent` getter, usage tracking, status-message warnings at 80%/90%/95% thresholds | -- |
| Compaction system | `compaction`: 32, `compactionState`: 7, `compactionThresholdPercent` config, `compaction_started`/`compaction_complete` events, `cutMessageId`. Automatic context window compression | **Missing** -- No compaction logic at all | P1-HIGH |

### Category: Dense View / Display Modes

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Dense view toggle | `denseView`: 2 occ in AMP | **Present** -- `denseView` boolean in AppState, `toggleDenseView()`, command palette entry, test coverage | -- |

### Category: Provider System

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Provider roster | AMP: `ANTHROPIC`, `OPENAI`, `XAI`, `CEREBRAS`, `FIREWORKS`, `GROQ`, `MOONSHOT`/`moonshotai`, `OPENROUTER`, `VERTEXAI`, `BASENTEN` (10 providers) | **Partial** -- flitter-cli: `anthropic`, `openai`, `chatgpt-codex`, `copilot`, `gemini`, `antigravity`, `openai-compatible` (7 types). Missing: `xai`, `cerebras`, `fireworks`, `groq`, `moonshot`, `openrouter`, `vertex`, `baseten` | P2-MED |
| Model catalog | AMP has ~40+ model definitions with `contextWindow`, `maxOutputTokens`, `capabilities`, `reasoningEffort`, `uiHints` (label animation, colors). Includes GPT-5.4, Kimi K2, Qwen3 Coder 480B, GLM 4.6, etc. | **Missing** -- No model catalog, just default model per provider | P2-MED |
| Provider config service | `configService`: 68, `ProviderConfig`: 16. Centralized config with settings like `anthropic.effort`, `anthropic.interleavedThinking`, `openai.speed`, `internal.compactionThresholdPercent` | **Missing** -- Config limited to `config.ts` with basic key-value store | P2-MED |

### Category: OAuth / Authentication

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| OAuth flows | `oauth`: 36, `accessToken`: 56, `refreshToken`: 15, `signIn`: 11, `pendingAuth`: 45, `authLogin`: 62, `isAuthenticating`: 6. Full auth lifecycle with login flow, pending auth UI, retry | **Present** -- Comprehensive auth: `antigravity-oauth.ts`, `chatgpt-oauth.ts`, `copilot-oauth.ts`, PKCE, callback server, token store with refresh. `connection-state.ts` for connection tracking | -- |

### Category: Mention / Autocomplete System

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| File mentions (@) | `FileMention`: 8. Insert file reference into input | **Present** -- `file-picker.ts` (standalone overlay), `@` autocomplete trigger in InputArea, `insert-file-mention` command | -- |
| Thread mentions (@@) | `ThreadMention`: 10, `paletteOnThreadMentionSelected`, `insertThreadMention`. Typing `@@` opens thread picker to reference another thread | **Missing** -- `@@` trigger callback defined in InputArea props but no implementation | P2-MED |
| Autocomplete framework | `autocomplete`: 32. General autocomplete framework for triggers | **Present** -- Imports `Autocomplete` from flitter-core, `autocompleteTriggers` array in AppState | -- |

### Category: Message Selection / Navigation

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Selection mode (Tab nav) | `selectionMode`: 15, `isInSelectionMode`: 1, `messageIndex`: 21. Tab through messages, select for editing/copying | **Present** -- Tab/Shift+Tab message selection in app-shell.ts, `selectPreviousMessage`/`selectNextMessage` in AppState | -- |
| Edit previous message | `editingMessageOrdinal`, `isEditingPreviousMessage`, `editingController`. Up-arrow to edit previous user message in-place | **Missing** -- No message editing capability | P2-MED |

### Category: Shell Mode

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Shell mode ($ and $$) | `shellMode`: 8, `shellModeHidden`: 2. `$` prefix for foreground shell, `$$` for background. Detects invocations, shows bash invocation list, incognito mode | **Partial** -- `detectShellMode` returns "background" for `$$` prefix (tested). Theme colors `shellMode`/`shellModeHidden` defined. But no bash invocation list display, no shell mode status bar indicator | P2-MED |
| Bash invocation display | `bashInvocations` array, `pendingBashInvocations` map, show/hide timers. Renders running bash commands as a list in the UI | **Missing** | P2-MED |

### Category: Editor Integration

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| External editor ($EDITOR) | `openInEditor`: 9, `EDITOR`: 30. Opens current input in external editor (vim, etc.), replaces input on return | **Present** -- `editor-launcher.ts`, `_openInEditor` in AppShell, Ctrl+G shortcut, suspend/resume cycle, tested extensively | -- |
| JetBrains installer | `JetBrains`: 14, `isShowingJetBrainsInstaller`, `openJetBrainsInstaller`/`dismissJetBrainsInstaller`. First-run JetBrains IDE integration setup | **Missing** | P3-LOW |
| IDE picker | `idePicker`: 21, `isShowingIdePicker`, `/ide` command. Choose between connected IDEs | **Missing** | P3-LOW |
| IDE client | `ideClient`: 7. Background connection to IDE for file navigation | **Missing** | P3-LOW |

### Category: Clipboard / Copy

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Copy with highlight | `copyHighlight`: 16. Visual highlight flash after copying text | **Present** -- Theme defines `copyHighlight` color across all themes. Shortcut "Copy last response to clipboard" exists | -- |
| Auto-copy on selection | `_autoCopyTimer`, `AUTO_COPY_DELAY_MS`, `AUTO_COPY_HIGHLIGHT_DURATION_MS`. Mouse selection auto-copies after delay | **Missing** -- Copy is manual only | P3-LOW |

### Category: Scrollbar

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Scrollbar widget | `scrollbar`: 14, `thumbColor`: 2, `trackColor`: 2, `scrollOffset`: 59 | **Present** -- `Scrollbar` widget from flitter-core used in app-shell, `thumbColor`/`trackColor` tested | -- |

### Category: UI Overlays / Modals

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Confirmation overlay | `confirmationOverlay`: 11. Generic yes/no confirmation dialog (exit, clear input, cancel processing) | **Missing** -- Overlay IDs defined but no confirmation dialog widget | P2-MED |
| Context analyze modal | `contextAnalyze`: 28, `contextAnalyzeModal`: 11, `contextAnalyzeDeps`: 8. Shows context window analysis with token breakdown | **Missing** | P2-MED |
| MCP status modal | `mcpStatusModal`, `isShowingMCPStatusModal`. Shows MCP server connection status | **Missing** | P3-LOW |
| File changes overlay | `isShowingFileChangesOverlay`, `fileChangesClick`. Shows all files modified in current session | **Missing** | P2-MED |
| Console overlay | `isShowingConsoleOverlay`. Debug console/log viewer | **Missing** | P3-LOW |
| Toast notifications | `toastController`: 11, `showToast`: 3. Ephemeral notification messages (e.g., "Use /ide to connect") | **Partial** -- Overlay ID `TOAST` defined, but no toast controller or display widget | P2-MED |
| News feed | `newsFeedReader`, `newsFeedEntries`, RSS reader (`/news.rss`). In-app changelog/news reader | **Missing** | P3-LOW |

### Category: Cost / Usage Tracking

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Thread cost info | `threadCostInfo`, `threadCostInfoThreadID`. Per-thread cost display fetched from API | **Partial** -- `usage.cost` tracked with `{ amount, currency }`, displayed in session export and status. But no per-thread cost fetch from API | P3-LOW |

### Category: Skill System

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Pending skills injection | `pendingSkill`: 108. Skills queued for injection into thread as info messages. `addPendingSkill`, `removePendingSkill` | **Missing** | P2-MED |
| Skill service | `skillService`: 26. Centralized skill management | **Missing** | P2-MED |
| Skill preview | `skillPreview`, `cachedSkillForPreview`. Preview skill details before adding | **Missing** | P3-LOW |

### Category: Agent Modes

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Agent mode system | `agentMode`: 214. Full mode system with per-thread mode, mode switching, mode-specific behavior | **Partial** -- `agentModeColor()` and `smartModeColor`/`rushModeColor` in themes, `perlinAgentModeColor()` for animation. But no actual mode switching logic or mode-specific behavior | P2-MED |
| Code mode | `codeMode`: 6. Dedicated coding-focused mode | **Missing** | P3-LOW |
| Oracle sub-agent | `oracle`: 19. Specialized reasoning sub-agent | **Present** -- Tool-call-widget routes `oracle`, `code_review`, `librarian` to TaskTool rendering | -- |

### Category: Bottom Grid / Split View

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Resizable bottom grid | `bottomGridUserHeight`, `bottomGridDragStartY`, `bottomGridDragStartHeight`. Drag-resizable split between chat and input area | **Missing** | P2-MED |
| Drag resize handling | `dragStart`: 13, `dragEnd`: 4, `resizeHandle`: 3. Mouse-based resize | **Missing** | P2-MED |

### Category: DTW (Desktop/Web) Mode

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| DTW mode | `isDTWMode` multiple refs. Desktop/web mode with transport connection, websocket reconnect, image upload via API | **Missing** -- flitter-cli is terminal-only | P3-LOW |
| Transport/reconnect | `transportConnection`: 10, `reconnect`: 52, `websocket`: 43 | **Missing** | P3-LOW |

### Category: Telemetry / Analytics

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Telemetry system | `telemetry`: 687, `eventTracker`: 14, `sentry`: 3. Comprehensive event tracking and error reporting | **Missing** | P3-LOW |

### Category: Deferred Tools

| Feature | AMP Evidence | flitter-cli Status | Priority |
|---------|-------------|-------------------|----------|
| Deferred tool loading | `deferredTools`: 4. Tools loaded lazily per agent mode | **Missing** | P3-LOW |

---

## Priority Summary

### P1-HIGH (Core UX gaps -- should implement soon)

| # | Feature | Category |
|---|---------|----------|
| 1 | Thread switching + creation/deletion | Thread Management |
| 2 | Handoff mode (full controller) | Handoff Mode |
| 3 | Queue mode (full message queue) | Queue Mode |
| 4 | Queue dequeue on completion | Queue Mode |
| 5 | Compaction system | Context Window |
| 6 | Image paste/attachment input | Image Support |

### P2-MED (Important parity features)

| # | Feature | Category |
|---|---------|----------|
| 7 | Thread back/forward navigation | Thread Management |
| 8 | Thread title generation | Thread Management |
| 9 | Thread preview (split-view) | Thread Management |
| 10 | Thread worker pool | Thread Management |
| 11 | Handoff countdown timer | Handoff Mode |
| 12 | Deep reasoning effort levels (tri-state) | Deep Reasoning |
| 13 | Provider-specific speed settings | Deep Reasoning |
| 14 | Kitty graphics protocol | Image Support |
| 15 | Image preview overlay | Image Support |
| 16 | Context detail overlay | Context Window |
| 17 | Additional providers (8 missing) | Provider System |
| 18 | Model catalog | Provider System |
| 19 | Provider config service | Provider System |
| 20 | Thread mentions (@@) | Mention System |
| 21 | Edit previous message (Up arrow) | Message Navigation |
| 22 | Shell mode bash invocation list | Shell Mode |
| 23 | Confirmation overlay | UI Overlays |
| 24 | Context analyze modal | UI Overlays |
| 25 | File changes overlay | UI Overlays |
| 26 | Toast notifications | UI Overlays |
| 27 | Pending skills injection | Skill System |
| 28 | Skill service | Skill System |
| 29 | Agent mode switching | Agent Modes |
| 30 | Resizable bottom grid | Split View |
| 31 | Bash invocation display | Shell Mode |

### P3-LOW (Nice-to-have / advanced)

| # | Feature | Category |
|---|---------|----------|
| 32 | Thread visibility modes | Thread Management |
| 33 | Thread relationships | Thread Management |
| 34 | Deep mode effort hint controller | Deep Reasoning |
| 35 | Shimmer/falling overlay animation | Deep Reasoning |
| 36 | Interleaved thinking config | Deep Reasoning |
| 37 | Image click handler | Image Support |
| 38 | Auto-copy on selection | Clipboard |
| 39 | JetBrains installer | Editor |
| 40 | IDE picker / IDE client | Editor |
| 41 | MCP status modal | UI Overlays |
| 42 | Console overlay | UI Overlays |
| 43 | News feed reader | UI Overlays |
| 44 | Thread cost fetch from API | Cost Tracking |
| 45 | Skill preview | Skill System |
| 46 | Code mode | Agent Modes |
| 47 | DTW mode / transport | DTW |
| 48 | Telemetry system | Telemetry |
| 49 | Deferred tool loading | Tools |

---

## Class Analysis

AMP defines approximately **200+ classes** extending the widget framework:

| Base Class | Role | Count (approx) |
|-----------|------|----------------|
| `FT extends Mn` | StatefulWidget | ~25 |
| `KT` | StatefulWidget variant | ~20 |
| `z0 extends Mn` | StatelessWidget | ~10 |
| `q9 extends uH` | State class | ~15 |
| `Yr extends Kf` | Layout widget | ~10 |
| `Ln extends Kf` | Layout widget variant | ~3 |
| `nA extends Kf` | Layout widget variant | ~3 |
| `br extends Mn` | InheritedWidget | ~8 |
| `Vf extends Uu` | RenderObject | ~5 |
| `w3` | Model/Data class | ~15 |
| `dH` | Binding class | ~3 |
| `dn` | Core framework | ~5 |
| `Error` | Error types | ~10 |
| Other | Various | ~20+ |

Key widget classes identified by context:

- **Shell/App**: Main TUI app shell with all overlay/modal state
- **ThreadView**: Thread message display (52 refs)
- **ImagePreview**: Image preview overlay (57 refs)
- **MessageView**: Message rendering with selection mode
- **InputArea**: Text input with autocomplete, shell mode, image attachments
- **CommandPalette**: Command palette with categories
- **BJR (BashInvocationsWidget)**: Running bash command display
- **hW (ImageInheritedWidget)**: Image preview/save inherited widget

---

## Raw Occurrence Counts (AMP Source)

For reference, raw grep counts of key identifiers:

```
thread: 1749          handoff: 214         agentMode: 214
threadId: 355         queuedMessage: 88    telemetry: 687
threadTitle: 51       pendingSkill: 108    configService: 68
ThreadView: 52        pendingApproval: 48  scrollOffset: 59
createThread: 18      compaction: 32       accessToken: 56
switchThread: 9       contextWindow: 44    connect: 805
deleteThread: 5       deepReasoning: 31    clipboard: 17
threadWorker: 50      reasoningEffort: 37  shellMode: 8
currentThread: 38     ImagePreview: 57     openInEditor: 9
toolUse: 146          kittyGraphics: 8     JetBrains: 14
abortController: 69   autocomplete: 32    idePicker: 21
interrupt: 86         contextAnalyze: 28   perlin: 21
```
