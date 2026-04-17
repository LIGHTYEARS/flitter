# Spec 1: CommandPalette + MouseManager Global Callbacks

**Date:** 2026-04-17
**Scope:** FuzzyPicker generic widget, CommandPalette rewrite, MouseManager global release/click callbacks
**Amp references:** `ha` (MouseManager), `we`/`NZT` (FuzzyPicker), `qZT`/`zZT`/`UZT` (CommandPalette wrapper), `i0R`/`s0R` (full CommandPalette), `hH0` (sort comparator), `GE0`/`FE0`/`hB` (fuzzy scoring)

---

## 1. MouseManager Global Callbacks

### 1.1 Problem

`MouseManager._handleRelease` at line 348 has a placeholder comment: `// Skip global release callbacks (not implemented in this phase)`. Amp's `ha` class provides global release and click callback registries that fire **before** per-target dispatch, enabling mouse-capture patterns (e.g., drag-selection that must receive the release event even when the cursor moves outside the originating widget's bounds).

Without these, any widget implementing drag-selection gets stuck in a "dragging" state when the release occurs outside its hit-test area.

### 1.2 Design

**Amp reference:** `modules/2026_tail_anonymous.js`, class `ha`, lines 158200–158517.

Add to `packages/tui/src/gestures/mouse-manager.ts`:

#### New fields

```ts
private _globalReleaseCallbacks = new Set<() => void>();
private _globalClickCallbacks = new Set<(info: GlobalClickInfo) => void>();
```

```ts
interface GlobalClickInfo {
  event: MouseEvent;           // raw mouse event
  globalPosition: Position;    // { x, y }
  mouseTargets: MouseTarget[]; // hit-tested targets
  clickCount: number;
}
```

#### New public methods

```ts
addGlobalReleaseCallback(cb: () => void): void
removeGlobalReleaseCallback(cb: () => void): void
addGlobalClickCallback(cb: (info: GlobalClickInfo) => void): void
removeGlobalClickCallback(cb: (info: GlobalClickInfo) => void): void
```

#### Integration points

**`_handleRelease`:** Replace the placeholder comment with:
```ts
for (const cb of this._globalReleaseCallbacks) cb();
```
This goes **before** the `if (this._dragTargets.length > 0)` branch. Callbacks receive **no arguments** — they are zero-argument notifications. Matches amp line 158292.

**`_handleClick`:** After `_calculateClickCount` returns `clickCount`, before the per-target dispatch loop:
```ts
for (const cb of this._globalClickCallbacks) {
  cb({ event, globalPosition, mouseTargets, clickCount });
}
```
Matches amp lines 158345–158350.

**`dispose()`:** Add before `MouseManager._instance = null`:
```ts
this._globalReleaseCallbacks.clear();
this._globalClickCallbacks.clear();
```

### 1.3 Testing

- Unit test: register a release callback, simulate a release event, verify callback fires before target dispatch.
- Unit test: register a click callback, simulate click, verify callback receives `{ event, globalPosition, mouseTargets, clickCount }`.
- Unit test: `removeGlobalReleaseCallback` prevents future invocations.
- Unit test: `dispose()` clears both Sets.

---

## 2. Fuzzy Scoring Algorithm

### 2.1 Problem

The CommandPalette needs fuzzy matching to filter and rank items as the user types. Amp uses a recursive DP scorer (`hB`) with word-boundary awareness, multi-word splitting, and a 0.15 threshold.

### 2.2 Design

**Amp reference:** `modules/2491_unknown_VE0.js` (`GE0`), `modules/2486_unknown_FE0.js` (`FE0`), `modules/2485_unknown_hB.js` (`hB`).

New file: `packages/tui/src/overlay/fuzzy-match.ts`

#### Public API

```ts
interface FuzzyMatchResult {
  matches: boolean;  // score > threshold (0.15)
  score: number;     // 0.0–1.0
}

function fuzzyMatch(query: string, label: string): FuzzyMatchResult
```

#### Algorithm

