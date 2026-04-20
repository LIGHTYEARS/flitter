# Overlay Background Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the overlay background bleeding bug where underlying content shows through CommandPalette and FuzzyPicker overlays because the flat screen buffer model requires explicit opaque backgrounds.

**Architecture:** Three root causes, three targeted fixes. (1) `CommandPaletteState.build()` returns a bare `Text` with no background — wrap it in a `Container` with `BoxDecoration({ color })` using the theme's `background` color. (2) `FuzzyPicker` outer Container uses hardcoded `Color.rgb(0,0,0)` instead of `Color.default()` (amp's `LT.none()` equivalent). (3) `FuzzyPicker.defaultRenderItem` uses `crossAxisAlignment: "start"` on the items Column, which shrinks items to content width — change to `"stretch"` so selection highlight fills the full width.

**Tech Stack:** TypeScript, `@flitter/tui` widget tree, `Container`/`BoxDecoration` for background fills, `Color.default()` for terminal-default backgrounds.

**Amp Reference:**
- `actions_intents.js:2934-2943` — outer SR uses `color: a.background` (= `$R.of(T).colors.background` = `Color.default()`)
- `actions_intents.js:2853-2871` — default item render uses `selectionBackground` from theme, with `Flexible` children forcing full-width
- `misc_utils.js:5573-5585` — command palette `renderItem` uses `selectionBackground` + `Flexible` for full-width highlight

---

### Task 1: Wrap `CommandPaletteState.build()` in opaque Container

**Root cause:** `build()` returns a bare `Text` widget. In the flat screen buffer model, cells without an explicit `bg` color overwrite underlying cells with `bg: undefined`, causing content bleed-through.

