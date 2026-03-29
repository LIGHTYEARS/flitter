# Analysis 32: Autocomplete Widget and Trigger System

## File Locations

- **Autocomplete widget**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/autocomplete.ts`
- **SelectionList (popup rendering + keyboard nav)**: `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/selection-list.ts`
- **InputArea integration**: `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/input-area.ts`
- **BottomGrid (trigger passthrough)**: `/home/gem/workspace/flitter/packages/flitter-amp/src/widgets/bottom-grid.ts`
- **Public exports**: `/home/gem/workspace/flitter/packages/flitter-core/src/index.ts` (lines 97-98)

## Core Interfaces

### AutocompleteOption

Defined at `autocomplete.ts:13-17`, this interface represents a single suggestion item:

```ts
export interface AutocompleteOption {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
}
```

`label` is what the user sees in the suggestion popup, `value` is what gets inserted into the text field upon selection, and `description` provides optional secondary text shown alongside the label.

### AutocompleteTrigger

Defined at `autocomplete.ts:19-22`, this interface binds a trigger character to a suggestion provider:

```ts
export interface AutocompleteTrigger {
  readonly triggerCharacter: string;
  readonly optionsBuilder: (query: string) => AutocompleteOption[] | Promise<AutocompleteOption[]>;
}
```

The `triggerCharacter` is the string that activates the autocomplete (e.g., `@` for mentions, `/` for slash commands). The `optionsBuilder` receives the query text typed after the trigger character and returns either a synchronous array of options or a Promise for asynchronous fetching. Multiple triggers can be registered simultaneously, and the system selects the one with the longest matching trigger character.

## Autocomplete Widget Architecture

The `Autocomplete` class (`autocomplete.ts:46-81`) is a `StatefulWidget` that wraps a child widget (typically a `TextField`) and overlays a completion popup when a trigger is detected. Constructor properties include:

- `child`: The wrapped input widget.
- `controller`: A `TextEditingController` for monitoring text changes.
- `triggers`: An array of `AutocompleteTrigger` definitions.
- `onSelected`: Optional callback invoked when the user selects a suggestion, receiving both the trigger and the chosen option.
- `optionsViewBuilder`: Optional custom builder for the suggestion popup widget.
- `maxOptionsVisible`: Maximum number of suggestions displayed (defaults to 10).

## Trigger Detection Logic

`AutocompleteState._detectTrigger()` (`autocomplete.ts:121-155`) runs on every text change via a listener on the `TextEditingController`. The algorithm:

1. Reads the text before the cursor position.
2. For each registered trigger, searches backward (up to 100 characters) for the last occurrence of its trigger character.
3. Extracts the query text between the trigger character and the cursor.
4. Rejects the trigger if the query contains whitespace with embedded spaces (i.e., the query must be a contiguous word-like fragment, though a single trailing space is tolerated).
5. Among all matching triggers, selects the one with the longest `triggerCharacter` string. This ensures that a multi-character trigger like `//` takes priority over `/`.

The matched trigger and its position are stored in `_activeTrigger` and `_triggerStartIndex`, then `_buildOptions()` is called with the extracted query.

## Suggestion Fetching (Sync and Async)

`_buildOptions()` (`autocomplete.ts:157-170`) invokes the trigger's `optionsBuilder` with the query string. If the result is a `Promise`, it assigns an incrementing `_pendingAsync` counter to track the request. When the promise resolves, it checks that the component is still mounted and that no newer async request has been issued (stale-request guard via `asyncId !== this._pendingAsync`). Synchronous results are applied immediately.

`_applyOptions()` (`autocomplete.ts:172-184`) performs client-side fuzzy filtering on the returned options using the `fuzzyMatch` helper, matching against both `label` and `value`. Results are capped to `maxOptionsVisible` (default 10). A `setState` call updates `_options` and `_isVisible`, triggering a rebuild.

## Fuzzy Matching

The `fuzzyMatch` function (`autocomplete.ts:290-300`) implements a simple case-insensitive subsequence match. It iterates through the text character by character, advancing through query characters when matches are found. It returns `true` only if all query characters are found in order within the text. This allows queries like "rfl" to match "ReactFlutter" or similar non-contiguous patterns.

## Selection Handling

When a user selects an option, `_selectOption()` (`autocomplete.ts:196-213`) performs text replacement:

