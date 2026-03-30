# Gap U03: FilePicker onSelect Handler Cannot Inject File Path Into Input

## Problem Statement

The `FilePicker` widget in flitter-amp renders correctly and presents a
`SelectionList` of files. When the user selects a file, the `onSelect` callback
fires, but it cannot inject the selected file path (as an `@filePath` mention)
into the `InputArea`'s text field. The callback in `app.ts` (line 339-342) is a
placeholder that only dismisses the picker:

```typescript
// app.ts lines 339-342
onSelect: (_filePath: string) => {
  this.setState(() => { this.showFilePicker = false; });
  // TODO: insert @filePath into InputArea text when controller is exposed
},
```

The root cause is that `InputAreaState` creates and owns the
`TextEditingController` as a private field (line 65 of `input-area.ts`):

```typescript
class InputAreaState extends State<InputArea> {
  private controller = new TextEditingController();
  // ...
}
```

Because the controller is private to `InputAreaState`, the parent widget
(`AppStateWidget` in `app.ts`) has no way to programmatically set, append, or
insert text into the input field. This blocks three features:

1. **FilePicker onSelect** -- Cannot insert `@selectedFile` into the input.
2. **Ctrl+R prompt history** (app.ts line 199) -- Cannot inject recalled prompts.
3. **Ctrl+G $EDITOR integration** (Gap U02, #24) -- Cannot inject edited text back.

## Affected Files

| File | Role |
|------|------|
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/input-area.ts` | `InputAreaState` owns the private `TextEditingController` (line 65); needs to accept an external controller |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` | `AppStateWidget` creates `FilePicker` with placeholder `onSelect` (line 339); also has `BottomGrid` / `InputArea` creation (line 254-266); needs controller access |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/file-picker.ts` | `FilePicker` widget; correctly wires `onSelect` to `SelectionList`; no changes needed |
| `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/bottom-grid.ts` | Creates `InputArea` (line 95); must forward an external controller prop |
| `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/text-field.ts` | Defines `TextEditingController` with `text` setter, `insertText()`, `cursorPosition` setter; no changes needed |

## What Already Exists

### TextEditingController API

The `TextEditingController` class (`text-field.ts` lines 81-191) already
provides all the text manipulation methods needed:

- **`text` (getter/setter)** -- Get or replace the entire text content.
  The setter clamps the cursor position and calls `notifyListeners()`.
- **`cursorPosition` (getter/setter)** -- Get or set cursor position.
- **`insertText(text: string)`** -- Insert text at cursor (or replace selection).
  Automatically advances cursor past the inserted content.
- **`clear()`** -- Reset text to empty and cursor to 0.

### FilePicker Widget

`FilePicker` (`file-picker.ts`) is a complete `StatelessWidget`:

- Receives `files: string[]`, `onSelect: (filePath: string) => void`, and
  `onDismiss: () => void` via its constructor.
- Renders a themed `Container` with a `SelectionList` inside a `FocusScope`.
- When the user selects an item, `SelectionList` calls `this.onSelect` with the
  file path string (the `value` of the selected `SelectionItem`).
- No changes are needed in this widget.

### InputArea's Internal Controller

`InputAreaState` (lines 64-242 of `input-area.ts`) creates its own
`TextEditingController` at line 65 and wires it to:

1. A text change listener (`_onTextChanged`, line 78) that detects shell mode
   changes (`$` and `$$` prefixes) and triggers rebuilds.
2. The `TextField` widget (line 111-118) for rendering and keyboard input.
3. The `Autocomplete` wrapper (line 130-134) for `@`-trigger completions.
4. The `_handleSubmit` callback (line 90-95) which reads `text` and calls
   `controller.clear()` after submission.

### Autocomplete's @ Trigger

`InputArea` already sets up a default `@` autocomplete trigger (lines 120-123):

```typescript
const defaultFileTrigger: AutocompleteTrigger = {
  triggerCharacter: '@',
  optionsBuilder: () => [],
};
```

This trigger currently returns an empty list, meaning it never shows
autocomplete options. The `FilePicker` overlay is a separate mechanism from
the `Autocomplete` inline popup -- it is rendered as a `Stack` overlay in
`app.ts` rather than as inline autocomplete suggestions. Both mechanisms
target `@file` mentions but via different UX paths.

## Proposed Fix: Lift the TextEditingController

### Design Rationale

The standard Flutter/Amp pattern for shared text controller access is
**controller lifting**: the parent widget creates the `TextEditingController`
and passes it down as a prop. The child widget uses the provided controller
instead of creating its own.

This is the same pattern used by Flutter's `TextField`, which accepts an
optional `controller` prop. When provided, the widget uses it; when omitted,
the widget creates an internal one. This ensures backward compatibility.

Controller lifting is preferred over alternatives (e.g., callback props or
`GlobalKey`-based state access) because:

1. It is idiomatic to the framework's architecture.
2. It solves multiple gaps simultaneously (FilePicker, Ctrl+R, Ctrl+G).
3. It keeps the data flow explicit and unidirectional.
4. It requires minimal code changes with no architectural disruption.

### Step 1: Modify InputArea to Accept an External Controller

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/input-area.ts`

Add an optional `controller` prop to `InputAreaProps` and update `InputAreaState`
to use it when provided:

```typescript
// --- InputAreaProps: add optional controller ---

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
  controller?: TextEditingController;          // <-- NEW
}
```

Update the `InputArea` widget class to store the prop:

```typescript
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
  readonly externalController?: TextEditingController;   // <-- NEW

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
    this.externalController = props.controller;          // <-- NEW
  }

  createState(): InputAreaState {
    return new InputAreaState();
  }
}
```

Update `InputAreaState` to use the external controller when provided, falling
back to creating an internal one otherwise:

```typescript
class InputAreaState extends State<InputArea> {
  private _ownController: TextEditingController | null = null;
  private currentText = '';

  /**
   * Resolve the effective controller. If the widget provides an external
   * controller, use it. Otherwise, use the internally created one.
   */
  private get controller(): TextEditingController {
    return this.widget.externalController ?? this._ownController!;
  }

  override initState(): void {
    super.initState();
    if (!this.widget.externalController) {
      this._ownController = new TextEditingController();
    }
    this.controller.addListener(this._onTextChanged);
  }

  override didUpdateWidget(oldWidget: InputArea): void {
    // Handle controller switching between external and internal
    const oldController = oldWidget.externalController ?? this._ownController!;
    const newController = this.widget.externalController ?? this._ownController!;

    if (oldController !== newController) {
      oldController.removeListener(this._onTextChanged);
      // If we just switched from external to internal, create a new one
      if (!this.widget.externalController && !this._ownController) {
        this._ownController = new TextEditingController();
      }
      newController.addListener(this._onTextChanged);
    }
  }

  override dispose(): void {
    this.controller.removeListener(this._onTextChanged);
    super.dispose();
  }

  // ... _onTextChanged and _handleSubmit remain identical,
  // but reference this.controller (the getter) instead of a private field.
}
```

### Step 2: Forward Controller Through BottomGrid

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/bottom-grid.ts`

Add an optional `controller` prop to `BottomGridProps`:

```typescript
interface BottomGridProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
  currentMode: string;
  // ... existing props ...
  controller?: TextEditingController;   // <-- NEW
}
```

Store it in the `BottomGrid` widget:

```typescript
export class BottomGrid extends StatefulWidget {
  // ... existing fields ...
  readonly controller: TextEditingController | undefined;  // <-- NEW

