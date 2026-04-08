# UAT Gap Checklist — Milestone v0.4.0 Round 0

Verification: tmux capture-pane (244x63) vs 9 AMP golden scenes
Scenes: welcome, conversation-reply, input-with-message, streaming-with-subagent, subagent-in-progress, hitl-confirmation, skills-popup, shortcuts-popup, slash-command-popup

## Critical

- [ ] **GAP-C1** DensityOrb ASCII art 渲染降级 — AMP 显示 17 行精细 `.:-=+*` 梯度椭球体，flitter-cli 仅 ~5 行稀疏 `....`。`fbm()` 返回值落在 `[-1,1]` 但映射逻辑假设 `[0,1]`，密度字符钳位到最低级别。
  - scene: welcome
  - root cause: `density-orb.ts` render() 中 `n * edgeFade` 值域问题
  - fix: `(n + 1) / 2` 正规化 fbm 返回值

- [ ] **GAP-C2** 缺少 InputArea 框外 Footer 状态栏 — AMP 在 `╰─╯` 下方渲染独立 footer 行：工具执行时 `≋ Running tools... Esc to cancel`，权限等待时 `Waiting for approval... Esc to cancel`。StatusBar 已 deprecated 并从 AppShell 移除。
  - scene: streaming-with-subagent, subagent-in-progress, hitl-confirmation
  - root cause: `app-shell.ts` Column children 中 InputArea 之后无 footer widget
  - fix: AppShell Column 追加条件 footer widget + WaveTildeSpinner

## Major

- [ ] **GAP-M1** DensityOrb 缺少逐字符绿色渐变着色 — AMP 使用 `[38;2;R;G;Bm` 24-bit true color per-character 暗绿→亮绿渐变，flitter-cli 使用单一 `Color.green` + dim。
  - scene: welcome
  - root cause: `density-orb-widget.ts` 使用固定 Color.green 而非按密度级别映射 RGB
  - fix: DensityOrbWidgetState 中按密度级别映射 24-bit RGB green 值

- [ ] **GAP-M2** 缺少 `≋`/`∼` 波浪动画指示器 — Footer 左端活动状态动画字符，在 `≋` (U+224B) 和 `∼` (U+223C) 间交替。
  - scene: streaming-with-subagent, subagent-in-progress
  - root cause: 无对应组件实现
  - fix: 新建 WaveTildeSpinner widget

- [ ] **GAP-M3** Permission reason 文本数据管道断裂 — `PermissionContentPreview.reason` 类型和渲染逻辑已就绪，但 `_buildContentPreview()` 从未设置此字段。AMP 显示 `(Matches built-in permissions rule 25: ask Bash)`。
  - scene: hitl-confirmation
  - root cause: `app-state.ts` `_buildContentPreview()` 所有分支未生成 reason
  - fix: bash 分支中添加 reason 生成逻辑

## Minor

- [ ] **GAP-m1** "Welcome to Amp" 文字缺少逐字符绿色渐变 — AMP 使用 true-color 渐变（亮→暗），flitter-cli 使用 `Color.green + dim` 单色。
  - scene: welcome

- [ ] **GAP-m2** InputArea top-right: `0` vs `77` skills, 缺少 `!` 警告 — 运行时 skillCount=0 因未加载 skills。配置层面问题，非代码缺陷。
  - scene: welcome

- [ ] **GAP-m3** Bottom-right 路径格式差异 — flitter-cli 显示全路径截断 `...o/studio/flitter/packages/flitter-cli`，AMP 显示 tilde 缩写 + git 分支 `~/.oh-my-coco/studio/flitter (master)`。
  - scene: welcome

- [ ] **GAP-m4** 已完成 Bash 命令显示格式 — AMP: `$ sleep 60`（精简无工具名），flitter-cli: `✓ Bash $ sleep 60`（含 checkmark + 工具名）。
  - scene: subagent-in-progress

- [ ] **GAP-m5** 命令列表多 2 条 — flitter-cli 比 AMP 多 `context detail` 和 `context file changes`。扩展功能不影响兼容性。
  - scene: slash-command-popup

- [ ] **GAP-m6** Scrollbar 始终渲染 — 命令列表不需要滚动时 AMP 不显示 scrollbar。需确认 flitter-core 是否自动隐藏。
  - scene: slash-command-popup

## Cosmetic

- [ ] **GAP-c1** 光标渲染差异 — AMP 使用 `[7m ` 反色空格，flitter-cli 使用 `█` 全块字符。
  - scene: welcome

- [ ] **GAP-c2** 活动中 Bash 命令格式 — AMP: `⣓ sleep 60`（仅 spinner + 命令），flitter-cli: `⣓ Bash $ sleep 60`（含工具名）。
  - scene: streaming-with-subagent

## Fully Matched Scenes (no gaps)

- [x] **shortcuts-popup** — ShortcutHelpInline 内嵌 InputArea，双列布局、tmux 适配、分隔线均一致
- [x] **skills-popup** — 圆角边框、分组列表、滚动条、键盘导航、页脚均一致
- [x] **conversation-reply** — 用户消息 `┃` 前缀、工具调用 header、Markdown 渲染、四角 border overlay 均一致
- [x] **input-with-message** — welcome 状态 + 输入文字场景，DensityOrb + InputArea 已实现

## Summary

| Severity | Count |
|----------|-------|
| Critical | 2     |
| Major    | 3     |
| Minor    | 6     |
| Cosmetic | 2     |
| **Total**| **13**|
