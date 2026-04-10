# Debug: esc-dismiss-delay

**Issue:** ESC key press to dismiss overlays (command palette, shortcuts panel) has noticeable ~500ms delay compared to amp original which closes instantly.

**Status:** ROOT CAUSE FOUND  
**Confidence:** HIGH (95%)  
**Date:** 2026-04-09

---

## Root Cause

**The Kitty keyboard protocol is NOT enabled during terminal initialization**, forcing the input parser to use a 500ms disambiguation timeout for every bare ESC (`0x1B`) keypress.

### The Mechanism

When a user presses ESC in a terminal:

- **Without Kitty keyboard protocol:** The terminal sends a single byte `0x1B`. But `0x1B` is also the *first byte* of ALL escape sequences (e.g., `\x1b[A` for arrow-up). The parser CANNOT know whether `0x1B` is a standalone ESC keypress or the start of a multi-byte sequence. So it **waits 500ms** (`ESCAPE_TIMEOUT_MS`) for more bytes. If no more bytes arrive, it emits `Escape`.

- **With Kitty keyboard protocol:** The terminal sends `\x1b[27u` (CSI 27 u) for ESC. This is a complete, unambiguous sequence. The parser recognizes it **immediately** (0ms delay) and emits `Escape` via the `_resolveKittyCSIu()` path.

### The Gap in flitter

**`TerminalManager.initialize()`** (line 105-132) builds this init sequence:

```typescript
const initSequence =
  this.renderer.enterAltScreen() +
  this.renderer.hideCursor() +
  this.renderer.enableMouse() +
  this.renderer.enableBracketedPaste() +
  this.renderer.enableInBandResize() +
  this.renderer.enableEmojiWidth();
```

**`enableKittyKeyboard()` is MISSING** from this list, despite:
1. The `Renderer` class having `enableKittyKeyboard()` method (renderer.ts L454)
2. The `terminalCleanup()` function already disabling it (terminal-cleanup.ts L44)
3. The `InputParser` having full Kitty CSI u parsing support (input-parser.ts L372-531)
4. The `KITTY_SPECIAL_KEY_MAP` mapping keyCode 27 → 'escape' (input-parser.ts L968)

### Evidence from amp binary

Strings extracted from the compiled amp binary (`/Users/bytedance/.local/bin/amp`) confirm amp **does** enable Kitty keyboard:

```
# From amp's init sequence:
Rh(e,r.enableKittyKeyboard({reportEventTypes:!0}),"kitty-keyboard-enable",T)

# From amp's capability-conditional enable:
if(this.capabilities?.kittyKeyboard)this.enableKittyKeyboard()
if(this.capabilities.kittyKeyboard)this.enableKittyKeyboard()
```

This is why amp closes overlays **instantly** on ESC while flitter has a 500ms delay.

---

## Files Involved

| File | Lines | Role |
|------|-------|------|
| `packages/flitter-core/src/input/input-parser.ts` | L52 | `ESCAPE_TIMEOUT_MS = 500` — the timeout constant |
| `packages/flitter-core/src/input/input-parser.ts` | L148-157 | `_processIdle()` — starts 500ms timer on bare `\x1b` |
| `packages/flitter-core/src/input/input-parser.ts` | L740-747 | `_startEscapeTimeout()` — the 500ms setTimeout |
| `packages/flitter-core/src/input/input-parser.ts` | L759-762 | `_emitBareEscape()` — fires after timeout |
| `packages/flitter-core/src/input/input-parser.ts` | L372-374, L499-531 | Kitty CSI u parsing (already implemented, but never triggered) |
| `packages/flitter-core/src/input/input-parser.ts` | L965-988 | `KITTY_SPECIAL_KEY_MAP` with keyCode 27 → 'escape' |
| `packages/flitter-core/src/terminal/terminal-manager.ts` | L105-132 | `initialize()` — **MISSING** `enableKittyKeyboard()` |
| `packages/flitter-core/src/terminal/renderer.ts` | L64, L454-456 | `KITTY_KEYBOARD_ON` / `enableKittyKeyboard()` method |
| `packages/flitter-core/src/terminal/terminal-cleanup.ts` | L44 | `KITTY_KEYBOARD_OFF` — cleanup disables it (asymmetry) |

