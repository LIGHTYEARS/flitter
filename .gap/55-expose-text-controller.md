# S09: TextEditingController is Private in InputAreaState

## Status: CRITICAL GAP
## Priority: P0
## Gap ID: 55
## Affected files:
- `packages/flitter-amp/src/widgets/input-area.ts`
- `packages/flitter-amp/src/widgets/bottom-grid.ts`
- `packages/flitter-amp/src/app.ts`
- `packages/flitter-amp/src/state/history.ts`

---

## Problem Statement

The `TextEditingController` in `InputAreaState` is declared as a private field
(line 65 of `input-area.ts`):

```typescript
class InputAreaState extends State<InputArea> {
  private controller = new TextEditingController();
  // ...
}
```

Because the controller is private to `InputAreaState`, no ancestor widget can
read or mutate the text field's content. This blocks three distinct features
that are currently broken or stubbed out:

1. **Prompt history injection (Ctrl+R/Ctrl+S)** -- `AppStateWidget` navigates
   `PromptHistory` but cannot set the recalled text into the input. The handler
   at `app.ts:196-203` explicitly acknowledges this with a TODO comment and
   falls back to a no-op `setState(() => {})`.

2. **FilePicker path insertion** -- When the user selects a file from the
   FilePicker overlay, the `onSelect` handler at `app.ts:339-342` cannot insert
   `@filePath` into the input. Another TODO comment marks this gap.

3. **External text manipulation** -- Any future feature requiring programmatic
   text injection (e.g., Ctrl+G `$EDITOR` integration from Gap 24, paste-from-
   clipboard at the App level, or template insertion from CommandPalette) is
   blocked by the same encapsulation boundary.

### Why This is Critical

The `TextEditingController` is the sole gateway to the input field's text state.
Unlike typical UI state that can be driven by props, text editing state is
inherently bidirectional: the user types (bottom-up), and external systems
inject (top-down). The controller pattern exists precisely to solve this by
acting as a shared mutable reference. Making it private defeats this purpose
and renders all top-down text manipulation impossible.

---

## Root Cause Analysis

### The Encapsulation Trap

`InputAreaState` follows the default StatefulWidget pattern: create resources
in `initState()`, store them as private fields, and dispose them in `dispose()`.
This is correct for resources that only the State itself needs. But a
`TextEditingController` is fundamentally different -- it is a *shared coordination
point* between the widget that renders the text and any ancestor that needs to
drive the text content programmatically.

The Flutter framework solves this with the controller-hoisting pattern: the
widget that needs external access creates the controller and passes it down as
a prop. The child widget uses the provided controller instead of creating its
own. Flutter's own `TextField` implements this as its primary API:

```dart
// Flutter's TextField accepts an external controller
TextField(controller: myController, ...)
```

The flitter-core `TextField` (in `text-field.ts`) already supports this
pattern -- it accepts an optional `controller` prop (line 593) and either uses
the provided one or creates an internal fallback (lines 666-672):

```typescript
// text-field.ts lines 666-672
if (this.widget.controller) {
  this._controller = this.widget.controller;
  this._ownsController = false;
} else {
  this._controller = new TextEditingController();
  this._ownsController = true;
}
```

`InputArea`, however, never adopted this pattern. It hardcodes the controller
creation with no external injection point.

### Broken Data Flow

The current (broken) data flow when the user presses Ctrl+R:

```
User presses Ctrl+R
  --> AppStateWidget.onKey handler (app.ts:196)
    --> this.promptHistory.previous()     // returns "old prompt text"
    --> this.setState(() => {})           // triggers rebuild, but...
      --> BottomGrid rebuilt with same props (no controller/text prop)
        --> InputArea rebuilt, but InputAreaState keeps its own controller
          --> TextEditingController.text is still "" -- nothing displayed
```

The `setState(() => {})` triggers a rebuild of the entire tree, but rebuilds
do not replace the `State` object. `InputAreaState` and its private controller
survive the rebuild unchanged. The controller's `text` property remains
whatever the user last typed (or empty), not the history entry.

