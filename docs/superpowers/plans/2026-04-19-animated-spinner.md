# Animated Braille Spinner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `\u27F3` (rotating arrows) character used for in-progress tool indicators with amp's animated braille spinner (`xa` class), which uses a cellular automaton to generate evolving braille Unicode patterns.

**Architecture:** Amp's `xa` class (modules/0526_unknown_xa.js) implements a cellular automaton on an 8-cell grid mapped to braille Unicode character offsets. Each `step()` evolves the grid using neighbor rules (similar to Conway's Game of Life but with different birth/survival thresholds). `toBraille()` converts the 8-bit state to a braille character (U+2800-U+28FF). The animation is driven by `setInterval(200ms)` in widget state classes (`Y1T._startAnimation`). Flitter needs: (1) the `BrailleSpinner` class ported from amp, (2) a `SpinnerMixin` or integration into `ConversationViewState` that manages the animation timer, (3) replacement of the static `\u27F3` with `spinner.toBraille()`.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/tui` (State, StatefulWidget)

**Amp reference:**
- `amp-cli-reversed/modules/0526_unknown_xa.js` (full xa class — cellular automaton + toBraille)
- `amp-cli-reversed/chunk-006.js:6121-6157` (Y1T._spinner, _startAnimation, _stopAnimation — 200ms interval)
- `amp-cli-reversed/chunk-004.js:31789-31795` (handoff spinner — 100ms interval with xa)
- `amp-cli-reversed/chunk-006.js:6178` (`this._spinner.toBraille()` in activity group build)
- `amp-cli-reversed/chunk-004.js:21004` (tool row: `t.toBraille()` for in-progress status)

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `packages/tui/src/widgets/braille-spinner.ts` | BrailleSpinner class (cellular automaton + toBraille) |
| Modify | `packages/cli/src/widgets/conversation-view.ts` | Replace static `\u27F3` with animated braille spinner |
| Create | `packages/tui/src/widgets/__tests__/braille-spinner.test.ts` | Unit tests for BrailleSpinner |

---

### Task 1: Create BrailleSpinner class

**Why first:** This is the core engine. The animation timer and widget integration depend on it.

**Files:**
- Create: `packages/tui/src/widgets/braille-spinner.ts`
- Create: `packages/tui/src/widgets/__tests__/braille-spinner.test.ts`

**Amp reference:** `modules/0526_unknown_xa.js` — full source:
```js
class xa {
  state = [true, false, true, false, true, false, true, false];
  previousState = [];
  generation = 0;
  maxGenerations = 15;
  neighborMap = [[1,3,4,5,7],[0,2,4,5,6],[1,3,5,6,7],[0,2,4,6,7],
                 [0,1,3,5,7],[0,1,2,4,6],[1,2,3,5,7],[0,2,3,4,6]];
  step() { /* cellular automaton rules */ }
  toBraille() {
    let T = [0,1,2,6,3,4,5,7], R = 10240; // 0x2800
    for (let a = 0; a < 8; a++) if (this.state[a]) R |= 1 << T[a];
    return String.fromCharCode(R);
  }
}
```

- [ ] **Step 1: Write the failing test**

```typescript
// packages/tui/src/widgets/__tests__/braille-spinner.test.ts
import { describe, expect, it } from "bun:test";
import { BrailleSpinner } from "../braille-spinner";

