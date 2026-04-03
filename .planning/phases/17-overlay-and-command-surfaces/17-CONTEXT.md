# Phase 17: Overlay and Command Surfaces - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete parity for permission, command palette, file-picker, autocomplete, and shortcut-discovery overlays. This phase builds the overlay infrastructure and individual overlay surfaces that Phase 16's stub shortcuts (Ctrl+O, ?, etc.) will connect to.

</domain>

<decisions>
## Implementation Decisions

### Overlay Infrastructure
- Port OverlayManager from flitter-amp (priority-sorted stack, modal dimming, show/dismiss/dismissTop)
- Overlay entries with id, priority, modal flag, placement, builder
- Well-known overlay IDs and priorities from flitter-amp's overlay-ids.ts
- Stack-based rendering with optional semi-transparent modal masks

### Permission Dialog
- Modal overlay with dimming and focus capture
- Y/N/always/deny options matching Amp semantics
- Dismissal returns to previous focus target

### Command Palette
- Searchable action list invoked via Ctrl+O
- Action items with label, description, shortcut hint, handler
- Filter-as-you-type with highlighted matches
- Esc to dismiss

### File Picker and Autocomplete
- File-picker overlay for autocomplete triggers from InputArea
- Inline autocomplete overlay with directional navigation
- Connected to InputArea's Autocomplete wrapper triggers (Phase 16 stubs)

### Shortcut Help
- Overlay showing all bound shortcuts with descriptions
- Invoked from ? when input is empty
- Read from a single source-of-truth shortcut registry

### Claude's Discretion
- Widget composition for each overlay
- Animation/transition approach (if any)
- Exact shortcut registry structure
- File picker filesystem integration details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `flitter-amp/src/state/overlay-manager.ts` — OverlayManager with priority stack
- `flitter-amp/src/state/overlay-ids.ts` — well-known overlay IDs and priorities
- `flitter-cli/src/widgets/app-shell.ts` — has stubs for Ctrl+O, ?, Esc overlay handling
- `flitter-cli/src/widgets/input-area.ts` — Autocomplete wrapper with empty triggers

### Integration Points
- AppShell.build() — OverlayManager.buildOverlays() wraps the main content
- AppShellState._handleKey() — shortcut stubs connect to overlay show/dismiss
- InputArea Autocomplete triggers — connect to file-picker/autocomplete overlays

</code_context>

<deferred>
## Deferred Ideas

- Prompt history overlay belongs to Phase 21
- Thread list overlay belongs to Phase 21
- Status bar belongs to Phase 20

</deferred>
