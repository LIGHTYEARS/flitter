# Roadmap: Flutter-TUI

## Overview

Build a complete Flutter-for-Terminal framework in TypeScript/Bun, progressing from core type primitives through terminal abstraction, three-tree widget framework, layout engine, frame scheduling, input handling, high-level widgets, and finally diagnostics with example applications. Each phase builds on the previous, with parallel development opportunities across phases.

**Last review:** 2026-03-23 — v1.3 milestone roadmap added. 4 new phases (23-26), 21 requirements.

## Milestones

- ✓ **v1.0 MVP** — Phases 1-8 (complete, shipped 2026-03-21)
- ✓ **v1.1 Amp CLI Feature Parity** — Phases 9-15 (complete, shipped 2026-03-22)
- ✓ **v1.2 Amp CLI Deep Fidelity** — Phases 16-22 (complete, shipped 2026-03-23)
- 📋 **v1.3 Amp Architecture Realignment** — Phases 23-26 (planned)

## Phases

- [x] **Phase 1: Core Primitives** — Type definitions, color model, text spans, box constraints, key system
- [x] **Phase 2: Terminal Layer** — Cell buffer, double-buffering, diff algorithm, ANSI renderer, raw mode I/O
- [x] **Phase 3: Widget Framework** — Three-tree core: Widget/Element/RenderObject lifecycle, BuildOwner, PipelineOwner, runApp
- [x] **Phase 4: Layout System** — Flex algorithm, padding, constrained box, decorated box, parent data
- [x] **Phase 5: Frame & Paint** — On-demand scheduler, 4-phase pipeline, PaintContext, ScreenBuffer integration
- [x] **Phase 6: Input System** — Keyboard/mouse events, input parser state machine, focus management, event dispatch
- [x] **Phase 7: High-Level Widgets** — Text, Container, Flex, ScrollView, ListView, TextField, Button, Table
- [x] **Phase 8: Diagnostics & Examples** — Performance overlay, frame stats, debug flags, 28 example applications

### v1.1 Phases (Complete)

- [x] **Phase 9: Text & Render Foundations** — TextStyle/TextSpan API enhancements, ClipCanvas, RenderFlex intrinsic sizes
- [x] **Phase 10: Infrastructure Layer** — MediaQuery, Theme, HoverContext InheritedWidgets, WidgetsBinding enhancements, async runApp
- [x] **Phase 11: Mouse & Scroll Systems** — MouseTracker/MouseManager, SystemMouseCursors, MouseRegion events, ScrollController animation/followMode
- [x] **Phase 12: Core Missing Widgets** — FocusScope/KeyboardListener, ClipRect, IntrinsicHeight, Scrollbar
- [x] **Phase 13: Advanced Widgets** — DiffView, Dialog/SelectionList, Markdown, ContainerWithOverlays
- [x] **Phase 14: RenderText Advanced** — Text selection/highlight, character position tracking, hyperlink click, emoji width
- [x] **Phase 15: Debug Inspector** — HTTP server on port 9876, widget tree JSON endpoints

### v1.2 Phases (Complete)

- [x] **Phase 16: AppTheme & Syntax Highlighting** — AppTheme InheritedWidget (h8), syntax highlighting function (ae), DiffView integration
- [x] **Phase 17: Rendering Pipeline Enhancements** — Alpha compositing, RGB→256-color fallback, default colors, index-RGB mapping, Buffer.copyTo
- [x] **Phase 18: Terminal Protocol Extensions** — Kitty keyboard, ModifyOtherKeys, emoji width mode, in-band resize, progress bar/title/cursor OSC, pixel mouse, cleanup, capability queries
- [x] **Phase 19: Image Protocol** — ImagePreview (O_), KittyImageWidget (IH0), ImagePreviewProvider (X_), Kitty graphics escape sequences
- [x] **Phase 20: TextField Complete Rewrite** — Multi-line, word operations, mouse interaction, selection/clipboard, RenderText-based rendering
- [x] **Phase 21: Performance Diagnostics Upgrade** — PerformanceTracker full metrics, direct-to-buffer overlay rendering, toggleFrameStatsOverlay
- [x] **Phase 22: Minor Fidelity Fixes** — JetBrains wheel filter, setCursorPositionHint, resize priority callback, paste callbacks, scrollStep, layout helper, getCells

### v1.3 Phases

- [x] **Phase 23: WidgetsBinding + TerminalManager + FrameScheduler Core** — Refactor WidgetsBinding to own TerminalManager, register 6 frame callbacks, eliminate scheduleFrame/drawFrame; enhance FrameScheduler as sole scheduling authority; refactor TerminalManager as J3-owned class
- [x] **Phase 24: BuildOwner + Element + Input Pipeline Alignment** — BuildOwner.scheduleBuildFor calls c9.requestFrame directly; Element.markNeedsRebuild uses proper import; setupEventHandlers inside J3; thin runApp wrapper; initSchedulers cleanup
- [x] **Phase 25: Integration Testing + Example Validation** — End-to-end setState→render tests, interactive example validation, regression test suite
- [x] **Phase 26: Test Fixes + Cleanup** — Fix any test failures from refactoring, remove dead code (InputBridge standalone usage, drawFrame, scheduleFrame), update all examples and docs

## Dependency DAG

```
Phase 1 (Core Primitives)
  ├──→ Phase 2 (Terminal Layer)
  │      ├──→ Phase 5 (Frame & Paint) ←── Phase 3, Phase 4
  │      └──→ Phase 6 (Input System) ←── Phase 3 (for 06-02, 06-03)
  └──→ Phase 3 (Widget Framework)
         └──→ Phase 4 (Layout System)

Phase 5 + Phase 6 ──→ Phase 7 (High-Level Widgets)
                        └──→ Phase 8 (Diagnostics & Examples)
```

## Phase Details

### Phase 1: Core Primitives
**Goal**: Establish all foundational types that every other module depends on
**Depends on**: Nothing (first phase)
**Requirements**: CORE-01, CORE-02, CORE-03, CORE-04, CORE-05, CORE-06 (ValueKey/UniqueKey only)
**Success Criteria** (what must be TRUE):
  1. All core types (Offset, Size, Rect, Color, TextStyle, TextSpan, BoxConstraints, Key) are implemented with full test coverage
  2. Color round-trip conversion (RGB ↔ Ansi256 ↔ SGR) works correctly
  3. TextSpan tree correctly computes CJK-aware character widths using vendored wcwidth table
  4. BoxConstraints algebra (tight, loose, constrain, enforce) passes property-based tests
  5. ValueKey equality and UniqueKey uniqueness verified