**`fuzzyMatch(query, label)`** — mirrors `GE0`:
- Empty query: `{ matches: true, score: 1.0 }` (show everything)
- Otherwise: compute score via `fuzzyScore(label, query)`, return `{ matches: score > 0.15, score }`

**`fuzzyScore(label, query)`** — mirrors `FE0`:
- Compute `fullScore = recursiveMatch(label, query, normLabel, normQuery, 0, 0, memo)`
- If query contains spaces, split into words, score each word independently, compute `wordAvg = average(wordScores) * 0.95`
- Return `Math.max(fullScore, wordAvg)`

**`recursiveMatch(text, query, normText, normQuery, ti, qi, memo)`** — mirrors `hB`:
- Memoized by `(ti, qi)` key
- Base case: `qi === normQuery.length` → return `1.0` (or `0.99` if text remaining)
- Find char `normQuery[qi]` in `normText` starting at `ti`
- For each match position `s`:
  - **Consecutive** (`s === ti`): multiplier `1.0`
  - **Word boundary** (preceded by space/hyphen/underscore): multiplier `0.9`, skip penalty `0.999^(skippedWordBoundaries)`
  - **CamelCase boundary** (preceded by lowercase): multiplier `0.8`, similar skip penalty
  - **Other**: multiplier `0.3`, skip penalty `0.999^(s - ti)`
  - **Case mismatch** (`text[s] !== query[qi]`): additional `0.9999` multiplier
- Score = `multiplier * skipPenalty * casePenalty * recursiveMatch(text, query, normText, normQuery, s+1, qi+1, memo)`
- Return max score across all match positions

**Normalization:** `normalize(str)` → `str.toLowerCase()`

### 2.3 Testing

- `fuzzyMatch("", "anything")` → `{ matches: true, score: 1.0 }`
- `fuzzyMatch("abc", "abc")` → exact match, score near 1.0
- `fuzzyMatch("fb", "FooBar")` → camelCase boundary match, score > 0.15
- `fuzzyMatch("gp", "git push")` → word boundary match, score > 0.15
- `fuzzyMatch("xyz", "FooBar")` → no match, score < 0.15
- Multi-word: `fuzzyMatch("git pu", "git push")` → matches, higher score than `fuzzyMatch("gp", "git push")`

---

## 3. FuzzyPicker Widget

### 3.1 Problem

The CommandPalette needs a generic reusable picker UI that combines text input + filtered scrollable list + keyboard navigation + mouse interaction. This same component can later be reused for file pickers, symbol pickers, etc.

### 3.2 Design

**Amp reference:** `misc_utils.js:2393` (widget `we`), `actions_intents.js:2644` (state `NZT`).

New file: `packages/tui/src/overlay/fuzzy-picker.ts`

#### Props

```ts
interface FuzzyPickerProps<T> {
  items: T[];
  getLabel: (item: T) => string;
  renderItem?: (item: T, isSelected: boolean, isDisabled: boolean, ctx: BuildContext) => Widget;
  onAccept: (item: T, info: { hasUserInteracted: boolean }) => void;
  onDismiss?: () => void;
  sortItems?: (a: ScoredItem<T>, b: ScoredItem<T>, query: string) => number;
  filterItem?: (item: T, query: string) => boolean;
  isItemDisabled?: (item: T) => boolean;
  normalizeQuery?: (query: string) => string;
  title?: string;
  maxRenderItems?: number;
  controller?: FuzzyPickerController;
}

interface ScoredItem<T> {
  item: T;
  score: number;
  matches: boolean;
}

class FuzzyPickerController {
  query: string;
  selectedItem: T | null;
}
```

#### State fields (mirrors `NZT`)

```ts
class FuzzyPickerState<T> extends State<FuzzyPicker<T>> {
  private textController: TextEditingController;
  private focusNode: FocusNode;
  private scrollController: ScrollController;
  private selectedIndex = 0;
  private hasUserInteracted = false;
  private cachedQuery = "";
  private cachedFiltered: T[] = [];
  private itemContexts: BuildContext[] = [];
}
```

#### `initState()`