  constructor(props: BottomGridProps) {
    super({});
    // ... existing assignments ...
    this.controller = props.controller;                    // <-- NEW
  }
}
```

Pass it through to `InputArea` in `BottomGridState.build()`:

```typescript
// In BottomGridState.build(), line 95:
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
  controller: w.controller,          // <-- NEW: forward to InputArea
});
```

### Step 3: Create and Use Controller in AppStateWidget

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts`

Add a controller field to `AppStateWidget` and pass it down:

```typescript
import { TextEditingController } from 'flitter-core/src/widgets/text-field';

class AppStateWidget extends State<App> {
  private scrollController = new ScrollController();
  private inputController = new TextEditingController();  // <-- NEW
  // ... other fields ...
```

Pass the controller to `BottomGrid` in the `build()` method:

```typescript
// In AppStateWidget.build(), around line 254:
new BottomGrid({
  onSubmit: (text: string) => {
    this.promptHistory.push(text);
    this.widget.onSubmit(text);
  },
  isProcessing: appState.isProcessing,
  currentMode: appState.currentMode ?? 'smart',
  agentName: appState.agentName ?? undefined,
  cwd: appState.cwd,
  gitBranch: appState.gitBranch ?? undefined,
  tokenUsage: appState.usage ?? undefined,
  skillCount: appState.skillCount,
  controller: this.inputController,              // <-- NEW
}),
```

