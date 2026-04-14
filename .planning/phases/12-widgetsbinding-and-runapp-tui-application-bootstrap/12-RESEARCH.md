# Phase 12 Research: WidgetsBinding and runApp — TUI Application Bootstrap

## 1. Key Class Mappings (Reversed → TypeScript)

| Reversed Name | TypeScript Target | Module | Lines | Role |
|---|---|---|---|---|
| `d9` | `WidgetsBinding` | `@flitter/tui` binding/ | tui-layout-engine.js:1114-1193 + tui-render-pipeline.js:7-198 | Singleton orchestrator: composes all subsystems, manages app lifecycle |
| `T1T` | `runApp()` | `@flitter/tui` binding/ | tui-render-pipeline.js:199-203 | Top-level convenience function → delegates to `WidgetsBinding.instance.runApp(widget)` |
| `XXT` | `TuiController` | `@flitter/tui` tui/ | clipboard-and-input.js:511-620 | Terminal raw mode, stdin, alt screen, mouse/paste/keyboard protocol, signal handling |
| `ic` | `FocusManager` | `@flitter/tui` focus/ | conversation-ui-logic.js | Singleton focus tree manager: key/paste event routing, tab navigation |
| `l8` | `FocusNode` | `@flitter/tui` focus/ | conversation-ui-logic.js | Focus tree node: parent/children, canRequestFocus, key handlers, paste handlers |
| `ha` | `MouseManager` | `@flitter/tui` gestures/ | tui-layout-engine.js:1120 (usage) | Mouse event dispatch via recursive HitTest |
| `nXT` | `HitTestResult` | `@flitter/tui` gestures/ | tui-widget-framework.js:1852-1920 | Accumulates hit targets from tree walk |
| `oXT` | `HitTestEntry` | `@flitter/tui` gestures/ | tui-widget-framework.js:1852 | Static factory: `hitTest(renderObject, position)` |
| `BM` | `MediaQueryData` | `@flitter/tui` widgets/ | tui-layout-engine.js:1046-1058 | `{ size: { rows, cols }, capabilities: { supportsEmojiWidth, supportsSyncOutput } }` |
| `I9` | `MediaQuery` | `@flitter/tui` widgets/ | tui-layout-engine.js (InheritedWidget) | InheritedWidget wrapping MediaQueryData |
| `Ly0` | `setBuildOwner`/`setPipelineOwner` | `@flitter/tui` tree/types.ts | tui-widget-framework.js:1454 | **ALREADY EXISTS** — bridge functions for global access to schedulers |
| `JXT` | `PipelineOwner` | `@flitter/tui` tree/ | tui-layout-engine.js:1059-1113 | **ALREADY EXISTS** (enhanced version in Phase 4) |
| `k8` | `FrameScheduler` | `@flitter/tui` tree/ | tui-layout-engine.js | **ALREADY EXISTS** (Phase 4) |
| `YXT` | `BuildOwner` | `@flitter/tui` tree/ | tui-layout-engine.js | **ALREADY EXISTS** (Phase 4) |

## 2. Initialization Sequence (WidgetsBinding.runApp)

```
Step 1:  d9.instance (singleton lazy-init)
         ├── new FrameScheduler() ← ALREADY EXISTS
         ├── new BuildOwner() ← ALREADY EXISTS
         ├── new PipelineOwner() ← ALREADY EXISTS
         ├── new FocusManager() ← MISSING
         ├── new MouseManager() ← MISSING
         ├── new TuiController() ← MISSING
         └── Ly0(buildOwner.onBuild, pipelineOwner.onNeedLayout) ← EXISTS (setBuildOwner/setPipelineOwner)

Step 2:  Register 6 frame callbacks to FrameScheduler
         ├── "frame-start": beginFrame (timestamp, frame stats)
         ├── "resize": processResizeIfPending
         ├── "build": buildOwner.buildScopes()
         ├── "layout": pipelineOwner.flushLayout()
         ├── "paint": pipelineOwner.flushPaint() + custom paint logic
         └── "render": renderer.render(screen) → write to stdout

Step 3:  binding.runApp(widget)
         ├── Guard: if (isRunning) throw
         ├── isRunning = true
         ├── tui.init() → raw mode, alt screen, mouse enable, paste enable, capability detection
         ├── focusManager.init() → create rootScope
         ├── Wait for terminal capabilities (timeout 1000ms)
         ├── Query RGB colors (terminal color scheme detection)
         ├── createMediaQueryWrapper(widget) → new MediaQuery({ data, child: widget })
         ├── rootElement = wrapper.createElement()
         ├── rootElement.mount(null) → triggers first build cascade
         ├── updateRootRenderObject() → pipelineOwner.rootRenderObject = rootElement.renderObject
         ├── mouseManager.setRootRenderObject(rootRenderObject)
         ├── rootElementMountedCallback?.()
         ├── setupEventHandlers()
         │   ├── tui.onResize → pendingResize = true, requestFrame
         │   ├── tui.onKey → keyInterceptors → focusManager.handleKeyEvent → handleGlobalKeyEvent
         │   ├── tui.onMouse → mouseManager.handleMouseEvent
         │   ├── tui.onPaste → focusManager.handlePasteEvent
         │   └── tui.onCapabilities → update MediaQueryData, requestFrame
         ├── frameScheduler.requestFrame() → triggers first render
         └── await waitForExit() → resolves when stop() is called (Ctrl+C/Ctrl+D)

Step 4:  cleanup() (finally block)
         ├── rootElement.unmount()
         ├── focusManager.dispose()
         ├── mouseManager.dispose()
         ├── buildOwner.dispose()
         ├── pipelineOwner.dispose()
         ├── frameScheduler.dispose()
         ├── Remove all frame callbacks
         └── tui.deinit() → exit alt screen, reset terminal state
```

