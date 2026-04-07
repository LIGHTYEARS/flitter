# Plan 33-02 Summary: Inverted-Color Options and Feedback Input Mode

**Commit**: 061b4b7
**Requirements**: HITL-03 (option style with shortcut labels), HITL-05 (feedback input mode)

## Changes

### `packages/flitter-cli/src/state/prompt-controller.ts`
- `_requestToolPermission()` now builds AMP-matching option set:
  - `Approve` (allow_once) → optionId `"yes"`
  - `Allow All for This Session` (allow_always) → optionId `"allow-all-session"`
  - `Allow All for Every Session` (allow_always) → optionId `"allow-all-persistent"`
  - `Deny with feedback` (reject_with_feedback) → optionId `"no-with-feedback"`
- Added `_resolveToolKind()` method to map tool names to AMP kind categories:
  - `bash`/`execute_command` → `"bash"` (triggers "Run this command?" header)
  - `edit_file`/`str_replace_editor` → `"edit_file"` (triggers "Allow editing file:" header)
  - `create_file`/`write_file` → `"create_file"` (triggers "Allow creating file:" header)
  - default → `"tool"` (triggers "Allow [toolName]?" header)
- Result checking updated to handle compound PermissionResult union type:
  `typeof result === 'string' && (result === 'yes' || result === 'allow-all-session' || result === 'allow-all-persistent')`

### Already implemented in 33-01 (permission-dialog.ts)
- Radio-style options with `▸●` / `○` indicators
- `[Alt+N]` shortcut labels (dim cyan) matching AMP golden
- Alt+1..Alt+9 keyboard shortcuts for direct option selection
- Feedback input mode (activated when selecting `reject_with_feedback` option):
  - "✗ Denied — tell the assistant what to do instead" header
  - Text input with `›` prompt and placeholder
  - "Enter send  •  Esc cancel" footer
  - Escape returns to option selection
  - Empty feedback falls back to simple deny

## Verification
- `bunx tsc --noEmit` passes for all modified files (0 new errors)
- Pre-existing errors in prompt-controller unchanged (unused imports, readonly type)