### Step 4: Wire FilePicker onSelect to Insert @filePath

**File:** `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts`

Replace the placeholder `onSelect` handler (lines 339-342) with actual text
insertion logic:

```typescript
// In the FilePicker overlay section (around line 337):
new FilePicker({
  files: this.fileList,
  onSelect: (filePath: string) => {
    this.setState(() => { this.showFilePicker = false; });

    // Insert @filePath into the input text at the current cursor position.
    // If the user already typed a partial '@' trigger, we need to find and
    // replace from the trigger start. For simplicity (and since the
    // FilePicker is an overlay, not inline autocomplete), we insert at cursor.
    const controller = this.inputController;
    const mention = `@${filePath} `;

    // Check if there is already a partial '@' before the cursor that
    // triggered the file picker, and replace from that position.
    const text = controller.text;
    const cursor = controller.cursorPosition;
    const textBefore = text.slice(0, cursor);
    const atIndex = textBefore.lastIndexOf('@');

    if (atIndex >= 0) {
      // Replace from '@' through cursor with the full mention
      const before = text.slice(0, atIndex);
      const after = text.slice(cursor);
      controller.text = before + mention + after;
      controller.cursorPosition = atIndex + mention.length;
    } else {
      // No '@' found; just insert at cursor
      controller.insertText(mention);
    }
  },
  onDismiss: () => {
    this.setState(() => { this.showFilePicker = false; });
  },
}),
```

### Step 5: Wire Ctrl+R Prompt History (Bonus)

With the controller now accessible, the Ctrl+R handler (line 196-202) can also
be fixed:

```typescript
// Ctrl+R -- navigate prompt history (backward)
if (event.ctrlKey && event.key === 'r') {
  const prev = this.promptHistory.previous();
  if (prev !== null) {
    this.inputController.text = prev;
    this.inputController.cursorPosition = prev.length;
  }
  return 'handled';
}
```

## Detailed Diff Summary

### input-area.ts Changes

| Line(s) | Change |
|---------|--------|
| 21-31 (InputAreaProps) | Add optional `controller?: TextEditingController` field |
| 35-57 (InputArea class) | Add `externalController` readonly field; assign from `props.controller` |
| 65 (InputAreaState) | Replace `private controller = new TextEditingController()` with `_ownController: TextEditingController \| null = null` and a getter |
| 68-71 (initState) | Conditionally create `_ownController` only when no external controller is provided |
| New (didUpdateWidget) | Add `didUpdateWidget` to handle controller switching |
| 73-76 (dispose) | Use `this.controller` getter instead of direct field |
| 78-95 (callbacks) | No logic changes; they already use `this.controller` |
| 97-242 (build) | No changes; already references `this.controller` |

### bottom-grid.ts Changes

| Line(s) | Change |
|---------|--------|
| 15-31 (BottomGridProps) | Add optional `controller?: TextEditingController` |
| 33-67 (BottomGrid class) | Add `controller` readonly field; assign from props |
| 95-105 (InputArea creation) | Forward `controller: w.controller` |

### app.ts Changes

| Line(s) | Change |
|---------|--------|
| 8 (imports) | Add `TextEditingController` import |
| 73-74 (AppStateWidget fields) | Add `inputController = new TextEditingController()` |
| 196-202 (Ctrl+R handler) | Replace TODO with `inputController.text = prev` |
| 254-266 (BottomGrid creation) | Add `controller: this.inputController` prop |
| 339-342 (FilePicker onSelect) | Replace TODO with `@filePath` insertion logic |

## Text Insertion Algorithm

The `onSelect` handler must handle two scenarios:

### Scenario A: User Typed a Partial `@` Trigger

The user typed `@re` and then opened the file picker via some trigger mechanism.
The input text is `"Please review @re"` with cursor at position 17. The user
selects `README.md` from the picker.

```
Before: "Please review @re"     cursor=17
                     ^--- atIndex=14

Replace text[14..17] with "@README.md "

After:  "Please review @README.md "   cursor=29
```

The algorithm:
1. Find the last `@` before the cursor in `textBefore`.
2. Replace from `atIndex` through `cursor` with `@filePath `.
3. Set cursor to end of inserted mention.

### Scenario B: No Partial `@` in Text

The user opened the file picker via a keyboard shortcut or menu without typing
`@`. The input text is `"Hello world"` with cursor at position 5.

```
Before: "Hello world"    cursor=5

insertText("@README.md ") at cursor

After:  "Hello@README.md  world"   cursor=17
```

In practice, the FilePicker is typically triggered by typing `@`, so Scenario A
is the common path. Scenario B is a defensive fallback.

### Trailing Space

A trailing space is appended after the mention (`@filePath `) so the user can
continue typing immediately without needing to manually insert a separator.
This matches the behavior of Amp's `@file` mentions and common chat applications.

## Edge Cases

### Empty File List

If `this.fileList` is empty, the `showFilePicker` condition in `app.ts`
(line 329: `this.showFilePicker && this.fileList.length > 0`) prevents the
`FilePicker` from rendering at all. The `onSelect` handler is never reachable
in this case.

### File Path Contains Spaces

If the selected file path contains spaces (e.g., `my file.txt`), the mention
will be `@my file.txt `. This may cause issues with downstream parsing of
`@mentions`. A future enhancement could wrap such paths in quotes
(`@"my file.txt"`), but this is outside the scope of this fix and depends on
the mention parser's conventions.

### Controller Lifecycle During Widget Rebuild

When `InputArea` rebuilds (e.g., because `isProcessing` changed), the
`didUpdateWidget` hook ensures the listener is correctly migrated if the
controller reference changes. In the common case where the same external
controller is passed on every rebuild, `didUpdateWidget` detects that
`oldController === newController` and does nothing.

### Multiple Rapid Selections

If the user somehow triggers `onSelect` multiple times rapidly (e.g., double-tap),
each call independently reads the current text and cursor position. Since
`TextEditingController` mutation is synchronous and single-threaded (no async
gap between read and write), there is no race condition. The second insertion
would see the text already modified by the first insertion.

### Backward Compatibility

Because the `controller` prop is optional on both `InputAreaProps` and
`BottomGridProps`, existing code that does not pass a controller continues to
work. `InputAreaState` falls back to creating its own internal controller,
exactly as it does today. No existing call sites need to be updated unless
they want controller access.

## Sequence Diagram

```
User types '@' in InputArea
  |
  v
Some mechanism sets showFilePicker=true, fileList=[...]
  |
  v
AppStateWidget.build() renders FilePicker overlay
  |
  v
User navigates SelectionList and presses Enter on "README.md"
  |
  v
SelectionList calls FilePicker.onSelect("README.md")
  |
  v
FilePicker.onSelect calls the callback in AppStateWidget:
  |
  |-- setState(() => { this.showFilePicker = false })
  |     (dismisses the picker overlay)
  |
  |-- controller = this.inputController
  |-- mention = "@README.md "
  |-- text = controller.text          // e.g., "fix bug @re"
  |-- cursor = controller.cursorPosition  // e.g., 12
  |-- textBefore = "fix bug @re"
  |-- atIndex = textBefore.lastIndexOf('@')  // 8
  |
  |-- before = "fix bug "
  |-- after = ""   (cursor was at end)
  |-- controller.text = "fix bug @README.md "
  |-- controller.cursorPosition = 20
  |
  v
TextEditingController.notifyListeners()
  |
  v
InputAreaState._onTextChanged() fires
  |-- detects text change
  |-- triggers rebuild if shell mode changed
  |
  v
TextField renders with new text "fix bug @README.md "
  (cursor visible at position 20, ready for continued typing)
```

## Testing Strategy

### Unit Tests

