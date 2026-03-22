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

## v1.1 Requirements

Requirements for Amp CLI feature parity. Each maps to roadmap phases 9+.

### Infrastructure InheritedWidgets (INFRA)

- [ ] **INFRA-01**: MediaQuery InheritedWidget providing MediaQueryData (screen size, terminal capabilities) — wraps root widget in runApp (Amp: Q3)
- [ ] **INFRA-02**: MediaQueryData class with size (width/height) and capabilities fields (Amp: nA)
- [ ] **INFRA-03**: Theme InheritedWidget providing color scheme (primary, background, text, success, destructive, etc.) — used by DiffView, Button, RenderText (Amp: w3)
- [ ] **INFRA-04**: HoverContext InheritedWidget for propagating mouse hover state to descendants (Amp: J_)

### Missing Widgets (MWDG)

- [ ] **MWDG-01**: FocusScope/KeyboardListener StatefulWidget wrapping FocusNode — autofocus, onKey, onPaste, onFocusChange, canRequestFocus, skipTraversal (Amp: t4)
- [x] **MWDG-02**: Scrollbar StatefulWidget with thumb/track rendering, thickness, colors, characters, paired with ScrollController (Amp: ia)
- [ ] **MWDG-03**: SelectionList StatefulWidget — interactive selection dialog with keyboard navigation (arrows/j/k/Tab), Enter confirm, Escape dismiss, mouse click, disabled item skip (Amp: ap)
- [ ] **MWDG-04**: Dialog data class — title, type, widget, footerStyle, dimensions (Amp: ab)
- [ ] **MWDG-05**: DiffView StatelessWidget — unified diff parsing, +/- line coloring, line numbers, syntax highlighting via Theme (Amp: Bn)
- [ ] **MWDG-06**: ClipRect SingleChildRenderObjectWidget — clips child painting to parent bounds (Amp: nv)
- [x] **MWDG-07**: IntrinsicHeight SingleChildRenderObjectWidget with RenderIntrinsicHeight — queries child getMaxIntrinsicHeight and applies tight constraint (Amp: hJ/vU0)
- [ ] **MWDG-08**: Markdown StatelessWidget — parses markdown text, renders as styled Text tree (headings, code, links via OSC 8) (Amp: _g)
- [x] **MWDG-09**: ContainerWithOverlays — extends Container with edge/corner overlay positioning using Stack+Positioned internally (Amp: bt)

### Framework Enhancements (FRMW)

- [ ] **FRMW-12**: WidgetsBinding.mouseManager — global MouseManager singleton reference (Amp: Pg in J3)
- [ ] **FRMW-13**: WidgetsBinding.eventCallbacks — keyboard, mouse, paste event global callback lists (Amp: J3)
- [ ] **FRMW-14**: WidgetsBinding.keyInterceptors — keyboard event interceptor chain, priority over focus system (Amp: J3)
- [ ] **FRMW-15**: Async runApp with terminal capability detection, MediaQuery wrapping of root widget, lazy focus/idle loading (Amp: cz8)
- [ ] **FRMW-16**: BuildContext.mediaQuery field for fast MediaQueryData access (Amp: jd.mediaQuery)

### Text API Enhancements (TEXT)

- [ ] **TEXT-01**: TextStyle.copyWith() for partial-override new instance creation (Amp: m0.copyWith)
- [ ] **TEXT-02**: TextStyle static factories — normal(color), bold(color), italic(color), underline(color), colored(color), background(color) (Amp: m0 static methods)
- [x] **TEXT-03**: TextSpan.hyperlink property — { uri: string, id?: string } for OSC 8 terminal hyperlinks (Amp: TextSpan hyperlink)
- [x] **TEXT-04**: TextSpan.onClick callback property for click handling (Amp: TextSpan onClick)
- [x] **TEXT-05**: TextSpan.equals() deep structural comparison (Amp: TextSpan equality)

### RenderObject Enhancements (ROBJ)

- [ ] **ROBJ-01**: RenderText selection support — selectable flag, selectedRanges[], selectionColor, copyHighlightColor, highlightMode (Amp: gU0)
- [ ] **ROBJ-02**: RenderText character position tracking — _characterPositions[], _visualLines[] cache, getCharacterRect(index), getOffsetForPosition(x,y) (Amp: gU0)
- [ ] **ROBJ-03**: RenderText hyperlink/click handling — getHyperlinkAtPosition(), getOnClickAtPosition(), handleMouseEvent() with cursor changes (Amp: gU0)
- [ ] **ROBJ-04**: RenderText emoji width detection — _emojiWidthSupported flag from MediaQuery capabilities (Amp: gU0)
- [ ] **ROBJ-05**: RenderFlex intrinsic size methods — getMinIntrinsicWidth(h), getMaxIntrinsicWidth(h), getMinIntrinsicHeight(w), getMaxIntrinsicHeight(w) (Amp: oU0)
- [ ] **ROBJ-06**: RenderFlex CrossAxisAlignment.baseline variant (Amp: oU0)
- [ ] **ROBJ-07**: ClipCanvas paint wrapper — clips painting area for scroll viewports (Amp: E$)

