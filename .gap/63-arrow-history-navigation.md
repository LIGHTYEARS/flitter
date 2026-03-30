# I01: No Up/Down Arrow History Navigation

## Status: Open
## Severity: Medium (UX gap, expected terminal behavior missing)
## Gap ID: 63
## Affected files:
- `packages/flitter-core/src/widgets/text-field.ts`
- `packages/flitter-amp/src/widgets/input-area.ts`
- `packages/flitter-amp/src/app.ts`
- `packages/flitter-amp/src/state/history.ts`

---

## 1. Problem Statement

In virtually every terminal application (bash, zsh, fish, Python REPL, Node REPL,
the real Amp CLI), pressing Up Arrow on an empty or single-line input field recalls
the previous command from history, and Down Arrow navigates forward through history.
This is the universally expected behavior for single-line prompt inputs.

In the current implementation, Up and Down arrows are handled exclusively as
multi-line cursor movement operations. When the input is a single-line text field
(as is the default in `InputArea` where `submitOnEnter: true` is set), the arrows
return `'ignored'` because the single-line branch has no multi-line movement to
perform:

```typescript
// text-field.ts lines 861-872
case 'ArrowUp':
  if (isMultiLine) {
    this._controller.moveCursorUp();
    return 'handled';
  }
  return 'ignored';
case 'ArrowDown':
  if (isMultiLine) {
    this._controller.moveCursorDown();
    return 'handled';
  }
  return 'ignored';
```

When `isMultiLine` is false (which it is for `InputArea` since `submitOnEnter: true`
implies single-line semantics), both arrow keys return `'ignored'`, and the event
bubbles up to the parent `FocusScope`. The parent `FocusScope` in `AppStateWidget`
(app.ts:142-206) does not handle ArrowUp/ArrowDown at all, so the key press is
silently discarded. The user gets no response -- no history navigation, no cursor
movement, nothing.

Even in multi-line mode, pressing Up when the cursor is already on the first line
(or Down on the last line) should ideally navigate history rather than being a no-op.
Currently, `moveCursorUp()` returns `false` when `lineIndex <= 0`, and the handler
still returns `'handled'`, swallowing the event even though nothing happened.

---

## 2. Root Cause Analysis

### 2.1 Single-Line Mode: Arrows Are Completely Dead

`InputArea` creates its `TextField` with `submitOnEnter: true` (input-area.ts:117),
which sets `isSingleLine` to false only if `maxLines` is explicitly set to 1. However,
with `submitOnEnter: true`, Enter submits rather than inserting a newline, making the
input functionally single-line even though `isSingleLine` may not be `true` in the
strict widget sense.

Looking at the actual code, `InputArea` does NOT pass `maxLines: 1`, so
`isSingleLine` returns `false` (it checks `this.maxLines === 1`). This means
`isMultiLine` is `true` in the key handler. However, the text is typically a single
line (no `\n` characters), so `moveCursorUp()` returns `false` because
`lines.length <= 1`. Despite the movement failing, the handler returns `'handled'`,
swallowing the event:

```typescript
case 'ArrowUp':
  if (isMultiLine) {
    this._controller.moveCursorUp();  // returns false -- no lines above
    return 'handled';                 // event consumed anyway
  }
  return 'ignored';
```

This is the core bug: the return value of `moveCursorUp()` / `moveCursorDown()` is
ignored, and the event is always consumed when `isMultiLine` is true, preventing it
from bubbling up to an ancestor that could use it for history navigation.

### 2.2 Multi-Line Mode: First/Last Line Are Dead Ends

When the user has typed a multi-line input (using Shift+Enter or Alt+Enter to insert
newlines), pressing Up on the first line or Down on the last line is a no-op.
`moveCursorUp()` returns `false` (line 326: `if (lineIndex <= 0) return false`) and
`moveCursorDown()` returns `false` (line 350: `if (lineIndex >= lines.length - 1)
return false`). But the handler still returns `'handled'`, eating the keystroke.

In a well-designed TUI (and in real Amp), the expected behavior when the cursor
is on the first line and the user presses Up is to navigate to the previous history
entry. Similarly, pressing Down on the last line should navigate forward. This is
the same convention used by multi-line REPLs like IPython and the Fish shell.

