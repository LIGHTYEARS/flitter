# Gap U07: No Focus Restoration Mechanism When Overlays Close

## Status: Proposal
## Affected packages: `flitter-core`, `flitter-amp`

---

## 1. Problem Statement

When a modal overlay (PermissionDialog, CommandPalette, or FilePicker) opens, its `FocusScope({ autofocus: true })` steals primary focus away from whatever widget previously held it -- typically the input area's TextField. When the overlay closes and is removed from the widget tree, the overlay's `FocusNode` is disposed and unregistered from the `FocusManager`, but **nothing requests focus back to the previously focused node**. The result is that `FocusManager.primaryFocus` becomes `null`, leaving the application in a state where no widget has keyboard focus. The user must click or tab to re-engage the input area.

This was explicitly called out in the analysis document `amp-src-analysis-39.md` (line 278):

> When the overlay is dismissed and removed from the widget tree, its FocusNode is disposed and unregistered from the FocusManager, which should allow focus to return to the previously focused node (though there is no explicit focus restoration mechanism visible in the code).

---

## 2. Current Behavior Analysis

### 2.1 Focus Flow When an Overlay Opens

The overlay lifecycle follows this sequence:

1. User triggers overlay (e.g., Ctrl+O for CommandPalette).
2. `AppStateWidget.setState()` sets `showCommandPalette = true`, triggering a rebuild.
3. The rebuild produces a `Stack` containing `mainContent` and a `Positioned` overlay widget.
4. The overlay widget (e.g., `CommandPalette`) wraps its content in `FocusScope({ autofocus: true })`.
5. During `FocusScopeState.initState()`, a microtask calls `effectiveFocusNode.requestFocus()`.
6. `FocusNode.requestFocus()` calls `current._clearPrimaryFocus()` on the previously focused node (the input area's TextField FocusNode), then sets `_hasPrimaryFocus = true` on the overlay's node.

At this point, the focus tree looks like:

```
FocusManager.rootScope
  +-- App FocusScope (root onKey handler)
  |     +-- [mainContent subtree]
  |     |     +-- TextField FocusScope  <-- was focused, now unfocused
  |     +-- Overlay FocusScope          <-- now has primary focus
  |           +-- SelectionList FocusScope  <-- actually holds primaryFocus
```

### 2.2 The Double-Autofocus Chain

A critical detail: each overlay has **two** nested autofocus FocusScope widgets. Taking CommandPalette as an example (lines 50-76 of `command-palette.ts`):

```
CommandPalette.build() ->
  FocusScope({ autofocus: true })        [outer -- CommandPalette level]
    -> Column -> Container -> Column ->
       SelectionList.build() ->
         FocusScope({ autofocus: true })  [inner -- SelectionList level]
           -> Column (item rows)
```

The `SelectionList` widget (`selection-list.ts`, line 241) wraps its content in its own `FocusScope({ autofocus: true })` for key handling. Both FocusScopes fire `queueMicrotask(() => requestFocus())` during their respective `initState()` calls. The inner one fires second (because inner widgets initialize after outer ones in the element tree mount order), so the `SelectionList`'s FocusNode ends up as the final `primaryFocus` holder.

This means when focus is stolen during overlay open, the history stack will record:

```
Microtask 1 (outer FocusScope autofocus):
  - current primaryFocus = TextField node
  - pushHistory(TextField node)
  - outer FocusScope node gets primaryFocus

Microtask 2 (inner SelectionList FocusScope autofocus):
  - current primaryFocus = outer FocusScope node
  - pushHistory(outer FocusScope node)
  - SelectionList FocusScope node gets primaryFocus
```

Result: history = `[TextField, outer FocusScope node]`.

When the overlay is dismissed and we call `restoreFocus()`, it pops `outer FocusScope node` first -- but that node is being disposed at the same time (it belongs to the overlay). The `restoreFocus()` implementation must handle this by skipping disposed/detached nodes and falling through to `TextField`, which is the correct target.

### 2.3 Focus Flow When an Overlay Closes

When the overlay is dismissed:

1. Callback fires (e.g., `onDismiss` calls `setState(() => { this.showCommandPalette = false; })`).
2. Rebuild removes the `Stack`+`Positioned`+overlay branch from the widget tree.
3. The overlay's `FocusScopeState.dispose()` runs (both inner and outer), which:
   - Removes the focus change listener from the effective FocusNode (`focus-scope.ts` line 145)
   - Calls `FocusManager.instance.unregisterNode(effectiveFocusNode)` which calls `detach()` (`focus-scope.ts` line 148)
   - `detach()` calls `_clearPrimaryFocus()` if the node had focus (`focus.ts` lines 137-139)
   - Disposes the owned FocusNode (`focus-scope.ts` lines 151-154)

After step 3, `FocusManager.primaryFocus` is `null`. No code requests focus on any other node.

### 2.4 The FocusScopeNode._focusedChild Tracker

`FocusScopeNode` tracks its most recently focused child via `_focusedChild` (set by `_updateScopeFocusedChild()` during `requestFocus()` at `focus.ts` lines 328-337). This mechanism exists precisely to support scope-level focus restoration, as noted in `amp-src-analysis-17.md`:

> Extends FocusNode with a `_focusedChild` tracker. It records which descendant most recently received focus, enabling scope-level focus restoration.

However, this tracker is **never read** for restoration purposes. The `focusedChild` getter exists but nobody calls it after an overlay dismissal to restore focus to the previous holder.

### 2.5 Where Focus Should Return

In the flitter-amp application, the primary focus target is always the input area's TextField. The InputArea widget (`input-area.ts` line 113) creates a `TextField({ autofocus: true })`. The focus tree has this hierarchy:

```
rootScope (FocusScopeNode)
  +-- App FocusScope node
        +-- TextField FocusScope node  <-- should get focus back
        +-- [overlay node, when present, removed on dismiss]
```

When the App-level `FocusScopeNode`'s child overlay is removed, `_focusedChild` still points to the overlay's now-disposed node. This stale reference prevents even manual attempts to use `focusedChild` for restoration.

### 2.6 Exact Code Locations of Overlay Dismissal

Eight distinct code paths dismiss overlays in `app.ts`:

| # | Trigger | Code Location | Overlay | Mechanism |
|---|---------|---------------|---------|-----------|
| 1 | Escape key | `app.ts` line 148 | FilePicker | `setState(() => showFilePicker = false)` |
| 2 | Escape key | `app.ts` line 152 | CommandPalette | `setState(() => showCommandPalette = false)` |
| 3 | Escape key | `app.ts` line 155 | PermissionDialog | `appState.resolvePermission(null)` |
| 4 | Execute command | `app.ts` line 309 | CommandPalette | `setState` + execute command |
| 5 | Dismiss callback | `app.ts` line 323 | CommandPalette | `setState(() => showCommandPalette = false)` |
| 6 | Select permission | `app.ts` line 288 | PermissionDialog | `appState.resolvePermission(optionId)` |
| 7 | Select file | `app.ts` line 340 | FilePicker | `setState(() => showFilePicker = false)` |
| 8 | Dismiss callback | `app.ts` line 344 | FilePicker | `setState(() => showFilePicker = false)` |

None of these paths include any focus restoration logic.

---

## 3. Impact Assessment

### 3.1 User-Facing Symptoms

- After dismissing the CommandPalette (Ctrl+O then Escape), the user cannot type in the input area until they press Tab or click.
- After the PermissionDialog auto-resolves (user selects an option), keyboard input to the TextField stops working.
- After dismissing the FilePicker, same behavior.

### 3.2 Severity

This is a **high-severity UX regression** because every overlay interaction leaves the application in a broken keyboard state. In a terminal TUI where the mouse is a secondary interaction mechanism, losing keyboard focus is functionally equivalent to the application becoming unresponsive.

### 3.3 Frequency

Every single overlay open/close cycle triggers this bug. With the PermissionDialog potentially appearing dozens of times per session (each tool call may require permission), the cumulative impact is significant.

---

## 4. Proposed Solution

The solution has two layers: a **core-level** focus history mechanism on `FocusManager` that tracks the previously focused node, and an **app-level** integration that uses this mechanism when overlays close.

### 4.1 Layer 1: FocusManager Focus History (flitter-core)

Add a focus history stack to `FocusManager` that records the previously focused node whenever focus changes. This is a minimal, non-breaking change.

#### 4.1.1 Changes to `FocusManager`

```typescript
// In: flitter-core/src/input/focus.ts -- FocusManager class

export class FocusManager {
  // ... existing fields ...

  /**
   * Stack of previously focused nodes. When a node receives focus,
   * the previously focused node is pushed onto this stack. When
   * restoreFocus() is called, the top of the stack is popped and
   * re-focused (if still valid).
   *
   * The stack is bounded to prevent unbounded growth. A depth of 8
   * handles any realistic overlay nesting scenario (e.g., toast on
   * top of confirmation on top of permission dialog on top of the
   * main input).
   */
  private _focusHistory: FocusNode[] = [];
  private static readonly MAX_FOCUS_HISTORY = 8;

  /**
   * Called internally when a node gains primary focus. Records the
   * previously focused node in the history stack.
   */
  _pushFocusHistory(previousNode: FocusNode): void {
    if (previousNode.disposed) return;
    this._focusHistory.push(previousNode);
    // Trim if over capacity
    if (this._focusHistory.length > FocusManager.MAX_FOCUS_HISTORY) {
      this._focusHistory.shift();
    }
  }

  /**
   * Restore focus to the most recent valid node in the history stack.
   * Walks backward through the stack, skipping disposed or detached
   * nodes, until it finds one that can accept focus. Returns true if
   * focus was restored, false if the stack was exhausted.
   *
   * This is the primary API for focus restoration after overlay
   * dismissal.
   */
  restoreFocus(): boolean {
    while (this._focusHistory.length > 0) {
      const candidate = this._focusHistory.pop()!;
      // Skip disposed nodes (e.g., a previous overlay that was also dismissed)
      if (candidate.disposed) continue;
      // Skip nodes no longer in the tree (detached from parent)
      if (candidate.parent === null && candidate !== this.rootScope) continue;
      // Skip nodes that can no longer accept focus
      if (!candidate.canRequestFocus) continue;
      // Valid candidate -- restore focus
      candidate.requestFocus();
      return true;
    }
    return false;
  }

  /**
   * Clear the focus history stack. Called during reset() for testing
   * and when the focus tree is fundamentally restructured.
   */
  clearFocusHistory(): void {
    this._focusHistory.length = 0;
  }

  /**
   * Peek at the top of the focus history without removing it.
   * Returns null if the stack is empty or all entries are stale.
   * Useful for debugging and testing.
   */
  get previousFocus(): FocusNode | null {
    for (let i = this._focusHistory.length - 1; i >= 0; i--) {
      const node = this._focusHistory[i];
      if (!node.disposed && node.parent !== null) return node;
    }
    return null;
  }

  // ... existing methods ...

  /** Reset the singleton (for testing). */
  static reset(): void {
    if (FocusManager._instance !== null) {
      FocusManager._instance.clearFocusHistory();
      FocusManager._instance.rootScope.dispose();
      FocusManager._instance = null;
    }
  }
}
```

#### 4.1.2 Changes to `FocusNode.requestFocus()`

The `requestFocus()` method must push the current focus holder onto the history stack before clearing it:

```typescript
// In: flitter-core/src/input/focus.ts -- FocusNode class

requestFocus(): void {
  if (!this._canRequestFocus) return;
  if (this._disposed) return;

  const manager = FocusManager.instance;

  // Clear existing primary focus -- push previous node to history
  const current = manager.primaryFocus;
  if (current !== null && current !== this) {
    // Record the outgoing focus holder in the history stack
    manager._pushFocusHistory(current);
    current._clearPrimaryFocus();
  }

  // Set this node as primary focus
  this._hasPrimaryFocus = true;

  // Update FocusScopeNode tracking
  this._updateScopeFocusedChild();

  // Notify listeners on this node and ancestors
  this._notifyListenersUpTree();
}
```

This is the only change to `FocusNode`. The `_pushFocusHistory` call is added before `_clearPrimaryFocus`, ensuring the history records the node while it is still valid.

#### 4.1.3 Preventing Self-Push on Redundant requestFocus() Calls

The guard `current !== this` in `requestFocus()` (already present at `focus.ts` line 158) ensures that calling `requestFocus()` on the already-focused node does not push it onto its own history. This is important because `restoreFocus()` itself calls `requestFocus()` on the candidate -- without this guard, the act of restoring would push the restored node onto the history, creating an infinite restore loop.

The call chain during restoration:
```
restoreFocus()
  -> candidate.requestFocus()
    -> manager.primaryFocus  // null (overlay was disposed)
    -> current is null, so _pushFocusHistory is NOT called
    -> candidate._hasPrimaryFocus = true
```

If there was a still-active primaryFocus when `restoreFocus()` runs (possible if microtask timing is skewed), the guard `current !== this` still prevents self-push because `candidate !== candidate` is always false.

### 4.2 Layer 2: App-Level Integration (flitter-amp)

The `AppStateWidget` in `app.ts` must call `FocusManager.instance.restoreFocus()` whenever an overlay is dismissed.

#### 4.2.1 Import Addition

```typescript
// In: flitter-amp/src/app.ts -- add to existing imports
import { FocusManager } from 'flitter-core/src/input/focus';
```

#### 4.2.2 Helper Method to Reduce Duplication

To consolidate the restoration logic across all eight dismissal points:

```typescript
// In: AppStateWidget class

/**
 * Dismiss an overlay and schedule focus restoration.
 * The restoration runs as a microtask to ensure the overlay's
 * FocusNode is fully disposed before we attempt to re-focus
 * the previous holder.
 */
private dismissOverlayAndRestoreFocus(dismiss: () => void): void {
  this.setState(dismiss);
  queueMicrotask(() => FocusManager.instance.restoreFocus());
}
```

#### 4.2.3 Overlay Dismissal Points (All Eight)

**Point 1 -- Escape dismisses FilePicker (line 148):**
```typescript
if (this.showFilePicker) {
  this.dismissOverlayAndRestoreFocus(() => { this.showFilePicker = false; });
  return 'handled';
}
```

**Point 2 -- Escape dismisses CommandPalette (line 152):**
```typescript
if (this.showCommandPalette) {
  this.dismissOverlayAndRestoreFocus(() => { this.showCommandPalette = false; });
  return 'handled';
}
```

**Point 3 -- Escape dismisses PermissionDialog (line 155-156):**
```typescript
if (appState.hasPendingPermission) {
  appState.resolvePermission(null);
  queueMicrotask(() => FocusManager.instance.restoreFocus());
  return 'handled';
}
```

**Point 4 -- CommandPalette.onExecute callback (line 309):**
```typescript
onExecute: (command: string) => {
  this.dismissOverlayAndRestoreFocus(() => { this.showCommandPalette = false; });
  switch (command) { /* ... */ }
},
```

**Point 5 -- CommandPalette.onDismiss callback (line 323):**
```typescript
onDismiss: () => {
  this.dismissOverlayAndRestoreFocus(() => { this.showCommandPalette = false; });
},
```

**Point 6 -- PermissionDialog.onSelect callback (line 288):**
```typescript
onSelect: (optionId: string) => {
  appState.resolvePermission(optionId);
  queueMicrotask(() => FocusManager.instance.restoreFocus());
},
```

**Point 7 -- FilePicker.onSelect callback (line 340):**
```typescript
onSelect: (_filePath: string) => {
  this.dismissOverlayAndRestoreFocus(() => { this.showFilePicker = false; });
  // TODO: insert @filePath into InputArea text when controller is exposed
},
```

**Point 8 -- FilePicker.onDismiss callback (line 344):**
```typescript
onDismiss: () => {
  this.dismissOverlayAndRestoreFocus(() => { this.showFilePicker = false; });
},
```

#### 4.2.4 Why `queueMicrotask`

The `restoreFocus()` call is wrapped in `queueMicrotask()` because:

1. The `setState()` call triggers a rebuild, which will dispose the overlay's `FocusScopeState`, which will `unregisterNode` and `dispose` the overlay's FocusNode.
2. The disposal happens during the build/reconciliation phase, which runs after the current synchronous code completes and the frame scheduler fires.
3. We need the overlay's FocusNode to be fully removed from the tree before we attempt to restore focus to the previous holder.
4. `queueMicrotask` schedules the restoration after the current microtask queue (including the FocusScope's own `autofocus` microtask), ensuring proper sequencing.

This mirrors the same pattern used by `FocusScopeState.initState()` for autofocus, which also uses `queueMicrotask` (line 108 of `focus-scope.ts`).

#### 4.2.5 Detailed Microtask Timing Analysis

The precise ordering of events during overlay dismissal:

```
1. [sync] onDismiss callback fires
2. [sync] setState(() => { this.showCommandPalette = false })
3. [sync] setState calls markNeedsRebuild() -> scheduleBuildFor() -> requestFrame()
4. [sync] queueMicrotask(() => FocusManager.instance.restoreFocus())
5. [sync] return 'handled' -- handler completes

--- microtask checkpoint ---

6. [microtask] Frame scheduler fires buildScopes()
7. [microtask] Reconciliation removes overlay Element subtree
8. [microtask] FocusScopeState.dispose() runs on both overlay FocusScopes:
   a. inner SelectionList FocusScope: unregisterNode, detach, _clearPrimaryFocus, dispose
   b. outer CommandPalette FocusScope: unregisterNode, detach, dispose
9. [microtask] primaryFocus is now null
10. [microtask] restoreFocus() fires:
    a. pops outer CommandPalette FocusScope node -- DISPOSED, skip
    b. pops TextField FocusScope node -- VALID, requestFocus()
11. [microtask] TextField has primaryFocus again
```

The key insight is that step 6-9 (the frame/build/dispose pipeline) and step 10 (restoration) are both microtasks. The `queueMicrotask` in step 4 schedules the restoration callback at the end of the current microtask queue. Whether it fires before or after step 6-9 depends on whether the frame scheduler uses `queueMicrotask` or `setTimeout`. If the frame scheduler uses `queueMicrotask`, steps 6-9 may fire before step 10, which is the desired order. If the frame scheduler uses `setTimeout` (macrotask), step 10 fires before steps 6-9.

**Mitigation**: The `restoreFocus()` implementation is robust against both orderings because it checks `disposed` and `parent === null` on each candidate. If the overlay's FocusNode has not yet been disposed (step 10 fires before step 8), `restoreFocus()` would pop it and attempt to focus it -- but the node is about to be disposed. To handle this edge case, we should use `setTimeout(callback, 0)` instead of `queueMicrotask()` to guarantee the restoration runs after the frame pipeline completes.

**Recommended approach**: Use `setTimeout(() => FocusManager.instance.restoreFocus(), 0)` rather than `queueMicrotask()`. This ensures the frame pipeline (which typically runs on the microtask queue) completes before focus restoration is attempted. The trade-off is a single extra event loop tick of delay, which is imperceptible to the user.

Updated helper:
```typescript
private dismissOverlayAndRestoreFocus(dismiss: () => void): void {
  this.setState(dismiss);
  setTimeout(() => FocusManager.instance.restoreFocus(), 0);
}
```

---

## 5. FocusScopeNode._focusedChild Staleness Fix

### 5.1 The Problem

When a FocusNode is detached from the focus tree (via `detach()` in `focus.ts` line 130), the `_focusedChild` reference in its parent `FocusScopeNode` is not cleared. This means:

1. Overlay opens, SelectionList's FocusNode becomes `_focusedChild` of the App-level FocusScopeNode.
2. Overlay closes, SelectionList's FocusNode is detached and disposed.
3. App-level FocusScopeNode still has `_focusedChild` pointing to the disposed node.

This is a pre-existing bug unrelated to the focus restoration proposal, but it should be addressed as a companion fix.

### 5.2 Proposed Fix

Add a `_focusedChild` cleanup step to `FocusNode.detach()`:

```typescript
// In: FocusNode.detach()
detach(): void {
  if (this._parent === null) return;

  // Clean up _focusedChild references in ancestor FocusScopeNodes
  let ancestor: FocusNode | null = this._parent;
  while (ancestor !== null) {
    if (ancestor instanceof FocusScopeNode) {
      if (ancestor._focusedChild === this) {
        ancestor._setFocusedChild(null as any);
      }
      break; // only need to check the nearest scope
    }
    ancestor = ancestor.parent;
  }

  const idx = this._parent._children.indexOf(this);
  if (idx !== -1) {
    this._parent._children.splice(idx, 1);
  }
  // If this node had primary focus, clear it
  if (this._hasPrimaryFocus) {
    this._clearPrimaryFocus();
  }
  this._parent = null;
}
```

This requires modifying `FocusScopeNode._setFocusedChild()` to accept `null`:

```typescript
// In: FocusScopeNode
_setFocusedChild(node: FocusNode | null): void {
  this._focusedChild = node;
}
```

### 5.3 Why This Matters

While the focus history stack sidesteps the stale `_focusedChild` issue for restoration purposes, other parts of the system (future Tab navigation within a scope, accessibility tools, debug overlays) may query `focusedChild` and get a disposed reference. Cleaning it up defensively is the right practice.

---

## 6. Edge Cases and Robustness

### 6.1 Stale Node References in the History Stack

The `restoreFocus()` method explicitly handles stale nodes by checking `disposed`, `parent === null`, and `canRequestFocus` before attempting restoration. If the target node was removed from the tree between focus capture and restoration, it is skipped and the next history entry is tried.

### 6.2 Nested Overlay Dismissal

If overlays are stacked (e.g., a future confirmation dialog on top of a permission dialog), dismissing the top overlay should restore focus to the second overlay, not to the original input area. The stack-based history handles this naturally:

```
History: [TextField, PermissionDialog.SelectionList]
         ^-- pushed when PermissionDialog opened
                                    ^-- pushed when ConfirmDialog opened

Dismiss ConfirmDialog -> restoreFocus() pops PermissionDialog.SelectionList
Dismiss PermissionDialog -> restoreFocus() pops TextField
```

### 6.3 Rapid Open/Close Cycles

If the user rapidly opens and closes overlays (e.g., Ctrl+O then Escape in quick succession), the microtask-based restoration may interleave with the FocusScope's autofocus microtask. The design handles this because:

- `requestFocus()` always pushes the current focus holder before clearing it.
- `restoreFocus()` always pops the most recent valid entry.
- If an autofocus microtask fires after a restoration microtask, the autofocus will push the just-restored node back onto the history, maintaining the correct chain.

### 6.4 Focus History Overflow

The history stack is bounded to 8 entries. In the unlikely scenario of deep nesting beyond 8 levels, the oldest history entry is evicted. This means restoring from an extremely deep overlay stack might not reach the original focus target. A depth of 8 is more than sufficient for any realistic TUI overlay scenario.

### 6.5 No Overlay Open -- Focus History is Empty

If `restoreFocus()` is called when no overlays have been opened (empty history), it returns `false` and no focus change occurs. This is safe and idempotent.

### 6.6 FocusScopeNode._focusedChild Staleness

The existing `_focusedChild` on `FocusScopeNode` may hold a reference to a disposed overlay node after dismissal. This is addressed in Section 5. The proposed focus history stack sidesteps it entirely by maintaining its own validated stack rather than relying on scope-level tracking.

### 6.7 Double-Restore Protection

If `restoreFocus()` is called twice (e.g., both the Escape handler and an `onDismiss` callback fire for the same overlay), the second call will either:
- Pop a valid entry and focus it (no harm -- just an extra focus transition).
- Find the history empty and return `false` (no-op).

Neither scenario causes issues. To prevent unnecessary focus churn, the helper method could add a guard:

```typescript
private _restorePending = false;

private dismissOverlayAndRestoreFocus(dismiss: () => void): void {
  this.setState(dismiss);
  if (!this._restorePending) {
    this._restorePending = true;
    setTimeout(() => {
      this._restorePending = false;
      FocusManager.instance.restoreFocus();
    }, 0);
  }
}
```

### 6.8 PermissionDialog Driven by External State

The PermissionDialog's visibility is driven by `AppState.hasPendingPermission`, not by a local boolean. When `resolvePermission()` is called, it clears the pending state, which triggers a rebuild that removes the overlay. The restoration call is placed immediately after `resolvePermission()` in the callback, ensuring it fires regardless of whether the `AppState` listener triggers synchronously or asynchronously.

---

## 7. Relationship to Other Gap Documents

### Gap U05 / Gap 27 (Overlay Manager)

The overlay manager proposal (gap 27) introduces a centralized `OverlayManager` class with `show()`, `dismiss()`, and `dismissTop()` methods. Focus restoration integrates cleanly with that design: the `OverlayManager.dismiss()` and `dismissTop()` methods would call `setTimeout(() => FocusManager.instance.restoreFocus(), 0)` as part of their dismissal logic, consolidating the eight manual call sites into two or three inside the manager. This makes focus restoration automatic for any overlay managed through the system.

```typescript
// Future integration with OverlayManager:
dismiss(id: string): void {
  const prevLength = this.entries.length;
  this.entries = this.entries.filter((e) => e.id !== id);
  if (this.entries.length !== prevLength) {
    this.notifyListeners();
    // Automatic focus restoration on overlay dismissal
    setTimeout(() => FocusManager.instance.restoreFocus(), 0);
  }
}

dismissTop(): string | null {
  if (this.entries.length === 0) return null;
  const top = this.entries[this.entries.length - 1];
  this.entries = this.entries.slice(0, -1);
  this.notifyListeners();
  // Automatic focus restoration on overlay dismissal
  setTimeout(() => FocusManager.instance.restoreFocus(), 0);
  return top.id;
}
```

With this integration, the 8 manual restoration call sites in `app.ts` collapse to 0. All overlays managed through the OverlayManager get focus restoration for free.

### Gap 23 (Shortcut Help Overlay)

The shortcut help overlay will be another modal that steals and should restore focus. With this proposal implemented, the shortcut help overlay gets focus restoration for free -- no additional wiring needed beyond using `FocusScope({ autofocus: true })` in the overlay widget (which it already would).

### Gap 26 (Dialog Class)

The `Dialog` data class and `DialogOverlay` widget proposed in gap 26 would benefit from automatic focus restoration. The dialog's `onConfirm`/`onCancel` callbacks would follow the same pattern as the existing overlays.

---

## 8. Testing Strategy

### 8.1 Unit Tests for FocusManager Focus History

```typescript
// File: flitter-core/src/input/__tests__/focus-restoration.test.ts

import { FocusNode, FocusScopeNode, FocusManager } from '../focus';

describe('FocusManager focus history', () => {
  beforeEach(() => FocusManager.reset());

  test('requestFocus pushes previous focus onto history', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);

    nodeA.requestFocus();
    expect(mgr.primaryFocus).toBe(nodeA);
    expect(mgr.previousFocus).toBeNull(); // no previous

    nodeB.requestFocus();
    expect(mgr.primaryFocus).toBe(nodeB);
    expect(mgr.previousFocus).toBe(nodeA);
  });

  test('restoreFocus pops history and re-focuses previous node', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);

    nodeA.requestFocus();
    nodeB.requestFocus();

    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  test('restoreFocus skips disposed nodes', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    const nodeC = new FocusNode({ debugLabel: 'C' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);
    mgr.registerNode(nodeC, null);

    nodeA.requestFocus();
    nodeB.requestFocus();
    nodeC.requestFocus();

    // Dispose nodeB (simulating overlay removal)
    nodeB.dispose();

    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    // nodeB was skipped, nodeA was restored
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  test('restoreFocus skips detached nodes', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    const nodeC = new FocusNode({ debugLabel: 'C' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);
    mgr.registerNode(nodeC, null);

    nodeA.requestFocus();
    nodeB.requestFocus();
    nodeC.requestFocus();

    // Detach nodeB without disposing (parent set to null)
    nodeB.detach();

    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  test('restoreFocus skips nodes that can no longer accept focus', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    const nodeC = new FocusNode({ debugLabel: 'C' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);
    mgr.registerNode(nodeC, null);

    nodeA.requestFocus();
    nodeB.requestFocus();
    nodeC.requestFocus();

    // Disable focus on nodeB
    nodeB.canRequestFocus = false;

    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  test('restoreFocus returns false when history is exhausted', () => {
    const mgr = FocusManager.instance;
    expect(mgr.restoreFocus()).toBe(false);
  });

  test('nested overlay dismissal restores in correct order', () => {
    const mgr = FocusManager.instance;
    const input = new FocusNode({ debugLabel: 'input' });
    const overlay1 = new FocusNode({ debugLabel: 'overlay1' });
    const overlay2 = new FocusNode({ debugLabel: 'overlay2' });
    mgr.registerNode(input, null);
    mgr.registerNode(overlay1, null);
    mgr.registerNode(overlay2, null);

    input.requestFocus();    // history: []
    overlay1.requestFocus(); // history: [input]
    overlay2.requestFocus(); // history: [input, overlay1]

    mgr.restoreFocus();      // -> overlay1 focused
    expect(mgr.primaryFocus).toBe(overlay1);

    mgr.restoreFocus();      // -> input focused
    expect(mgr.primaryFocus).toBe(input);
  });

  test('history is bounded to MAX_FOCUS_HISTORY entries', () => {
    const mgr = FocusManager.instance;
    const nodes: FocusNode[] = [];
    for (let i = 0; i < 12; i++) {
      const node = new FocusNode({ debugLabel: `node-${i}` });
      mgr.registerNode(node, null);
      nodes.push(node);
    }
    // Focus each node in sequence (pushes 11 history entries)
    for (const node of nodes) {
      node.requestFocus();
    }
    // Stack should be bounded, oldest entries evicted
    let restoreCount = 0;
    while (mgr.restoreFocus()) restoreCount++;
    expect(restoreCount).toBeLessThanOrEqual(8);
  });

  test('clearFocusHistory empties the stack', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);
    nodeA.requestFocus();
    nodeB.requestFocus();

    mgr.clearFocusHistory();
    expect(mgr.previousFocus).toBeNull();
    expect(mgr.restoreFocus()).toBe(false);
  });

  test('self-requestFocus does not push to history', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    mgr.registerNode(nodeA, null);

    nodeA.requestFocus();
    nodeA.requestFocus(); // redundant call

    expect(mgr.previousFocus).toBeNull();
  });

  test('previousFocus peek does not modify the stack', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);

    nodeA.requestFocus();
    nodeB.requestFocus();

    // Peek twice -- should return the same node
    expect(mgr.previousFocus).toBe(nodeA);
    expect(mgr.previousFocus).toBe(nodeA);

    // Stack should still have the entry
    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    expect(mgr.primaryFocus).toBe(nodeA);
  });

  test('double-autofocus overlay produces correct history', () => {
    // Simulates the CommandPalette pattern: outer FocusScope + inner
    // SelectionList FocusScope, both with autofocus.
    const mgr = FocusManager.instance;
    const inputNode = new FocusNode({ debugLabel: 'TextField' });
    const outerOverlay = new FocusNode({ debugLabel: 'CommandPalette.FocusScope' });
    const innerOverlay = new FocusNode({ debugLabel: 'SelectionList.FocusScope' });
    mgr.registerNode(inputNode, null);
    mgr.registerNode(outerOverlay, null);
    mgr.registerNode(innerOverlay, null);

    // Step 1: TextField has focus
    inputNode.requestFocus();

    // Step 2: Outer overlay autofocus fires (microtask 1)
    outerOverlay.requestFocus();
    // History: [inputNode]

    // Step 3: Inner overlay autofocus fires (microtask 2)
    innerOverlay.requestFocus();
    // History: [inputNode, outerOverlay]

    // Overlay closes: both nodes disposed
    innerOverlay.dispose();
    outerOverlay.dispose();

    // restoreFocus should skip disposed outerOverlay, restore to inputNode
    const restored = mgr.restoreFocus();
    expect(restored).toBe(true);
    expect(mgr.primaryFocus).toBe(inputNode);
  });

  test('reset clears focus history', () => {
    const mgr = FocusManager.instance;
    const nodeA = new FocusNode({ debugLabel: 'A' });
    const nodeB = new FocusNode({ debugLabel: 'B' });
    mgr.registerNode(nodeA, null);
    mgr.registerNode(nodeB, null);
    nodeA.requestFocus();
    nodeB.requestFocus();

    FocusManager.reset();

    const newMgr = FocusManager.instance;
    expect(newMgr.previousFocus).toBeNull();
    expect(newMgr.restoreFocus()).toBe(false);
  });
});
```

### 8.2 Integration Test for Overlay Focus Restoration

```typescript
// File: flitter-amp/src/__tests__/focus-restoration-integration.test.ts

describe('overlay focus restoration', () => {
  test('CommandPalette dismiss restores focus to input area', async () => {
    // 1. Render the App widget with a WidgetTester
    // 2. Verify the input area (TextField) has primary focus
    // 3. Send Ctrl+O to open CommandPalette
    // 4. Pump microtasks to process autofocus
    // 5. Verify CommandPalette's SelectionList has primary focus
    // 6. Send Escape to dismiss CommandPalette
    // 7. Advance event loop (setTimeout(0)) to process restoration
    // 8. Verify the input area has primary focus again
  });

  test('PermissionDialog resolve restores focus to input area', async () => {
    // 1. Render the App widget
    // 2. Trigger a permission request on AppState
    // 3. Pump microtasks
    // 4. Verify PermissionDialog's SelectionList has focus
    // 5. Select an option (Enter on first item)
    // 6. Advance event loop
    // 7. Verify the input area has primary focus again
  });

  test('FilePicker dismiss restores focus to input area', async () => {
    // 1. Render the App widget with fileList populated
    // 2. Trigger file picker open
    // 3. Pump microtasks
    // 4. Verify FilePicker's SelectionList has focus
    // 5. Send Escape to dismiss FilePicker
    // 6. Advance event loop
    // 7. Verify the input area has primary focus again
  });

  test('rapid open/close does not corrupt focus state', async () => {
    // 1. Render the App widget
    // 2. Send Ctrl+O (open CommandPalette)
    // 3. Immediately send Escape (dismiss)
    // 4. Send Ctrl+O again (re-open)
    // 5. Advance event loop to settle microtasks
    // 6. Verify CommandPalette's SelectionList has focus
    // 7. Send Escape (dismiss)
    // 8. Advance event loop
    // 9. Verify TextField has focus
  });
});
```

### 8.3 Manual Testing Checklist

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| CommandPalette cycle | Ctrl+O, Escape | TextField regains focus; typing works |
| CommandPalette execute | Ctrl+O, Enter (select command) | Command executes; TextField regains focus |
| PermissionDialog cycle | Trigger permission, select option | TextField regains focus |
| PermissionDialog cancel | Trigger permission, Escape | TextField regains focus |
| FilePicker cycle | Trigger file picker, Escape | TextField regains focus |
| FilePicker select | Trigger file picker, Enter | File selected; TextField regains focus |
| Rapid Ctrl+O / Escape | Ctrl+O, Escape, Ctrl+O, Escape (fast) | No focus loss; TextField regains focus |
| No overlay dismissal | Start app, just type | No change in behavior; focus stays on TextField |

---

## 9. Implementation Plan

### Step 1: Add focus history to FocusManager (flitter-core)

- File: `/home/gem/workspace/flitter/packages/flitter-core/src/input/focus.ts`
- Add: `_focusHistory` array, `_pushFocusHistory()`, `restoreFocus()`, `clearFocusHistory()`, `previousFocus` getter
- Modify: `FocusNode.requestFocus()` to push previous focus holder (1 line insertion)
- Modify: `FocusManager.reset()` to clear focus history (1 line insertion)
- Estimated: ~50 lines added, 3 lines modified

### Step 2: Fix FocusScopeNode._focusedChild staleness (flitter-core)

- File: `/home/gem/workspace/flitter/packages/flitter-core/src/input/focus.ts`
- Modify: `FocusNode.detach()` to clean up ancestor `FocusScopeNode._focusedChild` references
- Modify: `FocusScopeNode._setFocusedChild()` to accept `null`
- Estimated: ~10 lines added, 1 line modified

### Step 3: Write unit tests for focus history (flitter-core)

- File: `/home/gem/workspace/flitter/packages/flitter-core/src/input/__tests__/focus-restoration.test.ts`
- Tests: push on requestFocus, restoreFocus pops correctly, skip disposed, skip detached, skip non-focusable, bounded history, nested overlays, empty stack, clearFocusHistory, self-requestFocus, previousFocus peek, double-autofocus, reset
- Estimated: ~200 lines

### Step 4: Add restoration calls to overlay dismissal in app.ts (flitter-amp)

- File: `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts`
- Add: `import { FocusManager }` and `dismissOverlayAndRestoreFocus` helper method
- Modify: All 8 overlay dismissal points to use the helper or direct `setTimeout(() => FocusManager.instance.restoreFocus(), 0)` calls
- Estimated: ~15 lines added, 8 lines modified

### Step 5: Integration tests (flitter-amp)

- File: `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/focus-restoration-integration.test.ts`
- Tests: CommandPalette open/close cycle, PermissionDialog resolve cycle, FilePicker dismiss cycle, rapid open/close
- Estimated: ~80 lines

### Step 6: Verify no regressions

- Run existing focus system unit tests in `flitter-core/src/input/__tests__/focus.test.ts`
- Run existing app layout tests in `flitter-amp/src/__tests__/`
- Verify Tab/Shift+Tab traversal still works correctly
- Verify overlay key handling (SelectionList navigation) is unaffected

### Total estimated scope: ~350 lines added/modified across 5 files

---

## 10. Alternatives Considered

### 10.1 Automatic Restoration in FocusNode.dispose()

Instead of explicit `restoreFocus()` calls at each dismissal point, the `FocusNode.dispose()` method could automatically call `FocusManager.instance.restoreFocus()` when a focused node is disposed. This would make restoration fully automatic.

**Rejected because:**
- `dispose()` runs during the element reconciliation phase, and calling `requestFocus()` from within `dispose()` can trigger listener callbacks and rebuilds during an ongoing build, which is undefined behavior in the widget framework.
- Not all `FocusNode` disposals should trigger restoration (e.g., a tab navigation target being removed should not restore to the previous tab target).
- Explicit control at the dismissal site is safer and more predictable.

### 10.2 FocusScopeNode-Based Restoration

Instead of a global history stack, each `FocusScopeNode` could restore its `_focusedChild` when the currently focused child within its scope is removed. This mirrors what Flutter's `FocusScopeNode` does.

**Partially viable but insufficient because:**
- The overlay's FocusScope is a **sibling** of the input area's FocusScope, not a parent. When the overlay scope is removed, its parent (the App FocusScope) does not automatically know to re-focus its other child.
- The App-level `FocusScopeNode` does track `_focusedChild`, but after the overlay is disposed, `_focusedChild` points to a disposed node. The scope would need to maintain a secondary "previous focused child" tracker, which is essentially the same as the proposed history stack but scoped per-node instead of global.
- The global history stack is simpler, handles cross-scope restoration, and does not require changes to the `FocusScopeNode` class beyond the staleness fix in Section 5.

### 10.3 onFocusChange Callback on FocusScope

The `FocusScope` widget already supports an `onFocusChange` callback. The App-level FocusScope could use this to detect when it loses focus (overlay steals it) and when it regains focus (overlay dismissed). On regain, it could manually focus the input area.

**Rejected because:**
- This requires the App widget to hold a reference to the input area's FocusNode, which currently is owned internally by the TextField/FocusScope. It would require threading a FocusNode up through the widget tree.
- The `onFocusChange` on the App's FocusScope fires when `hasFocus` changes on that node, but `hasFocus` is `true` even when a descendant (like the overlay) has focus, so it would not fire on overlay open/close.
- The approach is indirect and tightly couples the App to the input area's focus node.

### 10.4 Do Nothing -- Rely on Autofocus

The main FocusScope in `app.ts` (line 142) has `autofocus: true`. One could argue that when the overlay is removed and the widget tree is rebuilt, the autofocus should re-trigger.

**Does not work because:**
- `autofocus` only fires once during `initState()` (`focus-scope.ts` lines 107-113). It does not re-fire on rebuilds. The main FocusScope's `initState()` ran at app startup, long before any overlay was opened.
- Even if it re-fired, `autofocus` on the App FocusScope would focus the App scope node itself, not the nested TextField scope node.

### 10.5 Widget-Level FocusRestoration Widget

Introduce a new widget (e.g., `FocusRestorationScope`) that automatically saves/restores focus for its subtree. This is the Flutter `RestorationScope` pattern adapted for focus.

**Viable but over-engineered for current needs:**
- Would require a new widget class, new element type, and integration with the FocusScope lifecycle.
- The current application has exactly one focus restoration scenario (overlay dismiss -> input area). A widget-level abstraction is warranted when multiple independent subtrees need restoration (e.g., tab panels), which is not the case here.
- Can be considered as a future enhancement if the application grows more complex widget structures.

---

## 11. Public API Surface

### 11.1 New Public API on FocusManager

| Method/Property | Signature | Description |
|-----------------|-----------|-------------|
| `restoreFocus()` | `(): boolean` | Pop the focus history stack and focus the most recent valid node. Returns true if focus was restored, false if history was exhausted. |
| `clearFocusHistory()` | `(): void` | Clear the entire focus history stack. |
| `previousFocus` | `get: FocusNode \| null` | Peek at the most recent valid node in the history without popping. |

### 11.2 New Internal API on FocusManager

| Method | Signature | Description |
|--------|-----------|-------------|
| `_pushFocusHistory()` | `(node: FocusNode): void` | Push a node onto the focus history stack. Called internally by `FocusNode.requestFocus()`. |

### 11.3 Modified Internal API on FocusScopeNode

| Method | Change | Description |
|--------|--------|-------------|
| `_setFocusedChild()` | Accept `FocusNode \| null` instead of `FocusNode` | Allow clearing the tracked focused child when the child is detached. |

### 11.4 Backward Compatibility

All changes are additive. No existing public API signatures are modified. The `_pushFocusHistory()` call added to `FocusNode.requestFocus()` is invisible to callers. Existing code that never calls `restoreFocus()` will see no change in behavior -- the focus history stack simply accumulates harmlessly.

---

## 12. Files Referenced in This Analysis

| File | Role |
|------|------|
| `/home/gem/workspace/flitter/packages/flitter-core/src/input/focus.ts` | FocusNode, FocusScopeNode, FocusManager -- core focus system (513 lines) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/focus-scope.ts` | FocusScope StatefulWidget -- bridge between widget tree and focus tree (243 lines) |
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/selection-list.ts` | SelectionList with inner FocusScope autofocus (316 lines) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` | App widget with overlay management and 8 dismissal points (373 lines) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/permission-dialog.ts` | PermissionDialog overlay with FocusScope autofocus (119 lines) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/command-palette.ts` | CommandPalette overlay with FocusScope autofocus (89 lines) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/file-picker.ts` | FilePicker overlay with FocusScope autofocus (89 lines) |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/input-area.ts` | InputArea with TextField autofocus (line 113) |
| `/home/gem/workspace/flitter/.gap/27-overlay-manager.md` | Related gap: OverlayManager that would consolidate dismissal/restoration |
| `/home/gem/workspace/flitter/amp-src-analysis-39.md` | Analysis noting the missing focus restoration mechanism (line 278) |
| `/home/gem/workspace/flitter/amp-src-analysis-17.md` | Analysis noting FocusScopeNode._focusedChild for scope-level restoration (line 93) |
