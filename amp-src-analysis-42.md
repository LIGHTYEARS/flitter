# Prompt History and Session State Analysis -- flitter-amp TUI ACP Client

## 1. History Storage and Retrieval Mechanism

### 1.1 The `PromptHistory` Class

The sole history implementation lives in a single file:

**File**: `/home/gem/workspace/flitter/packages/flitter-amp/src/state/history.ts`

```typescript
export class PromptHistory {
  private entries: string[] = [];
  private cursor = -1;
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }
  // ...
}
```

The class uses a simple in-memory array (`entries: string[]`) as its backing store. There is no secondary data structure, no indexing, and no serialization layer. Entries are plain strings representing the full text of each submitted prompt.

### 1.2 Data Flow: How Entries Enter History

When the user submits a prompt, the flow is:

1. `InputAreaState._handleSubmit()` fires, which calls `this.widget.onSubmit(text.trim())`.
2. The `onSubmit` callback on `BottomGrid` is passed directly from `AppStateWidget.build()` in `app.ts` (line 255-257):

```typescript
onSubmit: (text: string) => {
  this.promptHistory.push(text);
  this.widget.onSubmit(text);
},
```

3. `PromptHistory.push()` performs two guards before inserting:
   - **Empty guard**: `if (text.trim() === '') return;` -- blank/whitespace-only prompts are silently discarded.
   - **Consecutive deduplication**: `if (this.entries.length > 0 && this.entries[this.entries.length - 1] === text) return;` -- if the most recent entry is identical to the new submission, the duplicate is skipped.

4. If neither guard triggers, the text is appended to the array. If the array exceeds `maxSize` (default 100), the oldest entry is removed via `this.entries.shift()`.

5. After any push, the cursor is reset to `-1`, meaning the user is back at the "new prompt" position.

### 1.3 Maximum Size and Eviction

The max size defaults to `100` entries but is configurable through `~/.flitter-amp/config.json` via the `historySize` property:

**File**: `/home/gem/workspace/flitter/packages/flitter-amp/src/state/config.ts` (line 125)

```typescript
historySize: userConfig.historySize ?? 100,
```

The `UserConfig` interface declares this as:

```typescript
interface UserConfig {
  // ...
  historySize?: number;
}
```

However, while the config parser reads `historySize` and includes it in the `AppConfig` result, the `PromptHistory` is instantiated in `AppStateWidget` with no arguments:

```typescript
private promptHistory = new PromptHistory();
```

This means the config value is parsed but **never wired** to the `PromptHistory` constructor. The history always uses the default size of 100. This is a latent bug or incomplete feature.

Eviction is FIFO via `this.entries.shift()` -- the oldest entry is dropped when the array exceeds `maxSize`.

---

## 2. Navigation Through History (Keyboard Controls)

### 2.1 Current Implementation: Ctrl+R (Backward Only)

History navigation is handled in `AppStateWidget.build()` inside the `FocusScope.onKey` handler:

**File**: `/home/gem/workspace/flitter/packages/flitter-amp/src/app.ts` (lines 195-203)

```typescript
// Ctrl+R -- navigate prompt history (backward)
if (event.ctrlKey && event.key === 'r') {
  const prev = this.promptHistory.previous();
  if (prev !== null) {
    // TODO: inject text into InputArea when TextEditingController is exposed
    this.setState(() => {});
  }
  return 'handled';
}
```

Key observations:

- **Only backward navigation (Ctrl+R) is implemented** at the keybinding level.
- **Forward navigation is NOT wired**. The `PromptHistory.next()` method exists and is fully coded, but no keybinding calls it. There is no Ctrl+S or any other binding for `next()`.
- **The history result is not injected into the text field**. The `previous()` return value is captured but the `TODO` comment explicitly states that injecting the text into `InputArea` is blocked on exposing the `TextEditingController`.

This means history navigation is **completely non-functional** at present. The `Ctrl+R` key is consumed (returns `'handled'`), `previous()` is called and cursor state moves, but the user sees no change in the input field.

### 2.2 Up/Down Arrow Behavior

