# Analysis 11: App Widget, AppState, and State Management

## Source Files

- `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts`

## Overview

The application's top-level architecture follows a clear separation between presentation (`App` / `AppStateWidget`) and domain state (`AppState`). The `App` StatefulWidget is the root of the widget tree, accepting an externally-created `AppState` instance, a submit callback, and a cancel callback. `AppState` is a standalone ChangeNotifier-style class that bridges ACP (Agent Control Protocol) events into the TUI by implementing the `ClientCallbacks` interface. Together they form a unidirectional data flow: ACP events mutate `AppState`, which notifies listeners, which trigger widget rebuilds in `AppStateWidget`.

## App StatefulWidget and AppStateWidget

`App` extends `StatefulWidget` and holds three props: `appState`, `onSubmit`, and `onCancel`. Its sole job is to instantiate the `AppStateWidget` State object via `createState()`.

`AppStateWidget` is the State class that owns the mutable local UI state -- a `ScrollController`, overlay visibility flags (`showCommandPalette`, `showFilePicker`), a `fileList` array, a `PromptHistory` instance for Ctrl+R history navigation, and the throttle bookkeeping fields `_lastUpdate` and `_pendingTimer`.

### 50ms Throttle Mechanism

During streaming, `AppState.notifyListeners()` fires many times per second as text chunks arrive. Rebuilding the entire widget tree on every chunk would be prohibitively expensive. The throttle mechanism in `initState()` ensures at most one rebuild every 50 milliseconds:

1. When the listener fires, it reads `Date.now()` and computes `elapsed` since `_lastUpdate`.
2. If `elapsed >= 50`, it calls `_flushUpdate()` immediately -- this records the new timestamp, calls `setState(() => {})` to trigger a rebuild, and if the user was already scrolled to the bottom during processing, it re-enables `followMode` on the `ScrollController` so new content stays pinned to the bottom.
3. If `elapsed < 50` and no timer is already pending, it schedules a `setTimeout` for the remaining `50 - elapsed` milliseconds. This guarantees the trailing update is never lost even if no further events arrive.
4. `_flushUpdate()` always clears any pending timer before proceeding, preventing double-fires.

On `dispose()`, any pending timer is cleared and the listener is removed from `AppState`, preventing leaks.

### FocusScope Keyboard Handling

The entire main content column is wrapped in a `FocusScope` with `autofocus: true`. Its `onKey` handler intercepts several key combinations:

- **Escape** -- dismisses overlays in priority order: file picker first, then command palette, then pending permission dialog (calling `appState.resolvePermission(null)` to reject it).
- **Ctrl+O** -- opens the command palette overlay.
- **Ctrl+C** -- invokes `onCancel()` to abort the current agent operation.
- **Ctrl+L** -- clears the conversation via `appState.conversation.clear()`.
- **Alt+T** -- toggles tool call expansion/collapse across all conversation items.
- **Ctrl+G** -- reserved for opening the prompt in `$EDITOR` (marked TODO, requires TUI suspend/resume).
- **Ctrl+R** -- navigates backward through `PromptHistory`.

Each handler returns `'handled'` or `'ignored'` so unrecognized keys propagate normally.

### Overlay Stack System

The `build()` method conditionally wraps the main content in a `Stack` widget to layer overlays. The priority order is strict:

1. **PermissionDialog** (highest priority) -- shown when `appState.hasPendingPermission` is true. A `Positioned` overlay fills the entire screen. The dialog's `onSelect` and `onCancel` callbacks call `appState.resolvePermission()`.
2. **CommandPalette** -- shown when `showCommandPalette` is true. Supports three commands: `clear` (clears conversation), `toggle-tools` (collapses/expands tool calls), and `toggle-thinking` (collapses/expands thinking blocks).
3. **FilePicker** (lowest priority) -- shown when `showFilePicker` is true and `fileList` is non-empty. Positioned at `left: 1, bottom: 3` rather than full-screen. Currently the `onSelect` handler is a placeholder (TODO for injecting file paths into the input area).

If no overlay is active, `result` is just `mainContent` without any Stack wrapper. The final widget is wrapped in an `AmpThemeProvider` with the dark theme.

### Layout Structure

