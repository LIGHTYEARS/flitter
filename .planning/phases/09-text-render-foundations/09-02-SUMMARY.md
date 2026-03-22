---
phase: "09"
plan: "02"
subsystem: "core/text-span"
tags: [text-span, hyperlink, onClick, equals, tdd, osc8]
dependency-graph:
  requires: [TextStyle.equals]
  provides: [TextSpan.hyperlink, TextSpan.onClick, TextSpan.equals, TextSpanHyperlink]
  affects: [widgets/text, scheduler/paint-context, terminal/renderer]
tech-stack:
  added: []
  patterns: [property-inheritance-through-tree, deep-structural-equality, osc8-hyperlinks]
key-files:
  created: []
  modified:
    - src/core/text-span.ts
    - src/core/__tests__/text-span.test.ts
    - src/index.ts
decisions:
  - "TextSpanHyperlink is a readonly interface with uri and optional id, matching OSC 8 parameter structure"
  - "visitChildren propagates hyperlink and onClick as additional optional parameters (backward compatible)"
  - "equals() compares onClick by reference identity, not structural equality (functions cannot be structurally compared)"
metrics:
  duration: "220s"
  completed: "2026-03-22"
  tasks_completed: 3
  tasks_total: 3
  tests_added: 27
  tests_total: 1615
requirements: [TEXT-03, TEXT-04, TEXT-05]
---

# Phase 9 Plan 2: TextSpan Enhancements Summary

TextSpan extended with OSC 8 hyperlink property, onClick callback, and deep structural equals() comparison, all propagated through visitChildren tree traversal.

## What Was Done

### Task 1: Failing Tests (RED)
Added 27 failing tests covering:
- 7 tests for hyperlink property and visitChildren propagation
- 6 tests for onClick property and visitChildren propagation
- 14 tests for equals() deep structural comparison (text, style, hyperlink, onClick, children recursion)

**Commit:** `cb32486` — `test(09-02): add failing tests for TextSpan hyperlink, onClick, and equals`

### Task 2: Implementation (GREEN)
Implemented all three features in `text-span.ts`:

1. **TextSpanHyperlink interface** — `{ uri: string; id?: string }` for OSC 8 terminal hyperlinks
2. **TextSpan.hyperlink** — Optional readonly property, passed through constructor, propagated through visitChildren with parent inheritance (child overrides parent)
3. **TextSpan.onClick** — Optional readonly callback property, propagated through visitChildren with same inheritance semantics
4. **TextSpan.equals()** — Deep structural comparison: text (===), style (TextStyle.equals), hyperlink (field-by-field), onClick (reference identity ===), children (length + recursive equals)
5. **visitChildren extended** — Now accepts and propagates `parentHyperlink` and `parentOnClick` parameters, fully backward compatible (existing callers with 2 params still work)

**Commit:** `04a3fd2` — `feat(09-02): implement TextSpan hyperlink, onClick, and equals`

### Task 3: Public API Export
Exported `TextSpanHyperlink` type from `src/index.ts` for downstream consumers.

**Commit:** `356bfe3` — `chore(09-02): export TextSpanHyperlink type from public API`

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- All 1615 tests pass (27 new, 0 failures)
- visitChildren backward compatible (existing callers in text.ts, paint-context.ts unchanged)
- TextSpanHyperlink exported from public API

## Known Stubs

None - all features are fully wired with no placeholder data.

## Self-Check: PASSED

- All key files exist: text-span.ts, text-span.test.ts, index.ts, 09-02-SUMMARY.md
- All commits verified: cb32486, 04a3fd2, 356bfe3
- Full test suite: 1615 pass, 0 fail
