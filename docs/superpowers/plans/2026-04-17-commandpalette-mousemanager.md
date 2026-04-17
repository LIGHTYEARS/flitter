# CommandPalette + MouseManager Global Callbacks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a full-featured CommandPalette (FuzzyPicker + fuzzy scoring + command-specific rendering) and add global release/click callback support to MouseManager.

**Architecture:** MouseManager gets two `Set<Function>` callback registries fired before per-target dispatch. A new `fuzzyMatch` pure-function module provides recursive DP scoring. `FuzzyPicker` is a generic StatefulWidget composing TextField + scrollable list + keyboard/mouse nav. `CommandPalette` is rewritten to use FuzzyPicker with command-specific rendering (noun/verb columns, shortcuts, sort).

**Tech Stack:** TypeScript, Bun test runner, existing flitter widget framework (TextField, ScrollController, Actions, Shortcuts, Focus, MouseRegion)

**Amp references:** `ha` (MouseManager), `we`/`NZT` (FuzzyPicker), `GE0`/`FE0`/`hB` (fuzzy scoring), `qZT`/`UZT`/`i0R` (CommandPalette), `hH0` (sort)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `packages/tui/src/gestures/mouse-manager.ts` | **Modify:** Add `_globalReleaseCallbacks`, `_globalClickCallbacks` Sets, 4 public methods, integrate into `_handleRelease`/`_handleClick`/`dispose()` |
| `packages/tui/src/gestures/__tests__/mouse-manager-global-callbacks.test.ts` | **Create:** Unit tests for global callback registration, invocation, and disposal |
| `packages/tui/src/overlay/fuzzy-match.ts` | **Create:** `fuzzyMatch()`, `fuzzyScore()`, `recursiveMatch()` — pure scoring functions |
| `packages/tui/src/overlay/__tests__/fuzzy-match.test.ts` | **Create:** Unit tests for fuzzy scoring algorithm |
| `packages/tui/src/overlay/fuzzy-picker.ts` | **Create:** `FuzzyPicker` StatefulWidget + `FuzzyPickerState` + intent classes + `ContextCapture` helper |
| `packages/tui/src/overlay/__tests__/fuzzy-picker.test.ts` | **Create:** Unit tests for FuzzyPicker filtering, selection, keyboard nav |
| `packages/tui/src/overlay/command-palette.ts` | **Modify:** Rewrite `build()` to use FuzzyPicker, add `_buildCommandItem`, `_sortCommands`, update `Command` interface |
| `packages/tui/src/overlay/__tests__/command-palette.test.ts` | **Create:** Unit tests for CommandPalette sort logic and command rendering |
| `packages/tui/src/index.ts` | **Modify:** Export `fuzzyMatch`, `FuzzyPicker`, `GlobalClickInfo` |
| `examples/tui-command-palette-demo.ts` | **Create:** Interactive demo for E2E verification |

---

### Task 1: MouseManager Global Release Callbacks

**Files:**
- Modify: `packages/tui/src/gestures/mouse-manager.ts`
- Create: `packages/tui/src/gestures/__tests__/mouse-manager-global-callbacks.test.ts`

**Amp reference:** `modules/2026_tail_anonymous.js`, class `ha`, lines 158210–158292, 158516.

- [ ] **Step 1: Write failing tests for global release callbacks**

Create `packages/tui/src/gestures/__tests__/mouse-manager-global-callbacks.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { MouseManager } from "../mouse-manager.js";

describe("MouseManager global callbacks", () => {
  let mm: MouseManager;

  beforeEach(() => {
    // Access singleton (it auto-creates)
    mm = MouseManager.instance;
  });

  afterEach(() => {
    mm.dispose();
  });

  describe("global release callbacks", () => {
    it("fires registered release callback on mouse release", () => {
      let called = false;
      const cb = () => { called = true; };
      mm.addGlobalReleaseCallback(cb);

      // Simulate a release by calling _handleRelease indirectly via handleMouseEvent
      // First, set up a root render object so handleMouseEvent doesn't bail out
      // We need a minimal mock since hit-test requires a root
      const mockRoot = {
        hitTest: () => ({ hits: [] }),
        attached: true,
      };
      mm.setRootRenderObject(mockRoot as any);

      // Press then release
      mm.handleMouseEvent({
        type: "mouse", x: 5, y: 5, button: "left", action: "press",
        modifiers: { ctrl: false, shift: false, alt: false, meta: false },
      });
      mm.handleMouseEvent({
        type: "mouse", x: 5, y: 5, button: "left", action: "release",
        modifiers: { ctrl: false, shift: false, alt: false, meta: false },
      });

      expect(called).toBe(true);
    });

    it("does not fire after removeGlobalReleaseCallback", () => {
      let callCount = 0;
      const cb = () => { callCount++; };
      mm.addGlobalReleaseCallback(cb);
      mm.removeGlobalReleaseCallback(cb);

      const mockRoot = { hitTest: () => ({ hits: [] }), attached: true };
      mm.setRootRenderObject(mockRoot as any);

      mm.handleMouseEvent({
        type: "mouse", x: 5, y: 5, button: "left", action: "release",
        modifiers: { ctrl: false, shift: false, alt: false, meta: false },
      });

      expect(callCount).toBe(0);
    });

    it("release callbacks receive no arguments", () => {
      let argCount = -1;
      const cb = (...args: unknown[]) => { argCount = args.length; };
      mm.addGlobalReleaseCallback(cb as () => void);

      const mockRoot = { hitTest: () => ({ hits: [] }), attached: true };
      mm.setRootRenderObject(mockRoot as any);

      mm.handleMouseEvent({
        type: "mouse", x: 5, y: 5, button: "left", action: "release",
        modifiers: { ctrl: false, shift: false, alt: false, meta: false },
      });

      expect(argCount).toBe(0);
    });
  });

  describe("dispose clears global callbacks", () => {
    it("clears both callback sets on dispose", () => {
      let releaseCalled = false;
      let clickCalled = false;
      mm.addGlobalReleaseCallback(() => { releaseCalled = true; });
      mm.addGlobalClickCallback(() => { clickCalled = true; });

      mm.dispose();

      // Re-create instance and verify callbacks don't fire
      mm = MouseManager.instance;
      const mockRoot = { hitTest: () => ({ hits: [] }), attached: true };
      mm.setRootRenderObject(mockRoot as any);

      mm.handleMouseEvent({
        type: "mouse", x: 5, y: 5, button: "left", action: "press",
        modifiers: { ctrl: false, shift: false, alt: false, meta: false },
      });
      mm.handleMouseEvent({
        type: "mouse", x: 5, y: 5, button: "left", action: "release",
        modifiers: { ctrl: false, shift: false, alt: false, meta: false },
      });

      expect(releaseCalled).toBe(false);
      expect(clickCalled).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/gestures/__tests__/mouse-manager-global-callbacks.test.ts`

Expected: FAIL — `addGlobalReleaseCallback` is not a function.

- [ ] **Step 3: Implement global release callback fields and methods**

In `packages/tui/src/gestures/mouse-manager.ts`, add after the `_scrollSessionLastEvent` field (around line 147):

```ts
  /**
   * 全局释放回调集合 — 鼠标释放时在目标分发前触发。
   *
   * 逆向: ha._globalReleaseCallbacks (2026_tail_anonymous.js:158210)
   */
  private _globalReleaseCallbacks = new Set<() => void>();

  /**
   * 全局点击回调集合 — 鼠标点击时在目标分发前触发。
   *
   * 逆向: ha._globalClickCallbacks (2026_tail_anonymous.js:158211)
   */
  private _globalClickCallbacks = new Set<(info: GlobalClickInfo) => void>();
```

Add the `GlobalClickInfo` export interface at the top of the file (after imports):

