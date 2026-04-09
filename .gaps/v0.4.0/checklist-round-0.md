# UAT Gap Checklist — Milestone v0.4.0 Round 0

Verification: tmux capture-pane (244x63) vs 9 AMP golden scenes
Scenes: welcome, conversation-reply, input-with-message, streaming-with-subagent, subagent-in-progress, hitl-confirmation, skills-popup, shortcuts-popup, slash-command-popup

## Runtime Investigation (tmux session `amp` vs `flitter`)

### "? for shortcuts" footer hint
- AMP 源码 `30_main_tui_state.js` 确认：当 `C.type === "none"` 且 `text === ""` 且 `launchCount < 10` 时，footer 渲染 `? for shortcuts` 提示。是**有条件的 footer hint**（非欢迎屏幕组件）。
- AMP runtime 中未观察到此提示（launchCount 已 >= 10）。
- **flitter-cli 缺失此功能** → 新增 GAP-m9

### "?" toggle shortcuts help
- AMP 中 `?` 直接触发了 shortcuts help 面板的 toggle（tmux capture 确认）。
- AMP 通过 **textChangeListener** 检测 `text === "?"`，清除输入并 toggle `isShowingShortcutsHelp`。
- flitter-cli 中 `?` 被 TextField 消费为可打印字符（charCode > 0x20），ShortcutRegistry 中注册的 `?` binding 永远不会触发。
- **flitter-cli 缺失此功能** → 新增 GAP-C4

### "/" trigger command palette
- AMP 中 `/` **确实打开了 Command Palette**（tmux capture 确认），并弹出 toast "Use Ctrl-O to open the command palette"。
- AMP 源码 `30_main_tui_state.js` L278：`if (R === "/" && !this.handoffState.isGeneratingHandoff) { this.showCommandPalette(); this.textController.clear(); this.toastController.show("Use [[Ctrl-O]] to open the command palette", "warning"); }`
- flitter-cli 中 `/` 被 TextField 消费为文本，不触发任何功能。
- **flitter-cli 缺失此功能** → 新增 GAP-C5

### Ctrl+O command palette
- AMP 中 `Ctrl+O` 正确打开 Command Palette（tmux capture 确认）。
- flitter-cli 中 `Ctrl+O` 事件正确传播到 ShortcutRegistry 并匹配 `open-command-palette`，action 返回 `'handled'`。
- **但 command palette overlay 未正确渲染**：触发后 InputArea 文本消失，`RenderFlex overflowed by Infinitypx on the bottom` 错误出现，后续按键事件不再传播。
- **flitter-cli 缺失此功能** → 升级为 GAP-C6

### DensityOrb 密度层级
- AMP runtime 中 DensityOrb 使用 **8 级**密度字符 ` .:-=+*#`（含 `#` 井号），不是之前假设的 7 级。
- 更新 GAP-m8 描述。

### "$" shell mode
- AMP 中 `$` 正确触发 shell mode（InputArea 顶部显示 `shell mode` 标签）。
- flitter-cli 已实现 `$` shell mode 检测 → 匹配。

## Critical

- [x] **GAP-C1** DensityOrb ASCII art 渲染降级
  - fix: **已修复** — fbm() 归一化 + contrast remap + gamma + 确定性种子

- [x] **GAP-C2** 缺少 InputArea 框外 Footer 状态栏
  - fix: **已修复** — StatusBar 恢复到 AppShell Column，`getFooterText()` + `getWavePrefix()` 实现 AMP 07a/07b/08 状态映射，`isAwaitingPermission`/`hasRunningTools`/`hasStartedResponse` 已从 AppState 接入
  - remaining: `isExecutingCommand`/`isRunningShell`/`isAutoCompacting`/`isHandingOff` 硬编码 `false`（见 GAP-m7）

- [x] **GAP-C3** 发送消息后无响应 `No API provider`
  - fix: **已修复** — factory.ts model fallback