### 2.3 No History Handler for Arrow Keys Exists

The `AppStateWidget`'s `FocusScope` `onKey` handler (app.ts:142-206) handles
Ctrl+R for backward history, but has no handler for ArrowUp or ArrowDown. Even if
the events bubbled up correctly, there is no code to intercept them and perform
history navigation.

### 2.4 Dependency on Gap 55 (Controller Hoisting)

Gap 55 describes the prerequisite fix: the `TextEditingController` must be hoisted
from `InputAreaState` to `AppStateWidget` so the app-level key handler can read
and write the input text. Without the controller being accessible, ArrowUp/ArrowDown
history navigation cannot inject recalled text into the input field.

This gap assumes Gap 55 is resolved (the controller is hoisted and available as
`this.inputController` in `AppStateWidget`).

---

## 3. Proposed Solution

The fix has two coordinated parts:

1. **In `text-field.ts`:** When cursor movement fails (first line for Up, last line
   for Down, or single-line text), return `'ignored'` instead of `'handled'` so the
   event bubbles up to ancestor widgets.

2. **In `app.ts`:** Add ArrowUp/ArrowDown handlers in the `FocusScope` `onKey`
   callback that perform history navigation when these events bubble up from the
   TextField.

This approach preserves the existing multi-line cursor movement behavior -- Up/Down
still move between lines when there are lines to move between. History navigation
only activates when the cursor movement is a no-op (boundary conditions).

### 3.1 Design Principles

1. **Bubble on failure, handle on success.** Arrow keys that successfully move the
   cursor within multi-line text return `'handled'`. Arrow keys that cannot move
   (first line, last line, or single-line text) return `'ignored'` so ancestors
   can handle them.

2. **Consistent with terminal conventions.** Up on first line = previous history.
   Down on last line = next history. This matches bash, zsh, fish, IPython, Node
   REPL, and real Amp.

3. **Draft preservation.** The same draft-save/restore mechanism from the Ctrl+R/S
   feature (Gap 55) is reused. The first ArrowUp press saves the current input as
   a draft; navigating past the newest entry with ArrowDown restores it.

4. **No interference with Shift+Arrow selection.** Shift+Up and Shift+Down are
   already handled in a separate branch (lines 798-824 of text-field.ts) that
   always returns `'handled'`. They are unaffected by this change.

5. **No interference with single-line Home/End.** These are handled in separate
   cases and already return `'handled'`.

---

## 4. Detailed Implementation

### Step 1: Fix `TextField` ArrowUp/ArrowDown to Bubble on Boundary

**File:** `packages/flitter-core/src/widgets/text-field.ts`

The current code at lines 861-872 in the plain-key section (no ctrl/alt/meta):

```typescript
case 'ArrowUp':
  if (isMultiLine) {
    this._controller.moveCursorUp();
    return 'handled';
  }
  return 'ignored';
case 'ArrowDown':
  if (isMultiLine) {
    this._controller.moveCursorDown();
    return 'handled';
  }
  return 'ignored';
```

Replace with:

```typescript
case 'ArrowUp':
  if (isMultiLine) {
    const moved = this._controller.moveCursorUp();
    return moved ? 'handled' : 'ignored';
  }
  return 'ignored';
case 'ArrowDown':
  if (isMultiLine) {
    const moved = this._controller.moveCursorDown();
    return moved ? 'handled' : 'ignored';
  }
  return 'ignored';
```

**Why this is correct:**

- `moveCursorUp()` returns `boolean` (line 321: `moveCursorUp(): boolean`).
  It returns `true` when the cursor successfully moved to a previous line, and
  `false` when there is no line above (single-line text, or cursor already on
  line 0).

- `moveCursorDown()` returns `boolean` (line 345: `moveCursorDown(): boolean`).
  It returns `true` when the cursor moved to the next line, and `false` when
  there is no line below (single-line text, or cursor on the last line).

- When `moved` is `false`, returning `'ignored'` lets the event propagate to
  the parent FocusScope's `onKey` handler, where it can be intercepted for
  history navigation.

- When `moved` is `true`, the cursor moved within the multi-line text and
  `'handled'` correctly prevents further propagation. This preserves existing
  multi-line editing behavior.

