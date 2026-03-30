# S05: Prompt History Navigation Fix

## Status: CRITICAL GAP
## Priority: P0
## Gap ID: 51
## Affected files:
- `packages/flitter-amp/src/app.ts`
- `packages/flitter-amp/src/widgets/input-area.ts`
- `packages/flitter-amp/src/widgets/bottom-grid.ts`
- `packages/flitter-amp/src/state/history.ts`

---

## Problem Statement

Pressing Ctrl+R (backward history) and Ctrl+S (forward history, not yet wired) moves the
internal `PromptHistory` cursor but **never injects the recalled text into the InputArea
text field**. The user sees nothing happen despite the key being consumed. This makes
prompt history entirely non-functional.

The root cause is an architectural gap: the `TextEditingController` that owns the input
text lives inside `InputAreaState` (a private field on line 65 of `input-area.ts`), and the
`AppStateWidget` that handles Ctrl+R has no reference to it. The current code explicitly
acknowledges this with a TODO comment at line 199 of `app.ts`:

```typescript
// TODO: inject text into InputArea when TextEditingController is exposed
this.setState(() => {});
```

The `setState(() => {})` triggers a rebuild but rebuilds do not change the controller's
text -- the controller is created once in `InputAreaState.initState()` and persists across
rebuilds. This is standard StatefulWidget behavior: the `State` object and its fields
survive parent rebuilds. Only props on the Widget are updated.

A secondary issue exists in the FilePicker overlay (line 341), which has the same TODO:
```typescript
// TODO: insert @filePath into InputArea text when controller is exposed
```

---

## Root Cause Analysis

### Data flow today (broken)

```
User presses Ctrl+R
  --> AppStateWidget.onKey handler (app.ts:196)
    --> this.promptHistory.previous()     // returns "old prompt text"
    --> this.setState(() => {})           // triggers rebuild, but...
      --> BottomGrid rebuilt with same props (no controller/text prop)
        --> InputArea rebuilt, but InputAreaState keeps its own controller
          --> TextEditingController.text is still "" -- nothing displayed
```

### Why setState alone does not work

`InputArea` is a `StatefulWidget`. Its `State` object (`InputAreaState`) holds a private
`TextEditingController` created in `initState()` (line 65: `private controller = new
TextEditingController()`). When the parent rebuilds, the existing `State` is reused -- this
is the fundamental Flutter/flitter lifecycle guarantee. The controller's `text` property is
never set from outside, so the input field remains empty.

The only way to affect the controller from outside is either:
1. Hoist the controller to the parent (standard Flutter pattern) -- **chosen approach**
2. Add a text prop and use `didUpdateWidget` to sync it -- more fragile, bidirectional sync issues
3. Use a GlobalKey to reach into the State -- anti-pattern, tightly couples parent to child internals

### Two TODOs with the same cause

1. **Ctrl+R history navigation** (app.ts:199) -- needs to set input text to recalled prompt
2. **FilePicker @-file insertion** (app.ts:341) -- needs to insert `@filePath` at cursor

Both require the App-level code to mutate the `TextEditingController` owned by `InputArea`.

### Widget tree path (controller must traverse)

```
AppStateWidget                    <-- needs controller access for Ctrl+R/S, FilePicker
  --> Column
    --> BottomGrid                <-- pass-through layer
      --> InputArea               <-- currently owns controller
        --> InputAreaState
          --> Autocomplete        <-- also receives controller (line 132)
            --> TextField         <-- renders using controller
```

---

## Proposed Solution

The fix follows the standard Flutter controller-hoisting pattern: the parent that needs to
control the text field creates and owns the `TextEditingController`, then passes it down
through the widget tree as a prop. This is identical to how `TextField` itself already
supports an external controller (see `text-field.ts` lines 592-593, 666-672).

### Step 1: Add `controller` prop to InputArea

In `packages/flitter-amp/src/widgets/input-area.ts`, add an optional external controller
prop. When provided, `InputAreaState` uses it instead of creating its own. This mirrors
the pattern already used by `TextField` in `flitter-core` (which checks
`this.widget.controller` in its `initState` and sets `_ownsController` accordingly).

