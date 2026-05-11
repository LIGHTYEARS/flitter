# Welcome Screen & Input Field Visual Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 5 visual fidelity gaps between Flitter CLI and the amp reference, identified by tmux capture-pane comparison against golden files in `tmux-capture/screens/amp/`.

**Architecture:** Each gap is an isolated fix in 1–2 files. The fixes are independent and can be done in any order. All changes are in `packages/cli/src/widgets/` or `packages/cli/src/modes/interactive.ts`.

**Tech Stack:** TypeScript, Bun, node:test

---

## Gap Checklist

| # | Gap | Severity | Root Cause |
|---|-----|----------|------------|
| 1 | Input box border wraps to next line (off-by-2) | **High** | `borderInnerWidth = terminalWidth - 2` should be `terminalWidth - 4` |
| 2 | Missing `──!─77─skills` in top-right border overlay | **Medium** | `interactive.ts` calls `.listSkills()` which doesn't exist; correct method is `.list()` |
| 3 | `0% of 1000k` shown on welcome screen | **Medium** | `_buildTopLeftLabel()` returns token string even when `totalUsed === 0` |
| 4 | "Type a message..." placeholder visible on welcome | **Low** | Hardcoded fallback; amp shows empty input with cursor only |
| 5 | Welcome logo left-aligned instead of centered-as-block | **Medium** | Per-line `Row` centering jitters; should be single `Row([orbColumn, gap, textColumn])` |

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/cli/src/widgets/input-field.ts:269` | Modify | Fix border width calculation |
| `packages/cli/src/widgets/input-field.test.ts` | Modify | Add border width test |
| `packages/cli/src/modes/interactive.ts:442` | Modify | Fix skill count method name |
| `packages/cli/src/widgets/thread-state-widget.ts:479-486` | Modify | Guard token display when empty |
| `packages/cli/src/widgets/thread-state-widget.ts:599` | Modify | Pass `placeholder: ""` |
| `packages/cli/src/widgets/thread-state-widget.test.ts` | Modify | Add token label + skill count tests |
| `packages/cli/src/widgets/welcome-screen.ts:215-250` | Modify | Restructure to single Row layout |
| `packages/cli/src/widgets/welcome-screen.test.ts` | Modify | Add layout structure test |

---

### Task 1: Fix Input Box Border Width (Off-by-2)

**Files:**
- Modify: `packages/cli/src/widgets/input-field.ts:269`
- Modify: `packages/cli/src/widgets/input-field.test.ts`

The border string formula is: `╭(1) + ─(1) + content + ─(1) + ╮(1) = content + 4`. For the border to equal `terminalWidth`, `borderInnerWidth` must be `terminalWidth - 4`. Currently it's `terminalWidth - 2`, making every border 2 chars too wide.

**Amp reference:** `amp-cli-reversed/modules/1472_tui_components/layout_widgets.js:1652-1698` — the bordered input box sets its size to `T.maxWidth` (= terminal width) and constrains content to `r - 2`. The border corners are drawn by the render object, not string concatenation — so the content area is `terminalWidth - 2` but the total rendered width including corners is exactly `terminalWidth`.

In Flitter's string-concatenation approach, `borderInnerWidth` is the content between the two `─` separators flanking the corners. The total string length is `borderInnerWidth + 4` (╭ + ─ + [fill] + ─ + ╮). For this to equal `terminalWidth`, we need `borderInnerWidth = terminalWidth - 4`.

- [ ] **Step 1: Write failing test for border width**

In `packages/cli/src/widgets/input-field.test.ts`, add this test at the end of the `describe("InputField")` block:

```typescript
describe("border width calculation", () => {
  it("top border string length equals terminal width when width is provided", () => {
    const terminalWidth = 244;
    const { state } = mountInputField({
      onSubmit: () => {},
      width: terminalWidth - 4, // borderInnerWidth
    });
    const tree = state.build({} as any);
    // tree is Column > [RichText(topBorder), Padding, RichText(bottomBorder)]
    assert.ok(tree instanceof Column);
    const children = (tree as any).children;
    assert.ok(children.length >= 3);
    const topBorderWidget = children[0];
    assert.ok(topBorderWidget instanceof RichText);
    const topBorderText = topBorderWidget.text.toPlainText();
    assert.equal(topBorderText.length, terminalWidth,
      `Top border should be exactly ${terminalWidth} chars, got ${topBorderText.length}`);
    const bottomBorderWidget = children[2];
    assert.ok(bottomBorderWidget instanceof RichText);
    const bottomBorderText = bottomBorderWidget.text.toPlainText();
    assert.equal(bottomBorderText.length, terminalWidth,
      `Bottom border should be exactly ${terminalWidth} chars, got ${bottomBorderText.length}`);
  });

  it("border is exactly 80 chars at default terminal width", () => {
    const { state } = mountInputField({
      onSubmit: () => {},
      // No width override, no MediaQuery — falls back to DEFAULT_BORDER_INNER_WIDTH (78)
    });
    const tree = state.build({} as any);
    const children = (tree as any).children;
    const topBorderText = children[0].text.toPlainText();
    // DEFAULT_BORDER_INNER_WIDTH = 78, + 4 corners/separators = 82
    // Wait — the default fallback is 80. terminalWidth = 80, borderInnerWidth = 80 - 4 = 76.
    // But currently DEFAULT_BORDER_INNER_WIDTH = 78 (= 80 - 2). After fix it should be 76 (= 80 - 4).
    // The fallback path uses: this.widget.config.width ?? terminalWidth - 4
    // terminalWidth = DEFAULT_BORDER_INNER_WIDTH + 2 = 80 (unchanged)
    // borderInnerWidth = 80 - 4 = 76
    // Total: 76 + 4 = 80 ✓
    assert.equal(topBorderText.length, 80,
      `Default border should be 80 chars, got ${topBorderText.length}`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/input-field.test.ts 2>&1 | tail -20
```

Expected: FAIL — border is 2 chars too wide (82 instead of 80 at default, 246 instead of 244 at 244-col).

- [ ] **Step 3: Fix the border width calculation**

In `packages/cli/src/widgets/input-field.ts`, line 269, change:

```typescript
// BEFORE:
const borderInnerWidth = this.widget.config.width ?? terminalWidth - 2;

// AFTER:
const borderInnerWidth = this.widget.config.width ?? terminalWidth - 4;
```

Also update the constant comment at line 69-70 for clarity:

```typescript
// BEFORE:
/** 默认边框宽度 (80 列终端 - 2 列边框字符) */
const DEFAULT_BORDER_INNER_WIDTH = 78;

// AFTER:
/** 默认边框宽度 (80 列终端减去 4 列边框字符 ╭─...─╮) */
const DEFAULT_BORDER_INNER_WIDTH = 78;
```

Wait — `DEFAULT_BORDER_INNER_WIDTH` is used in `let terminalWidth = DEFAULT_BORDER_INNER_WIDTH + 2; // fallback: 80`. This sets `terminalWidth = 80`. Then `borderInnerWidth = 80 - 4 = 76`. Total = `76 + 4 = 80`. That's correct.

But the test for default needs to check 80, not 82. The existing test I wrote does check for 80, so this is consistent.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/input-field.test.ts 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Run full CLI test suite to check for regressions**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/ 2>&1 | tail -20
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/input-field.ts packages/cli/src/widgets/input-field.test.ts
git commit -m "fix(cli): input box border off-by-2 causing line wrap at terminal width

The border string formula is ╭(1) + ─(1) + content + ─(1) + ╮(1) = content + 4.
borderInnerWidth must be terminalWidth - 4, not terminalWidth - 2.

逆向: amp-cli-reversed layout_widgets.js:1652 — box width = T.maxWidth (exact terminal width)"
```

---

### Task 2: Fix Missing Skill Count in Border Overlay

**Files:**
- Modify: `packages/cli/src/modes/interactive.ts:442`
- Modify: `packages/cli/src/widgets/thread-state-widget.test.ts`

The `skillCount` is always `undefined` because `interactive.ts` calls `.listSkills()` which doesn't exist on `SkillService`. The correct method is `.list()` (verified at `packages/data/src/skill/skill-service.ts:257`).

**Amp reference:** `amp-cli-reversed/modules/1472_tui_components/jetbrains_wizard.js:5884-5981` — `OT = this.availableSkillCount`, shown as `${mode}──!─${OT}─skills`.

- [ ] **Step 1: Write failing test for skill count in top-right label**

In `packages/cli/src/widgets/thread-state-widget.test.ts`, add to the existing describe block:

```typescript
describe("_buildTopRightLabel", () => {
  it("includes skill count when skillCount is provided", () => {
    // Create ThreadStateWidget with skillCount
    const widget = new ThreadStateWidget({
      threadStore: mockThreadStore as any,
      threadWorker: mockWorker as any,
      threadId: "test-thread",
      onSubmit: () => {},
      modelName: "claude-sonnet-4-20250514",
      tokenCount: 0,
      modeName: "smart",
      skillCount: 77,
    });
    const state = widget.createState() as any;
    state._widget = widget;
    state._element = { markNeedsRebuild: () => {} };
    state._mounted = true;
    state.initState();
    const label = state._buildTopRightLabel();
    assert.equal(label, "smart──!─77─skills");
  });

  it("returns only mode name when skillCount is undefined", () => {
    const widget = new ThreadStateWidget({
      threadStore: mockThreadStore as any,
      threadWorker: mockWorker as any,
      threadId: "test-thread",
      onSubmit: () => {},
      modelName: "claude-sonnet-4-20250514",
      tokenCount: 0,
      modeName: "deep",
    });
    const state = widget.createState() as any;
    state._widget = widget;
    state._element = { markNeedsRebuild: () => {} };
    state._mounted = true;
    state.initState();
    const label = state._buildTopRightLabel();
    assert.equal(label, "deep");
  });
});
```

- [ ] **Step 2: Run test to verify it passes (the label logic itself is correct; the bug is in the caller)**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/thread-state-widget.test.ts 2>&1 | tail -20
```

Expected: These tests should PASS because the `_buildTopRightLabel()` method is already correct — the bug is that `interactive.ts` never passes a valid `skillCount`.

- [ ] **Step 3: Fix the skill count method call in interactive.ts**

In `packages/cli/src/modes/interactive.ts`, line 442, change:

```typescript
// BEFORE:
skillCount: (container.skillService as any)?.listSkills?.()?.length as number | undefined,

// AFTER:
skillCount: (container.skillService as any)?.list?.()?.length as number | undefined,
```

We keep the optional chaining and `as any` cast because `skillService` may not have `.list()` in all container versions (the comment on line 441 says "skillService type varies by container version").

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/modes/interactive.ts packages/cli/src/widgets/thread-state-widget.test.ts
git commit -m "fix(cli): skill count missing from input border — wrong method name

interactive.ts called .listSkills() which doesn't exist on SkillService.
The correct method is .list() (packages/data/src/skill/skill-service.ts:257).
This caused skillCount to always be undefined, hiding the '──!─77─skills' overlay.

逆向: amp jetbrains_wizard.js:5884 — OT = this.availableSkillCount"
```

---

### Task 3: Suppress Token Display on Welcome Screen

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts:479-486`
- Modify: `packages/cli/src/widgets/thread-state-widget.test.ts`

Amp guards the top-left token display with `!l.isThreadEmpty()` (jetbrains_wizard.js:6072). Flitter always returns a token string, showing `0% of 1000k` on the welcome screen.

- [ ] **Step 1: Write failing test for token suppression**

In `packages/cli/src/widgets/thread-state-widget.test.ts`, add:

```typescript
describe("_buildTopLeftLabel", () => {
  it("returns empty string when no tokens have been consumed", () => {
    const widget = new ThreadStateWidget({
      threadStore: mockThreadStore as any,
      threadWorker: mockWorker as any,
      threadId: "test-thread",
      onSubmit: () => {},
      modelName: "claude-sonnet-4-20250514",
      tokenCount: 0,
    });
    const state = widget.createState() as any;
    state._widget = widget;
    state._element = { markNeedsRebuild: () => {} };
    state._mounted = true;
    state.initState();
    // _totalInputTokens and _totalOutputTokens default to 0
    const label = state._buildTopLeftLabel();
    assert.equal(label, "", "Should return empty string when totalUsed === 0");
  });

  it("returns token percentage when tokens have been consumed", () => {
    const widget = new ThreadStateWidget({
      threadStore: mockThreadStore as any,
      threadWorker: mockWorker as any,
      threadId: "test-thread",
      onSubmit: () => {},
      modelName: "claude-sonnet-4-20250514",
      tokenCount: 0,
    });
    const state = widget.createState() as any;
    state._widget = widget;
    state._element = { markNeedsRebuild: () => {} };
    state._mounted = true;
    state.initState();
    state._totalInputTokens = 15000;
    state._totalOutputTokens = 5000;
    const label = state._buildTopLeftLabel();
    // 20000 / 200000 = 10%
    assert.ok(label.includes("% of"), `Expected token percentage, got: "${label}"`);
    assert.ok(!label.startsWith("0%"), `Should not be 0% with 20k tokens used, got: "${label}"`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/thread-state-widget.test.ts 2>&1 | tail -20
```

Expected: First test FAILS — currently returns `"0% of 200k"` instead of `""`.

- [ ] **Step 3: Add guard to _buildTopLeftLabel**

In `packages/cli/src/widgets/thread-state-widget.ts`, modify `_buildTopLeftLabel()` at line 479-486:

```typescript
// BEFORE:
private _buildTopLeftLabel(): string {
  const maxTokens = resolveModel(this.widget.config.modelName ?? "")?.contextWindow ?? 200000;
  const totalUsed = this._totalInputTokens + this._totalOutputTokens;
  if (maxTokens <= 0) return "";
  const pct = Math.round((totalUsed / maxTokens) * 100);
  const maxStr = maxTokens >= 1000 ? `${Math.round(maxTokens / 1000)}k` : `${maxTokens}`;
  return `${pct}% of ${maxStr}`;
}

// AFTER:
private _buildTopLeftLabel(): string {
  const maxTokens = resolveModel(this.widget.config.modelName ?? "")?.contextWindow ?? 200000;
  const totalUsed = this._totalInputTokens + this._totalOutputTokens;
  // 逆向: jetbrains_wizard.js:6072 — guard: !l.isThreadEmpty()
  // Suppress token display until tokens are actually consumed (welcome screen shows no tokens)
  if (totalUsed === 0) return "";
  if (maxTokens <= 0) return "";
  const pct = Math.round((totalUsed / maxTokens) * 100);
  const maxStr = maxTokens >= 1000 ? `${Math.round(maxTokens / 1000)}k` : `${maxTokens}`;
  return `${pct}% of ${maxStr}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/thread-state-widget.test.ts 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/thread-state-widget.test.ts
git commit -m "fix(cli): suppress token display on welcome screen when no tokens consumed

Amp guards the top-left border overlay with !l.isThreadEmpty() (jetbrains_wizard.js:6072).
Added totalUsed === 0 guard to _buildTopLeftLabel() so welcome screen shows clean border.

逆向: amp jetbrains_wizard.js:6072 — token/cost overlay only when thread has messages"
```

---

### Task 4: Remove Placeholder Text on Welcome Screen

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts:599`
- Modify: `packages/cli/src/widgets/input-field.test.ts`

Amp's welcome screen input shows only a cursor block, no placeholder text. Flitter shows "Type a message..." because InputField has a hardcoded fallback.

**Amp reference:** `tmux-capture/screens/amp/welcome/ansi-63x244.golden` line 59 — shows `│ \x1b[7m \x1b[0m` (just a reverse-video space = cursor).

- [ ] **Step 1: Write failing test for empty placeholder**

In `packages/cli/src/widgets/input-field.test.ts`, add:

```typescript
it("shows no placeholder text when placeholder is empty string", () => {
  const { state } = mountInputField({
    onSubmit: () => {},
    placeholder: "",
  });
  const tree = state.build({} as any);
  const allText = extractAllText(tree);
  assert.ok(!allText.includes("Type a message"),
    "Should not show 'Type a message...' when placeholder is empty string");
});
```

- [ ] **Step 2: Run test to verify it passes (or fails if the empty string is treated as falsy)**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/input-field.test.ts 2>&1 | tail -20
```

Check: The code at line 237 is `const placeholder = this.widget.config.placeholder ?? "Type a message..."`. Since `""` is falsy for `||` but NOT nullish for `??`, passing `placeholder: ""` should work — `?? ` only triggers on `null`/`undefined`. So passing `""` should already suppress the text. The test should PASS.

- [ ] **Step 3: Pass empty placeholder from thread-state-widget**

In `packages/cli/src/widgets/thread-state-widget.ts`, line 599-605, add `placeholder: ""`:

```typescript
// BEFORE:
: new InputField({
    onSubmit,
    promptHistory: this._promptHistory,
    topLeftLabel: this._buildTopLeftLabel(),
    topRightLabel: this._buildTopRightLabel(),
    bottomRightLabel: this._buildBottomRightLabel(),
  }),

// AFTER:
: new InputField({
    onSubmit,
    promptHistory: this._promptHistory,
    placeholder: "",
    topLeftLabel: this._buildTopLeftLabel(),
    topRightLabel: this._buildTopRightLabel(),
    bottomRightLabel: this._buildBottomRightLabel(),
  }),
```

- [ ] **Step 4: Verify InputFieldConfig interface accepts placeholder**

Check that `InputFieldConfig` in `packages/cli/src/widgets/input-field.ts` has the `placeholder` property. Search for the interface definition. If not present, add it:

```typescript
export interface InputFieldConfig {
  onSubmit: (text: string) => void;
  placeholder?: string;
  // ... other fields
}
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/input-field.test.ts packages/cli/src/widgets/thread-state-widget.test.ts 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/input-field.test.ts
git commit -m "fix(cli): remove placeholder text from welcome screen input field

Amp shows only a cursor block in the empty input field, no 'Type a message...' text.
Pass placeholder: '' from ThreadStateWidget to suppress the default fallback.

逆向: amp welcome ansi golden line 59 — only reverse-video cursor, no placeholder"
```

---

### Task 5: Fix Welcome Screen Logo Layout

**Files:**
- Modify: `packages/cli/src/widgets/welcome-screen.ts:215-250`
- Modify: `packages/cli/src/widgets/welcome-screen.test.ts`

**Current (broken):** Each orb line is a separate `Row({ mainAxisSize: "min" })`, all stacked in a `Column({ crossAxisAlignment: "center" })`. Since each line has different width, centering each independently causes jittering — shorter lines shift left/right relative to longer ones.

**Amp reference:** `amp-cli-reversed/modules/1472_tui_components/misc_utils.js:2861-2868`:
```js
return N0.child(new T0({
  mainAxisAlignment: "center",
  crossAxisAlignment: "center",
  mainAxisSize: "min",
  children: [g /* orb widget */, new XT({ width: 2 }), v /* text column */]
}));
```
The orb is a single fixed-width widget; the text is a single column. They're in one `Row`, centered as a unit.

**Fix:** Restructure to: `Column(center) > Row(center, min) > [Column(orb lines, left-aligned), SizedBox(6), Column(text lines)]`. The orb lines go in their own `Column` so they share a consistent left edge. The help texts go in a separate `Column` aligned to specific rows using `SizedBox` spacers.

- [ ] **Step 1: Write failing test for layout structure**

In `packages/cli/src/widgets/welcome-screen.test.ts`, add:

```typescript
describe("layout structure", () => {
  it("has outer Column > single Row > [orbColumn, gap, textColumn] structure", () => {
    const widget = new WelcomeScreen({ productName: "Flitter" });
    const tree = widget.build({} as any);

    // Outer: Column with mainAxisAlignment: "center"
    assert.ok(tree instanceof Column, "Root should be Column");
    const outerColumn = tree as any;
    assert.equal(outerColumn.mainAxisAlignment, "center");

    // Single child: Row with mainAxisSize: "min"
    const outerChildren = outerColumn.children;
    assert.equal(outerChildren.length, 1, "Outer Column should have exactly 1 child (the Row)");
    const mainRow = outerChildren[0];
    assert.ok(mainRow instanceof Row, "Single child should be Row");
    assert.equal((mainRow as any).mainAxisSize, "min");

    // Row children: [Column(orb), SizedBox, Column(text)]
    const rowChildren = (mainRow as any).children;
    assert.equal(rowChildren.length, 3, "Row should have 3 children: orbColumn, gap, textColumn");
    assert.ok(rowChildren[0] instanceof Column, "First child should be Column (orb lines)");
    // SizedBox is the gap
    assert.ok(rowChildren[2] instanceof Column, "Third child should be Column (help texts)");
  });

  it("orb column has all 17 orb lines left-aligned", () => {
    const widget = new WelcomeScreen({ productName: "Flitter" });
    const tree = widget.build({} as any);
    const mainRow = (tree as any).children[0];
    const orbColumn = (mainRow as any).children[0];
    const orbChildren = orbColumn.children;
    assert.equal(orbChildren.length, 17, "Orb column should have 17 lines");
    // Check that orbColumn uses crossAxisAlignment: "start" (left-aligned)
    assert.equal(orbColumn.crossAxisAlignment ?? "start", "start",
      "Orb column should left-align its children");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/welcome-screen.test.ts 2>&1 | tail -20
```

Expected: FAIL — current structure has 17 Row children, not 1 Row child.

- [ ] **Step 3: Restructure welcome screen build()**

Replace the `build()` method in `packages/cli/src/widgets/welcome-screen.ts` (lines 168-252) with:

```typescript
build(_context: BuildContext): Widget {
  const productName = this.config.productName ?? "Flitter";

  // 逆向: misc_utils.js:2694-2710 — 文本样式
  const orbStyle = new TextStyle({ foreground: MUTED_TEXT_COLOR });
  const titleStyle = new TextStyle({ foreground: FOREGROUND_COLOR });
  const helpKeyStyle = new TextStyle({ foreground: KEYBIND_COLOR });
  const helpWordStyle = new TextStyle({ foreground: COMMAND_COLOR });
  const dimStyle = new TextStyle({ foreground: SECONDARY_COLOR });

  // Orb column: all orb lines left-aligned in their own Column
  // This ensures the orb is a coherent block — no per-line centering jitter
  const orbWidgets: Widget[] = ORB_LINES.map(
    (line) =>
      new RichText({
        text: new TextSpan({ text: line, style: orbStyle }),
      }),
  );
  const orbColumn = new Column({
    mainAxisSize: "min",
    crossAxisAlignment: "start",
    children: orbWidgets,
  });

  // Help text column: positioned to align with specific orb lines
  // We use SizedBox spacers to skip rows where no help text appears
  // Line heights: each line = 1 row. Help texts at lines 4, 7, 10, 11.
  const helpChildren: Widget[] = [];

  // Lines 0-3: empty (4 rows of spacing)
  helpChildren.push(new SizedBox({ height: 4 }));

  // Line 4: "Welcome to {productName}"
  helpChildren.push(
    new RichText({
      text: new TextSpan({
        text: `Welcome to ${productName}`,
        style: titleStyle,
      }),
    }),
  );

  // Lines 5-6: empty (2 rows)
  helpChildren.push(new SizedBox({ height: 2 }));

  // Line 7: "Ctrl+O for help"
  helpChildren.push(
    new RichText({
      text: new TextSpan({
        children: [
          new TextSpan({ text: "Ctrl+O", style: helpKeyStyle }),
          new TextSpan({ text: " for ", style: dimStyle }),
          new TextSpan({ text: "help", style: helpWordStyle }),
        ],
      }),
    }),
  );

  // Lines 8-9: empty (2 rows)
  helpChildren.push(new SizedBox({ height: 2 }));

  // Line 10: "Use Tab/Shift+Tab to navigate to previous"
  helpChildren.push(
    new RichText({
      text: new TextSpan({
        text: "Use Tab/Shift+Tab to navigate to previous",
        style: dimStyle,
      }),
    }),
  );

  // Line 11: "messages to edit or restore to a previous state"
  helpChildren.push(
    new RichText({
      text: new TextSpan({
        text: "messages to edit or restore to a previous state",
        style: dimStyle,
      }),
    }),
  );

  const textColumn = new Column({
    mainAxisSize: "min",
    crossAxisAlignment: "start",
    children: helpChildren,
  });

  // 逆向: misc_utils.js:2861-2868
  // Row([orb, SizedBox(w:6), textColumn]) centered as a single unit
  const mainRow = new Row({
    mainAxisAlignment: "center",
    crossAxisAlignment: "center",
    mainAxisSize: "min",
    children: [orbColumn, new SizedBox({ width: 6 }), textColumn],
  });

  // 逆向: misc_utils.js:2861 — outer Column with vertical centering
  return new Column({
    mainAxisAlignment: "center",
    crossAxisAlignment: "center",
    children: [mainRow],
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/welcome-screen.test.ts 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/bytedance/workspace/flitter && bun test packages/cli/ 2>&1 | tail -30
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/welcome-screen.ts packages/cli/src/widgets/welcome-screen.test.ts
git commit -m "fix(cli): welcome screen logo jitters due to per-line centering

Restructured from 17 independently-centered Rows to a single
Row([orbColumn, gap, textColumn]) centered as one unit.
This matches amp's layout: misc_utils.js:2861 — Row(center, min, [g, XT(2), v]).

逆向: amp-cli-reversed misc_utils.js:2861-2868 — orb + text as single centered Row"
```

---

### Task 6: E2E Verification via tmux capture-pane

**Files:**
- None created/modified — this is a verification task

- [ ] **Step 1: Launch flitter-cli in tmux at 244x63**

```bash
tmux kill-session -t flitter-verify 2>/dev/null; true
tmux new-session -d -s flitter-verify -x 244 -y 63 "bun run apps/flitter-cli/bin/flitter.ts 2>/tmp/flitter-verify.log"
sleep 3
```

- [ ] **Step 2: Capture pane and compare against amp golden**

```bash
tmux capture-pane -t flitter-verify -p > /tmp/flitter-after-fix.txt
# Check: border should not wrap
grep -c '─╮' /tmp/flitter-after-fix.txt  # Should be 1, on same line as ╭
grep -c '─╯' /tmp/flitter-after-fix.txt  # Should be 1, on same line as ╰
# Check: no "0% of" on welcome screen
grep -c '0% of' /tmp/flitter-after-fix.txt  # Should be 0
# Check: no "Type a message" on welcome screen
grep -c 'Type a message' /tmp/flitter-after-fix.txt  # Should be 0
# Check: skill count present
grep -o 'smart.*skills' /tmp/flitter-after-fix.txt  # Should match "smart──!─N─skills"
# Check: logo is a coherent block (consistent left margin for all orb lines)
head -40 /tmp/flitter-after-fix.txt
```

- [ ] **Step 3: Save captures as new golden files (optional)**

```bash
mkdir -p tmux-capture/screens/flitter/welcome/
tmux capture-pane -t flitter-verify -p > tmux-capture/screens/flitter/welcome/plain-63x244.golden
tmux capture-pane -t flitter-verify -p -e > tmux-capture/screens/flitter/welcome/ansi-63x244.golden
```

- [ ] **Step 4: Clean up**

```bash
tmux kill-session -t flitter-verify
```

- [ ] **Step 5: Verify no remaining gaps vs amp golden**

```bash
diff /tmp/flitter-after-fix.txt tmux-capture/screens/amp/welcome/plain-63x244.golden
```

Expected differences should only be:
- "Flitter" vs "Amp" in the welcome text
- Different CWD path (`~/workspace/flitter` vs `~/.oh-my-coco/studio/flitter`)
- Different skill count numbers
- Minor spacing differences in the orb block (static vs animated rendering)

---

## Self-Review Checklist

1. **Spec coverage:** All 5 gaps from the checklist have corresponding tasks (Tasks 1–5). E2E verification is Task 6.
2. **Placeholder scan:** No TODOs, TBDs, or vague "add appropriate" steps. All code is concrete.
3. **Type consistency:** `borderInnerWidth`, `_buildTopLeftLabel()`, `_buildTopRightLabel()`, `placeholder`, `skillCount` — all names match between implementation steps and test steps.