## 3. Event Flow Diagrams

### 3.1 Keyboard Input Flow
```
/dev/tty stdin
    │
    ▼
TuiController.tty.on("data")
    │
    ▼
InputParser.feed(buffer)
    │ (VtParser → semantic events)
    ▼
TuiController.onKey(keyEvent)
    │
    ▼
WidgetsBinding.setupEventHandlers.onKey
    │
    ├──▶ keyInterceptors[] (command palette, global shortcuts)
    │    if interceptor returns "handled" → stop
    │
    ├──▶ focusManager.handleKeyEvent(keyEvent)
    │    │
    │    └──▶ walk up from primaryFocus → ancestors
    │         each node._handleKeyEvent(event)
    │         if returns "handled" → stop
    │         (typically reaches TextField which processes the keystroke)
    │
    └──▶ handleGlobalKeyEvent(keyEvent)
         (Ctrl+Z → suspend, other global bindings)
```

### 3.2 Mouse Input Flow
```
stdin → InputParser → MouseEvent
    │
    ▼
TuiController.onMouse(mouseEvent)
    │
    ▼
WidgetsBinding.setupEventHandlers.onMouse
    │
    ▼
mouseManager.handleMouseEvent(event)
    │
    ├──▶ HitTestResult.hitTest(rootRenderObject, position)
    │    │
    │    └──▶ recursive tree walk (reverse child order = front-to-back)
    │         each RenderBox.hitTest(result, position)
    │         adds matching targets to result._hits[]
    │
    └──▶ dispatch to hit targets
         click → onMouseDown/onMouseUp handlers
         scroll → onScroll handlers
         move → hover state tracking
```

### 3.3 Frame Render Pipeline
```
frameScheduler.requestFrame()
    │
    ▼ (16ms cadence, debounced)
    │
    ├── beginFrame(timestamp)        — frame stats, idle tracking
    ├── processResizeIfPending()     — new MediaQuery if terminal resized
    ├── buildOwner.buildScopes()     — rebuild dirty elements (depth-sorted)
    ├── pipelineOwner.flushLayout()  — layout dirty render objects
    ├── paint()                      — paint dirty render objects → screen buffer
    └── render()                     — ANSI diff → stdout
```

### 3.4 LLM Conversation Flow (Widget ↔ ThreadWorker)
```
User types in TextField
    │ (via FocusManager → FocusNode → TextField._handleKeyEvent)
    ▼
TextField → TextEditingController.insertText()
    │
    ▼ (Enter key)
AppWidget.State._sendMessage(text)
    │
    ├── threadStore.addMessage({ role: "human", content: text })
    └── threadWorker.runInference()
            │
            ├── Build system prompt
            ├── provider.stream(params) → async generator
            │   │
            │   └──▶ StreamDelta events → threadStore updates → setState()
            │        │
            │        └── Widget tree rebuilds (via BuildOwner)
            │            └── ConversationView re-renders with new messages
            │
            └── if tool_use → toolOrchestrator.execute() → recurse
```

## 4. Subsystem Dependencies (DAG)

```
                    WidgetsBinding
                    /    |    \     \
                   /     |     \     \
          TuiController  |  FocusManager  MouseManager
              |          |      |              |
          InputParser    |  FocusNode    HitTestResult
          VtParser       |                     |
          Screen         |           RenderObject.hitTest
          Renderer       |
                         |
                    InheritedWidget
                    /          \
               MediaQuery    Theme.of()
                    |        ConfigProvider
               MediaQueryData
                    |
            terminal size + caps
```

