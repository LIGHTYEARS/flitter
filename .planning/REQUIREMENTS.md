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
- [ ] **MWDG-02**: Scrollbar StatefulWidget with thumb/track rendering, thickness, colors, characters, paired with ScrollController (Amp: ia)
- [ ] **MWDG-03**: SelectionList StatefulWidget — interactive selection dialog with keyboard navigation (arrows/j/k/Tab), Enter confirm, Escape dismiss, mouse click, disabled item skip (Amp: ap)
- [ ] **MWDG-04**: Dialog data class — title, type, widget, footerStyle, dimensions (Amp: ab)
- [ ] **MWDG-05**: DiffView StatelessWidget — unified diff parsing, +/- line coloring, line numbers, syntax highlighting via Theme (Amp: Bn)
- [ ] **MWDG-06**: ClipRect SingleChildRenderObjectWidget — clips child painting to parent bounds (Amp: nv)
- [ ] **MWDG-07**: IntrinsicHeight SingleChildRenderObjectWidget with RenderIntrinsicHeight — queries child getMaxIntrinsicHeight and applies tight constraint (Amp: hJ/vU0)
- [ ] **MWDG-08**: Markdown StatelessWidget — parses markdown text, renders as styled Text tree (headings, code, links via OSC 8) (Amp: _g)
- [ ] **MWDG-09**: ContainerWithOverlays — extends Container with edge/corner overlay positioning using Stack+Positioned internally (Amp: bt)

### Framework Enhancements (FRMW)

- [ ] **FRMW-12**: WidgetsBinding.mouseManager — global MouseManager singleton reference (Amp: Pg in J3)
- [ ] **FRMW-13**: WidgetsBinding.eventCallbacks — keyboard, mouse, paste event global callback lists (Amp: J3)
- [ ] **FRMW-14**: WidgetsBinding.keyInterceptors — keyboard event interceptor chain, priority over focus system (Amp: J3)
- [ ] **FRMW-15**: Async runApp with terminal capability detection, MediaQuery wrapping of root widget, lazy focus/idle loading (Amp: cz8)
- [ ] **FRMW-16**: BuildContext.mediaQuery field for fast MediaQueryData access (Amp: jd.mediaQuery)

### Text API Enhancements (TEXT)

- [ ] **TEXT-01**: TextStyle.copyWith() for partial-override new instance creation (Amp: m0.copyWith)
- [ ] **TEXT-02**: TextStyle static factories — normal(color), bold(color), italic(color), underline(color), colored(color), background(color) (Amp: m0 static methods)
- [ ] **TEXT-03**: TextSpan.hyperlink property — { uri: string, id?: string } for OSC 8 terminal hyperlinks (Amp: TextSpan hyperlink)
- [ ] **TEXT-04**: TextSpan.onClick callback property for click handling (Amp: TextSpan onClick)
- [ ] **TEXT-05**: TextSpan.equals() deep structural comparison (Amp: TextSpan equality)

### RenderObject Enhancements (ROBJ)

- [ ] **ROBJ-01**: RenderText selection support — selectable flag, selectedRanges[], selectionColor, copyHighlightColor, highlightMode (Amp: gU0)
- [ ] **ROBJ-02**: RenderText character position tracking — _characterPositions[], _visualLines[] cache, getCharacterRect(index), getOffsetForPosition(x,y) (Amp: gU0)
- [ ] **ROBJ-03**: RenderText hyperlink/click handling — getHyperlinkAtPosition(), getOnClickAtPosition(), handleMouseEvent() with cursor changes (Amp: gU0)
- [ ] **ROBJ-04**: RenderText emoji width detection — _emojiWidthSupported flag from MediaQuery capabilities (Amp: gU0)
- [ ] **ROBJ-05**: RenderFlex intrinsic size methods — getMinIntrinsicWidth(h), getMaxIntrinsicWidth(h), getMinIntrinsicHeight(w), getMaxIntrinsicHeight(w) (Amp: oU0)
- [ ] **ROBJ-06**: RenderFlex CrossAxisAlignment.baseline variant (Amp: oU0)
- [ ] **ROBJ-07**: ClipCanvas paint wrapper — clips painting area for scroll viewports (Amp: E$)

### Mouse/Cursor System (MOUS)

- [ ] **MOUS-01**: MouseTracker/MouseManager singleton — global mouse tracking, cursor shape management, hover state coordination (Amp: Pg)
- [ ] **MOUS-02**: SystemMouseCursors constants (POINTER, DEFAULT) with ANSI escape sequences (Amp: gg)
- [ ] **MOUS-03**: MouseRegion.onRelease event callback (Amp: Ba.onRelease)
- [ ] **MOUS-04**: MouseRegion.onDrag event callback (Amp: Ba.onDrag)

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
| INFRA-01 | TBD | Pending |
| INFRA-02 | TBD | Pending |
| INFRA-03 | TBD | Pending |
| INFRA-04 | TBD | Pending |
| MWDG-01 | TBD | Pending |
| MWDG-02 | TBD | Pending |
| MWDG-03 | TBD | Pending |
| MWDG-04 | TBD | Pending |
| MWDG-05 | TBD | Pending |
| MWDG-06 | TBD | Pending |
| MWDG-07 | TBD | Pending |
| MWDG-08 | TBD | Pending |
| MWDG-09 | TBD | Pending |
| FRMW-12 | TBD | Pending |
| FRMW-13 | TBD | Pending |
| FRMW-14 | TBD | Pending |
| FRMW-15 | TBD | Pending |
| FRMW-16 | TBD | Pending |
| TEXT-01 | TBD | Pending |
| TEXT-02 | TBD | Pending |
| TEXT-03 | TBD | Pending |
| TEXT-04 | TBD | Pending |
| TEXT-05 | TBD | Pending |
| ROBJ-01 | TBD | Pending |
| ROBJ-02 | TBD | Pending |
| ROBJ-03 | TBD | Pending |
| ROBJ-04 | TBD | Pending |
| ROBJ-05 | TBD | Pending |
| ROBJ-06 | TBD | Pending |
| ROBJ-07 | TBD | Pending |
| MOUS-01 | TBD | Pending |
| MOUS-02 | TBD | Pending |
| MOUS-03 | TBD | Pending |
| MOUS-04 | TBD | Pending |
| SCRL-01 | TBD | Pending |
| SCRL-02 | TBD | Pending |
| SCRL-03 | TBD | Pending |
| DBUG-01 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 38 total
- Mapped to phases: 0 (pending roadmap creation)
- Unmapped: 38

---
*Requirements defined: 2026-03-21 (v1.0)*
*Last updated: 2026-03-22 after v1.1 gap analysis*