### Widget Tree Path

The controller must be accessible across this widget hierarchy:

```
AppStateWidget                    <-- needs controller for Ctrl+R/S, FilePicker, Ctrl+G
  --> Column
    --> BottomGrid                <-- pass-through layer
      --> InputArea               <-- currently owns controller privately
        --> InputAreaState
          --> Autocomplete        <-- also receives controller (line 132)
            --> TextField         <-- renders using controller
```

---

## Proposed Solution: Controller Hoisting

The fix applies the standard Flutter controller-hoisting pattern. The parent
that needs text access (`AppStateWidget`) creates and owns the
`TextEditingController`, then passes it down through `BottomGrid` and
`InputArea` as a prop. This is the same pattern already used by flitter-core's
`TextField`.

### Design Principles

1. **Optional external controller** -- `InputArea` accepts an optional
   `controller` prop. When omitted, it creates its own (backward compatible).
2. **Ownership tracking** -- `InputAreaState` tracks whether it owns the
   controller (and therefore should dispose it) or received it externally.
3. **No bidirectional sync** -- There is no `text` string prop that needs to be
   synchronized with the controller. The controller IS the shared state. This
   avoids the fragile two-source-of-truth problem.
4. **Minimal surface change** -- The controller passes through `BottomGrid` as
   a transparent forwarding prop. `BottomGrid` does not use it.
5. **Lifecycle correctness** -- `didUpdateWidget` handles runtime swaps between
   external and internal controllers, migrating listeners safely.

---

## Detailed Implementation: Step by Step

### Step 1: Add `controller` Prop to `InputAreaProps`

**File:** `packages/flitter-amp/src/widgets/input-area.ts`

Add the optional controller to the props interface and the `InputArea` widget
class. The prop is named `controller` in the interface (following the Flutter
convention) and stored as `externalController` on the widget to distinguish it
from the effective controller used inside the State.

```typescript
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
  controller?: TextEditingController;              // NEW
}

export class InputArea extends StatefulWidget {
  readonly onSubmit: (text: string) => void;
  readonly isProcessing: boolean;
  readonly mode: string | null;
  readonly submitWithMeta: boolean;
  readonly topWidget?: Widget;
  readonly autocompleteTriggers?: AutocompleteTrigger[];
  readonly imageAttachments: number;
  readonly skillCount: number;
  readonly overlayTexts: BorderOverlayText[];
  readonly externalController?: TextEditingController;  // NEW

  constructor(props: InputAreaProps) {
    super({});
    this.onSubmit = props.onSubmit;
    this.isProcessing = props.isProcessing;
    this.mode = props.mode;
    this.submitWithMeta = props.submitWithMeta ?? false;
    this.topWidget = props.topWidget;
    this.autocompleteTriggers = props.autocompleteTriggers;
    this.imageAttachments = props.imageAttachments ?? 0;
    this.skillCount = props.skillCount ?? 0;
    this.overlayTexts = props.overlayTexts ?? [];
    this.externalController = props.controller;         // NEW
  }

  createState(): InputAreaState {
    return new InputAreaState();
  }
}
```

### Step 2: Update `InputAreaState` to Use External Controller

Replace the hardcoded private controller with ownership-aware initialization
that mirrors the pattern from `TextFieldState` (text-field.ts:662-672). The
critical additions are:

- **`ownsController` flag** to track disposal responsibility
- **`initState` conditional** that checks for an external controller
- **`didUpdateWidget` hook** that migrates listeners when the controller changes
- **`dispose` guard** that only disposes the controller if internally owned