describe("BrailleSpinner", () => {
  it("initializes with alternating state [true, false, true, ...]", () => {
    const spinner = new BrailleSpinner();
    expect(spinner.state).toEqual([true, false, true, false, true, false, true, false]);
  });

  it("toBraille() returns a single braille character", () => {
    const spinner = new BrailleSpinner();
    const ch = spinner.toBraille();
    expect(ch.length).toBe(1);
    // Should be in braille block range U+2800-U+28FF
    const code = ch.charCodeAt(0);
    expect(code).toBeGreaterThanOrEqual(0x2800);
    expect(code).toBeLessThanOrEqual(0x28ff);
  });

  it("step() evolves the state", () => {
    const spinner = new BrailleSpinner();
    const initial = [...spinner.state];
    spinner.step();
    // State should change after one step
    const changed = spinner.state.some((v, i) => v !== initial[i]);
    expect(changed).toBe(true);
  });

  it("toBraille() changes after step()", () => {
    const spinner = new BrailleSpinner();
    const first = spinner.toBraille();
    spinner.step();
    spinner.step();
    spinner.step();
    const later = spinner.toBraille();
    // After several steps, the braille character should differ
    // (not guaranteed after exactly 1 step, but very likely after 3)
    expect(typeof later).toBe("string");
    expect(later.length).toBe(1);
  });

  it("resets state when it stagnates or dies", () => {
    const spinner = new BrailleSpinner();
    // Run many steps — should auto-reset rather than getting stuck
    for (let i = 0; i < 100; i++) {
      spinner.step();
      const ch = spinner.toBraille();
      const code = ch.charCodeAt(0);
      // Should always produce valid braille
      expect(code).toBeGreaterThanOrEqual(0x2800);
      expect(code).toBeLessThanOrEqual(0x28ff);
    }
  });

  it("initial toBraille matches expected pattern", () => {
    // state [T,F,T,F,T,F,T,F] maps to braille dots:
    // Dot positions: [0,1,2,6,3,4,5,7]
    // state[0]=T → bit 0 (dot 1), state[2]=T → bit 2 (dot 3),
    // state[4]=T → bit 3 (dot 4), state[6]=T → bit 5 (dot 6)
    // 0x2800 | (1<<0) | (1<<2) | (1<<3) | (1<<5) = 0x2800 | 1 | 4 | 8 | 32 = 0x282D
    const spinner = new BrailleSpinner();
    const code = spinner.toBraille().charCodeAt(0);
    expect(code).toBe(0x282d);
  });

  it("generation counter increments", () => {
    const spinner = new BrailleSpinner();
    expect(spinner.generation).toBe(0);
    spinner.step();
    expect(spinner.generation).toBe(1);
    spinner.step();
    expect(spinner.generation).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/widgets/__tests__/braille-spinner.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the BrailleSpinner class**

```typescript
// packages/tui/src/widgets/braille-spinner.ts
/**
 * BrailleSpinner -- animated spinner using a cellular automaton on braille dots.
 *
 * Port of amp's `xa` class (modules/0526_unknown_xa.js).
 *
 * Uses an 8-cell grid where each cell maps to a braille dot position.
 * step() evolves the grid using rules similar to Conway's Game of Life:
 * - A live cell survives if it has 2 or 3 live neighbors
 * - A dead cell is born if it has 3 or 6 live neighbors
 *
 * When the automaton stagnates (static, oscillating, dies out, or
 * reaches maxGenerations), it re-seeds with a random configuration.
 *
 * toBraille() converts the 8-cell state to a Unicode braille character
 * (U+2800-U+28FF) using the standard braille dot bit mapping.
 *
 * 逆向: xa class (modules/0526_unknown_xa.js)
 *
 * @example
 * ```ts
 * const spinner = new BrailleSpinner();
 * setInterval(() => {
 *   spinner.step();
 *   process.stdout.write(`\r${spinner.toBraille()} Loading...`);
 * }, 200);
 * ```
 *
 * @module
 */

/**
 * Animated braille spinner using a cellular automaton.
 *
 * 逆向: xa (modules/0526_unknown_xa.js)
 */
export class BrailleSpinner {
  /**
   * 8-cell boolean grid state.
   * 逆向: xa.state = [true, false, true, false, true, false, true, false]
   */
  state: boolean[] = [true, false, true, false, true, false, true, false];

  /** Previous state for oscillation detection. */
  previousState: boolean[] = [];

  /** Current generation counter. */
  generation = 0;

  /** Max generations before forced re-seed. */
  maxGenerations = 15;

  /**
   * Neighbor adjacency map for each cell.
   * 逆向: xa.neighborMap — defines which cells are "neighbors" for the CA rules.
   */
  private readonly neighborMap: readonly number[][] = [
    [1, 3, 4, 5, 7], // cell 0
    [0, 2, 4, 5, 6], // cell 1
    [1, 3, 5, 6, 7], // cell 2
    [0, 2, 4, 6, 7], // cell 3
    [0, 1, 3, 5, 7], // cell 4
    [0, 1, 2, 4, 6], // cell 5
    [1, 2, 3, 5, 7], // cell 6
    [0, 2, 3, 4, 6], // cell 7
  ];

  /**
   * Advance the automaton by one generation.
   *
   * 逆向: xa.step()
   *
   * Rules:
   * - Live cell survives if neighbor count is 2 or 3
   * - Dead cell is born if neighbor count is 3 or 6
   *
   * Stagnation detection: if the new state equals the current state
   * (static), equals the previous state (period-2 oscillation), all
   * cells are dead, fewer than 2 live cells, or maxGenerations reached,
   * re-seed with a random state that has at least 3 live cells.
   */
  step(): void {
    const newState = this.state.map((alive, idx) => {
      const liveNeighbors = this.neighborMap[idx].filter((n) => this.state[n]).length;
      if (alive) return liveNeighbors === 2 || liveNeighbors === 3;
      return liveNeighbors === 3 || liveNeighbors === 6;
    });

    const isStatic = newState.every((v, i) => v === this.state[i]);
    const isOscillating =
      this.previousState.length > 0 && newState.every((v, i) => v === this.previousState[i]);

    this.previousState = [...this.state];
    this.state = newState;
    this.generation++;

    const allDead = newState.every((v) => !v);
    const liveCount = newState.filter((v) => v).length;

    if (isStatic || isOscillating || this.generation >= this.maxGenerations || allDead || liveCount < 2) {
      // Re-seed with random state, ensuring at least 3 live cells
      let seed: boolean[];
      do {
        seed = Array.from({ length: 8 }, () => Math.random() > 0.6);
      } while (seed.filter((v) => v).length < 3);

      this.state = seed;
      this.previousState = [];
      this.generation = 0;
    }
  }

  /**
   * Convert current state to a single braille Unicode character.
   *
   * 逆向: xa.toBraille()
   *
   * Braille dot numbering (standard):
   *   1 4       bit 0, bit 3
   *   2 5       bit 1, bit 4
   *   3 6       bit 2, bit 5
   *   7 8       bit 6, bit 7
   *
   * The mapping array [0,1,2,6,3,4,5,7] maps our 8-cell index
   * to the braille bit position.
   */
  toBraille(): string {
    const dotMap = [0, 1, 2, 6, 3, 4, 5, 7];
    let code = 0x2800; // Braille base
    for (let i = 0; i < 8; i++) {
      if (this.state[i]) {
        code |= 1 << dotMap[i];
      }
    }
    return String.fromCharCode(code);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/widgets/__tests__/braille-spinner.test.ts`
Expected: PASS

- [ ] **Step 5: Export from tui package**

Add export in `packages/tui/src/widgets/index.ts` or the main barrel export:

```typescript
export { BrailleSpinner } from "./braille-spinner.js";
```

- [ ] **Step 6: Commit**

```bash
git add packages/tui/src/widgets/braille-spinner.ts packages/tui/src/widgets/__tests__/braille-spinner.test.ts
git commit -m "feat(tui): add BrailleSpinner class — cellular automaton braille animation

Port of amp's xa class. Uses an 8-cell grid with CA rules (survival: 2-3,
birth: 3 or 6 neighbors). Auto-reseeds on stagnation. toBraille() maps
state to Unicode braille character U+2800-U+28FF.

逆向: amp modules/0526_unknown_xa.js (xa class)"
```

---

### Task 2: Replace static `\u27F3` in conversation-view with animated spinner

**Why:** With the BrailleSpinner class, we can now replace the static character and add animation.

**Files:**
- Modify: `packages/cli/src/widgets/conversation-view.ts` (add spinner state, animation timer, use toBraille())

**Amp reference:**
- `chunk-006.js:6121-6157` — Y1T: `_spinner = new xa()`, `_startAnimation()` uses `setInterval(200ms)`, `_stopAnimation()` clears it
- `chunk-006.js:6178` — `this._spinner.toBraille()` in activity group build
- `chunk-004.js:21004` — `t.toBraille()` in tool row build

- [ ] **Step 1: Add BrailleSpinner import and state management**

In `packages/cli/src/widgets/conversation-view.ts`, add import:

```typescript
import { BrailleSpinner } from "@flitter/tui";
```

Add spinner fields to `ConversationViewState`:

```typescript
  /**
   * Braille spinner for in-progress tool indicators.
   * 逆向: Y1T._spinner (chunk-006.js:6121)
   */
  private _spinner = new BrailleSpinner();

  /**
   * Animation timer handle.
   * 逆向: Y1T._animationTimer (chunk-006.js:6122)
   */
  private _animationTimer: ReturnType<typeof setInterval> | null = null;
```

- [ ] **Step 2: Add animation lifecycle methods**

In `ConversationViewState`, add start/stop animation methods:

```typescript
  /**
   * Start the braille spinner animation.
   * 逆向: Y1T._startAnimation (chunk-006.js:6147-6153)
   * Steps the spinner every 200ms and triggers setState to redraw.
   */
  private _startAnimation(): void {
    if (this._animationTimer) return;
    this._animationTimer = setInterval(() => {
      this.setState(() => {
        this._spinner.step();
      });
    }, 200);
  }

  /**
   * Stop the braille spinner animation.
   * 逆向: Y1T._stopAnimation (chunk-006.js:6155-6157)
   */
  private _stopAnimation(): void {
    if (!this._animationTimer) return;
    clearInterval(this._animationTimer);
    this._animationTimer = null;
  }
```

Update `initState` and `dispose`:

```typescript
  initState(): void {
    super.initState();
    this._parser = new MarkdownParser();
    this._renderer = new MarkdownRenderer();
  }

  dispose(): void {
    this._stopAnimation();
    super.dispose();
  }
```

- [ ] **Step 3: Start/stop animation based on inferenceState**

In the `build()` method, check for in-progress tools and manage the animation:

```typescript
  build(_context: BuildContext): Widget {
    const { items, messages, inferenceState, error } = this.widget.config;

    // 逆向: Y1T lifecycle — start animation when tools are in progress, stop when idle
    const hasInProgress = items?.some(
      (item) =>
        (item.type === "tool" && item.status === "in-progress") ||
        (item.type === "activity-group" && item.hasInProgress),
    ) ?? false;

    if (hasInProgress || inferenceState === "running") {
      this._startAnimation();
    } else {
      this._stopAnimation();
    }

    // ... rest of build method unchanged
```

- [ ] **Step 4: Replace static `\u27F3` with spinner.toBraille()**

In `_getStatusIcon` function, replace the in-progress case:

```typescript
// OLD:
    case "in-progress":
      return "\u27F3"; // ⟳

// NEW:
    case "in-progress":
      return null; // Handled by caller using spinner
```

Wait — `_getStatusIcon` is a module-level function, not a method. We need to make the spinner available to it. Better approach: override the icon in the build methods.

In `_buildToolWidget`, replace the icon for in-progress:

```typescript
  private _buildToolWidget(tool: ToolItem): Widget {
    // 逆向: use spinner for in-progress, static icons for other states
    const icon = tool.status === "in-progress" ? this._spinner.toBraille() : _getStatusIcon(tool.status);
    const iconColor = _getStatusColor(tool.status);
    // ... rest unchanged
```

In `_buildActivityGroupWidget`, replace the spinner:

```typescript
  private _buildActivityGroupWidget(group: ActivityGroupItem): Widget {
    const spans: TextSpan[] = [];

    if (group.hasInProgress) {
      // 逆向: this._spinner.toBraille() + toolRunning color (chunk-006.js:6178)
      spans.push(
        new TextSpan({
          text: `${this._spinner.toBraille()} `,
          style: new TextStyle({ foreground: TOOL_COLOR }),
        }),
      );
    } else {
      // ... unchanged
```

- [ ] **Step 5: Write test for spinner animation**

Append to `packages/tui/src/widgets/__tests__/braille-spinner.test.ts`:

```typescript
describe("BrailleSpinner animation cycle", () => {
  it("produces distinct characters over 10 steps", () => {
    const spinner = new BrailleSpinner();
    const chars = new Set<string>();
    for (let i = 0; i < 10; i++) {
      chars.add(spinner.toBraille());
      spinner.step();
    }
    // Should produce at least 2 distinct characters in 10 steps
    expect(chars.size).toBeGreaterThanOrEqual(2);
  });

  it("never produces empty string", () => {
    const spinner = new BrailleSpinner();
    for (let i = 0; i < 50; i++) {
      const ch = spinner.toBraille();
      expect(ch.length).toBe(1);
      expect(ch).not.toBe("");
      spinner.step();
    }
  });
});
```

- [ ] **Step 6: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/tui/src/widgets/__tests__/braille-spinner.test.ts && bun test packages/cli/src/widgets/`
Expected: PASS

- [ ] **Step 7: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json && bunx tsc --noEmit -p packages/tui/tsconfig.json`
Expected: No type errors

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/widgets/conversation-view.ts packages/tui/src/widgets/__tests__/braille-spinner.test.ts
git commit -m "feat(tui): replace static spinner with animated braille spinner

In-progress tool indicators and activity groups now show an animated
braille character that evolves every 200ms via the BrailleSpinner
cellular automaton, matching amp's Y1T._spinner behavior.

逆向: amp chunk-006.js:6121-6178 (Y1T._spinner + _startAnimation),
       chunk-004.js:21004 (t.toBraille() in tool row)"
```

---

### Task 3: Full test suite and type check

- [ ] **Step 1: Run type check across all packages**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json && bunx tsc --noEmit -p packages/tui/tsconfig.json`
Expected: No type errors

- [ ] **Step 2: Run all existing tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 3: E2E verification**

```bash
tmux new-session -d -s test -x 80 -y 24 "bun run packages/cli/src/main.ts 2>/tmp/spinner-test.log"
sleep 3
# Type a query that triggers tool use (to see spinner)
tmux send-keys -t test "search for files matching *.ts" Enter
sleep 2
# Capture screen — should see a braille character (U+2800 range), not the static \u27F3
tmux capture-pane -t test -p > /tmp/spinner-capture.txt
# Check for braille characters in the capture
python3 -c "
import sys
data = open('/tmp/spinner-capture.txt').read()
braille = [c for c in data if 0x2800 <= ord(c) <= 0x28FF]
if braille: print('OK: braille spinner visible')
else: print('FAIL: no braille characters found')
"
tmux kill-session -t test
```
