# Close Round-0 Open Gaps Spec

## Why

v0.4.0 里程碑 UAT Round 0 对比 AMP runtime 确认了 10 个 open gaps（3 Critical, 6 Minor, 1 Cosmetic）。本轮按 "guardrails first, coding next; scaffold first, details next" 策略分层修复。

## What Changes

### Scaffold 层（guardrails — 不可见行为修复）
- **GAP-C6**: 修复 Command Palette overlay 渲染崩溃（RenderFlex overflow Infinity）
- **GAP-C4**: `?` 通过 textChangeListener 触发 toggle shortcuts help（绕过 TextField 消费）
- **GAP-C5**: `/` 通过 textChangeListener 触发 command palette + toast

### Detail 层（视觉细节修复）
- **GAP-m1**: "Welcome to Amp" 逐字符 24-bit RGB 渐变
- **GAP-m8**: DensityOrb 密度字符补全 `#` + noise 参数调优覆盖全 8 级
- **GAP-m9**: `? for shortcuts` idle footer hint
- **GAP-m5**: 移除多余的 `context detail` / `context file changes` 两条命令
- **GAP-m7**: StatusBar TODO 字段接线
- **GAP-m6**: Scrollbar auto-hide（命令列表不溢出时不显示）
- **GAP-c1**: 光标从 `█` 改为 reverse video 空格

## Impact

- 受影响文件:
  - `packages/flitter-cli/src/widgets/command-palette.ts` (C6)
  - `packages/flitter-cli/src/state/overlay-manager.ts` (C6)
  - `packages/flitter-cli/src/widgets/input-area.ts` (C4, C5)
  - `packages/flitter-cli/src/widgets/app-shell.ts` (C4, C5, m7)
  - `packages/flitter-cli/src/widgets/welcome-screen.ts` (m1)
  - `packages/flitter-cli/src/widgets/density-orb-widget.ts` (m8)
  - `packages/flitter-cli/src/widgets/status-bar.ts` (m9)
  - `packages/flitter-cli/src/commands/command-registry.ts` (m5)
  - `packages/flitter-cli/src/widgets/streaming-cursor.ts` (c1)
  - `packages/flitter-core/src/widgets/scrollbar.ts` (m6)
- 不涉及 API / 数据模型变更
- 所有改动对外无 breaking change

## MODIFIED Requirements

### Requirement: Command Palette 可正常打开和交互
overlay 渲染使用正确的高度约束，不触发 RenderFlex overflow。

#### Scenario: Ctrl+O 打开 Command Palette
- **WHEN** 用户按下 Ctrl+O
- **THEN** Command Palette overlay 正常渲染，搜索框可输入，命令列表可滚动

### Requirement: `?` 和 `/` 单字符触发器通过 textChangeListener 工作
TextField 消费可打印字符后，InputArea 的 _onTextChanged 检测 `text === "?"` 和 `text === "/"` 并分别触发对应功能。

#### Scenario: 空输入框键入 `?`
- **WHEN** 输入框为空，用户键入 `?`
- **THEN** 输入框被清空，shortcuts help panel toggle 显示/隐藏

#### Scenario: 空输入框键入 `/`
- **WHEN** 输入框为空，用户键入 `/`
- **THEN** 输入框被清空，command palette 打开，显示 toast "Use Ctrl-O to open the command palette"

### Requirement: "Welcome to Amp" 使用逐字符 24-bit 渐变
14 个字符各一个 TextSpan，RGB 从 (0,174,89) 线性插值到 (0,92,41)。

### Requirement: DensityOrb 覆盖全部 8 级密度字符
WELCOME_DENSITY_CHARS 包含 `#`（共 8 级 ` .:-=+*#`），noise 参数确保核心区域达到最高级别。

### Requirement: idle 状态 footer 显示 `? for shortcuts` hint
StatusBar 在 idle + 空输入 + 非 shortcuts help 显示状态下渲染 dim `?` (keybind color) + `for shortcuts` hint。

### Requirement: 命令列表精确匹配 AMP
移除 `context-detail` 和 `context-file-changes` 两条扩展命令。

### Requirement: StatusBar 状态字段从 AppState 接入
`isExecutingCommand`/`isRunningShell`/`isAutoCompacting`/`isHandingOff` 从 AppState 获取真实值。

### Requirement: Scrollbar 不溢出时自动隐藏
内容不超出 viewport 时，Scrollbar 不渲染。

### Requirement: 光标使用 reverse video 样式
StreamingCursor 和 TextField 光标使用 `[7m ` (reverse video 空格) 替代 `█` 全块字符。
