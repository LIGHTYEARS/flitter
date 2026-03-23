# Requirements: Flutter-TUI

**Defined:** 2026-03-21 (v1.0), updated 2026-03-22 (v1.1)
**Core Value:** Flutter-faithful TUI framework with declarative widgets, box-constraint layout, and on-demand cell-level diff rendering
**Last review:** 2026-03-22 — v1.1 gap analysis requirements added

## v1.0 Requirements (Complete)

All v1.0 requirements shipped. See MILESTONES.md for details.

### Core Primitives (CORE)

- [x] **CORE-01**: Offset, Size, Rect types with integer arithmetic operations
- [x] **CORE-02**: Color class supporting Named/Ansi256/RGB with SGR conversion and round-trip fidelity
- [x] **CORE-03**: TextStyle with merge semantics and toSgr() output
- [x] **CORE-04**: TextSpan tree with traversal, plain text extraction, and CJK-aware width calculation
- [x] **CORE-05**: BoxConstraints with tight/loose/constrain/enforce algebra
- [x] **CORE-06**: Key system — ValueKey, UniqueKey, GlobalKey
- [x] **CORE-07**: Listenable / ChangeNotifier / ValueNotifier

### Terminal Layer (TERM)

- [x] **TERM-01**: Cell struct (char + style attrs + wide-char marker)
- [x] **TERM-02**: Double-buffered ScreenBuffer (front/back grids, swap, resize)
- [x] **TERM-03**: Cell-level diff algorithm producing RowPatch[]
- [x] **TERM-04**: ANSI renderer with SGR string building, BSU/ESU synchronized output
- [x] **TERM-05**: Terminal I/O (raw mode toggle, alt screen, SIGWINCH resize handling)
- [x] **TERM-06**: ANSI escape sequence parser → TextSpan conversion
- [x] **TERM-07**: Terminal capability detection (DA1/DA2, color depth, mouse support)

### Widget Framework (FRMW)

- [x] **FRMW-01** through **FRMW-11**: Complete three-tree framework

### Layout System (LYOT)

- [x] **LYOT-01** through **LYOT-05**: Complete layout system

### Frame & Paint (FPNT)

- [x] **FPNT-01** through **FPNT-06**: Complete frame scheduler and paint pipeline

### Input System (INPT)

- [x] **INPT-01** through **INPT-06**: Complete input system

### Widgets (WDGT)

- [x] **WDGT-01** through **WDGT-11**: Complete widget library

### Diagnostics & Examples (DIAG/EXMP)

- [x] **DIAG-01** through **DIAG-03**: Complete diagnostics
- [x] **EXMP-01** through **EXMP-08**: 28 example applications shipped

## v1.1 Requirements (Complete)

All v1.1 requirements shipped. See MILESTONES.md for details.

### Infrastructure InheritedWidgets (INFRA)

- [x] **INFRA-01**: MediaQuery InheritedWidget providing MediaQueryData (screen size, terminal capabilities) — wraps root widget in runApp (Amp: Q3)
- [x] **INFRA-02**: MediaQueryData class with size (width/height) and capabilities fields (Amp: nA)
- [x] **INFRA-03**: Theme InheritedWidget providing color scheme (primary, background, text, success, destructive, etc.) — used by DiffView, Button, RenderText (Amp: w3)
- [x] **INFRA-04**: HoverContext InheritedWidget for propagating mouse hover state to descendants (Amp: J_)

### Missing Widgets (MWDG)

- [x] **MWDG-01**: FocusScope/KeyboardListener StatefulWidget wrapping FocusNode — autofocus, onKey, onPaste, onFocusChange, canRequestFocus, skipTraversal (Amp: t4)
- [x] **MWDG-02**: Scrollbar StatefulWidget with thumb/track rendering, thickness, colors, characters, paired with ScrollController (Amp: ia)
- [x] **MWDG-03**: SelectionList StatefulWidget — interactive selection dialog with keyboard navigation (arrows/j/k/Tab), Enter confirm, Escape dismiss, mouse click, disabled item skip (Amp: ap)
- [x] **MWDG-04**: Dialog data class — title, type, widget, footerStyle, dimensions (Amp: ab)
- [x] **MWDG-05**: DiffView StatelessWidget — unified diff parsing, +/- line coloring, line numbers, syntax highlighting via Theme (Amp: Bn)
- [x] **MWDG-06**: ClipRect SingleChildRenderObjectWidget — clips child painting to parent bounds (Amp: nv)
- [x] **MWDG-07**: IntrinsicHeight SingleChildRenderObjectWidget with RenderIntrinsicHeight — queries child getMaxIntrinsicHeight and applies tight constraint (Amp: hJ/vU0)
- [x] **MWDG-08**: Markdown StatelessWidget — parses markdown text, renders as styled Text tree (headings, code, links via OSC 8) (Amp: _g)
- [x] **MWDG-09**: ContainerWithOverlays — extends Container with edge/corner overlay positioning using Stack+Positioned internally (Amp: bt)

