# Plan 33-01 Summary: Redesign HITL Dialog Layout

**Commit**: d50af08
**Requirements**: HITL-01 (content preview), HITL-02 (full-width), HITL-04 (title format)

## Changes

### `packages/flitter-cli/src/state/permission-types.ts`
- Added `PermissionContentPreview` interface with fields: header, command, cwd, filePath, reason, hint, json
- Added `contentPreview?: PermissionContentPreview` to `PermissionRequest`
- Added `'reject_with_feedback'` to `PermissionOptionKind` union
- Extended `PermissionResult` to compound union: `string | { type: 'deny-with-feedback'; feedback: string } | null`

### `packages/flitter-cli/src/widgets/permission-dialog.ts`
- **Full rewrite**: StatelessWidget → StatefulWidget (`PermissionDialog` + `PermissionDialogState`)
- Interface changed: `onSelect + onCancel` → single `onResult: (result: PermissionResult) => void`
- Layout matches AMP golden screenshot:
  - Full-screen Stack overlay with background mask
  - Bottom-aligned full-width bordered Container (warning-color rounded border)
  - Content: bold title → command/filePath/JSON preview → reason → radio options → footer hint
  - Radio indicators: `▸●` (selected, bold primary) / `○` (unselected, cyan)
  - `[Alt+N]` shortcut labels on each option (dim cyan)
  - Footer: "↑↓ navigate • Enter select • Esc cancel"
- Keyboard: ArrowUp/Down/j/k, Tab, Enter, Escape, Alt+1..9
- Feedback mode: "✗ Denied — tell the assistant what to do instead" + TextField + Enter/Esc footer
- Uses CliThemeProvider for theme-aware colors

### `packages/flitter-cli/src/state/app-state.ts`
- `requestPermission()` now builds `PermissionContentPreview` from toolCall data
- `_buildContentPreview()` dispatches on toolCall.kind: bash→command preview, edit→filePath, create→filePath, default→JSON
- Uses new `onResult` callback instead of `onSelect + onCancel`

## Verification
- `bunx tsc --noEmit` passes for all modified files (0 errors in permission-dialog, permission-types, app-state)
- Pre-existing errors in unrelated files unchanged
