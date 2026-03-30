# Gap U06: Command Palette Search/Filter

## Problem

The command palette (`CommandPalette` in `packages/flitter-amp/src/widgets/command-palette.ts`)
displays a static list of commands with no search input or fuzzy matching. Users must visually
scan and arrow-key through the entire list to find the command they want. As the command list
grows, this becomes increasingly unusable. Real command palettes (VS Code, Sublime Text, the
original Amp binary) all feature a text input at the top that filters and ranks results as the
user types.

### Current Architecture

`CommandPalette` is a `StatelessWidget` that:

1. Renders a title ("Command Palette") inside a bordered `Container`.
2. Passes a hardcoded `COMMANDS` array directly to a `SelectionList`.
3. `SelectionList` handles keyboard navigation (j/k, arrows, Enter, Escape) and renders
   each item as a `Text` widget.
4. There is no `TextField`, no `TextEditingController`, and no filtering logic.

### Relevant Framework Primitives Already Available

| Widget / Class            | Module                                      | Purpose                              |
|---------------------------|---------------------------------------------|--------------------------------------|
| `TextField`               | `flitter-core/src/widgets/text-field.ts`     | Full-featured text input widget      |
| `TextEditingController`   | `flitter-core/src/widgets/text-field.ts`     | Text state + cursor + change notify  |
| `SelectionList`           | `flitter-core/src/widgets/selection-list.ts`  | Keyboard-navigable item list         |
| `FocusScope` / `FocusNode`| `flitter-core/src/input/focus.ts`            | Focus management                     |
| `Column`                  | `flitter-core/src/widgets/flex.ts`           | Vertical layout                      |
| `SizedBox`                | `flitter-core/src/widgets/sized-box.ts`      | Spacing                              |
| `Container`               | `flitter-core/src/widgets/container.ts`      | Decoration + padding                 |

The framework already has everything needed. No new core widgets are required.

---

## Proposed Solution

Convert `CommandPalette` from a `StatelessWidget` to a `StatefulWidget` that contains a
`TextField` for search input and dynamically filters the `SelectionList` items using fuzzy
matching. The solution has three parts:

1. **Fuzzy matching engine** -- a pure function that scores how well a query matches a label.
2. **Stateful command palette** -- manages the search text, filtered list, and keyboard routing.
3. **Keyboard flow coordination** -- routes key events between the text field and the selection
   list so that typing filters while arrow keys navigate.

### Part 1: Fuzzy Matching Algorithm

A fuzzy matcher scores each command against the user's query. The algorithm:

- Converts both query and target to lowercase.
- Walks through the query characters in order, finding each one in the target string.
- Awards bonus points for: (a) matching at the start of the string, (b) matching at the start
  of a word boundary (after space, hyphen, or uppercase transition), (c) consecutive character
  matches.
- Returns `null` if not all query characters are found (no match).
- Returns a numeric score if matched (higher is better).

This is the same general approach used by VS Code, fzf, and the original Amp binary.

```typescript
/**
 * Fuzzy match a query against a target string.
 * Returns a score (higher = better) or null if no match.
 * Matches query characters in order within the target, awarding
 * bonuses for word-boundary and consecutive matches.
 */
export function fuzzyMatch(query: string, target: string): number | null {
  if (query.length === 0) return 1; // empty query matches everything
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  let score = 0;
  let targetIdx = 0;
  let prevMatchIdx = -2; // track consecutive matches

  for (let qi = 0; qi < q.length; qi++) {
    const qChar = q[qi]!;
    let found = false;

    while (targetIdx < t.length) {
      if (t[targetIdx] === qChar) {
        // Base score for each matched character
        score += 1;

        // Bonus: match at the very start of the string
        if (targetIdx === 0) {
          score += 5;
        }

        // Bonus: match at a word boundary
        // (character after space, hyphen, underscore, or case transition)
        if (targetIdx > 0) {
          const prev = target[targetIdx - 1]!;
          if (prev === ' ' || prev === '-' || prev === '_') {
            score += 3;
          } else if (
            prev === prev.toLowerCase() &&
            target[targetIdx] === target[targetIdx]!.toUpperCase() &&
            target[targetIdx] !== target[targetIdx]!.toLowerCase()
          ) {
            // camelCase boundary
            score += 3;
          }
        }

        // Bonus: consecutive match (previous match was the immediately prior char)
        if (targetIdx === prevMatchIdx + 1) {
          score += 2;
        }

        prevMatchIdx = targetIdx;
        targetIdx++;
        found = true;
        break;
      }
      targetIdx++;
    }

    if (!found) return null; // query character not found -- no match
  }

  // Bonus: prefer shorter targets (less noise)
  score += Math.max(0, 10 - target.length);

  return score;
}
```