- [ ] **GAP-C4** (**新**) `?` 无法 toggle shortcuts help 面板 — AMP 中 `?` 通过 textChangeListener 检测，清除输入并 toggle `isShowingShortcutsHelp`。flitter-cli 中 `?` 被 TextField 消费为可打印字符，ShortcutRegistry 中的 `?` binding 因事件不冒泡而永远无法触发。
  - scene: welcome, 所有有 InputArea 的场景
  - root cause: `?` 是 charCode > 0x20 的可打印字符，TextField._handleKeyEvent 返回 `'handled'`，事件不冒泡到 FocusScope
  - AMP ref: `30_main_tui_state.js` textChangeListener 检测 `text === "?"`
  - fix: 在 `input-area.ts` 的 `_onTextChanged` 中添加 `text === "?"` 检测，清除输入并 toggle shortcuts help

- [ ] **GAP-C5** (**新**) `/` 无法唤起 Command Palette — AMP 中 `/` 通过 textChangeListener 检测，打开 command palette 并显示 toast。flitter-cli 中 `/` 被 TextField 消费为文本。
  - scene: welcome, 所有有 InputArea 的场景
  - root cause: 同 GAP-C4，`/` 是可打印字符
  - AMP ref: `30_main_tui_state.js` L278: `if (R === "/") { this.showCommandPalette(); this.textController.clear(); this.toastController.show("Use [[Ctrl-O]]...") }`
  - fix: 在 `input-area.ts` 的 `_onTextChanged` 中添加 `text === "/"` 检测，清除输入并调用 `onSlashTrigger` 回调

- [ ] **GAP-C6** (**新**) Command Palette overlay 渲染崩溃 — `Ctrl+O` 快捷键正确匹配并调用 `_showCommandPalette()`，但 overlay 渲染触发 `RenderFlex overflowed by Infinitypx on the bottom`，导致 InputArea 文本消失、后续按键事件不再传播。
  - scene: 所有有 InputArea 的场景
  - root cause: Command Palette overlay 布局未正确约束高度，导致 RenderFlex overflow Infinity
  - fix: 调试 command-palette.ts 或 overlay-manager 的布局约束

## Major

- [x] **GAP-M1** DensityOrb 缺少逐字符绿色渐变着色
  - fix: **已修复** — `density-orb-widget.ts` 按密度级别映射 24-bit RGB `(0,55,20)` → `(0,255,136)`

- [x] **GAP-M2** 缺少 `≋`/`∼` 波浪动画指示器
  - fix: **已修复** — `status-bar.ts` `getWavePrefix()` 返回 `∼` (Waiting) / `≋` (Running)

- [x] **GAP-M3** Permission reason 文本数据管道断裂
  - fix: **已修复** — `app-state.ts` `_buildContentPreview()` 所有分支已添加 reason 字段（bash→"ask Bash", edit→"ask Edit", create→"ask Create", default→"ask Tool"）

## Minor

- [ ] **GAP-m1** "Welcome to Amp" 文字缺少逐字符绿色渐变 — AMP ANSI golden 确认使用 14 个逐字符 24-bit RGB 渐变：`(0,174,89)` → `(0,92,41)`，flitter-cli 使用 `Color.green + dim` 单色。
  - scene: welcome
  - AMP ref: `ansi-63x244.golden L26` 逐字符 `[38;2;R;G;Bm`
  - fix: 将单一 TextSpan 替换为 14 个 TextSpan，逐字符线性插值 `Color.rgb(0,174,89)` → `Color.rgb(0,92,41)`

- [x] **GAP-m2** InputArea top-right skills 计数
  - fix: **已修复** — skill-loader.ts 扫描器

- [x] **GAP-m3** Bottom-right 路径格式差异
  - fix: **已修复** — git repoRoot + tilde 缩写

- [x] **GAP-m4** 已完成 Bash 命令显示格式
  - fix: **已修复** — `bash-tool.ts` `name: ''`，completed 状态 `$ {shortCmd}`，`tool-header.ts` 空名时跳过 statusIcon+name

- [ ] **GAP-m5** 命令列表多 2 条 — flitter-cli 比 AMP 多 `context detail` 和 `context file changes`。
  - scene: slash-command-popup

