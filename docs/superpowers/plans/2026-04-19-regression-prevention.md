# TUI Regression Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent layout-composition and keyboard-parsing regressions via two layers: a headless `renderToScreen()` test harness (Layer 1) and automated tmux E2E smoke tests (Layer 2).

**Architecture:** Layer 1 extracts the existing `createPipeline()` + `Screen` buffer pattern into a shared `renderToScreen(widget, w, h)` utility, then writes integration tests that mount real widget compositions (StatusBar inside Column, ApprovalWidget state lifecycle) and assert on cell content. Layer 2 launches each of the 8 split TUI demo files individually in tmux, runs text-based assertions on `capture-pane` output, and captures colored HTML snapshots via `ansi_up` for visual regression review.

**Tech Stack:** node:test + node:assert/strict (Layer 1), bash + tmux (Layer 2), existing `Screen`/`BuildOwner`/`PipelineOwner`/`FrameScheduler` infrastructure.

---

## File Structure

### Layer 1: Headless renderToScreen Harness

| File | Responsibility |
|------|---------------|
| `packages/tui/src/test-utils/render-to-screen.ts` | `renderToScreen(widget, w, h) → Screen` utility + `readRow(screen, y) → string` + `assertRowContains(screen, y, text)` helpers |
| `packages/tui/src/test-utils/render-to-screen.test.ts` | Unit tests for the harness itself |
| `packages/cli/src/widgets/status-bar.integration.test.ts` | StatusBar-in-Column layout regression test |
| `packages/cli/src/widgets/approval-widget.integration.test.ts` | ApprovalWidget state lifecycle regression test |
| `packages/cli/src/widgets/input-field.integration.test.ts` | InputField-in-Column layout regression test |

### Layer 2: tmux E2E Smoke Tests

| File | Responsibility |
|------|---------------|
| `tests/e2e/ansi2html.ts` | ANSI SGR → HTML converter (thin wrapper around `ansi_up` npm package) |
| `tests/e2e/lib.sh` | Shared bash functions: session lifecycle, capture, capture-to-HTML, assert helpers |
| `tests/e2e/smoke-test.sh` | Sequential smoke test: launches each of the 8 split demos, runs text assertions, captures HTML |
| `tests/e2e/capture-demos.sh` | Parallel visual capture: launches all 8 demos simultaneously, produces HTML + index page |

> **Note:** The original plan referenced `tests/e2e/` (without 's') and assumed a combined
> `tui-cli-widgets-demo.ts` with mode switching via keys 1-8. The actual directory is `tests/e2e/`
> and demos have been split into 8 individual files (`examples/tui-*-demo.ts`). The smoke test
> launches each demo separately rather than switching modes in a single process.

---

## Task 1: Create `renderToScreen()` utility

**Files:**
- Create: `packages/tui/src/test-utils/render-to-screen.ts`
- Create: `packages/tui/src/test-utils/render-to-screen.test.ts`

- [ ] **Step 1: Write the failing test for `renderToScreen` with a simple Text widget**

Create `packages/tui/src/test-utils/render-to-screen.test.ts`:

```typescript
/**
 * renderToScreen test harness unit tests.
 *
 * Validates:
 * - renderToScreen() runs the full build → layout → paint pipeline
 * - readRow() extracts text content from a Screen row
 * - assertRowContains() throws on missing text
 * - Works with Text, Column, Row, Expanded, SizedBox
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Text } from "../../widgets/text.js";
import { renderToScreen, readRow, assertRowContains } from "./render-to-screen.js";

describe("renderToScreen", () => {
  it("renders a simple Text widget to the screen buffer", () => {
    const widget = new Text({ data: "Hello" });
    const screen = renderToScreen(widget, 80, 24);

    // "Hello" should appear at row 0
    const row0 = readRow(screen, 0);
    assert.ok(row0.includes("Hello"), `Expected "Hello" in row 0, got: "${row0}"`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test packages/tui/src/test-utils/render-to-screen.test.ts`
Expected: FAIL with "Cannot find module './render-to-screen.js'"

- [ ] **Step 3: Implement `renderToScreen` utility**

Create `packages/tui/src/test-utils/render-to-screen.ts`:

