# Phase 30: Skills Modal - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — strict AMP alignment)

<domain>
## Phase Boundary

Build the complete Skills browsing modal from scratch:
1. SkillsModal widget (m9T in AMP) with list view, Local/Global grouping
2. Detail panel (2/5 + 3/5 split) with SKILL.md content, frontmatter, file list
3. Keyboard navigation: Escape/i/a/o
4. Error and warning sections for failed skill loading
5. "Create your own:" section with example prompts
6. Independent scroll controllers for list and detail
7. SKILLS_MODAL overlay registration and InputArea badge trigger
8. Centralized skill service for loading, caching, querying
9. Pending skills injection (addPendingSkill/removePendingSkill)
10. Skills count in InputArea top-right border (already wired)

</domain>

<decisions>
## AMP Alignment (Non-Negotiable)
- Skills modal title: "Skills (N)" with "(o)wner's manual  (a)dd" buttons
- Grouping: "Local .agents/skills/" and "Global ~/.agents/skills/"
- Layout: no selection = full width list; with selection = 2/5 list + 3/5 detail
- List width: max(60, min(90, available))
- Total width with detail: max(100, min(150, available))
- Keyboard: Escape (close/back), i (invoke), a (add), o (owner's manual)
- Error section: "Skipped skills with errors (N):"
- Warning section: "Skill warnings (N):"
- "Create your own:" section with 2 example prompts
- Detail shows: path, (i)nvoke button, frontmatter metadata, SKILL.md content, file list
- Pending skills injection as info messages: "You MUST call the {tool} tool to load: {skillNames}..."
- Blue border (38;5;4 = ANSI blue)

</decisions>

<code_context>
## Existing Infrastructure
- `app-shell.ts` has `_openSkillsModal()` stub and `onSkillCountClick` wiring
- `border-builders.ts` skill count badge fully implemented
- `input-area.ts` has skillCount/skillWarningCount/onSkillCountClick props
- `overlay-ids.ts` needs SKILLS_MODAL entry
- `app-state.ts` has tools[]/skillCount getter

## AMP References
- `tmux-capture/amp-source/03_skills_modal_m9T.js` — widget class
- `tmux-capture/amp-source/03_skills_modal_state_f9T.js` — state class with scroll controllers, keyboard handling
- `tmux-capture/amp-source/26_toast_skills.js` — pending skills system
- `tmux-capture/amp-source/30_main_tui_state.js` — UI state fields
- `tmux-capture/screens/amp/skills-popup/` — golden screenshots

</code_context>

<specifics>
User directive: "对齐 amp，禁止 subagent 自由发挥"

</specifics>

<deferred>
None

</deferred>