1. Create `textController` with initial query from `widget.controller?.query`
2. Create `focusNode`
3. Create `scrollController`
4. Add text-change listener: `hasUserInteracted = true`, `selectedIndex = 0`, `recomputeFilteredItems()`, `setState()`, post-frame `ensureSelectedItemVisible()`
5. Call `recomputeFilteredItems()` once

#### `recomputeFilteredItems()`

Pipeline (matches amp `NZT` line 2724):
```
query = textController.text
normalizedQuery = widget.normalizeQuery?.(query) ?? query

filteredItems = items
  .filter(item => !filterItem || filterItem(item, query))
  .map(item => ({ item, ...fuzzyMatch(normalizedQuery, getLabel(item)) }))
  .filter(scored => scored.matches)
  .sort(sortItems ?? ((a, b) => b.score - a.score))
  .map(scored => scored.item)
  .slice(0, maxRenderItems ?? Infinity)
```

#### Keyboard bindings

Via `Shortcuts` → `Actions` (matches amp `NZT` lines 2800–2813):

| Key | Intent | Action |
|-----|--------|--------|
| `ArrowDown` | `MoveDownIntent` | `selectedIndex++`, scroll into view |
| `ArrowUp` | `MoveUpIntent` | `selectedIndex--`, scroll into view |
| `Tab` | `MoveDownIntent` | same as ArrowDown |
| `Shift+Tab` | `MoveUpIntent` | same as ArrowUp |
| `Ctrl+N` | `MoveDownIntent` | same as ArrowDown |
| `Ctrl+P` | `MoveUpIntent` | same as ArrowUp |
| `Enter` | `AcceptIntent` | call `onAccept(selectedItem, { hasUserInteracted })` |
| `Escape` | `DismissIntent` | call `onDismiss()` |

Intent and Action classes: reuse existing `Intent`/`Action` from `packages/tui/src/actions/`. Define `MoveDownIntent`, `MoveUpIntent`, `AcceptIntent`, `DismissIntent` as simple intent subclasses.

#### Mouse handling

- **Scroll** on the list area: move `selectedIndex` up/down by 1, `setState`, `ensureSelectedItemVisible()`
- **Single click** on item: set `selectedIndex = clickedItemIndex`, `setState`
- **Double click** on item: if not disabled, call `onAccept(item, { hasUserInteracted })`

#### `ensureSelectedItemVisible()`

Post-frame callback (matches amp `NZT` line 2740):
1. Get `renderObject` from `itemContexts[selectedIndex]`
2. Walk up to find enclosing scroll viewport
3. If item top < visible area → scroll up
4. If item bottom > visible area → scroll down
5. Clamp to `[0, maxScrollExtent]`, call `scrollController.jumpTo(offset)`

#### `build()` widget tree

```
DecoratedBox (border: Border.all(color: foreground), bgColor: background, padding: EdgeInsets.horizontal(1))
  Column (children: [
    // Optional title
    if (title) ...[
      Padding (symmetric: vertical=1, horizontal=0)
        Text (title, style: bold + command color)
    ],

    // Prompt row
    Row ([
      Text (">", style: foreground color),
      Expanded (
        Shortcuts (shortcuts: keyMap,
          Actions (actions: intentMap,
            TextField (
              controller: textController,
              focusNode: focusNode,
              autofocus: true,
              maxLines: 1,
              style: { noBorder }
            )
          )
        )
      )
    ]),

    SizedBox (height: 1),  // spacer

    // Results list
    Expanded (
      GestureDetector (onScroll: handleScroll,
        SingleChildScrollView (controller: scrollController,
          Column (crossAxisAlignment: start, children: [
            for (i, item) in filteredItems:
              ContextCapture (callback: ctx => itemContexts[i] = ctx,
                GestureDetector (onClick: (clickCount) => handleItemClick(i, clickCount),
                  renderItem?.(item, i === selectedIndex, isDisabled(item), ctx)
                    ?? defaultRenderItem(item, i === selectedIndex, isDisabled(item))
                )
              )
          ])
        )
      )
    )
  ])
```

**Default render item:** `Container(color: isSelected ? selectionBg : null, padding: horizontal(1), child: Text(getLabel(item), style: isDisabled ? dim : normal))`