1. **InputArea with external controller** -- Verify that when a
   `TextEditingController` is passed via the `controller` prop, `InputAreaState`
   uses it instead of creating its own. Mutations to the external controller
   should be reflected in the rendered `TextField`.

2. **InputArea without controller (backward compat)** -- Verify that when no
   `controller` prop is provided, `InputAreaState` creates an internal
   controller. This is the existing behavior and should not regress.

3. **Controller didUpdateWidget** -- Verify that switching from an external
   controller to a different external controller correctly migrates the text
   change listener.

4. **BottomGrid controller forwarding** -- Verify that the `controller` prop on
   `BottomGrid` is passed through to `InputArea`.

5. **File path insertion with existing @** -- Verify that when text is
   `"hello @re"` with cursor at 9, selecting `"README.md"` produces
   `"hello @README.md "` with cursor at 18.

6. **File path insertion without @** -- Verify that when text is `"hello"`
   with cursor at 5 and no `@` in text, selecting `"README.md"` inserts
   `"@README.md "` at the cursor position.

### Widget Tests

7. **FilePicker integration** -- Using `WidgetTester`, render an `App` with
   `showFilePicker=true` and a `fileList`. Simulate Enter on the first item.
   Verify the input text contains the `@filename` mention and the picker is
   dismissed.

### Manual Testing Checklist

- [ ] Type `@` in input area, verify file picker appears (if wired).
- [ ] Select a file from the picker, verify `@filename ` is inserted at cursor.
- [ ] Verify cursor is positioned after the inserted mention.
- [ ] Type additional text after the mention, verify it appends correctly.
- [ ] Press Escape to dismiss picker without selection, verify no text change.
- [ ] Verify Ctrl+R prompt history works (injects previous prompt into input).
- [ ] Verify normal typing still works when no external controller is used.
- [ ] Verify submit (Enter) still works and clears the input.
- [ ] Verify shell mode detection (`$` prefix) still triggers visual changes.

## Implementation Order

1. **Modify InputAreaProps and InputArea** -- Add optional `controller` prop
   and `externalController` field. Update `InputAreaState` to use a getter
   that resolves external vs. internal controller. Add `didUpdateWidget`.
   (~30 lines changed)

2. **Modify BottomGridProps and BottomGrid** -- Add optional `controller` prop,
   store it, and forward to `InputArea`. (~10 lines changed)

3. **Modify AppStateWidget** -- Create `inputController` field, pass it to
   `BottomGrid`, wire FilePicker `onSelect` with insertion logic, wire Ctrl+R
   with history injection. (~25 lines changed)

4. **Add/update tests** -- Unit tests for controller lifting, integration test
   for file selection flow. (~80 lines)

## Estimated Complexity

| Component | Lines Changed | Difficulty |
|-----------|--------------|------------|
| InputArea controller prop + getter | ~30 | Low |
| InputAreaState didUpdateWidget | ~15 | Low |
| BottomGrid controller forwarding | ~10 | Low |
| AppStateWidget controller + wiring | ~25 | Low |
| FilePicker onSelect insertion logic | ~20 | Low-Medium |
| Ctrl+R prompt history fix | ~5 | Low |
| Tests | ~80 | Medium |
| **Total** | **~185** | **Low-Medium** |

## Relationship to Other Gaps

- **Gap U02 (Ctrl+G $EDITOR Integration, #24):** That gap explicitly
  identifies "Lift TextEditingController" as Step 5 of its implementation plan
  and recommends Option B (controller lifting) as the preferred approach. This
  gap (U03) implements that prerequisite. Once the controller is lifted, the
  Ctrl+G handler from Gap U02 can directly read/write `this.inputController`.

- **Ctrl+R Prompt History (app.ts line 199):** The same TODO comment. This fix
  resolves it as a side effect of controller lifting (Step 5 above).

- **Autocomplete @ Trigger (input-area.ts lines 120-123):** The default `@`
  trigger currently returns an empty options list. A future enhancement could
  populate it with the file list, making the `FilePicker` overlay redundant in
  favor of inline autocomplete. However, the two mechanisms serve different UX
  purposes (overlay picker for browsing vs. inline autocomplete for quick
  filtering), so both may coexist.
