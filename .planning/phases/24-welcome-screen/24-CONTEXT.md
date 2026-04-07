# Phase 24: Welcome Screen - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current plaintext `buildWelcomeScreen()` stub in `chat-view.ts` with a
`WelcomeScreen` StatefulWidget that renders the AMP ASCII Art "amp" Logo (density-field
style) with per-character Perlin gradient animation, and two hint text lines to the right
of the logo. No other screens, no new routes, no navigation logic changes.

</domain>

<decisions>
## Implementation Decisions

### Logo Content and Layout

- **D-01:** Logo is the `DensityOrbWidget` `'welcome'` variant — the existing
  `DensityOrbWidget` with `variant: 'welcome'` already renders the correct density-field
  ASCII art that matches AMP's golden file (`plain-63x244.golden`). Do NOT build a new
  ASCII character matrix. Reuse `DensityOrbWidget` as-is.

- **D-02:** Layout is `Row(mainAxisSize: 'min')` with the logo on the left and a
  `Column` of hint texts on the right, wrapped in a `Center`. Matches golden file
  layout exactly: logo occupies the left, hints occupy the right at the logo's vertical
  midpoint.

- **D-03:** Hint text lines (exact strings from golden file):
  - Line 1: `"Welcome to Amp"` — dim + green foreground
  - Line 2: `"Ctrl+O for help"` — `Ctrl+O` blue, ` for ` dim, `help` yellow
  - Line 3: `"Use Tab/Shift+Tab to navigate to previous"` + newline +
    `"messages to edit or restore to a previous state"` — cyan foreground

  These are the verbatim strings from the golden file. No substitutions.

### Perlin Gradient Animation Strategy

- **D-04:** Logo animation is handled by `DensityOrbWidget` itself — it already drives
  Perlin noise via `setInterval`. No additional animation layer is needed for the logo.

- **D-05:** The hint text is **static** — no color animation on hint lines. Matches AMP
  golden file observation (no evidence of animated hints).

- **D-06:** `DensityOrbWidget` does not accept `agentMode`; use
  `DensityOrbWidget({ variant: 'welcome' })` with its current fixed coloring behavior in
  Phase 24. No mode prop is passed in this phase.

### Component Architecture

- **D-07:** Extract a standalone `WelcomeScreen` **StatefulWidget** in a new file
  `packages/flitter-cli/src/widgets/welcome-screen.ts`. The `buildWelcomeScreen()`
  function in `chat-view.ts` is replaced with `new WelcomeScreen({ appState })`.

- **D-08:** `WelcomeScreen` receives `appState: AppState` as its only prop. It
  registers an `appState` listener in `initState` / `dispose` to re-render on state
  changes using the same listener lifecycle pattern as existing stateful widgets, but it
  does not pass any mode prop to `DensityOrbWidget` in Phase 24.

- **D-09:** Animation dispose: `DensityOrbWidget` already manages its own `setInterval`.
  `WelcomeScreen` does not need a separate timer — just build `DensityOrbWidget` in its
  `build()` method and the framework lifecycle handles disposal.

### Testing Guardrails

- **D-10:** Test file: `packages/flitter-cli/src/__tests__/welcome-screen.test.ts`.
  Required test cases:
  1. **Render path**: `WelcomeScreen` renders without throwing; widget tree contains
     a `DensityOrbWidget` with `variant: 'welcome'`.
  2. **Hint text presence**: widget tree contains all three hint strings
     (`"Welcome to Amp"`, `"Ctrl+O for help"`, `"Use Tab/Shift+Tab to navigate..."`).
  3. **Cleanup path**: `WelcomeScreen` state disposes cleanly (no timer leaks after
     `unmount`).
  4. **Integration**: `buildWelcomeScreen()` in `chat-view.ts` now delegates to
     `WelcomeScreen` — verify `screenState.kind === 'welcome'` produces a `WelcomeScreen`
     widget (not a bare `Center` with text).

- **D-11:** No golden file snapshot test for Phase 24 — golden file verification
  belongs to a dedicated tmux-capture step, not the unit test suite.

### Claude's Discretion

