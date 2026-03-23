# Flutter-TUI Development Instructions

## Goal: 100% Fidelity to Amp CLI TUI

This project reproduces the TUI rendering architecture from the Amp CLI binary. Every class, lifecycle method, algorithm, and rendering behavior must match the reverse-engineered original.

## Reference Materials

### Primary Source
- **Amp binary**: `/home/gem/home/tmp/amp-binary` (107MB ELF, Bun --compile)
- **Extracted strings**: `/home/gem/home/tmp/amp-strings.txt` (531,013 lines)

### Structured References
- `.reference/widget-tree.md` — Widget/State lifecycle
- `.reference/element-tree.md` — Element reconciliation, BuildOwner
- `.reference/render-tree.md` — RenderObject layout/paint protocol
- `.reference/screen-buffer.md` — Double-buffered rendering, diff, ANSI
- `.reference/frame-scheduler.md` — 4-phase pipeline
- `.reference/input-system.md` — Keyboard/mouse, focus
- `.reference/widgets-catalog.md` — Built-in widgets

### Planning Documents
- `.planning/PROJECT.md` — Project definition, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 65 v1 requirements with traceability
- `.planning/ROADMAP.md` — 8 phases, 25 plans, parallel wave strategy
- `.planning/STATE.md` — Current progress tracking

## Development Rules

### MANDATORY: Amp Reference Compliance (Anti-Drift Rule)

**This is the single most important rule in this project.**

Every implementation in this codebase MUST faithfully reproduce the architecture from the Amp CLI reverse-engineered source. Agents MUST NOT design their own solutions when an Amp reference exists.

#### For Implementing Agents (executor/planner/researcher):

1. **Read before write**: Before implementing ANY class, method, or wiring logic, you MUST read the corresponding `.reference/` file and locate the exact Amp code pattern. Do NOT skip this step.
2. **No original design**: If Amp does X, we do X. Do not "improve", "simplify", or "redesign" the architecture. The goal is fidelity, not innovation.
3. **Cite specific Amp code**: Every non-trivial implementation must include a comment citing the Amp reference (e.g., `// Amp ref: J3.runApp() — widget-tree.md:1189`). If you cannot find a reference, flag it as a deviation.
4. **Singleton ownership must match Amp**: J3 (WidgetsBinding) owns wB0 (TerminalManager), c9 (FrameScheduler), NB0 (BuildOwner), UB0 (PipelineOwner). Do not scatter ownership into standalone functions or `runApp()`.
5. **Wiring must match Amp**: If Amp's `NB0.scheduleBuildFor()` calls `c9.instance.requestFrame()` directly, our BuildOwner must do the same. Do not add intermediate layers.

#### For Review Agents (verifier/checker):

1. **Cross-reference check**: For each implemented file, verify the implementation against the corresponding `.reference/` document. Check that:
   - Class structure matches (fields, methods, ownership)
   - Call chains match (who calls whom, in what order)
   - Singleton wiring matches (who creates whom, who holds references)
2. **Flag deviations**: Any implementation that does not match Amp must be flagged as BLOCK, with the specific Amp reference that should have been followed.
3. **No "it works" exemptions**: Even if tests pass, an architecturally incorrect implementation must be flagged. Passing tests do not validate architectural fidelity.

#### Key Amp Architecture Patterns to Enforce:

| Pattern | Amp Way | Common Anti-Pattern |
|---------|---------|---------------------|
| Frame scheduling | `c9.instance.requestFrame()` called directly by BuildOwner/PipelineOwner | WidgetsBinding wrapping with its own `_frameScheduled` flag |
| Terminal init | `J3.runApp()` calls `this.tui.init()` (J3 owns wB0) | Standalone `runApp()` function creating BunPlatform externally |
| Input wiring | `wB0` owns parser, J3.setupEventHandlers() connects to FocusManager | Standalone InputBridge created in runApp() |
| setState chain | `markNeedsRebuild()` → `XG8().scheduleBuildFor()` → `NB0.add + c9.requestFrame()` | Element.markNeedsRebuild() not calling scheduleBuildFor |
| Frame execution | `c9.executeFrame()` calls registered callbacks (no J3.drawFrame()) | Dual execution paths (drawFrame + FrameScheduler callbacks) |