```typescript
/**
 * Headless widget rendering for tests.
 *
 * Runs the full Widget → Element → RenderObject pipeline (build → layout → paint)
 * without a TTY, producing a Screen buffer for cell-level assertions.
 *
 * Usage:
 * ```ts
 * const screen = renderToScreen(new MyWidget(), 80, 24);
 * assertRowContains(screen, 0, "Expected text");
 * ```
 *
 * @module
 */

import { BuildOwner } from "../tree/build-owner.js";
import type { Widget } from "../tree/element.js";
import { FrameScheduler } from "../tree/frame-scheduler.js";
import { PipelineOwner } from "../tree/pipeline-owner.js";
import { setBuildOwner, setPipelineOwner } from "../tree/types.js";
import { Screen } from "../screen/screen.js";
import { MediaQuery, MediaQueryData } from "../widgets/media-query.js";

/**
 * Render a widget tree to a virtual Screen buffer.
 *
 * Sets up the full pipeline (BuildOwner + PipelineOwner + FrameScheduler),
 * wraps the widget in MediaQuery (so widgets can query terminal size),
 * mounts it, runs one frame (build → layout → paint), paints to Screen,
 * then tears everything down.
 *
 * @param widget - Root widget to render
 * @param width - Virtual terminal width (columns)
 * @param height - Virtual terminal height (rows)
 * @returns Screen buffer with painted content
 */
export function renderToScreen(widget: Widget, width: number, height: number): Screen {
  // Save and restore global singletons to avoid test pollution
  const prevBuildOwner = (() => { try { return undefined; } catch { return undefined; } })();
  const prevPipelineOwner = (() => { try { return undefined; } catch { return undefined; } })();

  const buildOwner = new BuildOwner();
  const pipelineOwner = new PipelineOwner();
  const scheduler = new FrameScheduler();
  scheduler.disableFramePacing();

  setBuildOwner(buildOwner);
  setPipelineOwner(pipelineOwner);

  buildOwner.setOnNeedFrame(() => scheduler.requestFrame());
  pipelineOwner.setOnNeedFrame(() => scheduler.requestFrame());

  scheduler.addFrameCallback("build", () => buildOwner.buildScopes(), "build");
  scheduler.addFrameCallback("layout", () => pipelineOwner.flushLayout(), "layout");
  scheduler.addFrameCallback("paint", () => pipelineOwner.flushPaint(), "paint");

  try {
    // Wrap in MediaQuery so widgets can query terminal size
    const mediaQueryData = new MediaQueryData(
      { width, height },
      {
        emojiWidth: false,
        syncOutput: false,
        kittyKeyboard: false,
        colorPaletteNotifications: false,
        xtversion: null,
      },
    );
    const wrapped = new MediaQuery({ data: mediaQueryData, child: widget });

    // Mount the widget tree
    const rootElement = wrapped.createElement();
    rootElement.mount();

    // Find the root RenderObject and attach it to PipelineOwner
    const rootRO = rootElement.findRenderObject();
    if (!rootRO) {
      throw new Error("renderToScreen: no RenderObject found after mount");
    }
    pipelineOwner.setRootRenderObject(rootRO);
    pipelineOwner.updateRootConstraints({ width, height });

    // Execute one full frame: build → layout → paint
    scheduler.executeFrame();

    // Paint the render tree onto a virtual Screen
    const screen = new Screen(width, height);
    screen.clear();
    rootRO.paint(screen, 0, 0);

    // Unmount
    rootElement.unmount();

    return screen;
  } finally {
    scheduler.dispose();
    buildOwner.dispose();
    pipelineOwner.dispose();
    setBuildOwner(undefined);
    setPipelineOwner(undefined);
  }
}

/**
 * Read all text content from a single row of the Screen.
 *
 * Concatenates all non-space characters from left to right, trimming trailing spaces.
 *
 * @param screen - Screen buffer
 * @param y - Row index (0-based)
 * @returns The text content of the row
 */
export function readRow(screen: Screen, y: number): string {
  if (y < 0 || y >= screen.height) return "";
  const chars: string[] = [];
  for (let x = 0; x < screen.width; x++) {
    const cell = screen.getCell(x, y);
    chars.push(cell.char);
  }
  return chars.join("").trimEnd();
}

/**
 * Read all text content from the entire Screen.
 *
 * @param screen - Screen buffer
 * @returns Array of row strings (one per row)
 */
export function readAllRows(screen: Screen): string[] {
  const rows: string[] = [];
  for (let y = 0; y < screen.height; y++) {
    rows.push(readRow(screen, y));
  }
  return rows;
}

/**
 * Assert that a screen row contains the expected substring.
 *
 * @param screen - Screen buffer
 * @param y - Row index (0-based)
 * @param expected - Substring to find
 * @throws AssertionError if the text is not found
 */
export function assertRowContains(screen: Screen, y: number, expected: string): void {
  const row = readRow(screen, y);
  if (!row.includes(expected)) {
    throw new Error(
      `Row ${y} does not contain "${expected}"\n` +
      `  Actual: "${row}"`,
    );
  }
}

/**
 * Assert that the screen contains the expected text on any row.
 *
 * @param screen - Screen buffer
 * @param expected - Substring to find
 * @throws Error if no row contains the text
 */
export function assertScreenContains(screen: Screen, expected: string): void {
  const rows = readAllRows(screen);
  const found = rows.some((row) => row.includes(expected));
  if (!found) {
    const dump = rows.map((r, i) => `  ${String(i).padStart(2)}: "${r}"`).join("\n");
    throw new Error(
      `Screen does not contain "${expected}"\n` +
      `Full screen dump:\n${dump}`,
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test packages/tui/src/test-utils/render-to-screen.test.ts`
Expected: PASS