```typescript
// input-area.ts -- InputAreaProps interface
interface InputAreaProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  mode: string | null;
  submitWithMeta?: boolean;
  topWidget?: Widget;
  autocompleteTriggers?: AutocompleteTrigger[];
  imageAttachments?: number;
  skillCount?: number;
  overlayTexts?: BorderOverlayText[];
  controller?: TextEditingController;           // <-- NEW
}
```

```typescript
// input-area.ts -- InputArea class
export class InputArea extends StatefulWidget {
  // ... existing fields ...
  readonly externalController?: TextEditingController; // <-- NEW

  constructor(props: InputAreaProps) {
    super({});
    // ... existing assignments ...
    this.externalController = props.controller;        // <-- NEW
  }

  createState(): InputAreaState {
    return new InputAreaState();
  }
}
```

```typescript
// input-area.ts -- InputAreaState class
class InputAreaState extends State<InputArea> {
  private controller!: TextEditingController;          // <-- changed: late init via initState
  private ownsController = false;                      // <-- NEW: tracks ownership
  private currentText = '';

  override initState(): void {
    super.initState();
    if (this.widget.externalController) {
      this.controller = this.widget.externalController;
      this.ownsController = false;
    } else {
      this.controller = new TextEditingController();
      this.ownsController = true;
    }
    this.controller.addListener(this._onTextChanged);
  }

  override dispose(): void {
    this.controller.removeListener(this._onTextChanged);
    // Only dispose if we created it (TextEditingController extends ChangeNotifier
    // which has dispose() for clearing listeners)
    super.dispose();
  }

  // ... rest unchanged ...
}
```

**Important interaction with `_onTextChanged`**: When the parent sets `controller.text`
from the Ctrl+R handler, the controller calls `notifyListeners()`, which triggers the
`_onTextChanged` callback in `InputAreaState`. This callback (lines 78-88) updates
`currentText` and conditionally calls `setState` if the shell mode changed. This is
correct behavior -- the InputArea will detect the text change and rebuild if needed for
shell mode styling. No additional wiring is required.

**Important interaction with `Autocomplete`**: The `Autocomplete` widget (line 130-134)
also receives `this.controller`. Since we are using the same controller instance (just
hoisted), the Autocomplete will continue to work correctly. The `controller` prop passed
to `Autocomplete` on line 132 reads `this.controller` which will now reference either the
external or the internally-created one.

### Step 2: Add `controller` prop to BottomGrid (pass-through)

In `packages/flitter-amp/src/widgets/bottom-grid.ts`, add the controller prop and forward
it to `InputArea`. BottomGrid is a pure pass-through for this prop.

```typescript
// bottom-grid.ts -- needs import
import { TextEditingController } from 'flitter-core/src/widgets/text-field';

// bottom-grid.ts -- BottomGridProps interface
interface BottomGridProps {
  // ... existing props ...
  controller?: TextEditingController;              // <-- NEW
}
```

```typescript
// bottom-grid.ts -- BottomGrid class constructor
export class BottomGrid extends StatefulWidget {
  // ... existing fields ...
  readonly controller: TextEditingController | undefined; // <-- NEW

  constructor(props: BottomGridProps) {
    super({});
    // ... existing assignments ...
    this.controller = props.controller;                    // <-- NEW
  }
}
```

```typescript
// bottom-grid.ts -- BottomGridState.build(), InputArea creation
const inputArea = new InputArea({
  onSubmit: w.onSubmit,
  isProcessing: w.isProcessing,
  mode: w.currentMode,
  submitWithMeta: w.submitWithMeta,
  topWidget: w.topWidget,
  autocompleteTriggers: w.autocompleteTriggers,
  imageAttachments: w.imageAttachments,
  skillCount: w.skillCount,
  overlayTexts,
  controller: w.controller,                               // <-- NEW
});
```

### Step 3: Hoist TextEditingController to AppStateWidget

In `packages/flitter-amp/src/app.ts`, create the controller at the `AppStateWidget` level
and pass it down. This gives the Ctrl+R handler direct access to set the text.