```typescript
class InputAreaState extends State<InputArea> {
  private controller!: TextEditingController;
  private ownsController = false;
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

  override didUpdateWidget(oldWidget: InputArea): void {
    // Handle controller switching (e.g., parent starts providing one,
    // or parent switches to a different controller instance)
    const oldCtrl = oldWidget.externalController;
    const newCtrl = this.widget.externalController;

    if (oldCtrl !== newCtrl) {
      // Detach from old controller
      this.controller.removeListener(this._onTextChanged);

      // Dispose old internal controller if we owned it
      if (this.ownsController) {
        this.controller.dispose();
      }

      if (newCtrl) {
        // Switching to an external controller
        this.controller = newCtrl;
        this.ownsController = false;
      } else {
        // External controller removed; create an internal one
        this.controller = new TextEditingController();
        this.ownsController = true;
      }

      this.controller.addListener(this._onTextChanged);
    }
  }

  override dispose(): void {
    this.controller.removeListener(this._onTextChanged);
    // Only dispose the controller if we created it
    if (this.ownsController) {
      this.controller.dispose();
    }
    super.dispose();
  }

  // _onTextChanged, _handleSubmit, and build() remain unchanged.
  // They already reference `this.controller` which now resolves to
  // either the external or internal controller transparently.
}
```

**Key detail about `_onTextChanged`:** The callback at lines 78-88 reads
`this.controller.text`, updates `this.currentText`, and calls `setState` only
if the shell mode changed (i.e., `$` or `$$` prefix toggled). When the parent
sets `controller.text` from the Ctrl+R handler, the controller fires
`notifyListeners()`, which invokes `_onTextChanged`. The callback detects the
text change and conditionally rebuilds. No additional wiring is needed.

**Key detail about `Autocomplete`:** The `Autocomplete` widget (lines 130-134
of `input-area.ts`) receives `this.controller`. Since `this.controller` now
transparently resolves to either the external or internal instance, Autocomplete
continues to work without any changes.

**Key detail about `_handleSubmit`:** The submit handler (lines 90-95) calls
`this.controller.clear()`. When the controller is external, this correctly
clears the parent-owned controller, which is the desired behavior -- the parent
sees the controller cleared after submit.

### Step 3: Add `controller` Pass-Through to `BottomGrid`

**File:** `packages/flitter-amp/src/widgets/bottom-grid.ts`

`BottomGrid` is the intermediate widget between `AppStateWidget` and
`InputArea`. It needs to forward the controller prop without using it itself.
This is a pure pass-through addition.

Add the import:

```typescript
import { TextEditingController } from 'flitter-core/src/widgets/text-field';
```

Extend the props interface:

```typescript
interface BottomGridProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  currentMode: string;
  agentName?: string;
  agentMode?: string;
  cwd: string;
  gitBranch?: string;
  tokenUsage?: UsageInfo;
  shellMode?: boolean;
  hintText?: string;
  submitWithMeta?: boolean;
  topWidget?: Widget;
  autocompleteTriggers?: AutocompleteTrigger[];
  imageAttachments?: number;
  skillCount?: number;
  controller?: TextEditingController;              // NEW
}
```

Add the field and constructor assignment:

```typescript
export class BottomGrid extends StatefulWidget {
  // ... existing fields ...
  readonly controller: TextEditingController | undefined;  // NEW

  constructor(props: BottomGridProps) {
    super({});
    // ... existing assignments ...
    this.controller = props.controller;                    // NEW
  }
}
```

Forward to `InputArea` in `BottomGridState.build()`:

```typescript
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
  controller: w.controller,                               // NEW
});
```

### Step 4: Hoist Controller to `AppStateWidget`

**File:** `packages/flitter-amp/src/app.ts`

Create the controller at the App level and pass it down. This is the key change
that gives all App-level keyboard handlers access to the input text.

Add the import:

```typescript
import { TextEditingController } from 'flitter-core/src/widgets/text-field';
```

Add the fields:

```typescript
class AppStateWidget extends State<App> {
  private scrollController = new ScrollController();
  private inputController = new TextEditingController();   // NEW: hoisted controller
  private stateListener: (() => void) | null = null;
  private showCommandPalette = false;
  private showFilePicker = false;
  private fileList: string[] = [];
  private promptHistory = new PromptHistory();
  private _savedDraft: string = '';                        // NEW: draft preservation
  private _lastUpdate = 0;
  private _pendingTimer: ReturnType<typeof setTimeout> | null = null;
  // ...
}
```

Pass it to `BottomGrid` in `build()`:

