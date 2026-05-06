# Read Tool Rendering Gaps — Design Spec

**Date:** 2026-05-06  
**Scope:** 6 alignment fixes between flitter-cli and amp-cli for the Read tool rendering in chat view

## Background

The Read tool rendering in flitter-cli's chat view has 6 remaining gaps compared to amp-cli's implementation. All are in `packages/cli/src/widgets/conversation-view.ts`, `packages/cli/src/widgets/display-items.ts`, `packages/cli/src/widgets/guidance-file-display.ts`, and `packages/cli/src/widgets/app-theme-controller.ts`.

## Amp Reference

| Function | File | Purpose |
|----------|------|---------|
| `pW0` | `chunk-004.js:36925-36934` | Deduplicate guidance files across actions |
| `Jm` | `chunk-004.js:36821-36837` | Render deduplicated guidance files at group top |
| `ZA` | `modules/1831_unknown_ZA.js:8-23` | Display name: basename + N parent dirs |
| `lW0` | `modules/2816_unknown_lW0.js:14-47` | Summary builder: thought, read, search, guidance file counts |
| `nW0` | `modules/2816_unknown_lW0.js:1-13` | Count extractor: merges search+explore |
| `Y1T.build` | `modules/1472_tui_components/actions_intents.js:4444-4485` | Wires pW0 → lW0 → Jm |

## Changes

### Gap 1: Guidance File Deduplication at Group Level

**Files:** `display-items.ts`, `conversation-view.ts`