- [ ] **GAP-m6** Scrollbar 始终渲染 — 命令列表不需要滚动时 AMP 不显示 scrollbar。
  - scene: slash-command-popup

- [ ] **GAP-m7** (**新**) StatusBar TODO 字段未接线 — `app-shell.ts L959-962` 中 `isExecutingCommand`/`isRunningShell`/`isAutoCompacting`/`isHandingOff` 硬编码 `false`。当 agentic loop 实际执行 bash/shell 时 StatusBar 可能无法正确显示状态。
  - scene: streaming-with-subagent, subagent-in-progress
  - fix: 将 AppState 的相应字段接入 StatusBar props

- [ ] **GAP-m8** (**新**) DensityOrb 密度字符集不完整 — AMP runtime 确认使用 **8 级**密度字符 ` .:-=+*#`（含 `#` 井号），flitter-cli 仅定义 7 级 ` .:-=+*`。动画中 `+` 偶尔出现但 `*` 和 `#` 从未出现。
  - scene: welcome
  - root cause: (1) `WELCOME_DENSITY_CHARS` 缺少 `#`；(2) noise 参数调优不足，值域上限达不到高密度级别
  - fix: 添加 `#` 到密度字符集；增大 contrast 增益或降低 gamma

- [ ] **GAP-m9** (**新**) 缺少 `? for shortcuts` footer hint — AMP 在 `type === "none"` 且 `text === ""` 且 `launchCount < 10` 时，footer 显示 `? for shortcuts` 提示。flitter-cli 无此功能。
  - scene: welcome（首次启动或早期使用）
  - AMP ref: `30_main_tui_state.js` L213-218: `if (C.type === "none" && !this.isShowingShortcutsHelp && this.textController.text === "" && g) return new F("", void 0, [new F("?", new iR({color: T.keybind})), new F(" for shortcuts", ...)])`
  - fix: StatusBar 在 idle 状态且输入为空时渲染 `? for shortcuts` hint

## Cosmetic

- [ ] **GAP-c1** 光标渲染差异 — AMP 使用 `[7m ` (reverse video 空格)，flitter-cli 使用 `█` 全块字符。所有含输入框的 AMP ANSI golden 均确认 `[7m `。
  - scene: welcome, conversation-reply, input-with-message
  - fix: `streaming-cursor.ts` 使用 reverse video TextStyle 替代 `CURSOR_CHAR = '\u2588'`

- [x] **GAP-c2** 活动中 Bash 命令格式
  - fix: **已修复** — 与 GAP-m4 同步修复，`bash-tool.ts` `name: ''` + `tool-header.ts` 空名跳过

## Fully Matched Scenes (no gaps)

- [x] **shortcuts-popup** — ShortcutHelpInline 内嵌 InputArea，双列布局、tmux 适配、分隔线均一致
- [x] **skills-popup** — 圆角边框、分组列表、滚动条、键盘导航、页脚均一致
- [x] **conversation-reply** — 用户消息 `┃` 前缀、工具调用 header、Markdown 渲染、四角 border overlay 均一致
- [x] **input-with-message** — welcome 状态 + 输入文字场景，DensityOrb + InputArea 已实现

## Summary

| Severity | Count | Fixed | Open |
|----------|-------|-------|------|
| Critical | 6     | 3     | 3    |
| Major    | 3     | 3     | 0    |
| Minor    | 9     | 3     | 6    |
| Cosmetic | 2     | 1     | 1    |
| **Total**| **20**| **10**| **10**|

### Open items (prioritized)
- **Critical**: GAP-C6 (command palette overlay 渲染崩溃), GAP-C4 (`?` toggle shortcuts), GAP-C5 (`/` trigger command palette)
- **Minor**: GAP-m1 (Welcome 渐变), GAP-m5 (多余命令), GAP-m6 (scrollbar), GAP-m7 (StatusBar 接线), GAP-m8 (DensityOrb `#` 缺失), GAP-m9 (`? for shortcuts` hint)
- **Cosmetic**: GAP-c1 (光标 reverse video)