---

## Data Flow Trace

### Current (broken) path — 500ms delay:
```
User presses ESC
  → Terminal sends: 0x1B (single byte)
  → InputParser._processIdle() receives '\x1b'
  → State → ParserState.Escape
  → _startEscapeTimeout() sets 500ms timer
  → ... 500ms passes with no further input ...
  → setTimeout fires → _emitBareEscape()
  → Emits KeyEvent('Escape')
  → Widget handler dismisses overlay
  → Re-render
```

### Expected (fixed) path — instant:
```
User presses ESC
  → Terminal sends: \x1b[27u (Kitty protocol, 4 bytes)
  → InputParser._processIdle() receives '\x1b'
  → State → ParserState.Escape, starts timeout
  → _processEscape() receives '[' → clears timeout, State → ParserState.CSI
  → _processCSI() collects '2', '7', then 'u'
  → final === 'u' → _resolveKittyCSIu(params="27")
  → KITTY_SPECIAL_KEY_MAP[27] = 'escape'
  → Emits KeyEvent('Escape') ← INSTANT, no timeout
  → Widget handler dismisses overlay
  → Re-render
```

---

## Suggested Fix Strategies

### Strategy A: Enable Kitty Keyboard Protocol (Recommended)
Add `this.renderer.enableKittyKeyboard()` to `TerminalManager.initialize()`:

```typescript
const initSequence =
  this.renderer.enterAltScreen() +
  this.renderer.hideCursor() +
  this.renderer.enableMouse() +
  this.renderer.enableBracketedPaste() +
  this.renderer.enableInBandResize() +
  this.renderer.enableEmojiWidth() +
  this.renderer.enableKittyKeyboard();  // <-- add this
```

**Pros:** Eliminates 500ms delay for ALL special keys (not just ESC). Matches amp behavior. All parser infrastructure already exists.  
**Cons:** Requires terminal support (most modern terminals: iTerm2, Kitty, WezTerm, Ghostty support it; older terminals may not). Should be gated on capability detection like amp does.

### Strategy B: Capability-Gated Kitty Keyboard (Safer)
Follow amp's pattern of conditionally enabling based on capability detection:

```typescript
if (this._capabilities.kittyKeyboard) {
  this.renderer.enableKittyKeyboard();
}
```

**Pros:** Safe fallback for terminals that don't support Kitty protocol.  
**Cons:** Needs capability detection to work first (check if `TerminalCapabilities` already tracks `kittyKeyboard`).

### Strategy C: Reduce ESCAPE_TIMEOUT_MS (Quick Workaround)
Lower `ESCAPE_TIMEOUT_MS` from 500ms to e.g. 50ms.

**Pros:** Simple one-line change. Works on all terminals.  
**Cons:** 50ms may be too short for slow SSH connections where escape sequences arrive in multiple TCP packets. Could misparse arrow keys as separate ESC + `[A`. Not a real fix, just hides the symptom.

### Recommended Approach
**Strategy B** (capability-gated Kitty keyboard) is the correct fix:
1. Check if capability detection for Kitty keyboard already exists
2. Enable Kitty keyboard in `initialize()` when supported
3. Keep `ESCAPE_TIMEOUT_MS = 500` as fallback for non-Kitty terminals
4. This matches exactly what the amp binary does

---

## Hypothesis Log

| # | Hypothesis | Result |
|---|-----------|--------|
| H1 | ESC disambiguation timeout (500ms) causes delay | **CONFIRMED** — `ESCAPE_TIMEOUT_MS = 500` at input-parser.ts L52 |
| H2 | Kitty keyboard protocol not enabled despite infrastructure being ready | **CONFIRMED** — `TerminalManager.initialize()` L111-117 missing `enableKittyKeyboard()` |
| H3 | Amp binary enables Kitty keyboard for instant ESC | **CONFIRMED** — `strings` extraction shows `enableKittyKeyboard({reportEventTypes:!0})` in amp init |