```typescript
new BottomGrid({
  onSubmit: (text: string) => {
    this.promptHistory.push(text);
    this.promptHistory.resetCursor();        // NEW: reset on submit
    this._savedDraft = '';                   // NEW: clear draft on submit
    this.widget.onSubmit(text);
  },
  isProcessing: appState.isProcessing,
  currentMode: appState.currentMode ?? 'smart',
  agentName: appState.agentName ?? undefined,
  cwd: appState.cwd,
  gitBranch: appState.gitBranch ?? undefined,
  tokenUsage: appState.usage ?? undefined,
  skillCount: appState.skillCount,
  controller: this.inputController,                        // NEW
}),
```

### Step 5: Add `isAtReset` Getter to `PromptHistory`

**File:** `packages/flitter-amp/src/state/history.ts`

The App needs to know whether history navigation is in progress (to decide
when to save the draft vs. overwrite it). Add a simple getter after the
existing `resetCursor()` method:

```typescript
export class PromptHistory {
  // ... existing code ...

  resetCursor(): void {
    this.cursor = -1;
  }

  /** True when no history navigation is in progress. */
  get isAtReset(): boolean {
    return this.cursor === -1;
  }
}
```

This getter is inexpensive (a single integer comparison) and is called once per
Ctrl+R keystroke to determine whether the current input should be saved as a
draft before overwriting it with a history entry.

### Step 6: Fix the Ctrl+R Handler

**File:** `packages/flitter-amp/src/app.ts`

Replace the broken Ctrl+R handler (lines 196-203) with one that uses the
hoisted controller. The new handler:

1. Saves the current input text as a draft on the first press (when `isAtReset`
   is true) so it can be restored later with Ctrl+S.
2. Calls `this.promptHistory.previous()` to step backward.
3. Injects the recalled text into the input via `this.inputController.text`.
4. Positions the cursor at the end of the recalled text.

```typescript
// Ctrl+R -- navigate prompt history (backward)
if (event.ctrlKey && event.key === 'r') {
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

**Why no `setState` is needed at the App level:** Setting
`this.inputController.text` triggers `notifyListeners()` on the controller.
This fires `TextFieldState._onControllerChanged` (text-field.ts:687-691),
which calls `setState()` on the TextField's own State, causing it to rebuild
and render the new text. The rebuild flows bottom-up from the TextField, not
top-down from AppStateWidget. No parent rebuild is required.

### Step 7: Wire Ctrl+S Forward Navigation

**File:** `packages/flitter-amp/src/app.ts`

Add forward navigation immediately after the Ctrl+R block. When the user
presses Ctrl+S past the newest history entry, the saved draft is restored:

```typescript
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

**Note on `PromptHistory.next()` return values:**
- Returns `null` when cursor is at reset (-1), meaning no navigation is active.
- Returns `''` (empty string) when stepping past the newest entry, signaling
  the user wants to return to their fresh input.
- Returns a non-empty string for intermediate history entries.

### Step 8: Fix the FilePicker `onSelect` Handler

**File:** `packages/flitter-amp/src/app.ts`

Replace the stubbed FilePicker `onSelect` (lines 339-342) with actual text
insertion logic. The algorithm handles two scenarios:

**Scenario A:** The user typed `@re` and then opened the file picker. The
text is `"Please review @re"` with cursor at 17. Selecting `README.md` should
replace from the `@` through cursor: `"Please review @README.md "`.

**Scenario B:** The user opened the file picker without typing `@`. The
mention is inserted at the cursor position using `insertText()`.

```typescript
onSelect: (filePath: string) => {
  this.setState(() => { this.showFilePicker = false; });
  // Insert @filePath at cursor, replacing any partial @ trigger
  const text = this.inputController.text;
  const cursor = this.inputController.cursorPosition;
  const textBefore = text.slice(0, cursor);
  const atIndex = textBefore.lastIndexOf('@');
  const mention = `@${filePath} `;

  if (atIndex >= 0) {
    // Replace from '@' through cursor with the full mention
    const before = text.slice(0, atIndex);
    const after = text.slice(cursor);
    this.inputController.text = before + mention + after;
    this.inputController.cursorPosition = atIndex + mention.length;
  } else {
    // No '@' found; insert at cursor
    this.inputController.insertText(mention);
  }
},
```