### Framework Enhancements (FRMW)

- [x] **FRMW-12**: WidgetsBinding.mouseManager — global MouseManager singleton reference (Amp: Pg in J3)
- [x] **FRMW-13**: WidgetsBinding.eventCallbacks — keyboard, mouse, paste event global callback lists (Amp: J3)
- [x] **FRMW-14**: WidgetsBinding.keyInterceptors — keyboard event interceptor chain, priority over focus system (Amp: J3)
- [x] **FRMW-15**: Async runApp with terminal capability detection, MediaQuery wrapping of root widget, lazy focus/idle loading (Amp: cz8)
- [x] **FRMW-16**: BuildContext.mediaQuery field for fast MediaQueryData access (Amp: jd.mediaQuery)

### Text API Enhancements (TEXT)

- [x] **TEXT-01**: TextStyle.copyWith() for partial-override new instance creation (Amp: m0.copyWith)
- [x] **TEXT-02**: TextStyle static factories — normal(color), bold(color), italic(color), underline(color), colored(color), background(color) (Amp: m0 static methods)
- [x] **TEXT-03**: TextSpan.hyperlink property — { uri: string, id?: string } for OSC 8 terminal hyperlinks (Amp: TextSpan hyperlink)
- [x] **TEXT-04**: TextSpan.onClick callback property for click handling (Amp: TextSpan onClick)
- [x] **TEXT-05**: TextSpan.equals() deep structural comparison (Amp: TextSpan equality)

### RenderObject Enhancements (ROBJ)

- [x] **ROBJ-01**: RenderText selection support — selectable flag, selectedRanges[], selectionColor, copyHighlightColor, highlightMode (Amp: gU0)
- [x] **ROBJ-02**: RenderText character position tracking — _characterPositions[], _visualLines[] cache, getCharacterRect(index), getOffsetForPosition(x,y) (Amp: gU0)
- [x] **ROBJ-03**: RenderText hyperlink/click handling — getHyperlinkAtPosition(), getOnClickAtPosition(), handleMouseEvent() with cursor changes (Amp: gU0)
- [x] **ROBJ-04**: RenderText emoji width detection — _emojiWidthSupported flag from MediaQuery capabilities (Amp: gU0)
- [x] **ROBJ-05**: RenderFlex intrinsic size methods — getMinIntrinsicWidth(h), getMaxIntrinsicWidth(h), getMinIntrinsicHeight(w), getMaxIntrinsicHeight(w) (Amp: oU0)
- [x] **ROBJ-06**: RenderFlex CrossAxisAlignment.baseline variant (Amp: oU0)
- [x] **ROBJ-07**: ClipCanvas paint wrapper — clips painting area for scroll viewports (Amp: E$)

### Mouse/Cursor System (MOUS)

- [x] **MOUS-01**: MouseTracker/MouseManager singleton — global mouse tracking, cursor shape management, hover state coordination (Amp: Pg)
- [x] **MOUS-02**: SystemMouseCursors constants (POINTER, DEFAULT) with ANSI escape sequences (Amp: gg)
- [x] **MOUS-03**: MouseRegion.onRelease event callback (Amp: Ba.onRelease)
- [x] **MOUS-04**: MouseRegion.onDrag event callback (Amp: Ba.onDrag)

### ScrollController Enhancements (SCRL)

- [x] **SCRL-01**: ScrollController.animateTo(offset) with timer-based smooth scrolling animation (Amp: Lg.animateTo)
- [x] **SCRL-02**: ScrollController.followMode — auto-scroll to bottom when content grows, with disableFollowMode() (Amp: Lg.followMode)
- [x] **SCRL-03**: ScrollController.atBottom getter — check if scrolled to end (Amp: Lg.atBottom)

### Debug Tools (DBUG)

- [x] **DBUG-01**: Debug Inspector HTTP server on port 9876 — /tree, /inspect, /select endpoints exposing widget tree as JSON (Amp: Mu)