1. The text from `_triggerStartIndex` to the current cursor position is replaced with the trigger character concatenated with the option's `value`.
2. The cursor position is updated to the end of the inserted text.
3. The `onSelected` callback is invoked.
4. The popup is dismissed via `_dismiss()`.

## Popup/Overlay Rendering

The `build()` method (`autocomplete.ts:231-255`) conditionally renders the suggestion popup. When no suggestions are visible, it returns just the child widget. When suggestions exist, it either delegates to the custom `optionsViewBuilder` or builds a default view using `_buildDefaultOptionsView()`.

The default view (`autocomplete.ts:257-279`) maps `AutocompleteOption` items to `SelectionItem` objects and creates a `SelectionList` widget. The popup is composed above the child widget in a `Column` with `mainAxisSize: 'min'`, meaning the options list appears directly above the text input. The `onSelect` callback maps back to `_selectOption`, and `onCancel` triggers `_dismiss`.

## Keyboard Navigation via SelectionList

The actual keyboard navigation is handled entirely by the `SelectionList` widget (`selection-list.ts:104-315`), which is the default popup renderer. `SelectionListState.handleKeyEvent()` (`selection-list.ts:145-194`) supports:

- **ArrowUp / k / Ctrl+p / Shift+Tab**: Move selection to the previous enabled item.
- **ArrowDown / j / Ctrl+n / Tab**: Move selection to the next enabled item.
- **Enter**: Confirm the current selection, invoking the `onSelect` callback.
- **Escape**: Cancel, invoking the `onCancel` callback (which triggers `_dismiss` in Autocomplete).

Navigation wraps around and automatically skips disabled items using `_moveToNextEnabled()` (`selection-list.ts:288-301`), which iterates in the given direction with modular arithmetic. The `SelectionList` is wrapped in a `FocusScope` with `autofocus: true` to capture keyboard events.

The `Autocomplete` widget itself has a `_handleKeyEvent` method (`autocomplete.ts:215-229`) that handles `Escape` to dismiss the popup, but delegates `ArrowUp`, `ArrowDown`, and `Enter` as `'ignored'` so they propagate to the `SelectionList`'s `FocusScope`.

## Visual Rendering of Suggestions

Each suggestion item is rendered as a `Text` widget with a `TextSpan`. The currently selected item is prefixed with `> ` and styled with `bold: true, inverse: true` (highlighted). Unselected items are prefixed with two spaces. Disabled items are rendered with `dim: true`. When `showDescription` is enabled (which it is by default for autocomplete), the item's description is appended after a ` - ` separator.

Mouse interaction is also supported: clicking an item calls `handleMouseClick()` (`selection-list.ts:200-209`), which sets the index and immediately confirms the selection.

## InputArea Integration

The `InputArea` widget (`input-area.ts:35-249`) integrates autocomplete by accepting an optional `autocompleteTriggers` array in its props. In its `build()` method (line 120-134), it creates a default `@` file trigger (currently returning an empty array) and merges it with any externally provided triggers:

```ts
const defaultFileTrigger: AutocompleteTrigger = {
  triggerCharacter: '@',
  optionsBuilder: () => [],
};
const triggers: AutocompleteTrigger[] = [
  defaultFileTrigger,
  ...(this.widget.autocompleteTriggers ?? []),
];
```

The `TextField` is then wrapped with `new Autocomplete({ child: textField, controller: this.controller, triggers })`. This autocomplete-wrapped input is placed inside a bordered `Container` with rounded borders and horizontal padding.

## BottomGrid Passthrough

The `BottomGrid` widget (`bottom-grid.ts:33-240`) is the higher-level layout component for the bottom of the chat UI. It accepts `autocompleteTriggers` in its props and passes them directly through to `InputArea` at line 101: `autocompleteTriggers: w.autocompleteTriggers`. This allows the application layer to inject custom trigger configurations (such as slash commands for `/help`, `/model`, etc.) that flow down through the widget tree to the autocomplete system.

## Summary

The autocomplete system follows a clean separation of concerns: `AutocompleteTrigger` defines the contract for suggestion providers, `Autocomplete` manages trigger detection and text replacement, and `SelectionList` handles the interactive popup with full keyboard and mouse navigation. The design supports multiple concurrent triggers with longest-match priority, asynchronous option fetching with stale-request cancellation, fuzzy substring matching, and a pluggable view builder for custom popup rendering. The integration path flows from the application layer through `BottomGrid` to `InputArea` to `Autocomplete`, making it straightforward to register new trigger-based completions like `@` mentions or `/` slash commands.