When conversation items exist, the main area is a `Row` containing an `Expanded` `SingleChildScrollView` (positioned at the bottom with keyboard scroll enabled) alongside a `Scrollbar`. When items are empty, it instead uses a `Center` widget to vertically center the welcome/empty state -- a deliberate fix for a bug where `SingleChildScrollView`'s unbounded height prevented `Column` centering.

The `BottomGrid` widget sits below the scrollable area and receives all status props from `appState`: `isProcessing`, `currentMode`, `agentName`, `cwd`, `gitBranch`, `usage`, and `skillCount`.

## AppState Class

`AppState` implements the `ClientCallbacks` interface and serves as the single source of truth for the entire application.

### ChangeNotifier Pattern

The class maintains a `Set<StateListener>` (where `StateListener` is `() => void`). The three core methods are:

- `addListener(listener)` -- adds a callback to the set.
- `removeListener(listener)` -- removes a callback from the set.
- `notifyListeners()` -- iterates the set and invokes each listener.

Every state mutation method calls `notifyListeners()` at its end to propagate changes.

### State Fields

| Field | Type | Purpose |
|-------|------|---------|
| `conversation` | `ConversationState` | Holds all chat items, tool calls, thinking blocks, usage, and processing flag |
| `sessionId` | `string \| null` | Current ACP session identifier |
| `agentName` | `string \| null` | Display name of the connected agent |
| `currentMode` | `string \| null` | Active mode (e.g., `'smart'`) |
| `isConnected` | `boolean` | Whether the ACP connection is alive |
| `error` | `string \| null` | Current error message, if any |
| `cwd` | `string` | Current working directory (defaults to `process.cwd()`) |
| `gitBranch` | `string \| null` | Current git branch for status bar display |
| `skillCount` | `number` | Number of available skills |

Computed getters `isProcessing` and `usage` delegate directly to `conversation`.

### SessionUpdate Event Handling

The `onSessionUpdate` method is the central dispatcher for all streaming ACP events. It uses a `switch` on `update.sessionUpdate`:

- `agent_message_chunk` -- appends text to the current assistant message via `conversation.appendAssistantChunk()`. Unsupported content types produce a bracketed placeholder.
- `agent_thought_chunk` -- appends text to the current thinking block via `conversation.appendThinkingChunk()`.
- `tool_call` -- creates a new tool call entry with ID, title, kind, status, locations, and raw input.
- `tool_call_update` -- updates an existing tool call's status and content/output.
- `plan` -- sets plan entries with content, priority, and status.
- `usage_update` -- updates token usage info (size, used, cost).
- `current_mode_update` -- updates `currentMode`.
- `session_info_update` -- acknowledged but currently a no-op.

After every case, `notifyListeners()` is called to propagate the change.

### Permission Request Flow

`onPermissionRequest` wraps a `Promise` around the permission dialog lifecycle. It stores both the `resolve` function and the `PermissionRequest` object in `pendingPermission`, then calls `notifyListeners()`. The `AppStateWidget` detects `hasPendingPermission` and renders the `PermissionDialog` overlay. When the user selects an option or cancels, `resolvePermission(optionId)` is called, which resolves the stored Promise and clears `pendingPermission`. This bridges the async ACP permission protocol to a synchronous dialog UI.

### handleError and onConnectionClosed

`handleError(message)` finalizes any in-progress assistant message and thinking block, sets `isProcessing` to false, stores the error message in `this.error`, and notifies listeners. This ensures the UI cleanly transitions out of any streaming state when an error occurs.

`onConnectionClosed(reason)` delegates to `handleError` with a formatted disconnect message, then additionally sets `isConnected` to false and notifies listeners again. The double notification (once inside `handleError`, once after setting `isConnected`) is harmless since the throttle in `AppStateWidget` coalesces rapid notifications.

### Action Methods

- `startProcessing(userText)` -- adds a user message to the conversation, sets `isProcessing` to true, and notifies. Includes diagnostic logging of item counts and listener count.
- `setConnected(sessionId, agentName)` -- marks the connection as live and stores session metadata.
- `setError(error)` / `clearError()` -- simple error state mutators that notify.

## Bootstrap

The `startTUI` function creates an `App` widget with the given `appState`, `onSubmit`, and `onCancel` callbacks, then calls `runApp` with stdout as the output target and terminal mode enabled. It returns the `WidgetsBinding` instance for external lifecycle control.
