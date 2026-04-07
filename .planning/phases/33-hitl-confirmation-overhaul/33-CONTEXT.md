# Phase 33: HITL Confirmation Overhaul — Context

## Requirements

| ID | Description | Status |
|---------|-------------|--------|
| HITL-01 | HITL confirmation dialog displays command content preview (tool call parameters) above option buttons | Pending |
| HITL-02 | HITL dialog width matches InputArea width (full-width border alignment) | Pending |
| HITL-03 | HITL options use inverted-color block style with [y]/[n]/[a] keyboard shortcut labels | Pending |
| HITL-04 | HITL title format is "Allow [tool_name]?" with bold styling | Pending |
| HITL-05 | HITL supports "Provide feedback" mode for inline text input within the dialog | Pending |

## Current State

### Existing `PermissionDialog` (flitter-cli)
- Location: `packages/flitter-cli/src/widgets/permission-dialog.ts`
- StatelessWidget wrapping `DialogOverlay` → `Dialog` → `SelectionList`
- Title: "Permission Required" (does NOT match AMP's "Allow [tool]?" format)
- No content preview of tool parameters
- Uses `DialogOverlay` (centered, `maxWidth: 60` default) — NOT full-width
- Options rendered via `SelectionList` with `> item` prefix — NOT inverted-color block style
- No feedback input mode
- No Alt+N shortcut labels on options

### How it's wired
- `AppState.requestPermission()` shows the dialog via `OverlayManager.show()` at `OVERLAY_PRIORITIES.PERMISSION_DIALOG`
- Receives `PermissionRequest` with `toolCall` (title, kind, rawInput) and `options` array
- Returns `PermissionResult` (optionId string | null) via Promise

### AMP Source Analysis (`02_confirmation_state_aTT.js`, `10_confirmation_dialog_eTT.js`)

**Confirmation Widget (aTT — StatefulWidget state)**:
- `feedbackInputActive` boolean — toggles feedback input mode
- `feedbackController` — TextEditingController for feedback text
- `handleOptionSelect(value)` — if `"no-with-feedback"`, sets `feedbackInputActive = true`; otherwise dispatches `{type: "simple", value}`
- `submitFeedback()` — trims text, dispatches `{type: "deny-with-feedback", feedback}` or falls back to `{type: "simple", value: "no"}`
- `formatConfirmationContent(request)` — formats content object with:
  - Bash: `{header: "Run this command?", command, cwd, reason, hint}`
  - Edit: `{header: "Allow editing file:", filePath, reason, hint}`
  - Create: `{header: "Allow creating file:", filePath, reason, hint}`
  - Other: `{header: "Invoke tool [name]?", json}`
- `createConfirmationOptions(request)` — returns option arrays:
  - Tool-use: Approve, Allow All for This Session, Allow All for Every Session, Deny with feedback
  - Each option has `{value, label}` format
- `buildFeedbackInput(colorScheme)` — renders:
  - "✗ Denied — tell Amp what to do instead"
  - Text input with `›` prompt and placeholder
  - Footer: "Enter send  •  Esc cancel"
  - Bordered with primary color, rounded

**Confirmation Dialog (eTT/rTT — StatefulWidget)**:
- Accepts: `options`, `onSelect`, `content`, `borderColor`, `onShowCommand`
- `content` is the structured content object from `formatConfirmationContent()`
- Renders a bordered box with:
  - Content preview (command/filePath/json) above options
  - Radio-style option list with selected indicator (▸● selected, ○ unselected)
  - Alt+N keyboard shortcut labels (e.g., `[Alt+1]`, `[Alt+2]`)
  - Footer: "↑↓ navigate • Enter select • Esc cancel"
  - Full-width border (matches InputArea width)

### Golden Screenshot Analysis (`tmux-capture/screens/amp/hitl-confirmation/plain-63x244.golden`)
The AMP HITL confirmation renders as:
```
╭──────────────────────...────────────────────────╮
│ Run this command?                                │
│ $ sleep 60                                       │
│ (Matches built-in permissions rule 25: ask Bash) │
│ ▸● Approve [Alt+1]                               │
│  ○ Allow All for This Session [Alt+2]            │
│  ○ Allow All for Every Session [Alt+3]           │
│  ○ Deny with feedback [Alt+4]                    │
│ ↑↓ navigate • Enter select • Esc cancel          │
╰──────────────────────...────────────────────────╯
```

Key visual details from golden:
- Yellow/warning-colored border (`╭╮╰╯│─` rounded style)
- Title: "Run this command?" (bold, for bash) or "Allow [tool_name]?" pattern
- Command preview: `$ sleep 60` with syntax-colored command
- Reason text: `(Matches built-in permissions rule 25: ask Bash)` in cyan
- Selected option: `▸●` prefix, bold + blue text, `[Alt+N]` in dim cyan
- Unselected options: ` ○` prefix, normal text, `[Alt+N]` in dim cyan
- Footer hint: `↑↓ navigate • Enter select • Esc cancel` in dim gray
- Full terminal width border

## Architecture Decisions

1. **Replace PermissionDialog StatelessWidget** with a new **StatefulWidget** to support:
   - Feedback input mode toggle (feedbackInputActive state)
   - Keyboard shortcut handling (Alt+1..N direct selection)
   - Radio-button selected index tracking
2. **No longer use Dialog/DialogOverlay** — render directly as full-width bordered box (HITL-02)
3. **Extend PermissionRequest** with optional `contentPreview` field for structured content (HITL-01)
4. **New `PermissionOptionKind`** to add `'reject_with_feedback'` for feedback mode (HITL-05)
5. **CliTheme integration** — use `base.warning` for border, `base.primary` for selected, `base.destructive` for denied

## Files to Modify

| File | Change |
|------|--------|
| `packages/flitter-cli/src/widgets/permission-dialog.ts` | **Replace** — StatelessWidget → StatefulWidget with full AMP layout |
| `packages/flitter-cli/src/state/permission-types.ts` | **Extend** — add contentPreview, reject_with_feedback kind |
| `packages/flitter-cli/src/state/app-state.ts` | **Update** — requestPermission() passes richer content to dialog |

## Plan Split

- **33-01 (Wave 1)**: Layout overhaul — content preview, full-width border, "Allow [tool]?" title, radio-style options with indicators
  - Requirements: HITL-01, HITL-02, HITL-04
- **33-02 (Wave 2, depends 33-01)**: Inverted-color [y]/[n]/[a] labels + Alt+N shortcuts + feedback input mode
  - Requirements: HITL-03, HITL-05