- The `return 'ignored'` fallback for the `!isMultiLine` branch remains
  unchanged and continues to work correctly for strictly single-line fields.

**Compatibility note:** The `moveCursorUp()` and `moveCursorDown()` methods
already return `boolean` (added in Phase 20 for exactly this purpose). The
return value was simply never used by the key handler. No API changes are needed.

### Step 2: Add ArrowUp/ArrowDown History Navigation in `AppStateWidget`

**File:** `packages/flitter-amp/src/app.ts`

**Prerequisite:** Gap 55 must be resolved. The `inputController` field and
`_savedDraft` field must exist on `AppStateWidget`, and the `PromptHistory`
`isAtReset` getter must be available.

Add the following handlers inside the `FocusScope` `onKey` callback, after the
existing Ctrl+R/Ctrl+S handlers and before the final `return 'ignored'`:

```typescript
// ArrowUp (plain, no modifiers) -- navigate prompt history backward
// This only fires when TextField returns 'ignored' (cursor on first line
// or single-line input), because handled events don't bubble.
if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === 'ArrowUp') {
  if (this.promptHistory.isAtReset) {
    this._savedDraft = this.inputController.text;
  }
  const prev = this.promptHistory.previous();
  if (prev !== null) {
    this.inputController.text = prev;
    this.inputController.cursorPosition = prev.length;
  }
  return 'handled';
}

// ArrowDown (plain, no modifiers) -- navigate prompt history forward
// This only fires when TextField returns 'ignored' (cursor on last line
// or single-line input), because handled events don't bubble.
if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === 'ArrowDown') {
  const next = this.promptHistory.next();
  if (next !== null) {
    if (next === '') {
      // Returned to "new prompt" state -- restore saved draft
      this.inputController.text = this._savedDraft;
      this.inputController.cursorPosition = this._savedDraft.length;
      this._savedDraft = '';
    } else {
      this.inputController.text = next;
      this.inputController.cursorPosition = next.length;
    }
  }
  return 'handled';
}
```

**Why the modifier checks are important:** Shift+Up and Shift+Down are handled
by the TextField for selection extension and should never bubble to the app
level. Ctrl+Up and Ctrl+Down might be used for other purposes in the future
(e.g., scrolling the chat view). By explicitly checking that no modifiers are
pressed, we ensure only plain ArrowUp/ArrowDown trigger history navigation.

**Why `return 'handled'` even when `previous()` / `next()` returns null:** When
there is no history to navigate to, the arrow key should still be consumed to
prevent it from reaching any further ancestor that might misinterpret it. The
user experiences a no-op, which is correct: pressing Up with empty history does
nothing, just like in bash.

### Step 3: Reset History Cursor on Text Change

**File:** `packages/flitter-amp/src/app.ts`

When the user is navigating history and then starts typing (modifying the text),
the history cursor should reset so that the next ArrowUp starts from the most
recent entry again. Without this, the user could be mid-history, type something,
press ArrowUp, and unexpectedly jump to a distant history entry.

This requires listening to text changes on the hoisted controller. Add a listener
in `initState()` that resets the history cursor when the text changes for reasons
other than history navigation:

```typescript
private _isNavigatingHistory = false;

override initState(): void {
  super.initState();
  // ... existing listener setup ...

  // Reset history cursor when user edits text manually
  this.inputController.addListener(this._onInputTextChanged);
}

override dispose(): void {
  this.inputController.removeListener(this._onInputTextChanged);
  // ... existing dispose ...
  super.dispose();
}

private _onInputTextChanged = (): void => {
  // If this change was triggered by history navigation, skip the reset.
  // The flag is set by the ArrowUp/ArrowDown/Ctrl+R/Ctrl+S handlers.
  if (this._isNavigatingHistory) return;

  // User edited the text manually -- reset history cursor
  if (!this.promptHistory.isAtReset) {
    this.promptHistory.resetCursor();
  }
};
```

Update the ArrowUp/Down and Ctrl+R/S handlers to set the guard flag:

```typescript
// ArrowUp handler (and similarly for ArrowDown, Ctrl+R, Ctrl+S):
if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === 'ArrowUp') {
  this._isNavigatingHistory = true;
  try {
    if (this.promptHistory.isAtReset) {
      this._savedDraft = this.inputController.text;
    }
    const prev = this.promptHistory.previous();
    if (prev !== null) {
      this.inputController.text = prev;
      this.inputController.cursorPosition = prev.length;
    }
  } finally {
    this._isNavigatingHistory = false;
  }
  return 'handled';
}
```