The function also matches against the `description` field with a reduced weight, so searching
"expand" finds "Toggle tool calls" via its description "Expand/collapse all tool blocks".

```typescript
/**
 * Score a SelectionItem against a query, considering both
 * label (primary) and description (secondary, half weight).
 */
export function scoreCommand(
  query: string,
  item: { label: string; description?: string },
): number | null {
  const labelScore = fuzzyMatch(query, item.label);
  const descScore = item.description
    ? fuzzyMatch(query, item.description)
    : null;

  if (labelScore === null && descScore === null) return null;

  // Label match takes priority; description match is secondary
  const ls = labelScore ?? 0;
  const ds = descScore !== null ? Math.floor(descScore * 0.5) : 0;
  return ls + ds;
}
```

### Part 2: Converting CommandPalette to StatefulWidget

The `CommandPalette` becomes a `StatefulWidget`. Its state holds:

- A `TextEditingController` for the search input.
- A derived `filteredItems` array recomputed on every text change.
- The current query string cached for comparison.

```typescript
interface CommandPaletteProps {
  onExecute: (command: string) => void;
  onDismiss: () => void;
  commands?: SelectionItem[];  // allow external command registration
}

export class CommandPalette extends StatefulWidget {
  readonly onExecute: (command: string) => void;
  readonly onDismiss: () => void;
  readonly commands: readonly SelectionItem[];

  constructor(props: CommandPaletteProps) {
    super({});
    this.onExecute = props.onExecute;
    this.onDismiss = props.onDismiss;
    this.commands = props.commands ?? COMMANDS;
  }

  createState(): State<CommandPalette> {
    return new CommandPaletteState();
  }
}
```

### Part 3: CommandPaletteState -- Filtering and Keyboard Routing

The state class manages the lifecycle of the search controller and coordinates focus between
the text input and the selection list.

```typescript
class CommandPaletteState extends State<CommandPalette> {
  private searchController = new TextEditingController();
  private filteredItems: SelectionItem[] = [];
  private currentQuery = '';

  initState(): void {
    super.initState();
    // Initially show all commands
    this.filteredItems = [...this.widget.commands];
    this.searchController.addListener(this._onSearchChanged);
  }

  dispose(): void {
    this.searchController.removeListener(this._onSearchChanged);
    this.searchController.dispose();
    super.dispose();
  }

  /**
   * Recompute filtered items whenever the search text changes.
   * Uses fuzzy scoring to rank results, then sorts by score descending.
   */
  private _onSearchChanged = (): void => {
    const query = this.searchController.text.trim();
    if (query === this.currentQuery) return;

    this.currentQuery = query;
    this.setState(() => {
      if (query.length === 0) {
        // No query: show all commands in original order
        this.filteredItems = [...this.widget.commands];
      } else {
        // Score and filter
        const scored: Array<{ item: SelectionItem; score: number }> = [];
        for (const item of this.widget.commands) {
          const score = scoreCommand(query, item);
          if (score !== null) {
            scored.push({ item, score });
          }
        }
        // Sort by score descending (best matches first)
        scored.sort((a, b) => b.score - a.score);
        this.filteredItems = scored.map((s) => s.item);
      }
    });
  };

  /**
   * Handle key events at the palette level.
   * - Escape always dismisses.
   * - ArrowDown / ArrowUp / Enter are forwarded to SelectionList.
   * - All other keys go to the TextField for search input.
   */
  private _handlePaletteKey = (event: KeyEvent): KeyEventResult => {
    if (event.key === 'Escape') {
      this.widget.onDismiss();
      return 'handled';
    }

    // Enter with no filtered items: ignore
    if (event.key === 'Enter' && this.filteredItems.length === 0) {
      return 'handled';
    }

    // Let navigation keys pass through to SelectionList
    // (ArrowUp, ArrowDown, j, k, Tab are handled by SelectionList's FocusScope)
    return 'ignored';
  };

  build(context: BuildContext): Widget {
    const theme = AmpThemeProvider.maybeOf(context);
    const infoColor = theme?.base.info ?? Color.cyan;
    const mutedColor = theme?.base.mutedForeground ?? Color.brightBlack;
    const side = new BorderSide({
      color: infoColor,
      width: 1,
      style: 'rounded' as any,
    });

    // Search input field
    const searchField = new TextField({
      controller: this.searchController,
      autofocus: true,
      placeholder: 'Type to search...',
      maxLines: 1,
      style: new TextStyle({ foreground: theme?.base.foreground }),
      cursorChar: '\u2588',
    });

    // Search input with underline decoration
    const searchContainer = new Container({
      decoration: new BoxDecoration({
        border: new Border({
          bottom: new BorderSide({ color: mutedColor, width: 1 }),
        }),
      }),
      padding: EdgeInsets.symmetric({ horizontal: 0, vertical: 0 }),
      child: searchField,
    });

    // Result count hint
    const total = this.widget.commands.length;
    const shown = this.filteredItems.length;
    const countText = this.currentQuery.length > 0
      ? `${shown}/${total} commands`
      : `${total} commands`;
    const countWidget = new Text({
      text: new TextSpan({
        text: countText,
        style: new TextStyle({ foreground: mutedColor, dim: true }),
      }),
    });

    // Build the list or "no results" message
    let listArea: Widget;
    if (this.filteredItems.length > 0) {
      listArea = new SelectionList({
        items: this.filteredItems,
        onSelect: this.widget.onExecute,
        onCancel: this.widget.onDismiss,
        showDescription: true,
      });
    } else {
      listArea = new Text({
        text: new TextSpan({
          text: 'No matching commands',
          style: new TextStyle({ foreground: mutedColor, italic: true }),
        }),
      });
    }

    return new FocusScope({
      autofocus: true,
      onKey: this._handlePaletteKey,
      child: new Column({
        mainAxisAlignment: 'start',
        crossAxisAlignment: 'center',
        children: [
          new SizedBox({ height: 2 }),
          new Container({
            decoration: new BoxDecoration({ border: Border.all(side) }),
            padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
            constraints: new BoxConstraints({ maxWidth: 60 }),
            child: new Column({
              mainAxisSize: 'min',
              crossAxisAlignment: 'start',
              children: [
                new Text({
                  text: new TextSpan({
                    text: 'Command Palette',
                    style: new TextStyle({
                      foreground: infoColor,
                      bold: true,
                    }),
                  }),
                }),
                new SizedBox({ height: 1 }),
                searchContainer,
                new SizedBox({ height: 1 }),
                countWidget,
                new SizedBox({ height: 0 }),
                listArea,
              ],
            }),
          }),
        ],
      }),
    });
  }
}
```

