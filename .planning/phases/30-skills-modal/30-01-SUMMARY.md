---
phase: 30
plan: 01
title: "SkillsModal Widget + SkillService — List View, Local/Global Grouping, Scroll"
status: completed
completed_at: 2026-04-07
commits:
  - hash: e5337f6
    message: "feat(skills): add skill data model types (skill-types.ts)"
  - hash: 2269e67
    message: "feat(skills): add SkillService with groupSkillsByPath and relativizePath"
  - hash: 785e456
    message: "feat(skills): add SkillsModal StatefulWidget with list view matching AMP f9T"
files_created:
  - packages/flitter-cli/src/state/skill-types.ts
  - packages/flitter-cli/src/state/skill-service.ts
  - packages/flitter-cli/src/widgets/skills-modal.ts
---

# Summary: Plan 30-01

## What was built

### Task 1: Skill data model types (`skill-types.ts`)
- `SkillFrontmatter` — all 12 fields from AMP detail panel (name, description, license, compatibility, argument-hint, model, allowed-tools, builtin-tools, disable-model-invocation, mode, isolatedContext, metadata)
- `SkillDefinition` — name, description, baseDir, frontmatter, content, files
- `SkillError` — path, error, hint
- `SkillWarning` — path, error
- `SkillGroup` — label, pathHint, skills[]

### Task 2: SkillService (`skill-service.ts`)
- `SkillService` class with private skills/errors/warnings/loaded/listeners
- Public getters: skills, errors, warnings, isLoaded, skillCount, warningCount
- `setSkills()` — bulk update from external source, notifies listeners
- `getSkillByName()` — lookup by name
- `addListener()`/`removeListener()` — change notification
- `groupSkillsByPath()` — matching AMP's Cq0: Local (.agents/skills/ relative to cwd), Global (~/.agents/skills/), other
- `relativizePath()` — matching AMP's A_R: relative to cwd, ~ for home

### Task 3: SkillsModal widget (`skills-modal.ts`)
- `SkillsModal` StatefulWidget matching AMP m9T: skills, errors, warnings, onDismiss, onAddSkill, onDocs, onInsertPrompt, onInvokeSkill, cwd
- `SkillsModalState` matching AMP f9T:
  - listScrollController + detailScrollController (both followMode disabled)
  - selectedSkill state, _viewportHeight
  - handleKeyEvent: Escape (clear selection / dismiss), i (invoke), a (add), o (docs)
  - selectSkill() with detailScrollController.jumpTo(0)

**Build method — list view only (detail panel deferred to 30-02):**
- Width: no selection `max(60, min(90, available))`, with selection `max(100, min(150, available))` — exact AMP values
- Title bar: `Skills (N)` with `(o)wner's manual  (a)dd` buttons — exact AMP spacing/colors
- Grouping: nonBuiltin via groupSkillsByPath() first, then builtin as "Built-in" — exact AMP order
- Group headers: `Padding(h:2) -> Text("Label pathHint")` with secondary bold + dim
- Skill items: `Padding(h:6) -> Row [Expanded(flex:1, name), SizedBox(w:2), Expanded(flex:2, desc)]` — exact AMP proportions
- Empty state: two description lines + "Create your own:" + 2 example prompts — exact AMP text
- Errors: "Skipped skills with errors (N):" with warning icon, error text, hint, relativized path
- Warnings: "Skill warnings (N):" with warning icon, relativized path, error text
- "Create your own:" section when nonBuiltin skills exist
- Scroll: Row [Expanded(SingleChildScrollView(list)), Scrollbar(list)] with theme scrollbar colors
- Footer: Center -> "Escape to close" (keybind + dim)
- Outer: FocusScope -> Center -> Container(constraints, Border.all(primary, 1, rounded), padding:1) -> Row

## TypeScript verification

```
npx tsc --noEmit — 0 errors from new files (27 pre-existing errors in other files)
```

## AMP alignment verification

All layout values, text content, colors, spacing, and grouping logic match the reverse-engineered AMP source:
- `03_skills_modal_m9T.js` — widget props: exact field match
- `03_skills_modal_state_f9T.js` — state, scroll, build: exact logic match
- `tmux-capture/screens/amp/skills-popup/plain-63x244.golden` — visual layout: Local/Global group headers, skill name+description rows confirmed