The `try/finally` pattern ensures the flag is always cleared, even if an error
occurs during text mutation. The flag is synchronous (set and cleared within the
same call stack), so there is no race condition with async code.

**Why this matters:** Without this guard, setting `this.inputController.text`
inside the ArrowUp handler would trigger the `_onInputTextChanged` listener,
which would immediately reset the history cursor, making consecutive ArrowUp
presses impossible. The flag prevents this self-triggering loop.

---

## 5. Complete Diff Summary

### `packages/flitter-core/src/widgets/text-field.ts`

```diff
       case 'ArrowUp':
         if (isMultiLine) {
-          this._controller.moveCursorUp();
-          return 'handled';
+          const moved = this._controller.moveCursorUp();
+          return moved ? 'handled' : 'ignored';
         }
         return 'ignored';
       case 'ArrowDown':
         if (isMultiLine) {
-          this._controller.moveCursorDown();
-          return 'handled';
+          const moved = this._controller.moveCursorDown();
+          return moved ? 'handled' : 'ignored';
         }
         return 'ignored';
```

### `packages/flitter-amp/src/app.ts`

```diff
 class AppStateWidget extends State<App> {
   private scrollController = new ScrollController();
+  private inputController = new TextEditingController();   // from Gap 55
   private stateListener: (() => void) | null = null;
   private showCommandPalette = false;
   private showFilePicker = false;
   private fileList: string[] = [];
   private promptHistory = new PromptHistory();
+  private _savedDraft: string = '';                        // from Gap 55
+  private _isNavigatingHistory = false;                    // NEW
   private _lastUpdate = 0;
   private _pendingTimer: ReturnType<typeof setTimeout> | null = null;

   override initState(): void {
     super.initState();
+    // Reset history cursor when user edits text manually
+    this.inputController.addListener(this._onInputTextChanged);
     // ... existing listener setup ...
   }

+  private _onInputTextChanged = (): void => {
+    if (this._isNavigatingHistory) return;
+    if (!this.promptHistory.isAtReset) {
+      this.promptHistory.resetCursor();
+    }
+  };

   override dispose(): void {
+    this.inputController.removeListener(this._onInputTextChanged);
     // ... existing dispose ...
   }

   build(): Widget {
     // ... existing code ...

     const mainContent = new FocusScope({
       autofocus: true,
       onKey: (event: KeyEvent): KeyEventResult => {
         // ... existing Escape, Ctrl+O, Ctrl+C, Ctrl+L, Alt+T, Ctrl+G handlers ...

         // Ctrl+R -- navigate prompt history (backward) -- from Gap 55
         if (event.ctrlKey && event.key === 'r') {
-          const prev = this.promptHistory.previous();
-          if (prev !== null) {
-            // TODO: inject text into InputArea when TextEditingController is exposed
-            this.setState(() => {});
-          }
+          this._isNavigatingHistory = true;
+          try {
+            if (this.promptHistory.isAtReset) {
+              this._savedDraft = this.inputController.text;
+            }
+            const prev = this.promptHistory.previous();
+            if (prev !== null) {
+              this.inputController.text = prev;
+              this.inputController.cursorPosition = prev.length;
+            }
+          } finally {
+            this._isNavigatingHistory = false;
+          }
           return 'handled';
         }

+        // Ctrl+S -- navigate prompt history (forward) -- from Gap 55
+        if (event.ctrlKey && event.key === 's') {
+          this._isNavigatingHistory = true;
+          try {
+            const next = this.promptHistory.next();
+            if (next !== null) {
+              if (next === '') {
+                this.inputController.text = this._savedDraft;
+                this.inputController.cursorPosition = this._savedDraft.length;
+                this._savedDraft = '';
+              } else {
+                this.inputController.text = next;
+                this.inputController.cursorPosition = next.length;
+              }
+            }
+          } finally {
+            this._isNavigatingHistory = false;
+          }
+          return 'handled';
+        }
+
+        // ArrowUp (plain) -- navigate prompt history backward
+        // Only fires when TextField returns 'ignored' (cursor on first line
+        // or single-line text), because handled events don't bubble.
+        if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === 'ArrowUp') {
+          this._isNavigatingHistory = true;
+          try {
+            if (this.promptHistory.isAtReset) {
+              this._savedDraft = this.inputController.text;
+            }
+            const prev = this.promptHistory.previous();
+            if (prev !== null) {
+              this.inputController.text = prev;
+              this.inputController.cursorPosition = prev.length;
+            }
+          } finally {
+            this._isNavigatingHistory = false;
+          }
+          return 'handled';
+        }
+
+        // ArrowDown (plain) -- navigate prompt history forward
+        // Only fires when TextField returns 'ignored' (cursor on last line
+        // or single-line text), because handled events don't bubble.
+        if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === 'ArrowDown') {
+          this._isNavigatingHistory = true;
+          try {
+            const next = this.promptHistory.next();
+            if (next !== null) {
+              if (next === '') {
+                this.inputController.text = this._savedDraft;
+                this.inputController.cursorPosition = this._savedDraft.length;
+                this._savedDraft = '';
+              } else {
+                this.inputController.text = next;
+                this.inputController.cursorPosition = next.length;
+              }
+            }
+          } finally {
+            this._isNavigatingHistory = false;
+          }
+          return 'handled';
+        }

         return 'ignored';
       },
       child: new Column({
         // ...
         children: [
           // ...
           new BottomGrid({
             onSubmit: (text: string) => {
               this.promptHistory.push(text);
+              this.promptHistory.resetCursor();       // from Gap 55
+              this._savedDraft = '';                  // from Gap 55
               this.widget.onSubmit(text);
             },
             // ... other props ...
+            controller: this.inputController,          // from Gap 55
           }),
         ],
       }),
     });
     // ...
   }
 }
```

