---
status: resolved
trigger: "Investigate and fix TWO bugs in flitter-cli TUI: transparent command palette + unresponsive input after slash dismiss"
created: 2026-04-09T00:00:00Z
updated: 2026-04-09T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED
test: Both fixes applied and verified in tmux
expecting: BUG-1: opaque palette background; BUG-2: input field regains focus after dismiss
next_action: none — both bugs resolved

## Symptoms

expected: BUG-1: Command Palette popup has opaque background. BUG-2: Input field works after dismissing Command Palette.
actual: BUG-1: Palette is transparent, welcome text bleeds through. BUG-2: Input field is frozen after / trigger → dismiss.
errors: No error messages — visual/behavioral bugs
reproduction: BUG-1: Open Command Palette, observe transparent background. BUG-2: Type "/" in empty input, close palette with Escape, try typing.
started: After modal mask was removed from overlay-manager.ts

## Eliminated

- hypothesis: "OverlayManager.dismiss() needs queueMicrotask(restoreFocus)"
  why_wrong: queueMicrotask runs before widget tree rebuilds (setState only marks dirty), so restoreFocus restores focus to the overlay's OWN FocusNode (which hasn't been disposed yet), then the overlay FocusNode gets disposed in the next frame leaving primaryFocus null again.

## Evidence

- timestamp: 2026-04-09T00:01:00Z
  checked: command-palette.ts BoxDecoration at line 493
  found: BoxDecoration only has border, no color/background property set
  implication: Container is transparent — previously masked by modal overlay background, now visible since mask was removed

- timestamp: 2026-04-09T00:02:00Z
  checked: overlay-manager.ts dismiss() and dismissTop() methods
  found: dismiss removes entry from array and notifies listeners, but does NOT call FocusManager.instance.restoreFocus()
  implication: When CommandPalette FocusNode is disposed, primaryFocus becomes null; no code restores focus to TextField

- timestamp: 2026-04-09T00:03:00Z
  checked: FocusManager.restoreFocus() call sites
  found: restoreFocus() is only called in test files, never in production code
  implication: Focus restoration mechanism exists (Gap 29) but was never wired into the disposal path

- timestamp: 2026-04-09T00:04:00Z
  checked: FocusNode.detach() and FocusScopeState.dispose() ordering
  found: FocusScopeState.dispose() calls unregisterNode(node) → detach() BEFORE calling node.dispose(). detach() clears _hasPrimaryFocus. By the time dispose() runs, _hasPrimaryFocus is already false — so placing restoreFocus in dispose() alone misses the FocusScopeState path entirely.
  implication: restoreFocus must be called in BOTH detach() and dispose() to cover all teardown paths

- timestamp: 2026-04-09T00:05:00Z
  checked: Element.unmount() ordering (children first, then self)
  found: StatefulElement.unmount() recursively unmounts children before calling _state._unmount(). So inner TextField FocusNode is disposed first; then CommandPalette FocusNode is disposed.
  implication: Chain-restore works: inner dispose → restoreFocus to outer overlay node → outer dispose → restoreFocus to InputArea TextField node

- timestamp: 2026-04-09T00:06:00Z
  checked: tmux test — opened palette with "/" then closed with Escape then typed "hello"
  found: "hello" visible in input field; cursor present; focus fully restored
  implication: Fix verified — focus chain-restoration through detach() path works correctly

## Resolution

root_cause: |
  BUG-1: CommandPalette's Container BoxDecoration has no background color — only border is set (line 493 of command-palette.ts). Previously the modal mask provided the opaque backdrop, but after its removal the palette body is transparent.
  BUG-2: The Gap 29 focus restoration mechanism (FocusManager._focusHistory + restoreFocus()) was never wired into the FocusNode teardown path. When a FocusNode holding primaryFocus was detached (via FocusScopeState.dispose() → unregisterNode → detach) or disposed, _clearPrimaryFocus() was called but restoreFocus() was not. This left primaryFocus === null, causing dispatchKeyEvent() to short-circuit all key input.
fix: |
  BUG-1: Added `color: Color.black` to the BoxDecoration in command-palette.ts.
  BUG-2: Added `FocusManager.instance.restoreFocus()` in two locations in FocusNode (focus.ts):
    1. In `detach()`: after `_clearPrimaryFocus()` when the detached node had primary focus. This covers the FocusScopeState.dispose() → unregisterNode → detach path.
    2. In `dispose()`: after all cleanup when the disposed node had primary focus (tracked via `hadPrimaryFocus` local). This covers direct FocusNode.dispose() calls.
  The two paths are complementary: detach() sets _hasPrimaryFocus=false so dispose() won't double-trigger, and vice versa.
  Updated focus-restoration.test.ts to reflect that dispose() now auto-restores focus (test no longer calls restoreFocus() manually after dispose).
verification: |
  - 467 unit tests passing (focus-restoration + focus-scope + all input tests)
  - tmux integration test: "/" → Command Palette opens with opaque background → Escape → typed "hello" → visible in input field
files_changed:
  - packages/flitter-cli/src/widgets/command-palette.ts (added Color.black background)
  - packages/flitter-core/src/input/focus.ts (added restoreFocus in detach + dispose)
  - packages/flitter-core/src/input/__tests__/focus-restoration.test.ts (updated double-autofocus test)