- [ ] **Step 5: Add more harness self-tests**

Append to `packages/tui/src/test-utils/render-to-screen.test.ts`:

```typescript
import { Column } from "../../widgets/column.js";
import { Row } from "../../widgets/row.js";
import { Expanded } from "../../widgets/flexible.js";
import { SizedBox } from "../../widgets/sized-box.js";
import type { Widget as WidgetInterface } from "../../tree/element.js";

describe("renderToScreen — layout composition", () => {
  it("Column with two Text children renders both on separate rows", () => {
    const widget = new Column({
      children: [
        new Text({ data: "Line A" }) as unknown as WidgetInterface,
        new Text({ data: "Line B" }) as unknown as WidgetInterface,
      ],
    });
    const screen = renderToScreen(widget, 80, 24);

    assertRowContains(screen, 0, "Line A");
    assertRowContains(screen, 1, "Line B");
  });

  it("Expanded child receives remaining height in Column", () => {
    const widget = new Column({
      children: [
        new Text({ data: "Header" }) as unknown as WidgetInterface,
        new Expanded({
          child: new SizedBox({}) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,
        new Text({ data: "Footer" }) as unknown as WidgetInterface,
      ],
    });
    const screen = renderToScreen(widget, 80, 24);

    // Header at row 0
    assertRowContains(screen, 0, "Header");
    // Footer at row 23 (last row: height=24, header=1 row, expanded=22 rows, footer=1 row)
    assertRowContains(screen, 23, "Footer");
  });

  it("Row places children side by side", () => {
    const widget = new Row({
      children: [
        new Text({ data: "Left" }) as unknown as WidgetInterface,
        new Text({ data: "Right" }) as unknown as WidgetInterface,
      ],
    });
    const screen = renderToScreen(widget, 80, 24);

    const row0 = readRow(screen, 0);
    assert.ok(row0.includes("Left"), `Expected "Left" in row 0`);
    assert.ok(row0.includes("Right"), `Expected "Right" in row 0`);
    // "Left" should appear before "Right"
    assert.ok(row0.indexOf("Left") < row0.indexOf("Right"));
  });
});

describe("readRow / readAllRows", () => {
  it("readRow returns empty string for out-of-bounds row", () => {
    const screen = renderToScreen(new Text({ data: "X" }), 10, 5);
    assert.equal(readRow(screen, -1), "");
    assert.equal(readRow(screen, 99), "");
  });

  it("readAllRows returns one string per row", () => {
    const screen = renderToScreen(new Text({ data: "Test" }), 10, 3);
    const rows = readAllRows(screen);
    assert.equal(rows.length, 3);
  });
});

describe("assertScreenContains", () => {
  it("passes when text exists anywhere on screen", () => {
    const widget = new Column({
      children: [
        new Text({ data: "aaa" }) as unknown as WidgetInterface,
        new Text({ data: "bbb" }) as unknown as WidgetInterface,
        new Text({ data: "target" }) as unknown as WidgetInterface,
      ],
    });
    const screen = renderToScreen(widget, 80, 24);
    assertScreenContains(screen, "target");
  });

  it("throws when text is not found", () => {
    const screen = renderToScreen(new Text({ data: "Hello" }), 80, 24);
    assert.throws(
      () => assertScreenContains(screen, "Missing"),
      /Screen does not contain "Missing"/,
    );
  });
});
```

- [ ] **Step 6: Run all harness tests**

Run: `npx tsx --test packages/tui/src/test-utils/render-to-screen.test.ts`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add packages/tui/src/test-utils/render-to-screen.ts packages/tui/src/test-utils/render-to-screen.test.ts
git commit -m "feat(test): add renderToScreen() headless widget test harness