```typescript
// app.ts -- new import
import { TextEditingController } from 'flitter-core/src/widgets/text-field';

// app.ts -- AppStateWidget class fields
class AppStateWidget extends State<App> {
  private scrollController = new ScrollController();
  private inputController = new TextEditingController();  // <-- NEW: hoisted controller
  private stateListener: (() => void) | null = null;
  private showCommandPalette = false;
  private showFilePicker = false;
  private fileList: string[] = [];
  private promptHistory = new PromptHistory();
  private _savedDraft: string = '';                        // <-- NEW: save draft before navigating
  private _lastUpdate = 0;
  private _pendingTimer: ReturnType<typeof setTimeout> | null = null;

  // ... initState, dispose, _flushUpdate unchanged ...
```

### Step 4: Fix the Ctrl+R handler

Replace the broken Ctrl+R handler that only called `setState` with one that actually
sets the controller's text. The key insight is that setting `controller.text` automatically
triggers `notifyListeners()` inside `TextEditingController` (line 107 of text-field.ts),
which causes the `TextField` to rebuild through the listener chain. No `setState` call
is needed at the App level.

```typescript
// app.ts -- inside FocusScope onKey handler

// Ctrl+R -- navigate prompt history (backward)
if (event.ctrlKey && event.key === 'r') {
  // Save current input as draft before first navigation
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
```

**Why no `setState` is needed**: Setting `this.inputController.text` triggers
`notifyListeners()` on the controller. The `InputAreaState._onTextChanged` listener fires,
which updates `currentText` and calls `setState` on InputAreaState if shell mode changed.
The `TextFieldState._onControllerChanged` listener (text-field.ts:687-691) always calls
`setState` on the TextField state, causing a rebuild that renders the new text. The rebuild
chain flows bottom-up from the TextField, not top-down from AppStateWidget.

### Step 5: Add Ctrl+S handler for forward navigation

Wire Ctrl+S to navigate forward through history. When the user reaches the newest end,
restore their draft text. This must be placed immediately after the Ctrl+R block in the
`onKey` handler.

```typescript
// app.ts -- inside FocusScope onKey handler, after Ctrl+R block

// Ctrl+S -- navigate prompt history (forward)
if (event.ctrlKey && event.key === 's') {
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

### Step 6: Add `isAtReset` getter to PromptHistory

The history class needs to expose whether the cursor is in the reset state (no navigation
in progress) so the App can decide when to save the draft. Without this, pressing Ctrl+R
multiple times would overwrite the saved draft with a history entry rather than the
original user-typed text.

```typescript
// history.ts -- PromptHistory class, after resetCursor()

/** True when cursor is at reset position (no history navigation in progress). */
get isAtReset(): boolean {
  return this.cursor === -1;
}
```

### Step 7: Reset history cursor on submit

When the user submits a prompt (whether it came from history or was typed fresh), the
history cursor should reset so the next Ctrl+R starts from the most recent entry.

This is already partially handled -- `push()` calls `this.cursor = -1`. But we should
also reset the saved draft and explicitly call `resetCursor` for clarity:

```typescript
// app.ts -- BottomGrid onSubmit callback
new BottomGrid({
  onSubmit: (text: string) => {
    this.promptHistory.push(text);
    this.promptHistory.resetCursor();
    this._savedDraft = '';
    this.widget.onSubmit(text);
  },
  // ... other props ...
  controller: this.inputController,              // <-- pass controller down
})
```

### Step 8: Fix the FilePicker TODO (bonus)

With the controller now accessible at the App level, the FilePicker's `onSelect` can be
completed. The `insertText` method on `TextEditingController` inserts at the current
cursor position (or replaces selection), which is the correct behavior for inserting a
file reference.

```typescript
// app.ts -- FilePicker onSelect handler
onSelect: (filePath: string) => {
  this.setState(() => { this.showFilePicker = false; });
  this.inputController.insertText(`@${filePath} `);
},
```

---

## Complete Diff Summary

### `packages/flitter-amp/src/state/history.ts`

Add the `isAtReset` getter:

```diff
   resetCursor(): void {
     this.cursor = -1;
   }
