# Roadmap: Flutter-TUI

## Overview

Build a complete Flutter-for-Terminal framework in TypeScript/Bun, progressing from core type primitives through terminal abstraction, three-tree widget framework, layout engine, frame scheduling, input handling, high-level widgets, and finally diagnostics with example applications. Each phase builds on the previous, with parallel development opportunities across phases.

**Last review:** 2026-03-22 — v1.1 milestone roadmap added. 7 new phases (9-15), 38 requirements.

## Milestones

- ✓ **v1.0 MVP** — Phases 1-8 (complete, shipped 2026-03-21)
- 📋 **v1.1 Amp CLI Feature Parity** — Phases 9-15 (planned)

## Phases

- [x] **Phase 1: Core Primitives** — Type definitions, color model, text spans, box constraints, key system
- [x] **Phase 2: Terminal Layer** — Cell buffer, double-buffering, diff algorithm, ANSI renderer, raw mode I/O
- [x] **Phase 3: Widget Framework** — Three-tree core: Widget/Element/RenderObject lifecycle, BuildOwner, PipelineOwner, runApp
- [x] **Phase 4: Layout System** — Flex algorithm, padding, constrained box, decorated box, parent data
- [x] **Phase 5: Frame & Paint** — On-demand scheduler, 4-phase pipeline, PaintContext, ScreenBuffer integration
- [x] **Phase 6: Input System** — Keyboard/mouse events, input parser state machine, focus management, event dispatch
- [x] **Phase 7: High-Level Widgets** — Text, Container, Flex, ScrollView, ListView, TextField, Button, Table
- [x] **Phase 8: Diagnostics & Examples** — Performance overlay, frame stats, debug flags, 28 example applications

### v1.1 Phases

- [x] **Phase 9: Text & Render Foundations** — TextStyle/TextSpan API enhancements, ClipCanvas, RenderFlex intrinsic sizes
- [x] **Phase 10: Infrastructure Layer** — MediaQuery, Theme, HoverContext InheritedWidgets, WidgetsBinding enhancements, async runApp
- [x] **Phase 11: Mouse & Scroll Systems** — MouseTracker/MouseManager, SystemMouseCursors, MouseRegion events, ScrollController animation/followMode
- [x] **Phase 12: Core Missing Widgets** — FocusScope/KeyboardListener, ClipRect, IntrinsicHeight, Scrollbar
- [ ] **Phase 13: Advanced Widgets** — DiffView, Dialog/SelectionList, Markdown, ContainerWithOverlays
- [ ] **Phase 14: RenderText Advanced** — Text selection/highlight, character position tracking, hyperlink click, emoji width
- [ ] **Phase 15: Debug Inspector** — HTTP server on port 9876, widget tree JSON endpoints

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

### v1.1 Amp CLI Feature Parity

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Text & Render Foundations | 3/3 | Complete | 2026-03-22 |
| 10. Infrastructure Layer | 3/3 | Complete | 2026-03-22 |
| 11. Mouse & Scroll Systems | 2/2 | Complete | 2026-03-22 |
| 12. Core Missing Widgets | 2/2 | Complete | 2026-03-22 |
| 13. Advanced Widgets | 0/3 | Not started | - |
| 14. RenderText Advanced | 0/2 | Not started | - |
| 15. Debug Inspector | 0/1 | Not started | - |

**v1.0 total: 25/25 complete**
**v1.1 total: 16 plans** | **38 requirements** | **5 waves (W7-W11)**

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