## v1.2 Requirements

Requirements for Amp CLI deep fidelity — rendering pipeline, terminal protocols, and advanced widget features identified by gap analysis (2026-03-22).

### Image Protocol (IMG)

- [x] **IMG-01**: ImagePreview StatefulWidget (`O_`) — displays inline images in terminal using Kitty graphics protocol. Transmits PNG data via `ESC_G` escape sequences with chunked transfer and placement cells. Falls back to empty SizedBox if terminal lacks Kitty support.
- [x] **IMG-02**: KittyImageWidget SingleChildRenderObjectWidget (`IH0`) — render object for Kitty image display with cell placement and sizing.
- [x] **IMG-03**: ImagePreviewProvider InheritedWidget (`X_`) — provides image preview context (image data, display state) to descendant widgets.

### AppTheme System (ATHM)

- [x] **ATHM-01**: AppTheme InheritedWidget (`h8`) — distinct from Theme (`w3`), provides application-specific theme data including `syntaxHighlight` config, `app` config, and `colors`. Accessed via `AppTheme.of(context)`.
- [x] **ATHM-02**: Syntax highlighting function (`ae`) — `syntaxHighlight(content, config, filePath)` performs file-extension-based syntax highlighting. Used by DiffView for colorized diff content.

### TextField Enhancements (TXFD)

- [x] **TXFD-01**: Multi-line editing support with `maxLines` property. Single-line: Enter submits. Multi-line: Ctrl+Enter submits, Enter inserts newline. Shift+Enter / Alt+Enter / Backslash+Enter for newline insertion.
- [x] **TXFD-02**: Word-level operations — delete word (Ctrl+Backspace/Ctrl+Delete), move by word (Ctrl+Left/Ctrl+Right), select word (Ctrl+Shift+Left/Right).
- [x] **TXFD-03**: Mouse interaction — click to place cursor, double-click to select word, click-and-drag for character/word selection. Global mouse release tracking via `MouseManager.addGlobalReleaseCallback`.
- [x] **TXFD-04**: Selection and clipboard — auto-copy selection to clipboard (500ms delay, 300ms highlight). Visual selection highlight using TextStyle background overlay.
- [x] **TXFD-05**: Render via RenderText — TextField should use Text/RenderText underneath (not a stub display widget) for consistent text rendering, CJK support, and hyperlink passthrough.

### Rendering Pipeline (RPIP)

- [x] **RPIP-01**: Alpha compositing / style blending (`aF8`) — Color class supports alpha channel. `Buffer.setCell()` blends styles when alpha < 1. `blendColor(front, back)` and `blendStyle(front, back)` functions.
- [x] **RPIP-02**: RGB to 256-color fallback (`sJ`) — nearest-match function using 240-entry palette (216 cube + 24 grayscale) with Euclidean distance and result caching. Used when `capabilities.canRgb` is false.
- [x] **RPIP-03**: ScreenBuffer default colors — `setDefaultColors(bg, fg)` sets default background/foreground for both buffers. Buffer stores `defaultBg`, `defaultFg`.
- [x] **RPIP-04**: Index-to-RGB mapping — `setIndexRgbMapping(mapping)` provides lookup table for 256-color indices to RGB values (used in alpha blending).
- [x] **RPIP-05**: Buffer `copyTo(target)` method — deep copy cells from one buffer to another.

### Terminal Protocol (TPRO)