Provides renderToScreen(widget, w, h) → Screen for testing widget
composition layout/paint in isolation without a TTY. Includes
readRow(), readAllRows(), assertRowContains(), assertScreenContains()
assertion helpers."
```

---

## Task 2: StatusBar-in-Column layout regression test

**Files:**
- Create: `packages/cli/src/widgets/status-bar.integration.test.ts`

This test catches the `mainAxisSize` bug: StatusBar's Column defaulting to `mainAxisSize: "max"` expands to fill all available height, stealing space from `Expanded` siblings.

- [ ] **Step 1: Write the failing test (would fail without the mainAxisSize fix)**

Create `packages/cli/src/widgets/status-bar.integration.test.ts`:

```typescript
/**
 * StatusBar integration test — verifies layout behavior when composed
 * inside a Column with Expanded siblings.
 *
 * Regression test for: StatusBar's internal Column lacking mainAxisSize: "min",
 * causing it to expand to full height and starving Expanded siblings.
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  renderToScreen,
  readRow,
  readAllRows,
  assertScreenContains,
} from "@flitter/tui/src/test-utils/render-to-screen.js";
import { Column } from "@flitter/tui";
import { Expanded } from "@flitter/tui";
import { Text } from "@flitter/tui";
import { SizedBox } from "@flitter/tui";
import type { Widget as WidgetInterface } from "@flitter/tui";
import { StatusBar, type StatusBarState } from "./status-bar.js";

function makeIdleState(): StatusBarState {
  return {
    modelName: "claude-opus-4-6",
    inferenceState: "idle",
    hasStartedStreaming: false,
    tokenUsage: { inputTokens: 1000, outputTokens: 200, maxInputTokens: 200000 },
    compactionState: "idle",
    runningToolCount: 0,
    waitingForApproval: false,
  };
}

describe("StatusBar integration — layout in Column", () => {
  it("StatusBar only occupies 3 rows when placed in a Column with Expanded", () => {
    const widget = new Column({
      children: [
        new Expanded({
          child: new Text({ data: "Content area" }) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,
        new StatusBar({ state: makeIdleState() }) as unknown as WidgetInterface,
      ],
    });

    const screen = renderToScreen(widget, 80, 24);
    const rows = readAllRows(screen);

    // Content area should be at row 0 (taking 21 rows = 24 - 3)
    assert.ok(rows[0].includes("Content area"), `Row 0 should have content, got: "${rows[0]}"`);

    // StatusBar should occupy exactly rows 21-23 (3 rows for its bordered layout)
    // Top border: ╭
    assert.ok(rows[21].includes("╭"), `Row 21 should have StatusBar top border, got: "${rows[21]}"`);
    // Middle: │ ... model name ... │
    assert.ok(rows[22].includes("claude-opus-4-6"), `Row 22 should have model name, got: "${rows[22]}"`);
    // Bottom border: ╰
    assert.ok(rows[23].includes("╰"), `Row 23 should have StatusBar bottom border, got: "${rows[23]}"`);
  });

  it("StatusBar does not steal height from preceding Expanded sibling", () => {
    const widget = new Column({
      children: [
        new Text({ data: "Header" }) as unknown as WidgetInterface,
        new Expanded({
          child: new SizedBox({}) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,
        new StatusBar({ state: makeIdleState() }) as unknown as WidgetInterface,
        new Text({ data: "Footer" }) as unknown as WidgetInterface,
      ],
    });

    const screen = renderToScreen(widget, 80, 24);
    const rows = readAllRows(screen);

    // Header at row 0
    assert.ok(rows[0].includes("Header"), `Row 0 should have Header`);

    // Footer should be at row 23 (last row)
    // StatusBar occupies 3 rows above it: rows 20-22
    // Footer at row 23
    assert.ok(rows[23].includes("Footer"), `Row 23 should have Footer, got: "${rows[23]}"`);

    // StatusBar top border at row 20
    assert.ok(rows[20].includes("╭"), `Row 20 should have StatusBar top border, got: "${rows[20]}"`);
  });

  it("StatusBar renders all 9 status messages correctly", () => {
    const scenarios: Array<{ state: Partial<StatusBarState>; expected: string }> = [
      { state: { compactionState: "compacting" }, expected: "Auto-compacting" },
      { state: { waitingForApproval: true }, expected: "Waiting for approval" },
      { state: { runningToolCount: 3 }, expected: "Running 3 tools" },
      { state: { runningToolCount: 1 }, expected: "Running tools" },
      { state: { inferenceState: "running", hasStartedStreaming: false }, expected: "Waiting for response" },
      { state: { inferenceState: "running", hasStartedStreaming: true }, expected: "Streaming response" },
    ];

    for (const { state, expected } of scenarios) {
      const fullState: StatusBarState = { ...makeIdleState(), ...state };
      const widget = new StatusBar({ state: fullState });
      const screen = renderToScreen(widget as unknown as WidgetInterface, 80, 3);
      assertScreenContains(screen, expected);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it passes (confirms the mainAxisSize fix is effective)**

Run: `npx tsx --test packages/cli/src/widgets/status-bar.integration.test.ts`
Expected: All PASS (the fix from the walk-through is already in place)

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/widgets/status-bar.integration.test.ts
git commit -m "test(status-bar): add integration test for Column layout regression

Catches mainAxisSize: 'min' omission that caused StatusBar to steal
all height from Expanded siblings."
```

---

## Task 3: InputField-in-Column layout regression test

**Files:**
- Create: `packages/cli/src/widgets/input-field.integration.test.ts`

Same class of bug as StatusBar — InputField's Column lacking `mainAxisSize: "min"`.

- [ ] **Step 1: Write the integration test**

Create `packages/cli/src/widgets/input-field.integration.test.ts`:

```typescript
/**
 * InputField integration test — verifies layout when composed in a Column.
 *
 * Regression test for: InputField's internal Column lacking mainAxisSize: "min".
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  renderToScreen,
  readRow,
  readAllRows,
} from "@flitter/tui/src/test-utils/render-to-screen.js";
import { Column, Expanded, Text, SizedBox } from "@flitter/tui";
import type { Widget as WidgetInterface } from "@flitter/tui";
import { InputField } from "./input-field.js";

describe("InputField integration — layout in Column", () => {
  it("InputField occupies bounded height when placed with Expanded sibling", () => {
    const widget = new Column({
      children: [
        new Expanded({
          child: new Text({ data: "Messages" }) as unknown as WidgetInterface,
        }) as unknown as WidgetInterface,
        new InputField({
          onSubmit: () => {},
          placeholder: "Type here...",
        }) as unknown as WidgetInterface,
      ],
    });

    const screen = renderToScreen(widget, 80, 24);
    const rows = readAllRows(screen);

    // Messages should appear at the top
    assert.ok(rows[0].includes("Messages"), `Row 0 should have Messages, got: "${rows[0]}"`);

    // InputField renders a bordered box: ┌─...─┐ / │ ... │ / └─...─┘
    // It should only take 3 rows (single-line input), not the full screen
    // So it should be at the bottom: rows 21-23
    const inputRows = rows.filter((r) => r.includes("┌") || r.includes("└") || r.includes("│"));
    assert.ok(
      inputRows.length >= 2 && inputRows.length <= 7,
      `InputField should take 3-7 rows (1-5 line input + borders), got ${inputRows.length} rows with border chars`,
    );

    // The content area should have non-empty rows (not all stolen by InputField)
    const contentRows = rows.slice(0, 20).filter((r) => r.trim().length > 0);
    assert.ok(
      contentRows.length >= 1,
      "Content area should have at least 1 non-empty row — InputField is stealing height",
    );
  });

  it("InputField shows placeholder text in the rendered output", () => {
    const widget = new InputField({
      onSubmit: () => {},
      placeholder: "Type a message...",
    });

    const screen = renderToScreen(widget as unknown as WidgetInterface, 80, 5);
    const rows = readAllRows(screen);
    const allText = rows.join(" ");

    // The placeholder or border chars should be present
    const hasBorder = rows.some((r) => r.includes("┌") || r.includes("└"));
    assert.ok(hasBorder, `InputField should render border characters`);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx tsx --test packages/cli/src/widgets/input-field.integration.test.ts`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/widgets/input-field.integration.test.ts
git commit -m "test(input-field): add integration test for Column layout regression

Catches mainAxisSize: 'min' omission that caused InputField to steal
all height from Expanded siblings."
```

---

## Task 4: ApprovalWidget state lifecycle regression test

**Files:**
- Create: `packages/cli/src/widgets/approval-widget.integration.test.ts`

This test catches the feedback-mode state leak bug: `_feedbackActive` not being reset when `_submitFeedback()` is called.

- [ ] **Step 1: Write the integration test**

Create `packages/cli/src/widgets/approval-widget.integration.test.ts`:

```typescript
/**
 * ApprovalWidget integration test — verifies state lifecycle.
 *
 * Regression test for: _feedbackActive not reset in _submitFeedback(),
 * causing next approval request to start stuck in feedback mode.
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  renderToScreen,
  readAllRows,
  assertScreenContains,
} from "@flitter/tui/src/test-utils/render-to-screen.js";
import type { Widget as WidgetInterface } from "@flitter/tui";
import {
  ApprovalWidget,
  ApprovalWidgetState,
  type ApprovalRequest,
  type ApprovalResponse,
} from "./approval-widget.js";

function makeRequest(toolName: string): ApprovalRequest {
  return {
    toolUseId: `tu_${toolName}`,
    toolName,
    args: { command: `echo ${toolName}` },
    reason: `Tool requires approval: ${toolName}`,
  };
}

describe("ApprovalWidget integration — state lifecycle", () => {
  it("renders 4 approval options by default", () => {
    const widget = new ApprovalWidget({
      request: makeRequest("Bash"),
      onRespond: () => {},
    });

    const screen = renderToScreen(widget as unknown as WidgetInterface, 80, 20);
    assertScreenContains(screen, "Approve");
    assertScreenContains(screen, "Deny");
  });

  it("renders the tool name in the header", () => {
    const widget = new ApprovalWidget({
      request: makeRequest("Bash"),
      onRespond: () => {},
    });

    const screen = renderToScreen(widget as unknown as WidgetInterface, 80, 20);
    // Should show "Run this command?" for Bash tool
    assertScreenContains(screen, "command");
  });

  it("_feedbackActive resets after _submitFeedback (state leak regression)", () => {
    // This tests the state lifecycle directly since we can't simulate
    // keyboard input through renderToScreen.
    const responses: ApprovalResponse[] = [];
    const widget = new ApprovalWidget({
      request: makeRequest("Bash"),
      onRespond: (_id, resp) => responses.push(resp),
    });

    const state = widget.createState() as ApprovalWidgetState;
    const mockElement = { markNeedsRebuild: () => {} } as any;
    (state as any)._widget = widget;
    (state as any)._element = mockElement;
    (state as any)._mounted = true;
    state.initState();

    // Enter feedback mode
    (state as any)._feedbackActive = true;
    (state as any)._feedbackText = "use sed instead";

    // Submit feedback (this should reset _feedbackActive)
    (state as any)._submitFeedback();

    // Verify feedback was submitted
    assert.equal(responses.length, 1);
    assert.equal(responses[0].approved, false);
    assert.equal(responses[0].feedback, "use sed instead");

    // REGRESSION CHECK: _feedbackActive should be false after submit
    assert.equal(
      (state as any)._feedbackActive,
      false,
      "_feedbackActive should reset after _submitFeedback() — " +
      "otherwise the next approval request starts stuck in feedback mode",
    );
  });
});
```

- [ ] **Step 2: Run test — expect the state leak test to FAIL (bug is not yet fixed)**

Run: `npx tsx --test packages/cli/src/widgets/approval-widget.integration.test.ts`
Expected: 2 PASS, 1 FAIL (the `_feedbackActive` regression test)

- [ ] **Step 3: Fix the bug in `_submitFeedback()`**

Modify `packages/cli/src/widgets/approval-widget.ts:372`:

Find:
```typescript
  private _submitFeedback(): void {
    const text = this._feedbackText.trim();
    this._feedbackText = "";
```

Replace with:
```typescript
  private _submitFeedback(): void {
    const text = this._feedbackText.trim();
    this._feedbackText = "";
    this._feedbackActive = false;
```

- [ ] **Step 4: Run test to verify the fix**

Run: `npx tsx --test packages/cli/src/widgets/approval-widget.integration.test.ts`
Expected: All 3 PASS

- [ ] **Step 5: Run existing approval-widget tests to ensure no regression**

Run: `bun test packages/cli/src/widgets/approval-widget.test.ts` (if exists) or `npx tsx --test packages/cli/src/widgets/approval-widget.test.ts`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/approval-widget.ts packages/cli/src/widgets/approval-widget.integration.test.ts
git commit -m "fix(approval-widget): reset _feedbackActive after submit + regression test

_submitFeedback() cleared _feedbackText but not _feedbackActive,
causing the next approval request to start stuck in feedback mode
when the ApprovalWidgetState was reused."
```

---

## Task 5: Create tmux E2E helper library + ANSI→HTML converter

**Files:**
- Create: `tests/e2e/lib.sh`
- Create: `tests/e2e/ansi2html.ts` (thin wrapper around `ansi_up` npm package)

> **Status:** IMPLEMENTED. See `tests/e2e/lib.sh` and `tests/e2e/ansi2html.ts` in the repo.
> The helper library includes `tmux_capture_html` which pipes `capture-pane -e` through ansi2html.ts.

- [ ] **Step 1: Write the shared bash helper library**

Create `tests/e2e/lib.sh`:

```bash
#!/usr/bin/env bash
# ════════════════════════════════════════════════════
#  Flitter tmux E2E test helper library
#
#  Source this file in test scripts:
#    source "$(dirname "$0")/lib.sh"
# ════════════════════════════════════════════════════

set -euo pipefail

# Counters
_PASS=0
_FAIL=0
_TOTAL=0

# Current session name (set by tmux_start)
_SESSION=""

# ── Colors ──
_RED=$'\033[31m'
_GREEN=$'\033[32m'
_DIM=$'\033[2m'
_RESET=$'\033[0m'

# ── Session lifecycle ──

# Start a tmux session running the given command.
#   tmux_start <session_name> <command> [width] [height]
tmux_start() {
  local name="$1" cmd="$2"
  local width="${3:-80}" height="${4:-24}"
  _SESSION="$name"

  tmux kill-session -t "$name" 2>/dev/null || true
  tmux new-session -d -s "$name" -x "$width" -y "$height" \
    "$cmd 2>/tmp/${name}-stderr.log"

  # Wait for first frame
  sleep 3
}

# Kill the current tmux session.
tmux_stop() {
  if [ -n "$_SESSION" ]; then
    tmux kill-session -t "$_SESSION" 2>/dev/null || true
    _SESSION=""
  fi
}

# ── Input ──

# Send a key to the current session.
#   tmux_key <key>
# Examples: tmux_key '3', tmux_key Escape, tmux_key Enter
tmux_key() {
  tmux send-keys -t "$_SESSION" "$1"
  sleep 0.5
}

# Send raw bytes (for mouse events etc.)
#   tmux_raw <escape_sequence>
tmux_raw() {
  tmux send-keys -t "$_SESSION" -- "$1"
  sleep 0.5
}

# ── Screen capture ──

# Capture the current pane content into $_SCREEN.
tmux_capture() {
  _SCREEN=$(tmux capture-pane -t "$_SESSION" -p)
}

# ── Assertions ──

# Assert that the captured screen contains a string.
#   assert_screen <expected> <message>
assert_screen() {
  local expected="$1" msg="${2:-Screen should contain: $1}"
  ((_TOTAL++)) || true
  if echo "$_SCREEN" | grep -qF "$expected"; then
    ((_PASS++)) || true
    echo "  ${_GREEN}PASS${_RESET} $msg"
  else
    ((_FAIL++)) || true
    echo "  ${_RED}FAIL${_RESET} $msg"
    echo "    Expected to find: \"$expected\""
    echo "    ${_DIM}Screen content:${_RESET}"
    echo "$_SCREEN" | head -10 | sed 's/^/      /'
    echo "      ..."
  fi
}

# Assert that the captured screen does NOT contain a string.
#   assert_screen_not <unexpected> <message>
assert_screen_not() {
  local unexpected="$1" msg="${2:-Screen should not contain: $1}"
  ((_TOTAL++)) || true
  if echo "$_SCREEN" | grep -qF "$unexpected"; then
    ((_FAIL++)) || true
    echo "  ${_RED}FAIL${_RESET} $msg"
  else
    ((_PASS++)) || true
    echo "  ${_GREEN}PASS${_RESET} $msg"
  fi
}

# ── Summary ──

# Print summary and exit with appropriate code.
tmux_summary() {
  tmux_stop
  echo ""
  echo "═══ $_PASS pass, $_FAIL fail (of $_TOTAL) ═══"
  [ "$_FAIL" -eq 0 ]
}
```

- [ ] **Step 2: Verify the helper is valid bash**

Run: `bash -n tests/e2e/lib.sh && echo "Syntax OK"`
Expected: "Syntax OK"

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/lib.sh
git commit -m "test(e2e): add tmux E2E helper library

Provides tmux_start/stop, tmux_key/raw, tmux_capture, assert_screen,
and tmux_summary for writing tmux-based E2E smoke tests."
```

---

## Task 6: tmux E2E smoke test + visual capture for all 8 demos

**Files:**
- Create: `tests/e2e/smoke-test.sh` (sequential: text assertions + HTML artifacts per demo)
- Create: `tests/e2e/capture-demos.sh` (parallel: visual HTML capture of all 8 demos + index page)

> **Status:** IMPLEMENTED. Both scripts are in the repo and verified (25/25 assertions pass).
> The original plan assumed a combined `tui-cli-widgets-demo.ts` with mode keys 1-8.
> That file was split into 8 individual demos. The smoke test now launches each demo
> separately: `bun run examples/tui-conversation-demo.ts`, etc.

- [ ] **Step 1: Write the smoke test**

Create `tests/e2e/smoke-test.sh`:

```bash
#!/usr/bin/env bash
# ════════════════════════════════════════════════════
#  Flitter CLI Widgets Demo — tmux E2E Smoke Test
#
#  Launches tui-cli-widgets-demo.ts in tmux and verifies
#  all 8 modes render correctly with basic interaction.
#
#  Usage: bash tests/e2e/smoke-test.sh
#  Requirements: tmux, bun
# ════════════════════════════════════════════════════

cd "$(dirname "$0")/../.." || exit 1
source tests/e2e/lib.sh

SESSION="flitter-smoke-$$"
APP="examples/tui-conversation-demo.ts"  # NOTE: demos are now split into individual files

echo "Flitter E2E Smoke Test"
echo "──────────────────────"

# ── Launch ──
tmux_start "$SESSION" "bun run $APP" 120 30

# ════════════════════════════════════════════════════
#  Mode 1: ConversationView (default)
# ════════════════════════════════════════════════════
echo ""
echo "Mode 1: ConversationView"

tmux_capture
assert_screen "Flitter CLI Widgets Demo" "Title bar rendered"
assert_screen "1:Conversation" "Mode tab visible"
assert_screen "Press 1-8" "Hint line visible"

# ════════════════════════════════════════════════════
#  Mode 2: ApprovalWidget
# ════════════════════════════════════════════════════
echo ""
echo "Mode 2: ApprovalWidget"

tmux_key '2'
tmux_capture
assert_screen "Approval Widget Demo" "Mode 2 title"
assert_screen "Request 1 of 3" "Request counter"
assert_screen "Approve" "Approve option visible"

# ════════════════════════════════════════════════════
#  Mode 3: StatusBar cycling
# ════════════════════════════════════════════════════
echo ""
echo "Mode 3: StatusBar"

tmux_key '3'
tmux_capture
assert_screen "StatusBar State Cycling Demo" "Mode 3 title"
assert_screen "claude-opus-4-6" "Model name in status bar"

# Wait for cycling
sleep 3
tmux_capture
assert_screen "Scenario" "Scenario counter visible"

# ════════════════════════════════════════════════════
#  Mode 4: ToastOverlay
# ════════════════════════════════════════════════════
echo ""
echo "Mode 4: ToastOverlay"

tmux_key '4'
tmux_capture
assert_screen "Toast Overlay Demo" "Mode 4 title"
assert_screen "Toasts fired: 0" "Initial counter"

# Fire a toast
tmux_key 't'
tmux_capture
assert_screen "Toasts fired: 1" "Counter incremented"

# ════════════════════════════════════════════════════
#  Mode 5: ErrorDialog
# ════════════════════════════════════════════════════
echo ""
echo "Mode 5: ErrorDialog"

tmux_key '5'
sleep 1
tmux_capture
assert_screen "API Rate Limit Exceeded" "Error dialog shown"

# Dismiss with Escape
tmux_key Escape
sleep 0.5
tmux_capture
assert_screen "ErrorDialog Demo" "Dialog dismissed, mode 5 content visible"

# Re-show with 'e'
tmux_key 'e'
sleep 0.5
tmux_capture
assert_screen "API Rate Limit" "Error dialog re-shown"

# Dismiss with Enter
tmux_key Enter
sleep 0.5
tmux_capture
assert_screen "ErrorDialog Demo" "Dialog dismissed with Enter"

# ════════════════════════════════════════════════════
#  Mode 6: BrailleSpinner
# ════════════════════════════════════════════════════
echo ""
echo "Mode 6: BrailleSpinner"

tmux_key '6'
tmux_capture
assert_screen "BrailleSpinner" "Mode 6 title"
assert_screen "Braille:" "Braille character label"
assert_screen "Cells:" "Cell state display"
assert_screen "Gen:" "Generation counter"

# ════════════════════════════════════════════════════
#  Mode 7: DiffWidget
# ════════════════════════════════════════════════════
echo ""
echo "Mode 7: DiffWidget"

tmux_key '7'
tmux_capture
assert_screen "DiffWidget" "Mode 7 title"
assert_screen "Showing 1 of 3" "Diff counter"

# Cycle to next diff
tmux_key 'd'
tmux_capture
assert_screen "Showing 2 of 3" "Cycled to diff 2"

# ════════════════════════════════════════════════════
#  Mode 8: CostTracker
# ════════════════════════════════════════════════════
echo ""
echo "Mode 8: CostTracker"

tmux_key '8'
tmux_capture
assert_screen "SessionCostTracker" "Mode 8 title"
assert_screen "Inference turns:    0" "Initial turn count"

# Simulate inference
tmux_key 'i'
tmux_capture
assert_screen "Inference turns:    1" "Turn count incremented"

# Clear
tmux_key 'c'
tmux_capture
assert_screen "Inference turns:    0" "Turn count reset after clear"

# ════════════════════════════════════════════════════
#  Quit
# ════════════════════════════════════════════════════
echo ""
echo "Cleanup: quit"

tmux_key 'q'
sleep 1

# ── Summary ──
tmux_summary
```

- [ ] **Step 2: Make executable and run**

Run: `chmod +x tests/e2e/smoke-test.sh && bash tests/e2e/smoke-test.sh`
Expected: All assertions PASS, exits with code 0

- [ ] **Step 3: Fix any failures discovered during the smoke test run**

If any assertions fail, investigate via `/tmp/flitter-smoke-$$-stderr.log` and fix the root cause. Re-run until all pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/smoke-test.sh
chmod +x tests/e2e/smoke-test.sh
git commit -m "test(e2e): add tmux smoke test for all 8 CLI widget modes

Launches each split demo (tui-*-demo.ts) individually in tmux and verifies:
- Mode 1: ConversationView title, tabs, hints
- Mode 2: ApprovalWidget options, request counter
- Mode 3: StatusBar cycling, model name
- Mode 4: ToastOverlay fire and counter
- Mode 5: ErrorDialog show/dismiss/re-show
- Mode 6: BrailleSpinner animation labels
- Mode 7: DiffWidget rendering and cycling
- Mode 8: CostTracker simulation and reset"
```

---

## Task 7: Run full test suite and verify no regressions

**Files:**
- (no new files)

- [ ] **Step 1: Run all Layer 1 integration tests**

Run: `npx tsx --test packages/tui/src/test-utils/render-to-screen.test.ts packages/cli/src/widgets/status-bar.integration.test.ts packages/cli/src/widgets/input-field.integration.test.ts packages/cli/src/widgets/approval-widget.integration.test.ts`
Expected: All PASS

- [ ] **Step 2: Run existing unit tests to check for regressions**

Run: `bun test`
Expected: All PASS (no regressions from new code)

- [ ] **Step 3: Run Layer 2 smoke test**

Run: `bash tests/e2e/smoke-test.sh`
Expected: All PASS

- [ ] **Step 4: Final commit with all files**

```bash
git status
# Verify only expected files are changed/added
# If any unstaged files remain, stage and commit
```
