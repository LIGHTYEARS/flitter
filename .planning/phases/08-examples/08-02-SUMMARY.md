---
phase: "08"
plan: "02"
subsystem: "examples"
tags: [examples, documentation, smoke-tests]
dependency-graph:
  requires: [core, framework, widgets, layout, input, scheduler]
  provides: [example-apps, usage-patterns]
  affects: []
tech-stack:
  added: []
  patterns: [StatefulWidget, FocusNode-keyboard, factory-functions]
key-files:
  created:
    - examples/counter.ts
    - examples/flex-layout.ts
    - examples/scroll-demo.ts
    - examples/__tests__/examples.test.ts
  modified: []
decisions:
  - "Used FocusNode directly in counter instead of FocusScope widget (not yet available as widget)"
  - "Used BUN_TEST env guard to prevent runApp side effects during import in tests"
  - "Used factory functions (buildFlexLayout, buildScrollDemo) for testable widget tree construction"
  - "TextStyle.foreground (not color) for text color per actual API"
metrics:
  duration: "5m 17s"
  completed: "2026-03-21T04:28:00Z"
  tests-added: 12
  tests-total: 1445
---

# Phase 8 Plan 2: Basic Example Applications Summary

Four example applications demonstrating flutter-tui widget APIs, layout system, state management, and input handling.

## One-liner

Four runnable example apps (hello-world, counter, flex-layout, scroll-demo) with 12 smoke tests exercising widget construction and runApp integration.

## What Was Built

### 1. hello-world.ts (pre-existing from 08-01)
The simplest possible app: Center + Text with styled TextSpan. Already committed in plan 08-01, verified unchanged.

### 2. counter.ts
A stateful counter demonstrating:
- **StatefulWidget + State**: CounterApp/CounterState with `count` state variable
- **Keyboard input**: FocusNode with onKey handler for ArrowUp/Down, +/-, r, q keys
- **Dynamic styling**: Color changes based on count value (green positive, red negative, white zero)
- **Column layout**: Title, count display, instructions in a centered vertical layout

### 3. flex-layout.ts
Comprehensive flex layout showcase demonstrating:
- **Equal Expanded children**: Three columns with equal flex
- **Flex ratios (1:2)**: Expanded with different flex factors
- **MainAxisAlignment**: spaceBetween and spaceEvenly via Row static factories
- **Nested layouts**: Column widgets inside Row with Expanded
- **DecoratedBox**: Border and background color on containers
- **Padding, Divider, SizedBox**: Spacing and visual separation

### 4. scroll-demo.ts
Scrollable content demonstration:
- **SingleChildScrollView**: Wrapping a Column with 50 generated items
- **Expanded**: ScrollView fills remaining vertical space
- **Dynamic generation**: Array.from with index-based content
- **Alternating colors**: 5-color cycle for visual distinction
- **Padding/Row per item**: Fixed-width index + content layout

### 5. Smoke Tests (examples/__tests__/examples.test.ts)
12 tests covering:
- Widget tree construction from each example
- Import without side effects (BUN_TEST guard)
- runApp integration (mount, verify isRunning, stop)
- StatefulWidget.createState for counter
- Factory function invocation for flex-layout and scroll-demo

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TextSpan constructor uses options object, not positional args**
- **Found during:** Task 1 (hello-world)
- **Issue:** Plan pseudocode used `new TextSpan('text', style)` but actual API is `new TextSpan({ text: '...', style: ... })`
- **Fix:** Used correct options-object constructor throughout all examples
- **Files modified:** All example files

**2. [Rule 1 - Bug] TextStyle uses `foreground` not `color` for text color**
- **Found during:** Task 1 (hello-world)
- **Issue:** Plan pseudocode used `color` property but actual TextStyle API uses `foreground`
- **Fix:** Used `foreground: Color.xxx` throughout all examples
- **Files modified:** All example files

**3. [Rule 2 - Missing] No FocusScope widget available for counter**
- **Found during:** Task 2 (counter)
- **Issue:** Plan suggested FocusScope widget which doesn't exist yet
- **Fix:** Used FocusNode directly with FocusManager.registerNode() for keyboard handling
- **Files modified:** examples/counter.ts

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| All | b7f2318 | feat(08-02): add basic example applications |

## Known Stubs

None. All examples are fully functional with real widget APIs.

## Self-Check: PASSED

- [x] examples/counter.ts exists
- [x] examples/flex-layout.ts exists
- [x] examples/scroll-demo.ts exists
- [x] examples/__tests__/examples.test.ts exists
- [x] examples/hello-world.ts exists (pre-existing)
- [x] Commit b7f2318 verified in git log
- [x] All 1445 tests pass (12 new + 1409 original + 24 other)
- [x] No regressions in existing test suite
