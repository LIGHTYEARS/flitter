---
title: Subagent Delegation Pitfalls
date: 2026-04-09
trigger: delegating analysis of interactive TUI behavior to subagents
tags: [subagent, debugging, runtime-verification, instruction-design]
severity: high
---

# Subagent Delegation Pitfalls

## Incident

Delegated three `search` subagents to investigate whether `?` and `/` keys trigger AMP UI features (shortcuts help toggle, command palette). All three subagents concluded **incorrectly** that these were not gaps, based solely on source code analysis of minified/obfuscated JS.

Runtime verification via `tmux send-keys` proved both conclusions wrong: `/` does open the command palette, and `?` does toggle shortcuts help.

## Root Causes

### 1. Instruction framed only the visual dimension (50%)

The instruction asked "does `? for shortcuts` appear on the welcome screen?" — this led subagents to check the AMP golden file for the text, confirm it's absent, and conclude "not a gap." The correct question should have been two-dimensional:

- **Visual**: "Is this text rendered on screen?"
- **Behavioral**: "Does pressing this key trigger a function?"

**Rule**: For interactive features, always decompose into visual + behavioral dimensions in the instruction.

### 2. No runtime verification instruction (25%)

The instruction only asked subagents to read files and grep source code. It never asked them to run `tmux send-keys -t amp '?'` and capture the result. Even if it had, `search` subagents lack `RunCommand` capability.

**Rule**: For behavior verification tasks, use `general_purpose_task` subagents (which have `RunCommand`), not `search` subagents (read-only). Include explicit `tmux send-keys` + `tmux capture-pane` steps in the instruction.

### 3. Minified source code + naive regex (15%)

AMP source files are single-line minified JS. Subagents used regex patterns like `===\s*['"]/['"]` which can miss or mismatch in dense single-line code. The `/` trigger was in `textChangeListener` — a function the subagent found but failed to extract the full body from because it's semicolon-delimited on one line.

**Rule**: When analyzing minified/obfuscated source, instruction must include a pretty-print step: `tr ';' '\n'` or `js-beautify` before searching. Never trust regex on minified single-line code.

### 4. Confirmation bias in subagent reasoning (10%)

The subagent found `keys: "Ctrl+O"` mapped to `"command palette"` in the shortcuts data file and stopped searching. It didn't consider that the same feature might have multiple trigger paths (Ctrl+O via key event AND `/` via text change listener).

**Rule**: Instruction should explicitly state "enumerate ALL trigger paths, not just the first one found" when asking about feature activation mechanisms.

## Prevention Checklist

Before delegating interactive feature analysis:

1. [ ] Does the instruction include both visual AND behavioral verification?
2. [ ] Is the subagent type `general_purpose_task` (not `search`) if runtime verification is needed?
3. [ ] Does the instruction include `tmux send-keys` + `tmux capture-pane` steps?
4. [ ] Does the instruction require pretty-printing minified source before analysis?
5. [ ] Does the instruction explicitly ask to enumerate ALL trigger paths?

## AGENTS.md Principle Reinforced

> **Runtime evidence over source reading**: Diagnose bugs from runtime output (logs, tree dumps, intercepted mutations). Never reason from source code alone when runtime evidence is available.

This incident proves the principle applies equally to subagent delegation: never trust a subagent's source-code-only conclusion about interactive behavior when a tmux session is available for runtime verification.