---

## 6. Event Propagation Analysis

Understanding the full event flow is critical to verifying correctness.

### 6.1 Single-Line Input, User Presses ArrowUp

```
1. User presses ArrowUp (no modifiers)
2. Terminal sends escape sequence: \x1b[A
3. Input parser decodes to KeyEvent { key: 'ArrowUp', ctrlKey: false, ... }
4. FocusManager dispatches to focused node (TextField's FocusNode)
5. TextFieldState.handleKeyEvent() is called
6. Enters plain-key section (no ctrl/alt)
7. case 'ArrowUp': isMultiLine is true (maxLines not set to 1)
8. Calls this._controller.moveCursorUp()
9. moveCursorUp(): text has no '\n', lines.length === 1, returns false
10. Handler returns 'ignored' (NEW behavior: was 'handled')
11. FocusNode propagates 'ignored' result up to parent FocusScope
12. AppStateWidget's FocusScope onKey handler receives the event
13. Checks: ArrowUp with no modifiers? Yes
14. Saves draft, calls promptHistory.previous()
15. Sets inputController.text = recalled entry
16. Returns 'handled'
17. TextField rebuilds via controller notification chain
18. User sees recalled history entry in the input field
```

### 6.2 Multi-Line Input, Cursor on Line 2 (Middle), User Presses ArrowUp

```
1. User presses ArrowUp
2. TextFieldState.handleKeyEvent() is called
3. case 'ArrowUp': isMultiLine is true
4. Calls this._controller.moveCursorUp()
5. moveCursorUp(): lineIndex is 1 (middle line), moves to line 0, returns true
6. Handler returns 'handled'
7. Event does NOT bubble -- cursor moved within text
8. AppStateWidget's FocusScope onKey handler is NOT called
9. User sees cursor move up one line (existing behavior preserved)
```

### 6.3 Multi-Line Input, Cursor on Line 0 (First Line), User Presses ArrowUp

```
1. User presses ArrowUp
2. TextFieldState.handleKeyEvent() is called
3. case 'ArrowUp': isMultiLine is true
4. Calls this._controller.moveCursorUp()
5. moveCursorUp(): lineIndex is 0, returns false (no line above)
6. Handler returns 'ignored' (NEW behavior: was 'handled')
7. Event bubbles to AppStateWidget's FocusScope
8. History navigation occurs (same as 6.1 steps 13-18)
```

### 6.4 Shift+ArrowUp (Selection Extension)

