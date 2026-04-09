# Tasks

## Scaffold 层（guardrails — 行为正确性）

- [x] Task 1: **GAP-C6** 修复 Command Palette overlay 渲染崩溃
  - 文件: `packages/flitter-cli/src/widgets/command-palette.ts`, `packages/flitter-cli/src/state/overlay-manager.ts`
  - 症状: Ctrl+O 触发后 `RenderFlex overflowed by Infinitypx on the bottom`，InputArea 文本消失，后续按键全部失效
  - 调试方法: 在 flitter tmux session 启动 `bun run src/index.ts`，按 Ctrl+O，用 `tmux capture-pane -t flitter -p` 查看渲染结果。同时检查 stderr 输出（`2>/tmp/flitter-c6.log`）
  - 定位方向: CommandPalette 的 build() 返回的 widget tree 缺少高度约束，被放入 overlay Stack 时 RenderFlex 分配了 Infinity 高度。对比 skills-modal.ts（正常工作的 overlay）看它如何约束高度
  - AMP ref: AMP Command Palette 高度约束在 `32_command_palette_widget.js` 中使用 `ConstrainedBox` 或固定 maxHeight
  - 验证: Ctrl+O 后 Command Palette 正常渲染，Esc 可关闭，不出现 overflow 错误

- [x] Task 2: **GAP-C4** `?` 通过 textChangeListener 触发 toggle shortcuts help
  - 文件: `packages/flitter-cli/src/widgets/input-area.ts`, `packages/flitter-cli/src/widgets/app-shell.ts`
  - 根因: `?` 是可打印字符 (charCode 0x3F > 0x20)，TextField 在 `_handleKeyEvent` 中 `insertText("?")` 后返回 `'handled'`，事件不冒泡到 FocusScope。ShortcutRegistry 中的 `toggle-shortcut-help` binding 永远不会触发
  - 实现方案: 在 `InputAreaState._onTextChanged()` 中（现有 `$` shell mode 和 `@@` thread picker 检测逻辑之后），添加 `text === "?"` 检测：
    ```
    if (newText === '?' && oldText === '') {
      this.controller.clear();
      this.widget.onQuestionMarkTrigger?.();
    }
    ```
  - InputArea widget props 新增 `onQuestionMarkTrigger?: () => void`
  - AppShell build 中传递 `onQuestionMarkTrigger: () => this._toggleShortcutHelp()` — 复用现有 `_toggleShortcutHelp` 方法
  - AMP ref: `30_main_tui_state.js` textChangeListener 检测 `R === "?"` → `this.setState(() => this.isShowingShortcutsHelp = !this.isShowingShortcutsHelp)`
  - 验证: 空输入框键入 `?`，shortcuts help 面板 toggle 显示/隐藏，输入框保持空

- [x] Task 3: **GAP-C5** `/` 通过 textChangeListener 触发 command palette + toast
  - 文件: `packages/flitter-cli/src/widgets/input-area.ts`, `packages/flitter-cli/src/widgets/app-shell.ts`
  - 依赖: Task 1（C6 must be fixed first — command palette must render correctly）
  - 实现方案: 在 `InputAreaState._onTextChanged()` 中（`?` 检测之后），添加 `text === "/"` 检测：
    ```
    if (newText === '/' && oldText === '') {
      this.controller.clear();
      this.widget.onSlashTrigger?.();
    }
    ```
  - InputArea widget props 新增 `onSlashTrigger?: () => void`
  - AppShell build 中传递 `onSlashTrigger: () => { this._showCommandPalette(); /* TODO: toast */ }`
  - AMP ref: `30_main_tui_state.js` L278: `if (R === "/") { this.showCommandPalette(); this.textController.clear(); this.toastController.show("Use [[Ctrl-O]] to open the command palette", "warning") }`
  - 验证: 空输入框键入 `/`，command palette 打开，输入框保持空

## Detail 层（视觉细节修复）

- [x] Task 4: **GAP-m1** "Welcome to Amp" 逐字符 24-bit RGB 渐变
  - 文件: `packages/flitter-cli/src/widgets/welcome-screen.ts`
  - 当前: L123-127 使用 `new TextSpan({ text: 'Welcome to Amp', style: new TextStyle({ color: Color.green, dim: true }) })`
  - 目标: 14 个独立 TextSpan children，每字符一个 24-bit RGB：从 `Color.rgb(0, 174, 89)` 线性插值到 `Color.rgb(0, 92, 41)`
  - AMP ref: `ansi-63x244.golden L26` — 逐字符 `[38;2;R;G;Bm]`，W→(0,174,89), e→(0,170,87), ..., p→(0,92,41)
  - 验证: tmux capture-pane -t flitter -p -e 查看 ANSI 转义码，确认 14 个不同 RGB 值

