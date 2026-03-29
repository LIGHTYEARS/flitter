# Flitter Test Infrastructure Analysis

## 1. Test Runner and Configuration

Both packages (`flitter-core` and `flitter-amp`) use **Bun's built-in test runner** (`bun test`).
The `package.json` scripts for both packages are identical:

```json
"test": "bun test"
```

There is no `bunfig.toml` anywhere in the repository, meaning the runner operates on Bun's
defaults: automatic discovery of `*.test.ts` files, TypeScript compilation with Bun's built-in
transpiler, and no special preprocessing or plugin configuration.

All test files import directly from `bun:test`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
```

The `flitter-core` package has a minimal `test/setup.ts` file that re-exports `bun:test`
primitives for convenience, but in practice every test file imports `bun:test` directly and
`setup.ts` is not actively consumed.

The `FrameScheduler` (the singleton 60fps event-loop driver) detects `BUN_TEST=1` in the
environment to disable frame pacing. This causes `setImmediate`-based execution rather than
real vsync/timer scheduling, making tests fully deterministic. Tests call
`FrameScheduler.instance.disableFramePacing()` explicitly in `beforeEach` as a belt-and-
suspenders safeguard.

### Test counts

| Package | Test files | Approximate subsystems covered |
|---------|-----------|-------------------------------|
| `flitter-core` | 75 `.test.ts` files | core types, framework, scheduler, terminal, input, layout, widgets, diagnostics, examples |
| `flitter-amp` | 8 `.test.ts` files | app layout, chat view, markdown rendering, tool card layout, layout guardrails, visual snapshots, cell-level assertions, logger |

---

## 2. Visual/Snapshot Testing Approach

Flitter implements a two-tier visual testing system that is notably original:

### Tier 1: SVG Termshot Snapshots (`visual-snapshot.test.ts`)

The test harness renders the full `App` widget tree headlessly into a `ScreenBuffer`, then
converts the character grid into an SVG document via `captureToSvg()`. The SVG files are
written to `__snapshots__/` and can be opened in any browser for human inspection.

```
test flow:  AppState -> App widget -> captureToSvg() -> SVG file
```

This is **not** a diffing snapshot system (like Jest snapshots). Instead, SVG files are
generated artifacts that serve as human-reviewable visual regression baselines. The test
assertions are minimal (`expect(svg).toContain('<svg')`) -- the value is in the visual
artifacts, not automated diff.

25 SVG snapshot files cover scenarios including:
- Welcome screen at 120x40 and 80x24
- Conversation with markdown content
- Streaming responses (in-progress)
- Wide terminal (200x50)
- Expanded and collapsed thinking blocks
- Tool call cards (Read, Bash, Grep, edit_file, todo_write)
- Plan view with mixed statuses
- Error states
- Token usage display
- Three theme variants (light, catppuccin-mocha, solarized-dark)
- Complex multi-turn conversation (thinking + tools + responses)

The `termshot.ts` module implements the SVG renderer. It converts a `Cell[][]` grid into
`<rect>` elements for backgrounds and `<text>` elements for characters, respecting bold,
italic, dim, underline, strikethrough, and full 24-bit foreground/background colors. It
includes a configurable `SvgConfig` with font family, cell dimensions, padding, and default
colors. Each `Cell` is rendered individually with accurate positioning.

### Tier 2: Cell-Level Assertions (`visual-cell-assertions.test.ts`)

This is the more rigorous automated layer. Rather than SVG screenshots, tests render into a
`Grid` data structure (via `captureToGrid()`) and then assert on individual cells:

```typescript
const pos = findTextOnce(grid, 'Welcome to Amp');
assertStyleRange(grid, pos.x, pos.y, 'Welcome to Amp'.length, { bold: true });
```

The `grid-helpers.ts` module provides search and assertion functions:

| Helper | Purpose |
|--------|---------|
| `findText(grid, text)` | Find all (x,y) positions where text appears |
| `findTextOnce(grid, text)` | Find exactly one occurrence (assertion) |
| `findRow(grid, text)` | Find which row contains text |
| `readRow(grid, row)` | Read all characters from a row as a string |
| `readScreenText(grid)` | Read all rows as string array |
| `assertStyleAt(grid, x, y, style)` | Assert style at a single cell |
| `assertStyleRange(grid, x, y, len, style)` | Assert style over a range |
| `assertRowContains(grid, row, text)` | Assert row contains substring |
| `countNonBlankRows(grid)` | Count rows with content |

Style assertions support: `bold`, `italic`, `dim`, `underline`, `strikethrough`, and `fg`
(as a `Color` instance with RGB comparison).

Tests verify specific rendering invariants such as:
- "Welcome to Amp" is rendered in bold
- Keybind hints use the correct theme colors (info blue, warning yellow)
- The daily quote is italic
- "You" header is bold with success green
- User messages are italic
- Markdown `**bold**` renders with the bold attribute
- Completed tool calls show a green checkmark
- Failed tool calls show a red X
- Streaming thinking shows an accent-colored bullet indicator
- Status bar shows cwd, git branch, and mode indicator

---

## 3. Mock Platform and Headless Rendering

### MockPlatform (`flitter-core/src/terminal/platform.ts`)

The `PlatformAdapter` is an abstract class defining the OS-level terminal interface. The
`MockPlatform` is a concrete implementation designed for testing:

```typescript
class MockPlatform extends PlatformAdapter {
  rawMode = false;
  altScreen = false;
  written: string[] = [];
  // ...
}
```

It tracks state transitions (raw mode, alt screen, cursor visibility, mouse protocols) as
boolean flags and captures all stdout writes into an array. Key capabilities:

- **Write capture**: `writeStdout()` appends to `written[]`, retrievable via `getOutput()`
- **Size control**: `setSize(cols, rows)` + `getTerminalSize()` for testing different terminal dimensions
- **Resize simulation**: `simulateResize(cols, rows)` triggers the registered `onResize` callback
- **Input injection**: `simulateInput(data)` feeds raw bytes into the registered `onData` callback
- **Capability detection**: `detectCapabilities()` returns configurable terminal capability flags

### Headless Rendering Pipeline (`capture.ts`)

The `captureToGrid()` and `captureToSvg()` functions implement a complete headless rendering
pipeline:

1. Create a `MockPlatform` with the requested terminal dimensions
2. Instantiate `WidgetsBinding` (the root binding, equivalent to Amp's `J3`)
3. Mount the widget tree via `runApp()`
4. Execute one full frame synchronously (build -> layout -> paint -> render)
5. Extract the `ScreenBuffer` cell grid
6. Return either a `Grid` (for cell assertions) or convert to SVG (for visual snapshots)

This is the same pipeline used in production, with the real terminal replaced by
`MockPlatform`. No mocking of intermediate layers is needed because the framework is
designed to be platform-agnostic at the `PlatformAdapter` boundary.

### TmuxHarness (`tmux-harness.ts`)

A supplementary utility that wraps a real tmux session for integration-level testing. It can
launch the flitter app inside a tmux pane, capture the pane content, send keystrokes, and
compare actual terminal output. This is the highest-fidelity testing path but requires a tmux
installation and is not part of the standard `bun test` suite.

---

## 4. Test Utility Functions and Helpers

### `flushImmediate` and `flushFrames` (FrameScheduler tests)

```typescript
function flushImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function flushFrames(ticks: number = 3): Promise<void> {
  for (let i = 0; i < ticks; i++) {
    await flushImmediate();
  }
}
```

These helpers drain the event loop to allow `setImmediate`-scheduled frames to complete. The
tick count is configurable for scenarios that re-schedule frames (e.g., `requestFrame` during
frame execution requires extra ticks).

### `GreedyBox` and `FixedSizeBox` (Layout tests)

Minimal `RenderBox` subclasses used across layout tests:

- `GreedyBox` -- takes the maximum size allowed by constraints
- `FixedSizeBox(w, h)` -- takes a fixed desired size, clamped by constraints

These replace the need for real widget trees when testing the render object layout algorithm
directly.

### `TextRenderBox` and `TextLeafWidget` (Pipeline integration)

Custom render objects that paint actual text into the `ScreenBuffer`, used to verify the full
`setState -> markNeedsRebuild -> scheduleBuildFor -> buildScopes -> layout -> paint -> render`
pipeline end-to-end.

### Singleton Reset Pattern

Every test that touches the framework singletons uses a consistent cleanup pattern:

```typescript
beforeEach(() => {
  WidgetsBinding.reset();
  FrameScheduler.reset();
});
afterEach(() => {
  WidgetsBinding.reset();
  FrameScheduler.reset();
});
```

Some tests also reset `FocusManager` and `BuildOwner`. The `.reset()` methods clear the
singleton instances, all registered callbacks, and internal state. This ensures complete
isolation between tests.

### `parseEvents` / `parseSingleEvent` / `parseKeyEvent` (Input tests)

Convenience wrappers for the `InputParser` state machine that feed raw escape sequences and
collect parsed `InputEvent` objects:

```typescript
function parseEvents(data: string): InputEvent[] {
  const events: InputEvent[] = [];
  const parser = new InputParser((event) => events.push(event));
  parser.feed(data);
  parser.dispose();
  return events;
}
```

---

## 5. Coverage of Different Subsystems

### Core Types (`src/core/__tests__/`)
7 test files covering: `BoxConstraints`, `Color`, color alpha handling, `Key`, `TextSpan`,
`TextStyle`, and basic types (`Offset`, `Size`, `Rect`). These are pure data structure tests
with no framework dependencies.

### Framework (`src/framework/__tests__/`)
8 test files covering: `Element` lifecycle (mount, update, unmount, reconciliation),
`BuildOwner` (dirty scheduling, build scopes), `PipelineOwner` (layout + paint orchestration),
`WidgetsBinding` (runApp, singleton wiring, frame orchestration), `Widget` base classes,
`Listenable` (value notifier pattern), full pipeline integration (setState through render),
and binding enhancements.

### Scheduler (`src/scheduler/__tests__/`)
4 test files: `FrameScheduler` (phase ordering, coalescing, priority, error isolation, stats),
`PaintContext` (cell painting, style application, clipping), `ClipCanvas` (clipping regions),
and scheduler integration tests.

### Terminal (`src/terminal/__tests__/`)
10 test files: `ScreenBuffer` (cell allocation, dirty tracking, double buffering), ANSI
parser, `Cell` structure, `Platform` (MockPlatform), renderer (ANSI output generation),
renderer fallback, screen buffer enhancements, terminal manager, terminal protocols, and
minor fidelity tests.

### Input (`src/input/__tests__/`)
9 test files: `InputParser` (escape sequence state machine -- the most comprehensive test file
with tests for printable chars, control chars, arrow keys, function keys, mouse events, paste
bracketing, modifier combinations), `EventDispatcher`, keyboard shortcuts, focus management,
mouse cursors, mouse manager, mouse hit testing, binding-mouse wiring, and event types.

### Layout (`src/layout/__tests__/`)
5 test files: `RenderFlex` (the core flex layout engine), `EdgeInsets`, parent data,
`RenderConstrained`, `RenderDecorated`, `RenderPadded`, and layout helpers.

### Widgets (`src/widgets/__tests__/`)
25 test files covering: flex widgets (Column/Row), leaf widgets (Text, SizedBox), container
with overlays, scroll view, scrollbar, scroll controller, markdown parsing, text field,
dialog, diff view, theme, app theme, clip rect, focus scope, hover context, image preview,
interactive widgets, intrinsic height, media query, render text interaction, render text
selection, selection list, syntax highlighting, collapsible drawer, and scroll stack builder.

### Diagnostics (`src/diagnostics/__tests__/`)
2 test files: debug inspector and diagnostics utilities.

### Examples (`examples/__tests__/`)
3 test files: smoke tests verifying example applications can be imported, widget trees
constructed, and `runApp()` called without errors.

### Flitter-Amp Application (`flitter-amp/src/__tests__/`)
8 test files: app layout constraint chain, chat view structure, markdown rendering invariants,
tool card layout (crossAxisAlignment verification), layout guardrails (regression tests for
known bugs), visual snapshots (SVG generation), visual cell assertions (pixel-level style
verification), and logger process tests.

---

## 6. How Widget Tests Work Without a Real Terminal

The architecture achieves terminalless testing through three mechanisms:

### Mechanism 1: Widget Tree Inspection (No Rendering)

Many widget tests directly call `widget.build(context)` on `StatelessWidget` instances and
inspect the returned widget tree structure. This bypasses the entire element/render pipeline:

```typescript
const md = new Markdown({ markdown: 'Hello' });
const widget = md.build({} as any);  // mock context
expect(widget.constructor.name).toBe('Column');
```

This works for verifying widget composition (which children, what properties) but cannot
verify rendering output.

### Mechanism 2: Render Object Layout (No Terminal)

Layout tests operate directly on `RenderBox` subclasses, calling `layout(constraints)` and
inspecting the resulting `size` and child positions. The render layer is completely
independent of the terminal layer:

```typescript
const flex = new RenderFlex({ direction: 'vertical', crossAxisAlignment: 'stretch' });
flex.insert(new GreedyBox());
flex.layout(new BoxConstraints({ minWidth: 0, maxWidth: 120, minHeight: 0, maxHeight: 40 }));
expect(flex.size.width).toBe(120);
```

### Mechanism 3: Full Headless Pipeline (MockPlatform)

For end-to-end testing, the `captureToGrid()` function runs the complete rendering pipeline
with `MockPlatform` substituted for the real terminal:

1. `MockPlatform` is created with configurable dimensions
2. `WidgetsBinding` initializes using this mock platform
3. The widget tree builds, lays out, paints, and renders to a `ScreenBuffer`
4. The `ScreenBuffer` cells are read directly (no stdout parsing needed)

The `ScreenBuffer` is the in-memory grid of `Cell` objects that the renderer would normally
diff and emit as ANSI sequences. In test mode, we skip the ANSI emission and read the cells
directly. This means tests verify the actual painted output (character + style at each
position) without needing to parse ANSI escape sequences back.

---

## 7. Test Patterns and Conventions

### Pattern: Nested `describe` Blocks with Section Comments

Tests consistently use visual separators and numbered sections:

```typescript
// ═══════════════════════════════════════════════════════════
//  1. Welcome Screen
// ═══════════════════════════════════════════════════════════
describe('Welcome Screen', () => { ... });
```

or dashed separators:

```typescript
// -----------------------------------------------------------------------
// 4. Phase execution order
// -----------------------------------------------------------------------
describe('phase execution order', () => { ... });
```

### Pattern: Amp Reference Comments

Every test file references the original Amp binary identifiers:

```typescript
// Amp ref: c9 (FrameScheduler), oJ (Phase), amp-strings.txt:530126
// Amp ref: xD widget -- body columns use stretch to fill available width
// Amp ref: $uH (thread view), Sa (user msg), XkL (assistant msg)
```

This maintains traceability between the test suite and the reverse-engineered Amp source.

### Pattern: Singleton Reset Discipline

All framework-touching tests follow the before/after reset convention. This is critical
because the framework uses singletons (`WidgetsBinding`, `FrameScheduler`, `BuildOwner`,
`FocusManager`) that would leak state between tests.

### Pattern: TDD-First with Reference Compliance

Tests are explicitly labeled as "TDD tests" and written to match the Amp specification:

```typescript
// App layout TDD tests -- verifies the full constraint chain from terminal -> root -> children
// Ref: .planning/WIDGET-TREE-SKELETON.md
```

The `CLAUDE.md` project instructions mandate >80% coverage and TDD (write tests before
implementation).

### Pattern: Multi-Level Testing (Unit -> Integration -> Visual)

Each subsystem is tested at appropriate levels:
- **Unit**: Pure data structures (BoxConstraints, Color, Size)
- **Integration**: Cross-subsystem flow (setState -> build -> layout -> paint -> ScreenBuffer)
- **Visual**: Full app rendering (SVG snapshots + cell-level assertions)

### Pattern: Test Helper Reuse via `GreedyBox`/`FixedSizeBox`

Rather than building full widget trees for layout tests, minimal `RenderBox` subclasses
simulate children with known sizing behavior. This isolates layout algorithm testing from
widget-level complexity.

### Pattern: Theme Color Constants for Assertion

Visual tests define theme color constants matching the production theme:

```typescript
const SUCCESS = Color.rgb(43, 161, 43);
const INFO = Color.rgb(66, 161, 255);
const WARNING = Color.rgb(255, 183, 27);
```

These are used in `assertStyleAt()` calls for precise color verification.

### Pattern: Source File Assertion as Fallback

When a widget is a `StatefulWidget` and cannot be unit-tested via `build()` (because it
requires a full element tree), tests fall back to source file assertion:

```typescript
it('HandoffTool uses stretch (StatefulWidget -- verified via grep)', () => {
  const src = fs.readFileSync(require.resolve('../widgets/tool-call/handoff-tool.ts'), 'utf8');
  expect(src).toContain("crossAxisAlignment: 'stretch'");
  expect(src).not.toContain("crossAxisAlignment: 'start'");
});
```

---

## 8. Code Quality of the Test Suite

### Strengths

1. **Comprehensive coverage breadth**: 83 test files across 10+ subsystem directories, covering
   primitives through full-app visual rendering. The combination of unit, integration, and visual
   testing layers provides defense in depth.

2. **Headless rendering is first-class**: The `captureToGrid()` / `captureToSvg()` pipeline
   is architecturally clean, reusing production code paths with only the platform adapter
   swapped. There is no separate "test renderer" with its own bugs.

3. **Cell-level assertion library**: The `grid-helpers.ts` module is a well-designed API for
   terminal UI testing -- `findText`, `assertStyleAt`, `assertStyleRange` provide the
   equivalent of CSS selector assertions for a character grid.

4. **SVG visual snapshots**: Converting rendered grids to SVG is an inventive approach that
   produces browser-viewable artifacts. Developers can visually inspect rendering without
   running the app in a real terminal.

5. **Deterministic async handling**: The `flushImmediate`/`flushFrames` pattern combined with
   `disableFramePacing()` eliminates timing flakiness in scheduler tests.

6. **Strong isolation**: Consistent singleton reset in before/after hooks prevents state
   leakage. No global mocks or monkey-patching that could cause ordering-dependent failures.

7. **Reference traceability**: Amp reference comments in every test file link back to the
   reverse-engineered source, making it clear what behavior each test validates.

8. **Regression guards**: Tests like `layout-guardrails.test.ts` explicitly document known
   bugs and their root causes, with test cases that prevent regression.

### Weaknesses

1. **SVG snapshots are not auto-diffed**: The visual snapshots are write-only artifacts.
   There is no automated comparison against baseline SVGs. A rendering regression that changes
   pixel output will not fail the test -- only the minimal `expect(svg).toContain('<svg')`
   check runs. The cell-level assertions partially compensate but cover only specific elements.

2. **Source file assertions are fragile**: Testing widget properties by reading source code
   strings (`expect(src).toContain(...)`) is brittle. Any code formatting change could break
   these tests without actual behavior change.

3. **No explicit coverage reporting**: The CLAUDE.md mandates >80% coverage but there is no
   coverage configuration (no `--coverage` flag, no lcov setup, no CI gate). Coverage compliance
   is aspirational rather than enforced.

4. **Limited negative/error path testing**: Most widget tests verify the happy path. Error
   states (malformed input, constraint violations, concurrent mutation) receive less coverage
   relative to the positive cases.

5. **flitter-amp test count is low**: 8 test files for the application layer versus 75 for
   the core suggests the application-level coverage could be deeper, particularly for
   interactive flows (keyboard navigation, scrolling, focus transitions).

6. **No `WidgetTester` / `pump()` utility**: The CLAUDE.md mentions `WidgetTester`,
   `TestTerminal`, and `pump()` helpers for widget tests, but these do not appear in the
   codebase. The headless pipeline (`captureToGrid`) partially fills this role, but there is
   no convenience API for simulating user interactions (keystrokes, focus changes) within a
   test.

7. **TmuxHarness is not integrated**: The `tmux-harness.ts` exists but is not used by any
   test file in the standard suite. It represents a higher-fidelity testing path that is
   currently dormant.

### Overall Assessment

The test infrastructure is above average for a TUI framework project. The architecture makes
the right fundamental decision: the platform abstraction layer (`PlatformAdapter` /
`MockPlatform`) is clean enough that the entire rendering pipeline can run headlessly with
minimal mocking. The cell-level assertion library and SVG snapshot generation are custom
innovations that demonstrate thoughtful test design. The main gaps are in automation (no
snapshot diffing, no coverage gates) and interaction testing (no keystroke simulation in the
standard test path).

---

## File References

### Test runner configuration
- `/home/gem/workspace/flitter/packages/flitter-core/package.json` (line 8: `"test": "bun test"`)
- `/home/gem/workspace/flitter/packages/flitter-amp/package.json` (line 12: `"test": "bun test"`)
- `/home/gem/workspace/flitter/packages/flitter-core/test/setup.ts` (minimal re-export)

### Visual testing utilities
- `/home/gem/workspace/flitter/packages/flitter-amp/src/test-utils/capture.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/test-utils/termshot.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/test-utils/grid-helpers.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/test-utils/tmux-harness.ts`

### Mock platform
- `/home/gem/workspace/flitter/packages/flitter-core/src/terminal/platform.ts` (contains `MockPlatform`)

### Representative test files
- `/home/gem/workspace/flitter/packages/flitter-core/src/scheduler/__tests__/frame-scheduler.test.ts`
- `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/pipeline-integration.test.ts`
- `/home/gem/workspace/flitter/packages/flitter-core/src/input/__tests__/input-parser.test.ts`
- `/home/gem/workspace/flitter/packages/flitter-core/src/widgets/__tests__/markdown.test.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/visual-snapshot.test.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/visual-cell-assertions.test.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/app-layout.test.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/tool-card-layout.test.ts`
- `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/layout-guardrails.test.ts`

### Snapshot artifacts
- `/home/gem/workspace/flitter/packages/flitter-amp/src/__tests__/__snapshots__/` (25 SVG files)