```
1. User presses Shift+ArrowUp
2. TextFieldState.handleKeyEvent() is called
3. Enters Shift section (shiftKey && !ctrlKey && !altKey)
4. case 'ArrowUp': calls this._controller.selectUp(), returns 'handled'
5. Event does NOT bubble -- selection extended
6. AppStateWidget's handler not reached (correct: Shift+Up is not history nav)
```

### 6.5 ArrowUp with Empty History

```
1. User presses ArrowUp (no modifiers), no history entries
2. Event bubbles to AppStateWidget (Steps 1-11 from 6.1)
3. promptHistory.isAtReset is true -> save draft (empty string)
4. promptHistory.previous() returns null (empty history)
5. No text change occurs
6. Returns 'handled' (event consumed, but no visible effect)
7. User sees no change -- correct no-op behavior
```

---

## 7. Behavioral Specification

### ArrowUp (Plain, No Modifiers)

| Context | Behavior |
|---------|----------|
| Single-line text (no `\n`) | Navigate to previous history entry |
| Multi-line text, cursor on line > 0 | Move cursor up one line (existing) |
| Multi-line text, cursor on line 0 | Navigate to previous history entry |
| No history entries | No-op (event consumed silently) |
| Already at oldest history entry | No-op (stays on oldest) |

### ArrowDown (Plain, No Modifiers)

| Context | Behavior |
|---------|----------|
| Single-line text (no `\n`) | Navigate to next history entry |
| Multi-line text, cursor on line < last | Move cursor down one line (existing) |
| Multi-line text, cursor on last line | Navigate to next history entry |
| Past newest entry | Restore saved draft |
| No history navigation active (cursor at reset) | No-op |

### Interaction with Ctrl+R / Ctrl+S

ArrowUp/ArrowDown and Ctrl+R/Ctrl+S share the same `PromptHistory` cursor and
`_savedDraft` state. The user can freely mix them:

- Ctrl+R to go back 3 entries, then ArrowDown to go forward 1
- ArrowUp twice, then Ctrl+S to go forward
- ArrowUp to enter history, type to edit (resets cursor), ArrowUp to re-enter

### Draft Preservation Rules

1. Draft is saved on the **first** navigation action when `isAtReset` is true.
2. Draft is restored when `next()` returns `''` (past newest entry).
3. Draft is cleared on submit.
4. Draft is NOT cleared when the user edits a recalled entry (the edit resets
   the cursor, and the next ArrowUp saves the edited text as a new draft).
5. Manual text edits reset the history cursor (via `_onInputTextChanged`).

### Multi-Line History Entries

If a history entry contains newlines (possible if the user previously submitted
multi-line input), recalling it replaces the entire input with the multi-line
text. Subsequent ArrowUp/Down presses from within this multi-line recalled
text first move the cursor within the text (normal multi-line behavior). Only
when the cursor reaches the first/last line boundary does another arrow press
trigger further history navigation.

---

## 8. Testing Plan

### 8.1 Unit Tests: TextField Arrow Key Bubbling

**File:** New test in `packages/flitter-core/src/__tests__/text-field-arrows.test.ts`

```typescript
describe('TextField ArrowUp/ArrowDown bubbling', () => {
  it('returns ignored for ArrowUp on single-line text', () => {
    // Create TextField with text "hello" (no newlines)
    // Send ArrowUp key event
    // Expect result === 'ignored'
  });

  it('returns ignored for ArrowDown on single-line text', () => {
    // Create TextField with text "hello"
    // Send ArrowDown key event
    // Expect result === 'ignored'
  });

  it('returns handled for ArrowUp on multi-line text when not on first line', () => {
    // Create TextField with text "line1\nline2\nline3"
    // Place cursor on line 2
    // Send ArrowUp
    // Expect result === 'handled' and cursor on line 1
  });

  it('returns ignored for ArrowUp on multi-line text when on first line', () => {
    // Create TextField with text "line1\nline2"
    // Place cursor on line 0
    // Send ArrowUp
    // Expect result === 'ignored' and cursor unchanged
  });

  it('returns handled for ArrowDown on multi-line text when not on last line', () => {
    // Create TextField with text "line1\nline2\nline3"
    // Place cursor on line 1
    // Send ArrowDown
    // Expect result === 'handled' and cursor on line 2
  });

  it('returns ignored for ArrowDown on multi-line text when on last line', () => {
    // Create TextField with text "line1\nline2"
    // Place cursor on line 1
    // Send ArrowDown
    // Expect result === 'ignored' and cursor unchanged
  });

  it('returns handled for Shift+ArrowUp regardless of line position', () => {
    // Create TextField with single-line text
    // Send Shift+ArrowUp
    // Expect result === 'handled' (selection, not history)
  });

  it('returns handled for Shift+ArrowDown regardless of line position', () => {
    // Create TextField with single-line text
    // Send Shift+ArrowDown
    // Expect result === 'handled'
  });
});
```