+
+  /** True when no history navigation is in progress. */
+  get isAtReset(): boolean {
+    return this.cursor === -1;
+  }
 }
```

### `packages/flitter-amp/src/widgets/input-area.ts`

Accept external controller:

```diff
 interface InputAreaProps {
   onSubmit: (text: string) => void;
   isProcessing: boolean;
   mode: string | null;
   submitWithMeta?: boolean;
   topWidget?: Widget;
   autocompleteTriggers?: AutocompleteTrigger[];
   imageAttachments?: number;
   skillCount?: number;
   overlayTexts?: BorderOverlayText[];
+  controller?: TextEditingController;
 }

 export class InputArea extends StatefulWidget {
   // ... existing fields ...
+  readonly externalController?: TextEditingController;

   constructor(props: InputAreaProps) {
     super({});
     // ... existing ...
+    this.externalController = props.controller;
   }
   // ...
 }

 class InputAreaState extends State<InputArea> {
-  private controller = new TextEditingController();
+  private controller!: TextEditingController;
+  private ownsController = false;
   private currentText = '';

   override initState(): void {
     super.initState();
+    if (this.widget.externalController) {
+      this.controller = this.widget.externalController;
+      this.ownsController = false;
+    } else {
+      this.controller = new TextEditingController();
+      this.ownsController = true;
+    }
     this.controller.addListener(this._onTextChanged);
   }
   // ...
 }
```

### `packages/flitter-amp/src/widgets/bottom-grid.ts`

Pass controller through:

```diff
+import { TextEditingController } from 'flitter-core/src/widgets/text-field';
+
 interface BottomGridProps {
   onSubmit: (text: string) => void;
   // ... existing ...
+  controller?: TextEditingController;
 }

 export class BottomGrid extends StatefulWidget {
   // ... existing fields ...
+  readonly controller: TextEditingController | undefined;

   constructor(props: BottomGridProps) {
     super({});
     // ... existing ...
+    this.controller = props.controller;
   }
   // ...
 }

 // In BottomGridState.build():
   const inputArea = new InputArea({
     // ... existing props ...
+    controller: w.controller,
   });