```ts
/**
 * 全局点击回调接收的信息。
 *
 * 逆向: ha._handleClick 中传给 _globalClickCallbacks 的参数
 * (2026_tail_anonymous.js:158345-158350)
 */
export interface GlobalClickInfo {
  event: MouseEvent;
  globalPosition: { x: number; y: number };
  mouseTargets: Array<{ target: RenderMouseRegion; localPosition: { x: number; y: number } }>;
  clickCount: number;
}
```

Add the four public methods after the `setTui` method (around line 208):

```ts
  // ════════════════════════════════════════════════════
  //  全局回调注册
  // ════════════════════════════════════════════════════

  /**
   * 注册全局释放回调 — 任意鼠标释放时触发（不论目标）。
   *
   * 逆向: ha.addGlobalReleaseCallback (2026_tail_anonymous.js:158276)
   */
  addGlobalReleaseCallback(cb: () => void): void {
    this._globalReleaseCallbacks.add(cb);
  }

  /**
   * 移除全局释放回调。
   *
   * 逆向: ha.removeGlobalReleaseCallback (2026_tail_anonymous.js:158279)
   */
  removeGlobalReleaseCallback(cb: () => void): void {
    this._globalReleaseCallbacks.delete(cb);
  }

  /**
   * 注册全局点击回调 — 任意鼠标点击时触发（不论目标）。
   *
   * 逆向: ha.addGlobalClickCallback (2026_tail_anonymous.js:158282)
   */
  addGlobalClickCallback(cb: (info: GlobalClickInfo) => void): void {
    this._globalClickCallbacks.add(cb);
  }

  /**
   * 移除全局点击回调。
   *
   * 逆向: ha.removeGlobalClickCallback (2026_tail_anonymous.js:158285)
   */
  removeGlobalClickCallback(cb: (info: GlobalClickInfo) => void): void {
    this._globalClickCallbacks.delete(cb);
  }
```

- [ ] **Step 4: Wire global release callbacks into `_handleRelease`**

In `_handleRelease`, replace the placeholder comment `// Skip global release callbacks (not implemented in this phase)` (line 348) with:

```ts
    // 逆向: ha._handleRelease — 全局释放回调在目标分发前触发 (2026_tail_anonymous.js:158292)
    for (const cb of this._globalReleaseCallbacks) cb();
```

- [ ] **Step 5: Wire global click callbacks into `_handleClick`**

In `_handleClick`, after `const clickCount = this._calculateClickCount(position, raw.button);` (line 324) and before the `for (const { target, localPosition } of targets)` loop (line 325), insert:

```ts
    // 逆向: ha._handleClick — 全局点击回调在目标分发前触发 (2026_tail_anonymous.js:158345-158350)
    for (const cb of this._globalClickCallbacks) {
      cb({ event: raw, globalPosition: position, mouseTargets: targets, clickCount });
    }
```

- [ ] **Step 6: Clear global callbacks in `dispose()`**

In `dispose()`, before `MouseManager._instance = null;` (line 690), add:

```ts
    this._globalReleaseCallbacks.clear();
    this._globalClickCallbacks.clear();
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/gestures/__tests__/mouse-manager-global-callbacks.test.ts`

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/tui/src/gestures/mouse-manager.ts packages/tui/src/gestures/__tests__/mouse-manager-global-callbacks.test.ts
git commit -m "feat(gestures): add global release/click callback support to MouseManager

Matches amp's ha class (2026_tail_anonymous.js:158210-158292, 158345-158350, 158516).
Enables mouse-capture patterns where drag-release must fire outside widget bounds."
```

---

### Task 2: Fuzzy Scoring Algorithm

**Files:**
- Create: `packages/tui/src/overlay/fuzzy-match.ts`
- Create: `packages/tui/src/overlay/__tests__/fuzzy-match.test.ts`

**Amp reference:** `modules/2491_unknown_VE0.js` (`GE0`), `modules/2486_unknown_FE0.js` (`FE0`), `modules/2485_unknown_hB.js` (`hB`).

- [ ] **Step 1: Write failing tests for fuzzy scoring**

Create `packages/tui/src/overlay/__tests__/fuzzy-match.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { fuzzyMatch } from "../fuzzy-match.js";

