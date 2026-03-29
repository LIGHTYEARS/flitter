# Analysis 17: InputArea Widget and Focus System

## InputArea Widget Structure

The `InputArea` widget (`/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/input-area.ts`) is a `StatefulWidget` that serves as the primary user text input component in the Amp TUI. It accepts props via the `InputAreaProps` interface: an `onSubmit` callback, an `isProcessing` flag, a `mode` string (for displaying the current agent mode label), optional `autocompleteTriggers`, an `imageAttachments` count, a `skillCount`, and an array of `overlayTexts` for decorating the input border.

### Internal State and TextField Integration

`InputAreaState` holds a `TextEditingController` and a `currentText` string. The controller is created once in `initState` and monitored via a listener (`_onTextChanged`). This listener detects shell mode transitions -- when the text starts with `$` or `$$`, the border color changes to indicate shell or background-shell mode respectively, handled by the `detectShellMode` helper function at the bottom of the file. Shell mode detection triggers a `setState` call only when the mode boundary actually changes, avoiding unnecessary rebuilds.

The `_handleSubmit` method guards against empty input and re-entrancy during processing, then calls `onSubmit` with the trimmed text and clears the controller.

### Build Method and Visual Composition

The `build` method constructs a layered visual hierarchy:

1. **TextField creation**: A `TextField` is instantiated with the shared controller, `autofocus: true`, a themed text style, a solid block cursor character (`\u2588`), `submitOnEnter: true`, and the submit handler.

2. **Autocomplete wrapping**: The TextField is wrapped in an `Autocomplete` widget that receives the controller and a list of triggers (a default `@`-triggered file trigger plus any externally provided triggers).

3. **Bordered container**: The autocomplete-wrapped text field is placed inside a `Container` with a `BoxDecoration` featuring a `Border.all` with `'rounded'` style. The border color is cyan in shell mode or bright-black (the base border color from the theme) in normal mode. The container has a fixed height of 5 and horizontal padding of 1.

4. **Stack overlay composition**: Overlay elements are layered on top of the bordered input using a `Stack` with `fit: 'passthrough'`. The overlays include:
   - **Mode label** (top-right): Displays the current mode (e.g., "agent mode" or "Shell mode") with themed coloring. When processing, a timer emoji prefix is added and the text dims. If a `skillCount` is nonzero, a secondary badge with a warning icon and count is appended.
   - **Image attachment badge** (bottom-left): Shows an image count badge in the info color when attachments are present.
   - **Custom overlay texts**: Iterated from `overlayTexts`, each positioned according to its `position` field (`'top-left'`, `'top-right'`, `'bottom-left'`, or `'bottom-right'`), with a 1-cell inset from the edge.

5. **Optional topWidget**: If a `topWidget` is provided, the final widget is wrapped in a `Column` with the top widget above the input area.

### BorderOverlayText Positioning

The `BorderOverlayText` interface defines `position` (one of four corner positions) and a `child` widget. During rendering, the position string is parsed: the prefix (`top`/`bottom`) sets the vertical anchor, and the suffix (`left`/`right`) sets the horizontal anchor, always with a 1-cell offset from the border edge. These overlays render on top of the border line itself, creating the visual effect of text labels embedded in the border -- similar to the labeled border pattern seen in many terminal UIs.

## FocusScope Widget

The `FocusScope` widget (`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/focus-scope.ts`) is a behavior-only `StatefulWidget` that manages a `FocusNode` as a widget. It provides the bridge between the widget tree and the focus tree.

### Configuration

FocusScope accepts: an optional external `focusNode` (otherwise it creates and owns one internally), a `child` widget, `autofocus` boolean, `canRequestFocus`, `skipTraversal`, and callbacks for `onKey`, `onPaste`, and `onFocusChange`.

### Lifecycle Management

`FocusScopeState` follows a precise lifecycle:

- **initState**: Creates or attaches to a FocusNode, sets up key/paste handlers on it, registers the node with the `FocusManager` (finding the nearest ancestor `FocusScopeState` via `context.findAncestorStateOfType` to establish parent-child relationships), and -- if `autofocus` is true -- schedules a microtask to call `requestFocus()`.

- **didUpdateWidget**: If the external `focusNode` prop changes, the state detaches from the old node and attaches to the new one. It disposes any internally-owned node that is no longer needed, and re-sets up handlers.

- **dispose**: Removes focus change listeners, unregisters the node from the FocusManager, and disposes any internally-owned node.

- **build**: Returns `this.widget.child` directly -- FocusScope adds no visual elements, only focus behavior.

### Focus Tree Registration

The `_registerNode` method walks up the element tree to find the nearest ancestor `FocusScopeState`. If found, the effective FocusNode is registered under that ancestor's FocusNode in the FocusManager. If no ancestor exists, the node is registered under the root scope. This creates a hierarchical focus tree that mirrors the widget tree structure.

## Keyboard Event Flow: Terminal to Widget

The full path of a keyboard event from terminal stdin to widget handler traverses several layers:

1. **Terminal stdin**: Raw bytes arrive from the terminal. The escape sequence parser (in the input system) converts them into typed `KeyEvent` objects with fields: `key` (logical key name like `"ArrowUp"`, `"Enter"`, `"a"`), `ctrlKey`, `altKey`, `shiftKey`, `metaKey`, and the raw `sequence`.