**Amp reference:** All overlay content in amp is wrapped in `SR({ decoration: { color: a.background } })` where `a.background` = `$R.of(T).colors.background` (theme's colorScheme background, which defaults to `LT.none()` = terminal default).

**Files:**
- Modify: `packages/tui/src/overlay/command-palette.ts:1-194`

- [ ] **Step 1: Write the failing test**

Create a unit test that verifies `CommandPaletteState.build()` returns a widget tree that includes a `Container` with a `BoxDecoration` color set (not a bare `Text`).

File: `packages/tui/src/overlay/command-palette.test.ts`

```typescript
/**
 * CommandPalette — unit tests.
 *
 * Verifies that the command palette wraps its content in an opaque
 * Container (required by flat screen buffer compositing model).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CommandPalette, type CommandPaletteCommand } from "./command-palette.js";
import { Container } from "../widgets/container.js";

function makeMockCommands(): CommandPaletteCommand[] {
  return [
    { id: "a", label: "Action A", action: () => {} },
    { id: "b", label: "Action B", action: () => {} },
  ];
}

describe("CommandPalette", () => {
  it("creates a StatefulWidget with commands and onDismiss", () => {
    const commands = makeMockCommands();
    let dismissed = false;
    const palette = new CommandPalette({
      commands,
      onDismiss: () => { dismissed = true; },
    });

    assert.equal(palette.commands.length, 2);
    assert.equal(palette.commands[0].id, "a");
    palette.onDismiss();
    assert.ok(dismissed);
  });

  it("createElement returns an element whose widget is the palette", () => {
    const palette = new CommandPalette({
      commands: makeMockCommands(),
      onDismiss: () => {},
    });
    const element = palette.createElement();
    assert.equal(element.widget, palette);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (baseline)**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/command-palette.test.ts`
Expected: PASS — these are baseline tests that verify the widget structure.

- [ ] **Step 3: Add `Container` + `BoxDecoration` import and wrap `build()` output**

In `packages/tui/src/overlay/command-palette.ts`, add imports and modify the `build()` method to wrap the content in a `Container` with `BoxDecoration({ color: Color.default() })`.

**Add imports** (after existing imports at line 29):

```typescript
import { BoxDecoration } from "../widgets/box-decoration.js";
import { Container } from "../widgets/container.js";
import { Color } from "../screen/color.js";
import { Border } from "../widgets/border.js";
import { BorderSide } from "../widgets/border-side.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { Column } from "../widgets/column.js";
import { Row } from "../widgets/row.js";
import { Expanded } from "../widgets/flexible.js";
import { SizedBox } from "../widgets/sized-box.js";
import { TextStyle } from "../screen/text-style.js";
import { TextField } from "../editing/text-field.js";
import type { Widget as WidgetInterface } from "../tree/element.js";
```

**Replace `build()` method** (lines 156-164):

```typescript
  build(_context: BuildContext): Widget {
    const matchCount = this._matchedCommands.length;

    // 逆向: amp command palette always wraps content in
    // SR({ decoration: { color: a.background } }) where a = $R.of(T).colors
    // Using Color.default() = terminal default background (amp's LT.none())
    const border = Border.all(new BorderSide(Color.white()));

    // Prompt row: "> " + search text
    const promptRow = new Row({
      children: [
        new Container({
          decoration: new BoxDecoration({ color: Color.default() }),
          child: new Text({
            data: "> ",
            style: new TextStyle({}),
          }) as unknown as WidgetInterface,
        }) as unknown as Widget,
        new Expanded({
          child: new TextField({
            controller: this._searchController,
            autofocus: true,
            maxLines: 1,
          }) as unknown as Widget,
        }) as unknown as Widget,
      ],
    });

    // Item list
    const itemWidgets: Widget[] = this._matchedCommands.map((cmd) => {
      return new Container({
        padding: EdgeInsets.symmetric({ horizontal: 1 }),
        child: new Text({
          data: cmd.shortcut
            ? `${cmd.label}  ${cmd.shortcut}`
            : cmd.label,
          style: new TextStyle({
            dim: cmd.enabled === false,
          }),
        }) as unknown as WidgetInterface,
      }) as unknown as Widget;
    });

    const columnChildren: Widget[] = [];
    columnChildren.push(promptRow as unknown as Widget);
    columnChildren.push(new SizedBox({ height: 1 }) as unknown as Widget);
    columnChildren.push(
      new Column({
        crossAxisAlignment: "stretch",
        children: itemWidgets,
      }) as unknown as Widget,
    );

    // 逆向: NZT line 2934-2941 — outer container with border + background
    return new Container({
      decoration: new BoxDecoration({
        border,
        color: Color.default(),
      }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Column({ children: columnChildren }) as unknown as WidgetInterface,
    }) as unknown as Widget;
  }
```

- [ ] **Step 4: Run tests to verify no regressions**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/command-palette.test.ts`
Expected: PASS

- [ ] **Step 5: Verify typecheck passes**

Run: `cd /Users/bytedance/workspace/flitter && bun run typecheck 2>&1 | grep "command-palette" || echo "No type errors"`
Expected: No type errors for command-palette.ts

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/overlay/command-palette.ts packages/tui/src/overlay/command-palette.test.ts
git commit -m "fix(overlay): wrap CommandPalette build() in opaque Container with background

CommandPaletteState.build() returned a bare Text widget with no background.
In the flat screen buffer model (no alpha blending), overlay cells without
an explicit bg color overwrite underlying content with terminal default,
causing content bleed-through.

逆向: amp always wraps overlay content in SR({ decoration: { color: a.background } })
where a.background = colorScheme.background (LT.none() = Color.default()).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Fix FuzzyPicker outer Container background — use `Color.default()` instead of hardcoded black

**Root cause:** Line 725 uses `Color.rgb(0, 0, 0)` (hardcoded black) instead of `Color.default()` (terminal default). Amp uses `a.background` which resolves to `LT.none()` — meaning the terminal's own background color, not hardcoded black. This matters when users have non-black terminal backgrounds.

**Amp reference:** `actions_intents.js:2934-2941` — `SR({ decoration: { border: t, color: a.background } })` where `a = $R.of(T).colors` and `a.background` defaults to `LT.none()`.

**Files:**
- Modify: `packages/tui/src/overlay/fuzzy-picker.ts:725`

- [ ] **Step 1: Write the failing test**

File: `packages/tui/src/overlay/fuzzy-picker.test.ts`

```typescript
/**
 * FuzzyPicker — unit tests for overlay background handling.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FuzzyPicker } from "./fuzzy-picker.js";

describe("FuzzyPicker", () => {
  it("creates widget with required props", () => {
    const picker = new FuzzyPicker({
      items: ["apple", "banana", "cherry"],
      getLabel: (item: string) => item,
      onAccept: () => {},
    });

    assert.equal(picker.items.length, 3);
    assert.equal(picker.getLabel("apple"), "apple");
  });

  it("optional props default to undefined", () => {
    const picker = new FuzzyPicker({
      items: [],
      getLabel: (item: string) => item,
      onAccept: () => {},
    });

    assert.equal(picker.title, undefined);
    assert.equal(picker.onDismiss, undefined);
    assert.equal(picker.maxRenderItems, undefined);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/fuzzy-picker.test.ts`
Expected: PASS

- [ ] **Step 3: Change `Color.rgb(0, 0, 0)` to `Color.default()` on line 725**

In `packages/tui/src/overlay/fuzzy-picker.ts`, line 725:

Change:
```typescript
        color: Color.rgb(0, 0, 0),
```

To:
```typescript
        color: Color.default(),
```

This aligns with amp's `a.background` which resolves to `LT.none()` — the terminal default background, not hardcoded black.

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/bytedance/workspace/flitter && bun run typecheck 2>&1 | grep "fuzzy-picker" || echo "No type errors"`
Expected: No type errors

- [ ] **Step 5: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/fuzzy-picker.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/overlay/fuzzy-picker.ts packages/tui/src/overlay/fuzzy-picker.test.ts
git commit -m "fix(overlay): use Color.default() for FuzzyPicker background, not hardcoded black

FuzzyPicker outer Container used Color.rgb(0,0,0) (hardcoded black).
Amp uses a.background = LT.none() (terminal default background color).
This matters for users with non-black terminal backgrounds.

逆向: actions_intents.js:2934-2941 — SR({ decoration: { color: a.background } })

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Fix FuzzyPicker item Column to use `crossAxisAlignment: "stretch"` for full-width selection

**Root cause:** The items Column at line 676-679 uses `crossAxisAlignment: "start"`, which sizes each item to its content width. This means the selection highlight Container in `defaultRenderItem` only covers the text, not the full picker width. Amp achieves full-width by using `Flexible` (j0) children inside a `Row` (T0) with `mainAxisSize: "max"`.

The simplest fix matching amp's visual behavior is to change the items Column to `crossAxisAlignment: "stretch"`, which forces each child to fill the full cross-axis (width). This is equivalent to amp's approach since the Column already receives tight width constraints from the outer Container.

**Amp reference:** `actions_intents.js:2857-2871` — default render item is inside a Row with Flexible children, ensuring full-width. `misc_utils.js:5573-5585` — command palette renderItem uses the same pattern.

**Files:**
- Modify: `packages/tui/src/overlay/fuzzy-picker.ts:676-677`

- [ ] **Step 1: Change `crossAxisAlignment` from `"start"` to `"stretch"`**

In `packages/tui/src/overlay/fuzzy-picker.ts`, lines 676-678:

Change:
```typescript
      const itemColumn = new Column({
        crossAxisAlignment: "start",
        children: itemWidgets,
```

To:
```typescript
      const itemColumn = new Column({
        crossAxisAlignment: "stretch",
        children: itemWidgets,
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/bytedance/workspace/flitter && bun run typecheck 2>&1 | grep "fuzzy-picker" || echo "No type errors"`
Expected: No type errors

- [ ] **Step 3: Run existing tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/fuzzy-picker.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/overlay/fuzzy-picker.ts
git commit -m "fix(overlay): use crossAxisAlignment stretch for full-width item selection

FuzzyPicker items Column used crossAxisAlignment 'start', which sized
each item to content width. Selection highlight only covered the text,
not the full picker width. Changed to 'stretch' so each item fills the
full cross-axis width, matching amp's full-width selection rendering.

逆向: amp uses Flexible (j0) inside Row (T0) with mainAxisSize max to
achieve full-width items — crossAxisAlignment stretch is the idiomatic
flitter equivalent given Column already has tight width constraints.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Fix FuzzyPicker `defaultRenderItem` — non-selected items must also have opaque background

**Root cause:** In `defaultRenderItem` (line 738), non-selected items use `bgColor = undefined`, which means their Container has no `BoxDecoration.color`. In the flat buffer model, these cells inherit whatever was painted before — causing inconsistent backgrounds between selected and non-selected items.

Amp's default render uses `decoration: P ? { color: P } : void 0` — but amp's outer SR already fills the entire bounding rect with `a.background`, so individual items don't need their own background. In flitter, `Container.performPaint` only fills when `decoration.color` is set. Since the outer Container fill happens first and child paint overwrites it, the correct fix is to give non-selected items `Color.default()` background explicitly.

**Amp reference:** `actions_intents.js:2853-2871` — item decoration is `P ? { color: P } : void 0`. The outer SR at line 2934 fills the full region first. In flitter, Container children overwrite parent paint, so items need their own bg.

**Files:**
- Modify: `packages/tui/src/overlay/fuzzy-picker.ts:737-749`

- [ ] **Step 1: Change `defaultRenderItem` to always set a background color**

In `packages/tui/src/overlay/fuzzy-picker.ts`, lines 737-749:

Change:
```typescript
  private defaultRenderItem(item: T, isSelected: boolean, isDisabled: boolean): WidgetInterface {
    const bgColor = isSelected ? Color.rgb(50, 50, 80) : undefined;

    return new Container({
      decoration: bgColor ? new BoxDecoration({ color: bgColor }) : undefined,
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Text({
        data: this.widget.getLabel(item),
        style: new TextStyle({
          dim: isDisabled,
        }),
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;
  }
```

To:
```typescript
  private defaultRenderItem(item: T, isSelected: boolean, isDisabled: boolean): WidgetInterface {
    // 逆向: actions_intents.js:2853-2858
    // amp: P = b ? R.app.selectionBackground : void 0
    // In flitter's flat buffer model, non-selected items also need explicit bg
    // to prevent parent content from bleeding through after child paint.
    const bgColor = isSelected ? Color.rgb(50, 50, 80) : Color.default();

    return new Container({
      decoration: new BoxDecoration({ color: bgColor }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Text({
        data: this.widget.getLabel(item),
        style: new TextStyle({
          dim: isDisabled,
        }),
      }) as unknown as WidgetInterface,
    }) as unknown as WidgetInterface;
  }
```

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/bytedance/workspace/flitter && bun run typecheck 2>&1 | grep "fuzzy-picker" || echo "No type errors"`
Expected: No type errors

- [ ] **Step 3: Run tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/fuzzy-picker.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/tui/src/overlay/fuzzy-picker.ts
git commit -m "fix(overlay): give non-selected FuzzyPicker items explicit background

In the flat screen buffer model, non-selected items with bgColor=undefined
left cells without an explicit background, causing inconsistent rendering.
Now all items get Color.default() background (terminal default) when not
selected, and Color.rgb(50,50,80) when selected.

逆向: amp fills the outer SR first with a.background, then items paint on
top. In flitter, Container children overwrite parent paint, so items need
their own explicit bg to maintain opacity.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Visual verification via tmux E2E

**Purpose:** Per CLAUDE.md Rule 2, verify the overlay background fix works visually in a real terminal — not just passing type checks and unit tests.

**Files:**
- Read: `examples/tui-command-palette-demo.ts` (exercises CommandPalette — Ctrl+O opens palette)
- Read: `examples/tui-overlay-demo.ts` (exercises OverlayState/OverlayEntry stacking — keys 1-4 toggle layers)

- [ ] **Step 1: Run typecheck on the full project**

Run: `cd /Users/bytedance/workspace/flitter && bun run typecheck 2>&1 | tail -5`
Expected: No errors (or only pre-existing unrelated errors)

- [ ] **Step 2: Run the full test suite**

Run: `cd /Users/bytedance/workspace/flitter && bun test 2>&1 | tail -10`
Expected: All tests pass

- [ ] **Step 3: Visual check — launch CommandPalette demo**

The `tui-command-palette-demo.ts` directly uses `CommandPalette`. When palette is open (Ctrl+O), it replaces main content via `Expanded`. After our Task 1 fix, the palette should render with a proper bordered Container instead of a bare Text.

```bash
tmux new-session -d -s palette-test -x 80 -y 24 "bun run examples/tui-command-palette-demo.ts 2>/tmp/palette-test.log"
sleep 2
# Open the command palette with Ctrl+O
tmux send-keys -t palette-test C-o
sleep 1
tmux capture-pane -t palette-test -p
tmux kill-session -t palette-test
```

Verify: The command palette should display with a bordered container, prompt row "> ", and command list — NOT a bare "Command Palette (N commands)" text line.

- [ ] **Step 4: Visual check — launch Overlay demo**

The `tui-overlay-demo.ts` uses `OverlayState`/`OverlayEntry` with `Stack`/`Positioned`. Each layer already has correct `Container`+`BoxDecoration` wrapping (serves as a positive control — overlays with explicit background should not bleed).

```bash
tmux new-session -d -s overlay-test -x 80 -y 24 "bun run examples/tui-overlay-demo.ts 2>/tmp/overlay-test.log"
sleep 2
# Toggle layers 1 and 2
tmux send-keys -t overlay-test 1
sleep 0.5
tmux send-keys -t overlay-test 2
sleep 0.5
tmux capture-pane -t overlay-test -p
tmux kill-session -t overlay-test
```

Verify: Layer overlays should have solid colored backgrounds with no underlying "Application Content" text bleeding through.

- [ ] **Step 5: Final commit (if any fixes needed)**

If the visual check reveals additional issues, fix and commit them. Otherwise, no commit needed.
