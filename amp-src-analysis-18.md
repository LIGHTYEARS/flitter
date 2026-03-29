# Analysis 18: PermissionDialog and SelectionList

## Files Examined

- `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/permission-dialog.ts`
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/selection-list.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/client.ts`

## PermissionDialog Widget Structure

`PermissionDialog` is a `StatelessWidget` located in `flitter-amp` that renders a modal overlay when the ACP agent requests user approval for a tool call. It accepts three props through `PermissionDialogProps`: a `PermissionRequest` object (carrying tool call metadata and the available response options), an `onSelect` callback invoked when the user picks an option, and an `onCancel` callback for dismissal.

The `PermissionRequest` interface (defined in `acp/client.ts`) provides:
- `sessionId` -- the active ACP session identifier.
- `toolCall` -- an object containing `toolCallId`, `title`, `kind`, `status`, and optional `locations` and `rawInput` fields describing the tool invocation.
- `prompt` -- the textual prompt string from the agent.
- `options` -- an array of objects each with `kind` (e.g., `allow`, `deny`, `always_allow`), `name` (display label), and `optionId` (the identifier sent back to the server).

## Semi-Transparent Background Mask (Stack + Positioned Overlay)

The `build` method returns a `Stack` with `fit: 'expand'` so it fills the entire terminal area. Two children compose the overlay:

1. **Background mask** -- A `Positioned` widget pinned to all four edges (`top: 0, left: 0, right: 0, bottom: 0`) wrapping a `Container` colored `Color.rgba(0, 0, 0, 0.6)`. This creates a semi-transparent dark scrim over the underlying chat view, visually signaling to the user that a modal interaction is active and that the background content is temporarily inaccessible.

2. **Centered dialog** -- The actual dialog content, wrapped in a `FocusScope` with `autofocus: true`, containing a `Column` centered both on the main and cross axes. The dialog body is a `Container` with `BoxConstraints({ maxWidth: 60 })` to cap its width at 60 terminal columns, preventing the dialog from stretching excessively on wide terminals.

## Dialog Content and Tool Call Info Display

Inside the constrained container, a nested `Column` with `mainAxisSize: 'min'` and `crossAxisAlignment: 'start'` stacks the content vertically:

1. **Title** -- A `Text` widget displaying "Permission Required" in bold with the theme's `warningColor` (defaulting to `Color.brightYellow` if no theme is provided via `AmpThemeProvider.maybeOf(context)`).

2. **Tool call details** -- A second `Text` widget showing `toolCall.title` concatenated with `toolCall.kind` in parentheses, using the theme's standard foreground color (falling back to `Color.white`). This tells the user exactly which tool and what kind of operation is requesting approval.

3. **Spacer** -- A `SizedBox({ height: 1 })` providing a single-row gap before the selection options.

4. **Selection list** -- The `SelectionList` widget with the mapped option items.

## Theme Colors for Warning State

The dialog box itself is bordered using `BoxDecoration` with `Border.all(side)`, where `side` is a `BorderSide` of width 1 using `warningColor`. The theme lookup follows a safe pattern: `theme?.base.warning ?? Color.brightYellow`. This means the border and the title text both glow in the warning color (bright yellow by default), drawing immediate attention to the fact that a permission decision is required.

## SelectionList Integration

The `options` array from the `PermissionRequest` is mapped into `SelectionItem[]` objects where each item's `label` is the option `name`, `value` is the `optionId`, and `description` is the `kind` with underscores replaced by spaces. The resulting items are passed to a `SelectionList` with `showDescription: true`, `onSelect` forwarding the chosen `optionId`, and `onCancel` forwarding the cancellation.

Typical options for a permission request include Allow, Deny, and Always Allow, though the exact set is determined by the ACP server at runtime.

## SelectionList Widget (flitter-core)

`SelectionList` is a `StatefulWidget` in `flitter-core` that manages keyboard-navigable item selection. Its state class, `SelectionListState`, tracks a `_selectedIndex` and handles:

- **Navigation keys**: ArrowUp/k (previous), ArrowDown/j (next), Tab (cycle forward), Shift+Tab (cycle backward), Ctrl+n (next), Ctrl+p (previous). All navigation wraps around and skips disabled items using `_moveToNextEnabled(direction)`.
- **Confirmation**: Enter calls `_confirmSelection()`, which invokes `onSelect(selectedItem.value)`.
- **Cancellation**: Escape calls `onCancel()`.
- **Mouse**: Clicking an enabled item selects and confirms it immediately via `handleMouseClick(index)`.

Items render as `Text` widgets inside a `Column`. The currently selected item is prefixed with `> ` and styled with `bold: true, inverse: true` for high visibility. Disabled items receive `dim: true`. Descriptions, when `showDescription` is true, are appended as ` - description`.

The list itself is wrapped in a `FocusScope` with `autofocus: true` and an `onKey` handler that delegates to `handleKeyEvent`, ensuring the list captures keyboard input as soon as it appears.

## FocusScope Wrapping -- Double Layer

There are two nested `FocusScope` layers in the permission dialog flow:

1. The outer `FocusScope` in `PermissionDialog.build()` wraps the entire dialog column with `autofocus: true`. This ensures that focus transfers to the dialog overlay when it appears, pulling focus away from the underlying chat input area.

2. The inner `FocusScope` inside `SelectionListState.build()` wraps the item column with its own `autofocus: true` and `onKey` handler. This captures the actual keystroke routing for item navigation.

This double focus scope arrangement means the dialog as a whole claims focus first, then the selection list within it handles specific key events.

## Connection to AppState.resolvePermission

The complete permission flow works as follows:

1. **ACP server sends request** -- `AcpClient.requestPermission()` receives a `PermissionRequest` from the agent and calls `this.callbacks.onPermissionRequest(request)`, which is implemented by `AppState`.

2. **AppState creates a Promise** -- `AppState.onPermissionRequest()` stores the request and a `resolve` function in `this.pendingPermission`, then calls `notifyListeners()` to trigger a UI rebuild.

3. **UI shows dialog** -- In `AmpApp.build()`, when `appState.hasPendingPermission` is true, a `PermissionDialog` is rendered as a full-screen `Positioned` overlay inside the root `Stack`. The `onSelect` callback calls `appState.resolvePermission(optionId)` and `onCancel` calls `appState.resolvePermission(null)`.

4. **Resolution** -- `AppState.resolvePermission()` calls `this.pendingPermission.resolve(optionId)`, which fulfills the Promise originally returned to `AcpClient.requestPermission()`. It then nulls out `pendingPermission` and notifies listeners, causing the dialog to disappear.

5. **Escape handling** -- The `AmpApp`'s top-level key handler also catches Escape: if `appState.hasPendingPermission` is true, it calls `appState.resolvePermission(null)` to cancel, providing a secondary escape path independent of the SelectionList.

6. **Server response** -- Back in `AcpClient.requestPermission()`, the resolved value is mapped: `null` yields `{ outcome: 'cancelled' }`, otherwise the `optionId` is sent back as `{ outcome: { outcome: selectedId, optionId: selectedId } }`.

## BoxConstraints maxWidth:60 Dialog Sizing

The dialog container uses `new BoxConstraints({ maxWidth: 60 })`. In the terminal coordinate system used by flitter-core, units correspond to character columns, so 60 means the dialog will never exceed 60 characters wide. On narrower terminals the dialog naturally shrinks to fit available space since only `maxWidth` is constrained (no `minWidth`). The padding of `EdgeInsets.symmetric({ horizontal: 2, vertical: 1 })` adds 2 columns of horizontal padding and 1 row of vertical padding inside the border, keeping the content visually separated from the warning-colored border.