#### Reference File Index:

| Topic | Reference File | Key Sections |
|-------|---------------|--------------|
| WidgetsBinding (J3) | `.reference/widget-tree.md` | Lines 1134-1236 (class J3, runApp) |
| BuildOwner (NB0) | `.reference/element-tree.md` | Lines 1277-1320 (scheduleBuildFor, buildScopes) |
| Element.markNeedsRebuild | `.reference/element-tree.md` | Lines 289-293 (XG8 call chain) |
| FrameScheduler (c9) | `.reference/frame-scheduler.md` | Lines 78-213 (requestFrame, executeFrame) |
| TerminalManager (wB0) | `.reference/screen-buffer.md` | Lines 709-780 (class wB0, init/render) |
| Input pipeline | `.reference/input-system.md` | Lines 601-634 (full stdin→widget flow) |
| setState flow | `.reference/element-tree.md` | Lines 1631-1680 (complete setState→frame chain) |

### Before Implementing Any Class
1. **Search reference first**: Check `.reference/` for the corresponding Amp patterns
2. **Search strings**: `grep -n "pattern" /home/gem/home/tmp/amp-strings.txt` for additional context
3. **Match behavior**: Reproduce the exact method signatures, lifecycle order, and algorithm steps
4. **Document source**: Add `// Amp ref: amp-strings.txt:NNNN` comments for key implementations

### Code Style
- TypeScript strict mode
- Abstract classes (not interfaces) for Widget/Element/RenderObject hierarchy
- Options objects for constructors with >2 parameters
- Discriminated unions for InputEvent types
- Integer coordinates only (col, row)
- Zero transitive runtime dependencies

### Testing (TDD)
- Write tests BEFORE implementation
- `bun test` for all tests
- >80% coverage on core modules
- Use `WidgetTester` / `TestTerminal` / `pump()` helpers for widget tests

### Commit Convention
- Run `bun test` before every commit
- Atomic commits per plan/feature
- Reference phase and plan in commit messages (e.g., "feat(phase-1/01-01): implement Offset, Size, Rect types")

## Known Minified Identifiers

When searching amp-strings.txt, these minified names map to our classes:

| Amp | Our Class | Module |
|-----|-----------|--------|
| Sf | Widget | framework/widget.ts |
| H3 | StatelessWidget | framework/widget.ts |
| H8 | StatefulWidget | framework/widget.ts |
| _8 | State | framework/state.ts |
| Bt | InheritedWidget | framework/inherited-widget.ts |
| T/lU0 | Element | framework/element.ts |
| NB0 | BuildOwner | framework/build-owner.ts |
| j9 | RenderBox | framework/render-object.ts |
| UB0 | PipelineOwner | framework/pipeline-owner.ts |
| c9 | FrameScheduler | scheduler/frame-scheduler.ts |
| ij | ScreenBuffer | terminal/screen-buffer.ts |
| wB0 | TerminalManager | terminal/terminal-io.ts |
| BB0 | PerformanceOverlay | diagnostics/perf-overlay.ts |
| J3 | WidgetsBinding | framework/binding.ts |
| e0 | Text | widgets/text.ts |
| o8 | Column | widgets/flex.ts |
| q8 | Row | widgets/flex.ts |
| R4 | SingleChildScrollView | widgets/scroll-view.ts |
| X0 | SizedBox | widgets/sized-box.ts |
| R8 | Padding | widgets/padding.ts |
| A8 | Container | widgets/container.ts |
| u3 | Expanded | widgets/flex.ts |
| jA | Table | widgets/table.ts |

## Parallel Development

Use the 6-wave strategy from ROADMAP.md. Within each wave, agents can work independently on different plans. Always reference the wave table before starting parallel work.