### 8.2 Integration Tests: Arrow Key History Navigation

```typescript
describe('ArrowUp/ArrowDown history navigation', () => {
  it('ArrowUp recalls previous history entry', () => {
    // Submit "first", then "second"
    // Press ArrowUp
    // Verify input shows "second"
    // Press ArrowUp again
    // Verify input shows "first"
  });

  it('ArrowDown navigates forward through history', () => {
    // Submit "first", "second"
    // ArrowUp twice (shows "first")
    // ArrowDown
    // Verify input shows "second"
  });

  it('ArrowDown past newest entry restores draft', () => {
    // Submit "first"
    // Type "my draft"
    // ArrowUp (shows "first", draft saved as "my draft")
    // ArrowDown (past newest -> restores draft)
    // Verify input shows "my draft"
  });

  it('ArrowUp with empty history is a no-op', () => {
    // No history entries
    // Type "hello"
    // ArrowUp
    // Verify input still shows "hello"
  });

  it('mixing ArrowUp and Ctrl+R shares the same cursor', () => {
    // Submit "a", "b", "c"
    // ArrowUp (shows "c")
    // Ctrl+R (shows "b")
    // ArrowDown (shows "c")
    // Ctrl+S (shows "" / draft)
  });

  it('editing text resets history cursor', () => {
    // Submit "first", "second"
    // ArrowUp (shows "second")
    // Type a character (appends to "second")
    // ArrowUp (should save "second+" as draft, show "second")
    // NOT: continue from where we were before typing
  });

  it('multi-line text: ArrowUp on line 0 triggers history', () => {
    // Submit "old entry"
    // Type "line1\nline2" (via Shift+Enter)
    // Place cursor on line 0
    // ArrowUp -> should show "old entry" from history
  });

  it('multi-line text: ArrowUp on line 1 moves cursor up', () => {
    // Type "line1\nline2"
    // Place cursor on line 1
    // ArrowUp -> should move cursor to line 0, NOT trigger history
  });

  it('multi-line text: ArrowDown on last line triggers history forward', () => {
    // Submit "first", "second"
    // ArrowUp twice (shows "first")
    // Type "line1\nline2" to create multi-line input
    // Place cursor on last line
    // ArrowDown -> should navigate to "second"
  });
});
```

### 8.3 Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| ArrowUp with empty input and empty history | No-op, input stays empty |
| ArrowUp at oldest entry | No-op, input stays on oldest entry |
| ArrowDown without prior ArrowUp | No-op (`next()` returns null when cursor at reset) |
| Submit while mid-history | History cursor resets, draft cleared, submitted text added to history |
| Rapid ArrowUp spam | Steps backward through history one entry per press |
| ArrowUp then immediate submit | Submits the recalled history entry; entry is re-pushed to history |
| Controller text set to same value | TextEditingController setter short-circuits, no listeners fire |
| `_isNavigatingHistory` flag during error | `try/finally` ensures flag is always cleared |

---

## 9. Refactoring Opportunity: Shared Navigation Helper

The ArrowUp, ArrowDown, Ctrl+R, and Ctrl+S handlers share identical logic for
history navigation and draft management. A private helper method reduces
duplication:

