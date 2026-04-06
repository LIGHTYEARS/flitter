# GSD Plan: AMP Binary Reverse-Engineering Parity — Phases 56-62

**Source of truth**: AMP macOS binary (`amp-darwin-arm64`, 67MB Mach-O, Bun-compiled JS)
**Golden reference**: `tmux-capture/screens/` (9 screens × 4 formats)
**Extracted AMP source**: `tmux-capture/amp-source/` (20 files, decompiled from binary)
**Test baseline**: 983 pass, 0 fail, 6971 expect() across 40 files

---

## Phase 56 — Rich Border InputArea (`IhR` → `BorderOverlayInputArea`)

**Root cause**: AMP's `IhR` widget is a custom `MultiChildRenderObjectWidget` that renders overlay text segments **embedded in the border characters** of the input box. flitter-cli distributes this across 3 separate widgets (`HeaderBar`, `InputArea` overlay, `StatusBar`).

**AMP source ref**: `amp-source/input-area-top-left-builder.js`, `input-area-top-right-builder.js`, `input-area-bottom-right-builder.js`, `input-area-bottom-left-builder.js`, `status-border-builder.js`

**Deliverables**:
1. Create `BorderOverlayInputArea` widget that wraps `InputArea` with 4-position overlay support:
   - `top-left`: context window usage (`${percent}% of ${maxK}k`) + cost (`$x.xx`) + timer
   - `top-right`: mode badge + notification count (`!`) + skill count (`77─skills─`)
   - `bottom-right`: shortened cwd + git branch (`~/path (branch)─`)
   - `bottom-left`: contextual hints (handoff, enter-to-reference, etc.)