**Dependency order (bottom-up):**
1. InheritedWidget + InheritedElement (no deps, extends existing tree/)
2. FocusNode (no deps beyond tree primitives)
3. FocusManager (depends on FocusNode)
4. HitTestResult (depends on RenderObject.hitTest patch)
5. MouseManager (depends on HitTestResult)
6. TuiController (depends on existing InputParser, Screen, Renderer)
7. MediaQuery (depends on InheritedWidget)
8. WidgetsBinding (depends on ALL above + existing BuildOwner/PipelineOwner/FrameScheduler)
9. runApp() (thin wrapper over WidgetsBinding)

## 5. Recommended Implementation Order (Waves)

### Wave A: Framework Primitives (no existing code changes)
| Plan | Target | Est. Lines | Files |
|---|---|---|---|
| 12-01 | InheritedWidget + InheritedElement | ~200 | `tree/inherited-widget.ts`, `tree/inherited-element.ts` |
| 12-02 | FocusNode + FocusScopeNode | ~350 | `focus/focus-node.ts` |
| 12-03 | FocusManager singleton | ~250 | `focus/focus-manager.ts` |
| 12-04 | HitTestResult + RenderObject.hitTest patch | ~200 | `gestures/hit-test.ts`, patch `tree/render-box.ts` |

### Wave B: Terminal & Event Infrastructure
| Plan | Target | Est. Lines | Files |
|---|---|---|---|
| 12-05 | TuiController (raw mode, stdin, alt screen, signals) | ~500 | `tui/tui-controller.ts` |
| 12-06 | MouseManager | ~300 | `gestures/mouse-manager.ts` |
| 12-07 | MediaQuery (InheritedWidget + MediaQueryData) | ~150 | `widgets/media-query.ts` |

### Wave C: Binding & Bootstrap
| Plan | Target | Est. Lines | Files |
|---|---|---|---|
| 12-08 | WidgetsBinding singleton | ~400 | `binding/widgets-binding.ts` |
| 12-09 | runApp() + export wiring | ~100 | `binding/run-app.ts`, update `index.ts` |

### Wave D: App Widgets (Minimal Viable)
| Plan | Target | Est. Lines | Files |
|---|---|---|---|
| 12-10 | ThemeController + ConfigProvider (real InheritedWidgets) | ~200 | `@flitter/cli` modes/ |
| 12-11 | AppWidget + ThreadStateWidget (real StatefulWidgets) | ~400 | `@flitter/cli` modes/ |
| 12-12 | InputField + ConversationView (minimal conversation UI) | ~600 | `@flitter/cli` modes/ |

### Wave E: Integration
| Plan | Target | Est. Lines | Files |
|---|---|---|---|
| 12-13 | Replace interactive.ts stubs with real imports | ~100 | `@flitter/cli` modes/interactive.ts |
| 12-14 | Theme.of() migration from global to InheritedWidget | ~50 | patch `widgets/theme.ts` |
| 12-15 | End-to-end integration test | ~200 | test files |

**Total: ~3300 lines across 15 plans, 5 waves**

## 6. Risk Areas and Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| **Alt screen cleanup failure** → terminal state pollution | HIGH | `tui.deinit()` in try/finally; register SIGINT/SIGTERM handlers; `process.on('exit')` failsafe |
| **Element mount timing** → accessing renderObject before layout | HIGH | Guard with `assert(renderObject !== null)` in WidgetsBinding; follow Amp's mount → updateRootRenderObject → setupEventHandlers order exactly |
| **Frame scheduler backpressure** → layout taking >16ms blocks render | MEDIUM | Amp uses frame stats overlay (`ZXT`); add `FrameScheduler.isOverBudget` flag; skip non-critical frames |
| **Focus tree desync** → focus on unmounted node | MEDIUM | FocusManager.unregisterNode() clears primary focus if matches; auto-focus-next on remove |
| **InheritedWidget rebuild cascade** → performance | MEDIUM | Only rebuild direct dependents (not all descendants); match Amp's `addDependent` set semantics |
| **Signal handler conflicts** → multiple SIGINT handlers | LOW | Use `once` for cleanup; check `isRunning` flag before cleanup |
| **stdin contention** → other code reading stdin | LOW | TuiController should exclusively own stdin; check `stdin.isTTY` before setRawMode |

## 7. MVP vs Full-Feature Tradeoffs