---

## Listener Chain Analysis

Understanding the full notification chain ensures no double-rebuilds or missed
updates occur.

### When `this.inputController.text = prev` is Called (Ctrl+R)

```
1. TextEditingController.text setter (text-field.ts:101-108)
   - Checks if value === _text; if so, returns early (no-op)
   - Sets _text = prev
   - Clamps _cursorPosition to valid range (0..text.length)
   - Calls notifyListeners()

2. Listener: InputAreaState._onTextChanged (input-area.ts:78-88)
   - Reads controller.text into newText
   - Compares with this.currentText
   - If different: updates currentText, checks detectShellMode()
     - If shell mode changed ('$'/'$$' prefix toggle): calls this.setState()
     - If shell mode unchanged: no setState, no extra rebuild

3. Listener: TextFieldState._onControllerChanged (text-field.ts:687-691)
   - Calls this.setState() -- always triggers TextField rebuild
   - Calls widget.onChanged?.(text)

4. AppStateWidget then sets this.inputController.cursorPosition = prev.length
   - TextEditingController.cursorPosition setter (text-field.ts:116-121)
   - Checks if clamped value === _cursorPosition; if so, returns early
   - Calls notifyListeners() again
   - Step 2 re-fires but short-circuits (text didn't change, currentText matches)
   - Step 3 re-fires, triggering another setState (cursor moved)

5. FrameScheduler batches the pending rebuilds into a single frame.
```

The double-notify (text + cursor) is acceptable. Both listeners fire twice but
the scheduler coalesces rebuilds into a single frame. This is identical to what
happens when the user types a character.

### Optimization Opportunity (Future)

To avoid the double-notify, a `setTextAndCursor(text, pos)` method could be
added to `TextEditingController` that sets both fields and calls
`notifyListeners()` once. This is a nice-to-have and not required for
correctness. The implementation would be:

```typescript
// Potential future addition to TextEditingController
setTextAndCursor(text: string, cursor: number): void {
  const textChanged = this._text !== text;
  this._text = text;
  this._cursorPosition = Math.max(0, Math.min(cursor, text.length));
  this._selectionStart = -1;
  this._selectionEnd = -1;
  if (textChanged || this._cursorPosition !== cursor) {
    this.notifyListeners();  // Single notification for both changes
  }
}
```

---

## Complete Diff Summary

### `packages/flitter-amp/src/state/history.ts`

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

+  override didUpdateWidget(oldWidget: InputArea): void {
+    const oldCtrl = oldWidget.externalController;
+    const newCtrl = this.widget.externalController;
+    if (oldCtrl !== newCtrl) {
+      this.controller.removeListener(this._onTextChanged);
+      if (this.ownsController) {
+        this.controller.dispose();
+      }
+      if (newCtrl) {
+        this.controller = newCtrl;
+        this.ownsController = false;
+      } else {
+        this.controller = new TextEditingController();
+        this.ownsController = true;
+      }
+      this.controller.addListener(this._onTextChanged);
+    }
+  }
+
   override dispose(): void {
     this.controller.removeListener(this._onTextChanged);
+    if (this.ownsController) {
+      this.controller.dispose();
+    }
     super.dispose();
   }

   // _onTextChanged, _handleSubmit, build() -- unchanged
 }
```

### `packages/flitter-amp/src/widgets/bottom-grid.ts`

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
 }

 // In BottomGridState.build():
   const inputArea = new InputArea({
     // ... existing props ...
+    controller: w.controller,
   });
```

### `packages/flitter-amp/src/app.ts`

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
+              // Returned to "new prompt" state -- restore saved draft
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

   // In build() -- BottomGrid instantiation:

          new BottomGrid({
            onSubmit: (text: string) => {
              this.promptHistory.push(text);
+             this.promptHistory.resetCursor();
+             this._savedDraft = '';
              this.widget.onSubmit(text);
            },
            // ... other props ...
+           controller: this.inputController,
          }),

   // FilePicker onSelect:
-              onSelect: (_filePath: string) => {
-                this.setState(() => { this.showFilePicker = false; });
-                // TODO: insert @filePath into InputArea text when controller is exposed
+              onSelect: (filePath: string) => {
+                this.setState(() => { this.showFilePicker = false; });
+                const text = this.inputController.text;
+                const cursor = this.inputController.cursorPosition;
+                const textBefore = text.slice(0, cursor);
+                const atIndex = textBefore.lastIndexOf('@');
+                const mention = `@${filePath} `;
+                if (atIndex >= 0) {
+                  const before = text.slice(0, atIndex);
+                  const after = text.slice(cursor);
+                  this.inputController.text = before + mention + after;
+                  this.inputController.cursorPosition = atIndex + mention.length;
+                } else {
+                  this.inputController.insertText(mention);
+                }
              },
```

---

## Behavioral Specification

### Ctrl+R (Backward Navigation)

1. First press: saves current input as draft, recalls most recent history entry.
2. Subsequent presses: steps backward through older entries.
3. At the oldest entry: no-op (returns `null`, text stays on oldest entry).
4. The cursor is placed at the end of the recalled text.
5. The user can edit the recalled text freely; edits do not modify history.

### Ctrl+S (Forward Navigation)

1. Steps forward toward newer entries.
2. When past the newest entry: restores the saved draft text.
3. If no navigation is in progress (cursor at reset): no-op.

### Submit Behavior

1. `push()` adds the submitted text to history and resets the cursor.
2. The saved draft is cleared on submit.
3. The controller is cleared by InputArea's existing `_handleSubmit` (lines
   90-95 of `input-area.ts` which calls `this.controller.clear()`).

### Draft Preservation

- The draft is the text that was in the input field before the user started
  navigating history.
- It is saved on the first Ctrl+R press (when `isAtReset` is true).
- It is restored when Ctrl+S returns to the newest position (`next()` returns
  `''`).
- It is discarded on submit.
- If the user presses Ctrl+R with an empty input, the draft is `''`, which is
  the correct restore value when Ctrl+S cycles back.

### FilePicker Selection

- When `@` exists before cursor: replaces from `@` through cursor with
  `@filePath `.
- When no `@` exists: inserts `@filePath ` at cursor position.
- A trailing space is appended so the user can continue typing immediately.
- Cursor is positioned at the end of the inserted mention.

---

## Alternative Approaches Considered and Rejected

### Alternative 1: Text Prop with `didUpdateWidget` Sync

Instead of hoisting the controller, pass a `text` string prop to `InputArea`
and use `didUpdateWidget` to set `controller.text` when the prop changes.

**Rejected because:**
- Creates a fragile two-source-of-truth problem: the controller has its own
  text, and the prop has a separate text value.
- Requires bidirectional sync: user typing must propagate up via `onChanged`,
  and parent changes must propagate down via the prop.
- Race conditions are possible when both directions fire in the same frame.
- This pattern is explicitly discouraged by the Flutter documentation for
  text fields.

### Alternative 2: GlobalKey-Based State Access

Use a `GlobalKey<InputAreaState>` to reach into the State and call methods
on the controller.

**Rejected because:**
- Anti-pattern in Flutter/flitter: tightly couples parent to child internals.
- Breaks if the widget tree changes (e.g., a new intermediate widget is added).
- `InputAreaState` is not exported (the class is module-private), so it
  would need to be exported just for this purpose.
- Does not work with the widget reconciliation system if keys change.

### Alternative 3: Callback Props for Text Injection

Add an `onTextInjection` callback prop to `InputArea` that the State subscribes
to.

**Rejected because:**
- Inverts the natural data flow. The controller already provides a clean
  imperative API (`text` setter, `insertText()`).
- Requires additional state management (a Listenable or similar) to bridge
  between the parent's imperative `inject(text)` call and the child's
  callback-based reception.
- More complex than controller hoisting with no benefits.

### Alternative 4: InheritedWidget / Provider Pattern

Create an `InputControllerProvider` InheritedWidget that makes the controller
available to any descendant via `context`.

**Rejected for now because:**
- Over-engineered for this use case: only `AppStateWidget` needs the controller.
- The direct prop-passing chain is only 3 levels deep (App -> BottomGrid ->
  InputArea), which is well within acceptable prop-drilling depth.
- Could be revisited if more widgets need controller access in the future.

---

## Testing Plan

### Unit Tests for `PromptHistory`

1. `isAtReset` returns `true` initially.
2. `isAtReset` returns `false` after calling `previous()`.
3. `isAtReset` returns `true` after `resetCursor()`.
4. `isAtReset` returns `true` after `next()` cycles past the newest entry.
5. `previous()` returns `null` for empty history (`isAtReset` stays `true`).

### Integration Tests for Controller Hoisting

1. Create `InputArea` with external controller. Set `controller.text = "hello"`.
   Verify `TextField` renders "hello".
2. Create `InputArea` without external controller (fallback). Type characters.
   Verify they appear (backward compatibility).
3. Create `InputArea` with external controller. Call
   `controller.insertText("@file.ts ")`. Verify text is inserted at cursor.
4. Switch from external controller to no controller (`didUpdateWidget` path).
   Verify internal controller is created and listener is migrated.
5. Switch from no controller to external controller (`didUpdateWidget` path).
   Verify external controller is adopted and listener is attached.
6. Dispose `InputArea` with external controller. Verify the external controller
   is NOT disposed (it belongs to the parent).
7. Dispose `InputArea` with internal controller. Verify the internal controller
   IS disposed.

### Integration Tests for Keyboard Handlers

1. Type "first", submit. Type "second", submit. Ctrl+R: input shows "second".
2. Ctrl+R again: input shows "first".
3. Ctrl+S: input shows "second".
4. Ctrl+S again: input shows "" (restored empty draft).
5. Type "draft text", Ctrl+R: shows "second". Ctrl+S twice: shows "draft text".
6. Ctrl+R to recall "second", edit to "second modified", submit: history now
   contains ["first", "second", "second modified"]. Original unchanged.
7. Ctrl+R sets cursor at end of recalled text (`cursorPosition === text.length`).

### FilePicker Integration Tests

1. Input is `"hello @re"` with cursor at 9. Select `"README.md"`. Verify result
   is `"hello @README.md "` with cursor at 18.
2. Input is `"hello"` with cursor at 5, no `@`. Select `"README.md"`. Verify
   `"@README.md "` is inserted at cursor.
3. Input is empty. Select `"src/main.ts"`. Verify result is `"@src/main.ts "`.

### Edge Cases

1. Ctrl+R with empty history: no-op, input unchanged.
2. Ctrl+S without prior Ctrl+R: no-op (`next()` returns `null`).
3. Ctrl+R at oldest entry: stays on oldest, no wrap-around.
4. Submit clears draft and resets cursor.
5. Rapid Ctrl+R presses do not accumulate stale drafts (saved only on first).
6. Shell mode detection (`$` prefix) works with history-injected text.
7. Setting `controller.text` to the same value is a no-op (setter short-circuits
   on `this._text === value`).
8. Controller swap during active text change listener does not throw.
9. Dispose during active listener notification does not throw.

---

## Impact Assessment

- **Risk**: Low. The controller-hoisting pattern is standard in Flutter and
  flitter. The `TextEditingController` API (`text` setter, `cursorPosition`
  setter, `insertText()`) already exists and is well-tested.
- **Regression risk**: Minimal. `InputArea` falls back to creating its own
  controller when none is passed. All existing call sites that omit the
  `controller` prop are unchanged.
- **Performance**: No meaningful impact. Setting `controller.text` triggers
  `notifyListeners()` which causes a single rebuild of the TextField -- the
  same codepath as typing a character.
- **Autocomplete compatibility**: `Autocomplete` receives the same controller
  reference in `InputAreaState.build()`. Since hoisting does not change the
  controller instance used within the State, Autocomplete continues to work.
- **`_handleSubmit` compatibility**: The submit handler calls
  `this.controller.clear()`. With an external controller, this clears the
  parent-owned controller, which is correct -- the parent can observe the
  cleared state.
- **`ChangeNotifier.dispose()` safety**: The `ChangeNotifier` base class
  (in `listenable.ts`) sets a `_disposed` flag and throws on subsequent
  `addListener` calls. The `ownsController` flag ensures dispose is only
  called on internally-created controllers, preventing double-dispose of
  externally-owned ones.
- **Lines changed**: Approximately 70 lines added/modified across 4 files.
  No deletions of production logic beyond replacing broken TODO stubs.

---

## Relationship to Adjacent Gaps

| Gap | Relationship |
|-----|-------------|
| **#51 (prompt-history-fix)** | This gap is the implementation prerequisite. Gap 51 describes the same problem from the prompt-history perspective. This gap (#55) is the controller-exposure solution that unblocks it. Solving #55 also solves #51. |
| **#25 (file-picker-onselect)** | Resolved by Step 8 of this fix. The FilePicker TODO is replaced with working insertion logic. |
| **#24 (editor-integration)** | Ctrl+G `$EDITOR` needs to read the current input and write back edited text. The hoisted controller enables this future fix. Once the controller is hoisted, the Ctrl+G handler can do `const text = this.inputController.text` to get the current draft, open the editor, and then `this.inputController.text = editedText` to write back the result. |
| **#52 (history-size-wiring)** | Depends on history being functional. This fix must land first. |
| **#53 (history-persistence)** | Persistence across sessions requires history to work within a session. This fix must land first. |
| **#30 (shortcut-registry)** | If a centralized shortcut registry is implemented, the Ctrl+R/Ctrl+S handlers would move into registered actions. The hoisted controller would be passed to those actions as a dependency. No conflict. |
| **#56 (prompt-history-tests)** | Test gap that depends on history being functional. The test plan in this document covers the test requirements. |

---

## Implementation Order

The steps must be applied in this order to avoid compile errors:

1. **Step 5**: Add `isAtReset` to `PromptHistory` (no dependencies).
2. **Step 1**: Add `controller` prop to `InputAreaProps` and `InputArea`.
3. **Step 2**: Update `InputAreaState` with ownership tracking and
   `didUpdateWidget`.
4. **Step 3**: Add `controller` pass-through to `BottomGrid`.
5. **Step 4**: Hoist controller in `AppStateWidget` and pass to `BottomGrid`.
6. **Step 6**: Fix Ctrl+R handler.
7. **Step 7**: Add Ctrl+S handler.
8. **Step 8**: Fix FilePicker `onSelect`.

Steps 1-5 can be done in a single commit since they form the mechanical
controller-hoisting change. Steps 6-8 are the feature-level fixes that use
the hoisted controller.

---

## Appendix: `TextEditingController` API Reference

The following methods from `TextEditingController` (defined in
`packages/flitter-core/src/widgets/text-field.ts`) are used by this fix:

| Method / Property | Type | Description |
|-------------------|------|-------------|
| `text` (getter) | `string` | Returns the current text content. |
| `text` (setter) | `string` | Sets text, clamps cursor, calls `notifyListeners()`. No-ops if value unchanged. |
| `cursorPosition` (getter) | `number` | Returns current cursor position (0-indexed). |
| `cursorPosition` (setter) | `number` | Sets cursor (clamped to 0..text.length), calls `notifyListeners()`. No-ops if unchanged. |
| `insertText(text)` | `void` | Inserts at cursor or replaces selection. Advances cursor. Calls `notifyListeners()`. |
| `clear()` | `void` | Resets text to `''`, cursor to 0, clears selection. Calls `notifyListeners()`. |
| `addListener(cb)` | `void` | Registers a change listener. Throws if disposed. |
| `removeListener(cb)` | `void` | Unregisters a change listener. |
| `dispose()` | `void` | Marks as disposed, clears all listeners. |
