---
phase: 18-full-tool-workflow-parity
plan: 01
subsystem: ui
tags: [tool-call, raw-input, truncation, name-resolution, dispatch, infrastructure]

# Dependency graph
requires:
  - phase: 17
    provides: AppShell, overlay stack, shortcut registry
provides:
  - raw-input extraction utilities (asString, pickString, etc.)
  - truncation constants and helpers (tiered limits, truncateText)
  - tool-output-utils (extractOutputText, extractShellOutput, extractDiff, etc.)
  - resolve-tool-name dispatch (TOOL_NAME_MAP, resolveToolName, resolveToolDisplayName)
  - BaseToolProps interface for all tool renderers
  - barrel export at widgets/tool-call/index.ts
affects: [18-02, 18-03, 18-04, tool-call-widgets]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tool name normalization via TOOL_NAME_MAP lookup"
    - "Tiered truncation constants (HEADER/INPUT/PREVIEW/OUTPUT)"
    - "rawOutput-first extraction with content[] fallback"

key-files:
  created:
    - packages/flitter-cli/src/utils/raw-input.ts
    - packages/flitter-cli/src/widgets/tool-call/truncation-limits.ts
    - packages/flitter-cli/src/widgets/tool-call/tool-output-utils.ts
    - packages/flitter-cli/src/widgets/tool-call/resolve-tool-name.ts
    - packages/flitter-cli/src/widgets/tool-call/base-tool-props.ts
    - packages/flitter-cli/src/widgets/tool-call/index.ts
  modified: []

key-decisions:
  - "raw-input utilities live in src/utils/ — generic extraction helpers used beyond tool rendering"
  - "Tool-call widgets get their own subdirectory (src/widgets/tool-call/) mirroring flitter-amp structure"
  - "TOOL_NAME_MAP copied in full — all 30+ entries including Coco ACP variants for graceful fallback rendering"
  - "No theme references in infrastructure — all utility code is theme-independent"

patterns-established:
  - "Import ToolCallItem from state/types (not acp/types) in flitter-cli"
  - "Import raw-input helpers from utils/raw-input for all tool renderers"
  - "Use truncation-limits constants instead of hard-coded numeric literals"

requirements-completed: [TOOL-01, TOOL-05]

# Metrics
duration: 9min
completed: 2026-04-03
---

# Phase 18 Plan 01: Tool Infrastructure Summary

**Port tool dispatch infrastructure (name resolution, output extraction, truncation, BaseToolProps) from flitter-amp to flitter-cli as pure utility modules with adapted imports**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-03T14:20:43Z
- **Completed:** 2026-04-03T14:29:43Z
- **Tasks:** 6
- **Files created:** 6

## Accomplishments
- Ported all raw-input extraction utilities (10 functions) as zero-dependency pure functions
- Ported tiered truncation constants and helpers (6 constants, 2 functions)
- Ported tool-output-utils with 8 extraction functions adapted to flitter-cli types
- Ported resolve-tool-name with TOOL_NAME_MAP (30+ entries) and 5 dispatch functions
- Ported BaseToolProps interface as the shared contract for all tool renderers
- Created barrel export aggregating all infrastructure modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Port raw-input utilities** - `e8e2f24` (feat)
2. **Task 2: Port truncation-limits** - `d6c040b` (feat)
3. **Task 3: Port tool-output-utils** - `5bdc01b` (feat)
4. **Task 4: Port resolve-tool-name** - `07e4a75` (feat)
5. **Task 5: Port BaseToolProps** - `26d031e` (feat)
6. **Task 6: Create barrel export** - `e21312f` (feat)

## Files Created/Modified
- `packages/flitter-cli/src/utils/raw-input.ts` - Type-safe extraction helpers (asString, pickString, isRecord, extractContentText, etc.)
- `packages/flitter-cli/src/widgets/tool-call/truncation-limits.ts` - Tiered truncation constants and truncateText/truncateInline helpers
- `packages/flitter-cli/src/widgets/tool-call/tool-output-utils.ts` - Output extraction (extractOutputText, extractShellOutput, extractDiff, extractRawNumber, etc.)
- `packages/flitter-cli/src/widgets/tool-call/resolve-tool-name.ts` - TOOL_NAME_MAP, resolveToolName, resolveToolDisplayName, setCwd, shortenPath, extractTitleDetail
- `packages/flitter-cli/src/widgets/tool-call/base-tool-props.ts` - BaseToolProps interface with ToolCallItem re-export
- `packages/flitter-cli/src/widgets/tool-call/index.ts` - Barrel export for all infrastructure modules

## Decisions Made
- raw-input utilities placed in `src/utils/` not `src/widgets/tool-call/` — they are generic helpers used beyond tool rendering
- Tool-call widgets get their own subdirectory mirroring flitter-amp for easy cross-reference
- TOOL_NAME_MAP copied in full (30+ entries) for graceful fallback rendering of any tool name
- No theme references in this plan — all utility code is theme-independent (themes in Plans 18-02/03)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tool infrastructure foundation complete, ready for Plan 18-02 (ToolHeader + ToolStatusIcon widgets)
- All imports verified: ToolCallItem from state/types, raw-input from utils/, truncation from widgets/tool-call/
- TypeScript compilation passes for all new files (305 existing tests pass, 0 failures)

---
*Phase: 18-full-tool-workflow-parity*
*Completed: 2026-04-03*