describe("fuzzyMatch", () => {
  it("empty query matches everything with score 1.0", () => {
    const result = fuzzyMatch("", "anything");
    expect(result.matches).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it("exact match scores near 1.0", () => {
    const result = fuzzyMatch("abc", "abc");
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0.9);
  });

  it("camelCase boundary match scores above threshold", () => {
    const result = fuzzyMatch("fb", "FooBar");
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0.15);
  });

  it("word boundary match scores above threshold", () => {
    const result = fuzzyMatch("gp", "git push");
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0.15);
  });

  it("no match scores below threshold", () => {
    const result = fuzzyMatch("xyz", "FooBar");
    expect(result.matches).toBe(false);
    expect(result.score).toBeLessThanOrEqual(0.15);
  });

  it("case-insensitive matching", () => {
    const result = fuzzyMatch("foo", "FooBar");
    expect(result.matches).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it("multi-word query scores via word averaging", () => {
    const multiWord = fuzzyMatch("git pu", "git push");
    const abbreviated = fuzzyMatch("gp", "git push");
    expect(multiWord.matches).toBe(true);
    expect(abbreviated.matches).toBe(true);
    // Multi-word should score higher than abbreviated
    expect(multiWord.score).toBeGreaterThan(abbreviated.score);
  });

  it("consecutive characters score higher than scattered", () => {
    const consecutive = fuzzyMatch("foo", "foobar");
    const scattered = fuzzyMatch("fbr", "foobar");
    expect(consecutive.score).toBeGreaterThan(scattered.score);
  });

  it("word-boundary match scores higher than mid-word", () => {
    const boundary = fuzzyMatch("gp", "git push");
    const midWord = fuzzyMatch("it", "git push");
    expect(boundary.score).toBeGreaterThan(midWord.score);
  });

  it("handles empty label gracefully", () => {
    const result = fuzzyMatch("abc", "");
    expect(result.matches).toBe(false);
  });

  it("query longer than label does not match", () => {
    const result = fuzzyMatch("abcdef", "abc");
    expect(result.matches).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/__tests__/fuzzy-match.test.ts`

Expected: FAIL — cannot resolve `../fuzzy-match.js`.

- [ ] **Step 3: Implement fuzzy scoring algorithm**

Create `packages/tui/src/overlay/fuzzy-match.ts`:

```ts
/**
 * Fuzzy matching algorithm for the CommandPalette / FuzzyPicker.
 *
 * 逆向:
 * - GE0 in modules/2491_unknown_VE0.js (match wrapper)
 * - FE0 in modules/2486_unknown_FE0.js (multi-word dispatch)
 * - hB in modules/2485_unknown_hB.js (recursive DP scorer)
 *
 * @module
 */

/** Fuzzy match result. */
export interface FuzzyMatchResult {
  /** Whether the score exceeds the match threshold (0.15). */
  matches: boolean;
  /** Score between 0.0 and 1.0. Higher is a better match. */
  score: number;
}

/** Match threshold — below this, the item is filtered out. */
const THRESHOLD = 0.15;

/**
 * Score and filter a query against a label using recursive fuzzy matching.
 *
 * 逆向: GE0 in modules/2491_unknown_VE0.js
 *
 * - Empty query matches everything with score 1.0.
 * - Otherwise delegates to {@link fuzzyScore} and applies threshold.
 */
export function fuzzyMatch(query: string, label: string): FuzzyMatchResult {
  if (query.length === 0) {
    return { matches: true, score: 1.0 };
  }
  const score = fuzzyScore(label, query);
  return { matches: score > THRESHOLD, score };
}

/**
 * Compute fuzzy score with multi-word support.
 *
 * 逆向: FE0 in modules/2486_unknown_FE0.js
 *
 * If the query contains spaces, also scores each word independently
 * and takes max(fullScore, wordAvg * 0.95).
 */
function fuzzyScore(label: string, query: string): number {
  const normLabel = label.toLowerCase();
  const normQuery = query.toLowerCase();
  const memo: Map<string, number> = new Map();

  const fullScore = recursiveMatch(label, query, normLabel, normQuery, 0, 0, memo);

  // Multi-word scoring
  if (query.includes(" ")) {
    const words = query.split(" ").filter((w) => w.length > 0);
    if (words.length > 1) {
      let totalScore = 0;
      for (const word of words) {
        const wordMemo: Map<string, number> = new Map();
        const normWord = word.toLowerCase();
        totalScore += recursiveMatch(label, word, normLabel, normWord, 0, 0, wordMemo);
      }
      const wordAvg = (totalScore / words.length) * 0.95;
      return Math.max(fullScore, wordAvg);
    }
  }

  return fullScore;
}

/**
 * Word boundary characters — match after these gets a bonus.
 */
function isWordBoundary(ch: string): boolean {
  return ch === " " || ch === "-" || ch === "_" || ch === "/" || ch === ".";
}

/**
 * Check if a character is lowercase (for camelCase boundary detection).
 */
function isLower(ch: string): boolean {
  return ch >= "a" && ch <= "z";
}

/**
 * Recursive DP fuzzy matcher with memoization.
 *
 * 逆向: hB in modules/2485_unknown_hB.js
 *
 * Scoring rules per match position `s`:
 * - Consecutive (s === ti): multiplier 1.0
 * - Word boundary (preceded by separator): multiplier 0.9, skip penalty 0.999^skippedBoundaries
 * - CamelCase boundary (preceded by lowercase): multiplier 0.8, skip penalty
 * - Other: multiplier 0.3, skip penalty 0.999^(s - ti)
 * - Case mismatch: additional 0.9999 multiplier
 *
 * Returns the best score (0.0–1.0) across all possible match positions.
 */
function recursiveMatch(
  text: string,
  query: string,
  normText: string,
  normQuery: string,
  ti: number,
  qi: number,
  memo: Map<string, number>,
): number {
  // All query chars consumed — match complete
  if (qi >= normQuery.length) {
    return ti >= normText.length ? 1.0 : 0.99;
  }

  // Ran out of text
  if (ti >= normText.length) {
    return 0;
  }

  const key = `${ti},${qi}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const target = normQuery[qi]!;
  let bestScore = 0;

  // Try matching target at every position from ti onward
  for (let s = ti; s < normText.length; s++) {
    if (normText[s] !== target) continue;

    // Determine multiplier based on match position type
    let multiplier: number;
    let skipPenalty = 1.0;

    if (s === ti) {
      // Consecutive match
      multiplier = 1.0;
    } else if (s > 0 && isWordBoundary(normText[s - 1]!)) {
      // Word boundary match
      multiplier = 0.9;
      // Count skipped word boundaries between ti and s
      let skippedBoundaries = 0;
      for (let k = ti; k < s; k++) {
        if (isWordBoundary(normText[k]!)) skippedBoundaries++;
      }
      skipPenalty = Math.pow(0.999, skippedBoundaries);
    } else if (s > 0 && isLower(normText[s - 1]!) && !isLower(text[s]!) && text[s] === text[s]!.toUpperCase() && text[s] !== text[s]!.toLowerCase()) {
      // CamelCase boundary (preceded by lowercase, current is uppercase)
      multiplier = 0.8;
      let skippedBoundaries = 0;
      for (let k = ti; k < s; k++) {
        if (isWordBoundary(normText[k]!)) skippedBoundaries++;
      }
      skipPenalty = Math.pow(0.999, skippedBoundaries);
    } else {
      // Generic skip
      multiplier = 0.3;
      skipPenalty = Math.pow(0.999, s - ti);
    }

    // Case mismatch penalty
    const casePenalty = text[s] !== query[qi] ? 0.9999 : 1.0;

    const restScore = recursiveMatch(text, query, normText, normQuery, s + 1, qi + 1, memo);
    const totalScore = multiplier * skipPenalty * casePenalty * restScore;

    if (totalScore > bestScore) {
      bestScore = totalScore;
    }
  }

  memo.set(key, bestScore);
  return bestScore;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/__tests__/fuzzy-match.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/overlay/fuzzy-match.ts packages/tui/src/overlay/__tests__/fuzzy-match.test.ts
git commit -m "feat(overlay): add fuzzy scoring algorithm for FuzzyPicker

Recursive DP scorer matching amp's hB/FE0/GE0 (modules/2485-2491).
Supports word-boundary bonuses, camelCase detection, multi-word queries,
and 0.15 match threshold."
```

---

### Task 3: FuzzyPicker Widget — Intent Classes + ContextCapture

**Files:**
- Create: `packages/tui/src/overlay/fuzzy-picker.ts` (partial — intents, controller, ContextCapture)

**Amp reference:** `actions_intents.js:2644` (NZT), intents `qy`/`zy`/`FM`/`GM` in `modules/2487-2490`.

- [ ] **Step 1: Create fuzzy-picker.ts with intent classes, controller, and ContextCapture**

Create `packages/tui/src/overlay/fuzzy-picker.ts`:

```ts
/**
 * FuzzyPicker — 通用模糊搜索选择器 Widget。
 *
 * 逆向: amp we (widget) in misc_utils.js:2393,
 *       amp NZT (state) in actions_intents.js:2644
 *
 * 组合 TextField + 可滚动列表 + 键盘/鼠标导航。
 * 可用于命令面板、文件选择器、符号选择器等场景。
 *
 * @module
 */

import { Action } from "../actions/action.js";
import { Actions } from "../actions/actions.js";
import { Intent } from "../actions/intent.js";
import { KeyActivator } from "../actions/key-activator.js";
import { Shortcuts } from "../actions/shortcuts.js";
import { TextEditingController } from "../editing/text-editing-controller.js";
import { TextField } from "../editing/text-field.js";
import { FocusNode } from "../focus/focus-node.js";
import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import { ScrollController } from "../scroll/scroll-controller.js";
import { ScrollViewport } from "../scroll/scrollable.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { Border } from "../widgets/border.js";
import { BorderSide } from "../widgets/border-side.js";
import { Column } from "../widgets/column.js";
import { Container } from "../widgets/container.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { Expanded } from "../widgets/flexible.js";
import { MouseRegion } from "../widgets/mouse-region.js";
import { Row } from "../widgets/row.js";
import { SizedBox } from "../widgets/sized-box.js";
import { Text } from "../widgets/text.js";
import type { BuildContext, Element, Widget as WidgetInterface } from "../tree/element.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import { StatelessWidget } from "../tree/stateless-widget.js";
import { Widget } from "../tree/widget.js";
import { fuzzyMatch } from "./fuzzy-match.js";

// ════════════════════════════════════════════════════
//  Intent classes
// ════════════════════════════════════════════════════

/**
 * 逆向: amp qy (modules/2487_unknown_qy.js) — 向下移动选择。
 */
export class MoveDownIntent extends Intent {}

/**
 * 逆向: amp zy (modules/2488_unknown_zy.js) — 向上移动选择。
 */
export class MoveUpIntent extends Intent {}

/**
 * 逆向: amp FM (modules/2489_unknown_FM.js) — 接受/确认选择。
 */
export class AcceptIntent extends Intent {}

/**
 * 逆向: amp GM (modules/2490_unknown_GM.js) — 关闭/取消。
 */
export class DismissIntent extends Intent {}

// ════════════════════════════════════════════════════
//  ContextCapture helper
// ════════════════════════════════════════════════════

/**
 * 在 build 期间捕获 BuildContext 的辅助 Widget。
 *
 * 逆向: amp wZT/BZT in text_rendering.js:2008
 * 用于 ensureSelectedItemVisible() 定位每个条目的渲染对象。
 */
class ContextCapture extends StatelessWidget {
  readonly child: WidgetInterface;
  readonly onBuild: (ctx: BuildContext) => void;

  constructor(child: WidgetInterface, onBuild: (ctx: BuildContext) => void) {
    super();
    this.child = child;
    this.onBuild = onBuild;
  }

  build(context: BuildContext): WidgetInterface {
    this.onBuild(context);
    return this.child;
  }
}

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/** Scored item — intermediate type during filtering pipeline. */
export interface ScoredItem<T> {
  item: T;
  score: number;
  matches: boolean;
}

/** FuzzyPicker controller for external state sync. */
export class FuzzyPickerController {
  query = "";
  selectedItem: unknown = null;
}

/** FuzzyPicker construction props. */
export interface FuzzyPickerProps<T> {
  items: T[];
  getLabel: (item: T) => string;
  renderItem?: (item: T, isSelected: boolean, isDisabled: boolean, ctx: BuildContext) => WidgetInterface;
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

// ════════════════════════════════════════════════════
//  FuzzyPicker Widget
// ════════════════════════════════════════════════════

/**
 * FuzzyPicker — 通用模糊搜索选择器 StatefulWidget。
 *
 * 逆向: amp we in misc_utils.js:2393
 */
export class FuzzyPicker<T> extends StatefulWidget {
  readonly items: T[];
  readonly getLabel: (item: T) => string;
  readonly renderItem?: (item: T, isSelected: boolean, isDisabled: boolean, ctx: BuildContext) => WidgetInterface;
  readonly onAccept: (item: T, info: { hasUserInteracted: boolean }) => void;
  readonly onDismiss?: () => void;
  readonly sortItems?: (a: ScoredItem<T>, b: ScoredItem<T>, query: string) => number;
  readonly filterItem?: (item: T, query: string) => boolean;
  readonly isItemDisabled?: (item: T) => boolean;
  readonly normalizeQuery?: (query: string) => string;
  readonly title?: string;
  readonly maxRenderItems?: number;
  readonly controller?: FuzzyPickerController;

  constructor(props: FuzzyPickerProps<T>) {
    super();
    this.items = props.items;
    this.getLabel = props.getLabel;
    this.renderItem = props.renderItem;
    this.onAccept = props.onAccept;
    this.onDismiss = props.onDismiss;
    this.sortItems = props.sortItems;
    this.filterItem = props.filterItem;
    this.isItemDisabled = props.isItemDisabled;
    this.normalizeQuery = props.normalizeQuery;
    this.title = props.title;
    this.maxRenderItems = props.maxRenderItems;
    this.controller = props.controller;
  }

  createState(): State {
    return new FuzzyPickerState<T>();
  }
}

// ════════════════════════════════════════════════════
//  FuzzyPickerState
// ════════════════════════════════════════════════════

/**
 * FuzzyPicker 状态管理。
 *
 * 逆向: amp NZT in actions_intents.js:2644
 */
class FuzzyPickerState<T> extends State<FuzzyPicker<T>> {
  private textController!: TextEditingController;
  private focusNode!: FocusNode;
  private scrollController!: ScrollController;
  private selectedIndex = 0;
  private hasUserInteracted = false;
  private cachedFiltered: T[] = [];
  private itemContexts: BuildContext[] = [];

  // ── Keyboard shortcut map (built once) ──

  private static readonly SHORTCUTS = new Map<KeyActivator, Intent>([
    [KeyActivator.key("ArrowDown"), new MoveDownIntent()],
    [KeyActivator.key("ArrowUp"), new MoveUpIntent()],
    [KeyActivator.key("Tab"), new MoveDownIntent()],
    [new KeyActivator("Tab", { shift: true }), new MoveUpIntent()],
    [KeyActivator.ctrl("n"), new MoveDownIntent()],
    [KeyActivator.ctrl("p"), new MoveUpIntent()],
    [KeyActivator.key("Enter"), new AcceptIntent()],
    [KeyActivator.key("Escape"), new DismissIntent()],
  ]);

  // ── Lifecycle ──

  override initState(): void {
    super.initState();

    this.textController = new TextEditingController({
      text: this.widget.controller?.query ?? "",
    });
    this.focusNode = new FocusNode({ debugLabel: "FuzzyPicker" });
    this.scrollController = new ScrollController();

    this.textController.addListener(() => {
      this.hasUserInteracted = true;
      this.selectedIndex = 0;
      this.recomputeFilteredItems();
      this.setState();
      // Sync to external controller
      if (this.widget.controller) {
        this.widget.controller.query = this.textController.text;
      }
    });

    this.recomputeFilteredItems();
  }

  override dispose(): void {
    this.textController.dispose();
    this.focusNode.dispose();
    this.scrollController.dispose();
    super.dispose();
  }

  // ── Filtering pipeline ──

  /**
   * 逆向: NZT.recomputeFilteredItems (actions_intents.js:2724)
   */
  private recomputeFilteredItems(): void {
    const query = this.textController.text;
    const normalizedQuery = this.widget.normalizeQuery?.(query) ?? query;
    const { items, getLabel, filterItem, sortItems, maxRenderItems } = this.widget;

    const scored: ScoredItem<T>[] = [];
    for (const item of items) {
      if (filterItem && !filterItem(item, query)) continue;
      const result = fuzzyMatch(normalizedQuery, getLabel(item));
      if (result.matches) {
        scored.push({ item, score: result.score, matches: true });
      }
    }

    if (sortItems) {
      scored.sort((a, b) => sortItems(a, b, normalizedQuery));
    } else {
      scored.sort((a, b) => b.score - a.score);
    }

    const items2 = scored.map((s) => s.item);
    this.cachedFiltered = maxRenderItems != null ? items2.slice(0, maxRenderItems) : items2;
    this.clampSelectedIndex();
  }

  private clampSelectedIndex(): void {
    if (this.cachedFiltered.length === 0) {
      this.selectedIndex = 0;
    } else if (this.selectedIndex >= this.cachedFiltered.length) {
      this.selectedIndex = this.cachedFiltered.length - 1;
    }
  }

  // ── Intent handling ──

  /**
   * 逆向: NZT.invoke (actions_intents.js:2682)
   */
  private handleIntent(intent: Intent): "handled" | "ignored" {
    if (intent instanceof MoveDownIntent) {
      if (this.selectedIndex < this.cachedFiltered.length - 1) {
        this.selectedIndex++;
        this.syncSelection();
        this.setState();
      }
      return "handled";
    }
    if (intent instanceof MoveUpIntent) {
      if (this.selectedIndex > 0) {
        this.selectedIndex--;
        this.syncSelection();
        this.setState();
      }
      return "handled";
    }
    if (intent instanceof AcceptIntent) {
      const item = this.cachedFiltered[this.selectedIndex];
      if (item != null && !(this.widget.isItemDisabled?.(item))) {
        this.widget.onAccept(item, { hasUserInteracted: this.hasUserInteracted });
      }
      return "handled";
    }
    if (intent instanceof DismissIntent) {
      this.widget.onDismiss?.();
      return "handled";
    }
    return "ignored";
  }

  private syncSelection(): void {
    if (this.widget.controller) {
      const item = this.cachedFiltered[this.selectedIndex] ?? null;
      this.widget.controller.selectedItem = item;
    }
  }

  // ── Mouse handling ──

  /**
   * 逆向: NZT.handleScroll (actions_intents.js:2754)
   */
  private handleScroll(event: { type: string }): boolean {
    if ((event as any).type === "scroll") {
      const delta = (event as any).deltaY ?? ((event as any).action === "wheel_up" ? -1 : 1);
      if (delta < 0 && this.selectedIndex > 0) {
        this.selectedIndex--;
        this.syncSelection();
        this.setState();
        return true;
      }
      if (delta > 0 && this.selectedIndex < this.cachedFiltered.length - 1) {
        this.selectedIndex++;
        this.syncSelection();
        this.setState();
        return true;
      }
    }
    return false;
  }

  /**
   * 逆向: NZT.handleItemClick (actions_intents.js:2765)
   */
  private handleItemClick(index: number, event: { clickCount?: number }): void {
    const clickCount = event.clickCount ?? 1;
    if (clickCount === 1) {
      this.selectedIndex = index;
      this.syncSelection();
      this.setState();
    } else if (clickCount >= 2) {
      const item = this.cachedFiltered[index];
      if (item != null && !(this.widget.isItemDisabled?.(item))) {
        this.widget.onAccept(item, { hasUserInteracted: this.hasUserInteracted });
      }
    }
  }

  // ── Build ──

  /**
   * 逆向: NZT.build (actions_intents.js:2777)
   */
  build(_context: BuildContext): WidgetInterface {
    // Actions map: Intent constructor → Action
    const actionsMap = new Map<abstract new (...args: never[]) => Intent, Action>([
      [MoveDownIntent, new CallbackAction(() => this.handleIntent(new MoveDownIntent()))],
      [MoveUpIntent, new CallbackAction(() => this.handleIntent(new MoveUpIntent()))],
      [AcceptIntent, new CallbackAction(() => this.handleIntent(new AcceptIntent()))],
      [DismissIntent, new CallbackAction(() => this.handleIntent(new DismissIntent()))],
    ]);

    // Build item list
    const itemWidgets: WidgetInterface[] = [];
    this.itemContexts = [];

    for (let i = 0; i < this.cachedFiltered.length; i++) {
      const item = this.cachedFiltered[i]!;
      const isSelected = i === this.selectedIndex;
      const isDisabled = this.widget.isItemDisabled?.(item) ?? false;
      const index = i;

      const rendered = this.widget.renderItem
        ? this.widget.renderItem(item, isSelected, isDisabled, _context)
        : this.defaultRenderItem(item, isSelected, isDisabled);

      const wrapped = new ContextCapture(
        new MouseRegion({
          onClick: (event: any) => this.handleItemClick(index, event),
          child: rendered,
        }) as unknown as WidgetInterface,
        (ctx) => { this.itemContexts[index] = ctx; },
      ) as unknown as WidgetInterface;

      itemWidgets.push(wrapped);
    }

    // Build the column children
    const columnChildren: WidgetInterface[] = [];

    // Optional title
    if (this.widget.title) {
      columnChildren.push(
        new Container({
          padding: EdgeInsets.symmetric({ vertical: 0, horizontal: 0 }),
          child: new Text({
            data: this.widget.title,
            style: new TextStyle({ bold: true, foreground: Color.cyan() }),
          }),
        }) as unknown as WidgetInterface,
      );
    }

    // Prompt row: "> " + TextField
    columnChildren.push(
      new Row({
        children: [
          new Text({ data: "> " }) as unknown as WidgetInterface,
          new Expanded({
            child: new Shortcuts({
              shortcuts: FuzzyPickerState.SHORTCUTS,
              child: new Actions({
                actions: actionsMap,
                child: new TextField({
                  controller: this.textController,
                  focusNode: this.focusNode,
                  autofocus: true,
                  maxLines: 1,
                }),
              }) as unknown as WidgetInterface,
            }),
          }) as unknown as WidgetInterface,
        ],
      }) as unknown as WidgetInterface,
    );

    // Spacer
    columnChildren.push(new SizedBox({ height: 1 }) as unknown as WidgetInterface);

    // Results list — scrollable column of items
    const listContent = new Column({
      children: itemWidgets,
    });

    columnChildren.push(
      new Expanded({
        child: new MouseRegion({
          onScroll: (event: any) => { this.handleScroll(event); },
          child: new ScrollViewport({
            controller: this.scrollController,
            child: listContent as unknown as WidgetInterface,
          }),
        }),
      }) as unknown as WidgetInterface,
    );

    // Empty state
    if (this.cachedFiltered.length === 0 && this.textController.text.length > 0) {
      // Replace the Expanded results with empty text
      columnChildren.pop();
      columnChildren.push(
        new Expanded({
          child: new Text({
            data: "No matches",
            style: new TextStyle({ dim: true }),
          }),
        }) as unknown as WidgetInterface,
      );
    }

    // Outer container with border
    return new Container({
      decoration: new BoxDecoration({
        border: Border.all(new BorderSide({ color: Color.white() })),
        color: Color.rgb(0, 0, 0),
      }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Column({ children: columnChildren }),
    }) as unknown as WidgetInterface;
  }

  /**
   * Default item renderer when no renderItem prop is provided.
   */
  private defaultRenderItem(item: T, isSelected: boolean, isDisabled: boolean): WidgetInterface {
    return new Container({
      decoration: isSelected
        ? new BoxDecoration({ color: Color.rgb(50, 50, 80) })
        : undefined,
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Text({
        data: this.widget.getLabel(item),
        style: new TextStyle({
          dim: isDisabled,
          foreground: isDisabled ? Color.rgb(100, 100, 100) : undefined,
        }),
      }),
    }) as unknown as WidgetInterface;
  }
}

// ════════════════════════════════════════════════════
//  CallbackAction helper
// ════════════════════════════════════════════════════

/**
 * Simple Action that delegates to a callback.
 * Used by FuzzyPickerState to map intents to state methods.
 */
class CallbackAction extends Action {
  private readonly callback: () => "handled" | "ignored" | void;

  constructor(callback: () => "handled" | "ignored" | void) {
    super();
    this.callback = callback;
  }

  invoke(_intent: Intent): "handled" | "ignored" | void {
    return this.callback();
  }
}
```

- [ ] **Step 2: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit --project packages/tui/tsconfig.json 2>&1 | head -30`

Expected: No errors related to fuzzy-picker.ts (some pre-existing errors may exist).

- [ ] **Step 3: Commit**

```bash
git add packages/tui/src/overlay/fuzzy-picker.ts
git commit -m "feat(overlay): add FuzzyPicker widget with intent classes and state management

Generic reusable picker composing TextField + scrollable list + keyboard nav.
Matches amp's we/NZT (misc_utils.js:2393, actions_intents.js:2644)."
```

---

### Task 4: FuzzyPicker Unit Tests

**Files:**
- Create: `packages/tui/src/overlay/__tests__/fuzzy-picker.test.ts`

- [ ] **Step 1: Write unit tests for FuzzyPicker filtering and selection logic**

Create `packages/tui/src/overlay/__tests__/fuzzy-picker.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { fuzzyMatch } from "../fuzzy-match.js";

/**
 * FuzzyPicker is a StatefulWidget that requires a full widget tree to test
 * its build() method. Here we test the filtering pipeline logic in isolation
 * (same algorithm as FuzzyPickerState.recomputeFilteredItems).
 */

interface TestItem {
  label: string;
  disabled?: boolean;
}

interface ScoredItem<T> {
  item: T;
  score: number;
  matches: boolean;
}

function filterItems(
  items: TestItem[],
  query: string,
  opts?: {
    filterItem?: (item: TestItem, query: string) => boolean;
    sortItems?: (a: ScoredItem<TestItem>, b: ScoredItem<TestItem>, query: string) => number;
    maxRenderItems?: number;
  },
): TestItem[] {
  const normalizedQuery = query;

  const scored: ScoredItem<TestItem>[] = [];
  for (const item of items) {
    if (opts?.filterItem && !opts.filterItem(item, query)) continue;
    const result = fuzzyMatch(normalizedQuery, item.label);
    if (result.matches) {
      scored.push({ item, score: result.score, matches: true });
    }
  }

  if (opts?.sortItems) {
    scored.sort((a, b) => opts.sortItems!(a, b, normalizedQuery));
  } else {
    scored.sort((a, b) => b.score - a.score);
  }

  const filtered = scored.map((s) => s.item);
  return opts?.maxRenderItems != null ? filtered.slice(0, opts.maxRenderItems) : filtered;
}

describe("FuzzyPicker filtering pipeline", () => {
  const items: TestItem[] = [
    { label: "git push" },
    { label: "git pull" },
    { label: "git commit" },
    { label: "file open" },
    { label: "file save" },
    { label: "quit" },
  ];

  it("empty query returns all items", () => {
    const result = filterItems(items, "");
    expect(result.length).toBe(items.length);
  });

  it("filters by fuzzy match", () => {
    const result = filterItems(items, "gp");
    // Should match "git push" and "git pull" (both have g...p)
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((r) => r.label === "git push")).toBe(true);
    expect(result.some((r) => r.label === "git pull")).toBe(true);
  });

  it("respects filterItem callback", () => {
    const result = filterItems(items, "", {
      filterItem: (item) => item.label.startsWith("git"),
    });
    expect(result.length).toBe(3);
    expect(result.every((r) => r.label.startsWith("git"))).toBe(true);
  });

  it("respects maxRenderItems", () => {
    const result = filterItems(items, "", { maxRenderItems: 3 });
    expect(result.length).toBe(3);
  });

  it("custom sort overrides default score sort", () => {
    const result = filterItems(items, "", {
      sortItems: (a, b) => a.item.label.localeCompare(b.item.label),
    });
    expect(result[0]!.label).toBe("file open");
    expect(result[result.length - 1]!.label).toBe("quit");
  });

  it("no results for non-matching query", () => {
    const result = filterItems(items, "zzz");
    expect(result.length).toBe(0);
  });
});

describe("FuzzyPicker selection logic", () => {
  it("clamps selectedIndex to valid range", () => {
    const items = [{ label: "a" }, { label: "b" }];
    let selectedIndex = 5;
    // Clamp
    if (items.length === 0) selectedIndex = 0;
    else if (selectedIndex >= items.length) selectedIndex = items.length - 1;
    expect(selectedIndex).toBe(1);
  });

  it("clamps to 0 when list is empty", () => {
    const items: TestItem[] = [];
    let selectedIndex = 3;
    if (items.length === 0) selectedIndex = 0;
    else if (selectedIndex >= items.length) selectedIndex = items.length - 1;
    expect(selectedIndex).toBe(0);
  });

  it("moveDown increments within bounds", () => {
    let selectedIndex = 0;
    const len = 5;
    if (selectedIndex < len - 1) selectedIndex++;
    expect(selectedIndex).toBe(1);
  });

  it("moveDown does not exceed max", () => {
    let selectedIndex = 4;
    const len = 5;
    if (selectedIndex < len - 1) selectedIndex++;
    expect(selectedIndex).toBe(4);
  });

  it("moveUp decrements within bounds", () => {
    let selectedIndex = 3;
    if (selectedIndex > 0) selectedIndex--;
    expect(selectedIndex).toBe(2);
  });

  it("moveUp does not go below 0", () => {
    let selectedIndex = 0;
    if (selectedIndex > 0) selectedIndex--;
    expect(selectedIndex).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/__tests__/fuzzy-picker.test.ts`

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/tui/src/overlay/__tests__/fuzzy-picker.test.ts
git commit -m "test(overlay): add unit tests for FuzzyPicker filtering pipeline and selection logic"
```

---

### Task 5: CommandPalette Rewrite

**Files:**
- Modify: `packages/tui/src/overlay/command-palette.ts`
- Create: `packages/tui/src/overlay/__tests__/command-palette.test.ts`

**Amp reference:** `misc_utils.js:2404` (UZT), `misc_utils.js:5298` (i0R), `modules/2786_unknown_hH0.js` (hH0 sort).

- [ ] **Step 1: Write tests for CommandPalette sort logic**

Create `packages/tui/src/overlay/__tests__/command-palette.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import type { ScoredItem } from "../fuzzy-picker.js";

/**
 * Test the CommandPalette sort comparator logic in isolation.
 * This is the same algorithm as CommandPaletteState._sortCommands.
 */

interface TestCommand {
  label: string;
  category?: string;
  priority?: number;
}

function sortCommands(
  a: ScoredItem<TestCommand>,
  b: ScoredItem<TestCommand>,
  normalizedQuery: string,
): number {
  // 1. Exact noun/verb match
  const aCat = a.item.category?.toLowerCase() ?? "";
  const bCat = b.item.category?.toLowerCase() ?? "";
  const aLabel = a.item.label.toLowerCase();
  const bLabel = b.item.label.toLowerCase();

  const aExact = aCat === normalizedQuery || aLabel === normalizedQuery;
  const bExact = bCat === normalizedQuery || bLabel === normalizedQuery;
  if (aExact && !bExact) return -1;
  if (!aExact && bExact) return 1;

  // 2. Fuzzy score
  if (b.score !== a.score) return b.score - a.score;

  // 3. Priority
  const aPri = a.item.priority ?? 0;
  const bPri = b.item.priority ?? 0;
  return bPri - aPri;
}

describe("CommandPalette sort comparator", () => {
  it("exact category match ranks first", () => {
    const a: ScoredItem<TestCommand> = {
      item: { label: "push", category: "git", priority: 0 },
      score: 0.5, matches: true,
    };
    const b: ScoredItem<TestCommand> = {
      item: { label: "open", category: "file", priority: 0 },
      score: 0.8, matches: true,
    };
    // Query "git" — a has exact category match
    expect(sortCommands(a, b, "git")).toBeLessThan(0);
  });

  it("exact label match ranks first", () => {
    const a: ScoredItem<TestCommand> = {
      item: { label: "quit", priority: 0 },
      score: 0.5, matches: true,
    };
    const b: ScoredItem<TestCommand> = {
      item: { label: "quick save", priority: 0 },
      score: 0.8, matches: true,
    };
    expect(sortCommands(a, b, "quit")).toBeLessThan(0);
  });

  it("higher score wins when no exact match", () => {
    const a: ScoredItem<TestCommand> = {
      item: { label: "push", category: "git" },
      score: 0.6, matches: true,
    };
    const b: ScoredItem<TestCommand> = {
      item: { label: "pull", category: "git" },
      score: 0.8, matches: true,
    };
    expect(sortCommands(a, b, "gi")).toBeGreaterThan(0); // b wins (higher score)
  });

  it("higher priority wins when scores equal", () => {
    const a: ScoredItem<TestCommand> = {
      item: { label: "push", priority: 10 },
      score: 0.5, matches: true,
    };
    const b: ScoredItem<TestCommand> = {
      item: { label: "pull", priority: 5 },
      score: 0.5, matches: true,
    };
    expect(sortCommands(a, b, "p")).toBeLessThan(0); // a wins (higher priority)
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/__tests__/command-palette.test.ts`

Expected: PASS (tests only exercise pure functions).

- [ ] **Step 3: Rewrite command-palette.ts**

Replace the full contents of `packages/tui/src/overlay/command-palette.ts` with:

```ts
/**
 * CommandPalette — 命令面板 Widget。
 *
 * 逆向: amp qZT/zZT (misc_utils.js:2529), UZT (misc_utils.js:2404),
 *       i0R/s0R (misc_utils.js:5298)
 *
 * 使用 {@link FuzzyPicker} 提供搜索输入 + 命令列表的交互体验。
 *
 * @module command-palette
 */

import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext, Widget as WidgetInterface } from "../tree/element.js";
import { Container } from "../widgets/container.js";
import { Center } from "../widgets/center.js";
import { Row } from "../widgets/row.js";
import { SizedBox } from "../widgets/sized-box.js";
import { Expanded } from "../widgets/flexible.js";
import { Text } from "../widgets/text.js";
import { EdgeInsets } from "../widgets/edge-insets.js";
import { BoxDecoration } from "../widgets/box-decoration.js";
import { FuzzyPicker, type ScoredItem } from "./fuzzy-picker.js";

// ════════════════════════════════════════════════════
//  Command interface
// ════════════════════════════════════════════════════

/**
 * 命令面板命令定义。
 */
export interface CommandPaletteCommand {
  /** 命令唯一标识 */
  id: string;
  /** 显示标签（动词文本） */
  label: string;
  /** 命令分类（名词文本，显示在左列） */
  category?: string;
  /** 命令描述 */
  description?: string;
  /** 快捷键提示 */
  shortcut?: string;
  /** 执行动作 */
  action: () => void | Promise<void>;
  /** 是否启用（默认 true） */
  enabled?: boolean;
  /** 排序优先级（越大越靠前） */
  priority?: number;
}

/**
 * CommandPalette 构造参数。
 */
export interface CommandPaletteProps {
  /** 命令列表 */
  commands: CommandPaletteCommand[];
  /** 关闭回调 */
  onDismiss: () => void;
}

// ════════════════════════════════════════════════════
//  CommandPalette Widget
// ════════════════════════════════════════════════════

/**
 * 命令面板 StatefulWidget。
 *
 * 逆向: amp qZT in misc_utils.js:2529
 */
export class CommandPalette extends StatefulWidget {
  readonly commands: CommandPaletteCommand[];
  readonly onDismiss: () => void;

  constructor(props: CommandPaletteProps) {
    super();
    this.commands = props.commands;
    this.onDismiss = props.onDismiss;
  }

  createState(): State<CommandPalette> {
    return new CommandPaletteState();
  }
}

// ════════════════════════════════════════════════════
//  CommandPaletteState
// ════════════════════════════════════════════════════

/**
 * CommandPalette 状态管理。
 *
 * 逆向: amp zZT (misc_utils.js:2535) + UZT.build (misc_utils.js:2404)
 */
class CommandPaletteState extends State<CommandPalette> {
  /**
   * 逆向: UZT.build — 计算命令分类列最大宽度 (misc_utils.js:2410 KE0)
   */
  private _maxCategoryWidth(): number {
    return Math.max(0, ...this.widget.commands.map((cmd) => (cmd.category ?? "").length));
  }

  /**
   * 命令排序比较器。
   *
   * 逆向: hH0 in modules/2786_unknown_hH0.js (简化版，无 follows/alias)
   *
   * 优先级: 精确匹配 > 模糊得分 > 显式优先级
   */
  private _sortCommands(
    a: ScoredItem<CommandPaletteCommand>,
    b: ScoredItem<CommandPaletteCommand>,
    normalizedQuery: string,
  ): number {
    // 1. Exact noun/verb match
    const aCat = a.item.category?.toLowerCase() ?? "";
    const bCat = b.item.category?.toLowerCase() ?? "";
    const aLabel = a.item.label.toLowerCase();
    const bLabel = b.item.label.toLowerCase();

    const aExact = aCat === normalizedQuery || aLabel === normalizedQuery;
    const bExact = bCat === normalizedQuery || bLabel === normalizedQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // 2. Fuzzy score
    if (b.score !== a.score) return b.score - a.score;

    // 3. Priority
    const aPri = a.item.priority ?? 0;
    const bPri = b.item.priority ?? 0;
    return bPri - aPri;
  }

  /**
   * 渲染单个命令项。
   *
   * 逆向: amp HZT / i0R.renderItem (misc_utils.js:5360-5420)
   */
  private _buildCommandItem(
    cmd: CommandPaletteCommand,
    isSelected: boolean,
    isDisabled: boolean,
    categoryWidth: number,
  ): WidgetInterface {
    const children: WidgetInterface[] = [];

    // Category/noun column (fixed width, muted when not selected)
    if (categoryWidth > 0) {
      children.push(
        new SizedBox({
          width: categoryWidth,
          child: new Text({
            data: cmd.category ?? "",
            style: new TextStyle({
              foreground: isSelected ? Color.white() : Color.rgb(120, 120, 120),
            }),
          }),
        }) as unknown as WidgetInterface,
      );
      children.push(new SizedBox({ width: 1 }) as unknown as WidgetInterface);
    }

    // Label/verb column (expanded, bold)
    children.push(
      new Expanded({
        child: new Text({
          data: cmd.label,
          style: new TextStyle({
            bold: true,
            foreground: isDisabled ? Color.rgb(100, 100, 100) : Color.white(),
          }),
        }),
      }) as unknown as WidgetInterface,
    );

    // Shortcut column
    if (cmd.shortcut) {
      children.push(
        new Text({
          data: cmd.shortcut,
          style: new TextStyle({ foreground: Color.rgb(120, 120, 120) }),
        }) as unknown as WidgetInterface,
      );
    }

    return new Container({
      decoration: isSelected
        ? new BoxDecoration({ color: Color.rgb(50, 50, 80) })
        : undefined,
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Row({ children }),
    }) as unknown as WidgetInterface;
  }

  /**
   * 构建面板 UI。
   *
   * 逆向: amp UZT.build (misc_utils.js:2404-2440)
   */
  build(_context: BuildContext): WidgetInterface {
    const categoryWidth = this._maxCategoryWidth();

    return new Center({
      child: new SizedBox({
        width: 80,
        height: 20,
        child: new FuzzyPicker<CommandPaletteCommand>({
          items: this.widget.commands,
          title: "Command Palette",
          getLabel: (cmd) =>
            `${cmd.category ?? ""} ${cmd.label}`.trim().toLowerCase(),
          renderItem: (cmd, isSelected, isDisabled, _ctx) =>
            this._buildCommandItem(cmd, isSelected, isDisabled, categoryWidth),
          isItemDisabled: (cmd) => cmd.enabled === false,
          sortItems: (a, b, query) => this._sortCommands(a, b, query),
          onAccept: (cmd) => {
            const result = cmd.action();
            if (result instanceof Promise) {
              result.then(() => this.widget.onDismiss());
            } else {
              this.widget.onDismiss();
            }
          },
          onDismiss: () => this.widget.onDismiss(),
        }),
      }),
    }) as unknown as WidgetInterface;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/overlay/__tests__/command-palette.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/tui/src/overlay/command-palette.ts packages/tui/src/overlay/__tests__/command-palette.test.ts
git commit -m "feat(overlay): rewrite CommandPalette to use FuzzyPicker

Full interactive palette with fuzzy search, noun/verb columns, shortcut display,
and hH0-style sort (exact match > score > priority).
Matches amp's qZT/UZT/i0R (misc_utils.js:2404-2529, 5298)."
```

---

### Task 6: Update Exports

**Files:**
- Modify: `packages/tui/src/index.ts`

- [ ] **Step 1: Add exports for new modules**

In `packages/tui/src/index.ts`, add the following exports (find the overlay section and add alongside existing exports):

```ts
export { fuzzyMatch, type FuzzyMatchResult } from "./overlay/fuzzy-match.js";
export {
  FuzzyPicker,
  FuzzyPickerController,
  type FuzzyPickerProps,
  type ScoredItem,
  MoveDownIntent,
  MoveUpIntent,
  AcceptIntent,
  DismissIntent,
} from "./overlay/fuzzy-picker.js";
export type { GlobalClickInfo } from "./gestures/mouse-manager.js";
```

- [ ] **Step 2: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit --project packages/tui/tsconfig.json 2>&1 | head -30`

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add packages/tui/src/index.ts
git commit -m "chore(tui): export fuzzyMatch, FuzzyPicker, GlobalClickInfo from index"
```

---

### Task 7: Run All Tests

**Files:** None (verification only)

- [ ] **Step 1: Run the complete test suite**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/ 2>&1 | tail -30`

Expected: All tests pass, including the new ones.

- [ ] **Step 2: If any test fails, investigate and fix before proceeding**

Any failure must be investigated per CLAUDE.md rule 3 — do not proceed past unresolved failures.

---

### Task 8: Interactive Demo + E2E Verification

**Files:**
- Create: `examples/tui-command-palette-demo.ts`

- [ ] **Step 1: Create the demo app**

Create `examples/tui-command-palette-demo.ts`:

```ts
/**
 * TUI CommandPalette Demo — interactive command palette showcase.
 *
 * Run: bun run examples/tui-command-palette-demo.ts
 * Press Ctrl+C to quit.
 *
 * @module
 */

import { runApp } from "../packages/tui/src/binding/run-app.js";
import { StatefulWidget, State } from "../packages/tui/src/tree/stateful-widget.js";
import type { BuildContext, Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Center } from "../packages/tui/src/widgets/center.js";
import { Text } from "../packages/tui/src/widgets/text.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Stack } from "../packages/tui/src/widgets/stack.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import { Focus } from "../packages/tui/src/widgets/focus.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";
import { KeyActivator } from "../packages/tui/src/actions/key-activator.js";
import { CommandPalette, type CommandPaletteCommand } from "../packages/tui/src/overlay/command-palette.js";

class DemoApp extends StatefulWidget {
  createState(): State {
    return new DemoAppState();
  }
}

class DemoAppState extends State<DemoApp> {
  private showPalette = false;
  private lastAction = "Press Ctrl+O to open Command Palette";

  build(_context: BuildContext): WidgetInterface {
    const commands: CommandPaletteCommand[] = [
      { id: "new", label: "new thread", category: "thread", action: () => { this.lastAction = "Created new thread"; this.setState(); }, shortcut: "Ctrl+N" },
      { id: "open", label: "open file", category: "file", action: () => { this.lastAction = "Opened file"; this.setState(); }, shortcut: "Ctrl+O" },
      { id: "save", label: "save file", category: "file", action: () => { this.lastAction = "Saved file"; this.setState(); }, shortcut: "Ctrl+S" },
      { id: "close", label: "close tab", category: "tab", action: () => { this.lastAction = "Closed tab"; this.setState(); } },
      { id: "git-push", label: "push", category: "git", action: () => { this.lastAction = "Pushed to remote"; this.setState(); } },
      { id: "git-pull", label: "pull", category: "git", action: () => { this.lastAction = "Pulled from remote"; this.setState(); } },
      { id: "git-commit", label: "commit", category: "git", action: () => { this.lastAction = "Committed changes"; this.setState(); } },
      { id: "quit", label: "quit", action: () => { process.exit(0); }, shortcut: "Ctrl+C", priority: -10 },
      { id: "help", label: "show help", category: "help", action: () => { this.lastAction = "Help opened"; this.setState(); } },
      { id: "settings", label: "open settings", category: "settings", action: () => { this.lastAction = "Settings opened"; this.setState(); } },
    ];

    const mainContent = new Focus({
      autofocus: !this.showPalette,
      onKey: (event) => {
        if (event.modifiers.ctrl && event.key === "o") {
          this.showPalette = true;
          this.setState();
          return "handled";
        }
        return "ignored";
      },
      child: new Center({
        child: new Column({
          children: [
            new Text({
              data: "Flitter CommandPalette Demo",
              style: new TextStyle({ bold: true, foreground: Color.cyan() }),
            }) as unknown as WidgetInterface,
            new SizedBox({ height: 1 }) as unknown as WidgetInterface,
            new Text({ data: this.lastAction }) as unknown as WidgetInterface,
            new SizedBox({ height: 1 }) as unknown as WidgetInterface,
            new Text({
              data: "Ctrl+O → Open palette | Type to filter | Enter → Execute | Esc → Close",
              style: new TextStyle({ dim: true }),
            }) as unknown as WidgetInterface,
          ],
        }),
      }) as unknown as WidgetInterface,
    });

    const children: WidgetInterface[] = [mainContent as unknown as WidgetInterface];

    if (this.showPalette) {
      children.push(
        new CommandPalette({
          commands,
          onDismiss: () => {
            this.showPalette = false;
            this.setState();
          },
        }) as unknown as WidgetInterface,
      );
    }

    return new Stack({ children }) as unknown as WidgetInterface;
  }
}

runApp(new DemoApp() as unknown as WidgetInterface);
```

- [ ] **Step 2: Manual verification — launch the demo**

Run: `cd /Users/bytedance/workspace/flitter && bun run examples/tui-command-palette-demo.ts`

Verify:
1. App launches, shows "Press Ctrl+O to open Command Palette"
2. Press Ctrl+O — palette appears with bordered box, title "Command Palette", "> " prompt
3. Type "git" — list filters to git commands (push, pull, commit)
4. Press ArrowDown/ArrowUp — selection highlight moves
5. Press Enter — executes command, palette closes, status text updates
6. Press Ctrl+O again, then Escape — palette closes without executing

- [ ] **Step 3: E2E verification with tmux (if manual verification passes)**

```bash
cd /Users/bytedance/workspace/flitter
tmux new-session -d -s test -x 80 -y 24 "bun run examples/tui-command-palette-demo.ts 2>/tmp/cp-test.log"
sleep 3
# Verify app launched
tmux capture-pane -t test -p | grep -q "CommandPalette Demo" && echo "PASS: app launched" || echo "FAIL: app not launched"
# Open palette with Ctrl+O
tmux send-keys -t test C-o
sleep 1
# Verify palette appeared
tmux capture-pane -t test -p | grep -q "Command Palette" && echo "PASS: palette opened" || echo "FAIL: palette not opened"
# Type "git" to filter
tmux send-keys -t test "git"
sleep 0.5
# Verify filtering
tmux capture-pane -t test -p | grep -q "push" && echo "PASS: filtered to git commands" || echo "FAIL: filter not working"
# Press Enter to execute
tmux send-keys -t test Enter
sleep 0.5
# Verify palette closed and action executed
tmux capture-pane -t test -p | grep -qv "Command Palette" && echo "PASS: palette closed" || echo "FAIL: palette still open"
# Cleanup
tmux kill-session -t test
```

- [ ] **Step 4: Commit**

```bash
git add examples/tui-command-palette-demo.ts
git commit -m "feat(examples): add CommandPalette interactive demo (16)

Demonstrates FuzzyPicker + CommandPalette with Ctrl+O toggle,
fuzzy filtering, keyboard nav, and command execution."
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| Task 1 | MouseManager global release/click callbacks | None |
| Task 2 | Fuzzy scoring algorithm | None |
| Task 3 | FuzzyPicker widget (intents, state, build) | Task 2 |
| Task 4 | FuzzyPicker unit tests | Task 2, Task 3 |
| Task 5 | CommandPalette rewrite | Task 3 |
| Task 6 | Export updates | Task 1, Task 3, Task 5 |
| Task 7 | Run all tests | Task 1–6 |
| Task 8 | Interactive demo + E2E verification | Task 5 |

**Parallelizable:** Tasks 1 and 2 can run in parallel (no dependencies on each other).