- [x] **TPRO-01**: Kitty keyboard protocol — `enableKittyKeyboard()` (`ESC[>5u`) / `disableKittyKeyboard()` (`ESC[<u]`) for enhanced key event reporting.
- [x] **TPRO-02**: ModifyOtherKeys — `enableModifyOtherKeys()` (`ESC[>4;1m`) / `disableModifyOtherKeys()` (`ESC[>4;0m`) for disambiguating key events.
- [x] **TPRO-03**: Emoji width mode — `enableEmojiWidth()` (`ESC[?2027h`) / `disableEmojiWidth()` (`ESC[?2027l]`) for accurate emoji width detection.
- [x] **TPRO-04**: In-band resize — `enableInBandResize()` (`ESC[?2048h`) / `disableInBandResize()` (`ESC[?2048l]`) for resize event via escape sequence.
- [x] **TPRO-05**: Progress bar OSC — `setProgressBarIndeterminate()` (`OSC 9;4;3 ST`), `setProgressBarOff()` (`OSC 9;4;0 ST`), `setProgressBarPaused()` (`OSC 9;4;4 ST`).
- [x] **TPRO-06**: Window title OSC — `SET_TITLE(title)` (`ESC]0;{title}\x07`).
- [x] **TPRO-07**: Mouse cursor shape OSC — `SET_MOUSE_SHAPE(name)` (`ESC]22;{name} ESC\`).
- [x] **TPRO-08**: Pixel mouse — `enablePixelMouse()` (`ESC[?1016h`) / `disablePixelMouse()` (`ESC[?1016l`).
- [x] **TPRO-09**: Terminal cleanup function (`zG8`) — comprehensive cleanup on exit (SIGINT/SIGTERM/process exit) disabling all 12+ terminal modes including Kitty kbd, pixel mouse, in-band resize, emoji width, color palette notifications.
- [x] **TPRO-10**: Terminal capability detection via escape queries (`vF` queryParser) — send capability queries and parse responses to detect Kitty graphics, emoji width support, color depth.

### Performance Diagnostics (PERF)

- [x] **PERF-01**: PerformanceTracker additional metrics — `keyEventTimes`, `mouseEventTimes`, `repaintPercents`, `bytesWritten` with P95/P99 getters for all categories.
- [x] **PERF-02**: PerformanceOverlay direct-to-buffer rendering — `draw(screen, frameStats)` paints 34x14 box to screen buffer at top-right corner with Unicode borders, "Gotta Go Fast" title, color-coded thresholds (green <70%, yellow 70-100%, red >100%).
- [x] **PERF-03**: `WidgetsBinding.toggleFrameStatsOverlay()` — method to toggle overlay on/off with forced paint frame request.

### Minor Enhancements (MINR)

- [x] **MINR-01**: JetBrains terminal wheel filter — `jetBrainsWheelFilter` on TerminalManager for non-standard scroll behavior in JetBrains terminals.
- [x] **MINR-02**: `setCursorPositionHint(x, y)` on ScreenBuffer — sets cursor position without changing visibility.
- [x] **MINR-03**: `processResizeIfPending()` as separate BUILD phase callback at priority -1000 (between beginFrame at -2000 and buildScopes at 0).
- [x] **MINR-04**: `eventCallbacks.paste` array — global paste event callback list on WidgetsBinding alongside existing key/mouse callbacks.
- [x] **MINR-05**: `capabilities.scrollStep()` method — configurable lines per scroll step (default 3).
- [x] **MINR-06**: Layout helper function (`fS`) — standalone function estimating intrinsic width by recursively examining widget types.
- [x] **MINR-07**: `Buffer.getCells()` deep copy method — returns deep copy of all cells.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Animation

- **ANIM-01**: Tween-based animation controller
- **ANIM-02**: Curve library (ease, bounce, elastic)
- **ANIM-03**: AnimatedContainer, AnimatedOpacity widgets

### Navigation & Overlay

- **NOVL-01**: Overlay / OverlayEntry for tooltips, dropdowns, modals
- **NOVL-02**: NotificationListener / Notification bubbling
- **NOVL-03**: Navigator / Route for screen management

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| GPU rendering | Terminal is character-cell; no GPU needed |
| JSX/TSX syntax | Pure TS constructors match Flutter pattern |
| Node.js compat layer | Bun-first; Node may work but not guaranteed |
| Screen reader / a11y | Orthogonal to core rendering; v2+ |
| Web target | Terminal-only framework |
| React-like hooks API | Flutter uses class-based State, not hooks |
| Sixel image rendering | Only Kitty protocol is used in Amp; Sixel not needed |
| Animation framework (Tween/Curve) | Amp uses timer-based scheduling, not tweens |
| GestureDetector/GestureRecognizer | Amp only uses MouseRegion; no gesture recognizer pattern |
| Navigator/Route | Amp uses state-based UI switching; no routing system |
| ListView/SliverList | Amp only uses SingleChildScrollView; no sliver protocol |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.0 Traceability (Complete)

All 65 v1.0 requirements completed across Phases 1-8. See MILESTONES.md.

### v1.1 Traceability (Complete)

All 38 v1.1 requirements completed across Phases 9-15. See MILESTONES.md.

### v1.2 Traceability (Complete)

All 35 v1.2 requirements completed across Phases 16-22.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IMG-01 | Phase 19 | Complete |
| IMG-02 | Phase 19 | Complete |
| IMG-03 | Phase 19 | Complete |
| ATHM-01 | Phase 16 | Complete |
| ATHM-02 | Phase 16 | Complete |
| TXFD-01 | Phase 20 | Complete |
| TXFD-02 | Phase 20 | Complete |
| TXFD-03 | Phase 20 | Complete |
| TXFD-04 | Phase 20 | Complete |
| TXFD-05 | Phase 20 | Complete |
| RPIP-01 | Phase 17 | Complete |
| RPIP-02 | Phase 17 | Complete |
| RPIP-03 | Phase 17 | Complete |
| RPIP-04 | Phase 17 | Complete |
| RPIP-05 | Phase 17 | Complete |
| TPRO-01 | Phase 18 | Complete |
| TPRO-02 | Phase 18 | Complete |
| TPRO-03 | Phase 18 | Complete |
| TPRO-04 | Phase 18 | Complete |
| TPRO-05 | Phase 18 | Complete |
| TPRO-06 | Phase 18 | Complete |
| TPRO-07 | Phase 18 | Complete |
| TPRO-08 | Phase 18 | Complete |
| TPRO-09 | Phase 18 | Complete |
| TPRO-10 | Phase 18 | Complete |
| PERF-01 | Phase 21 | Complete |
| PERF-02 | Phase 21 | Complete |
| PERF-03 | Phase 21 | Complete |
| MINR-01 | Phase 22 | Complete |
| MINR-02 | Phase 22 | Complete |
| MINR-03 | Phase 22 | Complete |
| MINR-04 | Phase 22 | Complete |
| MINR-05 | Phase 22 | Complete |
| MINR-06 | Phase 22 | Complete |
| MINR-07 | Phase 22 | Complete |

**Coverage:**
- v1.2 requirements: 35 total
- Completed: 35
- Remaining: 0

## v1.3 Requirements

Requirements for Amp Architecture Realignment — refactoring the core rendering pipeline to match Amp's actual ownership model, call chains, and frame lifecycle. Every requirement includes the exact Amp reference code pattern that must be followed.

**Context:** Manual testing revealed 4 cascading bugs caused by systemic architectural drift from Amp's design:
1. Standalone `runApp()` doing terminal init externally (Amp: J3 owns wB0, init inside J3.runApp)
2. Dual frame scheduling (scheduleFrame + FrameScheduler) (Amp: J3 has NO scheduleFrame/drawFrame)
3. BuildOwner not calling requestFrame (Amp: NB0.scheduleBuildFor calls c9.instance.requestFrame)
4. Element.markNeedsRebuild not calling BuildOwner (Amp: XG8().scheduleBuildFor(this))

### WidgetsBinding Refactoring (BIND)

- [ ] **BIND-01**: WidgetsBinding (J3) singleton owns TerminalManager (wB0) as direct field `this.tui = new wB0`. WidgetsBinding constructor creates BuildOwner, PipelineOwner, and registers 6 frame callbacks on FrameScheduler. No standalone terminal init in runApp.
  - **Amp ref**: `.reference/widget-tree.md:1134-1187` (class J3 constructor)
  - **Implement from**: J3 field declarations (lines 1134-1150), constructor (lines 1154-1187)
  - **Review against**: J3.tui ownership (line 1142), 6 addFrameCallback calls (lines 1159-1175), VG8 global scheduler registration (lines 1178-1185)
  - **Anti-pattern to eliminate**: Current `runApp()` creates BunPlatform externally, does enableRawMode/enterAltScreen/InputBridge outside WidgetsBinding

- [ ] **BIND-02**: WidgetsBinding.runApp(widget) is an async instance method that initializes terminal, mounts root element in MediaQuery wrapper, sets up event handlers, requests first frame, and awaits waitForExit(). All initialization logic lives inside this method, not in a standalone function.
  - **Amp ref**: `.reference/widget-tree.md:1189-1236` (J3.runApp)
  - **Implement from**: J3.runApp sequence: tui.init() → tui.enterAltScreen() → lazy-load focus/idle tracking → waitForCapabilities → color detection → createMediaQueryWrapper → mount rootElement → set rootRenderObject → setupEventHandlers → requestFrame → waitForExit → cleanup
  - **Review against**: Exact call order in lines 1189-1236; verify tui.init() is called, not BunPlatform.enableRawMode
  - **Anti-pattern to eliminate**: Current standalone `runApp()` function with terminal init block

- [ ] **BIND-03**: WidgetsBinding has NO `scheduleFrame()` or `drawFrame()` methods. All frame execution is via FrameScheduler registered callbacks. Remove `_frameScheduled` flag and queueMicrotask fallback.
  - **Amp ref**: `.reference/widget-tree.md:1134-1296` (full J3 class — no scheduleFrame/drawFrame methods exist)
  - **Implement from**: J3 registers frame callbacks in constructor (lines 1159-1175); executeFrame in FrameScheduler calls them in order
  - **Review against**: Verify J3 class has no scheduleFrame or drawFrame. Verify all frame triggering goes through c9.requestFrame()
  - **Anti-pattern to eliminate**: Current `scheduleFrame()` with `_frameScheduled` flag, `drawFrame()` method, `_useFrameScheduler()` branching

- [ ] **BIND-04**: WidgetsBinding.beginFrame() determines whether painting is needed by checking forcePaintOnNextFrame, buildOwner.hasDirtyElements, pipelineOwner.hasNodesNeedingLayout/Paint, screen.requiresFullRefresh. Sets shouldPaintCurrentFrame flag.
  - **Amp ref**: `.reference/widget-tree.md:1243-1252` (J3.beginFrame)
  - **Implement from**: Lines 1243-1252 — 5-condition OR for shouldPaintCurrentFrame
  - **Review against**: Exact condition list, forcePaintOnNextFrame reset

- [ ] **BIND-05**: WidgetsBinding.paint() checks shouldPaintCurrentFrame, calls pipelineOwner.flushPaint(), clears screen, paints from root RenderObject, renders PerformanceOverlay, sets didPaintCurrentFrame. WidgetsBinding.render() checks didPaintCurrentFrame and calls tui.render().
  - **Amp ref**: `.reference/widget-tree.md:1254-1275` (J3.paint and J3.render)
  - **Implement from**: paint() (lines 1254-1269), render() (lines 1272-1275)
  - **Review against**: paint() clears screen BEFORE painting, overlay drawn AFTER tree paint

- [ ] **BIND-06**: WidgetsBinding.cleanup() async method: unmounts root element, disposes buildOwner/pipelineOwner/focusManager/mouseManager, removes all 6 frame callbacks by name, calls tui.deinit().
  - **Amp ref**: `.reference/widget-tree.md:1284-1296` (J3.cleanup)
  - **Implement from**: Lines 1284-1296 — exact cleanup sequence
  - **Review against**: All 6 named callbacks removed, tui.deinit() called last

- [ ] **BIND-07**: WidgetsBinding.stop() sets isRunning=false and resolves the waitForExit Promise. waitForExit() returns a Promise that resolves only when stop() is called, keeping the process alive.
  - **Amp ref**: `.reference/widget-tree.md:1238-1241` (J3.stop), `.reference/widget-tree.md:1232` (waitForExit call)
  - **Implement from**: stop() resolves exitResolve promise
  - **Review against**: Process stays alive via await waitForExit() in runApp

- [ ] **BIND-08**: WidgetsBinding.setupEventHandlers() connects wB0 event handlers (onKey, onMouse, onResize, onPaste, onFocus) to FocusManager dispatch, MouseManager dispatch, and eventCallbacks/keyInterceptors chains. Input wiring lives inside J3, not in a standalone InputBridge.
  - **Amp ref**: `.reference/input-system.md:601-634` (stdin→widget flow), `.reference/widget-tree.md:1230` (setupEventHandlers call)
  - **Implement from**: wB0.onKey → keyInterceptors → FocusManager.dispatch; wB0.onMouse → MouseManager.handleMouseEvent; wB0.onResize → resize handler; wB0.onPaste → eventCallbacks.paste + FocusManager.dispatchPaste
  - **Review against**: No standalone InputBridge class in the event chain; all wiring inside J3
  - **Anti-pattern to eliminate**: Current standalone InputBridge class with its own InputParser

### BuildOwner Refactoring (BOWN)

- [ ] **BOWN-01**: BuildOwner.scheduleBuildFor(element) adds element to dirty set AND calls c9.instance.requestFrame() directly. No intermediate bridge layer, no initSchedulers callback.
  - **Amp ref**: `.reference/element-tree.md:1277-1281` (NB0.scheduleBuildFor)
  - **Implement from**: Lines 1277-1281 — dedup check, add to set, c9.instance.requestFrame()
  - **Review against**: Verify requestFrame() is called INSIDE scheduleBuildFor, not via callback bridge
  - **Anti-pattern to eliminate**: Current scheduleBuildFor only adds to set; initSchedulers bridge in WidgetsBinding calls scheduleFrame() externally

- [ ] **BOWN-02**: BuildOwner.buildScopes() early-returns when dirty set is empty. Uses while loop for cascading dirtying, sorts by depth, calls performRebuild(), clears _dirty even on error. Records build stats.
  - **Amp ref**: `.reference/element-tree.md:1283-1320` (NB0.buildScopes)
  - **Implement from**: Lines 1283-1320 — early return, while loop, sort, performRebuild, error handling
  - **Review against**: Existing implementation already matches; verify no regressions from refactoring

### Element Refactoring (ELEM)

- [ ] **ELEM-01**: Element.markNeedsRebuild() sets _dirty=true and calls XG8().scheduleBuildFor(this) which routes to BuildOwner.scheduleBuildFor. This is the ONLY way elements get scheduled for rebuild. No try/catch wrapping the scheduleBuildFor call.
  - **Amp ref**: `.reference/element-tree.md:289-293` (T$.markNeedsRebuild)
  - **Implement from**: Lines 289-293 — guard unmounted, set dirty, call XG8().scheduleBuildFor(this)
  - **Review against**: No try/catch around scheduleBuildFor; must import properly, not use dynamic require()
  - **Anti-pattern to eliminate**: Current markNeedsRebuild uses try/catch around dynamic require('./binding')

### FrameScheduler Refactoring (FSCD)

- [ ] **FSCD-01**: FrameScheduler (c9) is the sole frame scheduling authority. requestFrame() coalesces calls, respects frame pacing (16.67ms budget), uses setImmediate for zero-delay and setTimeout for paced delay. No other component manages its own frame scheduling.
  - **Amp ref**: `.reference/frame-scheduler.md:78-213` (c9 class, requestFrame, executeFrame)
  - **Implement from**: requestFrame (lines 119-145), scheduleFrameExecution (lines 156-164), runScheduledFrame (lines 175-181), executeFrame (lines 187-212)
  - **Review against**: requestFrame has _frameScheduled and _frameInProgress guards; frame pacing with Oy (16.67ms); executeFrame iterates ["build","layout","paint","render"]; post-frame re-schedule check

- [ ] **FSCD-02**: FrameScheduler.addFrameCallback(id, callback, phase, priority, name) registers named callbacks. WidgetsBinding registers exactly 6: "frame-start" (build/-2000), "resize" (build/-1000), "build" (build/0), "layout" (layout/0), "paint" (paint/0), "render" (render/0).
  - **Amp ref**: `.reference/frame-scheduler.md:78-106` (fields), `.reference/widget-tree.md:1159-1175` (6 registrations)
  - **Implement from**: Map<id, {callback, phase, priority, name}> storage, executePhase sorts by priority within phase
  - **Review against**: Exactly 6 named callbacks with correct phases and priorities

### TerminalManager Refactoring (TMGR)

- [ ] **TMGR-01**: TerminalManager (wB0) is a concrete class owned by WidgetsBinding (not a standalone utility). Has parser, screen (ScreenBuffer), renderer, queryParser, capabilities, event handler arrays (key/mouse/resize/focus/paste/capability), and lastRenderDiffStats.
  - **Amp ref**: `.reference/screen-buffer.md:709-780` (class wB0)
  - **Implement from**: Lines 714-744 — field declarations, constructor
  - **Review against**: All fields match Amp wB0, owned by J3 (not standalone)

- [ ] **TMGR-02**: TerminalManager.init() sets up input parser, registers event handlers on stdin, enables raw mode, hides cursor, enables mouse. TerminalManager.deinit() reverses all modes and exits alt screen.
  - **Amp ref**: `.reference/screen-buffer.md:747-749` (init/deinit), `.reference/screen-buffer.md:783-800` (zG8 cleanup)
  - **Implement from**: init() enables terminal modes and creates parser; deinit() disables all modes
  - **Review against**: init() is called from J3.runApp(), not from standalone runApp()

- [ ] **TMGR-03**: TerminalManager.render() executes the full render cycle: diff screen buffers, build ANSI output, write to stdout, swap buffers. Called from WidgetsBinding.render() frame callback.
  - **Amp ref**: `.reference/screen-buffer.md:752` (render method), `.reference/widget-tree.md:1272-1275` (J3.render calls tui.render)
  - **Implement from**: Existing ScreenBuffer.diff + Renderer.render + buffer swap
  - **Review against**: render() is the ONLY path to terminal output; no direct stdout.write elsewhere

### runApp Refactoring (RAPP)

- [ ] **RAPP-01**: `runApp(widget, options?)` is a thin async function that gets J3.instance and calls await J3.instance.runApp(widget). Supports optional onRootElementMounted callback via options. Contains NO terminal initialization, NO InputBridge creation, NO event wiring.
  - **Amp ref**: `.reference/widget-tree.md:1314-1321` (cz8 function)
  - **Implement from**: Lines 1314-1321 — get J3.instance, optional callback, await b.runApp(g)
  - **Review against**: runApp body is ≤5 lines; verify NO terminal init code remains
  - **Anti-pattern to eliminate**: Current 50+ line runApp() with BunPlatform, InputBridge, terminal init, cleanup handlers

### Global Scheduler Registration (GSCD)

- [ ] **GSCD-01**: VG8/initSchedulers registers global build/layout/paint scheduler callbacks that Element.markNeedsRebuild and RenderObject.markNeedsLayout/Paint use. Called once in J3 constructor. Build scheduler routes to buildOwner.scheduleBuildFor. Layout/paint schedulers route to pipelineOwner.requestLayout/requestPaint/removeFromQueues.
  - **Amp ref**: `.reference/widget-tree.md:1178-1185` (VG8 call in J3 constructor)
  - **Implement from**: Lines 1178-1185 — VG8({scheduleBuildFor: ...}, {requestLayout: ..., requestPaint: ..., removeFromQueues: ...})
  - **Review against**: scheduleBuildFor bridge does NOT call scheduleFrame(); BuildOwner.scheduleBuildFor handles requestFrame() internally
  - **Anti-pattern to eliminate**: Current initSchedulers bridge that calls this.scheduleFrame() after scheduleBuildFor

### Integration Verification (INTG)

- [ ] **INTG-01**: End-to-end setState→render pipeline test: StatefulWidget.setState() → Element.markNeedsRebuild() → BuildOwner.scheduleBuildFor() → c9.requestFrame() → executeFrame → build/layout/paint/render phases → ScreenBuffer updated with new content. Verified in automated test.
  - **Amp ref**: `.reference/element-tree.md:1631-1680` (complete setState→frame chain)
  - **Implement from**: Write integration test that exercises the full chain
  - **Review against**: Every arrow in the chain diagram (lines 1631-1680) must correspond to an actual call

- [ ] **INTG-02**: Interactive example validation: counter example starts in alt screen, renders centered content, responds to Up/Down/+/- keys with immediate visual update, quits cleanly on q/Ctrl+C. No process exit without user action.
  - **Amp ref**: Full pipeline working end-to-end
  - **Implement from**: Run `bun run examples/counter.ts` and verify interactive behavior
  - **Review against**: Manual testing checklist

- [ ] **INTG-03**: All existing tests pass after refactoring. No test regressions from architectural changes. `bun test` reports 0 failures.
  - **Implement from**: Run full test suite after each refactoring phase
  - **Review against**: Test count ≥ 2603 (current count), 0 failures

### v1.3 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BIND-01 | Phase 23 | Planned |
| BIND-02 | Phase 23 | Planned |
| BIND-03 | Phase 23 | Planned |
| BIND-04 | Phase 23 | Planned |
| BIND-05 | Phase 23 | Planned |
| BIND-06 | Phase 23 | Planned |
| BIND-07 | Phase 23 | Planned |
| BIND-08 | Phase 24 | Planned |
| BOWN-01 | Phase 24 | Planned |
| BOWN-02 | Phase 24 | Planned |
| ELEM-01 | Phase 24 | Planned |
| FSCD-01 | Phase 23 | Planned |
| FSCD-02 | Phase 23 | Planned |
| TMGR-01 | Phase 23 | Planned |
| TMGR-02 | Phase 23 | Planned |
| TMGR-03 | Phase 23 | Planned |
| RAPP-01 | Phase 24 | Planned |
| GSCD-01 | Phase 24 | Planned |
| INTG-01 | Phase 25 | Planned |
| INTG-02 | Phase 25 | Planned |
| INTG-03 | Phase 25 | Planned |

**Coverage:**
- v1.3 requirements: 21 total
- Completed: 0
- Remaining: 21

---
*Requirements defined: 2026-03-21 (v1.0)*
*Last updated: 2026-03-23 — v1.3 requirements added (Amp Architecture Realignment)*