2. Modify `app-shell.ts` to replace `HeaderBar` + `InputArea` + `StatusBar` trio with single `BorderOverlayInputArea`
3. Implement `buildDisplayText(path, branch, maxWidth)` for path shortening (AMP's ellipsis logic)
4. Implement context window danger/warning/recommendation color thresholds (AMP's `XJR` function)
5. Add cost display formatting: `$0.xx` (2dp for ≥$0.01, 4dp for <$0.01)
6. Wire `skillCount`, `notificationCount` props from AppState

**Closes gaps**: G.1, 1.5, 1.6, 3.2, 5.2, G.2, G.3

**Files to modify**: `input-area.ts` (major rewrite), `app-shell.ts`, `status-bar.ts` (deprecate or merge)
**Files to create**: `border-overlay-input-area.ts`
**Tests**: Verify overlay positions render correctly; verify context % color thresholds

---

## Phase 57 — ActivityGroup Tree Rendering (`G1R`/`z1R`)

**Root cause**: AMP's `G1R` uses `Do` (Disclosure/ExpandCollapse) widget with nested `_buildActionRow` to create hierarchical trees. flitter-cli's `TaskTool` only uses `Padding(left:2)`. Tree connector characters (`├──`/`╰──`) come from the `Do` widget's rendering logic, not from manual string construction.

**AMP source ref**: `amp-source/01_activity_group_state_z1R.js`

**Deliverables**:
1. Create `ActivityGroupWidget` (`StatefulWidget`) mirroring `G1R`/`z1R`:
   - Props: `{group: {actions, summary, hasInProgress}}`
   - State: `expanded`, `actionExpanded` Map, `visibleActionCount`, spinner animation (200ms)
   - Staggered action reveal: `_scheduleAppendStep` at 90ms intervals
2. Each action row uses `ExpandCollapse` (`Do`) with nested detail expansion
3. Title: spinner (braille, `Sa.toBraille()`) when active, `✓` when complete + summary text
4. Modify `tool-call-widget.ts` / `task-tool.ts` to render subagent children via `ActivityGroupWidget` instead of flat `Padding`
5. Verify that `ExpandCollapse` renders tree connectors (`├──`/`╰──`) — if not, add tree prefix rendering to `ExpandCollapse` or `ActivityGroupWidget._buildActionRow`
6. Wire `HIR()` equivalent function that maps action type → icon + label + detail

**Closes gaps**: 4.7, 6.1, 6.2, 5.1

**Files to modify**: `task-tool.ts`, `expand-collapse.ts`, `chat-view.ts`
**Files to create**: `activity-group-widget.ts`
**Tests**: ActivityGroupWidget renders tree with connectors; staggered reveal; expand/collapse state

---

## Phase 58 — HITL Confirmation Dialog (`aTT`/`eTT`)

**Root cause**: AMP's `aTT` has `formatToolConfirmation()` that dispatches by tool type (Bash→"Run this command?", Edit→"Allow editing file:", Write→"Allow creating file:", generic→"Invoke tool X?"). Also has feedback input mode and full option set with Alt+N shortcuts.

**AMP source ref**: `amp-source/02_confirmation_state_aTT.js`, `02_confirmation_TTT.js`, `10_confirmation_dialog_eTT.js`

**Deliverables**:
1. Rewrite `permission-dialog.ts` to implement `formatToolConfirmation()`:
   - Bash: header `"Run this command?"`, display command with `$ ` prefix, show cwd, truncation with `"Press ? for full command"` hint
   - Edit: header `"Allow editing file:"`, show file path, hint `"Press ? to view full diff"`
   - Write: header `"Allow creating file:"`, show file path
   - Generic: header `"Invoke tool ${name}?"`
   - Subagent prefix: `[SubagentName] ` when tool is from subagent
2. Implement confirmation options per AMP:
   - `Approve [Alt+1]`
   - `Allow All for This Session [Alt+2]`
   - `Allow All for Every Session [Alt+3]`
   - `Deny with feedback [Alt+4]`
   - Radio button style: `▸●` selected, `○` unselected
3. Implement feedback input mode: `✗ Denied — tell Amp what to do instead` with text input + Enter/Esc hints
4. Navigation hint footer: `↑↓ navigate • Enter select • Esc cancel`
5. Footer state: `Waiting for approval...  Esc to cancel`
6. Overlay content: `?` key shows full command / full diff

**Closes gaps**: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6

**Files to modify**: `permission-dialog.ts` (major rewrite), `app-shell.ts` (footer state)
**Tests**: formatToolConfirmation for each tool type; feedback input toggle; option rendering

---

## Phase 59 — ShortcutHelp Inline + Welcome Screen Orb

**Root cause**: AMP's `v9T` is a `StatelessWidget` rendered **inside** the InputArea (below shortcuts, above text input, with separator line). flitter-cli renders it as a centered overlay. Welcome screen uses DensityOrb in Row layout with text on the right.

**AMP source ref**: `amp-source/04_shortcut_help_v9T.js`, `amp-source/11_shortcuts_data_C_R.js`, `amp-source/05_horizontal_line_dollar9T.js`/`05_horizontal_line_j9T.js`

**Deliverables**:
1. Rewrite `shortcut-help-overlay.ts` → `shortcut-help.ts` as inline StatelessWidget:
   - Two-column layout using `C_R` data format: `{left: {keys, description}, right: {keys, description}}`
   - Keys in keybind color, descriptions in dim foreground
   - Padding calculation: `tq0` (fixed column width) with space fill
   - Tmux detection: if in tmux without extended-keys, show warning + link
   - Bottom separator: `HorizontalLine` widget (`$9T`/`j9T` → custom RenderObject that paints `─`)
2. Embed `ShortcutHelp` inside `BorderOverlayInputArea` (from P56) as optional child above text input
3. Toggle via `?` key — expands input area height, not overlay
4. Welcome screen: modify `buildWelcomeScreen()` in `chat-view.ts`:
   - Row layout: `DensityOrbWidget` (left) + Column (right)
   - Right column: "Welcome to Amp" (yellow), "Ctrl+O for **help**" (cyan, help bold), "Use Tab/Shift+Tab..." (cyan)
   - Increase default input box height to 3 content lines (`MIN_HEIGHT = 5`)

**Closes gaps**: 7.1, 7.2, 7.3, 7.4, 1.1, 1.2, 1.3, 1.4, 1.7

**Files to modify**: `shortcut-help-overlay.ts` (rewrite), `chat-view.ts`, `input-area.ts`
**Files to create**: `horizontal-line.ts`
**Tests**: ShortcutHelp renders two columns; inline mode toggle; welcome screen with orb

---

## Phase 60 — Skills Modal (`m9T`/`f9T`)

**Root cause**: Entirely unimplemented. AMP has a full `StatefulWidget` with scroll controllers, keyboard navigation, grouped skill display (Local/Global), detail panel, and action buttons.

**AMP source ref**: `amp-source/03_skills_modal_m9T.js`, `03_skills_modal_state_f9T.js`

**Deliverables**:
1. Create `skills-modal.ts` — `StatefulWidget` with:
   - Props: `skills[]`, `errors[]`, `warnings[]`, `onDismiss`, `onAddSkill`, `onDocs`, `onInsertPrompt`, `onInvokeSkill`, `cwd`
   - State: `listScrollController`, `detailScrollController`, `selectedSkill`, `viewportHeight`
   - Keyboard: `Escape` (back/close), `i` (invoke), `a` (add), `o` (docs)
2. Layout:
   - Title bar: `Skills (${count})` bold primary + `(o)wner's manual` + `(a)dd` buttons
   - Grouped sections: `Local .agents/skills/` + `Global ~/.agents/skills/`
   - Each skill: name (command color) + description (dim), clickable → detail panel
   - Empty state: guidance text + example prompts
   - Scroll indicator bar
3. Detail panel (when skill selected):
   - Split view: skill list (left) + detail (right)
   - Detail shows full skill description, file paths, etc.
4. Wire into `app-shell.ts`: `@` or dedicated shortcut opens skills modal
5. Wire `skillCount` into border overlay (P56)

**Closes gaps**: 9.1

**Files to create**: `skills-modal.ts`
**Files to modify**: `app-shell.ts` (wire modal)
**Tests**: Skills modal renders with grouped sections; keyboard navigation; detail panel

---

## Phase 61 — Command Palette Category Layout

**Root cause**: Data exists (`CommandItem` has category) but is lost when mapping to `SelectionList` items. AMP uses three-column layout: `[category right-aligned dim]  [action bold]  [shortcut right-aligned]`.

**AMP source ref**: golden `slash-command-popup/plain-63x244.golden`

**Deliverables**:
1. Modify `command-palette.ts` item rendering:
   - Add category column (right-aligned, fixed width, dim color)
   - Keep action label (bold)
   - Add shortcut column (right-aligned, keybind color)
   - First item highlighted with gold/yellow background
2. Change title color: cyan → yellow/gold
3. Add `> ` prompt prefix before search TextField
4. Remove `x/y commands` count display (not in AMP)
5. Modify `SelectionList` or replace with custom rendering to support 3-column layout

**Closes gaps**: 8.4, 8.2, 8.3, 8.6

**Files to modify**: `command-palette.ts`
**Tests**: Command palette renders three columns; search filtering preserves layout

---

## Phase 62 — Footer Status + Polish Sweep

**Root cause**: Multiple small gaps in footer text, spinner position, and cost formatting.

**AMP source ref**: `amp-source/07a_footer_status_yB.js`, `07b_footer_status_zB0.js`, `08_footer_status_iO0.js`

**Deliverables**:
1. Footer status messages per AMP:
   - Tool running: `≡ Running tools...    Esc to cancel` (hamburger icon prefix)
   - Waiting approval: `Waiting for approval...  Esc to cancel`
   - Streaming: `⠋ Streaming...  Esc to cancel` (spinner prefix)
   - Thinking: wave character animation
2. Spinner position: move from end-of-line to **replace status icon** for in-progress tool calls
3. Cost formatting: 2dp for ≥$0.01, 4dp otherwise
4. Deep mode timer display: elapsed time in `mm:ss` format
5. OSC 8 terminal hyperlinks for file paths in tool call results
6. Input area default 3 content lines (MIN_HEIGHT = 5 including borders)

**Closes gaps**: 5.3, 4.6, 5.1, 5.2, 3.4, 6.3, 1.7, 8.1, 8.5, LOW gaps

**Files to modify**: `app-shell.ts`, `tool-header.ts`, `header-bar.ts`
**Tests**: Footer text matches per processing state; spinner position; cost format

---

## Execution Order & Dependencies

```
P56 (Rich Border) ─────────────────────┐
P57 (Tree Rendering) ──────────────────┤ No cross-deps
P58 (HITL Dialog) ─────────────────────┤ between P56-P58
P59 (Shortcuts + Welcome) ─── needs P56 for inline embedding
P60 (Skills Modal) ──────── needs P56 for skillCount wiring
P61 (Command Palette) ─────────────────┤ Independent
P62 (Footer + Polish) ──── needs P56 for footer integration
```

**Parallel batch 1**: P56 + P57 + P58 + P61 (4 agents, no cross-deps)
**Parallel batch 2**: P59 + P60 + P62 (3 agents, depend on P56 completion)

---

## Verification

After all phases: `bun test packages/flitter-cli/` must pass with 0 failures.
Visual verification: render each of the 9 golden screens in flitter-cli and compare against `tmux-capture/screens/`.

---

## Gap Coverage Matrix

| Gap # | Screen | Description | Phase |
|-------|--------|-------------|-------|
| G.1 | ALL | Rich border architecture | P56 |
| 1.5 | ALL | mode/notification/skills in top-right border | P56 |
| 1.6 | ALL | cwd+git branch in bottom-right border | P56 |
| 3.2 | ALL | context % in top-left border | P56 |
| 5.2 | streaming | cost format + location | P56+P62 |
| G.2 | ALL | notification badge | P56 |
| G.3 | ALL | skill count | P56+P60 |
| 4.7 | hitl | subagent tree connectors | P57 |
| 6.1 | subagent | tree connectors missing | P57 |
| 6.2 | subagent | intermediate text as tree items | P57 |
| 5.1 | streaming | spinner position | P57+P62 |
| 4.1 | hitl | dialog title | P58 |
| 4.2 | hitl | command display | P58 |
| 4.3 | hitl | permission rule note | P58 |
| 4.4 | hitl | radio button style | P58 |
| 4.5 | hitl | navigation hint | P58 |
| 4.6 | hitl | "Waiting for approval..." | P58+P62 |
| 7.1 | shortcuts | inline vs overlay | P59 |
| 7.2 | shortcuts | two-column layout | P59 |
| 7.3 | shortcuts | tmux warning | P59 |
| 7.4 | shortcuts | separator line | P59 |
| 1.1 | welcome | DensityOrb | P59 |
| 1.2 | welcome | title text | P59 |
| 1.3 | welcome | help hint color | P59 |
| 1.4 | welcome | Tab/Shift+Tab hint | P59 |
| 1.7 | welcome | input box height | P59+P62 |
| 9.1 | skills | Skills modal | P60 |
| 8.4 | cmd-palette | category column | P61 |
| 8.2 | cmd-palette | title color | P61 |
| 8.3 | cmd-palette | `> ` prompt | P61 |
| 8.6 | cmd-palette | count display | P61 |
| 5.3 | streaming | Running tools footer | P62 |
| 3.4 | conversation | OSC 8 links | P62 |
| 6.3 | streaming | footer wave char | P62 |
| 8.1 | cmd-palette | border style | P62 |
| 8.5 | cmd-palette | first item highlight | P62 |