- [x] Task 5: **GAP-m8** DensityOrb 密度字符补全 `#` + noise 参数调优
  - 文件: `packages/flitter-cli/src/widgets/density-orb-widget.ts`
  - 步骤:
    - [x] 5.1: `WELCOME_DENSITY_CHARS` 从 `' .:-=+*'` (7级) 改为 `' .:-=+*#'` (8级)
    - [x] 5.2: 调整 noise 参数（增大 contrast gain 或降低 gamma）使核心区域 noise 值覆盖全 8 级
  - AMP ref: AMP runtime DensityOrb 核心区域确认包含 `#######` 连片最高密度
  - 验证: tmux capture-pane 查看 DensityOrb 区域包含 `#` 字符

- [x] Task 6: **GAP-m9** `? for shortcuts` idle footer hint
  - 文件: `packages/flitter-cli/src/widgets/status-bar.ts`, `packages/flitter-cli/src/widgets/app-shell.ts`
  - 实现: StatusBar 在 idle 状态（非 processing/streaming/permission）+ 输入框为空 + 非 shortcuts help 显示时，渲染 `? for shortcuts` hint
  - 新增 props: `inputText: string`, `isShowingShortcutsHelp: boolean`
  - AMP ref: `30_main_tui_state.js` L213-218: `if (C.type === "none" && !this.isShowingShortcutsHelp && this.textController.text === "" && g) return new F("", void 0, [new F("?", new iR({color: T.keybind})), new F(" for shortcuts")])`
  - 验证: 启动时空输入框 → 底部显示 `? for shortcuts`；输入文字后消失；显示 shortcuts help 后消失

- [x] Task 7: **GAP-m5** 移除多余命令 + **GAP-m7** StatusBar 接线 + **GAP-c1** 光标 reverse video
  - 这三个都是简单单点修改，合并为一个 task:
  - [x] 7.1 **GAP-m5**: `packages/flitter-cli/src/commands/command-registry.ts` 中删除 id=`context-detail` 和 id=`context-file-changes` 两条注册
  - [x] 7.2 **GAP-m7**: `packages/flitter-cli/src/widgets/app-shell.ts` 中 StatusBar props 的 `isExecutingCommand`/`isRunningShell`/`isAutoCompacting`/`isHandingOff` 从 `false` 改为从 `widget.appState` 获取真实值（若 AppState 尚无这些字段，则添加 stub getter 返回 false 并移除 TODO 注释）
  - [x] 7.3 **GAP-c1**: `packages/flitter-cli/src/widgets/streaming-cursor.ts` 中将 `CURSOR_CHAR = '\u2588'` 改为 reverse video 空格（`text: ' '` + `TextStyle({ reverse: true })`）。如果 TextStyle 没有 `reverse` 属性，检查 flitter-core 是否支持，若不支持则保留 `█` 不改
  - 验证: 命令列表少了 2 条；StatusBar 不再有 TODO 硬编码；光标样式检查

- [x] Task 8: **GAP-m6** Scrollbar auto-hide
  - 文件: `packages/flitter-core/src/widgets/scrollbar.ts` 或 `packages/flitter-cli/src/widgets/command-palette.ts`
  - 当 ListView 内容不超出 viewport 时隐藏 scrollbar
  - 检查 flitter-core 的 Scrollbar 组件是否已有 auto-hide 逻辑。若有，可能只需在 CommandPalette 使用时传入正确参数。若无，在 scrollbar.ts 中添加：当 `contentExtent <= viewportExtent` 时返回 `SizedBox.shrink()`
  - 验证: 命令列表项少于 viewport 高度时无 scrollbar 渲染

# Task Dependencies
- Task 3 (GAP-C5) depends on Task 1 (GAP-C6) — command palette must render correctly before `/` trigger can work
- Task 6 (GAP-m9) depends on Task 2 (GAP-C4) — `? for shortcuts` hint visibility depends on `isShowingShortcutsHelp` state being toggled by `?`
- Tasks 4, 5, 7, 8 are independent and can run in parallel
- Tasks 1, 2 are independent and can run in parallel