### Mouse/Cursor System (MOUS)

- [x] **MOUS-01**: MouseTracker/MouseManager singleton — global mouse tracking, cursor shape management, hover state coordination (Amp: Pg)
- [x] **MOUS-02**: SystemMouseCursors constants (POINTER, DEFAULT) with ANSI escape sequences (Amp: gg)
- [x] **MOUS-03**: MouseRegion.onRelease event callback (Amp: Ba.onRelease)
- [x] **MOUS-04**: MouseRegion.onDrag event callback (Amp: Ba.onDrag)

### ScrollController Enhancements (SCRL)

- [ ] **SCRL-01**: ScrollController.animateTo(offset) with timer-based smooth scrolling animation (Amp: Lg.animateTo)
- [ ] **SCRL-02**: ScrollController.followMode — auto-scroll to bottom when content grows, with disableFollowMode() (Amp: Lg.followMode)
- [ ] **SCRL-03**: ScrollController.atBottom getter — check if scrolled to end (Amp: Lg.atBottom)

### Debug Tools (DBUG)

- [ ] **DBUG-01**: Debug Inspector HTTP server on port 9876 — /tree, /inspect, /select endpoints exposing widget tree as JSON (Amp: Mu)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Animation

- **ANIM-01**: Tween-based animation controller
- **ANIM-02**: Curve library (ease, bounce, elastic)
- **ANIM-03**: AnimatedContainer, AnimatedOpacity widgets

### Image Protocol

- **ARND-01**: Kitty graphics protocol support (ImagePreview, KittyImageWidget)
- **ARND-02**: Sixel graphics support
- **ARND-03**: ImagePreviewProvider InheritedWidget

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
| Kitty/Sixel image rendering | Requires terminal capability negotiation; deferred to v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

### v1.0 Traceability (Complete)

All 65 v1.0 requirements completed across Phases 1-8. See MILESTONES.md.

### v1.1 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 10 | Pending |
| INFRA-02 | Phase 10 | Pending |
| INFRA-03 | Phase 10 | Pending |
| INFRA-04 | Phase 10 | Pending |
| MWDG-01 | Phase 12 | Pending |
| MWDG-02 | Phase 12 | Complete |
| MWDG-03 | Phase 13 | Pending |
| MWDG-04 | Phase 13 | Pending |
| MWDG-05 | Phase 13 | Pending |
| MWDG-06 | Phase 12 | Pending |
| MWDG-07 | Phase 12 | Complete |
| MWDG-08 | Phase 13 | Pending |
| MWDG-09 | Phase 13 | Complete |
| FRMW-12 | Phase 10 | Pending |
| FRMW-13 | Phase 10 | Pending |
| FRMW-14 | Phase 10 | Pending |
| FRMW-15 | Phase 10 | Pending |
| FRMW-16 | Phase 10 | Pending |
| TEXT-01 | Phase 9 | Pending |
| TEXT-02 | Phase 9 | Pending |
| TEXT-03 | Phase 9 | Complete |
| TEXT-04 | Phase 9 | Complete |
| TEXT-05 | Phase 9 | Complete |
| ROBJ-01 | Phase 14 | Pending |
| ROBJ-02 | Phase 14 | Pending |
| ROBJ-03 | Phase 14 | Pending |
| ROBJ-04 | Phase 14 | Pending |
| ROBJ-05 | Phase 9 | Pending |
| ROBJ-06 | Phase 9 | Pending |
| ROBJ-07 | Phase 9 | Pending |
| MOUS-01 | Phase 11 | Complete |
| MOUS-02 | Phase 11 | Complete |
| MOUS-03 | Phase 11 | Complete |
| MOUS-04 | Phase 11 | Complete |
| SCRL-01 | Phase 11 | Pending |
| SCRL-02 | Phase 11 | Pending |
| SCRL-03 | Phase 11 | Pending |
| DBUG-01 | Phase 15 | Pending |

**Coverage:**
- v1.1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-21 (v1.0)*
*Last updated: 2026-03-22 after v1.1 gap analysis*
