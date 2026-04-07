---
phase: 30
plan: 02
title: "Detail Panel + Keyboard Navigation + Error/Warning Sections + Create Your Own"
status: completed
completed_at: 2026-04-07
commits:
  - hash: e877a3e
    message: "feat(skills): add detail panel with frontmatter, file list, invoke button matching AMP f9T"
files_modified:
  - packages/flitter-cli/src/widgets/skills-modal.ts
---

# Summary: Plan 30-02

## What was built

### Task 1: Detail panel rendering when a skill is selected

Added `_buildDetailPanel()` private method to `SkillsModalState`, matching AMP f9T's Q variable exactly:

**Width split**: `listWidth = Math.floor(totalWidth * 2/5)` — detail panel gets the remaining width via ConstrainedBox with `minWidth: listWidth, maxWidth: listWidth`.

**Detail header (K)**: Row with `[Expanded(path text, dim, maxLines:1, ellipsis), SizedBox(w:1) if invoke button, invoke button]`.
- Path extracted via `extractDisplayPath()` (AMP's yq0): strips `file://` prefix for filesystem skills.
- "(i)nvoke" button: `(` in secondaryDim, `i` in keybind, `)` in secondaryDim, `nvoke` in secondary — wrapped in MouseRegion if `onInvokeSkill`.

**Frontmatter rendering (P)**: Builds `frontmatterLines[]` from all 12 fields in exact AMP order:
1. name, description, license, compatibility, argument-hint, model
2. allowed-tools: [joined], builtin-tools: [joined]
3. disable-model-invocation: true, mode: true, isolatedContext: true
4. metadata: key: value (nested)

Combined as `---\n{lines}\n---\n\n{content}` when frontmatter exists; plain content otherwise.

**SKILL.md label (yR)**: Clickable (primary color) for non-builtin skills, plain dim text for builtin.

**File list (J)**: Only for non-builtin skills:
- Horizontal rule: `"─".repeat(listWidth - 4)` in dim
- "Files:" header in dim
- "  SKILL.md" clickable in primary color
- Each additional file: relative path via `computeRelativeFilePath()`, clickable in primary color

**Detail scroll**: `Row [Expanded(SingleChildScrollView(detailScrollController)), Scrollbar]` with custom `getScrollInfo` returning `{ totalContentHeight: max(maxExtent + 20, 0), viewportHeight: 20, scrollOffset: max(offset, 0) }`.

**Detail container**: ConstrainedBox with BoxDecoration: left border only (`Border({ left: BorderSide({ color: border, width: 1 }) })`), Padding(left: 2), Column [header, SizedBox(1), Expanded(scrollableDetail)].

**Wiring**: When `selectedSkill !== null`, detail panel is appended to the main Row as a fixed-width right panel. List padding changes to `right: 1` when selection exists.

**Helper functions added**:
- `extractDisplayPath()` — AMP's yq0: strip file:// from baseDir
- `computeRelativeFilePath()` — AMP's HhR: relative path from base to file

### Task 2: Keyboard navigation (verified — already in 30-01)

Full AMP keyboard mapping was already implemented in 30-01:
- `Escape`: clear selection if selected, dismiss if not — exact AMP match
- `i`: invoke selected skill + dismiss — only with selection
- `a`: add skill — only without selection (list view)
- `o`: open docs — only without selection (list view)
- `onInvokeSkill(name)` followed by `onDismiss()` — exact AMP invoke-then-close pattern

### Task 3: Error/warning/create-your-own sections (verified — already in 30-01)

All three sections were already implemented in 30-01:
- Error section: `Skipped skills with errors (N):` with warning icon, skill name from path, error text, hint, relativized path
- Warning section: `Skill warnings (N):` with warning icon, relativized path, error text
- "Create your own:" section: two exact AMP example prompts, clickable if `onInsertPrompt`

## TypeScript verification

```
npx tsc --noEmit — 0 new errors (27 pre-existing errors in other files)
```

## AMP alignment verification

All detail panel layout, frontmatter rendering, file list, keyboard, and error/warning sections match the AMP source:
- `03_skills_modal_state_f9T.js` — Q variable (detail panel): exact structure match
- Width split: `I = Math.floor(x * 2/5)` — exact
- Border: `new c9(void 0, void 0, void 0, new C9(T.border, 1))` = left-only border — exact
- Frontmatter: all 12 fields in exact order with `---` delimiters — exact
- File list: `"\u2500".repeat(I-4)`, "Files:", "  SKILL.md", relative paths — exact
- Invoke button: `("(",O), ("i",n), (")",O), ("nvoke",v)` — exact
- getScrollInfo: `{totalContentHeight: max(kR+20,0), viewportHeight: 20, scrollOffset: max(dR,0)}` — exact