2. **EventDispatcher** (`/home/gem/workspace/flitter/packages/flitter-core/src/input/event-dispatcher.ts`): The singleton `EventDispatcher` (Amp ref: class Pg) receives the parsed `InputEvent` via its `dispatch()` method and routes by type. For key events, the dispatch pipeline is:
   - **Key interceptors**: Global shortcuts (like Ctrl+C for quit) run first. If any returns `'handled'`, propagation stops.
   - **FocusManager dispatch**: The `FocusManager.instance.dispatchKeyEvent(event)` is called. This locates the `primaryFocus` node and calls its `handleKeyEvent`. If the node returns `'ignored'`, the event **bubbles up** to the parent node, continuing until the root or until a handler returns `'handled'`.
   - **Registered key handlers**: If the focus system does not handle the event, fallback key handlers are tried.

3. **FocusNode.handleKeyEvent**: On the focused node, first `onKey` is called (the handler set by FocusScope or directly by TextField), then any additionally registered key handlers via `addKeyHandler`.

4. **TextField key handling**: The TextField's `_handleKeyEvent` method processes the event through a comprehensive set of key bindings:
   - **Ctrl combinations**: Ctrl+A (select all), Ctrl+Backspace (delete word backward), Ctrl+Delete (delete word forward), Ctrl+Left/Right (word movement), Ctrl+Enter (always submit).
   - **Ctrl+Shift**: Ctrl+Shift+Left/Right for word-level selection extension.
   - **Shift combinations**: Shift+arrows for character/line selection, Shift+Home/End for selection to boundaries, Shift+Enter for newline insertion.
   - **Alt+Enter**: Always inserts a newline.
   - **Plain keys**: Backspace, Delete, arrow navigation (with multi-line awareness for Up/Down), Home/End (line-aware in multi-line mode), Enter (submits or inserts newline depending on mode), Tab (passed through to focus system), and printable character insertion.

5. **Paste events**: Follow a parallel path through `EventDispatcher.dispatchPasteEvent` to `FocusManager.dispatchPasteEvent`, which walks up from `primaryFocus` until it finds a node with an `onPaste` handler. TextField registers one that calls `controller.insertText(text)`.

## FocusNode and FocusManager Details

### FocusNode (`/home/gem/workspace/flitter/packages/flitter-core/src/input/focus.ts`)

FocusNode maintains a tree structure with `_parent` and `_children` fields. Key behaviors:

- **requestFocus()**: Clears the current primary focus holder, sets `_hasPrimaryFocus = true`, updates the nearest ancestor `FocusScopeNode`'s tracked focused child, and notifies listeners up the tree.
- **hasFocus**: Returns true if this node or any descendant has primary focus (recursive check).
- **Focus traversal**: `nextFocus()` and `previousFocus()` collect all traversable nodes (those with `canRequestFocus && !skipTraversal`) in DFS order from the FocusManager, then move to the next/previous in the circular list. This enables Tab/Shift+Tab navigation.
- **Listener notification**: When focus changes, listeners are notified on the node itself and propagated up through all ancestors via `_notifyListenersUpTree` and `_notifyAncestorListeners`.

### FocusScopeNode

Extends FocusNode with a `_focusedChild` tracker. It records which descendant most recently received focus, enabling scope-level focus restoration. The `autofocus` method delegates to the target node's `requestFocus()` after verifying descent.

### FocusManager (Singleton)

Maintains the `rootScope` (a `FocusScopeNode`), provides `primaryFocus` via DFS search, handles node registration/unregistration, and is the central dispatch point for key and paste events through the focus tree with bubbling semantics.

## Multi-Line Text Editing Experience

The `TextEditingController` provides comprehensive multi-line support:

- **Line-aware cursor movement**: `moveCursorUp()` and `moveCursorDown()` split text by `\n`, compute the current `{lineIndex, colInLine}`, and move to the adjacent line while clamping the column to the target line's length. They return a boolean indicating whether movement occurred (used by TextField to decide whether to bubble the event).
- **Line-boundary navigation**: `moveCursorLineHome()` and `moveCursorLineEnd()` move to the start/end of the current line rather than the entire text.
- **Selection across lines**: `selectUp()` and `selectDown()` extend selection vertically, initializing the selection anchor on the first shift-movement, then updating `selectionEnd` to the new cursor position.
- **Newline insertion**: Enter inserts `\n` in multi-line mode (unless `submitOnEnter` is set), Shift+Enter and Alt+Enter always insert newlines regardless of mode.
- **Word operations**: `deleteWordBackward`, `deleteWordForward`, `moveCursorWordLeft`, `moveCursorWordRight` use helper functions that scan for word boundaries (defined as `\w` characters), working across line boundaries since they operate on the flat text string.
- **Mouse support**: Click places cursor via coordinate-to-character-position conversion (accounting for line offsets), double-click selects the word at the click position, and click-drag extends selection. Selection is automatically copied to the system clipboard via OSC 52 escape sequences through the `WidgetsBinding.tui.copyToClipboard` method.

### Rendering

TextField builds a `Text` widget with a `TextSpan` tree. The cursor is rendered as an inline character (`\u2588` block in InputArea, `\u2502` pipe as default) inserted at the cursor position within the display text. When a selection exists, the text is split into three `TextSpan` segments: before-selection (base style), selection (with background color), and after-selection (base style). The cursor character insertion position is accounted for when adjusting selection indices for display. The entire Text widget is wrapped in a `FocusScope` with the TextField's own FocusNode, connecting it to the focus tree for keyboard event routing.