```typescript
/**
 * Navigate prompt history in the given direction.
 * @param direction 'backward' for previous, 'forward' for next
 */
private _navigateHistory(direction: 'backward' | 'forward'): void {
  this._isNavigatingHistory = true;
  try {
    if (direction === 'backward') {
      if (this.promptHistory.isAtReset) {
        this._savedDraft = this.inputController.text;
      }
      const prev = this.promptHistory.previous();
      if (prev !== null) {
        this.inputController.text = prev;
        this.inputController.cursorPosition = prev.length;
      }
    } else {
      const next = this.promptHistory.next();
      if (next !== null) {
        if (next === '') {
          this.inputController.text = this._savedDraft;
          this.inputController.cursorPosition = this._savedDraft.length;
          this._savedDraft = '';
        } else {
          this.inputController.text = next;
          this.inputController.cursorPosition = next.length;
        }
      }
    }
  } finally {
    this._isNavigatingHistory = false;
  }
}
```

Then the handlers become:

```typescript
// Ctrl+R
if (event.ctrlKey && event.key === 'r') {
  this._navigateHistory('backward');
  return 'handled';
}

// Ctrl+S
if (event.ctrlKey && event.key === 's') {
  this._navigateHistory('forward');
  return 'handled';
}

// ArrowUp (plain)
if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === 'ArrowUp') {
  this._navigateHistory('backward');
  return 'handled';
}

// ArrowDown (plain)
if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === 'ArrowDown') {
  this._navigateHistory('forward');
  return 'handled';
}
```

This helper consolidates ~60 lines of duplicated logic into ~25 lines, making
the intent clearer and ensuring all four navigation paths behave identically.

---

## 10. Impact Assessment

- **Risk**: Low. The text-field.ts change is a 4-line diff that makes the return
  value conditional on an already-returned boolean. The app.ts changes add new
  handler branches that only activate when events bubble.

- **Regression risk**: The only behavioral change in `text-field.ts` is that
  ArrowUp/Down on line boundaries now return `'ignored'` instead of `'handled'`.
  This means widgets that previously never saw these events at ancestor levels
  will now receive them. However, the only ancestor handler is the `FocusScope`
  in `AppStateWidget`, and we are explicitly adding a handler there. No other
  part of the codebase registers for ArrowUp/ArrowDown at ancestor FocusScope
  levels.

- **Shift+Arrow unaffected**: Shift+ArrowUp and Shift+ArrowDown are handled in
  a completely separate branch (lines 798-824) that returns `'handled'` before
  the plain-key section is reached. No interference.

- **Ctrl+Arrow unaffected**: Ctrl+ArrowUp/Down are not currently handled anywhere
  (no case for them in the Ctrl section). They fall through to `'ignored'`. This
  behavior is unchanged.

- **Performance**: Negligible. One additional boolean check per ArrowUp/Down
  keypress in the TextField handler. One additional string comparison in the
  FocusScope handler (only when events bubble).

- **Lines changed**: ~4 lines in `text-field.ts`, ~50 lines in `app.ts` (or ~30
  lines if using the shared helper refactoring from Section 9).

---

## 11. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Gap 55 (expose TextEditingController) | Required | Controller must be hoisted for app-level text injection |
| Gap 51 (prompt history fix) | Co-requisite | Shares the same controller hoisting and Ctrl+R/S wiring |
| Gap 52 (history size config) | Independent | Can be applied before or after this gap |
| Gap 53 (history persistence) | Independent | Benefits from working history but has no code overlap |
| `PromptHistory.isAtReset` | Required | Added by Gap 55; needed for draft save logic |
| `moveCursorUp()` returns boolean | Already exists | Lines 321-342 of text-field.ts, return type is `boolean` |
| `moveCursorDown()` returns boolean | Already exists | Lines 345-366 of text-field.ts, return type is `boolean` |

---

## 12. Implementation Order

1. **Apply Gap 55 first** (controller hoisting, `isAtReset`, Ctrl+R/S handlers).
2. **Step 1**: Modify `text-field.ts` ArrowUp/ArrowDown to return `'ignored'` on
   boundary (4-line diff).
3. **Step 2**: Add ArrowUp/ArrowDown handlers in `app.ts` FocusScope `onKey`.
4. **Step 3**: Add `_isNavigatingHistory` flag and `_onInputTextChanged` listener.
5. **Optional**: Apply the shared `_navigateHistory()` helper refactoring from
   Section 9 to consolidate all four navigation handlers.

Steps 2-4 can be done in a single commit since they form a coherent feature.
Step 1 is a separate concern (fixing event bubbling in the core library) and
could be committed independently.
