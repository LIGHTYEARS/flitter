# Phase 34 Context — Activity Group and Subagent Tree

## Requirements

| ID | Description | Status |
|----|-------------|--------|
| ACTV-01 | Activity Group uses collapsible G1R component with expand/collapse animation | Pending |
| ACTV-02 | Collapsed Activity Group displays summary aggregation (checkmark/x count) | Pending |
| ACTV-03 | Subagent nesting uses tree-line characters (branch/leaf/vertical) for visual hierarchy | Pending |
| ACTV-04 | Streaming shows inline subagent messages with name label and progress | Pending |
| ACTV-05 | Subagent tool card uses "Task" label prefix matching AMP | Pending |

## AMP Source Analysis (z1R / G1R)

### G1R (StatefulWidget)
- `G1R extends FT` (StatefulWidget) with `props: { group: ActivityGroup }`
- Creates state: `z1R`

### z1R (State) — Key Fields
- `expanded: boolean` — collapse/expand state (default: false = collapsed)
- `actionExpanded: Map<number, boolean>` — per-action expand state
- `visibleActionCount: number` — animated progressive reveal
- `_spinner: BrailleSpinner` — animated braille spinner for active state
- `_animationTimer: interval` — 200ms spinner step
- `_pendingAppendTimer: timeout` — 90ms staggered action reveal

### z1R State Machine
- `_isActive`: group.hasInProgress
- On active: start spinner animation (200ms interval), schedule staggered appends (90ms per action)
- On inactive: stop animation, clear timers, show all actions immediately

### z1R.build() — Render Structure

**Header line:**
- Active: `"{spinner.toBraille()} " [toolRunning color]` 
- Inactive: `"✓ " [toolSuccess color]`
- Then summary text: `"N ✓ | M ✗"` format with green checkmarks and red crosses
- Followed by expand/collapse chevron (▼ expanded / ▶ collapsed)

**Expanded body (tree-lines):**
- Each action rendered as a tree node
- Branch character: `├── ` (dim) for non-last items
- Leaf character: `╰── ` (dim) for last item  
- Vertical continuation: `│   ` (dim)
- Action content: tool call header OR inline text message from subagent

## AMP Golden Screenshot Analysis

### streaming-with-subagent (in-progress, 1 child):
```
  ⣒ Subagent Explore flitter-cli package structure ▼
    ╰── Explore flitter-cli package structure
```

### subagent-in-progress (in-progress, many children):
```
  ⢠ Subagent Explore flitter-cli package structure ▼
    ├── Explore flitter-cli package structure
    ├── I'll explore the flitter-cli package systematically...
    ├── ✓ Read packages/flitter-cli
    ├── ✓ Read packages/flitter-cli/package.json
    ...
    ╰── ✓ Read packages/flitter-cli/src/utils
```

### Key Visual Patterns
1. Spinner (braille) in blue/toolRunning color when active
2. "Subagent" as bold tool name
3. Description as dim detail text
4. ▼/▶ chevron for expand toggle
5. Tree-line characters are dim
6. Child items indented 4 spaces (tree prefix)
7. Child tool calls show full status icon + bold name + detail
8. Child text messages shown as plain text

## Affected Files

### New File
- `packages/flitter-cli/src/widgets/activity-group.ts` — ActivityGroup widget (G1R equivalent)

### Modified Files
- `packages/flitter-cli/src/widgets/chat-view.ts` — Wire ActivityGroup into assistant turn rendering
- `packages/flitter-cli/src/widgets/tool-call/task-tool.ts` — Ensure "Task" label prefix, wire to ActivityGroup
- `packages/flitter-cli/src/utils/icon-registry.ts` — Add tree-line icon entries

## Dependencies
- BrailleSpinner from flitter-core
- CliThemeProvider for theme-aware colors
- ToolHeader for nested tool call rendering
- ExpandCollapse widget for chevron toggle
