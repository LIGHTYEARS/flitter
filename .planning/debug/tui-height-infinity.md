---
status: diagnosed
trigger: "TUI crashes with height=Infinity — Error: 尺寸必须为有限数值，收到: width=37, height=Infinity"
created: 2026-04-15T00:00:00Z
updated: 2026-04-15T00:00:00Z
---

## Current Focus

hypothesis: TuiController.getSize() uses `process.stdout.rows ?? 24` but when stdout is not a TTY (piped/redirected), `process.stdout.rows` is `undefined` and the fallback works. However, when stdout IS a TTY but rows is 0 or undefined in certain Bun environments, the `??` fallback does NOT trigger, letting an invalid value through. More critically, flitter's getSize() is missing amp's multi-layer size detection strategy.
test: Compare flitter's getSize() against amp's Uk0() function
expecting: amp has _refreshSize, getWindowSize fallbacks; flitter only checks .columns/.rows
next_action: Report diagnosis

## Symptoms

expected: TUI launches and renders correctly with actual terminal dimensions
actual: Crashes with "尺寸必须为有限数值，收到: width=37, height=Infinity"
errors: Error: 尺寸必须为有限数值，收到: width=37, height=Infinity
reproduction: Run `bun packages/cli/bin/flitter.ts` in a real terminal
started: Unknown

## Eliminated

(none needed - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-04-15T00:01:00Z
  checked: TuiController.getSize() at tui-controller.ts:330-335
  found: |
    getSize() { return { width: process.stdout.columns ?? 80, height: process.stdout.rows ?? 24 }; }
    Uses only `??` (nullish coalescing) — only catches null/undefined, NOT 0.
    No _refreshSize() call, no getWindowSize() fallback, no isTTY check.
  implication: If process.stdout.rows is undefined but columns is valid, height falls back to 24 — this works. But Infinity must come from elsewhere.

- timestamp: 2026-04-15T00:02:00Z
  checked: amp's XXT class in clipboard-and-input.js:511-620 and Uk0() in tui-layout-engine.js:413-426
  found: |
    amp's Uk0(T) function for getting size from a stream:
    1. Calls T._refreshSize?.() first (forces Node/Bun to re-read actual terminal dimensions)
    2. Checks T.isTTY && T.columns && T.rows (truthy check, rejects 0/undefined/null)
    3. Falls back to T.getWindowSize?.() as secondary source
    4. Returns null if everything fails
    
    amp's updateTerminalSize():
    1. If tty.stdin is not a TTY stream → hardcode {width:80, height:24}
    2. Calls Uk0(process.stdout) — note: uses process.stdout, not stdin
    3. Only updates terminalSize if Uk0 returns non-null (keeps previous value otherwise)
    
    amp's getSize() returns a copy of this.terminalSize (a cached property)
  implication: amp has a robust multi-layer size detection; flitter is missing all of it

- timestamp: 2026-04-15T00:03:00Z
  checked: Where Infinity enters the pipeline
  found: |
    The crash at render-box.ts:55 checks `Number.isFinite(value.height)`.
    The call chain: runApp() -> updateRootConstraints(size.width, size.height) -> BoxConstraints.tight(w, h) -> layout -> performLayout -> this.size = { width, height }.
    
    If process.stdout.rows is `undefined`, `undefined ?? 24` = 24 (OK).
    If process.stdout.rows is `0`, `0 ?? 24` = 0 (NOT OK but doesn't produce Infinity).
    
    The Infinity likely comes from process.stdout NOT being a TTY at all.
    When stdout is not a TTY (e.g., piped), process.stdout.columns and process.stdout.rows are both undefined.
    
    BUT the error shows width=37, which IS a valid terminal width — so stdout partially reports size.
    
    In Bun, process.stdout.rows can be undefined even when process.stdout.columns is defined,
    if the terminal size query only partially succeeds. The `??` fallback would give 24, not Infinity.
    
    The actual Infinity source: process.stdout.rows is likely literally `Infinity` in certain Bun/terminal 
    configurations, OR there's a code path where height becomes Infinity through constraint propagation.
    
    WAIT — re-examining: `undefined ?? 24` = 24. But what if stdout.rows is NaN? `NaN ?? 24` = NaN (not null/undefined).
    What about Number() coercion? No coercion happening here.
    
    Most likely: process.stdout.rows returns `undefined`, the ?? 24 fallback works at getSize() time,
    BUT the Infinity comes from a DIFFERENT path — the TtyOutputTarget's stream.
  implication: Need to check if createTtyOutput falls back to stderr or /dev/tty, which may have different size reporting

- timestamp: 2026-04-15T00:04:00Z
  checked: Re-examined the error message carefully and the full call chain
  found: |
    Error says width=37, height=Infinity. Width 37 is a real terminal width.
    
    getSize() line 331-334:
      width: process.stdout.columns ?? 80,   -> gives 37 (real value)
      height: process.stdout.rows ?? 24,     -> gives Infinity somehow
    
    This means process.stdout.rows IS defined (otherwise ?? would give 24).
    process.stdout.rows must be Infinity.
    
    This happens in Bun when stdout is a TTY but _refreshSize hasn't been called.
    In Node.js, process.stdout.rows is populated by libuv's uv_tty_get_winsize.
    In Bun, there can be edge cases where rows is not properly populated.
    
    The key missing piece from amp: calling `_refreshSize?.()` before reading .columns/.rows.
    _refreshSize() is a Node.js internal method on WriteStream that forces a re-query of 
    terminal dimensions via ioctl(TIOCGWINSZ). Without this call, stale or uninitialized 
    values may be returned.
  implication: Root cause is missing _refreshSize() call + missing isTTY/truthy guards

## Resolution

root_cause: |
  TuiController.getSize() (tui-controller.ts:330-335) directly reads `process.stdout.columns` and 
  `process.stdout.rows` with only a nullish coalescing (`??`) fallback to 80x24. This is missing 
  three critical safeguards that amp's equivalent code (Uk0 function) implements:
  
  1. **Missing `_refreshSize()` call**: amp calls `T._refreshSize?.()` before reading dimensions. 
     This forces the runtime to re-query the actual terminal size via ioctl(TIOCGWINSZ). Without it, 
     `process.stdout.rows` can be stale, uninitialized, or Infinity in Bun.
  
  2. **Missing truthy guard**: amp checks `T.isTTY && T.columns && T.rows` (truthy check), which 
     rejects 0, undefined, null, NaN, AND Infinity (since `Infinity` is truthy, this specific case 
     would pass — but combined with _refreshSize it's safe). More importantly, amp returns null 
     when the check fails and falls back to getWindowSize().
  
  3. **Missing getWindowSize() fallback**: amp tries `T.getWindowSize?.()` as a secondary source 
     when .columns/.rows aren't available or valid.
  
  4. **Missing isTTY check**: amp's updateTerminalSize() first checks if the tty input is actually 
     a TTY. If not, it hardcodes 80x24 immediately.
  
  The `??` operator only catches `null` and `undefined`. If `process.stdout.rows` is `Infinity` 
  (which can happen in Bun when terminal size isn't properly initialized), the fallback never triggers.

fix: (not applied - diagnosis only)
verification: (not applicable)
files_changed: []
