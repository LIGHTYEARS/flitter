# Phase 5: Permission Dialog and Command Palette - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two overlay widgets (permission dialog and command palette) plus remaining keyboard shortcuts (Ctrl+L, Escape, Alt+T). Both overlays are modal — they capture focus and block interaction with the underlying chat until dismissed. The phase also wires the ACP `requestPermission` callback to resolve with the user's selection.

</domain>

<decisions>
## Implementation Decisions

### Permission Dialog Layout
- Center overlay dialog using flitter-core's Dialog data class + SelectionList widget
- Show tool call details (tool name, file path) in dialog header/subtitle
- Rounded border using BoxDecoration (consistent with input area styling)
- Auto-focus dialog on appearance, trap focus until user selects an option or presses Escape

### Command Palette Behavior
- Fuzzy match on command names (filter SelectionList items as user types)
- Available commands: switch agent mode, clear chat, toggle all tool calls, toggle all thinking blocks
- Top-center overlay position (standard command palette pattern)
- Escape dismisses palette; selecting a command executes it and dismisses

### Keyboard Shortcut Integration
- Ctrl+L clears chat view and conversation state (fresh conversation)
- Alt+T toggles all tool call blocks expanded/collapsed simultaneously
- When any overlay is open, it consumes all key events except Escape (true modal behavior)
- Escape dismisses any open overlay (dialog, palette)

### Claude's Discretion
- Exact visual dimensions of dialog (auto-size based on content)
- Animation/transition behavior (none for v1 — instant show/hide)
- Command palette search algorithm implementation details

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SelectionList` widget (`flitter-core/src/widgets/selection-list.ts`): Full keyboard nav (j/k/arrows/Enter/Escape), mouse support, item descriptions, disabled items
- `Dialog` data class (`flitter-core/src/widgets/dialog.ts`): title, subtitle, body (Widget), buttons, type, footerStyle, dimensions, border
- `FocusScope` widget (`flitter-core/src/widgets/focus-scope.ts`): autofocus, onKey handler, focus trapping
- `ContainerWithOverlays` (`flitter-core/src/widgets/container-with-overlays.ts`): edge/corner overlay positioning
- `BoxDecoration`, `Border`, `BorderSide` for dialog border styling

### Established Patterns
- StatefulWidget + State<T> pattern with `this.widget` and `this.setState()`
- `KeyEvent` with `.key`, `.ctrlKey`, `.altKey`, `.shiftKey` properties
- `ScrollController.enableFollowMode()` for auto-scroll
- Options objects for all widget constructors
- String literal types for alignment ('start', 'stretch', 'max', 'min')

### Integration Points
- `AppState.permissionRequest` getter already exists — returns `PermissionRequest | null`
- `AmpClient.requestPermission()` returns a Promise that resolves with user selection
- `ClientCallbacks.onPermissionRequest(params)` is the hook — returns `Promise<string | null>`
- `App` widget in `app.ts` handles global key events via `FocusScope.onKey`
- ACP `RequestPermissionRequest` has `options: PermissionOption[]` with `optionId`, `name`, `kind`
- ACP `PermissionOptionKind`: "allow_once" | "allow_always" | "reject_once" | "reject_always"

</code_context>

<specifics>
## Specific Ideas

- Map ACP `PermissionOption` directly to `SelectionItem` — `optionId` → `value`, `name` → `label`, `kind` → description text
- Use Stack/overlay pattern in App.build() to layer permission dialog on top of main content
- AppState should hold a pending promise resolver that the dialog calls on selection
- Command palette items should be a static array of `SelectionItem` defined in a new `commands.ts`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