---

## Keyboard Interaction Design

The palette has two interactive zones: the search `TextField` and the `SelectionList`. Keys
must be routed correctly so that typing updates the filter while navigation keys control the
list. The routing strategy:

| Key               | Behavior                                            |
|-------------------|-----------------------------------------------------|
| Any printable     | Goes to `TextField` -- updates search query         |
| Backspace/Delete  | Goes to `TextField` -- edits search query           |
| ArrowDown / j     | Goes to `SelectionList` -- moves highlight down     |
| ArrowUp / k       | Goes to `SelectionList` -- moves highlight up       |
| Tab               | Goes to `SelectionList` -- cycles through items     |
| Enter             | Goes to `SelectionList` -- executes highlighted cmd |
| Escape            | Handled at palette level -- dismisses the palette   |
| Ctrl+n / Ctrl+p   | Goes to `SelectionList` -- next/prev item           |

This is achieved through the nested `FocusScope` hierarchy:

1. **Outer FocusScope** (palette level): intercepts `Escape`, passes everything else down.
2. **TextField FocusScope** (search): has `autofocus: true`, captures printable keys and
   editing keys.
3. **SelectionList FocusScope** (list): captures navigation keys (arrows, j/k, Enter, Tab).

Because the `SelectionList` already returns `'ignored'` for keys it does not handle (see
`SelectionListState.handleKeyEvent`, line 192 of `selection-list.ts`), unhandled keys
naturally bubble up to the TextField's FocusScope. Similarly, the TextField returns `'ignored'`
for arrow keys in single-line mode (lines 862-872 of `text-field.ts`), allowing them to reach
the SelectionList.

To make this work seamlessly, the focus ordering should be: TextField first (autofocus),
SelectionList second. Navigation keys that the single-line TextField ignores (ArrowUp,
ArrowDown) will propagate to the SelectionList. For `j` and `k`, which the TextField would
normally insert as text, an override is needed: when the TextField has focus and `j`/`k` is
pressed, check if the key should be treated as navigation. The simplest approach is to **not**
support `j`/`k` as navigation shortcuts within the searchable command palette (since the user
needs to type those letters), and rely on ArrowUp/ArrowDown, Ctrl+n/Ctrl+p, and Tab instead.
This matches VS Code's command palette behavior.