**Plans**: 3 plans

Plans:
- [ ] 01-01: Types + Color — Offset, Size, Rect, Color class with SGR
- [ ] 01-02: TextStyle + TextSpan — Style merging, span tree, CJK width (vendored wcwidth)
- [ ] 01-03: BoxConstraints + Key — Constraint algebra, ValueKey, UniqueKey

### Phase 2: Terminal Layer
**Goal**: Abstract terminal I/O with double-buffered rendering and minimal-diff output
**Depends on**: Phase 1
**Requirements**: TERM-01, TERM-02, TERM-03, TERM-04, TERM-05, TERM-07
**Success Criteria** (what must be TRUE):
  1. ScreenBuffer correctly manages front/back cell grids with swap operation (no dirty-region tracking — Amp does full-grid scan)
  2. Diff algorithm produces minimal change set (empty→full, identical, single-cell, contiguous merge); full-buffer comparison
  3. Renderer outputs valid ANSI/SGR sequences with BSU/ESU wrapping and cursor hide/show
  4. Raw mode toggle and alt screen work on Linux terminals
  5. SIGWINCH triggers buffer resize
  6. Capability detection returns safe defaults on timeout
**Plans**: 3 plans

Plans:
- [ ] 02-01: Cell + ScreenBuffer — Cell struct, double-buffered grid, resize
- [ ] 02-02: Diff + Renderer — Cell-level diff algorithm, ANSI string builder, BSU/ESU, cursor management
- [ ] 02-03: Terminal I/O + Capabilities — Raw mode, alt screen, SIGWINCH, DA1/DA2 detection with timeout fallback