**ContextCapture helper:** A small `StatelessWidget` whose `build()` stores the `BuildContext` into a callback — mirrors amp's `wZT`/`BZT` at `text_rendering.js:2008`. This is needed for `ensureSelectedItemVisible()` to locate each item's render object. Defined inside `fuzzy-picker.ts`:

```ts
class ContextCapture extends StatelessWidget {
  constructor(private child: Widget, private onBuild: (ctx: BuildContext) => void) { super(); }
  build(context: BuildContext): Widget {
    this.onBuild(context);
    return this.child;
  }
}
```

### 3.3 Testing

- Unit test: renders title, prompt, and items
- Unit test: typing filters items via fuzzy match
- Unit test: ArrowDown/ArrowUp changes selectedIndex
- Unit test: Enter fires onAccept with correct item
- Unit test: Escape fires onDismiss
- E2E test (tmux): launch a demo with FuzzyPicker, type a query, verify filtered results appear, press Enter, verify accept callback

---

## 4. CommandPalette Rewrite

### 4.1 Problem

`packages/tui/src/overlay/command-palette.ts` has a placeholder `build()` that returns `Text("Command Palette (N commands)")`. Now that all dependencies (TextField, FuzzyPicker, Actions, Shortcuts) are implemented, rewrite it to render a full interactive palette.

### 4.2 Design

**Amp reference:** `misc_utils.js:2529` (`qZT`/`zZT` simple wrapper), `misc_utils.js:5298` (`i0R` full palette), `misc_utils.js:2404` (`UZT` FuzzyPicker wrapper).

Rewrite `packages/tui/src/overlay/command-palette.ts`:

#### Keep existing infrastructure

The current file has working:
- `Command` interface with `label`, `description`, `action`, `enabled`, `shortcut`
- `TextEditingController` creation and lifecycle
- `AutocompleteController` setup
- `_filterCommands` and `_executeCommand` methods

Adapt these to work through FuzzyPicker's callback interface.

#### Rewritten `build()` method

```ts
build(context: BuildContext): Widget {
  const categoryWidth = this._maxNounWidth();

  return new Center({
    child: new SizedBox({
      width: 80,
      height: 20,
      child: new FuzzyPicker<Command>({
        items: this.widget.commands,
        title: "Command Palette",
        getLabel: (cmd) => `${cmd.category ?? ""} ${cmd.label}`.toLowerCase(),
        renderItem: (cmd, isSelected, isDisabled, ctx) => {
          return this._buildCommandItem(cmd, isSelected, isDisabled, categoryWidth);
        },
        isItemDisabled: (cmd) => cmd.enabled === false,
        sortItems: (a, b, query) => this._sortCommands(a, b, query),
        onAccept: (cmd, { hasUserInteracted }) => {
          this._executeCommand(cmd);
        },
        onDismiss: () => {
          this.widget.onDismiss?.();
        },
      }),
    }),
  });
}
```

#### `_buildCommandItem` (render item)

Matches amp's `HZT` / `i0R.renderItem`:

```ts
_buildCommandItem(cmd: Command, isSelected: boolean, isDisabled: boolean, categoryWidth: number): Widget {
  const children: Widget[] = [];

  // Noun/category column (fixed width, right-aligned, muted when not selected)
  if (categoryWidth > 0) {
    children.push(new SizedBox({
      width: categoryWidth,
      child: new Text({
        data: cmd.category ?? "",
        style: new TextStyle({ color: isSelected ? foreground : mutedForeground }),
        textAlign: TextAlign.right,
      }),
    }));
    children.push(new SizedBox({ width: 1 }));  // separator
  }

  // Verb/label column (expanded, bold)
  children.push(new Expanded({
    child: new Text({
      data: cmd.label,
      style: new TextStyle({
        bold: true,
        color: isDisabled ? mutedForeground : foreground,
      }),
    }),
  }));

  // Shortcut column (if present)
  if (cmd.shortcut) {
    children.push(new Text({
      data: cmd.shortcut,
      style: new TextStyle({ color: mutedForeground }),
    }));
  }

  // Selection background
  return new Container({
    color: isSelected ? selectionBackground : undefined,
    padding: EdgeInsets.symmetric({ horizontal: 1 }),
    child: new Row({ children }),
  });
}
```