Alternatively, implement a **two-zone focus model**: the TextField captures all keys when it
has focus. Pressing ArrowDown transfers focus to the SelectionList. Pressing any printable key
in the SelectionList transfers focus back to the TextField. This is the pattern used by the
original Amp binary's file picker with search.

---

## Additional Enhancements

### Highlight Matched Characters

When rendering filtered results, highlight the characters that matched the query. This gives
users visual feedback about why a result appeared. Implementation: the `fuzzyMatch` function
returns the matched character indices alongside the score. The `SelectionList` (or a wrapper)
uses `TextSpan.children` to render matched characters in a bold/colored style and unmatched
characters in the default style.

```typescript
export interface FuzzyResult {
  score: number;
  matchedIndices: number[];
}

export function fuzzyMatchDetailed(
  query: string,
  target: string,
): FuzzyResult | null {
  if (query.length === 0) return { score: 1, matchedIndices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const matchedIndices: number[] = [];
  let score = 0;
  let targetIdx = 0;
  let prevMatchIdx = -2;

  for (let qi = 0; qi < q.length; qi++) {
    const qChar = q[qi]!;
    let found = false;
    while (targetIdx < t.length) {
      if (t[targetIdx] === qChar) {
        matchedIndices.push(targetIdx);
        score += 1;
        if (targetIdx === 0) score += 5;
        if (targetIdx > 0) {
          const prev = target[targetIdx - 1]!;
          if (' -_'.includes(prev)) score += 3;
        }
        if (targetIdx === prevMatchIdx + 1) score += 2;
        prevMatchIdx = targetIdx;
        targetIdx++;
        found = true;
        break;
      }
      targetIdx++;
    }
    if (!found) return null;
  }

  score += Math.max(0, 10 - target.length);
  return { score, matchedIndices };
}
```

To render with highlights, build a `TextSpan` with `children` that alternates between
normal-styled and highlight-styled spans based on `matchedIndices`.

### Extensible Command Registry

The `commands` prop allows external callers to inject additional commands. This enables
features like:

- Plugin-registered commands.
- Recently-used commands (sorted to top with a recency bonus).
- Context-dependent commands (e.g., showing "Resume generation" only when a generation is
  paused).

### Maximum Visible Items

When the command list grows large, cap the visible items in the SelectionList to avoid the
palette exceeding the terminal height. Add a `maxHeight` constraint on the list container and
rely on `SelectionList`'s existing scroll behavior (or add virtual scrolling if needed).

---

## File Changes Summary

| File | Change |
|------|--------|
| `packages/flitter-amp/src/widgets/command-palette.ts` | Rewrite: `StatelessWidget` to `StatefulWidget`; add `TextField`, fuzzy filter logic, keyboard routing, match highlighting |
| (optional) `packages/flitter-core/src/utils/fuzzy-match.ts` | Extract `fuzzyMatch` / `fuzzyMatchDetailed` / `scoreCommand` to a shared utility if other widgets (e.g., file picker) also need fuzzy search |

No changes are required to `SelectionList` or `TextField` -- they already have the necessary
APIs. The `SelectionList.items` prop is reactive: passing a new filtered array triggers
`didUpdateWidget` which resets the selection index if needed (lines 127-136 of
`selection-list.ts`).

---

## Testing Plan

1. **Unit tests for `fuzzyMatch`**:
   - Empty query matches everything.
   - Exact substring match returns a high score.
   - Non-matching query returns `null`.
   - Word-boundary matches score higher than mid-word matches.
   - Consecutive character matches score higher than scattered matches.
   - Case insensitivity works correctly.

2. **Unit tests for `scoreCommand`**:
   - Label-only match works.
   - Description match contributes half weight.
   - No match returns `null`.

3. **Widget tests for `CommandPalette`**:
   - Initially shows all commands.
   - Typing a query filters the list.
   - Clearing the query restores all commands.
   - ArrowDown/ArrowUp navigates the filtered list.
   - Enter on a highlighted item calls `onExecute` with the correct value.
   - Escape calls `onDismiss`.
   - "No matching commands" appears when query matches nothing.
   - Backspace in the search field removes characters and updates the filter.

4. **Integration tests**:
   - Open palette with Ctrl+O, type partial command name, press Enter -- correct command
     executes.
   - Open palette, type query with no matches, press Escape -- palette closes cleanly.