There is **no up/down arrow history navigation** in flitter-amp. Looking at the `TextField` key handler in flitter-core:

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/text-field.ts` (lines 861-872)

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

When the text field is multi-line (which the `InputArea`'s `TextField` is, since `maxLines` is not set to 1), up/down arrows move the cursor between lines within the existing text. When single-line or when the cursor is on the first/last line, the events return `'ignored'`, but no parent handler catches them for history navigation.

The `FocusScope.onKey` in `app.ts` does not bind `ArrowUp` or `ArrowDown` to history operations.

### 2.3 The PromptHistory Cursor Model

The `PromptHistory` class uses a cursor-based navigation model:

- **`cursor = -1`**: Represents the "new prompt" position (not browsing history).
- **`previous()`**: On first call from `-1`, jumps to the last entry (`entries.length - 1`). Subsequent calls decrement the cursor. Returns `null` when at the oldest entry (cursor 0) to signal no more entries.
- **`next()`**: Increments the cursor. When it goes past the last entry, resets cursor to `-1` and returns `''` (empty string) to restore the new-prompt state. Returns `null` if already at `-1` (not browsing).
- **`resetCursor()`**: Sets cursor back to `-1`. Called implicitly by `push()` after adding a new entry, but not called from anywhere else in the codebase.

The cursor model is sound and follows the standard shell-history pattern. The issue is entirely in the wiring -- no mechanism exists to set the `InputArea`'s `TextEditingController.text` from the history result.

---

## 3. Persistence to Disk

### 3.1 No Disk Persistence Exists

After thorough search, there is **zero disk persistence** for prompt history. The `PromptHistory` class:

- Uses only an in-memory `string[]` array
- Has no `save()`, `load()`, `serialize()`, or `deserialize()` methods
- Does not reference `fs`, `readFileSync`, `writeFileSync`, or any I/O module
- Does not interact with `~/.flitter-amp/` or any other directory

When the process exits, all history is lost.

### 3.2 Configuration Persistence

While history itself is not persisted, the history *size* configuration is stored on disk:

**File**: `~/.flitter-amp/config.json`

```typescript
const configPath = join(homedir(), '.flitter-amp', 'config.json');
```

This config file supports `historySize` but, as noted above, the value is not actually consumed by the `PromptHistory` instance.

### 3.3 Contrast with Conversation State

The `ConversationState` (the full message thread with the agent) is also purely in-memory. There is no session replay, no conversation export, and no resume-from-disk capability. The ACP `LoadSessionRequest` and `LoadSessionResponse` types are imported in `types.ts` but are never used in the connection or session code.

---

## 4. Integration with the InputArea Widget

### 4.1 Widget Architecture

The input pipeline follows this widget hierarchy:

```
AppStateWidget (app.ts)
  -> BottomGrid (bottom-grid.ts)
    -> InputArea (input-area.ts)
      -> Container (bordered)
        -> Autocomplete
          -> TextField (flitter-core)
            -> TextEditingController (flitter-core)
```

### 4.2 The Controller Encapsulation Problem

`InputAreaState` creates its own `TextEditingController` as a private field:

**File**: `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/input-area.ts` (line 65)

```typescript
class InputAreaState extends State<InputArea> {
  private controller = new TextEditingController();
  private currentText = '';
  // ...
}
```

This controller is **not exposed** to the parent widget tree. The `InputArea` widget accepts `onSubmit` as a callback but provides no mechanism for the parent (`AppStateWidget`) to:

1. Read the current text from the controller
2. Set/replace the text in the controller
3. Access the controller reference at all

This is the root cause of the non-functional history navigation. The `TODO` comment in `app.ts` line 199 confirms this is a known gap:

```typescript
// TODO: inject text into InputArea when TextEditingController is exposed
```

A similar `TODO` appears for the file picker at line 342:

```typescript
// TODO: insert @filePath into InputArea text when controller is exposed
```

### 4.3 Submit Flow

When the user presses Enter (with `submitOnEnter: true` on the `TextField`):

1. `TextField._submit()` calls `this.widget.onSubmit?.(text)`
2. `InputAreaState._handleSubmit()` checks `text.trim().length > 0 && !isProcessing`, then calls `this.widget.onSubmit(text.trim())` and `this.controller.clear()`
3. `BottomGrid` passes through to `AppStateWidget`'s `onSubmit` wrapper
4. The wrapper does `this.promptHistory.push(text)` and then `this.widget.onSubmit(text)`
5. `this.widget.onSubmit` is `handleSubmit()` in `index.ts` which calls `appState.startProcessing(text)` and `sendPrompt()`

After submission, `InputAreaState` clears the controller. The prompt is stored in history before being sent to the agent.

### 4.4 Shell Mode Detection

The `InputArea` has an interesting shell-mode feature that interacts with the text content:

```typescript
function detectShellMode(text: string): ShellMode {
  if (text.startsWith('$$')) return 'background';
  if (text.startsWith('$')) return 'shell';
  return null;
}
```

This changes the border color of the input area when the user types a `$`-prefixed command. This detection happens through a text-change listener on the controller, meaning shell commands also enter prompt history as-is (with the `$` prefix).

---

## 5. Session State Management

### 5.1 AppState -- The Central State Hub

**File**: `/home/gem/workspace/flitter/packages/flitter-amp/src/state/app-state.ts`

`AppState` is the global state object that bridges ACP events to the TUI. It holds:

- `conversation: ConversationState` -- the full message history
- `sessionId: string | null` -- ACP session identifier
- `agentName: string | null` -- name of the connected agent
- `currentMode: string | null` -- current agent mode (e.g., "smart")
- `isConnected: boolean` -- connection status
- `error: string | null` -- current error message
- `cwd: string` -- working directory
- `gitBranch: string | null` -- detected git branch
- `skillCount: number` -- number of available skills

`AppState` implements the `ClientCallbacks` interface, receiving streaming events from the ACP agent (message chunks, tool calls, plan updates, usage stats).

### 5.2 ConversationState -- Message Thread

**File**: `/home/gem/workspace/flitter/packages/flitter-amp/src/state/conversation.ts`

`ConversationState` maintains an ordered `items: ConversationItem[]` array containing:

- `UserMessage` -- user prompts
- `AssistantMessage` -- agent responses (with streaming support)
- `ToolCallItem` -- tool invocations with status tracking
- `ThinkingItem` -- agent reasoning (collapsed by default)
- `PlanItem` -- structured plan entries

The state includes streaming management (`_streamingMessage`, `_streamingThinking`) and a global tool-call expansion toggle (`toolCallsExpanded`).

### 5.3 SessionState -- An Alternate (Unused) Implementation

**File**: `/home/gem/workspace/flitter/packages/flitter-amp/src/acp/session.ts`

There is a separate `SessionState` class in the ACP module that appears to be an earlier or alternate implementation. It has similar functionality to `ConversationState` (message tracking, streaming, tool calls, plan, usage) but includes an explicit `id` and `cwd` per session. This class is **not imported or used** by `AppState` or any other module -- `ConversationState` has superseded it.

### 5.4 No Session Persistence

There is no session persistence mechanism:

- No session save/restore on application restart
- No `LoadSessionRequest` invocation (the type is imported but unused)
- No conversation export to file
- `Ctrl+L` clears the conversation with no undo
- The ACP session ID is ephemeral -- created fresh on each `connectToAgent()` call

### 5.5 Listener-Based Reactivity

`AppState` uses a listener pattern for UI updates:

```typescript
private listeners: Set<StateListener> = new Set();