### Option A: Full Architecture (recommended, 15 plans)
- Complete Flutter-for-Terminal pipeline: InheritedWidget → Focus → Mouse → TuiController → WidgetsBinding → runApp
- Real conversation UI widgets with streaming message display
- Full keyboard navigation, mouse interaction, command palette
- **Matches Amp CLI experience**
- Est: ~3300 lines, 5 waves

### Option B: Pragmatic MVP (5 plans)
- Skip: InheritedWidget (use globals), MouseManager (keyboard-only), HitTestResult
- Minimal TuiController (raw mode + stdin only, no mouse, no capability detection)
- Simple WidgetsBinding (just BuildOwner + PipelineOwner + FrameScheduler + TuiController)
- Basic readline-style input instead of full TextField
- Plain text output instead of message bubbles
- Est: ~1200 lines, 2 waves
- **Risk**: Accumulates significant tech debt; later phases need to retrofit InheritedWidget and Focus anyway

### Option C: REPL Shortcut (1 plan, ~200 lines)
- Bypass entire TUI framework
- Simple `while(true) { readline → threadWorker.runInference → print }` loop
- No widgets, no rendering, no frame scheduler
- **Fastest path to "type → get response"**
- **Risk**: Completely separate code path from TUI; throwaway work

### Recommendation
**Option A** — the subsystems are tightly coupled in Amp's architecture. InheritedWidget is required by Theme, MediaQuery, and ConfigProvider. FocusManager is required by TextField and CommandPalette. Skipping them creates more work later. The reversed code provides clear implementation blueprints for each class.

## 8. Existing @flitter/tui Inventory (Confirmed Available)

| Component | File | Usable As-Is | Notes |
|---|---|---|---|
| Widget/Element/RenderObject | tree/ | ✅ | Full lifecycle, mount/unmount/update |
| StatefulWidget/State | tree/stateful-widget.ts | ✅ | createState, setState, initState, dispose |
| StatelessWidget | tree/stateless-widget.ts | ✅ | |
| BuildOwner | tree/build-owner.ts | ✅ | Dirty element scheduling, depth-sorted rebuild |
| PipelineOwner | tree/pipeline-owner.ts | ✅ | Root render object, flush layout/paint |
| FrameScheduler | tree/frame-scheduler.ts | ✅ | 16ms cadence, 4-phase pipeline, post-frame callbacks |
| Bridge functions | tree/types.ts | ✅ | setPipelineOwner/setBuildOwner = reversed Ly0 |
| VtParser | vt/vt-parser.ts | ✅ | State machine ANSI parser |
| InputParser | vt/input-parser.ts | ✅ | KeyEvent/MouseEvent/PasteEvent output |
| Screen | screen/ | ✅ | Double-buffered cells + ANSI diff renderer |
| Layout widgets | widgets/ | ✅ | Row, Column, Flex, Stack, Padding, SizedBox, Container |
| Text/RichText | widgets/ | ✅ | TextSpan, CJK width calculation |
| TextEditingController | editing/ | ✅ | Full text editing state (1099 lines) |
| TextField | editing/text-field.ts | ⚠️ | Shell only — build() returns placeholder Text, no cursor, no key handling |
| ScrollController | scroll/ | ⚠️ | Controller works, but Scrollable is not a Widget subclass |
| Theme | widgets/theme.ts | ⚠️ | Works via global hack; needs InheritedWidget migration |
| Clipboard | selection/ | ✅ | Cross-platform pbcopy/wl-copy/xclip/OSC52 |

## 9. Key Decisions for Planning

1. **Where do new files go?**
   - Framework code → `packages/tui/src/` (binding/, focus/, gestures/, tui/)
   - App widgets → `packages/cli/src/modes/` (replace stubs in interactive.ts) or new `packages/cli/src/widgets/`

2. **InheritedWidget: new class or duck-typed?**
   - Reversed code uses duck typing (addDependent/removeDependent on Element)
   - Recommend: concrete `InheritedWidget` class extending `Widget` + `InheritedElement` extending `Element` — cleaner TypeScript typing

3. **FocusManager: singleton or context-injected?**
   - Reversed code: singleton `ic.instance`
   - Recommend: singleton (matches Amp; simpler than context injection for terminal TUI)

4. **TuiController: /dev/tty or process.stdin?**
   - Reversed code: tries `/dev/tty` first, falls back to `process.stdin`
   - Recommend: same strategy; `/dev/tty` allows stdin piping while maintaining TUI interaction

5. **Screen/Renderer: existing or new?**
   - Existing `packages/tui/src/screen/` has Screen + ANSI renderer
   - TuiController needs to integrate with these; they should be injected, not recreated