```

### `packages/flitter-amp/src/app.ts`

Hoist controller, fix Ctrl+R, add Ctrl+S, fix FilePicker:

```diff
+import { TextEditingController } from 'flitter-core/src/widgets/text-field';

 class AppStateWidget extends State<App> {
   private scrollController = new ScrollController();
+  private inputController = new TextEditingController();
   private stateListener: (() => void) | null = null;
   private showCommandPalette = false;
   private showFilePicker = false;
   private fileList: string[] = [];
   private promptHistory = new PromptHistory();
+  private _savedDraft: string = '';
   private _lastUpdate = 0;
   private _pendingTimer: ReturnType<typeof setTimeout> | null = null;

   // ... (initState, dispose, _flushUpdate unchanged) ...

   // Inside FocusScope onKey handler:

-        // Ctrl+R -- navigate prompt history (backward)
-        if (event.ctrlKey && event.key === 'r') {
-          const prev = this.promptHistory.previous();
-          if (prev !== null) {
-            // TODO: inject text into InputArea when TextEditingController is exposed
-            this.setState(() => {});
-          }
-          return 'handled';
-        }
+        // Ctrl+R -- navigate prompt history (backward)
+        if (event.ctrlKey && event.key === 'r') {
+          if (this.promptHistory.isAtReset) {
+            this._savedDraft = this.inputController.text;
+          }
+          const prev = this.promptHistory.previous();
+          if (prev !== null) {
+            this.inputController.text = prev;
+            this.inputController.cursorPosition = prev.length;
+          }
+          return 'handled';
+        }
+
+        // Ctrl+S -- navigate prompt history (forward)
+        if (event.ctrlKey && event.key === 's') {
+          const next = this.promptHistory.next();
+          if (next !== null) {
+            if (next === '') {
+              // Restored to new-prompt state -- bring back draft
+              this.inputController.text = this._savedDraft;
+              this.inputController.cursorPosition = this._savedDraft.length;
+              this._savedDraft = '';
+            } else {
+              this.inputController.text = next;
+              this.inputController.cursorPosition = next.length;
+            }
+          }
+          return 'handled';
+        }

   // ... In build() -- BottomGrid instantiation:

          new BottomGrid({
            onSubmit: (text: string) => {
              this.promptHistory.push(text);
+             this.promptHistory.resetCursor();
+             this._savedDraft = '';
              this.widget.onSubmit(text);
            },
            isProcessing: appState.isProcessing,
            currentMode: appState.currentMode ?? 'smart',
            agentName: appState.agentName ?? undefined,
            cwd: appState.cwd,
            gitBranch: appState.gitBranch ?? undefined,
            tokenUsage: appState.usage ?? undefined,
            skillCount: appState.skillCount,
+           controller: this.inputController,
          }),

   // ... FilePicker onSelect:
-              onSelect: (_filePath: string) => {
-                this.setState(() => { this.showFilePicker = false; });
-                // TODO: insert @filePath into InputArea text when controller is exposed
+              onSelect: (filePath: string) => {
+                this.setState(() => { this.showFilePicker = false; });
+                this.inputController.insertText(`@${filePath} `);
              },
```

---

## Behavioral Specification

### Ctrl+R (backward navigation)
1. First press: saves current input as draft, recalls most recent history entry.
2. Subsequent presses: steps backward through older entries.
3. At the oldest entry: no-op (returns `null`, text stays on oldest entry).
4. The cursor is placed at the end of the recalled text.
5. The user can edit the recalled text freely; edits do not modify history.

### Ctrl+S (forward navigation)
1. Steps forward toward newer entries.
2. When past the newest entry: restores the saved draft text.
3. If no navigation is in progress (cursor at reset): no-op.

### Submit behavior
1. `push()` adds the submitted text to history and resets the cursor.
2. The saved draft is cleared on submit.
3. The controller is cleared by InputArea's existing `_handleSubmit` (line 90-95 of
   input-area.ts which calls `this.controller.clear()`).

### Draft preservation
- The draft is the text that was in the input field before the user started
  navigating history.
- It is saved on the first Ctrl+R press (when `isAtReset` is true).
- It is restored when Ctrl+S returns to the newest position (when `next()` returns `''`).
- It is discarded on submit.
- If the user presses Ctrl+R with an empty input, the draft is `''`, which is the correct
  restore value when Ctrl+S cycles back.

---

## Listener Chain Analysis

Understanding the full notification chain is critical to ensure no double-rebuilds or
missed updates occur.

### When `this.inputController.text = prev` is called (Ctrl+R):

```
1. TextEditingController.text setter (text-field.ts:101-108)
   - Sets _text = prev
   - Clamps _cursorPosition
   - Calls notifyListeners()

2. Listener: InputAreaState._onTextChanged (input-area.ts:78-88)
   - Reads controller.text, updates currentText
   - Checks if shell mode changed (detectShellMode)
   - If shell mode changed: calls this.setState(() => {}) -- InputAreaState rebuilds
   - If shell mode unchanged: no setState, no extra rebuild

3. Listener: TextFieldState._onControllerChanged (text-field.ts:687-691)
   - Calls this.setState() -- always triggers TextField rebuild
   - Calls widget.onChanged?.(text) -- fires if handler exists

4. After step 1: AppStateWidget calls this.inputController.cursorPosition = prev.length
   - TextEditingController.cursorPosition setter (text-field.ts:116-121)
   - Calls notifyListeners() again
   - Steps 2-3 repeat, but since text didn't change, _onTextChanged short-circuits
   - TextFieldState._onControllerChanged triggers another rebuild (cursor moved)
```

This is the same listener behavior as when the user types a character. The double-notify
(text + cursor) is acceptable -- the framework batches rebuilds within the same frame.

### Optimization note

To avoid the double-notify, the controller's `text` setter could be bypassed in favor of
directly setting both `_text` and `_cursorPosition` then calling `notifyListeners()` once.
However, this would require adding a method like `setTextAndCursor(text, pos)` to
`TextEditingController`. This is a nice-to-have optimization for a future PR and is not
necessary for correctness.

---

## Testing Plan

### Unit tests for PromptHistory (`state/history.ts`)

1. `isAtReset` returns true initially.
2. `isAtReset` returns false after calling `previous()`.
3. `isAtReset` returns true after `resetCursor()`.
4. `isAtReset` returns true after `next()` cycles past the newest entry.
5. `previous()` returns null for empty history (isAtReset stays true).

### Integration tests for App (keyboard handler)

1. Type "first", submit. Type "second", submit. Press Ctrl+R: input shows "second".
2. Press Ctrl+R again: input shows "first".
3. Press Ctrl+S: input shows "second".
4. Press Ctrl+S again: input shows "" (or restored draft if one was typed).
5. Type "draft text", press Ctrl+R: input shows "second". Press Ctrl+S twice: input
   shows "draft text".
6. Press Ctrl+R to recall "second", edit to "second modified", submit: history now
   contains "first", "second", "second modified". Original "second" is unchanged.
7. Ctrl+R sets cursor at end of recalled text (cursorPosition === text.length).

### Widget tests for InputArea (controller hoisting)

1. Create InputArea with external controller. Set `controller.text = "hello"`.
   Verify TextField renders "hello".
2. Create InputArea without external controller (fallback). Type characters.
   Verify they appear (backward compatibility).
3. Create InputArea with external controller. Call `controller.insertText("@file.ts ")`.
   Verify text is inserted at cursor position.

### Edge cases

1. Ctrl+R with empty history: no-op, input unchanged.
2. Ctrl+S without prior Ctrl+R: no-op (next() returns null when cursor is -1).
3. Ctrl+R at oldest entry: stays on oldest, no wrap-around.
4. Submit clears draft state and resets cursor.
5. Rapid Ctrl+R presses do not accumulate stale drafts (draft saved only on first press).
6. Shell mode detection (`$` prefix) works correctly with history-injected text.
7. Multi-line history entries (if any exist) preserve newlines correctly.
8. Setting `controller.text` to the same value as current text is a no-op (the
   TextEditingController setter short-circuits on `this._text === value`).

---

## Impact Assessment

- **Risk**: Low. The controller-hoisting pattern is standard in Flutter and flitter. The
  `TextEditingController` API (`text` setter, `cursorPosition` setter, `insertText()`)
  already exists and is well-tested in `text-field.ts`.
- **Regression risk**: Minimal. InputArea falls back to creating its own controller when
  none is passed, so existing usage without the controller prop is unchanged. All existing
  tests that create InputArea without a controller will continue to work.
- **Performance**: No meaningful impact. Setting `controller.text` triggers
  `notifyListeners()` which triggers a single rebuild of the TextField -- the same
  codepath as typing a character. The double-notify from setting text + cursor is batched
  within the same frame by the scheduler.
- **Autocomplete compatibility**: The `Autocomplete` widget receives the same controller
  reference (`this.controller`) in `InputAreaState.build()`. Since hoisting does not change
  the controller instance used within InputAreaState, Autocomplete continues to function.
- **Additional fix**: The FilePicker `@file` insertion TODO (app.ts:341) is resolved as a
  side effect of the same controller hoisting.
- **Lines changed**: Approximately 25 lines added/modified across 4 files. No deletions
  of production logic, only replacement of broken code with working code.

---

## Relationship to Adjacent Gaps

- **Gap 52 (history-size-wiring)**: Depends on PromptHistory being functional. This fix
  must land first.
- **Gap 53 (history-persistence)**: Persistence across sessions requires the history to
  actually work within a session. This fix must land first.
- **Gap 25 (file-picker-onselect)**: The FilePicker `@file` insertion is resolved by
  Step 8 of this fix. Gap 25 can be closed simultaneously.
- **Gap 24 (editor-integration)**: Ctrl+G to open `$EDITOR` has a similar need to inject
  edited text back into the input field. The hoisted controller enables that future fix.
