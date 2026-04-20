# Plan Index

> Last updated: 2026-04-20

## Active Plans (21)

Plans describing work that maps to open gaps in GAPS.md.

### Critical + High Priority

| File | Gap ID | Description |
|------|--------|-------------|
| [gap-closure-phase1](2026-04-20-gap-closure-phase1.md) | Multiple | Consolidated plan for 7 Critical+High gaps |
| [gap-closure-phase2-3](2026-04-20-gap-closure-phase2-3.md) | Multiple | LLM provider gaps + compaction pinning |
| [gap2-missing-builtin-tools](2026-04-19-gap2-missing-builtin-tools.md) | GAP-TOOL-01 | `apply_patch` tool (partially done — other tools shipped) |
| [gap5-plugin-system](2026-04-19-gap5-plugin-system.md) | GAP-CORE-01 | Plugin system container wiring |
| [approval-widget](2026-04-19-approval-widget.md) | GAP-TUI-02 | 5-option approval flow |
| [image-display](2026-04-19-image-display.md) | GAP-TUI-01 | Kitty Graphics Protocol ImageWidget |

### Medium Priority

| File | Gap ID | Description |
|------|--------|-------------|
| [animated-spinner](2026-04-19-animated-spinner.md) | GAP-TUI-09 | Wire BrailleSpinner animation timer |
| [compaction-pinning](2026-04-19-compaction-pinning.md) | GAP-CORE-02 | Info-role message pinning in compaction |
| [config-admin-scope](2026-04-19-config-admin-scope.md) | — | Admin config scope + `.claude/` discovery |
| [gap3-agent-modes](2026-04-19-gap3-agent-modes.md) | — | smart/fast/deep/auto mode system |
| [gap4-tool-execution-batching](2026-04-19-gap4-tool-execution-batching.md) | — | Resource-based parallel tool batching |
| [gap6-toolbox-service](2026-04-19-gap6-toolbox-service.md) | GAP-CLI-05 | Toolbox script discovery + `tools make` |
| [gap7-hooks-enhancements](2026-04-19-gap7-hooks-enhancements.md) | — | compatibilityDate, redact-tool-input, lifecycle hooks |
| [gap8-theme-system](2026-04-19-gap8-theme-system.md) | GAP-TUI-16 | Custom TOML theme loading |
| [gap9-execute-mode-flags](2026-04-19-gap9-execute-mode-flags.md) | — | `--stats`, `--archive`, `--label` flags |
| [memory-system](2026-04-19-memory-system.md) | — | Cross-session memory + `/memory` command |
| [overlay-background-fix](2026-04-19-overlay-background-fix.md) | GAP-TUI-10 | Overlay background bleed fix |
| [slash-commands](2026-04-19-slash-commands.md) | GAP-CLI-22/23/24/25 | Wire interactive slash commands |
| [regression-prevention](2026-04-19-regression-prevention.md) | — | `renderToScreen()` test harness + tmux E2E |
| [tool-timeout](2026-04-19-tool-timeout.md) | — | Per-tool execution timeout |

---

## Completed Plans (27)

All work shipped. Kept for historical reference. Each file has a `STATUS: COMPLETED` banner.

| File | What shipped |
|------|-------------|
| [debug-logger-system](2026-04-16-debug-logger-system.md) | ScopedLogger + FLITTER_LOG_LEVEL gating |
| [mouse-dispatch-pipeline](2026-04-16-mouse-dispatch-pipeline.md) | MouseManager click/hover/drag/scroll |
| [tier1-correctness-fixes](2026-04-16-tier1-correctness-fixes.md) | 8 render-object correctness fixes |
| [tier2-wave1-primitives](2026-04-16-tier2-wave1-primitives.md) | 7 tree primitives |
| [tier2-wave2-focus-actions](2026-04-16-tier2-wave2-focus-actions.md) | Focus, Actions/Intents, Shortcuts |
| [tier2-wave3-scrollable](2026-04-16-tier2-wave3-scrollable.md) | Scrollable rewrite with ScrollBehavior |
| [cli-subcommands](2026-04-17-cli-subcommands.md) | config + threads CLI commands |
| [commandpalette-mousemanager](2026-04-17-commandpalette-mousemanager.md) | CommandPalette + FuzzyPicker |
| [input-field-enhancements](2026-04-17-input-field-enhancements.md) | InputField adaptive width, @-mention, history |
| [live-status-bar](2026-04-17-live-status-bar.md) | StatusBar with inference/token/compaction state |
| [textfield-scrollbar](2026-04-17-textfield-scrollbar.md) | RenderObject TextField + Scrollbar |
| [toast-overlay-dialogs](2026-04-17-toast-overlay-dialogs.md) | ToastManager + ErrorDialog |
| [tool-activity-rendering](2026-04-17-tool-activity-rendering.md) | Tool-use/tool-result display items |
| [tool-approval-flow](2026-04-17-tool-approval-flow.md) | Approval Promise bridge (2-option) |
| [container-wiring](2026-04-18-container-wiring.md) | All 6 container callbacks wired |
| [mcp-tools-integration](2026-04-18-mcp-tools-integration.md) | MCP tool bridge to ToolRegistry |
| [missing-cli-commands](2026-04-18-missing-cli-commands.md) | mcp, permissions, tools CLI groups |
| [subagent-task-tool](2026-04-18-subagent-task-tool.md) | Task tool + SubAgentManager |
| [thread-persistence](2026-04-18-thread-persistence.md) | Auto-save, loadAll hydration, --continue |
| [bedrock-provider](2026-04-19-bedrock-provider.md) | AWS Bedrock provider (flitter extension) |
| [cli-flags](2026-04-19-cli-flags.md) | --print, --pipe, --max-turns, --model, etc. |
| [cost-tracking](2026-04-19-cost-tracking.md) | SessionCostTracker + pricing table |
| [diff-viewer](2026-04-19-diff-viewer.md) | Inline diff viewer for Edit tool |
| [gap1-missing-cli-commands](2026-04-19-gap1-missing-cli-commands.md) | 17 CLI subcommands |
| [gap10-github-integration-tools](2026-04-19-gap10-github-integration-tools.md) | 7 GitHub tools |
| [hook-wiring](2026-04-19-hook-wiring.md) | PreToolUse/PostToolUse hook wiring |
| [retry-backoff](2026-04-19-retry-backoff.md) | RetryScheduler + 7 error classifiers |
| [secret-storage](2026-04-19-secret-storage.md) | FileSecretStorage + native keyring |
| [thread-resume](2026-04-19-thread-resume.md) | Stream recovery on resume |
| [title-generation](2026-04-19-title-generation.md) | Background Haiku title generation |

---

## Stale / Superseded (2)

| File | Reason |
|------|--------|
| [flitter-doc-site](2026-04-16-flitter-doc-site.md) | Chinese rspress doc site — unrelated to amp parity |
| [health-overview](2026-04-19-health-overview.md) | Superseded by GAPS.md |