### Phase 3: Widget Framework (Three-Tree Core)
**Goal**: Implement Flutter's complete three-tree architecture with full lifecycle management
**Depends on**: Phase 1
**Requirements**: FRMW-01 through FRMW-11, CORE-06 (GlobalKey full), CORE-07
**Success Criteria** (what must be TRUE):
  1. Widget.canUpdate() correctly matches runtimeType + key
  2. StatefulWidget lifecycle (initState → build → didUpdateWidget → dispose) executes in correct order (Amp has no didChangeDependencies or deactivate)
  3. Element.updateChild() handles all 4 cases correctly (null/non-null matrix)
  4. Element.updateChildren() O(N) key-matching passes with append, remove, reorder
  5. InheritedWidget marks dependent elements as dirty when value changes (no didChangeDependencies callback)
  6. BuildOwner processes dirty elements in depth-first order
  7. RenderObject.layout(constraints) vs performLayout() distinction works; offset stored directly on RenderBox (no sizedByParent/performResize — Amp doesn't have it)
  8. markNeedsLayout() propagates to root (Amp has no RelayoutBoundary; PipelineOwner layouts from root only)
  9. SingleChildRenderObjectWidget/MultiChildRenderObjectWidget correctly bridge Widget↔RenderObject
  10. ErrorWidget displays on build() failure without crashing the tree
  11. runApp() creates the three trees and triggers first frame
**Plans**: 4 plans (was 3, split 03-02)

Plans:
- [ ] 03-01: Widget + State + Listenable — Widget base with canUpdate(), StatelessWidget, StatefulWidget, State<T> lifecycle (initState/build/didUpdateWidget/dispose), Listenable/ChangeNotifier/ValueNotifier (CORE-07)
- [ ] 03-02a: Element Tree — Element base, ComponentElement, RenderObjectElement, updateChild() 4-case, updateChildren() O(N) key-matching, InheritedElement
- [ ] 03-02b: RenderObject + RenderBox — RenderObject base, layout(constraints)/performLayout() split (no sizedByParent/performResize/parentUsesSize), offset on RenderBox, markNeedsLayout propagates to root (no RelayoutBoundary/RepaintBoundary), RenderObjectWidget/SingleChildRenderObjectWidget/MultiChildRenderObjectWidget
- [ ] 03-03: BuildOwner + PipelineOwner + Binding — Dirty element Set with depth-sorted rebuild, layout from root only, paint pass, GlobalKey registry (currentState/currentContext), ErrorWidget, WidgetsBinding + runApp()

### Phase 4: Layout System
**Goal**: Implement Flutter's box-constraint layout model with flex, padding, and decoration
**Depends on**: Phase 3
**Requirements**: LYOT-01, LYOT-02, LYOT-03, LYOT-04, LYOT-05
**Success Criteria** (what must be TRUE):
  1. RenderFlex correctly implements all 6 steps of Flutter's flex algorithm
  2. All MainAxisAlignment variants (start, end, center, spaceBetween, spaceAround, spaceEvenly) produce correct positions
  3. Flex ratio allocation distributes space proportionally
  4. Nested constraints (Padding inside SizedBox inside Flex) resolve correctly
  5. DecoratedBox renders Unicode box-drawing borders
  6. Layout correctly propagates from root through nested flex containers
**Plans**: 2 plans

Plans:
- [ ] 04-01: RenderFlex + ParentData — 6-step flex algorithm, FlexParentData, BoxParentData
- [ ] 04-02: Padding + Constrained + Decorated — RenderPadding, RenderConstrainedBox, RenderDecoratedBox

### Phase 5: Frame Scheduler + Paint Pipeline
**Goal**: Implement on-demand frame scheduling with ordered phase execution, paint context, and ScreenBuffer integration
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: FPNT-01, FPNT-02, FPNT-03, FPNT-04, FPNT-05, FPNT-06
**Success Criteria** (what must be TRUE):
  1. On-demand scheduler fires frame only when dirty (no timer ticking when idle)
  2. Frames are skipped when nothing is dirty (no unnecessary work)
  3. 4-phase pipeline (BUILD→LAYOUT→PAINT→RENDER) executes in correct order
  4. PaintContext correctly writes styled characters to ScreenBuffer back buffer with offset accumulation
  5. Clip rect prevents painting outside bounds
  6. RENDER phase triggers diff + ANSI renderer + buffer swap end-to-end
  7. Frame budget instrumentation reports per-phase timing
**Plans**: 3 plans (was 2, added integration plan)

Plans:
- [ ] 05-01: Frame Scheduler — On-demand SchedulerMode, 4-phase pipeline, frame skipping, budget instrumentation
- [ ] 05-02: PaintContext + Paint Traversal — drawChar/drawText/fillRect/drawBorder, clipRect, DFS paint
- [ ] 05-03: ScreenBuffer Integration — Wire PaintContext to ScreenBuffer back buffer, RENDER phase (diff + renderer + swap), end-to-end test (widget → layout → paint → cells → ANSI)

### Phase 6: Input System
**Goal**: Parse raw terminal input into structured events with focus management and widget event dispatch
**Depends on**: Phase 2 (for 06-01), Phase 3 (for 06-02, 06-03)
**Requirements**: INPT-01, INPT-02, INPT-03, INPT-04, INPT-05, INPT-06
**Success Criteria** (what must be TRUE):
  1. Correctly parses Ctrl+key, arrow keys, F-keys, and special keys from raw bytes
  2. SGR mouse protocol events (press, release, move, scroll) parse correctly
  3. Multi-byte escape sequences are handled by state machine without data loss
  4. FocusManager supports tab-order navigation between focusable widgets
  5. Shortcut bindings trigger correct actions
  6. InputEvent routes through FocusManager to correct widget callback with bubbling
**Plans**: 3 plans (was 2, added event dispatch plan)

Plans:
- [ ] 06-01: Keyboard + Mouse + Parser — InputEvent discriminated union, KeyEvent, MouseEvent, input state machine (depends: Phase 2)
- [ ] 06-02: Focus + Shortcuts — FocusNode, FocusScope, FocusManager, Shortcuts widget, shortcut bindings (depends: Phase 3)
- [ ] 06-03: Event Dispatch Pipeline — Wire input parser through FocusManager to widget callbacks, event bubbling/capture (depends: Phase 3)

### Phase 7: High-Level Widgets
**Goal**: Build the standard widget library that application developers use directly
**Depends on**: Phase 4, Phase 5, Phase 6
**Requirements**: WDGT-01 through WDGT-11, TERM-06
**Success Criteria** (what must be TRUE):
  1. Text widget renders styled text at correct position in ScreenBuffer
  2. DefaultTextStyle cascades styling to descendant Text widgets
  3. Container applies padding, decoration, and constraints to child
  4. Row/Column distribute space according to flex factors and alignment
  5. ScrollView clips content and responds to scroll input
  6. TextField accepts keyboard input with cursor movement
  7. Table renders with correct column alignment
  8. ANSI parser converts escape sequences to TextSpan for paste/display
**Plans**: 4 plans (was 3, split 07-01)

Plans:
- [ ] 07-01a: Leaf + Single-child Widgets — Text, DefaultTextStyle, Container, SizedBox, Padding, Center
- [ ] 07-01b: Flex Widgets — Row, Column, Expanded, Flexible, Spacer
- [ ] 07-02: Scroll + Stack + Builder — SingleChildScrollView, ListView, Stack, Builder, LayoutBuilder, ANSI parser (TERM-06)
- [ ] 07-03: Interactive Widgets — TextField (with TextEditingController), Button, Table, Divider

### Phase 8: Diagnostics & Examples
**Goal**: Add developer tooling and demonstrate the framework with 8 example applications
**Depends on**: Phase 7
**Requirements**: DIAG-01, DIAG-02, DIAG-03, EXMP-01 through EXMP-08
**Success Criteria** (what must be TRUE):
  1. PerformanceOverlay displays real-time P95/P99 frame metrics
  2. FrameStats collects rolling 1024-sample window with per-phase timing
  3. hello-world example renders centered colored text
  4. counter example responds to keyboard increment/decrement
  5. todo-app example supports full CRUD operations
  6. perf-stress example maintains 60fps with 1000 widgets (validated by on-demand scheduling + root-driven layout)
**Plans**: 3 plans

Plans:
- [ ] 08-01: Diagnostics — PerformanceOverlay, FrameStats, debug flags
- [ ] 08-02: Basic examples — hello-world, counter, flex-layout, scroll-demo
- [ ] 08-03: Advanced examples — table-demo, input-form, todo-app, perf-stress

---

## v1.1 Phase Details

### Phase 9: Text & Render Foundations
**Goal**: Enhance core TextStyle/TextSpan APIs and add missing RenderObject capabilities that downstream widgets depend on
**Depends on**: v1.0 complete
**Requirements**: TEXT-01, TEXT-02, TEXT-03, TEXT-04, TEXT-05, ROBJ-05, ROBJ-06, ROBJ-07
**Success Criteria** (what must be TRUE):
  1. TextStyle.copyWith() creates new instance with only specified fields overridden
  2. TextStyle static factories (normal, bold, italic, underline, colored, background) produce correct SGR output
  3. TextSpan with hyperlink property generates OSC 8 escape sequences in Cell/Renderer
  4. TextSpan.onClick triggers callback when span is clicked
  5. TextSpan.equals() correctly compares deep tree structures
  6. RenderFlex.getMinIntrinsicWidth/Height and getMaxIntrinsicWidth/Height return correct values
  7. ClipCanvas clips paint operations to specified bounds
**Plans**: 3 plans

Plans:
- [ ] 09-01: TextStyle enhancements — copyWith(), static factories (normal/bold/italic/underline/colored/background)
- [ ] 09-02: TextSpan enhancements — hyperlink property, onClick callback, equals() deep comparison
- [ ] 09-03: RenderObject foundations — RenderFlex intrinsic sizes, CrossAxisAlignment.baseline, ClipCanvas paint wrapper

### Phase 10: Infrastructure Layer
**Goal**: Add MediaQuery, Theme, and HoverContext InheritedWidgets; enhance WidgetsBinding with mouse/event systems and async runApp
**Depends on**: Phase 9
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, FRMW-12, FRMW-13, FRMW-14, FRMW-15, FRMW-16
**Success Criteria** (what must be TRUE):
  1. MediaQuery.of(context) returns screen size and terminal capabilities
  2. MediaQuery wraps root widget automatically in runApp
  3. Theme.of(context) returns color scheme used by widgets
  4. HoverContext propagates hover state to descendants
  5. WidgetsBinding exposes mouseManager, eventCallbacks, keyInterceptors
  6. runApp is async, waits for capability detection, wraps root in MediaQuery
  7. BuildContext.mediaQuery provides fast access to MediaQueryData
**Plans**: 3 plans

Plans:
- [ ] 10-01: MediaQuery + MediaQueryData — InheritedWidget with size and capabilities, static of/sizeOf/capabilitiesOf methods
- [ ] 10-02: Theme + HoverContext — Theme InheritedWidget with color scheme, HoverContext for hover state propagation
- [ ] 10-03: WidgetsBinding enhancements — mouseManager, eventCallbacks, keyInterceptors, async runApp with MediaQuery wrapping, BuildContext.mediaQuery

### Phase 11: Mouse & Scroll Systems
**Goal**: Implement global mouse tracking/cursor management and enhance ScrollController with animation and follow mode
**Depends on**: Phase 10 (for WidgetsBinding.mouseManager)
**Requirements**: MOUS-01, MOUS-02, MOUS-03, MOUS-04, SCRL-01, SCRL-02, SCRL-03
**Success Criteria** (what must be TRUE):
  1. MouseManager singleton tracks mouse position and manages cursor shape globally
  2. SystemMouseCursors outputs correct ANSI escape sequences for cursor changes
  3. MouseRegion.onRelease and onDrag events fire correctly
  4. ScrollController.animateTo() smoothly scrolls to target offset
  5. ScrollController.followMode auto-scrolls to bottom on content growth
  6. ScrollController.atBottom correctly reports scroll position
**Plans**: 2 plans

Plans:
- [ ] 11-01: MouseTracker/MouseManager — singleton, cursor shape management, SystemMouseCursors constants, hover coordination; MouseRegion onRelease/onDrag events
- [ ] 11-02: ScrollController enhancements — animateTo with timer-based animation, followMode with disableFollowMode(), atBottom getter

### Phase 12: Core Missing Widgets
**Goal**: Implement essential missing widgets that Amp uses extensively
**Depends on**: Phase 10 (FocusScope needs WidgetsBinding), Phase 11 (Scrollbar needs MouseManager)
**Requirements**: MWDG-01, MWDG-02, MWDG-06, MWDG-07
**Success Criteria** (what must be TRUE):
  1. FocusScope/KeyboardListener wraps FocusNode as a widget with autofocus, onKey, onPaste, onFocusChange
  2. Scrollbar renders thumb/track with configurable characters and colors, synced to ScrollController
  3. ClipRect clips child rendering to parent bounds
  4. IntrinsicHeight queries child's max intrinsic height and applies tight constraint
**Plans**: 2 plans

Plans:
- [ ] 12-01: FocusScope/KeyboardListener + ClipRect — FocusScope widget (autofocus, onKey, onPaste, onFocusChange), ClipRect with RenderClipRect
- [ ] 12-02: Scrollbar + IntrinsicHeight — Scrollbar StatefulWidget (thumb/track/colors), IntrinsicHeight with RenderIntrinsicHeight

### Phase 13: Advanced Widgets
**Goal**: Build the remaining complex widgets from Amp's catalog
**Depends on**: Phase 10 (DiffView needs Theme), Phase 12
**Requirements**: MWDG-03, MWDG-04, MWDG-05, MWDG-08, MWDG-09
**Success Criteria** (what must be TRUE):
  1. DiffView parses unified diff and renders with +/- coloring and line numbers using Theme colors
  2. Dialog data class holds title, type, widget, footerStyle, dimensions
  3. SelectionList supports keyboard navigation (arrows/j/k/Tab/Enter/Escape) and mouse click
  4. Markdown widget renders headings, code blocks, and links (OSC 8 hyperlinks)
  5. ContainerWithOverlays positions overlays at edges/corners using Stack+Positioned
**Plans**: 3 plans

Plans:
- [ ] 13-01: Dialog + SelectionList — Dialog data class, SelectionList with keyboard/mouse interaction
- [ ] 13-02: DiffView + Markdown — DiffView unified diff renderer, Markdown parser and styled Text tree builder
- [ ] 13-03: ContainerWithOverlays — Container subclass with edge/corner overlay positioning

### Phase 14: RenderText Advanced
**Goal**: Add text selection, character position tracking, hyperlink click handling, and emoji width detection to RenderText
**Depends on**: Phase 10 (needs MediaQuery for emoji detection, Theme for selection colors)
**Requirements**: ROBJ-01, ROBJ-02, ROBJ-03, ROBJ-04
**Success Criteria** (what must be TRUE):
  1. RenderText supports selectable flag with selectedRanges and visual highlight
  2. Character position cache enables getCharacterRect(index) and getOffsetForPosition(x,y)
  3. RenderText.handleMouseEvent() detects hyperlink hover and triggers cursor change
  4. getHyperlinkAtPosition() and getOnClickAtPosition() return correct values
  5. Emoji width detection reads _emojiWidthSupported from MediaQuery capabilities
**Plans**: 2 plans

Plans:
- [ ] 14-01: Text selection + position tracking — selectable, selectedRanges, highlightMode, _characterPositions[], _visualLines[], getCharacterRect, getOffsetForPosition
- [ ] 14-02: Text interaction — handleMouseEvent(), getHyperlinkAtPosition(), getOnClickAtPosition(), emoji width detection from MediaQuery

### Phase 15: Debug Inspector
**Goal**: HTTP-based widget tree inspector for debugging
**Depends on**: Phase 14 (all widgets complete)
**Requirements**: DBUG-01
**Success Criteria** (what must be TRUE):
  1. HTTP server starts on port 9876 when debug mode is enabled
  2. /tree endpoint returns full widget tree as JSON
  3. /inspect endpoint returns detailed info for a specific element
  4. /select endpoint highlights a widget in the rendered output
**Plans**: 1 plan

Plans:
- [ ] 15-01: Debug Inspector — HTTP server with /tree, /inspect, /select endpoints, JSON serialization of widget/element/render trees

---

## v1.2 Phase Details

### Phase 16: AppTheme & Syntax Highlighting
**Goal**: Add the second theme layer (AppTheme) and syntax highlighting function that DiffView depends on
**Depends on**: v1.1 complete (DiffView exists, Theme exists)
**Requirements**: ATHM-01, ATHM-02
**Success Criteria** (what must be TRUE):
  1. `AppTheme.of(context)` returns AppTheme data with `syntaxHighlight` and `colors` properties
  2. AppTheme is distinct from Theme — both can coexist in the widget tree
  3. `syntaxHighlight(content, config, filePath)` colorizes code based on file extension
  4. DiffView uses AppTheme for syntax-highlighted diff content
**Plans**: 2 plans

Plans:
- [ ] 16-01: AppTheme InheritedWidget — AppTheme class with syntaxHighlight config, colors, `of(context)` accessor
- [ ] 16-02: Syntax highlighting — `ae()` function with file-extension-based highlighting, DiffView integration

### Phase 17: Rendering Pipeline Enhancements
**Goal**: Add alpha compositing, 256-color fallback, and buffer utilities to the rendering pipeline
**Depends on**: v1.1 complete (ScreenBuffer, Renderer exist)
**Requirements**: RPIP-01, RPIP-02, RPIP-03, RPIP-04, RPIP-05
**Success Criteria** (what must be TRUE):
  1. Color class supports alpha property (0-1 range)
  2. `Buffer.setCell()` blends styles when foreground has alpha < 1
  3. `blendColor(front, back)` produces correct alpha-composited RGB output
  4. `sJ(r, g, b)` returns nearest 256-color index with cached results
  5. Renderer outputs 256-color SGR (`38;5;N`) when `capabilities.canRgb` is false
  6. `Buffer.setDefaultColors(bg, fg)` sets buffer defaults
  7. `Buffer.copyTo(target)` deep-copies all cells
**Plans**: 3 plans

Plans:
- [ ] 17-01: Alpha compositing — Color.alpha, blendColor(), blendStyle(), Buffer.setCell() alpha path
- [ ] 17-02: 256-color fallback — sJ() nearest-match, Uu0 palette table, Renderer conditional SGR output
- [ ] 17-03: Buffer utilities — setDefaultColors(), setIndexRgbMapping(), copyTo(), getCells()

### Phase 18: Terminal Protocol Extensions
**Goal**: Add all missing terminal mode escape sequences for full Amp terminal initialization parity
**Depends on**: Phase 17 (Renderer enhanced)
**Requirements**: TPRO-01 through TPRO-10
**Success Criteria** (what must be TRUE):
  1. Kitty keyboard protocol enables/disables correctly
  2. ModifyOtherKeys mode enables/disables correctly
  3. Emoji width mode toggles correctly
  4. In-band resize events received via escape sequence
  5. Progress bar OSC sequences emit correctly (indeterminate/off/paused)
  6. Window title and mouse cursor shape set via OSC
  7. Pixel mouse enable/disable works
  8. Terminal cleanup (`zG8`) disables all 12+ modes on exit
  9. Capability detection sends queries and parses responses
**Plans**: 3 plans

Plans:
- [ ] 18-01: Keyboard protocols — Kitty keyboard (ESC[>5u/ESC[<u]), ModifyOtherKeys (ESC[>4;1m/ESC[>4;0m)
- [ ] 18-02: Terminal modes — Emoji width, in-band resize, pixel mouse, progress bar OSC, title OSC, cursor shape OSC
- [ ] 18-03: Cleanup & capability detection — zG8 comprehensive cleanup, vF queryParser with escape-sequence capability queries

### Phase 19: Image Protocol
**Goal**: Implement Kitty graphics protocol for inline image display in terminal
**Depends on**: Phase 18 (terminal protocol infrastructure), Phase 16 (AppTheme for image context)
**Requirements**: IMG-01, IMG-02, IMG-03
**Success Criteria** (what must be TRUE):
  1. ImagePreviewProvider provides image context to descendant widgets
  2. ImagePreview widget displays PNG data using Kitty `ESC_G` chunked transfer
  3. KittyImageWidget render object places image cells correctly
  4. Falls back to empty SizedBox when terminal lacks Kitty support
  5. Capability detection from Phase 18 feeds `kittyGraphics` flag
**Plans**: 2 plans

Plans:
- [ ] 19-01: Kitty graphics protocol — ESC_G escape sequences, chunked transfer, cell placement
- [ ] 19-02: Image widgets — ImagePreview StatefulWidget, KittyImageWidget RenderObject, ImagePreviewProvider InheritedWidget

### Phase 20: TextField Complete Rewrite
**Goal**: Replace skeleton TextField with full-featured text editor matching Amp's `_n`/`Ny`/`rp` implementation
**Depends on**: Phase 17 (alpha compositing for selection highlight), v1.1 complete (RenderText, MouseManager)
**Requirements**: TXFD-01 through TXFD-05
**Success Criteria** (what must be TRUE):
  1. Multi-line editing works with Enter for newline, Ctrl+Enter for submit
  2. Single-line mode uses Enter for submit
  3. Word-level delete/move/select operations functional
  4. Mouse click places cursor, double-click selects word, drag selects range
  5. Selection auto-copies to clipboard with visual highlight
  6. TextField renders via RenderText (not stub display widget)
  7. CJK characters handled correctly in cursor positioning
**Plans**: 3 plans

Plans:
- [ ] 20-01: Multi-line core — maxLines support, configurable submit key, newline insertion variants
- [ ] 20-02: Word operations & RenderText — word-level delete/move/select, render via Text/RenderText
- [ ] 20-03: Mouse interaction & clipboard — click/double-click/drag selection, auto-copy, global release tracking

### Phase 21: Performance Diagnostics Upgrade
**Goal**: Complete the PerformanceTracker metrics and upgrade overlay to direct screen-buffer rendering
**Depends on**: Phase 17 (alpha compositing for overlay background)
**Requirements**: PERF-01, PERF-02, PERF-03
**Success Criteria** (what must be TRUE):
  1. PerformanceTracker records key/mouse event times, repaint percentages, bytes written
  2. P95/P99 getters work for all 8 metric categories
  3. Overlay draws directly to screen buffer (not as a widget in the tree)
  4. 34x14 box with Unicode borders, color-coded thresholds, "Gotta Go Fast" title
  5. `toggleFrameStatsOverlay()` toggles with forced paint
**Plans**: 2 plans

Plans:
- [ ] 21-01: PerformanceTracker full metrics — add key/mouse/repaint/bytes recording with P95/P99
- [ ] 21-02: Direct-to-buffer overlay — rewrite PerformanceOverlay as direct screen buffer painter, toggleFrameStatsOverlay on binding

### Phase 22: Minor Fidelity Fixes
**Goal**: Close remaining small gaps for complete Amp fidelity
**Depends on**: Phase 18 (terminal infrastructure)
**Requirements**: MINR-01 through MINR-07
**Success Criteria** (what must be TRUE):
  1. JetBrains wheel filter handles non-standard scroll events
  2. setCursorPositionHint sets position without visibility change
  3. Resize processed at BUILD priority -1000
  4. eventCallbacks.paste array functional
  5. scrollStep capability returns configurable step count
  6. Layout helper fS() estimates widget tree intrinsic width
  7. Buffer.getCells() returns deep copy
**Plans**: 2 plans

Plans:
- [ ] 22-01: Terminal & input fixes — JetBrains wheel filter, setCursorPositionHint, resize priority, paste callbacks, scrollStep
- [ ] 22-02: Buffer & layout utilities — getCells() deep copy, fS() layout helper

---

## v1.3 Phase Details

### Phase 23: WidgetsBinding + TerminalManager + FrameScheduler Core
**Goal**: Refactor WidgetsBinding to match Amp's J3 class: own TerminalManager, register 6 frame callbacks on FrameScheduler, eliminate scheduleFrame/drawFrame. Enhance FrameScheduler as sole frame scheduling authority. Refactor TerminalManager as J3-owned class with full lifecycle.
**Depends on**: v1.2 complete
**Requirements**: BIND-01, BIND-02, BIND-03, BIND-04, BIND-05, BIND-06, BIND-07, FSCD-01, FSCD-02, TMGR-01, TMGR-02, TMGR-03
**Amp References** (MANDATORY — implementer MUST read these before writing code):
  - `.reference/widget-tree.md:1134-1296` — Full J3 class (constructor, fields, runApp, beginFrame, paint, render, cleanup)
  - `.reference/frame-scheduler.md:78-213` — Full c9 class (requestFrame, executeFrame, frame pacing)
  - `.reference/screen-buffer.md:709-780` — Full wB0 class (fields, lifecycle, render)
**Amp Review Checklist** (reviewer MUST cross-reference each item):
  - [ ] J3 constructor creates BuildOwner, PipelineOwner, registers 6 named frame callbacks (widget-tree.md:1154-1187)
  - [ ] J3 has NO scheduleFrame() or drawFrame() methods (verify by searching full J3 class)
  - [ ] J3.runApp() follows exact call sequence: tui.init → enterAltScreen → lazy-load → waitForCapabilities → MediaQuery → mount → setupEventHandlers → requestFrame → waitForExit (widget-tree.md:1189-1236)
  - [ ] c9.requestFrame() has _frameScheduled + _frameInProgress guards with frame pacing (frame-scheduler.md:119-145)
  - [ ] c9.executeFrame() iterates ["build","layout","paint","render"] phases (frame-scheduler.md:187-212)
  - [ ] wB0 is owned by J3 (not standalone), has init/deinit/render lifecycle (screen-buffer.md:709-780)
**Success Criteria** (what must be TRUE):
  1. WidgetsBinding owns TerminalManager as `this.tui = new wB0`
  2. WidgetsBinding constructor registers exactly 6 named frame callbacks with correct phases/priorities
  3. WidgetsBinding has NO scheduleFrame() or drawFrame() methods
  4. WidgetsBinding.runApp() is async, initializes terminal, mounts tree, awaits waitForExit
  5. FrameScheduler.requestFrame() is the sole entry point for frame scheduling with frame pacing
  6. FrameScheduler.executeFrame() runs 4 phases in order via registered callbacks
  7. TerminalManager has init/deinit/render methods called from WidgetsBinding
  8. beginFrame/paint/render methods match Amp's J3 implementation
**Plans**: 3 plans

Plans:
- [x] 23-01: FrameScheduler enhancement — Add frame pacing (Oy = 16.67ms), scheduleFrameExecution with setImmediate/setTimeout, runScheduledFrame guard, post-frame re-schedule. Match c9 from frame-scheduler.md:78-213
- [x] 23-02: TerminalManager refactoring — Refactor as J3-owned class with parser/screen/renderer/queryParser/capabilities/event handler arrays, init/deinit/render lifecycle. Match wB0 from screen-buffer.md:709-780
- [x] 23-03: WidgetsBinding refactoring — Rewrite J3 constructor (6 frame callbacks, VG8 registration), runApp (async, tui init, MediaQuery, mount, waitForExit), beginFrame/paint/render, cleanup, stop. Remove scheduleFrame/drawFrame. Match widget-tree.md:1134-1296

### Phase 24: BuildOwner + Element + Input Pipeline Alignment
**Goal**: Make BuildOwner call c9.requestFrame() directly, fix Element.markNeedsRebuild import, move input wiring inside J3.setupEventHandlers, make runApp a thin wrapper, clean up initSchedulers bridge.
**Depends on**: Phase 23 (WidgetsBinding + FrameScheduler refactored)
**Requirements**: BIND-08, BOWN-01, BOWN-02, ELEM-01, RAPP-01, GSCD-01
**Amp References** (MANDATORY — implementer MUST read these before writing code):
  - `.reference/element-tree.md:1277-1320` — NB0.scheduleBuildFor and buildScopes
  - `.reference/element-tree.md:289-293` — Element.markNeedsRebuild (XG8 call)
  - `.reference/widget-tree.md:1178-1185` — VG8 global scheduler registration
  - `.reference/widget-tree.md:1314-1321` — cz8 runApp thin wrapper
  - `.reference/input-system.md:601-634` — Full stdin→widget input pipeline
**Amp Review Checklist** (reviewer MUST cross-reference each item):
  - [ ] NB0.scheduleBuildFor adds to set AND calls c9.instance.requestFrame() (element-tree.md:1277-1281)
  - [ ] Element.markNeedsRebuild calls XG8().scheduleBuildFor(this) without try/catch (element-tree.md:289-293)
  - [ ] VG8 bridge scheduleBuildFor does NOT call scheduleFrame; BuildOwner handles requestFrame internally (widget-tree.md:1178-1185)
  - [ ] cz8 runApp is ≤5 lines: get J3.instance, optional callback, await runApp (widget-tree.md:1314-1321)
  - [ ] setupEventHandlers connects wB0 handlers → FocusManager/MouseManager (input-system.md:601-634)
  - [ ] No standalone InputBridge in the event chain
**Success Criteria** (what must be TRUE):
  1. BuildOwner.scheduleBuildFor calls c9.instance.requestFrame() directly
  2. Element.markNeedsRebuild uses static import, no try/catch
  3. setupEventHandlers inside WidgetsBinding wires wB0 events to FocusManager
  4. runApp() is a thin async wrapper (≤10 lines) calling J3.instance.runApp()
  5. initSchedulers bridge does NOT call scheduleFrame
  6. All existing tests still pass
**Plans**: 3 plans

Plans:
- [x] 24-01: BuildOwner + Element alignment — scheduleBuildFor calls requestFrame directly, Element uses proper import for scheduleBuildFor. Match element-tree.md:1277-1293
- [x] 24-02: runApp + initSchedulers — Thin cz8 wrapper, clean up VG8/initSchedulers bridge (no scheduleFrame call). Match widget-tree.md:1178-1185,1314-1321
- [x] 24-03: Input pipeline alignment — setupEventHandlers inside J3, wB0 event handlers → FocusManager/MouseManager, eliminate standalone InputBridge from event chain. Match input-system.md:601-634

### Phase 25: Integration Testing + Example Validation
**Goal**: Verify the full setState→render pipeline works end-to-end with automated tests and manual example validation
**Depends on**: Phase 24 (all refactoring complete)
**Requirements**: INTG-01, INTG-02, INTG-03
**Amp References** (MANDATORY — test against this chain):
  - `.reference/element-tree.md:1631-1680` — Complete setState→frame chain diagram
**Amp Review Checklist** (reviewer MUST verify):
  - [ ] Every arrow in the setState→frame chain (element-tree.md:1631-1680) corresponds to an actual call in the code
  - [ ] counter example starts, renders, responds to keys, re-renders, quits cleanly
  - [ ] All 2603+ tests pass with 0 failures
**Success Criteria** (what must be TRUE):
  1. Automated test exercises full chain: setState → markNeedsRebuild → scheduleBuildFor → requestFrame → executeFrame → build/layout/paint/render → ScreenBuffer updated
  2. counter example fully interactive (verified by test or manual run)
  3. `bun test` passes with ≥2603 tests, 0 failures
  4. No architectural drift: each component calls the next per Amp's chain diagram
**Plans**: 2 plans

Plans:
- [x] 25-01: Pipeline integration tests — Test setState→render full chain, test frame pacing, test dirty element scheduling, test build/layout/paint/render phase order
- [x] 25-02: Example validation + regression — Validate counter/hello-world examples, run full test suite, fix any regressions

### Phase 26: Cleanup + Dead Code Removal
**Goal**: Remove dead code from refactoring, update documentation and examples to use new architecture
**Depends on**: Phase 25 (integration verified)
**Requirements**: (no new requirements — cleanup only)
**Success Criteria** (what must be TRUE):
  1. No dead code: standalone InputBridge usage removed from binding, drawFrame/scheduleFrame removed, _frameScheduled flag removed
  2. All examples use the new runApp() API
  3. CLAUDE.md anti-drift rules still accurate after refactoring
  4. All tests pass
**Plans**: 1 plan

Plans:
- [x] 26-01: Dead code removal + docs — Remove unused InputBridge standalone code paths, drawFrame, scheduleFrame, _frameScheduled; update examples; verify CLAUDE.md accuracy

## v1.3 Parallel Wave Strategy

| Wave | Phase(s) | Plans | Notes |
|------|----------|-------|-------|
| W16 | Phase 23 | 23-01/02/03 | Core refactoring — sequential (23-01 first, then 23-02, then 23-03) |
| W17 | Phase 24 | 24-01/02/03 | BuildOwner+Element+Input — 24-01 and 24-02 parallel, then 24-03 |
| W18 | Phase 25 | 25-01/02 | Integration testing — sequential |
| W19 | Phase 26 | 26-01 | Cleanup — single plan |

## v1.3 Dependency DAG

```
Phase 23 (WidgetsBinding + TerminalManager + FrameScheduler)
  └──→ Phase 24 (BuildOwner + Element + Input Pipeline)
         └──→ Phase 25 (Integration Testing + Example Validation)
                └──→ Phase 26 (Cleanup + Dead Code Removal)
```

Note: v1.3 is strictly sequential — each phase depends on the previous because they modify the same core files. Within Phase 23, plans must execute in order (FrameScheduler → TerminalManager → WidgetsBinding). Within Phase 24, plans 24-01 and 24-02 can run in parallel, then 24-03.

## v1.2 Parallel Wave Strategy

| Wave | Phase(s) | Plans | Notes |
|------|----------|-------|-------|
| W12 | Phase 16 + Phase 17 | 16-01/02 + 17-01/02/03 | Independent: themes vs rendering pipeline |
| W13 | Phase 18 | 18-01/02/03 | Depends on Phase 17 (Renderer) |
| W14 | Phase 19 + Phase 20 + Phase 21 | 19-01/02 + 20-01/02/03 + 21-01/02 | All depend on W12/W13; can run in parallel |
| W15 | Phase 22 | 22-01/02 | Final sweep, depends on Phase 18 |

## v1.2 Dependency DAG

```
Phase 16 (AppTheme) ──────────────────────→ Phase 19 (Image Protocol)
                                              ↑
Phase 17 (Rendering Pipeline) ──→ Phase 18 (Terminal Protocols) ──→ Phase 19
                                    │                                  ↑
                                    ├──→ Phase 20 (TextField) ←── Phase 17 (alpha)
                                    ├──→ Phase 21 (Perf Diag) ←── Phase 17 (alpha)
                                    └──→ Phase 22 (Minor Fixes)
```

## v1.1 Parallel Wave Strategy

| Wave | Phase(s) | Plans | Notes |
|------|----------|-------|-------|
| W7 | Phase 9 | 09-01, 09-02, 09-03 | All 3 can run in parallel (independent areas) |
| W8 | Phase 10 | 10-01, 10-02, 10-03 | 10-01 and 10-02 parallel; 10-03 depends on both |
| W9 | Phase 11 + Phase 12 | 11-01/02 + 12-01/02 | Phase 11 and Phase 12 can run in parallel |
| W10 | Phase 13 + Phase 14 | 13-01/02/03 + 14-01/02 | Both depend on 10/12; can run in parallel |
| W11 | Phase 15 | 15-01 | Final phase, depends on everything |

## v1.1 Dependency DAG

```
Phase 9 (Text & Render Foundations)
  └──→ Phase 10 (Infrastructure Layer)
         ├──→ Phase 11 (Mouse & Scroll)
         │      └──→ Phase 12 (Core Widgets) ←── Phase 10
         ├──→ Phase 13 (Advanced Widgets) ←── Phase 12
         └──→ Phase 14 (RenderText Advanced)

Phase 12 + Phase 13 + Phase 14 ──→ Phase 15 (Debug Inspector)
```

## Progress

### v1.0 MVP (Complete)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Primitives | 3/3 | Complete | 2026-03-21 |
| 2. Terminal Layer | 3/3 | Complete | 2026-03-21 |
| 3. Widget Framework | 4/4 | Complete | 2026-03-21 |
| 4. Layout System | 2/2 | Complete | 2026-03-21 |
| 5. Frame & Paint | 3/3 | Complete | 2026-03-21 |
| 6. Input System | 3/3 | Complete | 2026-03-21 |
| 7. High-Level Widgets | 4/4 | Complete | 2026-03-21 |
| 8. Diagnostics & Examples | 3/3 | Complete | 2026-03-21 |

### v1.1 Amp CLI Feature Parity (Complete)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Text & Render Foundations | 3/3 | Complete | 2026-03-22 |
| 10. Infrastructure Layer | 3/3 | Complete | 2026-03-22 |
| 11. Mouse & Scroll Systems | 2/2 | Complete | 2026-03-22 |
| 12. Core Missing Widgets | 2/2 | Complete | 2026-03-22 |
| 13. Advanced Widgets | 3/3 | Complete | 2026-03-22 |
| 14. RenderText Advanced | 2/2 | Complete | 2026-03-22 |
| 15. Debug Inspector | 1/1 | Complete | 2026-03-22 |

### v1.2 Amp CLI Deep Fidelity (Complete)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 16. AppTheme & Syntax Highlighting | 2/2 | Complete | 2026-03-22 |
| 17. Rendering Pipeline Enhancements | 3/3 | Complete | 2026-03-22 |
| 18. Terminal Protocol Extensions | 3/3 | Complete | 2026-03-22 |
| 19. Image Protocol | 2/2 | Complete | 2026-03-22 |
| 20. TextField Complete Rewrite | 3/3 | Complete | 2026-03-22 |
| 21. Performance Diagnostics Upgrade | 2/2 | Complete | 2026-03-22 |
| 22. Minor Fidelity Fixes | 2/2 | Complete | 2026-03-22 |

### v1.3 Amp Architecture Realignment

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 23. WidgetsBinding + TerminalManager + FrameScheduler | 3/3 | Complete | 2026-03-23 |
| 24. BuildOwner + Element + Input Pipeline | 3/3 | Complete | 2026-03-23 |
| 25. Integration Testing + Example Validation | 2/2 | Complete | 2026-03-23 |
| 26. Cleanup + Dead Code Removal | 1/1 | Complete | 2026-03-23 |

**v1.0 total: 25/25 complete**
**v1.1 total: 16/16 complete**
**v1.2 total: 17/17 complete**
**v1.3 total: 9/9 complete**

---

**Changes from review (2026-03-21):**
- [FIX] Phase 5 now depends on Phase 2 (ScreenBuffer needed for RENDER phase)
- [FIX] Phase 6 now depends on Phase 3 for plans 06-02 and 06-03 (Focus/Shortcuts need Element tree)
- [SPLIT] Plan 03-02 → 03-02a (Element Tree) + 03-02b (RenderObject)
- [SPLIT] Plan 07-01 → 07-01a (leaf/single-child) + 07-01b (flex widgets)
- [MISSING] Added Plan 05-03 (ScreenBuffer Integration) for PaintContext↔ScreenBuffer bridge
- [MISSING] Added Plan 06-03 (Event Dispatch Pipeline) for Input↔Widget event routing
- [REORDER] Explicit wave strategy replacing ambiguous serial execution order
- [MOVED] TERM-06 moved from Phase 2 to Phase 7 (ANSI parser has no Phase 2 consumer)
- Phase 3 revised to match Amp's simplified architecture (no RelayoutBoundary, no sizedByParent, no didChangeDependencies)

**Amp fidelity reconciliation (2026-03-21):**
- Phase 2: Removed dirty-region tracking from ScreenBuffer (Amp does full-grid scan)
- Phase 3: Removed sizedByParent/performResize, RelayoutBoundary, RepaintBoundary, didChangeDependencies, deactivate
- Phase 4: Removed RelayoutBoundary optimization from success criteria
- Phase 8: Updated perf-stress validation criteria (no RelayoutBoundary to validate)

**v1.3 Architecture Realignment (2026-03-23):**
- Added 4 phases (23-26), 9 plans, 21 requirements
- Phase 23: WidgetsBinding + TerminalManager + FrameScheduler core refactoring
- Phase 24: BuildOwner + Element + Input pipeline alignment
- Phase 25: Integration testing + example validation
- Phase 26: Cleanup + dead code removal
- Strictly sequential dependency chain (each phase modifies shared core files)
- Every requirement cites exact Amp `.reference/` file and line numbers
- Every phase includes mandatory Amp Review Checklist for cross-reference verification