notifyListeners(): void {
  for (const listener of this.listeners) {
    listener();
  }
}
```

The `AppStateWidget` subscribes with a throttled listener (50ms debounce for streaming) that calls `setState()` to trigger rebuilds. This is a direct analog of Flutter's `ChangeNotifier`/`Listenable` pattern.

---

## 6. How History Interacts with Multi-Line Input

### 6.1 The TextField is Multi-Line by Default

The `InputArea` creates a `TextField` without specifying `maxLines`:

```typescript
const textField = new TextField({
  controller: this.controller,
  autofocus: true,
  style: new TextStyle({ foreground: theme?.base.foreground }),
  cursorChar: '\u2588',
  submitOnEnter: true,
  onSubmit: this._handleSubmit,
});
```

With `maxLines` unset, the `TextField.isSingleLine` returns `false`, so the field operates in multi-line mode. However, `submitOnEnter: true` overrides the default multi-line behavior for Enter:

```typescript
case 'Enter':
case 'Return':
  if (isMultiLine && !this.widget.submitOnEnter) {
    this._controller.insertText('\n');
  } else {
    this._submit();
  }
```

So plain Enter submits. To insert a newline, the user must use Shift+Enter or Alt+Enter.

### 6.2 History Stores Full Multi-Line Text

When a multi-line prompt is submitted, the entire string (including embedded `\n` characters) is stored in `PromptHistory.entries` as a single string. The deduplication comparison uses strict string equality, so multi-line entries are compared byte-for-byte.

### 6.3 Up/Down Arrows in Multi-Line Context

Since up/down arrows in a multi-line `TextField` move the cursor between lines, there is an inherent conflict with using those keys for history navigation. The current design avoids this conflict entirely by not using up/down for history -- only `Ctrl+R` is designated. This is consistent with how `bash`'s `Ctrl+R` reverse-search works independently of line navigation.

### 6.4 Container Height

The input container is fixed at 5 rows:

```typescript
const borderedInput = new Container({
  decoration: new BoxDecoration({ border }),
  padding: EdgeInsets.symmetric({ horizontal: 1 }),
  height: 5,
  child: autocompleteWrapped,
});
```

This means the visible input area is 3 lines of usable text space (5 minus 2 for the top and bottom border). Multi-line prompts that exceed 3 lines would scroll within this viewport.

---

## 7. Code Patterns and Observations

### 7.1 Pattern: Unfinished Feature with TODO Markers

The history system follows a common pattern in this codebase: the core data structure is fully implemented and tested (the `PromptHistory` class), the integration point is wired for writes (`push()` on submit), but the read path (injecting text back into the input) is blocked by a missing abstraction (exposed controller). There are two explicit `TODO` comments marking this gap.

### 7.2 Pattern: Config Parsed but Not Consumed

The `historySize` config property demonstrates a pipeline break:
1. `UserConfig` declares `historySize?: number`
2. `parseArgs()` includes it in `AppConfig`: `historySize: userConfig.historySize ?? 100`
3. `AppConfig.historySize` is never read by any downstream code
4. `PromptHistory` is constructed with default size

This pattern suggests the config was designed ahead of implementation, with the expectation that wiring would happen in a later phase.

### 7.3 Pattern: Duplicate Session State Classes

`SessionState` in `acp/session.ts` and `ConversationState` in `state/conversation.ts` overlap significantly. Both track `items`, `plan`, `usage`, and streaming state. The key difference is that `SessionState` carries an `id` and `cwd`, while `ConversationState` is session-agnostic. It appears that the codebase evolved from `SessionState` toward `ConversationState` when it became clear that `AppState` would manage session metadata directly. The old class was not cleaned up.

### 7.4 Pattern: Keyboard Shortcuts at FocusScope Level

All global keyboard shortcuts (Ctrl+C, Ctrl+L, Ctrl+O, Ctrl+R, Ctrl+G, Alt+T, Escape) are handled in a single `FocusScope.onKey` handler in `AppStateWidget.build()`. This creates a clear priority order: the root FocusScope gets first shot at key events before they propagate to child widgets like `TextField`.

This means:
- `Ctrl+R` is consumed at the app level and never reaches the text field
- `Ctrl+C` cancels the agent operation rather than copying text
- `Ctrl+A` is NOT intercepted at the app level, so it reaches the `TextField` for select-all
- `Ctrl+L` clears the conversation (not the input field)

### 7.5 Observation: No Test Coverage for History

There are no test files for `PromptHistory`. No unit tests exercise `push()`, `previous()`, `next()`, `resetCursor()`, deduplication, or max-size eviction. Given the class is self-contained with no I/O dependencies, it would be straightforward to unit test. The absence likely reflects the feature's incomplete integration status.

### 7.6 Observation: History Does Not Survive Ctrl+L

When the user presses `Ctrl+L` to clear the conversation, `appState.conversation.clear()` is called. This clears the `ConversationState.items` array. However, the `PromptHistory` is a separate object and is **not** cleared by `Ctrl+L`. This means history entries survive conversation clears, which is the expected and correct behavior -- analogous to how `clear` in a terminal preserves shell history.

### 7.7 Observation: Potential for Stale History Text

Because the text is trimmed during submission (`text.trim()` in `InputAreaState._handleSubmit()`), but history stores the trimmed result, there can be slight mismatches between what the user typed and what history stores. Additionally, the `onSubmit` wrapper in `app.ts` receives the already-trimmed text, so history entries always have whitespace stripped from both ends.

### 7.8 Observation: No Search/Filter Capability

The `Ctrl+R` keybinding name ("navigate prompt history (backward)") suggests simple linear navigation, not the incremental reverse search that `bash`'s `Ctrl+R` provides. There is no substring search, regex filter, or fuzzy match. Navigation is strictly sequential through the ordered list.

---

## Summary Table

| Aspect | Status |
|--------|--------|
| In-memory history store | Implemented (array-based, up to 100 entries) |
| Consecutive dedup | Implemented |
| Max size eviction | Implemented (FIFO) |
| Config for history size | Parsed but not wired |
| Ctrl+R backward nav | Key binding exists, history cursor moves, but text NOT injected into input |
| Forward navigation (Ctrl+S or similar) | `next()` method exists, no keybinding |
| Up/Down arrow history | Not implemented (arrows handle multi-line cursor movement) |
| Disk persistence | None |
| Session persistence | None |
| History tests | None |
| Controller exposure to parent | Blocked (private in InputAreaState) |
| Conversation state persistence | None (all in-memory, lost on exit) |

---

## Architectural Diagram

```
User types text
       |
       v
TextField (flitter-core)
       |  submitOnEnter -> _submit()
       v
InputAreaState._handleSubmit()
       |  onSubmit(text.trim())
       v
BottomGrid -> AppStateWidget onSubmit wrapper
       |
       +---> promptHistory.push(text)    <-- WRITE PATH (works)
       |
       +---> handleSubmit(text) -> ACP sendPrompt()


Ctrl+R pressed
       |
       v
FocusScope.onKey (app.ts)
       |
       +---> promptHistory.previous()   <-- READ PATH (cursor moves)
       |
       +---> setState(() => {})         <-- Triggers rebuild, but...
       |
       X     No way to set InputArea's TextEditingController.text
             (controller is private in InputAreaState)
```