**New function in `display-items.ts`:**
```typescript
// 逆向: pW0 — chunk-004.js:36925-36934
export function deduplicateGuidanceFiles(
  actions: ActivityAction[],
): Array<{ uri: string; lineCount: number }> {
  const seen = new Set<string>();
  const result: Array<{ uri: string; lineCount: number }> = [];
  for (const action of actions) {
    for (const gf of action.guidanceFiles ?? []) {
      const key = `${gf.uri}|${gf.lineCount}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(gf);
    }
  }
  return result;
}
```

**Changes in `conversation-view.ts` `_buildActivityGroupWidget`:**
1. Call `deduplicateGuidanceFiles(group.actions)` to get `dedupedGuidanceFiles`.
2. If non-empty, render them as a block of `RichText` widgets at the top of the expanded column (before action rows), using `guidanceFileDisplayName()` (Gap 2), styled in dim `toolSuccessColor` with 2-space left padding.
3. Add a 1-height spacer (`SizedBox({ height: 1 })`) after the guidance block.

**Changes in `_buildSingleActionRow`:**
- Remove the per-action `guidanceFiles` rendering (the nested `ExpandableToolHeader` with `detailChild`). Actions no longer show guidance files individually since they're deduplicated at group level.

### Gap 2: ZA-style Display Name for Guidance Files

**File:** `guidance-file-display.ts`

**New function:**
```typescript
// 逆向: ZA — modules/1831_unknown_ZA.js:8-23
export function guidanceFileDisplayName(uri: string, depth = 1): string {
  // Strip file:// scheme if present
  let filePath = uri.startsWith("file://") ? uri.slice(7) : uri;
  // Handle Windows drive-letter URIs: file:///C:/...
  if (/^\/[A-Za-z]:[\\/]/.test(filePath)) filePath = filePath.slice(1);

  const base = basename(filePath) || "AGENTS.md";
  const parts: string[] = [];
  let dir = dirname(filePath);

  for (let i = 0; i < depth; i++) {
    const seg = basename(dir);
    if (!seg || seg === dir) break;
    parts.unshift(seg);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  if (parts.length === 0) return base;
  return [...parts, base].join("/");
}
```

**Usage:** Replace all `cwdRelativePath(gf.uri, cwd)` calls for guidance files with `guidanceFileDisplayName(gf.uri)`.

### Gap 3: Thought Count in Activity Summary

**File:** `display-items.ts`

**Change `buildActivitySummary`:**
Add `thinking` count at the beginning of the parts array:
```typescript
if (counts.thinking) parts.push(`${counts.thinking} thought${counts.thinking > 1 ? "s" : ""}`);
```

Insert before the `read` line so order matches amp: thought → read → search → guidance files.

### Gap 4: Guidance File Count in Activity Summary

**File:** `display-items.ts`

**Change function signature:**
```typescript
function buildActivitySummary(actions: ActivityAction[], guidanceFilesCount = 0): string
```

**Add at end of parts array (after search):**
```typescript
if (guidanceFilesCount > 0)
  parts.push(`${guidanceFilesCount} guidance file${guidanceFilesCount > 1 ? "s" : ""}`);
```

**Caller change:** Where `ActivityGroupItem.summary` is computed, call `deduplicateGuidanceFiles(actions).length` and pass as second argument.

### Gap 5: Merge Search + Explore in Summary

**File:** `display-items.ts`

**Change `buildActivitySummary`:**
Replace the separate `search` and `explore` entries with a merged count:
```typescript
const searchCount = (counts.search ?? 0) + (counts.explore ?? 0);
if (searchCount) parts.push(`${searchCount} search${searchCount > 1 ? "es" : ""}`);
```

Remove the separate `explore` line entirely.

### Gap 6: Add `warning` Color to AppTheme

**File:** `app-theme-controller.ts`

**Add to `AppTheme` interface:**
```typescript
warning?: Color;
```

**Add to `createDefaultAppTheme`:**
```typescript
warning: Color.indexed(3),
```

**File:** `conversation-view.ts`

**Resolve at usage sites:**
```typescript
const warningColor = appTheme?.warning ?? WARNING_COLOR;
```

Replace direct `WARNING_COLOR` usage in:
- `_buildToolWidget` read-range span (line ~1126)
- `_buildSingleActionRow` read-range span (line ~1659)
- Thinking block cancelled indicator (line ~846)
- Thinking item cancelled label (lines ~1771, ~1783)

The `WARNING_COLOR` constant remains as fallback when no theme is available.

## Acceptance Scenarios

### Scenario 1: Activity group shows deduplicated guidance files at top
  Given an activity group with 3 Read actions, two of which loaded the same AGENTS.md
  When the activity group is expanded in chat view
  Then the user sees "Loaded project/AGENTS.md (50 lines)" listed once at the top of the expanded section
  And individual action rows do NOT repeat the guidance file

### Scenario 2: Guidance file display name uses parent-dir style
  Given a guidance file at `/Users/dev/myproject/src/AGENTS.md`
  When rendered anywhere in the chat view (tool row or activity group)
  Then the user sees "src/AGENTS.md" (one parent dir + filename)
  And NOT a full workspace-relative path like "src/subdir/nested/AGENTS.md"

### Scenario 3: Activity group summary includes thought count
  Given an activity group with 2 thinking actions and 3 read actions
  When the user sees the collapsed activity group header
  Then the summary reads "2 thoughts, 3 file reads" (thought count first)

### Scenario 4: Activity group summary includes guidance file count
  Given an activity group with actions that collectively reference 4 unique guidance files
  When the user sees the collapsed activity group header
  Then the summary includes "4 guidance files" at the end

### Scenario 5: Search and explore merged in summary
  Given an activity group with 2 search actions and 1 explore action
  When the user sees the collapsed activity group header
  Then the summary shows "3 searches" (merged, not "2 searches, 1 exploration")

### Scenario 6: Warning color respects theme
  Given a custom AppTheme with `warning` set to `Color.rgb(255, 128, 0)` (orange)
  When a Read tool row displays `@10-50` range
  Then the range text uses the themed orange color, not hardcoded yellow

### Scenario 7: Fallback when no theme
  Given no AppTheme is provided (null/undefined)
  When rendering read-range or cancelled-thinking indicators
  Then `Color.indexed(3)` (terminal yellow) is used as fallback

### Scenario 8: Empty guidance files still work
  Given an activity group where no actions have guidance files
  When the activity group is expanded
  Then no guidance file block is shown at the top
  And the summary does not include "0 guidance files"