#### `_sortCommands` (sort comparator)

Matches amp's `hH0` at `modules/2786_unknown_hH0.js`:

Priority order:
1. **Exact noun/verb match:** if `a.noun.toLowerCase() === normalizedQuery` → a first
2. **Fuzzy score:** `b.score - a.score`
3. **Explicit priority:** `b.priority - a.priority` (if commands have a priority field)

Note: amp's full `hH0` also uses "command follows" (recently-used tracking) and alias matching. For the initial implementation, we skip the follows tracking (requires persistent state) and alias matching (commands don't yet have aliases). These can be added later.

#### `_maxNounWidth`

```ts
_maxNounWidth(): number {
  return Math.max(0, ...this.widget.commands.map(cmd => (cmd.category ?? "").length));
}
```

#### `Command` interface update

Add an optional `category` field (maps to amp's "noun") and optional `priority` field:

```ts
interface Command {
  label: string;          // verb text
  description?: string;
  action: () => void | Promise<void>;
  enabled?: boolean;
  shortcut?: string;
  category?: string;      // noun text (displayed in left column)
  priority?: number;      // sort priority (higher = more prominent)
}
```

### 4.3 Testing

- Unit test: `build()` returns a widget tree containing FuzzyPicker
- Unit test: `_buildCommandItem` renders noun + verb + shortcut columns
- Unit test: `_sortCommands` ranks exact matches above fuzzy matches
- E2E test (tmux): launch a demo app with CommandPalette overlay, type a partial command name, verify filtering works, press Enter, verify command executes

---

## 5. New Files Summary

| File | Purpose |
|------|---------|
| `packages/tui/src/overlay/fuzzy-match.ts` | Fuzzy scoring algorithm (`fuzzyMatch`, `fuzzyScore`, `recursiveMatch`) |
| `packages/tui/src/overlay/fuzzy-picker.ts` | `FuzzyPicker` generic StatefulWidget + `FuzzyPickerState` + intent classes |

## 6. Modified Files Summary

| File | Changes |
|------|---------|
| `packages/tui/src/gestures/mouse-manager.ts` | Add `_globalReleaseCallbacks`, `_globalClickCallbacks`, 4 public methods, integrate into `_handleRelease`/`_handleClick`/`dispose()` |
| `packages/tui/src/overlay/command-palette.ts` | Rewrite `build()` to use FuzzyPicker, add `_buildCommandItem`, `_sortCommands`, `_maxNounWidth`, update `Command` interface |
| `packages/tui/src/index.ts` | Export new modules |

## 7. Dependencies

- `FuzzyPicker` depends on: `TextField`, `SingleChildScrollView`, `Column`, `Row`, `Expanded`, `SizedBox`, `Container`, `Text`, `GestureDetector`, `Focus`, `Actions`, `Shortcuts`, `ScrollController`, `TextEditingController`, `FocusNode` — all already implemented.
- `CommandPalette` depends on: `FuzzyPicker`, `fuzzyMatch` — new in this spec.
- `MouseManager` changes are independent — no dependency on FuzzyPicker or CommandPalette.

## 8. Implementation Order

1. **MouseManager global callbacks** — independent, unblocks future drag-selection work
2. **Fuzzy scoring algorithm** — pure function, no widget dependencies, easy to test in isolation
3. **FuzzyPicker widget** — depends on fuzzy scoring
4. **CommandPalette rewrite** — depends on FuzzyPicker
5. **E2E verification** — tmux test with a demo app showing the full CommandPalette

## 9. Out of Scope

- `CZT` modal stack controller (deferred — not needed until commands can push sub-views)
- Command "follows" tracking / recently-used sorting (requires persistent state)
- Alias matching in sort comparator (commands don't yet have aliases)
- `buildDisabledReasonWidget` panel (the right-side disabled-reason display from amp's full `i0R`)
- Click-outside-to-dismiss (amp doesn't implement this for CommandPalette either)
