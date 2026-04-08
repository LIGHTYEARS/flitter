# Close Round 0 Gaps Spec

## Why
UAT 验证发现 13 个 visual gaps。本 spec 严格参照 AMP 反编译源码 (`tmux-capture/amp-source/`) 中的确切实现来修复。

## What Changes
- **GAP-C1**: 修复 `PerlinNoise.fbm()` 返回值域 `[-1,1]` → `[0,1]`，使 DensityOrb ASCII art 正确渲染
- **GAP-C2**: 恢复 `StatusBar` 到 AppShell Column layout（Phase 23 移除了它，但 AMP 仍有 footer 行）
- **GAP-M1**: DensityOrb per-cell RGB 渐变（代码已存在于 `density-orb-widget.ts:165-168`，被 C1 阻塞）
- **GAP-M2**: Footer 行使用静态波浪字符前缀（AMP 分析确认 "Static wave chars", 非动画）
- **GAP-M3**: 在 `_buildContentPreview()` 中生成 permission reason 文本
- **GAP-m3**: 修复 bottom-right 路径格式（AMP 使用 `toHomeRelative` + `shorten` + `buildDisplayText` + `currentGitBranch`）
- **GAP-m4 + GAP-c2**: BashTool 精简显示（AMP `01_activity_group_widget_G1R.js` 中 bash 工具不显示工具名前缀）

**BREAKING**: 无

## AMP Source References

| Gap | AMP Source File | Key Symbol |
|-----|----------------|------------|
| C1 | N/A (DensityOrb 是 flitter 独有实现，但 `density-orb-widget.ts` 使用 `PerlinNoise.fbm()` 的注释标称 `[0,1]` 但实际返回 `[-1,1]`) | `PerlinNoise.fbm()` line 222 |
| C2 | `07a_footer_status_yB.js` — 状态判定逻辑 | `yB()` → `{type:"simple", message:"Running tools..."}` |
| C2 | `07b_footer_status_zB0.js` — message 提取 | `zB0()` → 纯文本 |
| C2 | `08_footer_status_iO0.js` — 简化状态映射 | `iO0()` — `"running_tools" → "Running tools..."`, `"awaiting_approval" → "Waiting for approval..."` |
| M3 | `10_confirmation_dialog_eTT.js` — ConfirmationDialog | `eTT` class |
| m3 | `input-area-bottom-right-builder.js` | `toHomeRelative(rR)` → `shorten(gR)` → `buildDisplayText(U, this.currentGitBranch, q, m)` |
| m4/c2 | `01_activity_group_widget_G1R.js` | bash tool header rendering |

## Impact
- Affected code:
  - `packages/flitter-cli/src/utils/perlin-animation.ts` — `fbm()` 正规化
  - `packages/flitter-cli/src/widgets/app-shell.ts` — 恢复 StatusBar 到 Column children
  - `packages/flitter-cli/src/widgets/status-bar.ts` — 取消 deprecated，更新 `getFooterText` 适配 AMP `yB()`/`iO0()` 状态表
  - `packages/flitter-cli/src/state/app-state.ts` — permission reason 生成
  - `packages/flitter-cli/src/widgets/border-builders.ts` — 路径格式对齐 AMP `buildDisplayText`
  - `packages/flitter-cli/src/widgets/tool-call/bash-tool.ts` — 精简显示

## ADDED Requirements

### Requirement: DensityOrb Correct Rendering
The system SHALL render DensityOrb ASCII art with correct density character mapping.

#### Scenario: fbm value normalization
- **WHEN** `PerlinNoise.fbm()` is called
- **THEN** it SHALL return values in `[0, 1]` (normalize from internal `[-1, 1]` via `(total / maxValue + 1) * 0.5`)
- **AND** the resulting DensityOrb SHALL display multi-level density characters `.:-=+*` instead of only `.`

### Requirement: Footer Status Bar Below InputArea
The system SHALL display a footer status bar as the last row in the AppShell Column, below InputArea, per AMP `07a_footer_status_yB.js`.

#### Scenario: Tool execution footer
- **WHEN** `threadViewState.interactionState === "tool-running"` (or flitter-cli equiv `isProcessing`)
- **THEN** the footer SHALL display `Running tools...` with left-aligned `Esc` hint `Esc to cancel`
- **AND** a static wave prefix character (`≋` or `∼`) SHALL precede the message text
- Ref: `yB()` returns `{type:"simple", message:"Running tools..."}`, golden line 63

#### Scenario: Permission waiting footer
- **WHEN** `waitingForConfirmation || interactionState === "user-tool-approval"` (or flitter-cli equiv)
- **THEN** the footer SHALL display `Waiting for approval...` with `Esc to cancel`
- Ref: `yB()` returns `{type:"simple", message:"Waiting for approval..."}`, golden line 63

#### Scenario: Streaming response footer
- **WHEN** `inferenceState === "running"` and has started streaming
- **THEN** the footer SHALL display `Streaming response...` with `Esc to cancel`

#### Scenario: Idle (no footer)
- **WHEN** no processing/streaming/approval in progress
- **THEN** the footer row SHALL NOT render (height=0)

### Requirement: Permission Reason Text
The system SHALL display the permission rule reason in the permission dialog.

#### Scenario: Bash tool permission
- **WHEN** a bash command requires permission
- **THEN** the dialog SHALL display `(Matches built-in permissions rule: ask Bash)`
- Ref: AMP `10_confirmation_dialog_eTT.js` — `eTT` receives `content` prop with reason text

### Requirement: Bottom-Right Path Format (AMP parity)
The system SHALL format the bottom-right border overlay per AMP `input-area-bottom-right-builder.js`.

#### Scenario: Path rendering
- **WHEN** rendering the bottom-right overlay
- **THEN** the cwd SHALL be converted via `toHomeRelative` (`$HOME` → `~`) then `shorten` (truncate to fit)
- **AND** `currentGitBranch` SHALL be appended via `buildDisplayText` as `path (branch)` format
- Ref: AMP code: `gR=this.toHomeRelative(rR), U=this.shorten(gR), K=this.buildDisplayText(U, this.currentGitBranch||void 0, q, m)`

### Requirement: Bash Tool Compact Display
The system SHALL display bash commands in compact format per AMP `01_activity_group_widget_G1R.js`.

#### Scenario: Completed bash command
- **WHEN** bash tool status is completed
- **THEN** display SHALL be `$ {command}` (no "Bash" tool name prefix, with `$` prefix)

#### Scenario: Running bash command
- **WHEN** bash tool status is in_progress
- **THEN** display SHALL be `{spinner} {command}` (no "Bash" tool name prefix, spinner only)

## MODIFIED Requirements
None

## REMOVED Requirements
None