- Exact horizontal spacing between logo and hint column (SizedBox width) — match
  golden file visually; ~4-8 columns gap is acceptable.
- Whether hint column uses `crossAxisAlignment: 'start'` or `'center'` — use `'start'`
  to match golden file left-aligned hints.
- Vertical alignment of hint column relative to logo — use `CrossAxisAlignment.center`
  on the outer Row, or a `Center` wrapping the hint column.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Golden File (Visual Contract)
- `tmux-capture/screens/amp/welcome/plain-63x244.golden` — exact layout: density orb
  left, hints right; three hint lines verbatim
- `tmux-capture/screens/amp/welcome/ansi-63x244.golden` — ANSI color reference for
  hint text styles (keybind color, dim)

### Existing Reusable Components
- `packages/flitter-cli/src/widgets/density-orb-widget.ts` — `DensityOrbWidget` with
  `variant: 'welcome'` is the logo; read its props interface carefully
- `packages/flitter-cli/src/widgets/chat-view.ts` — `buildWelcomeScreen()` function
  to be replaced (L403-L445)
- `packages/flitter-cli/src/themes/index.ts` — `perlinAgentModeColor()` and
  `CliThemeProvider.of(context)` for keybind color access

### AMP Source Evidence
- `tmux-capture/amp-source/31_main_tui_build.js` — confirms `IrR` component renders
  when `isTranscriptEmpty()` is true; receives `{ agentMode, mysteriousMessage,
  mysterySequenceProgress, onShowMysteryModal, onOrbExplode }` props
- `tmux-capture/amp-source/FEATURE-AUDIT.md` §VF-1, §VF-2 — documents the gap and
  evidence

### Architecture Patterns
- `packages/flitter-cli/src/widgets/border-shimmer.ts` — animation pattern:
  `setInterval` + `setState`, `dispose` clears timer
- `packages/flitter-cli/src/widgets/glow-text.ts` — per-character Perlin pattern
  (reference only; not used directly in Phase 24)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DensityOrbWidget({ variant: 'welcome' })`: renders 40-col × 20-row density-field
  ASCII art with Perlin animation; already has welcome-specific char set and speed
- `perlinAgentModeColor(mode, t, isLight)`: generates hue-shifted color from agent
  mode; used for logo coloring in `DensityOrbWidget`
- `CliThemeProvider.of(context).theme.keybind`: keybind color for hint formatting
- `lerpColor` (flitter-core): available for any gradient needs

### Established Patterns
- All animated widgets use `setInterval` + `setState` in `initState`, `clearInterval`
  in `dispose`
- `AppState` listeners: `initState` → `appState.addListener(...)`, `dispose` →
  `appState.removeListener(...)`
- `StatefulWidget` with `State<T>` pattern: consistent across all existing animated
  widgets

### Integration Points
- `chat-view.ts` `buildWelcomeScreen(appState)` → replace with
  `new WelcomeScreen({ appState })`
- `screenState.kind === 'welcome'` triggers this path in `ChatViewState.build()`
- No new imports needed in `app-shell.ts`; all wiring is in `chat-view.ts`

</code_context>

<specifics>
## Specific Ideas

- **Strict AMP fidelity**: implement only what the golden file shows. No extra hints,
  no "flitter-cli" branding, no cwd display. The golden file is the spec.
- **DensityOrbWidget reuse**: the orb widget already exists and renders the correct
  visual. Phase 24 is primarily about wiring it into the welcome screen layout with
  the correct hints to its right.
- **mysteriousMessage / onOrbExplode**: AMP source shows the welcome widget receives
  these props. For Phase 24, these are stubbed as `null` / no-op — they require
  Phase 30 (Skills Modal) and Phase 35 (Image Support) features respectively.

</specifics>

<deferred>
## Deferred Ideas

- `mysteriousMessage` easter-egg modal (requires Phase 35 infrastructure)
- `splashOrbExplosion` / `onOrbExplode` sparkle effect (requires Phase 35)
- Replacing `"Welcome to Amp"` with `"Welcome to flitter-cli"` branding — intentionally
  kept as AMP string per fidelity mandate

</deferred>

---

*Phase: 24-welcome-screen*
*Context gathered: 2026-04-07*
